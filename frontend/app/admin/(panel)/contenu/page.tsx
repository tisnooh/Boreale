'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui';
import type { HomepageSettings } from '@/lib/types';

/** Édition du contenu de la homepage (hero, bandeau, bénéfices, vedettes, packs, FAQ). */
export default function AdminContentPage() {
  const [settings, setSettings] = useState<HomepageSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'hiver' | 'ete'>('hiver');
  const { toast } = useToast();
  const settingsKey = tab === 'ete' ? 'homepage-summer' : 'homepage';

  useEffect(() => {
    setSettings(null);
    api
      .get<{ data: HomepageSettings }>(`/api/admin/settings/${settingsKey}`)
      .then((r) => setSettings(r.data))
      .catch((e) => toast(e instanceof ApiError ? e.message : 'Chargement impossible.', 'error'));
  }, [toast, settingsKey]);

  if (!settings) return <Spinner label="Chargement du contenu…" />;

  function patch(partial: Partial<HomepageSettings>) {
    setSettings((s) => (s ? { ...s, ...partial } : s));
  }

  function patchHero(partial: Partial<HomepageSettings['hero']>) {
    setSettings((s) => (s ? { ...s, hero: { ...s.hero, ...partial } } : s));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.put<{ data: HomepageSettings }>(`/api/admin/settings/${settingsKey}`, { value: settings });
      setSettings(res.data);
      toast(`Contenu enregistré. La homepage ${tab === 'ete' ? 'été' : 'hiver'} est à jour.`, 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-line bg-white p-1" role="tablist" aria-label="Saison éditée">
        {(['hiver', 'ete'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase transition ${
              tab === t ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {t === 'hiver' ? 'Hiver' : 'Été'}
          </button>
        ))}
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Contenu de la homepage {tab === 'ete' ? 'été' : 'hiver'}</h1>
        <button type="button" className="btn-primary btn-sm" disabled={saving} onClick={() => void save()}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <section className="card grid gap-4 p-6">
          <h2 className="font-display text-lg font-semibold">Bandeau d’annonce</h2>
          <input className="field" value={settings.announcementBar ?? ''} onChange={(e) => patch({ announcementBar: e.target.value || null })}
            placeholder="Livraison offerte dès 69 €…" />
          <p className="text-[11px] text-muted">Laisser vide pour masquer le bandeau. N’annoncez que des offres réelles et actives.</p>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-display col-span-full text-lg font-semibold">Hero</h2>
          <div><label className="field-label">Surtitre</label><input className="field" value={settings.hero.eyebrow} onChange={(e) => patchHero({ eyebrow: e.target.value })} /></div>
          <div><label className="field-label">Image (URL)</label><input className="field" value={settings.hero.image ?? ''} onChange={(e) => patchHero({ image: e.target.value || null })} placeholder="/images/hero-hiver.jpg" /></div>
          <div className="sm:col-span-2"><label className="field-label">Titre principal</label><input className="field" value={settings.hero.title} onChange={(e) => patchHero({ title: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="field-label">Sous-titre</label><textarea rows={2} className="field resize-y" value={settings.hero.subtitle} onChange={(e) => patchHero({ subtitle: e.target.value })} /></div>
          <div><label className="field-label">CTA principal (label)</label><input className="field" value={settings.hero.ctaLabel} onChange={(e) => patchHero({ ctaLabel: e.target.value })} /></div>
          <div><label className="field-label">CTA principal (lien)</label><input className="field" value={settings.hero.ctaHref} onChange={(e) => patchHero({ ctaHref: e.target.value })} /></div>
          <div><label className="field-label">CTA secondaire (label)</label><input className="field" value={settings.hero.secondaryCtaLabel} onChange={(e) => patchHero({ secondaryCtaLabel: e.target.value })} /></div>
          <div><label className="field-label">CTA secondaire (lien)</label><input className="field" value={settings.hero.secondaryCtaHref} onChange={(e) => patchHero({ secondaryCtaHref: e.target.value })} /></div>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-4 text-lg font-semibold">Bénéfices (4)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {settings.benefits.map((b, i) => (
              <div key={i} className="rounded-xl border border-line p-4">
                <div className="grid grid-cols-[90px_1fr] gap-2">
                  <label className="field-label">Icône</label>
                  <label className="field-label">Titre</label>
                  <select className="field py-2 text-xs" value={b.icon}
                    onChange={(e) => patch({ benefits: settings.benefits.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) })}>
                    {['truck', 'shield', 'return', 'sparkle'].map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input className="field py-2 text-xs" value={b.title} onChange={(e) => patch({ benefits: settings.benefits.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                </div>
                <label className="field-label mt-2">Texte</label>
                <textarea rows={2} className="field resize-y text-xs" value={b.text} onChange={(e) => patch({ benefits: settings.benefits.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
              </div>
            ))}
          </div>
        </section>

        <section className="card grid gap-4 p-6">
          <h2 className="font-display text-lg font-semibold">Produits vedettes & packs</h2>
          <div>
            <label className="field-label">Slugs des produits vedettes (séparés par des virgules, dans l’ordre)</label>
            <input className="field" value={settings.featuredProductSlugs.join(', ')}
              onChange={(e) => patch({ featuredProductSlugs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div>
            <label className="field-label">Slugs des packs (séparés par des virgules)</label>
            <input className="field" value={settings.bundleSlugs.join(', ')}
              onChange={(e) => patch({ bundleSlugs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <p className="text-[11px] text-muted">Les slugs inconnus sont simplement ignorés à l’affichage. Exemple : chaussons-bouillotte-foyer, pack-cocooning.</p>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">FAQ (homepage + /faq)</h2>
            <button type="button" className="btn-outline btn-sm" onClick={() => patch({ faq: [...settings.faq, { q: '', a: '' }] })}>+ Question</button>
          </div>
          <div className="flex flex-col gap-4">
            {settings.faq.map((f, i) => (
              <div key={i} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-2">
                  <input className="field mb-2" placeholder="Question" value={f.q}
                    onChange={(e) => patch({ faq: settings.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
                  <button type="button" className="btn-ghost btn-sm text-danger shrink-0" onClick={() => patch({ faq: settings.faq.filter((_, j) => j !== i) })}>✕</button>
                </div>
                <textarea rows={2} className="field resize-y text-sm" placeholder="Réponse" value={f.a}
                  onChange={(e) => patch({ faq: settings.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Enregistrement…' : 'Enregistrer le contenu'}
          </button>
        </div>
      </div>
    </div>
  );
}
