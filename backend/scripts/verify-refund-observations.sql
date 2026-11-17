-- Executed successfully on 2026-11-17 after migration 20261117035632; nine post-rollback counts zero.
-- Apply only reviewed migration first. Synthetic events; no provider/email.
-- Observations only: all business financial fields remain unchanged. One connection, no concurrency claim.
begin;
set local role service_role;
do $$
declare
  customer constant uuid:='00000000-0000-4000-a000-202611170001';
  order_a constant uuid:='00000000-0000-4000-a000-202611170002';
  order_b constant uuid:='00000000-0000-4000-a000-202611170003';
  payment_a constant uuid:='00000000-0000-4000-a000-202611170004';
  payment_b constant uuid:='00000000-0000-4000-a000-202611170005';
  before_orders jsonb; before_payments jsonb; observed jsonb; settled jsonb;
  row_count bigint; event_count bigint; observation_count bigint; name text; role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if has_function_privilege(role_name,'public.record_order_refund(text,text,text,integer,integer,text)','execute')
      then raise exception 'QA public refund observation RPC access'; end if;
    foreach name in array array['refund_charge_ledger','refund_observations','refund_webhook_events'] loop
      if has_table_privilege(role_name,'public.'||name,'SELECT') or has_table_privilege(role_name,'public.'||name,'INSERT')
        then raise exception 'QA public refund ledger access'; end if;
    end loop;
  end loop;
  if not has_function_privilege('service_role','public.record_order_refund(text,text,text,integer,integer,text)','execute')
    or not has_table_privilege('service_role','public.refund_charge_ledger','UPDATE')
    or not has_table_privilege('service_role','public.refund_observations','INSERT')
    or not has_table_privilege('service_role','public.refund_webhook_events','INSERT')
    or has_table_privilege('service_role','public.refund_observations','UPDATE')
    or has_table_privilege('service_role','public.refund_webhook_events','DELETE')
    then raise exception 'QA observation service privileges invalid'; end if;
  foreach name in array array['refund_charge_ledger','refund_observations','refund_webhook_events'] loop
    if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=name and c.relrowsecurity) then raise exception 'QA ledger RLS absent'; end if;
  end loop;
  if exists(select 1 from public.customers where id=customer or email='qa-refund-20261117@example.invalid')
    or exists(select 1 from public.orders where id in(order_a,order_b))
    or exists(select 1 from public.payments where id in(payment_a,payment_b) or stripe_payment_intent_id in('pi_QARefundA','pi_QARefundB'))
    or exists(select 1 from public.refund_charge_ledger where charge_id in('ch_QARefundA','ch_QARefundB'))
    or exists(select 1 from public.refund_webhook_events where event_id like 'evt_QARefund%')
    then raise exception 'QA refund fixture namespace occupied'; end if;
  insert into public.customers(id,email) values(customer,'qa-refund-20261117@example.invalid');
  insert into public.orders(id,number,customer_id,email,currency,subtotal_cents,total_cents,shipping_address,status,paid_at,fulfillment_status,stripe_session_id)
    values(order_a,'QA-REFUND-20261117-A',customer,'qa-refund-20261117@example.invalid','EUR',1000,1000,'{}','paid',now(),'ready','cs_test_QARefundA'),
      (order_b,'QA-REFUND-20261117-B',customer,'qa-refund-20261117@example.invalid','EUR',1000,1000,'{}','processing',now(),'ready','cs_test_QARefundB');
  insert into public.payments(id,order_id,provider,stripe_payment_intent_id,stripe_session_id,amount_cents,currency,status)
    values(payment_a,order_a,'stripe','pi_QARefundA','cs_test_QARefundA',1000,'EUR','succeeded'),
      (payment_b,order_b,'stripe','pi_QARefundB','cs_test_QARefundB',1000,'EUR','succeeded');
  -- A is a legacy succeeded payment without settlement row; B uses the existing atomic settlement format.
  insert into public.order_payment_settlements(order_id,session_id,payment_intent_id,amount_cents,currency,fulfillment_status)
    values(order_b,'cs_test_QARefundB','pi_QARefundB',1000,'EUR','ready');
  select jsonb_agg(to_jsonb(o)-'fulfillment_status' order by o.id) into before_orders from public.orders o where id in(order_a,order_b);
  select jsonb_agg(to_jsonb(p) order by p.id) into before_payments from public.payments p where id in(payment_a,payment_b);
  begin
    perform public.record_order_refund('evt_QARefundUnknown','ch_QARefundUnknown','pi_QARefundUnknown',1000,100,'EUR');
    raise exception 'QA unknown payment acknowledged';
  exception when no_data_found then null; end;
  update public.payments set status='pending' where id=payment_b;
  begin
    perform public.record_order_refund('evt_QARefundPending','ch_QARefundB','pi_QARefundB',1000,100,'EUR');
    raise exception 'QA unsettled payment acknowledged';
  exception when no_data_found then null; end;
  update public.payments set status='succeeded' where id=payment_b;

  observed:=public.record_order_refund('evt_QARefundPartial','ch_QARefundA','pi_QARefundA',1000,400,'EUR');
  if (observed->>'observed_refunded_cents')::integer<>400 or observed->>'reconciliation_required'<>'true'
    or observed->>'changed'<>'true' or observed ? 'status' then raise exception 'QA partial observation contract wrong'; end if;
  if not exists(select 1 from public.order_operational_incidents where order_id=order_a
    and code='refund_provider_reconciliation' and owner_role='support' and status='open'
    and details->>'bank_receipt_verified'='false' and length(next_action)>0) then raise exception 'QA observation has no visible support incident'; end if;
  if not exists(select 1 from public.orders where id=order_a and status='paid' and fulfillment_status='blocked')
    then raise exception 'QA observed refund did not block unshipped preparation'; end if;
  begin
    perform public.admin_update_order_operation(order_a,'advance','paid','shipped',
      '{"trackingCarrier":"QA","trackingNumber":"QA-NOT-A-SHIPMENT"}',null,null,'qa-refund-fixture');
    raise exception 'QA admin shipping allowed while refund reconciliation blocked';
  exception when check_violation then if sqlerrm<>'fulfillment_blocked' then raise; end if; end;
  -- Strict duplicate is not a new workflow decision, even after a deliberate fixture-only clearance.
  update public.orders set fulfillment_status='ready' where id=order_a;
  observed:=public.record_order_refund('evt_QARefundPartial','ch_QARefundA','pi_QARefundA',1000,400,'EUR');
  if observed->>'duplicate'<>'true' or observed->>'changed'<>'false' then raise exception 'QA event replay not idempotent'; end if;
  if not exists(select 1 from public.orders where id=order_a and fulfillment_status='ready') then raise exception 'QA strict duplicate transitioned fulfillment'; end if;
  update public.order_operational_incidents set status='resolved',resolved_at=now() where order_id=order_a and code='refund_provider_reconciliation';
  observed:=public.record_order_refund('evt_QARefundSameCumulative','ch_QARefundA','pi_QARefundA',1000,400,'EUR');
  if observed->>'duplicate'<>'true' or (select count(*) from public.refund_observations where payment_id=payment_a)<>1
    or (select count(*) from public.refund_webhook_events where event_id in('evt_QARefundPartial','evt_QARefundSameCumulative'))<>2
    then raise exception 'QA canonical charge/cumulative dedup failed'; end if;
  if not exists(select 1 from public.orders where id=order_a and status='paid' and fulfillment_status='blocked')
    or not exists(select 1 from public.order_operational_incidents where order_id=order_a and code='refund_provider_reconciliation'
      and status='open' and resolved_at is null) then raise exception 'QA new event for known cumulative did not restore reconciliation hold'; end if;
  observed:=public.record_order_refund('evt_QARefundFull','ch_QARefundA','pi_QARefundA',1000,1000,'EUR');
  if (observed->>'observed_refunded_cents')::integer<>1000 or observed->>'changed'<>'true'
    then raise exception 'QA partial to full observation failed'; end if;
  observed:=public.record_order_refund('evt_QARefundStale','ch_QARefundA','pi_QARefundA',1000,250,'EUR');
  if (observed->>'observed_refunded_cents')::integer<>1000 or observed->>'changed'<>'false'
    or not exists(select 1 from public.refund_charge_ledger where payment_id=payment_a and max_observed_refunded_cents=1000)
    then raise exception 'QA full to stale observation regressed'; end if;
  -- New observations must reopen a manually closed reconciliation incident.
  update public.order_operational_incidents set status='resolved',resolved_at=now() where order_id=order_a and code='refund_provider_reconciliation';
  perform public.record_order_refund('evt_QARefundOtherStale','ch_QARefundA','pi_QARefundA',1000,200,'EUR');
  if not exists(select 1 from public.order_operational_incidents where order_id=order_a and code='refund_provider_reconciliation'
    and status='open' and resolved_at is null) then raise exception 'QA incident not reopened'; end if;

  select count(*) into observation_count from public.refund_observations;
  select count(*) into event_count from public.refund_webhook_events;
  select count(*) into row_count from public.refund_charge_ledger;
  begin
    perform public.record_order_refund('evt_QARefundPartial','ch_QARefundA','pi_QARefundA',1000,500,'EUR');
    raise exception 'QA reused event with different cumulative accepted';
  exception when check_violation then null; end;
  begin
    perform public.record_order_refund('evt_QARefundExcess','ch_QARefundA','pi_QARefundA',1000,1001,'EUR');
    raise exception 'QA excess cumulative accepted';
  exception when check_violation then null; end;
  begin
    perform public.record_order_refund('evt_QARefundAmount','ch_QARefundA','pi_QARefundA',999,200,'EUR');
    raise exception 'QA charge/payment amount mismatch accepted';
  exception when check_violation then null; end;
  begin
    perform public.record_order_refund('evt_QARefundCurrency','ch_QARefundA','pi_QARefundA',1000,200,'USD');
    raise exception 'QA currency mismatch accepted';
  exception when check_violation then null; end;
  begin
    perform public.record_order_refund('evt_QARefundOtherCharge','ch_QARefundOther','pi_QARefundA',1000,200,'EUR');
    raise exception 'QA second charge added to same payment';
  exception when check_violation then null; end;
  begin
    perform public.record_order_refund('evt_QARefundChargeReused','ch_QARefundA','pi_QARefundB',1000,300,'EUR');
    raise exception 'QA charge associated with another payment';
  exception when unique_violation then null; end;
  if (select count(*) from public.refund_observations)<>observation_count
    or (select count(*) from public.refund_webhook_events)<>event_count
    or (select count(*) from public.refund_charge_ledger)<>row_count then raise exception 'QA rejected observation left partial writes'; end if;

  -- Existing settlement compatibility: observing a refund cannot alter settlement or a late paid-event replay.
  perform public.record_order_refund('evt_QARefundBPartial','ch_QARefundB','pi_QARefundB',1000,150,'EUR');
  if not exists(select 1 from public.orders where id=order_b and status='processing' and fulfillment_status='blocked')
    then raise exception 'QA processing order not blocked'; end if;
  perform public.record_order_refund('evt_QARefundBFull','ch_QARefundB','pi_QARefundB',1000,1000,'EUR');
  -- Fixture-only stage changes exercise already-shipped/delivered preservation without calling a carrier.
  update public.orders set status='shipped',fulfillment_status='ready' where id=order_b;
  perform public.record_order_refund('evt_QARefundBShipped','ch_QARefundB','pi_QARefundB',1000,700,'EUR');
  if not exists(select 1 from public.orders where id=order_b and status='shipped' and fulfillment_status='ready')
    or not exists(select 1 from public.order_operational_incidents where order_id=order_b and code='refund_provider_reconciliation'
      and next_action like '%déjà engagé%') then raise exception 'QA shipped handling changed or lost reconciliation'; end if;
  update public.orders set status='delivered' where id=order_b;
  perform public.record_order_refund('evt_QARefundBDelivered','ch_QARefundB','pi_QARefundB',1000,600,'EUR');
  if not exists(select 1 from public.orders where id=order_b and status='delivered' and fulfillment_status='ready')
    then raise exception 'QA delivered handling changed'; end if;
  update public.orders set status='processing',fulfillment_status='blocked' where id=order_b;
  settled:=public.settle_order_payment('evt_QARefundPaidReplay','cs_test_QARefundB','pi_QARefundB',1000,'EUR');
  if settled->>'duplicate'<>'true' then raise exception 'QA old settlement no longer idempotent'; end if;
  if (select jsonb_agg(to_jsonb(o)-'fulfillment_status' order by o.id) from public.orders o where id in(order_a,order_b)) is distinct from before_orders
    or (select jsonb_agg(to_jsonb(p) order by p.id) from public.payments p where id in(payment_a,payment_b)) is distinct from before_payments
    then raise exception 'QA charge observations changed business financial rows'; end if;
  if exists(select 1 from public.order_events where order_id in(order_a,order_b))
    or exists(select 1 from public.order_notification_outbox where order_id in(order_a,order_b))
    then raise exception 'QA fabricated refund history or customer email'; end if;
  if not exists(select 1 from public.order_operational_incidents where order_id=order_b and code='refund_provider_reconciliation'
    and status='open' and owner_role='support') then raise exception 'QA durable settlement observation has no incident'; end if;
