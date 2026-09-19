import { createHmac } from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { newsletterRepo, contactRepo, abandonedCartsRepo } from '../repositories/misc.js';
import { catalogRepo } from '../repositories/catalog.js';
import { emailTemplates, sendEmail } from '../services/email.js';
import { logger } from '../lib/logger.js';

/** Lien de restauration du panier (base64url) — prix/stocks revalidés serveur au checkout. */
function encodeRestore(items: { variantId: string; quantity: number }[]): string {
  const json = JSON.stringify(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
  return Buffer.from(json, 'utf-8').toString('base64url');
}

/* Unsubscribe links are signed (HMAC) so anyone can't unsubscribe arbitrary emails. */
export function unsubscribeSignature(email: string): string {
  return createHmac('sha256', config().JWT_SECRET).update(`unsub:${email.toLowerCase()}`).digest('hex').slice(0, 32);
}

export const newsletterController = {
  subscribe: asyncHandler(async (req: Request, res: Response) => {
    const { email, source } = req.body as { email: string; source?: string };
    const subscriber = await newsletterRepo.upsertSubscriber(email, source ?? 'site');
    if (subscriber.status === 'subscribed') {
      await sendEmail(emailTemplates.welcome(email)).catch(() => undefined);
    }
    res.status(201).json({ data: { email: subscriber.email, status: subscriber.status } });
  }),

  /** GET /api/newsletter/unsubscribe?email=&sig= — used by the footer link in every email. */
  unsubscribe: asyncHandler(async (req: Request, res: Response) => {
    const email = String(req.query.email ?? '').toLowerCase();
    const sig = String(req.query.sig ?? '');
    if (!email || sig !== unsubscribeSignature(email)) {
      throw AppError.badRequest('invalid_link', 'Lien de désinscription invalide.');
    }
    await newsletterRepo.unsubscribe(email);
    res
      .status(200)
      .type('html')
      .send(
        `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Désinscription</title>
        <body style="font-family:system-ui,Arial,sans-serif;display:grid;place-items:center;min-height:80vh;background:#F4F8FB;color:#0B1B2B;">
        <div style="text-align:center;max-width:420px;padding:24px;">
        <h1 style="font-family:Georgia,serif;">Désinscription confirmée</h1>
        <p>L'adresse <strong>${email}</strong> ne recevra plus la newsletter BORÉALE.</p>
        <p><a href="${config().PUBLIC_SITE_URL}" style="color:#E8622C;">Retour à la boutique</a></p>
        </div></body></html>`
      );
  }),
};

export const contactController = {
  submit: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as { name: string; email: string; subject: string; message: string; orderNumber?: string };
    await contactRepo.create(input);
    const notification = emailTemplates.contactNotification(input);
    if (notification) await sendEmail(notification).catch(() => undefined);
    res.status(201).json({ ok: true, message: 'Message envoyé. Nous répondons sous 24-48 h ouvrées.' });
  }),
};

export const cronController = {
  /**
   * GET /api/cron/abandoned-carts — protected by CRON_SECRET (Vercel Cron sends
   * `Authorization: Bearer <CRON_SECRET>`). Sends ONE reminder per open cart ≥ 3 h old
   * if no order was placed since.
   */
  abandonedCarts: asyncHandler(async (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${config().CRON_SECRET}`) {
      throw AppError.unauthorized('cron_unauthorized', 'Secret de cron invalide.');
    }
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const due = await abandonedCartsRepo.findDue(cutoff);
    let sent = 0;
    let skipped = 0;
    for (const cart of due) {
      try {
        const hasOrdered = await abandonedCartsRepo.hasRecentOrder(cart.email, cart.created_at);
        if (hasOrdered) {
          await abandonedCartsRepo.markConverted(cart.email);
          skipped++;
          continue;
        }
        // Human-readable item list from stored variant ids
        const variants = await catalogRepo.getVariantsByIds(cart.items.map((i) => i.variantId));
        const label =
          variants
            .map((v) => (v.products ? `${v.products.name}${v.title ? ` (${v.title})` : ''}` : null))
            .filter(Boolean)
            .join(', ') || 'vos articles';
        const restoreUrl = `${config().PUBLIC_SITE_URL}/cart?restore=${encodeURIComponent(encodeRestore(cart.items))}`;
        const result = await sendEmail(emailTemplates.abandonedCart(cart.email, label, restoreUrl));
        if (result.delivered) sent++;
        await abandonedCartsRepo.markSent(cart.id);
      } catch (err) {
        logger.error('abandoned_cart_failed', { cartId: cart.id, err: err instanceof Error ? err.message : String(err) });
      }
    }
    res.json({ processed: due.length, sent, skipped });
  }),
};
