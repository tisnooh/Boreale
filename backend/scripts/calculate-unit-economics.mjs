import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

// Offline planning only. Every value, including zero, needs explicit provenance.
const fields = {
  sellingGrossCents: 'money', customerShippingGrossCents: 'money', discountGrossCents: 'money',
  vatBps: 'rate', purchaseNetCents: 'money', inboundNetCents: 'money', dutiesCents: 'money',
  outboundNetCents: 'money', handlingNetCents: 'money', packagingNetCents: 'money',
  otherVariableNetCents: 'money', paymentFeeBps: 'rate', paymentFixedCents: 'money',
  acquisitionNetCents: 'money', returnRateBps: 'rate', refundGrossPerReturnCents: 'money',
  returnHandlingNetCents: 'money', recoveredInventoryNetPerReturnCents: 'money',
  monthlyFixedNetCents: 'money', monthlyOrders: 'integer', settlementDelayDays: 'integer',
  supplierPaymentDelayDays: 'integer', initialInventoryCashCents: 'money',
};
export const requiredFields = Object.keys(fields);
const scenarios = ['pessimistic', 'realistic', 'optimistic'];

function validateScenario(input, name) {
  const errors = [];
  for (const [field, type] of Object.entries(fields)) {
    const cell = input?.[field];
    if (!cell || !Number.isSafeInteger(cell.value) || cell.value < 0 || (type === 'rate' && cell.value > 10000)
      || !['confirmed', 'assumption'].includes(cell.status) || typeof cell.source !== 'string' || !cell.source.trim()) {
      errors.push(`${name}.${field}: explicit nonnegative integer, provenance status and source required`);
    }
  }
  return errors;
}

function calculate(input) {
  const n = Object.fromEntries(requiredFields.map(k => [k, input[k].value]));
  const gross = n.sellingGrossCents + n.customerShippingGrossCents - n.discountGrossCents;
  const returnProbability = n.returnRateBps / 10000;
  const grossRefundAllowance = returnProbability * n.refundGrossPerReturnCents;
  // A single owner-supplied VAT rate applies equally to sale, shipping and refunds.
  const netRevenue = (gross - grossRefundAllowance) / (1 + n.vatBps / 10000);
  const paymentFee = Math.round(gross * n.paymentFeeBps / 10000) + n.paymentFixedCents;
  const base = n.purchaseNetCents + n.inboundNetCents + n.dutiesCents + n.outboundNetCents
    + n.handlingNetCents + n.packagingNetCents + n.otherVariableNetCents;
  const returnHandling = returnProbability * n.returnHandlingNetCents;
  const inventoryRecovery = returnProbability * n.recoveredInventoryNetPerReturnCents;
  const cashVariable = base + paymentFee + n.acquisitionNetCents + returnHandling;
  const variable = cashVariable - inventoryRecovery;
  const contribution = netRevenue - variable;
  const contributionBeforeAcquisition = contribution + n.acquisitionNetCents;
  const gap = Math.max(0, n.settlementDelayDays - n.supplierPaymentDelayDays);
  return {
    grossCollectedCents: gross, expectedGrossRefundCents: grossRefundAllowance,
    netRevenueCents: netRevenue, expectedCollectedTaxCents: gross - grossRefundAllowance - netRevenue,
    paymentFeeCents: paymentFee, baseVariableCostCents: base,
    expectedReturnHandlingCents: returnHandling, expectedInventoryRecoveryCents: inventoryRecovery,
    variableCostCents: variable, contributionCents: contribution,
    contributionRatePercent: netRevenue > 0 ? contribution / netRevenue * 100 : null,
    maximumBreakEvenAcquisitionCents: Math.max(0, contributionBeforeAcquisition),
    breakEvenOrdersMonthly: contribution > 0 ? Math.ceil(n.monthlyFixedNetCents / contribution) : null,
    breakEvenReason: contribution > 0 ? null : 'NON_POSITIVE_CONTRIBUTION',
    monthlyContributionCents: contribution * n.monthlyOrders,
    monthlyOperatingResultCents: contribution * n.monthlyOrders - n.monthlyFixedNetCents,
    cashGapDays: gap,
    indicativeWorkingCapitalCents: n.initialInventoryCashCents + cashVariable * n.monthlyOrders / 30 * gap + n.monthlyFixedNetCents,
  };
}

export function evaluateEconomics(document) {
  const errors = [];
  if (document?.currency !== 'EUR') errors.push('currency: EUR required; no exchange-rate assumption');
  for (const name of scenarios) errors.push(...validateScenario(document?.scenarios?.[name], name));
  if (errors.length) return { status: 'BLOCKED', errors, scenarios: null };
  for (const name of scenarios) {
    const v = Object.fromEntries(requiredFields.map(k => [k, document.scenarios[name][k].value]));
    const gross = v.sellingGrossCents + v.customerShippingGrossCents - v.discountGrossCents;
    if (gross <= 0 || v.refundGrossPerReturnCents > gross || v.recoveredInventoryNetPerReturnCents > v.purchaseNetCents) {
      errors.push(`${name}: positive collected amount, refund <= collected amount and inventory recovery <= purchase cost required`);
    }
  }
  if (errors.length) return { status: 'BLOCKED', errors, scenarios: null };
  const assumptions = scenarios.flatMap(name => requiredFields.filter(k => document.scenarios[name][k].status === 'assumption').map(k => `${name}.${k}`));
  return {
    status: assumptions.length ? 'PROVISIONAL' : 'CALCULATED_FROM_DECLARED_CONFIRMED_INPUTS',
    currency: 'EUR', assumptions,
    evidenceIndependentlyVerified: false,
    scenarios: Object.fromEntries(scenarios.map(name => [name, { inputs: document.scenarios[name], ...calculate(document.scenarios[name]) }])),
    limitations: ['Single VAT rate supplied by owner; net costs must include nonrecoverable taxes.',
      'Inventory recovery is an economic credit, not guaranteed cash received.',
      'Working capital is a 30-day uniform-volume estimate plus initial inventory and one month fixed costs; not a dated cash forecast.',
      'Payment fees charged on original collected gross are not assumed refundable. No price recommendation or publication.'],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  try { result = evaluateEconomics(JSON.parse(await readFile(process.argv[2], 'utf8'))); }
  catch { result = { status: 'BLOCKED', errors: ['Readable JSON input file required. No default business amounts.'], scenarios: null }; }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === 'BLOCKED' ? 2 : 0;
}
