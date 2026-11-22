-- Isolated private fixture only. No Stripe calls. Never activate these products.
-- Run SETUP, then FIRST and SECOND simultaneously on two connections, then CLEANUP.
-- Evidence must show distinct connection IDs, overlapping intervals, same intent/order and one persisted row.
-- Always run CLEANUP after setup, including on an inconclusive contention result.

-- SETUP
begin;
do $$ begin
 if exists(select 1 from public.products where id='00000000-0000-4000-a000-202611161011') or exists(select 1 from public.product_variants where id='00000000-0000-4000-a000-202611161012')
 or exists(select 1 from public.customers where email='qa-checkout-concurrency-20261116@example.invalid') or exists(select 1 from public.checkout_intents where key_hash='ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
 then raise exception 'QA concurrency namespace occupied'; end if;
end $$;
insert into public.products(id,slug,name,description,is_active) values('00000000-0000-4000-a000-202611161011','qa-checkout-concurrency-20261116','QA concurrency only','Private inactive test fixture',false);
insert into public.product_variants(id,product_id,sku,title,price_cents,is_active) values('00000000-0000-4000-a000-202611161012','00000000-0000-4000-a000-202611161011','QA-CONCURRENCY-20261116','QA',100,false);
commit;
select count(*) as active_qa_products from public.products where id='00000000-0000-4000-a000-202611161011' and is_active;

-- FIRST CONNECTION
with timing as materialized(select clock_timestamp() as started),
intent as materialized(select public.begin_checkout_intent('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',null,'{"order":{"email":"qa-checkout-concurrency-20261116@example.invalid","currency":"EUR","subtotalCents":100,"discountCents":0,"shippingCents":0,"totalCents":100,"shippingMethod":"standard","discountCode":null,"shippingAddress":{"firstName":"QA","lastName":"Only","line1":"12 rue QA","postalCode":"75001","city":"Paris","country":"FR"},"items":[{"variant_id":"00000000-0000-4000-a000-202611161012","sku":"QA-CONCURRENCY-20261116","product_name":"QA private","variant_title":"QA","unit_price_cents":100,"quantity":1,"total_cents":100,"image_url":null}]},"items":[],"totals":{"totalCents":100,"currency":"EUR"}}'::jsonb,'{"email":"qa-checkout-concurrency-20261116@example.invalid","firstName":"QA","lastName":"Only","address":{"firstName":"QA","lastName":"Only","line1":"12 rue QA","postalCode":"75001","city":"Paris","country":"FR"}}'::jsonb) as value from timing),
held as materialized(select pg_sleep(4) from intent)
select pg_backend_pid() as connection, (select started from timing) as started, clock_timestamp() as finished,
(select value->>'id' from intent) as intent_id, (select value->>'order_id' from intent) as order_id from held;

-- SECOND CONNECTION
with timing as materialized(select clock_timestamp() as started),
intent as materialized(select public.begin_checkout_intent('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',null,'{"order":{"email":"qa-checkout-concurrency-20261116@example.invalid","currency":"EUR","subtotalCents":100,"discountCents":0,"shippingCents":0,"totalCents":100,"shippingMethod":"standard","discountCode":null,"shippingAddress":{"firstName":"QA","lastName":"Only","line1":"12 rue QA","postalCode":"75001","city":"Paris","country":"FR"},"items":[{"variant_id":"00000000-0000-4000-a000-202611161012","sku":"QA-CONCURRENCY-20261116","product_name":"QA private","variant_title":"QA","unit_price_cents":100,"quantity":1,"total_cents":100,"image_url":null}]},"items":[],"totals":{"totalCents":100,"currency":"EUR"}}'::jsonb,'{"email":"qa-checkout-concurrency-20261116@example.invalid","firstName":"QA","lastName":"Only","address":{"firstName":"QA","lastName":"Only","line1":"12 rue QA","postalCode":"75001","city":"Paris","country":"FR"}}'::jsonb) as value from timing),
held as materialized(select pg_sleep(0) from intent)
select pg_backend_pid() as connection, (select started from timing) as started, clock_timestamp() as finished,
(select value->>'id' from intent) as intent_id, (select value->>'order_id' from intent) as order_id from held;

-- CLEANUP
begin;
do $$ begin
 if exists(select 1 from public.orders where email='qa-checkout-concurrency-20261116@example.invalid' and status<>'pending')
 or exists(select 1 from public.payments where order_id in(select id from public.orders where email='qa-checkout-concurrency-20261116@example.invalid'))
 then raise exception 'Unexpected QA financial state; cleanup halted'; end if;
end $$;
delete from public.checkout_intents where key_hash='ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' and actor_id is null and order_id in(select id from public.orders where email='qa-checkout-concurrency-20261116@example.invalid');
delete from public.orders where email='qa-checkout-concurrency-20261116@example.invalid' and customer_id in(select id from public.customers where email='qa-checkout-concurrency-20261116@example.invalid');
delete from public.addresses where customer_id in(select id from public.customers where email='qa-checkout-concurrency-20261116@example.invalid');
delete from public.customers where email='qa-checkout-concurrency-20261116@example.invalid' and not exists(select 1 from public.orders where orders.customer_id=customers.id);
delete from public.product_variants where id='00000000-0000-4000-a000-202611161012' and product_id='00000000-0000-4000-a000-202611161011' and not is_active;
delete from public.products where id='00000000-0000-4000-a000-202611161011' and slug='qa-checkout-concurrency-20261116' and not is_active;
commit;
select (select count(*) from public.products where id='00000000-0000-4000-a000-202611161011') as remaining_products,
(select count(*) from public.product_variants where id='00000000-0000-4000-a000-202611161012') as remaining_variants,
(select count(*) from public.orders where email='qa-checkout-concurrency-20261116@example.invalid') as remaining_orders,
(select count(*) from public.customers where email='qa-checkout-concurrency-20261116@example.invalid') as remaining_customers,
(select count(*) from public.checkout_intents where key_hash='ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') as remaining_intents;
