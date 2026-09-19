import { Resend } from 'resend';
import { config, features } from '../config.js';
import { logger } from '../lib/logger.js';
import { formatCents } from '../lib/money.js';
import type { AddressSnapshot, OrderDTO } from '../types/index.js';

/**
 * Email service (Resend).
 * Without EMAIL_API_KEY (local dev): emails are logged to the console with their
 * full payload and marked as NOT delivered. Nothing is ever faked as "sent".
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  delivered: boolean;
  reason?: 'not_configured' | 'error';
  error?: string;
}

let resend: Resend | null = null;
function client(): Resend {
  if (!resend) resend = new Resend(config().EMAIL_API_KEY!);
  return resend;
}

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (!features.email()) {
    logger.warn('email_not_configured — email loggué au lieu d’être envoyé', {
      to: payload.to,
      subject: payload.subject,
      note: 'Renseigner EMAIL_API_KEY (Resend) pour l’envoi réel.',
    });
    return { delivered: false, reason: 'not_configured' };
  }
  try {
    const { error } = await client().emails.send({
      from: config().EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      logger.error('email_send_failed', { to: payload.to, subject: payload.subject, error });
      return { delivered: false, reason: 'error', error: error.message };
    }
    logger.info('email_sent', { to: payload.to, subject: payload.subject });
    return { delivered: true };
  } catch (err) {
    logger.error('email_send_exception', { to: payload.to, err: err instanceof Error ? err.message : String(err) });
    return { delivered: false, reason: 'error', error: err instanceof Error ? err.message : 'unknown' };
  }
}

/* ---------- shared layout ---------- */

const C = { ink: '#0B1B2B', ice: '#F4F8FB', ember: '#E8622C', muted: '#5B7083', line: '#DCE7EF' };

function layout(title: string, bodyHtml: string, preheader = ''): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.ice};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ice};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
  <tr><td style="background:${C.ink};padding:24px 32px;">
    <span style="color:#fff;font-family:Georgia,serif;font-size:22px;letter-spacing:2px;">BORÉALE</span>
    <div style="color:#9FB6C7;font-size:12px;margin-top:4px;">L'hiver, du bon côté.</div>
  </td></tr>
  <tr><td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${C.ink};font-size:15px;line-height:1.6;">
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid ${C.line};color:${C.muted};font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    BORÉALE — Service client : bonjour@votre-domaine.fr<br/>
    Vous recevez cet email suite à une interaction avec notre site.
    <a href="{{UNSUBSCRIBE_URL}}" style="color:${C.muted};">Se désinscrire de la newsletter</a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:${C.ember};color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${label}</a></p>`;
}

function itemsTable(order: OrderDTO): string {
  const rows = order.items
    .map(
      (it) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};">${it.productName}${it.variantTitle ? ` <span style="color:${C.muted};">— ${it.variantTitle}</span>` : ''}<br/><span style="color:${C.muted};font-size:12px;">Qté : ${it.quantity} × ${formatCents(it.unitPriceCents)}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};text-align:right;font-weight:600;">${formatCents(it.totalCents)}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}
    <tr><td style="padding:8px 0;color:${C.muted};">Sous-total</td><td style="text-align:right;">${formatCents(order.subtotalCents)}</td></tr>
    ${order.discountCents > 0 ? `<tr><td style="padding:8px 0;color:${C.ember};">Remise ${order.discountCode ?? ''}</td><td style="text-align:right;color:${C.ember};">− ${formatCents(order.discountCents)}</td></tr>` : ''}
    <tr><td style="padding:8px 0;color:${C.muted};">Livraison (${order.shippingMethod === 'express' ? 'express' : 'standard'})</td><td style="text-align:right;">${order.shippingCents === 0 ? 'Offerte' : formatCents(order.shippingCents)}</td></tr>
    <tr><td style="padding:12px 0;font-size:18px;font-weight:700;">Total</td><td style="text-align:right;font-size:18px;font-weight:700;">${formatCents(order.totalCents)}</td></tr>
  </table>`;
}

function addressBlock(a: AddressSnapshot): string {
  return `<p style="color:${C.muted};font-size:13px;">${a.firstName} ${a.lastName}<br/>${a.line1}${a.line2 ? `<br/>${a.line2}` : ''}<br/>${a.postalCode} ${a.city}<br/>${a.country}</p>`;
}

/* ---------- transactional templates ---------- */

