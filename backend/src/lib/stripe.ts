import Stripe from 'stripe';
import { config, features } from '../config.js';
import { AppError } from './errors.js';

let stripeClient: Stripe | null = null;

/** Stripe client — secret key stays server-side only. */
export function stripe(): Stripe {
  if (!features.stripe()) {
    throw AppError.serviceUnavailable(
      'stripe_not_configured',
      'Stripe non configuré (STRIPE_SECRET_KEY manquant). Voir backend/.env.example.'
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(config().STRIPE_SECRET_KEY!, {
      apiVersion: '2024-09-30.acacia' as Stripe.LatestApiVersion,
      typescript: true,
      appInfo: { name: 'boreale-backend', version: '1.0.0' },
    });
  }
  return stripeClient;
}

export function resetStripeClient() {
  stripeClient = null;
}
