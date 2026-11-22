-- PREPARED ONLY: review and isolated SQL QA required. No provider is called by SQL.
create table public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete restrict,
  key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  order_number text not null,
  snapshot jsonb not null,
  state text not null default 'prepared' check(state in('prepared','creating','bound','manual_review')),
  stripe_params jsonb,
  stripe_key text not null unique,
  session_id text unique,
  session_url text,
  session_expires_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  first_attempt_at timestamptz,
  retry_deadline timestamptz,
  attempts integer not null default 0 check(attempts between 0 and 5),
  last_error text,
  created_at timestamptz not null default now()
);
-- NULL actors share guest scope. Raw caller keys and request PII never appear in indexes/logs.
create unique index checkout_intents_guest_key on public.checkout_intents(key_hash) where actor_id is null;
create unique index checkout_intents_customer_key on public.checkout_intents(actor_id,key_hash) where actor_id is not null;
alter table public.checkout_intents enable row level security;
revoke all on public.checkout_intents from public,anon,authenticated,service_role;
grant select,insert,update on public.checkout_intents to service_role;

create function public.begin_checkout_intent(p_key_hash text,p_request_hash text,p_actor uuid,
  p_snapshot jsonb,p_customer jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.checkout_intents; c public.customers; o public.orders; new_id uuid:=gen_random_uuid();
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' or p_request_hash is null
    or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='23514',message='invalid_checkout_identity'; end if;
  -- One key is serialized before any customer/address/order mutation, even when the row is absent.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(coalesce(p_actor::text,'guest')||':'||p_key_hash,0));
  select * into n from public.checkout_intents where key_hash=p_key_hash and actor_id is not distinct from p_actor;
  if found then
    if n.request_hash<>p_request_hash then raise exception using errcode='23514',message='checkout_payload_changed'; end if;
    return to_jsonb(n);
  end if;
  if p_snapshot is null then return null; end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object' or jsonb_typeof(p_customer) is distinct from 'object'
    or coalesce(p_customer->>'email','')='' or p_customer->>'email'<>lower(p_customer->>'email')
    or p_snapshot->'order'->>'email' is distinct from p_customer->>'email'
    or jsonb_typeof(p_snapshot->'items') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'totals') is distinct from 'object'
    then raise exception using errcode='23514',message='invalid_checkout_snapshot'; end if;
  -- Contact identity is not account ownership. Never relink or overwrite an existing contact by email.
  insert into public.customers(email,first_name,last_name,phone)
    values(p_customer->>'email',p_customer->>'firstName',p_customer->>'lastName',p_customer->>'phone')
    on conflict(email) do nothing;
  select * into c from public.customers where email=p_customer->>'email' for update;
  if not found then raise exception 'checkout_customer_unconfirmed'; end if;
  -- Existing linked customer address books cannot be changed by an unrelated caller.
  if c.user_id is null or c.user_id=p_actor then
    insert into public.addresses(customer_id,type,line1,line2,postal_code,city,country)
      values(c.id,'shipping',p_customer->'address'->>'line1',p_customer->'address'->>'line2',
        p_customer->'address'->>'postalCode',p_customer->'address'->>'city',p_customer->'address'->>'country');
  end if;
  -- The existing validator creates order/items/event atomically in this same transaction.
  o:=public.create_order_atomic((p_snapshot->'order')||jsonb_build_object('customerId',c.id,'userId',null,'stripeSessionId',null));
  update public.orders set user_id=p_actor where id=o.id;
  if (p_snapshot->'totals'->>'totalCents')::integer is distinct from o.total_cents
    or p_snapshot->'totals'->>'currency' is distinct from o.currency::text
    then raise exception using errcode='23514',message='checkout_snapshot_totals_mismatch'; end if;
  insert into public.checkout_intents(id,actor_id,key_hash,request_hash,order_id,order_number,snapshot,stripe_key)
    values(new_id,p_actor,p_key_hash,p_request_hash,o.id,o.number,p_snapshot,'boreale-checkout/'||new_id||'/v1') returning * into n;
  return to_jsonb(n);
end $$;