export const emailTemplates = {
  welcome(email: string, firstName?: string | null): EmailPayload {
    const name = firstName ? ` ${firstName}` : '';
    return {
      to: email,
      subject: 'Bienvenue chez BORÉALE ❄',
      html: layout(
        'Bienvenue',
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;">Bienvenue${name} !</h1>
        <p>Merci de rejoindre BORÉALE. Notre mission : vous garder au chaud tout l'hiver, avec des produits sélectionnés et testés, expédiés depuis la France.</p>
        <p>Votre code de bienvenue : <strong style="background:${C.ice};padding:4px 10px;border-radius:6px;letter-spacing:1px;">WELCOME10</strong> — 10 % sur votre première commande (hors bundles, modifiable à tout moment par la boutique).</p>
        ${button('Découvrir la collection', config().PUBLIC_SITE_URL + '/collections')}`
      ),
    };
  },

  orderConfirmation(order: OrderDTO): EmailPayload {
    return {
      to: order.email,
      subject: `Commande ${order.number} confirmée — BORÉALE`,
      html: layout(
        'Commande confirmée',
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px;">Merci pour votre commande !</h1>
        <p>Commande <strong>${order.number}</strong> du ${new Date(order.placedAt).toLocaleDateString('fr-FR')}. Nous préparons vos articles avec soin.</p>
        ${itemsTable(order)}
        <h2 style="font-size:15px;margin:24px 0 4px;">Adresse de livraison</h2>
        ${addressBlock(order.shippingAddress)}
        ${button('Suivre ma commande', `${config().PUBLIC_SITE_URL}/track-order?number=${encodeURIComponent(order.number)}`)}`,
        `Commande ${order.number} — ${formatCents(order.totalCents)}`
      ),
    };
  },

  paymentReceipt(order: OrderDTO): EmailPayload {
    return {
      to: order.email,
      subject: `Reçu de paiement — commande ${order.number}`,
      html: layout(
        'Reçu de paiement',
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;">Paiement reçu</h1>
        <p>Nous confirmons la réception de votre paiement de <strong>${formatCents(order.totalCents)}</strong> pour la commande <strong>${order.number}</strong>.</p>
        ${itemsTable(order)}
        <p style="color:${C.muted};font-size:13px;">Ce reçu vaut facture. Paiement sécurisé via Stripe.</p>`
      ),
    };
  },

  shipping(order: OrderDTO): EmailPayload {
    const tracking = order.tracking.number
      ? `<p>Suivi ${order.tracking.carrier ?? ''} : <strong>${order.tracking.number}</strong>${order.tracking.url ? ` — <a href="${order.tracking.url}" style="color:${C.ember};">suivre le colis</a>` : ''}</p>`
      : '';
    return {
      to: order.email,
      subject: `Votre commande ${order.number} est expédiée 🚚`,
      html: layout(
        'Commande expédiée',
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;">C'est parti !</h1>
        <p>Votre commande <strong>${order.number}</strong> vient d'être expédiée.</p>
        ${tracking}
        ${itemsTable(order)}
        ${addressBlock(order.shippingAddress)}`
      ),
    };
  },

  refund(order: OrderDTO, refundedCents: number, full: boolean): EmailPayload {
    return {
      to: order.email,
      subject: `Remboursement ${full ? 'total' : 'partiel'} — commande ${order.number}`,
      html: layout(
        'Remboursement',
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;">Remboursement effectué</h1>
        <p>Nous avons procédé à un remboursement ${full ? 'total' : 'partiel'} de <strong>${formatCents(refundedCents)}</strong> sur votre commande <strong>${order.number}</strong>.</p>
        <p style="color:${C.muted};">Selon votre banque, le montant apparaît sur votre compte sous 5 à 10 jours ouvrés.</p>
        <p>Une question ? Répondez simplement à cet email.</p>`
      ),
    };
  },

  abandonedCart(email: string, itemsLabel: string, cartUrl: string): EmailPayload {
    return {
      to: email,
      subject: 'Votre panier vous attend ❄',
      html: layout(
        'Panier abandonné',
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;">Vous avez bon goût.</h1>
        <p>Votre panier (${itemsLabel}) est toujours de côté. Les stocks d'hiver partent vite — terminez votre commande quand vous voulez.</p>
        ${button('Reprendre mon panier', cartUrl)}
        <p style="color:${C.muted};font-size:13px;">Livraison offerte dès 69 € · Retours sous 30 jours · Paiement sécurisé</p>`
      ),
    };
  },

  newsletterCampaign(email: string, subject: string, bodyHtml: string): EmailPayload {
    return { to: email, subject, html: layout(subject, bodyHtml) };
  },

  contactNotification(input: { name: string; email: string; subject: string; message: string; orderNumber?: string | null }): EmailPayload | null {
    const to = config().NOTIFY_EMAIL;
    if (!to) return null;
    return {
      to,
      subject: `[Contact] ${input.subject}`,
      html: layout(
        'Nouveau message contact',
        `<h1 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Nouveau message — formulaire contact</h1>
        <p><strong>De :</strong> ${input.name} &lt;${input.email}&gt;</p>
        ${input.orderNumber ? `<p><strong>Commande :</strong> ${input.orderNumber}</p>` : ''}
        <p><strong>Sujet :</strong> ${input.subject}</p>
        <blockquote style="border-left:3px solid ${C.ember};margin:16px 0;padding:8px 16px;color:${C.ink};">${input.message.replace(/</g, '&lt;')}</blockquote>`
      ),
    };
  },

  adminOrderNotification(order: OrderDTO): EmailPayload | null {
    const to = config().NOTIFY_EMAIL;
    if (!to) return null;
    return {
      to,
      subject: `Nouvelle commande ${order.number} — ${formatCents(order.totalCents)}`,
      html: layout(
        'Nouvelle commande',
        `<h1 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Commande ${order.number} payée</h1>
        ${itemsTable(order)}
        <h2 style="font-size:15px;margin:24px 0 4px;">Livraison</h2>
        ${addressBlock(order.shippingAddress)}
        ${button('Ouvrir dans l’admin', config().PUBLIC_SITE_URL + '/admin/commandes')}`
      ),
    };
  },
};
