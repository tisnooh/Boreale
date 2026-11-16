import { ApiError } from '@/lib/api';
import type { CheckoutPayload } from '@/lib/services/actions';

const STORAGE_KEY = 'boreale.checkout-attempt.v1';
interface StoredAttempt {
  version: 1;
  key: string;
  fingerprint: string;
  uncertain: boolean;
  orderNumber?: string;
  expired?: boolean;
}
export interface CheckoutAttempt { key: string; previouslyUncertain: boolean }
const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const digest = /^[\da-f]{64}$/;
const recoveryError = () => new ApiError(503, 'checkout_recovery_unavailable',
  'La reprise sécurisée du paiement est indisponible dans ce navigateur. Ne relancez pas un autre paiement avant vérification.');
const unresolvedError = () => new ApiError(409, 'checkout_reconciliation_required',
  'Une tentative précédente doit être vérifiée avant de modifier le panier ou le compte. Reprenez les mêmes informations ou contactez le support ; ne relancez pas un autre paiement.');

function readAttempt(): StoredAttempt | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  let value: StoredAttempt;
  try { value = JSON.parse(raw) as StoredAttempt; } catch { throw unresolvedError(); }
  if (value.version !== 1 || !uuid.test(value.key) || !digest.test(value.fingerprint)
    || typeof value.uncertain !== 'boolean' || (value.orderNumber !== undefined && typeof value.orderNumber !== 'string')
    || (value.expired !== undefined && typeof value.expired !== 'boolean')) {
    throw unresolvedError();
  }
  return value;
}
function saveAttempt(value: StoredAttempt) {
  const raw = JSON.stringify(value);
  sessionStorage.setItem(STORAGE_KEY, raw);
  if (sessionStorage.getItem(STORAGE_KEY) !== raw) throw recoveryError();
}

/** Only an opaque key, hash and optional order reference persist; no contact/address/cart data. */
export async function beginCheckoutAttempt(payload: CheckoutPayload, customerId: string | null): Promise<CheckoutAttempt> {
  try {
    const quantities = new Map<string, number>();
    for (const item of payload.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    const normalized = {
      actor: customerId ? { mode: 'customer', id: customerId } : { mode: 'guest' },
      items: [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([variantId, quantity]) => ({ variantId, quantity })),
      discountCode: payload.discountCode?.trim().toUpperCase() || null,
      shippingMethod: payload.shippingMethod,
      customer: {
        email: payload.customer.email.trim().toLowerCase(), firstName: payload.customer.firstName.trim(),
        lastName: payload.customer.lastName.trim(), phone: payload.customer.phone?.trim() || null,
        address: {
          line1: payload.customer.address.line1.trim(), line2: payload.customer.address.line2?.trim() || null,
          postalCode: payload.customer.address.postalCode.trim(), city: payload.customer.address.city.trim(),
          country: payload.customer.address.country.trim().toUpperCase(),
        },
      },
    };
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(normalized)));
    const fingerprint = [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    // Read after digest: concurrent callers observe the first persisted attempt.
    const current = readAttempt();
    if (current && current.fingerprint !== fingerprint) throw unresolvedError();
    const key = current?.key ?? crypto.randomUUID();
    if (!uuid.test(key)) throw recoveryError();
    saveAttempt({ ...current, version: 1, key, fingerprint, uncertain: true });
    return { key, previouslyUncertain: current?.uncertain ?? false };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw recoveryError();
  }
}

/** A later validation error cannot disprove a previous ambiguous remote attempt. */
export function rejectFirstCheckoutAttempt(attempt: CheckoutAttempt) {
  if (attempt.previouslyUncertain) return;
  try { if (readAttempt()?.key === attempt.key) sessionStorage.removeItem(STORAGE_KEY); } catch { /* Preserve uncertainty. */ }
}

export function bindCheckoutAttempt(attempt: CheckoutAttempt, orderNumber: string) {
  try {
    const current = readAttempt();
    if (!current || current.key !== attempt.key || !orderNumber) throw unresolvedError();
    saveAttempt({ ...current, orderNumber });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw recoveryError();
  }
}

/** Called only for the server's verified expired-session response for this attempt. */
export function markCheckoutAttemptExpired(attempt: CheckoutAttempt): boolean {
  try {
    const current = readAttempt();
    if (!current || current.key !== attempt.key) return false;
    saveAttempt({ ...current, expired: true });
    return true;
  } catch { return false; }
}

/** Restore the already verified expiration action after reload without rotating its key. */
export function expiredCheckoutAttemptKey(): string | null {
  try { const current = readAttempt(); return current?.expired === true ? current.key : null; } catch { return null; }
}

/** A verified expiration permits an explicit new purchase, never an automatic retry with a new key. */
export function restartExpiredCheckoutAttempt(key: string): boolean {
  try {
    const current = readAttempt();
    if (!current || current.key !== key || current.expired !== true) return false;
    sessionStorage.removeItem(STORAGE_KEY);
    return sessionStorage.getItem(STORAGE_KEY) === null;
  } catch { return false; }
}

export function completeCheckoutAttempt(session: { paymentStatus: string; paidOrderRecorded?: boolean; orderNumber: string | null }): boolean {
  if (session.paymentStatus !== 'paid' || session.paidOrderRecorded !== true || !session.orderNumber) return false;
  try {
    const current = readAttempt();
    if (!current || current.orderNumber !== session.orderNumber) return false;
    sessionStorage.removeItem(STORAGE_KEY);
    return sessionStorage.getItem(STORAGE_KEY) === null;
  } catch { return false; }
}
