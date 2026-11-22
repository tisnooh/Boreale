import { db } from '../lib/supabase.js';
import { AppError } from '../lib/errors.js';
import type Stripe from 'stripe';
import { z } from 'zod';
import type { NewOrderInput } from './orders.js';
import type { CheckoutInput } from '../validators/checkout.js';
import type { PricedItem, TotalsDTO } from '../types/index.js';

export interface CheckoutSnapshot {
  order: Omit<NewOrderInput, 'customerId' | 'userId'>;
  items: PricedItem[];
  totals: TotalsDTO;
}
export interface CheckoutIdentity { keyHash: string; requestHash: string; actor: string | null }
export interface CheckoutIntent {
  id: string; order_id: string; order_number: string; request_hash: string;
  state: 'prepared' | 'creating' | 'bound' | 'manual_review';
  snapshot: CheckoutSnapshot; stripe_params: Stripe.Checkout.SessionCreateParams | null;
  stripe_key: string; lease_token: string | null; session_id: string | null;
  first_attempt_at: string | null; retry_deadline: string | null;
}
function unavailable() { return AppError.serviceUnavailable('checkout_persistence_unconfirmed', 'La tentative doit être reprise avec la même clé.'); }
async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await db().rpc(name, args);
  if (error) {
    if (error.code === '23514') throw AppError.conflict('checkout_intent_conflict', 'Cette tentative a changé ou nécessite un rapprochement.');
    throw unavailable();
  }
  return data;
}
const intentSchema = z.object({
  id: z.string().uuid(), order_id: z.string().uuid(), order_number: z.string().min(1),
  request_hash: z.string().regex(/^[a-f0-9]{64}$/), stripe_key: z.string().min(1).max(255),
  state: z.enum(['prepared', 'creating', 'bound', 'manual_review']),
  snapshot: z.object({ order: z.object({}).passthrough(), items: z.array(z.unknown()),
    totals: z.object({ totalCents: z.number().int().positive().safe(), currency: z.string().regex(/^[A-Z]{3}$/) }).passthrough() }).passthrough(),
  stripe_params: z.object({}).passthrough().nullable(), session_id: z.string().nullable(),
  lease_token: z.string().uuid().nullable(), first_attempt_at: z.string().nullable(), retry_deadline: z.string().nullable(),
}).passthrough();
function intent(data: unknown): CheckoutIntent {
  if (!intentSchema.safeParse(data).success) throw unavailable();
  return data as CheckoutIntent;
}
export const checkoutIntentsRepo = {
  async getById(id: string): Promise<CheckoutIntent | null> {
    const { data, error } = await db().from('checkout_intents').select('*').eq('id', id).maybeSingle();
    if (error) throw unavailable();
    return data === null ? null : intent(data);
  },
  async begin(identity: CheckoutIdentity, snapshot: CheckoutSnapshot | null = null, customer: CheckoutInput['customer'] | null = null): Promise<CheckoutIntent | null> {
    const data = await rpc('begin_checkout_intent', { p_key_hash: identity.keyHash, p_request_hash: identity.requestHash,
      p_actor: identity.actor, p_snapshot: snapshot, p_customer: customer });
    return data === null ? null : intent(data);
  },
  async freeze(id: string, params: Stripe.Checkout.SessionCreateParams): Promise<CheckoutIntent> {
    return intent(await rpc('freeze_checkout_intent', { p_id: id, p_params: params }));
  },
  async claim(id: string): Promise<CheckoutIntent> {
    return intent(await rpc('claim_checkout_intent', { p_id: id }));
  },
  async bind(id: string, token: string | null, session: { id: string; url: string | null; expires_at: number; amount_total: number | null; currency: string | null }): Promise<CheckoutIntent> {
    return intent(await rpc('bind_checkout_session', { p_id: id, p_token: token, p_session: session.id,
      p_url: session.url, p_expires_at: session.expires_at, p_amount: session.amount_total, p_currency: session.currency?.toUpperCase() ?? null }));
  },
  async fail(id: string, token: string): Promise<void> {
    if (await rpc('fail_checkout_intent', { p_id: id, p_token: token }) !== true) throw unavailable();
  },
};
