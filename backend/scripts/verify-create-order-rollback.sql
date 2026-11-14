-- QA only: caller supplies an authorized private administrative SQL connection.
-- No DDL, external operation or persistent fixture. Do NOT wrap in an EXCEPTION handler
-- which masks errors. PASS is returned only if every assertion below completed.
-- Proves GLOBAL TRANSACTION/SUBTRANSACTION ROLLBACK AFTER RPC RETURN, not an injected
-- failure inside create_order_atomic and not concurrent checkout correctness.
do $qa$
declare
  v_customer uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_variant uuid := gen_random_uuid();
  v_email text := 'qa-atomic-' || v_customer::text || '@example.invalid';
  v_order public.orders;
  v_order_id uuid;
begin
  -- This subtransaction contains all fixture creation; its sentinel rolls it all back.
  begin
    insert into public.customers(id,email,first_name,last_name)
      values(v_customer,v_email,'QA','Rollback');
    insert into public.products(id,slug,name,description,is_active)
      values(v_product,'qa-rollback-' || v_product::text,'QA rollback only','Inactive test fixture',false);
    insert into public.product_variants(id,product_id,sku,title,price_cents,is_active)
      values(v_variant,v_product,'QA-ROLLBACK-' || v_variant::text,'QA variant',100,false);
    insert into public.inventory(variant_id,quantity) values(v_variant,0);

    -- The RPC returns successfully before the caller's forced failure.
    begin
      select * into v_order from public.create_order_atomic(pg_catalog.jsonb_build_object(
        'customerId',v_customer,'userId',null,'email',v_email,'currency','EUR',
        'subtotalCents',100,'discountCents',0,'shippingCents',0,'totalCents',100,
        'shippingMethod','standard','discountCode',null,
        'shippingAddress',pg_catalog.jsonb_build_object('firstName','QA','lastName','Rollback',
          'line1','QA fixture only','postalCode','00000','city','QA','country','FR'),
        'items',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'variant_id',v_variant,'sku','QA-ROLLBACK-' || v_variant::text,
          'product_name','QA rollback only','variant_title','QA variant',
          'unit_price_cents',100,'quantity',1,'total_cents',100,'image_url',null))
      ));
      v_order_id := v_order.id;
      if v_order_id is null then raise exception 'QA_FAIL: RPC did not return an order'; end if;
      if (select count(*) from public.orders where id=v_order_id) <> 1
         or (select count(*) from public.order_items where order_id=v_order_id) <> 1
         or (select count(*) from public.order_events where order_id=v_order_id and type='order_created') <> 1 then
        raise exception 'QA_FAIL: RPC did not persist its three expected relations before rollback';
      end if;
      raise exception using errcode='PZ001',message='QA caller failure AFTER create_order_atomic returned';
    exception when sqlstate 'PZ001' then
      -- Catch only the intentional post-return failure; ordinary RPC/assertion errors propagate.
      null;
    end;
    -- PL/pgSQL retains variable values across subtransaction rollback, allowing exact-ID checks.
    if v_order_id is null then raise exception 'QA_FAIL: post-return sentinel was not reached'; end if;
    if exists(select 1 from public.orders where id=v_order_id)
       or exists(select 1 from public.order_items where order_id=v_order_id)
       or exists(select 1 from public.order_events where order_id=v_order_id) then
      raise exception 'QA_FAIL: order/items/events survived post-return transaction rollback';
    end if;
    if not exists(select 1 from public.customers where id=v_customer)
       or not exists(select 1 from public.products where id=v_product)
       or not exists(select 1 from public.product_variants where id=v_variant) then
      raise exception 'QA_FAIL: setup unexpectedly vanished before its cleanup sentinel';
    end if;
    raise exception using errcode='PZ002',message='QA cleanup: roll back all inactive fixtures';
  exception when sqlstate 'PZ002' then
    null;
  end;
  if exists(select 1 from public.customers where id=v_customer)
     or exists(select 1 from public.products where id=v_product)
     or exists(select 1 from public.product_variants where id=v_variant)
     or exists(select 1 from public.inventory where variant_id=v_variant)
     or exists(select 1 from public.orders where id=v_order_id)
     or exists(select 1 from public.order_items where order_id=v_order_id)
     or exists(select 1 from public.order_events where order_id=v_order_id) then
    raise exception 'QA_FAIL: persistent fixture or commercial row remained after cleanup rollback';
  end if;
end;
$qa$;
select 'PASS: RPC returned with order/items/event; caller failure rolled them back; setup also rolled back' as result,
  'global transaction rollback after RPC return; not internal failure injection' as evidence_scope,
  'No persistent rows; order number sequence may advance (PostgreSQL sequences are nontransactional)' as limitation;
