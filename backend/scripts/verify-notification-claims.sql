-- Executed successfully on 2026-11-16 after migration 20261116051026; rerun only in isolated QA.
-- Provider acknowledgements below are synthetic. Every fixture is rolled back.
-- Single-session lease checks only; this does not prove two-connection concurrency.
begin;
set local role service_role;
do $$
declare
  customer constant uuid:='00000000-0000-4000-a000-202611160001';
  allowed_order constant uuid:='00000000-0000-4000-a000-202611160002';
  other_order constant uuid:='00000000-0000-4000-a000-202611160003';
  ack_order constant uuid:='00000000-0000-4000-a000-202611160004';
  exhausted_order constant uuid:='00000000-0000-4000-a000-202611160005';
  job public.order_notification_outbox; previous_token uuid; body jsonb;
  role_name text; function_name text; attempt integer;
begin
  foreach function_name in array array['public.claim_order_confirmations(integer,text[])',
    'public.freeze_order_confirmation(uuid,uuid,jsonb)','public.finish_order_confirmation(uuid,uuid,text,text)'] loop
    foreach role_name in array array['anon','authenticated'] loop
      if has_function_privilege(role_name,function_name,'execute') then raise exception 'QA public worker access: % %',role_name,function_name; end if;
    end loop;
    if not has_function_privilege('service_role',function_name,'execute') then raise exception 'QA worker privilege missing: %',function_name; end if;
  end loop;
  -- Fixed dedicated IDs let the final SELECT prove fixture absence after rollback.
  if exists(select 1 from public.customers where id=customer or email like 'qa-notification-claims-20261116-%@example.invalid')
    or exists(select 1 from public.orders where id in(allowed_order,other_order,ack_order,exhausted_order)
      or number like 'QA-NOTIFICATION-CLAIMS-20261116-%' or email like 'qa-notification-claims-20261116-%@example.invalid') then raise exception 'QA fixture namespace already occupied'; end if;
  insert into public.customers(id,email) values(customer,'qa-notification-claims-20261116-allowed@example.invalid');
  insert into public.orders(id,number,customer_id,email,subtotal_cents,total_cents,shipping_address,status,paid_at,fulfillment_status)
    values(allowed_order,'QA-NOTIFICATION-CLAIMS-20261116-'||allowed_order,customer,'qa-notification-claims-20261116-allowed@example.invalid',100,100,'{}','paid',now(),'ready'),
      (other_order,'QA-NOTIFICATION-CLAIMS-20261116-'||other_order,customer,'qa-notification-claims-20261116-other@example.invalid',100,100,'{}','paid',now(),'ready'),
      (ack_order,'QA-NOTIFICATION-CLAIMS-20261116-'||ack_order,customer,'qa-notification-claims-20261116-ack@example.invalid',100,100,'{}','paid',now(),'ready'),
      (exhausted_order,'QA-NOTIFICATION-CLAIMS-20261116-'||exhausted_order,customer,'qa-notification-claims-20261116-exhaust@example.invalid',100,100,'{}','paid',now(),'ready');
  insert into public.order_notification_outbox(order_id,type,payload)
    values(allowed_order,'confirmation','{}'),(allowed_order,'receipt','{}'),(other_order,'confirmation','{}'),
      (ack_order,'confirmation','{}'),(exhausted_order,'confirmation','{}');
  select * into job from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-allowed@example.invalid']);
  if job.order_id is distinct from allowed_order or job.attempts<>1 or job.delivery_token is null then raise exception 'QA wrong claim scope'; end if;
  if exists(select 1 from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-allowed@example.invalid'])) then raise exception 'QA active claim duplicated'; end if;
  if exists(select 1 from public.order_notification_outbox where order_id=other_order and attempts<>0) then raise exception 'QA test altered unapproved recipient'; end if;
  body:='{"from":"orders@example.invalid","to":"qa-notification-claims-20261116-allowed@example.invalid","subject":"Fixture","html":"<p>Fixture only</p>"}';
  if public.freeze_order_confirmation(job.id,job.delivery_token,body) is distinct from body then raise exception 'QA freeze failed'; end if;
  if public.freeze_order_confirmation(job.id,job.delivery_token,body||'{"subject":"Changed"}') is distinct from body then raise exception 'QA immutable provider payload changed'; end if;
  if public.finish_order_confirmation(job.id,gen_random_uuid(),'QA-NOT-A-PROVIDER-ID',null) then raise exception 'QA stale claimant acknowledged'; end if;
  previous_token:=job.delivery_token;
  update public.order_notification_outbox set next_attempt_at=now()-interval '1 minute' where id=job.id;
  select * into job from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-allowed@example.invalid']);
  if job.attempts<>2 or job.delivery_token=previous_token then raise exception 'QA expired lease not recovered'; end if;
  if public.finish_order_confirmation(job.id,previous_token,'QA-NOT-A-PROVIDER-ID',null) then raise exception 'QA previous worker accepted'; end if;
  if not public.finish_order_confirmation(job.id,job.delivery_token,null,'provider_unavailable') then raise exception 'QA retry not recorded'; end if;
  if not exists(select 1 from public.order_notification_outbox where id=job.id and status='failed' and next_attempt_at>now() and not delivery_exhausted) then raise exception 'QA retry backoff failed'; end if;
  update public.order_notification_outbox set first_attempt_at=now()-interval '24 hours',next_attempt_at=now()-interval '1 minute' where id=job.id;
  if exists(select 1 from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-allowed@example.invalid'])) then raise exception 'QA provider retention limit exceeded'; end if;
  if not exists(select 1 from public.order_notification_outbox where id=job.id and delivery_exhausted and status='failed') then raise exception 'QA manual review not preserved'; end if;
  if not exists(select 1 from public.order_operational_incidents where order_id=allowed_order and code='order_confirmation_delivery' and owner_role='support' and status='open') then raise exception 'QA delivery failure has no owner/action'; end if;
  if exists(select 1 from public.order_notification_outbox where order_id=allowed_order and type='receipt' and (attempts<>0 or status<>'pending')) then raise exception 'QA unsupported receipt processed'; end if;

  -- A synthetic provider ID cannot mark a job sent before its body is frozen.
  select * into job from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-ack@example.invalid']);
  if job.order_id is distinct from ack_order then raise exception 'QA acknowledgement claim missing'; end if;
  begin
    perform public.finish_order_confirmation(job.id,job.delivery_token,'QA-SYNTHETIC-ACK',null);
    raise exception 'QA acknowledgement without body unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'invalid_provider_ack' then raise; end if;
  end;
  if not exists(select 1 from public.order_notification_outbox where id=job.id and status='sending'
    and delivery_body is null and provider_message_id is null and sent_at is null) then raise exception 'QA rejected acknowledgement changed state'; end if;
  body:=jsonb_set(body,'{to}','"qa-notification-claims-20261116-ack@example.invalid"');
  if public.freeze_order_confirmation(job.id,job.delivery_token,body) is distinct from body then raise exception 'QA acknowledgement body not frozen'; end if;
  if not public.finish_order_confirmation(job.id,job.delivery_token,'QA-SYNTHETIC-ACK',null) then raise exception 'QA valid acknowledgement rejected'; end if;
  if not exists(select 1 from public.order_notification_outbox where id=job.id and status='sent'
    and provider_message_id='QA-SYNTHETIC-ACK' and sent_at is not null and delivery_token is null
    and last_error is null and delivery_body=body) then raise exception 'QA accepted acknowledgement not durably recorded'; end if;
  if public.finish_order_confirmation(job.id,job.delivery_token,'QA-SYNTHETIC-ACK',null) then raise exception 'QA sent acknowledgement replay accepted'; end if;
  if exists(select 1 from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-ack@example.invalid'])) then raise exception 'QA sent job reclaimed'; end if;

  -- Exercise all five claims/failures, then prove there is no sixth attempt.
  for attempt in 1..5 loop
    select * into job from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-exhaust@example.invalid']);
    if job.order_id is distinct from exhausted_order or job.attempts is distinct from attempt then raise exception 'QA retry claim count wrong'; end if;
    if not public.finish_order_confirmation(job.id,job.delivery_token,null,'provider_unavailable') then raise exception 'QA bounded retry not recorded'; end if;
    if not exists(select 1 from public.order_notification_outbox where id=job.id and status='failed'
      and attempts=attempt and delivery_exhausted=(attempt=5) and next_attempt_at>now()
      and delivery_token is null and last_error='provider_unavailable') then raise exception 'QA attempt exhaustion state wrong'; end if;
    update public.order_notification_outbox set next_attempt_at=now()-interval '1 minute' where id=job.id;
  end loop;
  if exists(select 1 from public.claim_order_confirmations(2,array['qa-notification-claims-20261116-exhaust@example.invalid'])) then raise exception 'QA sixth attempt claimed'; end if;
  if not exists(select 1 from public.order_notification_outbox where id=job.id and attempts=5 and delivery_exhausted) then raise exception 'QA retry bound not preserved'; end if;
  if not exists(select 1 from public.order_operational_incidents where order_id=exhausted_order
    and code='order_confirmation_delivery' and owner_role='support' and status='open'
    and length(next_action)>0) then raise exception 'QA exhausted retries have no support owner/action'; end if;
end $$;
select 'Notification lease/scope/body/ack/retry/retention/privilege QA PASS; synthetic acknowledgements only; no provider called' as result;
rollback;

-- Separate post-rollback query: all four counts must be zero. This is no delivery proof.
select
  (select count(*) from public.customers where id='00000000-0000-4000-a000-202611160001') as remaining_customers,
  (select count(*) from public.orders where number like 'QA-NOTIFICATION-CLAIMS-20261116-%'
    or id in('00000000-0000-4000-a000-202611160002','00000000-0000-4000-a000-202611160003',
      '00000000-0000-4000-a000-202611160004','00000000-0000-4000-a000-202611160005')) as remaining_orders,
  (select count(*) from public.order_notification_outbox where order_id in(
    '00000000-0000-4000-a000-202611160002','00000000-0000-4000-a000-202611160003',
    '00000000-0000-4000-a000-202611160004','00000000-0000-4000-a000-202611160005')) as remaining_notifications,
  (select count(*) from public.order_operational_incidents where order_id in(
    '00000000-0000-4000-a000-202611160002','00000000-0000-4000-a000-202611160003',
    '00000000-0000-4000-a000-202611160004','00000000-0000-4000-a000-202611160005')) as remaining_incidents;
