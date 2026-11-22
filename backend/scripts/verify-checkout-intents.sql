-- Executed successfully on 2026-11-16 after migration 20261116142245; isolated QA only.
-- Synthetic session IDs only. No Stripe/email operation. Single connection, no concurrency claim.
begin;
-- Privileged SQL runner only: synthetic auth identities, no password/login/email flow.
do $$ begin
  if exists(select 1 from auth.users where id in('00000000-0000-4000-a000-202611161003','00000000-0000-4000-a000-202611161004')
    or email in('qa-checkout-actor1-20261116@example.invalid','qa-checkout-actor2-20261116@example.invalid'))
    then raise exception 'QA auth fixture namespace occupied'; end if;
end $$;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-4000-a000-202611161003','authenticated','authenticated','qa-checkout-actor1-20261116@example.invalid','{}','{}',now(),now()),
    ('00000000-0000-4000-a000-202611161004','authenticated','authenticated','qa-checkout-actor2-20261116@example.invalid','{}','{}',now(),now());
set local role service_role;
do $$
declare
  product constant uuid:='00000000-0000-4000-a000-202611161001';
  variant constant uuid:='00000000-0000-4000-a000-202611161002';
  customer_email constant text:='qa-checkout-intent-20261116@example.invalid';
  snap jsonb; body jsonb; n jsonb; frozen jsonb; exhausted jsonb; retention jsonb; previous_token uuid;
  actor1 constant uuid:='00000000-0000-4000-a000-202611161003';
  actor2 constant uuid:='00000000-0000-4000-a000-202611161004';
  owner1 jsonb; owner2 jsonb;
  signature text; role_name text; attempt integer; order_count bigint; address_count bigint;