create function public.freeze_checkout_intent(p_id uuid,p_params jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.checkout_intents; total bigint; currencies integer;
begin
  select * into n from public.checkout_intents where id=p_id for update;
  if not found then raise exception 'checkout_intent_missing'; end if;
  if n.stripe_params is not null then return to_jsonb(n); end if;
  if n.state<>'prepared' or jsonb_typeof(p_params) is distinct from 'object'
    or jsonb_typeof(p_params->'line_items') is distinct from 'array'
    or p_params->>'mode' is distinct from 'payment' or p_params ? 'expires_at'
    or p_params->'metadata'->>'brand' is distinct from 'boreale'
    or p_params->'metadata'->>'checkoutIntentId' is distinct from n.id::text
    or p_params->'metadata'->>'orderId' is distinct from n.order_id::text
    or p_params->>'customer_email' is distinct from n.snapshot->'order'->>'email'
    then raise exception using errcode='23514',message='invalid_checkout_provider_payload'; end if;
  select sum((x->>'quantity')::bigint*(x->'price_data'->>'unit_amount')::bigint),
    count(*) filter(where upper(x->'price_data'->>'currency') is distinct from n.snapshot->'totals'->>'currency')
    into total,currencies from jsonb_array_elements(p_params->'line_items') x;
  if total is distinct from (n.snapshot->'totals'->>'totalCents')::bigint or currencies<>0
    then raise exception using errcode='23514',message='checkout_provider_amount_mismatch'; end if;
  update public.checkout_intents set stripe_params=p_params where id=p_id returning * into n;
  return to_jsonb(n);
end $$;

create function public.claim_checkout_intent(p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.checkout_intents; v_order_id uuid;
begin
  select order_id into v_order_id from public.checkout_intents where id=p_id;
  if not found then raise exception 'checkout_intent_missing'; end if;
  -- Same lock order as bind/settlement, including the FK write for a terminal incident.
  perform 1 from public.orders where id=v_order_id for update;
  select * into n from public.checkout_intents where id=p_id for update;
  if not found then raise exception 'checkout_intent_missing'; end if;
  if n.state in('bound','manual_review') then return to_jsonb(n); end if;
  if n.state='creating' and n.lease_until>now() then raise exception using errcode='23514',message='checkout_attempt_busy'; end if;
  if n.attempts>=5 or n.retry_deadline<=now() then
    update public.checkout_intents set state='manual_review',lease_token=null,lease_until=null,last_error='manual_review_required'
      where id=p_id returning * into n;
    insert into public.order_operational_incidents(order_id,code,owner_role,next_action,details)
      values(n.order_id,'checkout_session_reconciliation','support',
        'Rapprocher la session Stripe avant toute nouvelle tentative de paiement.',jsonb_build_object('checkout_intent_id',n.id))
      on conflict(order_id,code) do nothing;
    return to_jsonb(n);
  end if;
  if n.stripe_params is null then raise exception using errcode='23514',message='checkout_payload_not_frozen'; end if;
  update public.checkout_intents set state='creating',attempts=attempts+1,lease_token=gen_random_uuid(),
    lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()),
    retry_deadline=coalesce(retry_deadline,now()+interval '23 hours'),last_error=null where id=p_id returning * into n;
  return to_jsonb(n);
end $$;

create function public.bind_checkout_session(p_id uuid,p_token uuid,p_session text,p_url text,
  p_expires_at bigint,p_amount integer,p_currency text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.checkout_intents; o public.orders; pay public.payments; order_id uuid;
begin
  select i.order_id into order_id from public.checkout_intents i where i.id=p_id;
  if not found then raise exception 'checkout_intent_missing'; end if;
  -- Consistent first lock with settlement/cancellation. Financial state is never reset here.
  select * into o from public.orders where id=order_id for update;
  select * into n from public.checkout_intents where id=p_id for update;
  if p_session is null or p_session !~ '^cs_[A-Za-z0-9_]+$' or p_amount is distinct from o.total_cents
    or p_currency is distinct from o.currency::text or p_expires_at is null
    or (p_url is not null and p_url !~ '^https://checkout[.]stripe[.]com/')
    or (o.stripe_session_id is not null and o.stripe_session_id<>p_session)
    or (n.session_id is not null and n.session_id<>p_session)
    then raise exception using errcode='23514',message='checkout_session_mismatch'; end if;
  -- NULL token is reserved for backend-verified Stripe/webhook recovery, never a public API.
  if p_token is not null and n.state<>'bound' and (n.state<>'creating' or n.lease_token is distinct from p_token or n.lease_until<=now())
    then raise exception using errcode='23514',message='checkout_lease_lost'; end if;
  if p_token is not null and n.state='bound' and n.session_id<>p_session
    then raise exception using errcode='23514',message='checkout_session_conflict'; end if;
  select * into pay from public.payments where stripe_session_id=p_session for update;
  if found then
    if pay.order_id<>o.id or pay.amount_cents<>p_amount or pay.currency::text<>p_currency
      then raise exception using errcode='23514',message='checkout_payment_mismatch'; end if;
  else
    if exists(select 1 from public.payments where payments.order_id=o.id)
      then raise exception using errcode='23514',message='checkout_payment_conflict'; end if;
    insert into public.payments(order_id,provider,stripe_session_id,amount_cents,currency,status)
      values(o.id,'stripe',p_session,p_amount,p_currency,'pending');
  end if;
  update public.orders set stripe_session_id=p_session where id=o.id;
  update public.checkout_intents set state='bound',session_id=p_session,session_url=p_url,
    session_expires_at=to_timestamp(p_expires_at),lease_token=null,lease_until=null,last_error=null
    where id=p_id returning * into n;
  return to_jsonb(n);
end $$;

create function public.fail_checkout_intent(p_id uuid,p_token uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n public.checkout_intents; v_order_id uuid; exhausted boolean;
begin
  select order_id into v_order_id from public.checkout_intents where id=p_id;
  if not found then return false; end if;
  perform 1 from public.orders where id=v_order_id for update;
  select * into n from public.checkout_intents where id=p_id for update;
  if n.state<>'creating' or n.lease_token is distinct from p_token or n.lease_until<=now() then return false; end if;
  exhausted:=n.attempts>=5 or n.retry_deadline<=now();
  update public.checkout_intents set state=case when exhausted then 'manual_review' else 'prepared' end,
    lease_token=null,lease_until=null,last_error='provider_unconfirmed' where id=p_id;
  if exhausted then
    insert into public.order_operational_incidents(order_id,code,owner_role,next_action,details)
      values(n.order_id,'checkout_session_reconciliation','support',
        'Rapprocher la session Stripe avant toute nouvelle tentative de paiement.',jsonb_build_object('checkout_intent_id',n.id))
      on conflict(order_id,code) do nothing;
  end if;
  return true;
end $$;

revoke all on function public.begin_checkout_intent(text,text,uuid,jsonb,jsonb),public.freeze_checkout_intent(uuid,jsonb),
  public.claim_checkout_intent(uuid),public.bind_checkout_session(uuid,uuid,text,text,bigint,integer,text),public.fail_checkout_intent(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.begin_checkout_intent(text,text,uuid,jsonb,jsonb),public.freeze_checkout_intent(uuid,jsonb),
  public.claim_checkout_intent(uuid),public.bind_checkout_session(uuid,uuid,text,text,bigint,integer,text),public.fail_checkout_intent(uuid,uuid)
  to service_role;
