'use client';


import { SafeImage } from '@/components/ui/SafeImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { submitCheckout, validateDiscount } from '@/lib/services/actions';
import { isPreview } from '@/lib/config';
import { formatCents } from '@/lib/format';
import { computeLocalTotals } from '@/lib/totals';
import { SHIPPING } from '@/lib/constants';
import type { ShippingMethod } from '@/lib/types';
import { Spinner } from '@/components/ui';

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
}

const EMPTY_FORM: FormState = { email: '', firstName: '', lastName: '', phone: '', line1: '', line2: '', postalCode: '', city: '' };

export default function CheckoutPage() {
  const { items, ready, subtotalCents, clear } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [method, setMethod] = useState<ShippingMethod>('standard');
  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState<{ code: string | null; discountCents: number }>({ code: null, discountCents: 0 });
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fatalError, setFatalError] = useState<{ code: string; message: string } | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const abandonedRegistered = useRef(false);

  // Pré-remplissage pour les clients connectés
  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, email: user.email, firstName: user.firstName ?? f.firstName, lastName: user.lastName ?? f.lastName }));
    }
  }, [user]);

  const totals = computeLocalTotals(subtotalCents, discount.discountCents, method);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Capture panier abandonné : dès que l'email est valide, on enregistre (une seule fois).
  async function registerAbandonedCart() {
    if (isPreview()) return; // aucune écriture distante en preview
    if (abandonedRegistered.current || !form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return;
    abandonedRegistered.current = true;
    const { api } = await import('@/lib/api');
    await api
      .post('/api/carts/abandoned', {
        email: form.email,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      })
      .catch(() => undefined);
  }

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    setDiscountError(null);
    if (!codeInput.trim()) return;
    try {
      const result = await validateDiscount(codeInput.trim(), subtotalCents);
      if (result.valid) {
        setDiscount({ code: codeInput.trim().toUpperCase(), discountCents: result.discountCents });
        toast('Code promo appliqué', 'success');
      } else {
        setDiscount({ code: null, discountCents: 0 });
        setDiscountError(result.message);
      }
    } catch {
      setDiscountError('Impossible de valider le code pour le moment.');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || items.length === 0) return;
    setSubmitting(true);
    setFatalError(null);
    setPreviewMessage(null);
    try {
      const result = await submitCheckout({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        discountCode: discount.code ?? undefined,
        shippingMethod: method,
        customer: {
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          address: {
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            postalCode: form.postalCode.trim(),
            city: form.city.trim(),
            country: 'FR',
          },
        },
      });
      if (result.status === 'preview') {
        // Aucune commande créée : message honnête, panier conservé, aucun faux succès.
        setPreviewMessage(result.message);
        setSubmitting(false);
        return;
      }
      clear(); // le paiement Stripe suit ; le webhook confirme la commande
      window.location.href = result.url;
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        setFatalError({ code: err.code, message: err.message });
        if (err.code === 'insufficient_stock') toast('Un article n’est plus disponible en quantité suffisante.', 'error');
      } else {
        setFatalError({ code: 'unknown', message: 'Erreur inattendue. Réessayez.' });
      }
    }
  }

  if (!ready) {
    return (
      <div className="container-x grid place-items-center py-24">
        <Spinner label="Chargement…" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Votre panier est vide</h1>
        <p className="mt-2 text-sm text-muted">Ajoutez des articles avant de passer commande.</p>
        <Link href="/collections" className="btn-primary mt-6">Voir la collection</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="font-display mb-8 text-3xl font-semibold sm:text-4xl">Paiement sécurisé</h1>
      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-8">
          {/* Coordonnées */}
          <section aria-label="Coordonnées" className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">1 · Vos coordonnées</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="email">Email *</label>
                <input id="email" type="email" required autoComplete="email" className="field"
                  value={form.email} onChange={(e) => set('email', e.target.value)} onBlur={registerAbandonedCart}
                  placeholder="vous@example.fr" />
              </div>
              <div>
                <label className="field-label" htmlFor="firstName">Prénom *</label>
                <input id="firstName" required autoComplete="given-name" className="field" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="lastName">Nom *</label>
                <input id="lastName" required autoComplete="family-name" className="field" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="phone">Téléphone (pour le transporteur)</label>
                <input id="phone" type="tel" autoComplete="tel" className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="06 12 34 56 78" />
              </div>
            </div>
          </section>

          {/* Adresse */}
          <section aria-label="Adresse de livraison" className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">2 · Adresse de livraison</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="line1">Adresse *</label>
                <input id="line1" required autoComplete="address-line1" className="field" value={form.line1} onChange={(e) => set('line1', e.target.value)} placeholder="12 rue de la Paix" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="line2">Complément d’adresse</label>
                <input id="line2" autoComplete="address-line2" className="field" value={form.line2} onChange={(e) => set('line2', e.target.value)} placeholder="Bâtiment B, étage 3…" />
              </div>
              <div>
                <label className="field-label" htmlFor="postalCode">Code postal *</label>
                <input id="postalCode" required autoComplete="postal-code" className="field" inputMode="numeric" pattern="\d{5}"
                  value={form.postalCode} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="75002" />
              </div>
              <div>
                <label className="field-label" htmlFor="city">Ville *</label>
                <input id="city" required autoComplete="address-level2" className="field" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">Livraison en France métropolitaine uniquement au lancement.</p>
          </section>

          {/* Livraison */}
          <section aria-label="Mode de livraison" className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">3 · Livraison</h2>
            <div className="flex flex-col gap-2">
              {(Object.keys(SHIPPING) as ShippingMethod[]).map((m) => {
                const opt = SHIPPING[m];
                return (
                  <label key={m} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${method === m ? 'border-glacier bg-glacier/5' : 'border-line hover:border-glacier/50'}`}>
                    <span className="flex items-center gap-2.5">
                      <input type="radio" name="shipping-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-[#3D7EA6]" />
                      <span>
                        <span className="font-semibold">{opt.label}</span>
                        <span className="block text-xs text-muted">{opt.etaLabel}{opt.freeAboveCents !== null ? ` · offerte dès ${formatCents(opt.freeAboveCents)}` : ''}</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums">
                      {opt.freeAboveCents !== null && subtotalCents - discount.discountCents >= opt.freeAboveCents ? 'Offerte' : formatCents(opt.priceCents)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* Résumé */}
        <aside aria-label="Résumé" className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Votre commande</h2>
            <ul className="mb-4 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <li key={i.variantId} className="flex items-center gap-3 text-sm">
                  <SafeImage src={i.imageUrl ?? '/products/placeholder.svg'} alt="" width={44} height={44} className="h-11 w-11 rounded-lg border border-line object-cover" />
                  <span className="flex-1 leading-tight">
                    <span className="block font-semibold">{i.name}</span>
                    <span className="text-xs text-muted">{i.variantTitle} · ×{i.quantity}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatCents(i.priceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={applyCode} className="mb-4">
              <label className="field-label" htmlFor="checkout-code">Code promo</label>
              <div className="flex gap-2">
                <input id="checkout-code" className="field py-2 text-sm uppercase" value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="WELCOME10" autoComplete="off" />
                <button type="submit" className="btn-outline btn-sm">OK</button>
              </div>
              {discount.code && <p className="mt-1.5 text-xs font-semibold text-success">✓ {discount.code} appliqué</p>}
              {discountError && <p role="alert" className="mt-1.5 text-xs font-semibold text-danger">{discountError}</p>}
            </form>

            <dl className="space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd className="tabular-nums">{formatCents(totals.subtotalCents)}</dd></div>
              {totals.discountCents > 0 && (
                <div className="flex justify-between text-success"><dt>Remise</dt><dd className="tabular-nums">− {formatCents(totals.discountCents)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd className="tabular-nums">{totals.shippingCents === 0 ? 'Offerte' : formatCents(totals.shippingCents)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCents(totals.totalCents)}</dd></div>
            </dl>

            <label className="mt-4 flex items-start gap-2.5 text-xs text-muted">
              <input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-[#E8622C]" />
              <span>
                J’accepte les <Link href="/legal/terms" target="_blank" className="font-semibold text-ink underline-offset-2 hover:underline">CGV</Link> et la{' '}
                <Link href="/legal/privacy" target="_blank" className="font-semibold text-ink underline-offset-2 hover:underline">politique de confidentialité</Link>. *
              </span>
            </label>

            {previewMessage && (
              <p role="status" className="mt-4 rounded-xl bg-ice px-4 py-3 text-xs font-medium text-ink-500">
                {previewMessage}
              </p>
            )}
            {fatalError && (
              <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
                {fatalError.message}
                {fatalError.code === 'insufficient_stock' && (
                  <Link href="/cart" className="mt-1 block font-bold underline underline-offset-2">Ajuster mon panier</Link>
                )}
                {(fatalError.code === 'network_error' || fatalError.code === 'database_not_configured' || fatalError.code === 'stripe_not_configured') && (
                  <span className="mt-1 block">Le paiement n’est pas encore disponible sur cet environnement (backend non connecté). Voir docs/DEPLOYMENT.md.</span>
                )}
              </p>
            )}

            <button type="submit" disabled={submitting || !acceptTerms} className="btn-primary mt-4 w-full">
              {submitting ? 'Redirection vers Stripe…' : `Payer ${formatCents(totals.totalCents)}`}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              Paiement sécurisé par Stripe. Vos données bancaires ne transitent jamais par nos serveurs.
              Le montant final est recalculé côté serveur avant paiement.
            </p>
          </div>
          <button type="button" onClick={() => router.push('/cart')} className="btn-ghost btn-sm mt-3 w-full">
            ← Modifier le panier
          </button>
        </aside>
      </form>
    </div>
  );
}