begin
  foreach signature in array array['public.begin_checkout_intent(text,text,uuid,jsonb,jsonb)',
    'public.freeze_checkout_intent(uuid,jsonb)','public.claim_checkout_intent(uuid)',
    'public.bind_checkout_session(uuid,uuid,text,text,bigint,integer,text)','public.fail_checkout_intent(uuid,uuid)'] loop
    foreach role_name in array array['anon','authenticated'] loop
      if has_function_privilege(role_name,signature,'execute') then raise exception 'QA public checkout RPC access'; end if;
    end loop;
    if not has_function_privilege('service_role',signature,'execute') then raise exception 'QA worker checkout RPC inaccessible'; end if;
  end loop;
  if exists(select 1 from public.products where id=product) or exists(select 1 from public.product_variants where id=variant)
    or exists(select 1 from public.customers where email=customer_email)
    or exists(select 1 from public.payments where stripe_session_id='cs_test_QACheckout20261116')
    or exists(select 1 from public.checkout_intents where key_hash in(repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64)))
    then raise exception 'QA fixture namespace occupied'; end if;
  insert into public.products(id,slug,name,description,is_active) values(product,'qa-checkout-intent-20261116','QA only','Rollback fixture',false);
  insert into public.product_variants(id,product_id,sku,title,price_cents,is_active) values(variant,product,'QA-CHECKOUT-INTENT-20261116','QA',100,false);
  snap:=jsonb_build_object('order',jsonb_build_object('email',customer_email,'currency','EUR',
    'subtotalCents',100,'discountCents',0,'shippingCents',0,'totalCents',100,'shippingMethod','standard',
    'shippingAddress',jsonb_build_object('firstName','QA','lastName','Only','line1','12 rue QA','postalCode','75001','city','Paris','country','FR'),
    'items',jsonb_build_array(jsonb_build_object('variant_id',variant,'sku','QA','product_name','QA only',
      'unit_price_cents',100,'quantity',1,'total_cents',100))),
    'items','[]'::jsonb,'totals',jsonb_build_object('totalCents',100,'currency','EUR'));
  if public.begin_checkout_intent(repeat('a',64),repeat('e',64),null,null,null) is not null then raise exception 'QA nonexistent lookup created data'; end if;
  n:=public.begin_checkout_intent(repeat('a',64),repeat('e',64),null,snap,
    jsonb_build_object('email',customer_email,'firstName','QA','lastName','Only','address',snap->'order'->'shippingAddress'));
  select count(*) into order_count from public.orders where email=customer_email;
  select count(*) into address_count from public.addresses where customer_id in(select id from public.customers where email=customer_email);
  if order_count<>1 or address_count<>1 then raise exception 'QA atomic prepare missing order/address'; end if;
  if public.begin_checkout_intent(repeat('a',64),repeat('e',64),null,snap,null)->>'id' is distinct from n->>'id' then raise exception 'QA replay created another intent'; end if;
  if (select count(*) from public.orders where email=customer_email)<>order_count
    or (select count(*) from public.addresses where customer_id in(select id from public.customers where email=customer_email))<>address_count
    then raise exception 'QA replay duplicated order/address'; end if;
  begin
    perform public.begin_checkout_intent(repeat('a',64),repeat('f',64),null,null,null);
    raise exception 'QA changed request accepted';
  exception when check_violation then null; end;
  body:=jsonb_build_object('mode','payment','customer_email',customer_email,
    'metadata',jsonb_build_object('orderId',n->>'order_id','checkoutIntentId',n->>'id','brand','boreale'),
    'line_items',jsonb_build_array(jsonb_build_object('quantity',1,'price_data',jsonb_build_object('unit_amount',100,'currency','eur'))));
  frozen:=public.freeze_checkout_intent((n->>'id')::uuid,body);
  if frozen->'stripe_params' is distinct from body then raise exception 'QA frozen payload missing'; end if;
  if public.freeze_checkout_intent((n->>'id')::uuid,body||'{"mode":"setup"}')->'stripe_params' is distinct from body then raise exception 'QA provider payload changed'; end if;
  n:=public.claim_checkout_intent((n->>'id')::uuid);
  if (n->>'attempts')::integer<>1 or n->>'lease_token' is null then raise exception 'QA claim not leased'; end if;
  begin
    perform public.claim_checkout_intent((n->>'id')::uuid);
    raise exception 'QA active lease duplicated';
  exception when check_violation then null; end;
  previous_token:=(n->>'lease_token')::uuid;
  update public.checkout_intents set lease_until=now()-interval '1 second' where id=(n->>'id')::uuid;
  n:=public.claim_checkout_intent((n->>'id')::uuid);
  if (n->>'attempts')::integer<>2 or (n->>'lease_token')::uuid=previous_token then raise exception 'QA lease recovery failed'; end if;
  begin
    perform public.bind_checkout_session((n->>'id')::uuid,previous_token,'cs_test_QACheckout20261116',null,2000000000,100,'EUR');
    raise exception 'QA stale lease bound';
  exception when check_violation then null; end;
  begin
    perform public.bind_checkout_session((n->>'id')::uuid,(n->>'lease_token')::uuid,'cs_test_QACheckout20261116',null,2000000000,101,'EUR');
    raise exception 'QA mismatched session amount accepted';
  exception when check_violation then null; end;
  n:=public.bind_checkout_session((n->>'id')::uuid,(n->>'lease_token')::uuid,'cs_test_QACheckout20261116',
    'https://checkout.stripe.com/c/pay/QA-NOT-A-REAL-SESSION',2000000000,100,'EUR');
  if n->>'state'<>'bound' or not exists(select 1 from public.orders where id=(n->>'order_id')::uuid and stripe_session_id='cs_test_QACheckout20261116')
    or not exists(select 1 from public.payments where order_id=(n->>'order_id')::uuid and stripe_session_id='cs_test_QACheckout20261116' and status='pending')
    then raise exception 'QA atomic session/payment bind incomplete'; end if;
  update public.payments set status='refunded',refunded_cents=100 where order_id=(n->>'order_id')::uuid;
  perform public.bind_checkout_session((n->>'id')::uuid,null,'cs_test_QACheckout20261116',null,2000000000,100,'EUR');
  if not exists(select 1 from public.payments where order_id=(n->>'order_id')::uuid and status='refunded' and refunded_cents=100)
    or (select count(*) from public.payments where order_id=(n->>'order_id')::uuid)<>1 then raise exception 'QA bind replay regressed financial state'; end if;
  -- A failure late in prepare must undo its earlier customer/address/order writes.
  begin
    perform public.begin_checkout_intent(repeat('d',64),repeat('e',64),null,
      jsonb_set(snap,'{order,totalCents}','101'),jsonb_build_object('email',customer_email,'address',snap->'order'->'shippingAddress'));
    raise exception 'QA invalid order accepted';
  exception when raise_exception then if sqlerrm not like 'order_totals_mismatch%' then raise; end if; end;
  if (select count(*) from public.orders where email=customer_email)<>1
    or (select count(*) from public.addresses where customer_id in(select id from public.customers where email=customer_email))<>address_count
    or exists(select 1 from public.checkout_intents where key_hash=repeat('d',64)) then raise exception 'QA prepare rollback incomplete'; end if;
  exhausted:=public.begin_checkout_intent(repeat('b',64),repeat('e',64),null,snap,
    jsonb_build_object('email',customer_email,'address',snap->'order'->'shippingAddress'));
  body:=jsonb_set(jsonb_set(body,'{metadata,orderId}',exhausted->'order_id'),'{metadata,checkoutIntentId}',exhausted->'id');
  perform public.freeze_checkout_intent((exhausted->>'id')::uuid,body);
  for attempt in 1..5 loop
    exhausted:=public.claim_checkout_intent((exhausted->>'id')::uuid);
    if (exhausted->>'attempts')::integer<>attempt then raise exception 'QA attempt count wrong'; end if;
    if not public.fail_checkout_intent((exhausted->>'id')::uuid,(exhausted->>'lease_token')::uuid) then raise exception 'QA failure unrecorded'; end if;
  end loop;
  exhausted:=public.claim_checkout_intent((exhausted->>'id')::uuid);
  if exhausted->>'state'<>'manual_review' or (exhausted->>'attempts')::integer<>5 then raise exception 'QA sixth create permitted'; end if;
  if not exists(select 1 from public.order_operational_incidents where order_id=(exhausted->>'order_id')::uuid
    and code='checkout_session_reconciliation' and owner_role='support' and status='open') then raise exception 'QA exhaustion lacks owner'; end if;
  retention:=public.begin_checkout_intent(repeat('c',64),repeat('e',64),null,snap,
    jsonb_build_object('email',customer_email,'address',snap->'order'->'shippingAddress'));
  body:=jsonb_set(jsonb_set(body,'{metadata,orderId}',retention->'order_id'),'{metadata,checkoutIntentId}',retention->'id');
  perform public.freeze_checkout_intent((retention->>'id')::uuid,body);
  perform public.claim_checkout_intent((retention->>'id')::uuid);
  update public.checkout_intents set lease_until=now()-interval '1 second',retry_deadline=now()-interval '1 second' where id=(retention->>'id')::uuid;
  retention:=public.claim_checkout_intent((retention->>'id')::uuid);
  if retention->>'state'<>'manual_review' or (retention->>'attempts')::integer<>1 then raise exception 'QA expired retry window restarted'; end if;
  -- Same opaque key in two authenticated scopes and guest scope must never return another order.
  -- The contact is linked administratively for this fixture; checkout must not transfer it by email.
  update public.customers set user_id=actor1 where email=customer_email;
  select count(*) into address_count from public.addresses where customer_id in(select id from public.customers where email=customer_email);
  owner1:=public.begin_checkout_intent(repeat('a',64),repeat('e',64),actor1,snap,
    jsonb_build_object('email',customer_email,'address',snap->'order'->'shippingAddress'));
  owner2:=public.begin_checkout_intent(repeat('a',64),repeat('e',64),actor2,snap,
    jsonb_build_object('email',customer_email,'address',snap->'order'->'shippingAddress'));
  if owner1->>'id'=n->>'id' or owner2->>'id'=n->>'id' or owner1->>'id'=owner2->>'id'
    then raise exception 'QA authenticated/guest scope leaked'; end if;
  if not exists(select 1 from public.orders where id=(owner1->>'order_id')::uuid and user_id=actor1)
    or not exists(select 1 from public.orders where id=(owner2->>'order_id')::uuid and user_id=actor2)
    or not exists(select 1 from public.orders where id=(n->>'order_id')::uuid and user_id is null)
    or not exists(select 1 from public.customers where email=customer_email and user_id=actor1)
    then raise exception 'QA customer ownership transferred by email'; end if;
  if (select count(*) from public.addresses where customer_id in(select id from public.customers where email=customer_email))<>address_count+1
    then raise exception 'QA unrelated actor changed linked address book'; end if;
  if public.begin_checkout_intent(repeat('a',64),repeat('e',64),actor1,null,null)->>'id' is distinct from owner1->>'id'
    or public.begin_checkout_intent(repeat('a',64),repeat('e',64),actor2,null,null)->>'id' is distinct from owner2->>'id'
    or public.begin_checkout_intent(repeat('a',64),repeat('e',64),null,null,null)->>'id' is distinct from n->>'id'
    then raise exception 'QA authenticated replay scope mismatch'; end if;
end $$;
select 'Checkout intent single-session SQL QA PASS; synthetic sessions only; no provider called' as result;
rollback;
select
  (select count(*) from public.customers where email='qa-checkout-intent-20261116@example.invalid') as remaining_customers,
  (select count(*) from public.orders where email='qa-checkout-intent-20261116@example.invalid') as remaining_orders,
  (select count(*) from public.products where id='00000000-0000-4000-a000-202611161001') as remaining_products,
  (select count(*) from public.product_variants where id='00000000-0000-4000-a000-202611161002') as remaining_variants,
  (select count(*) from public.checkout_intents where key_hash in(repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64))) as remaining_intents,
  (select count(*) from public.payments where stripe_session_id='cs_test_QACheckout20261116') as remaining_payments,
  (select count(*) from auth.users where id in('00000000-0000-4000-a000-202611161003','00000000-0000-4000-a000-202611161004')) as remaining_auth_users,
  (select count(*) from public.profiles where user_id in('00000000-0000-4000-a000-202611161003','00000000-0000-4000-a000-202611161004')) as remaining_profiles;
