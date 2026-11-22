import { config } from '../config.js';
import { AppError } from './errors.js';
import { stripe } from './stripe.js';

type Environment = { accountId: string; livemode: boolean };
let verified: { key: string; account: string; mode: string; result: Promise<Environment> } | null = null;

/** Pin the runtime key to the account selected by the owner; MCP access is not a runtime key. */
export async function ensureStripeEnvironment(): Promise<Environment> {
  const { STRIPE_SECRET_KEY: key, STRIPE_ACCOUNT_ID: account, STRIPE_MODE: mode } = config();
  if (!key || !account) throw AppError.serviceUnavailable('stripe_environment_required', 'Le compte et la clé Stripe serveur doivent être configurés dans le gestionnaire de secrets.');
  if (!new RegExp(`^(?:sk|rk)_${mode}_`).test(key)) {
    throw AppError.serviceUnavailable('stripe_key_mode_mismatch', 'La clé Stripe ne correspond pas au mode de paiement attendu.');
  }
  if (!verified || verified.key !== key || verified.account !== account || verified.mode !== mode) {
    const result = stripe().accounts.retrieve({ timeout: 10000, maxNetworkRetries: 0 }).then(actual => {
      if (actual.id !== account) throw AppError.serviceUnavailable('stripe_account_mismatch', 'La clé Stripe appartient à un autre compte.');
      return { accountId: actual.id, livemode: mode === 'live' };
    }).catch(error => {
      verified = null;
      if (error instanceof AppError) throw error;
      throw AppError.serviceUnavailable('stripe_account_unverified', 'L’accès au compte Stripe n’a pas été vérifié.');
    });
    verified = { key, account, mode, result };
  }
  return verified.result;
}
