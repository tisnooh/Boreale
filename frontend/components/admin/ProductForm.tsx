'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui';

/* ---------- état du formulaire ---------- */

interface VariantForm {
  id?: string;
  sku: string;
  title: string;
  optionsText: string; // "taille=S/M;couleur=Bleu nuit"
  price: string; // euros
  compareAt: string; // euros, vide = null
  weightG: string;
  stock: string;
  lowStockThreshold: string;
  isActive: boolean;
}

interface BundleItemForm {
  sku: string;
  name: string;
  quantity: string;
}

interface ProductFormState {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  longDescription: string;
  type: 'product' | 'bundle';
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string;
  badge: string;
  tagsText: string; // séparées par virgules
  seoTitle: string;
  seoDescription: string;
  position: string;
  categories: string[];
  variants: VariantForm[];
  bundleItems: BundleItemForm[];
}

const EMPTY: ProductFormState = {
  slug: '', name: '', subtitle: '', description: '', longDescription: '', type: 'product',
  isActive: true, isFeatured: false, imageUrl: '', badge: '', tagsText: '', seoTitle: '',
  seoDescription: '', position: '0', categories: [],
  variants: [{ sku: '', title: 'Taille unique', optionsText: '', price: '', compareAt: '', weightG: '300', stock: '0', lowStockThreshold: '5', isActive: true }],
  bundleItems: [],
};

function parseOptions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(';')) {
    const [k, v] = part.split('=');
    if (k?.trim() && v?.trim()) out[k.trim().toLowerCase()] = v.trim();
  }
  return out;
}

