-- Additive migration. No seeds; no live payment, email or supplier operation.
-- Callers must verify the Stripe signature before invoking the settlement RPC.
alter table public.orders add column fulfillment_status text not null default 'pending'
  check (fulfillment_status in ('pending', 'ready', 'blocked'));

create table public.order_payment_settlements (
  order_id uuid primary key references public.orders(id) on delete restrict,
  session_id text not null unique,
  payment_intent_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  fulfillment_status text not null check (fulfillment_status in ('ready', 'blocked')),
  incident_code text,
  settled_at timestamptz not null default now()
);
create table public.payment_webhook_events (
  event_id text primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  session_id text not null,
  payment_intent_id text not null,
  amount_cents integer not null,
  currency text not null,
  received_at timestamptz not null default now()
);
create index payment_webhook_events_order_idx on public.payment_webhook_events(order_id);
create table public.order_operational_incidents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  code text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  owner_role text not null default 'operations',
  next_action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(order_id, code)
);
create table public.order_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  type text not null check (type in ('confirmation', 'receipt', 'admin')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(order_id, type)
);
create index order_notification_outbox_pending_idx
  on public.order_notification_outbox(next_attempt_at) where status in ('pending','failed');
alter table public.order_payment_settlements enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.order_operational_incidents enable row level security;
alter table public.order_notification_outbox enable row level security;
revoke all on public.order_payment_settlements, public.payment_webhook_events,
  public.order_operational_incidents, public.order_notification_outbox
  from public, anon, authenticated, service_role;
grant select, insert on public.order_payment_settlements, public.payment_webhook_events to service_role;
grant select, insert, update on public.order_operational_incidents, public.order_notification_outbox to service_role;

create function public.create_order_atomic(p_input jsonb)
returns public.orders language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_key text;
  v_subtotal bigint := 0;
  v_unit integer;
  v_qty integer;
  v_line integer;
  v_customer public.customers;
