import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEconomics, requiredFields } from './calculate-unit-economics.mjs';

// Synthetic accounting fixture only, never a BORÉALE price or supplier quote.
function fixture(changes = {}) {
  const values = { sellingGrossCents: 12000, vatBps: 2000, purchaseNetCents: 2000,
    inboundNetCents: 300, outboundNetCents: 500, paymentFeeBps: 150, paymentFixedCents: 25,
    acquisitionNetCents: 1000, monthlyFixedNetCents: 120000, monthlyOrders: 100,
    settlementDelayDays: 7, supplierPaymentDelayDays: 2, ...changes };
  const cells = Object.fromEntries(requiredFields.map(k => [k, { value: values[k] ?? 0, status: 'assumption', source: 'Synthetic unit test only' }]));
  return { currency: 'EUR', scenarios: Object.fromEntries(['pessimistic','realistic','optimistic'].map(k => [k, globalThis.structuredClone(cells)])) };
}
test('VAT is removed from sales, fees apply to collected gross, fixed costs stay separate', () => {
  const result = evaluateEconomics(fixture());
  const r = result.scenarios.realistic;
  assert.equal(result.status, 'PROVISIONAL');
  assert.equal(r.netRevenueCents, 10000);
  assert.equal(r.expectedCollectedTaxCents, 2000);
  assert.equal(r.paymentFeeCents, 205);
  assert.equal(r.contributionCents, 5995);
  assert.equal(r.contributionRatePercent, 59.95);
  assert.equal(r.breakEvenOrdersMonthly, 21);
  assert.equal(r.monthlyOperatingResultCents, 479500);
  assert.equal(r.maximumBreakEvenAcquisitionCents, 6995);
});
test('returns reduce net revenue and add handling; recovery is separately identified', () => {
  const r = evaluateEconomics(fixture({ returnRateBps: 1000, refundGrossPerReturnCents: 12000,
    returnHandlingNetCents: 500, recoveredInventoryNetPerReturnCents: 1000 })).scenarios.realistic;
  assert.equal(r.netRevenueCents, 9000);
  assert.equal(r.expectedReturnHandlingCents, 50);
  assert.equal(r.expectedInventoryRecoveryCents, 100);
  assert.equal(r.paymentFeeCents, 205);
  assert.equal(r.contributionCents, 5045);
});
test('nonpositive contribution has no finite break-even', () => {
  const r = evaluateEconomics(fixture({ acquisitionNetCents: 9000 })).scenarios.realistic;
  assert.equal(r.breakEvenOrdersMonthly, null);
  assert.equal(r.breakEvenReason, 'NON_POSITIVE_CONTRIBUTION');
  assert.ok(r.monthlyOperatingResultCents < 0);
});
test('missing or unproven inputs block all scenarios instead of inventing zero', () => {
  for (const field of requiredFields) {
    const doc = fixture(); delete doc.scenarios.realistic[field];
    assert.equal(evaluateEconomics(doc).status, 'BLOCKED', field);
  }
  const doc = fixture(); doc.scenarios.optimistic.outboundNetCents.source = '';
  assert.equal(evaluateEconomics(doc).scenarios, null);
  assert.equal(evaluateEconomics({}).status, 'BLOCKED');
});
test('financially inconsistent, fractional or invalid rate inputs fail closed', () => {
  for (const changes of [{ discountGrossCents: 13000 }, { refundGrossPerReturnCents: 12001 },
    { recoveredInventoryNetPerReturnCents: 2001 }, { vatBps: 10001 }, { purchaseNetCents: -1 }, { monthlyOrders: 1.5 }]) {
    assert.equal(evaluateEconomics(fixture(changes)).status, 'BLOCKED');
  }
});
test('cash gap is nonnegative and uses cash costs, never resale asset recovery', () => {
  const r = evaluateEconomics(fixture()).scenarios.realistic;
  assert.equal(r.cashGapDays, 5);
  assert.ok(Math.abs(r.indicativeWorkingCapitalCents - (4005 * 100 / 30 * 5 + 120000)) < 1e-8);
  assert.equal(evaluateEconomics(fixture({ supplierPaymentDelayDays: 20 })).scenarios.realistic.cashGapDays, 0);
});
test('three scenarios are independently computed and declared confirmation is not evidence verification', () => {
  const doc = fixture();
  doc.scenarios.pessimistic.monthlyOrders.value = 10;
  for (const s of Object.values(doc.scenarios)) for (const cell of Object.values(s)) cell.status = 'confirmed';
  const r = evaluateEconomics(doc);
  assert.equal(r.status, 'CALCULATED_FROM_DECLARED_CONFIRMED_INPUTS');
  assert.equal(r.evidenceIndependentlyVerified, false);
  assert.notEqual(r.scenarios.pessimistic.monthlyOperatingResultCents, r.scenarios.optimistic.monthlyOperatingResultCents);
});
