# BORÉALE — Frontend

Storefront Next.js (App Router, TypeScript, Tailwind CSS v4, mobile-first). Application **indépendante** : projet Vercel n°1 avec `Root Directory = frontend`.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 (design system dans `styles/globals.css`, tokens = palette BORÉALE)
- Polices : Fraunces (display) + Inter (texte) via `next/font`
- Tests : Vitest + Testing Library (jsdom)

## Démarrage
```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

## Scripts
| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production (Turbopack — recommandé, comme sur Vercel) |
| `npm run build:lowmem` | build via webpack, pour les machines < 2 Go de RAM |
| `npm run lint` / `typecheck` / `test` | qualité |

## Variables d'environnement
| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | oui | URL de l'API backend (`http://localhost:4000` en dev, `https://api.domain.com` en prod) |
| `NEXT_PUBLIC_SITE_URL` | recommandé | URL publique du site (canonical, sitemap, OG, JSON-LD) |

**Aucune autre variable** : pas de clé Stripe, pas de clé Supabase côté frontend (voir `docs/SECURITY.md`).

## Structure
```
app/            # pages (Route Handler none — tout passe par le backend)
├── (boutique)  # /, /collections, /products/[slug], /cart, /checkout, /faq, /contact, /about, /legal/*
├── account/    # compte client (JWT httpOnly cookie posé par le backend)
├── order/[id]/ # détail commande (owner uniquement)
├── track-order/# suivi invité (numéro + email)
├── admin/      # back-office complet (login séparé /admin/login)
├── sitemap.ts / robots.ts / icon.svg
components/     # ui/, layout/ (Header, Footer, CartDrawer), home/, product/, admin/
hooks/          # use-cart (localStorage), use-auth, use-toast
lib/            # api.ts (client), api-server.ts (RSC), types, format, totals, seo, constants
public/         # logo, images d'ambiance, visuels produits SVG (provisoires — voir DECISIONS D016)
styles/         # globals.css = design system Tailwind v4
tests/          # Vitest : panier, prix, api, format, composants
```

## Comportement sans backend
Le site **démarre et se build sans backend** : les Server Components utilisent `api-server.ts`
(try/catch → `null`) et affichent des états vides explicites (« Catalogue temporairement
indisponible »). Aucune fausse donnée n'est jamais injectée. Le contenu de secours de la
homepage (`lib/homepage-fallback.ts`) est la copie exacte des defaults backend.

## SEO
Voir `docs/SEO.md` : metadata par page, canonical via `metadataBase`, sitemap dynamique,
robots, JSON-LD Product/Organization/Breadcrumb/FAQ, Core Web Vitals.

## Notes
- Le panier est local (localStorage) et **revérifié côté serveur** au checkout (prix, stock).
- Auth : cookie httpOnly posé par le backend (`SameSite=None; Secure` en prod, CORS credentials).
- `react-hooks/set-state-in-effect` est en *warn* : hydration localStorage et fetch-on-mount
  sont des patterns assumés (DECISIONS.md D021).
- Visuels produits : SVG provisoires générés par `scripts/gen-product-visuals.mjs` —
  à remplacer par de vraies photos avant lancement (DECISIONS.md D016).