begin
  if pg_catalog.jsonb_typeof(p_input) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_input -> 'items') is distinct from 'array' then
    raise exception 'invalid_order_input';
  end if;
  if pg_catalog.jsonb_array_length(p_input -> 'items') not between 1 and 100 then
    raise exception 'invalid_order_items';
  end if;
  foreach v_key in array array['subtotalCents','discountCents','shippingCents','totalCents'] loop
    if pg_catalog.jsonb_typeof(p_input -> v_key) is distinct from 'number'
       or (p_input ->> v_key) !~ '^[0-9]+$'
       or (p_input ->> v_key)::numeric > 2147483647 then
      raise exception 'invalid_order_amount: %', v_key;
    end if;
  end loop;
  if (p_input ->> 'totalCents')::bigint <= 0
     or (p_input ->> 'discountCents')::bigint > (p_input ->> 'subtotalCents')::bigint
     or (p_input ->> 'totalCents')::bigint <>
       (p_input ->> 'subtotalCents')::bigint - (p_input ->> 'discountCents')::bigint
       + (p_input ->> 'shippingCents')::bigint then
    raise exception 'order_totals_mismatch';
  end if;
  if coalesce(p_input ->> 'currency','') !~ '^[A-Z]{3}$'
     or coalesce(p_input ->> 'email','') = ''
     or p_input ->> 'email' <> pg_catalog.lower(p_input ->> 'email')
     or coalesce(p_input ->> 'shippingMethod','') not in ('standard','express')
     or pg_catalog.jsonb_typeof(p_input -> 'shippingAddress') is distinct from 'object' then
    raise exception 'invalid_order_details';
  end if;
  select * into v_customer from public.customers where id = (p_input ->> 'customerId')::uuid;
  if not found or v_customer.email <> p_input ->> 'email'
     or ((p_input ->> 'userId') is not null and
         v_customer.user_id is distinct from (p_input ->> 'userId')::uuid) then
    raise exception 'order_customer_mismatch';
  end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(p_input -> 'items') loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'object' then raise exception 'invalid_order_item'; end if;
    foreach v_key in array array['unit_price_cents','quantity','total_cents'] loop
      if pg_catalog.jsonb_typeof(v_item -> v_key) is distinct from 'number'
         or (v_item ->> v_key) !~ '^[0-9]+$'
         or (v_item ->> v_key)::numeric > 2147483647 then
        raise exception 'invalid_item_amount: %', v_key;
      end if;
    end loop;
    v_unit := (v_item ->> 'unit_price_cents')::integer;
    v_qty := (v_item ->> 'quantity')::integer;
    v_line := (v_item ->> 'total_cents')::integer;
    if v_qty <= 0 or v_unit::bigint * v_qty::bigint <> v_line::bigint
       or coalesce(v_item ->> 'variant_id','') = ''
       or coalesce(v_item ->> 'sku','') = '' or coalesce(v_item ->> 'product_name','') = '' then
      raise exception 'order_item_totals_mismatch';
    end if;
    -- FK existence is checked here and again by INSERT; no invented reference can be persisted.
    if not exists (select 1 from public.product_variants where id = (v_item ->> 'variant_id')::uuid) then
      raise exception 'order_variant_missing';
    end if;
    v_subtotal := v_subtotal + v_line::bigint;
  end loop;
  if v_subtotal <> (p_input ->> 'subtotalCents')::bigint then raise exception 'order_items_subtotal_mismatch'; end if;

  insert into public.orders(customer_id,user_id,email,currency,subtotal_cents,discount_cents,
    shipping_cents,total_cents,shipping_method,discount_code,shipping_address,stripe_session_id)
  values ((p_input ->> 'customerId')::uuid,(p_input ->> 'userId')::uuid,p_input ->> 'email',
    p_input ->> 'currency',(p_input ->> 'subtotalCents')::integer,(p_input ->> 'discountCents')::integer,
    (p_input ->> 'shippingCents')::integer,(p_input ->> 'totalCents')::integer,
    p_input ->> 'shippingMethod',p_input ->> 'discountCode',p_input -> 'shippingAddress',p_input ->> 'stripeSessionId')
  returning * into v_order;
  insert into public.order_items(order_id,variant_id,sku,product_name,variant_title,unit_price_cents,quantity,total_cents,image_url)
  select v_order.id,(x ->> 'variant_id')::uuid,x ->> 'sku',x ->> 'product_name',x ->> 'variant_title',
    (x ->> 'unit_price_cents')::integer,(x ->> 'quantity')::integer,(x ->> 'total_cents')::integer,x ->> 'image_url'
  from pg_catalog.jsonb_array_elements(p_input -> 'items') x;
  insert into public.order_events(order_id,type,data) values (v_order.id,'order_created',
    pg_catalog.jsonb_build_object('number',v_order.number,'totalCents',v_order.total_cents));
  return v_order;
end;
$$;

