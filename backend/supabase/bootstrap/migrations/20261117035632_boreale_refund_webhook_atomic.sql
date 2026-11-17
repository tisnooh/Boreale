-- PREPARED ONLY. Signature/account verification belongs to the backend caller.
-- OBSERVATIONS ONLY: charge.amount_refunded does not prove final Refund.status or bank receipt.
-- No Stripe/email calls or financial writes. New observations block unshipped fulfillment only.
create table public.refund_charge_ledger (
  payment_id uuid primary key references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  charge_id text not null unique,
  payment_intent_id text not null unique,
  amount_cents integer not null check(amount_cents>0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  max_observed_refunded_cents integer not null check(max_observed_refunded_cents>0 and max_observed_refunded_cents<=amount_cents),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.refund_observations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid not null references public.refund_charge_ledger(payment_id) on delete restrict,
  charge_id text not null,
  payment_intent_id text not null,
  amount_cents integer not null check(amount_cents>0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  reported_refunded_cents integer not null check(reported_refunded_cents>0 and reported_refunded_cents<=amount_cents),
  observed_max_refunded_cents integer not null check(observed_max_refunded_cents>=reported_refunded_cents and observed_max_refunded_cents<=amount_cents),
  recorded_at timestamptz not null default now(),
  unique(charge_id,reported_refunded_cents)
);
create index refund_observations_payment_idx on public.refund_observations(payment_id);
create table public.refund_webhook_events (
  event_id text primary key,
  observation_id uuid not null references public.refund_observations(id) on delete restrict,
  received_at timestamptz not null default now()
);
alter table public.refund_charge_ledger enable row level security;
alter table public.refund_observations enable row level security;
alter table public.refund_webhook_events enable row level security;
revoke all on public.refund_charge_ledger,public.refund_observations,public.refund_webhook_events from public,anon,authenticated,service_role;
grant select,insert,update on public.refund_charge_ledger to service_role;
grant select,insert on public.refund_observations,public.refund_webhook_events to service_role;

create function public.record_order_refund(p_event_id text,p_charge_id text,p_payment_intent_id text,
  p_amount_cents integer,p_refunded_cents integer,p_currency text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_order_id uuid; o public.orders; pay public.payments; settlement public.order_payment_settlements;
  ledger public.refund_charge_ledger; observation public.refund_observations; existing public.refund_observations;
  v_id uuid; v_event text; v_before integer; v_total integer; v_observation_new boolean;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9_]{1,196}$'
    or p_charge_id is null or p_charge_id !~ '^ch_[A-Za-z0-9_]{1,197}$'
    or p_payment_intent_id is null or p_payment_intent_id !~ '^pi_[A-Za-z0-9_]{1,197}$'
    or p_amount_cents is null or p_amount_cents<=0
    or p_refunded_cents is null or p_refunded_cents<=0 or p_refunded_cents>p_amount_cents
    or p_currency is null or p_currency !~ '^[A-Z]{3}$'
    then raise exception using errcode='23514',message='invalid_refund_input'; end if;

  select order_id into v_order_id from public.payments where stripe_payment_intent_id=p_payment_intent_id;
  if not found then raise exception using errcode='P0002',message='refund_payment_unresolved'; end if;
  -- Same first locks as settlement/binding/cancellation. Financial fields stay read-only here.
  select * into o from public.orders where id=v_order_id for update;
  if not found then raise exception using errcode='P0002',message='refund_order_unresolved'; end if;
  select * into pay from public.payments where stripe_payment_intent_id=p_payment_intent_id for update;
  if not found or pay.status not in('succeeded','partially_refunded','refunded')
    then raise exception using errcode='P0002',message='refund_payment_unsettled'; end if;
  if pay.order_id<>o.id or pay.provider<>'stripe' or pay.amount_cents<>p_amount_cents
    or o.total_cents<>p_amount_cents or pay.currency::text<>p_currency or o.currency::text<>p_currency
    then raise exception using errcode='23514',message='refund_payment_mismatch'; end if;
  -- Legacy succeeded payments remain supported; a durable settlement, if present, must agree.
  select * into settlement from public.order_payment_settlements where order_id=o.id;
  if found and (settlement.payment_intent_id<>p_payment_intent_id or settlement.amount_cents<>p_amount_cents
    or settlement.currency<>p_currency or settlement.session_id is distinct from pay.stripe_session_id)
    then raise exception using errcode='23514',message='refund_settlement_mismatch'; end if;

  select * into ledger from public.refund_charge_ledger where payment_id=pay.id for update;
  if found and (ledger.order_id<>o.id or ledger.charge_id<>p_charge_id or ledger.payment_intent_id<>p_payment_intent_id
    or ledger.amount_cents<>p_amount_cents or ledger.currency<>p_currency)
    then raise exception using errcode='23514',message='refund_charge_conflict'; end if;
  v_before:=coalesce(ledger.max_observed_refunded_cents,0);
  v_total:=greatest(v_before,p_refunded_cents);

  select r.* into existing from public.refund_webhook_events e join public.refund_observations r on r.id=e.observation_id
    where e.event_id=p_event_id;
  if found then
    if existing.payment_id<>pay.id or existing.order_id<>o.id or existing.charge_id<>p_charge_id
      or existing.payment_intent_id<>p_payment_intent_id or existing.amount_cents<>p_amount_cents
      or existing.currency<>p_currency or existing.reported_refunded_cents<>p_refunded_cents
      then raise exception using errcode='23514',message='refund_event_conflict'; end if;
    return jsonb_build_object('order_id',o.id,'payment_id',pay.id,'observed_refunded_cents',v_before,
      'reconciliation_required',true,'duplicate',true,'changed',false);
  end if;

  if ledger.payment_id is null then
    insert into public.refund_charge_ledger(payment_id,order_id,charge_id,payment_intent_id,amount_cents,currency,max_observed_refunded_cents)
      values(pay.id,o.id,p_charge_id,p_payment_intent_id,p_amount_cents,p_currency,v_total);
  else
    update public.refund_charge_ledger set max_observed_refunded_cents=v_total,updated_at=now() where payment_id=pay.id;
  end if;
  insert into public.refund_observations(order_id,payment_id,charge_id,payment_intent_id,amount_cents,currency,
    reported_refunded_cents,observed_max_refunded_cents)
    values(o.id,pay.id,p_charge_id,p_payment_intent_id,p_amount_cents,p_currency,p_refunded_cents,v_total)
    on conflict(charge_id,reported_refunded_cents) do nothing returning id into v_id;
  v_observation_new:=v_id is not null;
  if v_observation_new then
    select * into observation from public.refund_observations where id=v_id;
  else
    select * into observation from public.refund_observations where charge_id=p_charge_id and reported_refunded_cents=p_refunded_cents;
    if not found or observation.payment_id<>pay.id or observation.order_id<>o.id
      or observation.payment_intent_id<>p_payment_intent_id or observation.amount_cents<>p_amount_cents
      or observation.currency<>p_currency then raise exception using errcode='23514',message='refund_charge_conflict'; end if;
  end if;
  insert into public.refund_webhook_events(event_id,observation_id) values(p_event_id,observation.id)
    on conflict(event_id) do nothing returning event_id into v_event;
  if v_event is null then
    select r.* into existing from public.refund_webhook_events e join public.refund_observations r on r.id=e.observation_id
      where e.event_id=p_event_id;
    if existing.id is distinct from observation.id then raise exception using errcode='23514',message='refund_event_conflict'; end if;
  end if;

  -- No final Refund.status/bank receipt proof from charge.refunded. A separate ledger is required before automation.
  if v_event is not null then
    if o.status in('paid','processing') then
      update public.orders set fulfillment_status='blocked' where id=o.id;
    end if;
    insert into public.order_operational_incidents(order_id,code,owner_role,next_action,details)
      values(o.id,'refund_provider_reconciliation','support',
        case when o.status in('shipped','delivered') then
          'Traitement déjà engagé : rapprocher colis/retour et statuts refund.created/updated/failed chez Stripe avant clôture, sans promettre de réception bancaire.'
        else
          'Suspendre la préparation et vérifier les statuts refund.created/updated/failed chez Stripe ; rapprocher le cumul avant clôture, sans promettre de réception bancaire.' end,
        jsonb_build_object('observation_id',observation.id,'observed_refunded_cents',v_total,'bank_receipt_verified',false))
      on conflict(order_id,code) do update set status='open',resolved_at=null,owner_role='support',
        next_action=excluded.next_action,details=excluded.details;
  end if;
  return jsonb_build_object('order_id',o.id,'payment_id',pay.id,'observed_refunded_cents',v_total,
    'reconciliation_required',true,'duplicate',not v_observation_new,'changed',v_total>v_before);
end $$;

revoke all on function public.record_order_refund(text,text,text,integer,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.record_order_refund(text,text,text,integer,integer,text) to service_role;