end $$;
select 'Refund observations SQL QA PASS; business financial rows unchanged; no provider/email; single connection only' as result;
rollback;
select
  (select count(*) from public.customers where id='00000000-0000-4000-a000-202611170001') as remaining_customers,
  (select count(*) from public.orders where id in('00000000-0000-4000-a000-202611170002','00000000-0000-4000-a000-202611170003')) as remaining_orders,
  (select count(*) from public.payments where id in('00000000-0000-4000-a000-202611170004','00000000-0000-4000-a000-202611170005')) as remaining_payments,
  (select count(*) from public.refund_charge_ledger where payment_id in('00000000-0000-4000-a000-202611170004','00000000-0000-4000-a000-202611170005')) as remaining_charge_ledgers,
  (select count(*) from public.refund_observations where payment_id in('00000000-0000-4000-a000-202611170004','00000000-0000-4000-a000-202611170005')) as remaining_observations,
  (select count(*) from public.refund_webhook_events where event_id like 'evt_QARefund%') as remaining_refund_events,
  (select count(*) from public.order_operational_incidents where order_id in('00000000-0000-4000-a000-202611170002','00000000-0000-4000-a000-202611170003')) as remaining_incidents,
  (select count(*) from public.order_payment_settlements where order_id='00000000-0000-4000-a000-202611170003') as remaining_settlements,
  (select count(*) from public.payment_webhook_events where event_id='evt_QARefundPaidReplay') as remaining_payment_events;