create function public.settle_order_payment(p_event_id text,p_session_id text,p_payment_intent_id text,
  p_amount_cents integer,p_currency text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders;
  v_settlement public.order_payment_settlements;
  v_event public.payment_webhook_events;
  v_payment public.payments;
  v_discount public.discounts;
  v_currency text := pg_catalog.upper(p_currency);
  v_fulfillment text := 'ready';
  v_incident text;
  v_shortages jsonb := '[]'::jsonb;
  v_allocations jsonb := '[]'::jsonb;
  v_needed record;
  v_available integer;
  v_updated integer;
  v_event_inserted text;
begin
  if coalesce(p_event_id,'') = '' or coalesce(p_session_id,'') = ''
     or coalesce(p_payment_intent_id,'') = '' or p_amount_cents is null or p_amount_cents <= 0
     or coalesce(v_currency,'') !~ '^[A-Z]{3}$' then raise exception 'invalid_payment_input'; end if;
  -- All completion events for one session serialize before reading any settlement state.
  select * into v_order from public.orders where stripe_session_id = p_session_id for update;
  if not found then raise exception 'payment_order_unresolved'; end if;
  if v_order.total_cents <> p_amount_cents or v_order.currency::text <> v_currency then
    raise exception 'payment_amount_mismatch';
  end if;
  insert into public.payment_webhook_events(event_id,order_id,session_id,payment_intent_id,amount_cents,currency)
  values (p_event_id,v_order.id,p_session_id,p_payment_intent_id,p_amount_cents,v_currency)
  on conflict (event_id) do nothing returning event_id into v_event_inserted;
  if v_event_inserted is null then
    select * into v_event from public.payment_webhook_events where event_id = p_event_id;
    if v_event.order_id <> v_order.id or v_event.session_id <> p_session_id
       or v_event.payment_intent_id <> p_payment_intent_id or v_event.amount_cents <> p_amount_cents
       or v_event.currency <> v_currency then raise exception 'payment_event_conflict'; end if;
  end if;
  select * into v_settlement from public.order_payment_settlements where order_id = v_order.id;
  if found then
    if v_settlement.session_id <> p_session_id or v_settlement.payment_intent_id <> p_payment_intent_id
       or v_settlement.amount_cents <> p_amount_cents or v_settlement.currency <> v_currency then
      raise exception 'payment_settlement_conflict';
    end if;
    -- New event for the same paid session is audited, but never repeats business effects.
    return pg_catalog.jsonb_build_object('order_id',v_order.id,'duplicate',true,
      'fulfillment_status',v_settlement.fulfillment_status,'incident_code',v_settlement.incident_code);
  end if;
  if v_event_inserted is null then raise exception 'payment_event_without_settlement'; end if;

  if v_order.status <> 'pending' then
    -- Preserve late real payments without pretending that a cancelled/refunded order can ship.
    v_incident := 'order_state_requires_review';
  end if;
  if not exists(select 1 from public.order_items where order_id = v_order.id)
     or exists(select 1 from public.order_items where order_id = v_order.id and variant_id is null) then
    v_incident := coalesce(v_incident,'order_items_missing');
  end if;
  -- Cross-order stock locks have a stable UUID ordering to avoid AB/BA deadlocks.
  -- Read each quantity in the very statement acquiring its lock. A row missing at that
  -- instant is permanently a shortage for this attempt, even if concurrently inserted later.
  for v_needed in select variant_id,sum(quantity::bigint) qty from public.order_items
    where order_id = v_order.id group by variant_id order by variant_id loop
    select quantity into v_available from public.inventory
      where variant_id = v_needed.variant_id for update;
    if not found then
      v_shortages := v_shortages || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'variant_id',v_needed.variant_id,'required',v_needed.qty,'available',0));
    elsif v_available::bigint < v_needed.qty then
      v_shortages := v_shortages || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'variant_id',v_needed.variant_id,'required',v_needed.qty,'available',v_available));
    else
      v_allocations := v_allocations || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'variant_id',v_needed.variant_id,'quantity',v_needed.qty::integer));
    end if;
  end loop;
  if pg_catalog.jsonb_array_length(v_shortages) > 0 then v_incident := coalesce(v_incident,'insufficient_stock'); end if;

  -- Count every actually paid use exactly once; quota anomalies become durable incidents.
  if v_order.discount_code is not null then
    select * into v_discount from public.discounts where code = v_order.discount_code for update;
    if not found then
      v_incident := coalesce(v_incident,'discount_missing');
    else
      update public.discounts set used_count = used_count + 1 where id = v_discount.id;
      if v_discount.max_uses is not null and v_discount.used_count >= v_discount.max_uses then
        insert into public.order_operational_incidents(order_id,code,next_action,details)
        values (v_order.id,'discount_quota_exceeded','Review paid promotion usage; do not re-charge the customer.',
          pg_catalog.jsonb_build_object('discount_code',v_order.discount_code)) on conflict(order_id,code) do nothing;
      end if;
    end if;
  end if;
  if v_incident is not null then
    v_fulfillment := 'blocked';
    insert into public.order_operational_incidents(order_id,code,next_action,details)
    values(v_order.id,v_incident,'Reconcile paid order; confirm procurement or arrange a reviewed refund before shipping.',
      pg_catalog.jsonb_build_object('shortages',v_shortages,'prior_status',v_order.status))
    on conflict(order_id,code) do nothing;
  else
    -- No partial stock consumption: every quantity was checked after acquiring all locks.
    update public.inventory i set quantity = i.quantity - n.quantity,updated_at = now()
    from pg_catalog.jsonb_to_recordset(v_allocations) as n(variant_id uuid,quantity integer)
    where i.variant_id = n.variant_id;
    get diagnostics v_updated = row_count;
    if v_updated <> pg_catalog.jsonb_array_length(v_allocations) then raise exception 'stock_allocation_conflict'; end if;
  end if;
  select * into v_payment from public.payments where stripe_session_id = p_session_id for update;
  if found then
    if v_payment.order_id <> v_order.id or v_payment.amount_cents <> p_amount_cents
       or v_payment.currency::text <> v_currency
       or (v_payment.stripe_payment_intent_id is not null and v_payment.stripe_payment_intent_id <> p_payment_intent_id)
       or v_payment.status in ('refunded','partially_refunded') then raise exception 'payment_record_conflict'; end if;
    update public.payments set status='succeeded',stripe_payment_intent_id=p_payment_intent_id,updated_at=now()
    where id=v_payment.id;
  else
    insert into public.payments(order_id,provider,stripe_session_id,stripe_payment_intent_id,amount_cents,currency,status)
    values(v_order.id,'stripe',p_session_id,p_payment_intent_id,p_amount_cents,v_currency,'succeeded');
  end if;
  update public.orders set status = case when status in ('pending','cancelled') then 'paid' else status end,
    paid_at=coalesce(paid_at,now()),fulfillment_status=v_fulfillment where id=v_order.id;
  update public.abandoned_carts set status='converted',updated_at=now() where email=v_order.email and status in ('open','sent');
  insert into public.order_payment_settlements(order_id,session_id,payment_intent_id,amount_cents,currency,fulfillment_status,incident_code)
  values(v_order.id,p_session_id,p_payment_intent_id,p_amount_cents,v_currency,v_fulfillment,v_incident);
  insert into public.order_events(order_id,type,data) values(v_order.id,'payment_settled',
    pg_catalog.jsonb_build_object('event_id',p_event_id,'session_id',p_session_id,'fulfillment_status',v_fulfillment,'incident_code',v_incident));
  insert into public.order_notification_outbox(order_id,type,payload)
  select v_order.id,t,pg_catalog.jsonb_build_object('order_id',v_order.id,'fulfillment_status',v_fulfillment,'incident_code',v_incident)
  from unnest(array['confirmation','receipt','admin']) t on conflict(order_id,type) do nothing;
  return pg_catalog.jsonb_build_object('order_id',v_order.id,'duplicate',false,
    'fulfillment_status',v_fulfillment,'incident_code',v_incident);
end;
$$;
-- Expiry/async-failure uses the same first lock as settlement: a settled payment wins.
create function public.cancel_pending_order(p_order_id uuid,p_reason text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders;
begin
  if p_order_id is null or coalesce(pg_catalog.btrim(p_reason),'') = ''
     or pg_catalog.length(p_reason) > 200 then raise exception 'invalid_cancellation_input'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.status <> 'pending' or exists (
    select 1 from public.order_payment_settlements where order_id = p_order_id
  ) then return false; end if;
  update public.orders set status='cancelled',cancelled_at=now() where id=p_order_id;
  insert into public.order_events(order_id,type,data)
  values(p_order_id,'order_cancelled',pg_catalog.jsonb_build_object('reason',p_reason));
  return true;
end;
$$;
revoke all on function public.create_order_atomic(jsonb),
  public.settle_order_payment(text,text,text,integer,text), public.cancel_pending_order(uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_order_atomic(jsonb),
  public.settle_order_payment(text,text,text,integer,text), public.cancel_pending_order(uuid,text) to service_role;
