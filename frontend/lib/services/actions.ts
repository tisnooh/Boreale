/**
 * Couche service côté client pour les actions transactionnelles.
 * Les composants UI n'appellent JAMAIS l'API directement pour ces actions :
 * ils passent par ces services, qui décident selon le mode (preview / live).
 *
 * Preview : aucune écriture distante, aucun faux succès business —
 * retour { status: 'preview' } + message honnête affichable tel quel.
 */
import { api, ApiError } from '@/lib/api';
import { isPreview, PREVIEW_NOTICE } from '@/lib/config';
import type { ShippingMethod, TotalsDTO } from '@/lib/types';
import { beginCheckoutAttempt, bindCheckoutAttempt, markCheckoutAttemptExpired, rejectFirstCheckoutAttempt } from '@/lib/checkout-attempt';

export interface CheckoutPayload {
  items: { variantId: string; quantity: number }[];
  discountCode?: string;
  shippingMethod: ShippingMethod;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address: { line1: string; line2?: string; postalCode: string; city: string; country: string };
  };
}

export type CheckoutResult =
  | { status: 'redirect'; url: string; orderNumber: string; totals: TotalsDTO }
  | { status: 'preview'; message: string };

export async function submitCheckout(payload: CheckoutPayload, customerId: string | null = null): Promise<CheckoutResult> {
  if (isPreview()) {
    // Aucune commande créée : on n'affiche JAMAIS "commande confirmée" en preview.
    return { status: 'preview', message: PREVIEW_NOTICE + ' Le paiement sera disponible lors de l’ouverture de la boutique.' };
  }
  const attempt = await beginCheckoutAttempt(payload, customerId);
  try {
    const res = await api.post<{ data: { url: string; orderNumber: string; totals: TotalsDTO } }>(
      '/api/stripe/checkout',
      { ...payload, idempotencyKey: attempt.key, customerMode: customerId ? 'customer' : 'guest' }
    );
    bindCheckoutAttempt(attempt, res.data.orderNumber);
    return { status: 'redirect', url: res.data.url, orderNumber: res.data.orderNumber, totals: res.data.totals };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'checkout_session_expired') {
      if (markCheckoutAttemptExpired(attempt)) {
        throw new ApiError(error.status, error.code, error.message, { expiredAttemptKey: attempt.key });
      }
      throw new ApiError(409, 'checkout_reconciliation_required', 'La tentative précédente doit être vérifiée avant de relancer un paiement.');
    }
    // Only these known pre-provider rejections establish that a first attempt did not start a payment.
    if (error instanceof ApiError && ['validation_error', 'checkout_closed', 'checkout_dependencies_unavailable',
      'procurement_unverified', 'insufficient_stock', 'variant_not_found', 'discount_invalid',
      'discount_not_applicable', 'invalid_quantity', 'invalid_total', 'invalid_stripe_totals'].includes(error.code)) {
      rejectFirstCheckoutAttempt(attempt);
    }
    throw error;
  }
}

export type FormSubmitResult = { status: 'ok'; message: string } | { status: 'preview'; message: string };

export async function submitNewsletter(email: string, source: string): Promise<FormSubmitResult> {
  if (isPreview()) {
    return { status: 'preview', message: 'Mode preview : votre adresse n’est pas enregistrée. L’inscription newsletter sera active à l’ouverture de la boutique.' };
  }
  await api.post('/api/newsletter', { email, source });
  return { status: 'ok', message: 'Merci ! Votre inscription est confirmée.' };
}

export async function submitContact(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  orderNumber?: string;
}): Promise<FormSubmitResult> {
  if (isPreview()) {
    return { status: 'preview', message: 'Mode preview : message non envoyé. Le formulaire sera connecté au service client à l’ouverture de la boutique.' };
  }
  await api.post('/api/contact', input);
  return { status: 'ok', message: 'Message envoyé. Nous répondons sous 24-48 h ouvrées.' };
}

export async function validateDiscount(code: string, subtotalCents: number): Promise<{ valid: boolean; discountCents: number; message: string }> {
  if (isPreview()) {
    // Preview : aucun code actif — réponse honnête, pas de simulation de remise.
    return { valid: false, discountCents: 0, message: 'Mode preview : les codes promo seront actifs à l’ouverture de la boutique.' };
  }
  const res = await api.post<{ data: { valid: boolean; discountCents: number; message: string } }>(
    '/api/discounts/validate',
    { code, subtotalCents }
  );
  return res.data;
}

export function previewAuthError(): ApiError | null {
  if (!isPreview()) return null;
  return new ApiError(503, 'preview_mode', 'Mode preview : la connexion réelle sera active à l’ouverture de la boutique (aucun compte de démonstration n’est simulé).');
}
