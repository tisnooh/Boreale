# BRANDING.md — Phase 2 : identité de marque

## Nom & plateforme
- **Nom (provisoire ⚠️ à valider INPI/domaine)** : **BORÉALE** — évocation du nord et de l'aurore boréale ; féminin, élégant, français, prononciation immédiate. (Alternatives écartées : Froid Doux, Névé, Grand Nord — DECISIONS D001.)
- **Slogan** : **« L'hiver, du bon côté. »**
- **Proposition de valeur** : des essentiels d'hiver sélectionnés et testés — chauds, beaux, durables — livrés vite depuis la France, sans blabla ni fausses promos.
- **Positionnement** : premium accessible (12,90 € → 109,90 €), curateur mono-saison, honnêteté radicale (pas de faux avis/prix barrés/urgence fabriquée), chaleur émotionnelle plutôt que performance technique.
- **Personnalité** : chaleureuse mais précise ; complice sans familiarité ; experte sans jargon. Archétype : le « foyer » (refuge) + une pointe d'explorateur.

## Logo
- Monogramme : cercle nuit polaire, montagne glace, **étoile du nord braise** (fichier `frontend/public/logo.svg` + `app/icon.svg` — favicon natif Next).
- Wordmark : BORÉALE en Fraunces, tracking 0.22em, casse majuscule. Baseline optionnelle : « L'hiver, du bon côté. »
- Usages : fond clair (encre), fond sombre (blanc), jamais de déformation ni d'ombrage.

## Palette (tokens dans `frontend/styles/globals.css` @theme)
| Rôle | Token | Hex | Usage |
|---|---|---|---|
| Primaire | `ink` | #0B1B2B | Nuit polaire : fonds sombres, texte, header/footer |
| Primaire alt | `ink-700` / `ink-500` | #16324A / #33506B | Variantes hover, textes secondaires sur fond sombre |
| Accent | `ember` | #E8622C | Braise : CTA, badges, liens actifs — max ~10 % de la surface |
| Accent hover | `ember-dark` | #C24E1F | États hover |
| Secondaire | `glacier` | #3D7EA6 | Info, progression, liens secondaires |
| Fonds | `snow` / `ice` / `cream` | #F7FAFC / #E9F1F7 / #F6EFE6 | Page, blocs, chaleur (cream = sections éditoriales) |
| Lignes | `line` | #D9E4EC | Bordures |
| Statuts | `success` #2F7D4F · `danger` #B3402F | | Succès/erreurs, jamais décoratifs |

Contrastes vérifiés pour le texte courant (ink sur snow ≈ 15:1 ; ember réservé aux surfaces blanches/grandes tailles).

## Typographie
- **Display** : Fraunces (axes SOFT/WONK activés — chaleur éditoriale) — titres H1-H3, prix, hero.
- **Texte** : Inter — UI, paragraphes, admin.
- Échelle : H1 clamp 2.25→3.75rem, H2 1.875rem, body 0.875-0.9375rem, micro 0.6875rem (badges). Via `next/font` (self-hosted, swap).

## Ton éditorial
- Français direct, concret, sensoriel (froid/chaleur), tutoiement exclu — vouvoiement chaleureux.
- Fiches produits : douleur → solution → preuves (matières, dimensions, consignes) ; zéro superlatif creux (« incroyable », « meilleure vente » interdits sans fait).
- Emojis : rares, hivernaux (❄ ☕), jamais dans les titres de page.
- Transparence assumée : les pages mentionnent explicitement les visuels provisoires et les limites (délais, stocks).

## Design system (implémenté)
- Tokens CSS : couleurs ci-dessus + `radius-card` 1rem + animation `fade-up`.
- Composants/utilitaires : `.btn-primary/.btn-dark/.btn-outline/.btn-ghost/.btn-sm`, `.field/.field-label`, `.card`, `.badge`, `.container-x`, `.font-display` (styles/globals.css).
- UI React : `components/ui` (StatusBadge, Spinner, EmptyState, QtyStepper), layout (Header sticky + annonce, CartDrawer, Footer ink), sections home modulaires pilotées par l'admin (hero, catégories, vedettes, bénéfices, packs, réassurance, FAQ, newsletter).
- Motifs visuels : dégradés nuit→glacier, floconnerie discrète (SVG), photos ambiance chaud/froid ; pas de glassmorphism, pas de gradients criards — objectif « marque française premium », jamais « template dropshipping ».
- Accessibilité : skip-link, focus visibles, `prefers-reduced-motion`, hiérarchie Hn, libellés ARIA (drawer, paniers, timelines).

## Assets livrés
- `frontend/public/logo.svg`, `frontend/app/icon.svg` (favicon), visuels produits SVG provisoires (`public/products/` — D016), hero photo générée (`public/images/hero-hiver.jpg`), 4 visuels collections SVG (`public/images/cat-*.svg`).
- ⚠️ Avant lancement : logo décliné par un graphiste si validation du nom, vraies photos produits, og-image 1200×630 final.