function eurosToCents(v: string): number | null {
  if (!v.trim()) return null;
  const n = Math.round(parseFloat(v.replace(',', '.')) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormState>(EMPTY);
  const [allCategories, setAllCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await api.get<{ data: { slug: string; name: string }[] }>('/api/categories');
        setAllCategories(cats.data);
      } catch { /* la liste reste vide, saisie manuelle possible */ }
      if (productId) {
        try {
          const res = await api.get<{ data: Record<string, never>[] }>('/api/admin/products');
          const p = res.data.find((x) => x.id === productId) as Record<string, unknown> | undefined;
          if (!p) throw new Error('not found');
          const variants = (p.product_variants as Record<string, unknown>[]) ?? [];
          setForm({
            slug: String(p.slug ?? ''),
            name: String(p.name ?? ''),
            subtitle: String(p.subtitle ?? ''),
            description: String(p.description ?? ''),
            longDescription: String(p.long_description ?? ''),
            type: (p.type as 'product' | 'bundle') ?? 'product',
            isActive: Boolean(p.is_active),
            isFeatured: Boolean(p.is_featured),
            imageUrl: String(p.image_url ?? ''),
            badge: String(p.badge ?? ''),
            tagsText: ((p.tags as string[]) ?? []).join(', '),
            seoTitle: String(p.seo_title ?? ''),
            seoDescription: String(p.seo_description ?? ''),
            position: String(p.position ?? 0),
            categories: (((p.product_categories as { categories: { slug: string } }[]) ?? []).map((pc) => pc.categories?.slug).filter(Boolean)) as string[],
            variants: variants.map((v) => {
              const inv = Array.isArray(v.inventory) ? (v.inventory as Record<string, unknown>[])[0] : (v.inventory as Record<string, unknown>);
              return {
                id: String(v.id),
                sku: String(v.sku ?? ''),
                title: String(v.title ?? ''),
                optionsText: Object.entries((v.options as Record<string, string>) ?? {}).map(([k, val]) => `${k}=${val}`).join(';'),
                price: String(((v.price_cents as number) / 100).toFixed(2)),
                compareAt: v.compare_at_price_cents ? String(((v.compare_at_price_cents as number) / 100).toFixed(2)) : '',
                weightG: v.weight_g != null ? String(v.weight_g) : '',
                stock: inv ? String(inv.quantity ?? 0) : '0',
                lowStockThreshold: inv ? String(inv.low_stock_threshold ?? 5) : '5',
                isActive: Boolean(v.is_active),
              };
            }),
            bundleItems: ((p.bundle_items as BundleItemForm[]) ?? []).map((b) => ({ ...b, quantity: String(b.quantity) })),
          });
        } catch {
          toast('Produit introuvable.', 'error');
          router.replace('/admin/produits');
        } finally {
          setLoading(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function set<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setVariant(i: number, patch: Partial<VariantForm>) {
    setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  }

  function setBundleItem(i: number, patch: Partial<BundleItemForm>) {
    setForm((f) => ({ ...f, bundleItems: f.bundleItems.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim(),
      longDescription: form.longDescription.trim() || null,
      type: form.type,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      imageUrl: form.imageUrl.trim() || null,
      images: [],
      badge: form.badge.trim() || null,
      tags: form.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      position: parseInt(form.position || '0', 10) || 0,
      categories: form.categories,
      bundleItems: form.type === 'bundle'
        ? form.bundleItems.filter((b) => b.sku.trim()).map((b) => ({ sku: b.sku.trim(), name: b.name.trim(), quantity: parseInt(b.quantity, 10) || 1 }))
        : [],
      variants: form.variants.map((v) => {
        const price = eurosToCents(v.price);
        return {
          ...(v.id ? { id: v.id } : {}),
          sku: v.sku.trim().toUpperCase(),
          title: v.title.trim(),
          options: parseOptions(v.optionsText),
          priceCents: price ?? 0,
          compareAtPriceCents: eurosToCents(v.compareAt),
          weightG: v.weightG ? parseInt(v.weightG, 10) : null,
          stock: parseInt(v.stock, 10) || 0,
          lowStockThreshold: parseInt(v.lowStockThreshold, 10) || 5,
          isActive: v.isActive,
          position: 0,
        };
      }),
    };
    try {
      if (productId) {
        await api.put(`/api/admin/products/${productId}`, payload);
        toast('Produit mis à jour.', 'success');
      } else {
        await api.post('/api/admin/products', payload);
        toast('Produit créé.', 'success');
      }
      router.push('/admin/produits');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const details = Array.isArray(err.details) ? (err.details as { path: string; message: string }[]).map((d) => `${d.path || 'champ'} : ${d.message}`) : [];
        setErrors([err.message, ...details]);
      } else {
        setErrors(['Erreur inattendue.']);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Chargement du produit…" />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{productId ? 'Éditer le produit' : 'Nouveau produit'}</h1>
        <div className="flex gap-2">
          <Link href="/admin/produits" className="btn-ghost btn-sm">Annuler</Link>
          <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl bg-danger/10 p-4 text-xs text-danger">
          <ul className="list-disc space-y-1 pl-4">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {/* Général */}
      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-display col-span-full text-lg font-semibold">Général</h2>
        <div>
          <label className="field-label" htmlFor="p-name">Nom *</label>
          <input id="p-name" required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-slug">Slug * (URL)</label>
          <input id="p-slug" required pattern="[a-z0-9-]+" className="field" value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="plaid-sherpa-nid" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="p-subtitle">Sous-titre (accroche)</label>
          <input id="p-subtitle" className="field" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="p-desc">Description courte *</label>
          <textarea id="p-desc" required rows={3} className="field resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="p-long">Description longue (détails, conseils, entretien)</label>
          <textarea id="p-long" rows={6} className="field resize-y" value={form.longDescription} onChange={(e) => set('longDescription', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-type">Type</label>
          <select id="p-type" className="field" value={form.type} onChange={(e) => set('type', e.target.value as 'product' | 'bundle')}>
            <option value="product">Produit</option>
            <option value="bundle">Pack / bundle</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="p-badge">Badge (optionnel)</label>
          <input id="p-badge" className="field" value={form.badge} onChange={(e) => set('badge', e.target.value)} placeholder="Coup de cœur, Nouveau…" maxLength={60} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-image">Image (URL ou /products/….svg)</label>
          <input id="p-image" className="field" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="/products/mon-produit.svg" />
        </div>
        <div>
          <label className="field-label" htmlFor="p-tags">Tags (séparés par des virgules)</label>
          <input id="p-tags" className="field" value={form.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="plaid, cocooning, cadeau" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-[#E8622C]" /> Actif (visible en boutique)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="accent-[#E8622C]" /> Produit vedette</label>
      </section>

      {/* Catégories */}
      <section className="card p-6">
        <h2 className="font-display mb-3 text-lg font-semibold">Collections</h2>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((c) => {
            const checked = form.categories.includes(c.slug);
            return (
              <label key={c.slug} className={`cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${checked ? 'border-ink bg-ink text-white' : 'border-line hover:border-glacier'}`}>
                <input type="checkbox" className="sr-only" checked={checked}
                  onChange={() => set('categories', checked ? form.categories.filter((s) => s !== c.slug) : [...form.categories, c.slug])} />
                {c.name}
              </label>
            );
          })}
        </div>
      </section>

      {/* Variantes */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Variantes, prix & stocks *</h2>
          <button type="button" className="btn-outline btn-sm"
            onClick={() => set('variants', [...form.variants, { sku: '', title: '', optionsText: '', price: '', compareAt: '', weightG: '300', stock: '0', lowStockThreshold: '5', isActive: true }])}>
            + Ajouter une variante
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {form.variants.map((v, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="lg:col-span-1">
                <label className="field-label">SKU *</label>
                <input className="field" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} placeholder="BOR-XXX-01" required />
              </div>
              <div className="lg:col-span-2">
                <label className="field-label">Titre *</label>
                <input className="field" value={v.title} onChange={(e) => setVariant(i, { title: e.target.value })} placeholder="S/M · Bleu nuit" required />
              </div>
              <div className="lg:col-span-3">
                <label className="field-label">Options (taille=S/M;couleur=Bleu)</label>
                <input className="field" value={v.optionsText} onChange={(e) => setVariant(i, { optionsText: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Prix (€) *</label>
                <input className="field" inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} required />
              </div>
              <div>
                <label className="field-label">Prix réf. (€)</label>
                <input className="field" inputMode="decimal" value={v.compareAt} onChange={(e) => setVariant(i, { compareAt: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Poids (g)</label>
                <input className="field" inputMode="numeric" value={v.weightG} onChange={(e) => setVariant(i, { weightG: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Stock</label>
                <input className="field" inputMode="numeric" value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Seuil alerte</label>
                <input className="field" inputMode="numeric" value={v.lowStockThreshold} onChange={(e) => setVariant(i, { lowStockThreshold: e.target.value })} />
              </div>
              <div className="flex items-end justify-between gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={v.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} className="accent-[#E8622C]" /> active
                </label>
                {form.variants.length > 1 && (
                  <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => set('variants', form.variants.filter((_, idx) => idx !== i))}>Retirer</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          ⚠️ Prix de référence (« barré ») : ne le renseigner que s’il correspond au prix le plus bas pratiqué dans les
          30 derniers jours (directive Omnibus — DECISIONS.md D007). Les variantes retirées sont désactivées, jamais
          supprimées (intégrité des commandes).
        </p>
      </section>

      {/* Bundle items */}
      {form.type === 'bundle' && (
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Contenu du pack</h2>
            <button type="button" className="btn-outline btn-sm" onClick={() => set('bundleItems', [...form.bundleItems, { sku: '', name: '', quantity: '1' }])}>+ Article</button>
          </div>
          {form.bundleItems.length === 0 && <p className="text-sm text-muted">Listez les SKUs contenus dans ce pack (affiché sur la fiche produit et utile à la préparation).</p>}
          <div className="flex flex-col gap-3">
            {form.bundleItems.map((b, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[160px_1fr_90px_auto]">
                <input className="field" placeholder="SKU" value={b.sku} onChange={(e) => setBundleItem(i, { sku: e.target.value.toUpperCase() })} />
                <input className="field" placeholder="Nom affiché" value={b.name} onChange={(e) => setBundleItem(i, { name: e.target.value })} />
                <input className="field" inputMode="numeric" placeholder="Qté" value={b.quantity} onChange={(e) => setBundleItem(i, { quantity: e.target.value })} />
                <button type="button" className="btn-ghost btn-sm text-danger self-center" onClick={() => set('bundleItems', form.bundleItems.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEO */}
      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-display col-span-full text-lg font-semibold">SEO</h2>
        <div>
          <label className="field-label" htmlFor="p-seo-title">Title (≤ 60 car.)</label>
          <input id="p-seo-title" maxLength={120} className="field" value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-seo-desc">Meta description (≤ 155 car.)</label>
          <input id="p-seo-desc" maxLength={300} className="field" value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="p-pos">Position (tri)</label>
          <input id="p-pos" type="number" min={0} className="field" value={form.position} onChange={(e) => set('position', e.target.value)} />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Link href="/admin/produits" className="btn-ghost btn-sm">Annuler</Link>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer le produit'}</button>
      </div>
    </form>
  );
}
