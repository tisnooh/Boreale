-- Synthetic fixtures exist only inside this rolled-back transaction. No provider call.
begin;
set local role service_role;
do $$
declare
  c uuid := gen_random_uuid(); o uuid := gen_random_uuid(); pending_id uuid := gen_random_uuid();
  result jsonb; denied boolean; events_before bigint; original_total integer;
begin
  if has_function_privilege('anon','public.admin_update_order_operation(uuid,text,text,text,jsonb,jsonb,text,text)','execute')
     or has_function_privilege('authenticated','public.admin_update_order_operation(uuid,text,text,text,jsonb,jsonb,text,text)','execute')
     then raise exception 'QA public RPC access'; end if;
  insert into public.customers(id,email) values(c,'qa-orders-rollback@example.invalid');
  insert into public.orders(id,number,customer_id,email,status,fulfillment_status,paid_at,subtotal_cents,total_cents,shipping_address)
    values(o,'QA-ADMIN-ROLLBACK-'||o,c,'qa-orders-rollback@example.invalid','paid','ready',now(),4200,4200,'{}');
  insert into public.order_items(order_id,sku,product_name,unit_price_cents,quantity,total_cents)
    values(o,'QA-ROLLBACK','Fixture de recette',2100,2,4200);
  select total_cents into original_total from public.orders where id=o;
  result := public.admin_update_order_operation(o,'advance','paid','processing','{}',null,null,'qa@example.invalid');
  if result->>'status'<>'processing' or jsonb_array_length(result->'order_items')<>1 then raise exception 'QA preparation/items'; end if;
  denied:=false;
  begin perform public.admin_update_order_operation(o,'advance','paid','shipped','{}',null,null,'qa@example.invalid');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA stale operation accepted'; end if;
  denied:=false;
  begin perform public.admin_update_order_operation(o,'advance','processing','shipped','{}',null,null,'qa@example.invalid');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA missing tracking accepted'; end if;
  denied:=false;
  begin perform public.admin_update_order_operation(o,'advance','processing','shipped','{"trackingCarrier":"QA","trackingNumber":"T1","trackingUrl":"javascript:alert(1)"}',null,null,'qa@example.invalid');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA unsafe tracking accepted'; end if;
  result:=public.admin_update_order_operation(o,'advance','processing','shipped','{"trackingCarrier":"QA transport","trackingNumber":"T1","trackingUrl":"https://example.invalid/T1"}',null,null,'qa@example.invalid');
  if result->>'status'<>'shipped' or result->>'shipped_at' is null then raise exception 'QA shipping'; end if;
  result:=public.admin_update_order_operation(o,'tracking','shipped',null,'{"trackingNumber":"T2"}','{"carrier":"QA transport","number":"T1","url":"https://example.invalid/T1"}',null,'qa@example.invalid');
  if result->>'tracking_number'<>'T2' then raise exception 'QA tracking correction'; end if;
  denied:=false;
  begin perform public.admin_update_order_operation(o,'tracking','shipped',null,'{"trackingNumber":"T3"}','{"carrier":"QA transport","number":"T1","url":"https://example.invalid/T1"}',null,'qa@example.invalid');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA tracking lost update'; end if;
  result:=public.admin_update_order_operation(o,'note',null,null,null,null,'  Note interne de recette  ','qa@example.invalid');
  if not exists(select 1 from public.order_events where order_id=o and type='admin_note' and data->>'note'='Note interne de recette') then raise exception 'QA missing note'; end if;
  result:=public.admin_update_order_operation(o,'advance','shipped','delivered','{}',null,null,'qa@example.invalid');
  if result->>'status'<>'delivered' or result->>'delivered_at' is null then raise exception 'QA delivery'; end if;
  denied:=false;
  begin perform public.admin_update_order_operation(o,'advance','delivered','refunded','{}',null,null,'qa@example.invalid');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA manual refund accepted'; end if;
  select count(*) into events_before from public.order_events where order_id=o;
  begin
    perform public.admin_update_order_operation(o,'note',null,null,null,null,'Must roll back', 'qa@example.invalid');
    raise exception using errcode='P0001',message='forced_late_failure';
  exception when raise_exception then null; end;
  if (select count(*) from public.order_events where order_id=o)<>events_before then raise exception 'QA partial transaction persisted'; end if;
  update public.orders set status='paid',fulfillment_status='blocked' where id=o;
  denied:=false;
  begin perform public.admin_update_order_operation(o,'advance','paid','processing','{}',null,null,'qa@example.invalid');
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA blocked fulfillment advanced'; end if;
  insert into public.orders(id,number,customer_id,email,subtotal_cents,total_cents,shipping_address)
    values(pending_id,'QA-ADMIN-ROLLBACK-'||pending_id,c,'qa-orders-rollback@example.invalid',4200,4200,'{}');
  result:=public.admin_update_order_operation(pending_id,'advance','pending','cancelled','{}',null,null,repeat('x',195)||'@example.invalid');
  if result->>'status'<>'cancelled' or result->>'cancelled_at' is null then raise exception 'QA pending cancellation'; end if;
  if not exists(select 1 from public.order_events where order_id=pending_id and type='admin_cancellation' and data->>'by'=repeat('x',195)||'@example.invalid') then raise exception 'QA full cancellation actor lost'; end if;
  if (select total_cents from public.orders where id=o)<>original_total
     or exists(select 1 from public.payments where order_id in(o,pending_id))
     or exists(select 1 from public.order_notification_outbox where order_id in(o,pending_id)) then raise exception 'QA unexpected commercial side effect'; end if;
end $$;
select 'admin order operations: permissions, preparation, CAS, tracking, notes, delivery, cancellation, rollback, financial guards and no sends PASS' as result;
rollback;
