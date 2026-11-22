import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Real database transactions, synthetic payment events: NO Stripe request/email.
// Inactive, run-scoped fixtures never enter the public catalogue and are removed.
assert.equal(process.env.SUPABASE_URL, 'https://luojeyfznonjnacftxbm.supabase.co');
assert.equal(process.env.CHECKOUT_ENABLED, 'false');
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY);
assert.ok(process.env.SUPABASE_PUBLISHABLE_KEY);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, options);
const run = randomUUID();
const email = `boreale-transactions-${run}@example.invalid`;
const slug = `qa-transactions-${run}`;
const code = `QA-${run.toUpperCase()}`;
let customerId;
let productId;
let discountId;
let failed = false;
const variants = [];
const checks = [];
function check(name, condition) { assert.ok(condition, name); checks.push(name); }
async function ok(request) {
  const result = await request;
  if (result.error) throw new Error(`Database operation failed: ${result.error.code ?? 'unknown'} ${result.error.message}`);
  return result.data;
}
function input(items, overrides = {}) {
  const snapshots = items.map(([index, quantity]) => ({ variant_id: variants[index].id,
    sku: variants[index].sku, product_name: 'QA TRANSACTION — NOT FOR SALE', variant_title: 'QA',
    unit_price_cents: 1000, quantity, total_cents: 1000 * quantity, image_url: null }));
  const subtotal = snapshots.reduce((sum, item) => sum + item.total_cents, 0);
  return { customerId, userId: null, email, currency: 'EUR', subtotalCents: subtotal,
    discountCents: 100, shippingCents: 0, totalCents: subtotal - 100, shippingMethod: 'standard',
    discountCode: code, shippingAddress: { firstName: 'QA', lastName: 'QA', line1: 'TEST',
      postalCode: '75001', city: 'Paris', country: 'FR' }, items: snapshots, ...overrides };
}
async function create(items, overrides = {}) {
  return ok(db.rpc('create_order_atomic', { p_input: input(items, overrides) }).single());
}
async function settle(order, eventId = `evt_qa_${randomUUID()}`, overrides = {}) {
  return db.rpc('settle_order_payment', { p_event_id: eventId, p_session_id: order.stripe_session_id,
    p_payment_intent_id: `pi_qa_${order.id}`, p_amount_cents: order.total_cents, p_currency: 'eur', ...overrides });
}
async function orderFor(items, overrides = {}) {
  return create(items, { stripeSessionId: `cs_qa_${randomUUID()}`, ...overrides });
}
async function quantity(index) {
  return (await ok(db.from('inventory').select('quantity').eq('variant_id', variants[index].id).single())).quantity;
}
async function orderCount() {
  const result = await db.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', customerId);
  assert.equal(result.error, null);
  return result.count;
}
try {
  customerId = (await ok(db.from('customers').insert({ email, first_name: 'QA', last_name: run }).select('id').single())).id;
  productId = (await ok(db.from('products').insert({ slug, name: 'QA TRANSACTION — NOT FOR SALE',
    description: run, is_active: false }).select('id').single())).id;
  for (let index = 0; index < 2; index++) {
    variants.push(await ok(db.from('product_variants').insert({ product_id: productId,
      sku: `${slug}-${index}`, title: 'QA', price_cents: 1000, is_active: false }).select('id,sku').single()));
    await ok(db.from('inventory').insert({ variant_id: variants[index].id, quantity: 5 }));
  }
  discountId = (await ok(db.from('discounts').insert({ code, type: 'fixed', value: 100,
    is_active: false }).select('id').single())).id;
  check('fixtures_hidden_from_public_catalogue', (await ok(anon.from('products').select('id').eq('id', productId))).length === 0);
  const before = await orderCount();
  const broken = input([[0, 1]]);
  broken.items[0].variant_id = randomUUID();
  const rollback = await db.rpc('create_order_atomic', { p_input: broken });
  check('invalid_item_rejected', Boolean(rollback.error));
  check('failed_create_leaves_no_partial_order', await orderCount() === before);
  const badTotals = await db.rpc('create_order_atomic', { p_input: input([[0, 1]], { totalCents: 1 }) });
  check('inconsistent_totals_rejected_without_order', Boolean(badTotals.error) && await orderCount() === before);

  const first = await orderFor([[0, 2]]);
  check('order_items_and_creation_event_persisted',
    (await ok(db.from('order_items').select('id').eq('order_id', first.id))).length === 1 &&
    (await ok(db.from('order_events').select('id').eq('order_id', first.id).eq('type', 'order_created'))).length === 1);
  const mismatch = await settle(first, undefined, { p_amount_cents: first.total_cents + 1 });
  check('wrong_amount_rolls_back', Boolean(mismatch.error) && await quantity(0) === 5 &&
    (await ok(db.from('payments').select('id').eq('order_id', first.id))).length === 0);
  const eventId = `evt_qa_${randomUUID()}`;
  const duplicate = await Promise.all([settle(first, eventId), settle(first, eventId)]);
  check('concurrent_same_event_both_acknowledge', duplicate.every((result) => !result.error));
  check('concurrent_same_event_processed_once', duplicate.filter((result) => result.data?.duplicate === false).length === 1);
  check('inventory_decremented_once', await quantity(0) === 3);
  check('payment_row_created_once', (await ok(db.from('payments').select('id').eq('order_id', first.id))).length === 1);
  check('discount_counted_once', (await ok(db.from('discounts').select('used_count').eq('id', discountId).single())).used_count === 1);
  check('notifications_durably_queued_once', (await ok(db.from('order_notification_outbox').select('id,status').eq('order_id', first.id))).length === 3);
  const otherEvent = await settle(first);
  check('distinct_event_same_session_deduplicated', !otherEvent.error && otherEvent.data.duplicate && await quantity(0) === 3);
  const conflict = await settle(first, undefined, { p_payment_intent_id: `pi_qa_different_${run}` });
  check('intent_rebinding_rejected', Boolean(conflict.error) && await quantity(0) === 3);
  const lateFailure = await orderFor([[0, 1]]);
  const discountBefore = (await ok(db.from('discounts').select('used_count').eq('id', discountId).single())).used_count;
  const lateFailureEvent = `evt_qa_${randomUUID()}`;
  const collision = await settle(lateFailure, lateFailureEvent, { p_payment_intent_id: `pi_qa_${first.id}` });
  check('late_payment_unique_conflict_rejected', Boolean(collision.error));
  check('late_failure_rolls_back_stock_discount_order_and_ledger', await quantity(0) === 3 &&
    (await ok(db.from('discounts').select('used_count').eq('id', discountId).single())).used_count === discountBefore &&
    (await ok(db.from('orders').select('status').eq('id', lateFailure.id).single())).status === 'pending' &&
    (await ok(db.from('payment_webhook_events').select('event_id').eq('event_id', lateFailureEvent))).length === 0);

  // No partial inventory allocation when a second line cannot be fulfilled.
  await ok(db.from('inventory').update({ quantity: 0 }).eq('variant_id', variants[1].id));
  const shortage = await orderFor([[0, 1], [1, 1]]);
  const shortageResult = await settle(shortage);
  const shortageOrder = await ok(db.from('orders').select('status,fulfillment_status').eq('id', shortage.id).single());
  check('paid_shortage_has_durable_incident', !shortageResult.error && shortageResult.data.fulfillment_status === 'blocked' &&
    Boolean(shortageResult.data.incident_code) && shortageOrder.status === 'paid');
  check('shortage_does_not_partially_decrement', await quantity(0) === 3 && await quantity(1) === 0);
  const shortageReplay = await settle(shortage);
  check('shortage_replay_stays_blocked_without_reallocation', !shortageReplay.error && shortageReplay.data.duplicate && await quantity(0) === 3);

  // Different orders race for one unit: exactly one allocation, no negative stock.
  await ok(db.from('inventory').update({ quantity: 1 }).eq('variant_id', variants[1].id));
  const pair = await Promise.all([orderFor([[1, 1]]), orderFor([[1, 1]])]);
  const race = await Promise.all(pair.map((order) => settle(order)));
  check('competing_orders_preserve_both_payments', race.every((result) => !result.error));
  check('competing_orders_only_one_allocation', race.filter((result) => result.data?.fulfillment_status === 'ready').length === 1 &&
    race.filter((result) => result.data?.fulfillment_status === 'blocked').length === 1 && await quantity(1) === 0);

  const late = await orderFor([[0, 1]]);
  await ok(db.from('orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', late.id));
  const lateResult = await settle(late);
  check('late_payment_after_cancellation_preserved_as_incident', !lateResult.error && lateResult.data.fulfillment_status === 'blocked' &&
    Boolean(lateResult.data.incident_code) && (await ok(db.from('payments').select('status').eq('order_id', late.id).single())).status === 'succeeded');
  check('cancelled_order_not_automatically_allocated', await quantity(0) === 3);
  const eventReused = await settle(late, eventId);
  check('event_cannot_be_reused_for_other_order', Boolean(eventReused.error));
  const expirationRaceOrder = await orderFor([[0, 1]]);
  const expirationRace = await Promise.all([
    db.rpc('cancel_pending_order', { p_order_id: expirationRaceOrder.id, p_reason: 'qa_expired' }),
    settle(expirationRaceOrder),
  ]);
  const afterRace = await ok(db.from('orders').select('status,fulfillment_status').eq('id', expirationRaceOrder.id).single());
  check('expiration_cannot_overwrite_committed_payment', expirationRace.every((result) => !result.error) && afterRace.status === 'paid');
  check('expiration_race_preserves_allocation_consistency', await quantity(0) === (afterRace.fulfillment_status === 'ready' ? 2 : 3));
  const denied = await anon.rpc('settle_order_payment', { p_event_id: `evt_qa_${run}`, p_session_id: first.stripe_session_id,
    p_payment_intent_id: `pi_qa_${first.id}`, p_amount_cents: first.total_cents, p_currency: 'eur' });
  check('public_cannot_settle_payment', ['42501', 'PGRST202'].includes(denied.error?.code));
  const deniedCreate = await anon.rpc('create_order_atomic', { p_input: input([[0, 1]]) });
  check('public_cannot_create_orders', ['42501', 'PGRST202'].includes(deniedCreate.error?.code));
  for (const table of ['order_notification_outbox', 'payment_webhook_events', 'order_operational_incidents', 'order_payment_settlements']) {
    await ok(db.from(table).select('*').limit(1)); // Confirm table exists: a typo must fail the test.
    const result = await anon.from(table).select('*').limit(1);
    check(`public_cannot_read_${table}`, result.error?.code === '42501');
  }
} catch (error) {
  failed = true;
  console.error(JSON.stringify({ success: false, checksPassed: checks.length, error: error.message }));
} finally {
  // Audit ledgers intentionally have no service-role DELETE grant. Prepare an
  // admin-only cleanup statement, checked/executed by the chief via SQL tooling.
  // Never weaken ledger grants simply to accommodate a test harness.
  try {
    const cleanupPath = resolve('..', '..', `boreale-transaction-cleanup-${run}.sql`);
    // run is a generated UUID; none of these literals originates from user input.
    const cleanup = `do $qa_cleanup$
declare c uuid; p uuid;
begin
  select id into c from public.customers where email = '${email}' and last_name = '${run}';
  if c is null then raise exception 'QA customer marker missing'; end if;
  select id into p from public.products where slug = '${slug}' and description = '${run}' and is_active = false;
  if exists(select 1 from public.orders where customer_id=c and email <> '${email}') then
    raise exception 'Unexpected order owner during QA cleanup';
  end if;
  delete from public.order_notification_outbox where order_id in(select id from public.orders where customer_id=c);
  delete from public.order_operational_incidents where order_id in(select id from public.orders where customer_id=c);
  delete from public.payment_webhook_events where order_id in(select id from public.orders where customer_id=c);
  delete from public.order_payment_settlements where order_id in(select id from public.orders where customer_id=c);
  delete from public.orders where customer_id=c;
  delete from public.products where id=p and is_active=false;
  delete from public.discounts where code='${code}' and is_active=false;
  delete from public.customers where id=c and email='${email}';
end $qa_cleanup$;`;
    await writeFile(cleanupPath, cleanup, { flag: 'wx' });
    console.log(JSON.stringify({ testsPassed: !failed, checksPassed: checks.length, fixturesRemoved: false,
      cleanupRequired: cleanupPath, runMarker: run, database: 'real', paymentEvents: 'synthetic', stripeRequests: 0, emailsSent: 0 }));
  } catch (error) { failed = true; console.error(`Could not prepare fixture cleanup: ${error.message}`); }
}
if (failed) process.exitCode = 1;
