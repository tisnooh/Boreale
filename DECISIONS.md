# DECISIONS — journal des décisions (ADR)

Format : contexte → décision → justification. Les décisions marquées ⚠️ demandent une validation du propriétaire.

## D001 — Nom de marque : **BORÉALE** (provisoire) ⚠️
- Contexte : besoin d'un nom français, hivernal, premium, mémorisable, non « dropshipping ».
- Décision : BORÉALE (évocation du nord, de l'aurore boréale ; féminin, élégant). Slogan : **« L'hiver, du bon côté. »**
- Alternatives écartées : Froid Doux (trop jeu de mots), Névé (trop technique), Grand Nord (trop générique/déjà utilisé).
- Action propriétaire : vérifier disponibilité **INPI** (classes 25, 24, 12, 35) + domaines (.fr/.com) avant tout achat. Rien n'est réservé par le projet.

## D002 — Monorepo, 2 apps indépendantes
- `frontend/` = app Next.js autonome ; `backend/` = API serverless autonome (Express sur Vercel Functions).
- 2 projets Vercel, Root Directory respectifs. Aucun partage de code (duplication assumée des types DTO pour rester 100 % indépendants et déployables séparément).

## D003 — Backend : Express 4 sur Vercel Functions (catch-all)
- Décision : un seul point d'entrée `api/index.ts` qui exporte l'app Express ; `vercel.json` réécrit tout vers cette fonction.
- Justification : routeur unique, middlewares (CORS, auth, erreurs, raw body webhook) cohérents, portable en local (`tsx src/server.ts`), compatible Vercel sans framework serveur lourd.

## D004 — Auth clients : JWT maison (httpOnly cookie) + tables `users`/`profiles`
- Décision : pas de Supabase Auth côté client ; le backend gère register/login, mot de passe hashé **scrypt** (crypto Node natif), JWT HS256 signé côté serveur, cookie httpOnly.
- Justification : une seule variable publique frontend (`NEXT_PUBLIC_API_URL`) comme exigé ; `SUPABASE_ANON_KEY` reste côté backend ; contrôle total des permissions ; pas de dépendance native (bcrypt) → build Vercel fiable.
- Cookies cross-site (domain.com ↔ api.domain.com) : `SameSite=None; Secure` en production, `Lax` en dev localhost. CORS `credentials: true`, origine whitelistée, jamais `*`.

## D005 — Admin séparé : table `admin_users` + rôle dans le JWT
- Décision : authentification admin distincte des clients (autre table, autre endpoint `/api/admin/auth/login`), claim `role: 'admin'`. Création du premier admin par script `npm run admin:create` (jamais seedé avec un mot de passe en dur).

## D006 — Prix recalculés côté serveur, jamais confiance au client
- Le checkout n'accepte que `variantId + quantity` ; prix, remises, livraison sont recalculés depuis la base. Toute divergence = rejet 409.

## D007 — Pas de faux prix barrés (Omnibus) ⚠️ juridique
- Décision : `compare_at_price` existe en base mais **n'est affiché que s'il correspond au prix le plus bas pratiqué dans les 30 derniers jours** (règle UE 2019/2161). Au lancement : aucun prix barré ; les bundles affichent l'économie réelle vs somme des prix actuels des articles.
- Action propriétaire : faire valider CGV/mentions par un juriste avant lancement.

## D008 — Pas d'avis clients fabriqués
- Aucun module « avis » avec contenu inventé. Un système d'avis vérifiés (post-achat) est prévu en V2 ; la homepage n'affiche que des garanties factuelles (livraison, retours 30 j, paiement sécurisé, stock France).

## D009 — Produits chauffants : uniquement non électriques au lancement
- Bouillottes sèches (noyaux de cerise), chauffe-mains réutilisables (gel/cristallisables), chaussons bouillotte micro-ondes : pas de certification électrique requise au-delà des règles générales de sécurité textile. Tout produit **électrique** (coussin chauffant USB, semelles chauffantes électroniques) est exclu tant qu'un fournisseur réel ne fournit pas DoC CE + tests. Décision de conformité documentée dans PRODUCT_RESEARCH.

## D010 — Livraison : 2 options génériques au lancement ⚠️
- Standard 4,90 € (offerte dès 69 €) et Express 9,90 €, délais annoncés prudemment (48-72 h / 24-48 h ouvrés, préparé en France).
- Aucun transporteur n'est intégré ni simulé : le suivi réel (numéro de tracking saisi par l'admin dans la commande) est envoyé par email. Action propriétaire : ouvrir un compte transporteur réel (Colissimo/Mondial Relay/Shopify Shipping selon volumétrie) et ajuster tarifs.

## D011 — Emails : Resend, templates HTML côté backend
- 7 templates (bienvenue, commande, paiement, expédition, remboursement, panier abandonné, newsletter). Sans `EMAIL_API_KEY` en dev : les emails sont **loggés en console** (comportement documenté, jamais simulé comme « envoyé »).

## D012 — Panier abandonné : capture email au checkout + cron Vercel
- Quand un email est saisi sur `/checkout`, le panier est enregistré (`abandoned_carts`). Un cron Vercel (`/api/cron/abandoned-carts`, protégé par `CRON_SECRET`) envoie **un seul** rappel après ≥ 3 h sans commande. Désinscription respectée (lien dans l'email).

## D013 — Base de données : Postgres Supabase, prix en centimes (integer)
- Pas de float pour l'argent. Devise unique EUR au lancement. RLS activée sur toutes les tables ; le backend utilise la clé service-role (jamais exposée) ; lecture publique limitée au catalogue.

## D014 — Bundles = produits de type `bundle`
- Un bundle est un produit à part (SKU, prix propre, stock propre) avec `bundle_items` (jsonb) listant les SKUs contenus pour la fiche produit et la préparation de commande. Justification : simplicité stocks/prix/promos ; l'admin gère le stock bundle indépendamment (documenté dans OPERATIONS).

## D015 — Tailwind CSS v4 + next/font (Fraunces/Inter)
- Design system tokens en CSS (variables), pas de dépendance UI externe (Radix/shadcn) → bundle léger, contrôle total du look premium.

## D016 — Images produits : placeholders SVG générés ⚠️
- Le catalogue seed utilise des visuels SVG sobres (couleurs de la marque) + quelques visuels d'ambiance générés par IA pour le hero/catégories, **clairement marqués provisoires**. Action propriétaire : remplacer par de vraies photos produits avant le lancement (obligation légale de loyauté : la photo doit représenter le produit vendu).

## D017 — Tests : Vitest (backend logique métier + frontend hooks/lib), pas d'E2E au lancement
- Tests unitaires/intégration sur la logique critique (prix, remises, auth, validation, webhook handler avec Stripe mocké). Les tests E2E (Playwright) sont listés dans QA_TEST_PLAN comme étape avant mise en production une fois Supabase/Stripe réels connectés.

## D018 — Rate limiting mémoire + protection auth
- Limiteur en mémoire sur `/api/auth/*` et `/api/admin/auth/*` (suffisant mono-instance ; documenté : passer à Upstash/Redis si trafic multi-instances). Helmet, CORS strict, validation Zod systématique, cookies httpOnly, webhook Stripe vérifié par signature.

## D019 — Nom de domaine ⚠️ (bloquant propriétaire)
- Le projet n'achète ni ne présume d'aucun domaine. Toutes les URLs publiques passent par `NEXT_PUBLIC_SITE_URL` (frontend) et `FRONTEND_URL` (backend). Production cible : `domain.com` + `www` → frontend, `api.domain.com` → backend (voir docs/DEPLOYMENT.md).

## D020 — Statuts de commande
- `pending → paid → processing → shipped → delivered`, plus `cancelled`, `refunded`, `partially_refunded`. Chaque transition écrit un `order_event` (traçabilité) et peut déclencher un email.

## D021 — ESLint : `react-hooks/set-state-in-effect` en warning (frontend)
- Contexte : la règle React 19/Next 16 signale l'hydratation localStorage (panier) et le fetch-on-mount (auth, admin) — patterns pourtant standard et nécessaires pour un rendu SSR sans mismatch.
- Décision : règle rétrogradée en `warn` avec commentaire dans `eslint.config.mjs` ; les 12 avertissements restants correspondent exclusivement à ces deux patterns. Aucune autre règle désactivée.

## D022 — Build frontend : Turbopack par défaut, webpack en secours basse mémoire
- `npm run build` = `next build` (Turbopack, comme sur Vercel). `npm run build:lowmem` = `next build --webpack` pour les machines < 2 Go de RAM (l'environnement de développement de ce projet était limité à ~1 Go). Les deux chemins compilent les 30 routes ; Vercel utilisera Turbopack.

## D023 — Visuels collections en SVG on-brand (pas d'images générées supplémentaires)
- Seule la photo hero (`public/images/hero-hiver.jpg`) est une image générée ; les 4 visuels de collections sont des SVG déterministes de la marque (public/images/cat-*.svg) et les visuels produits des SVG provisoires (D016). Tout est remplaçable par de vraies photos sans changement de code (mêmes chemins).

## D024 — OG image par défaut = photo hero
- En l'absence d'un og-default 1200×630 dédié, `lib/seo.ts` et le layout racine utilisent `/images/hero-hiver.jpg`. Action propriétaire : créer l'OG final avec le logo validé (documenté dans docs/SEO.md).

## D025 — Lien de restauration du panier abandonné (`/cart?restore=`)
- Contexte : l'email panier abandonné pointait vers `/collections` (aucun moyen de retrouver ses articles).
- Décision : payload base64url `{variantId, quantity}` dans l'URL ; le frontend re-fetch **prix et stocks actuels** via `GET /api/variants?ids=…`, écarte les lignes en rupture/désactivées, plafonne au stock réel, puis nettoie l'URL. Le payload n'est PAS une frontière de sécurité (jamais de prix dedans ; le checkout recalcule tout).
- Tests : `tests/cart-restore.test.ts` (round-trip, corruption, bornes) + intégration backend `/api/variants` (422 ids invalides, 503 sans DB).

## D026 — Headers de sécurité frontend (next.config.ts)
- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`, HSTS uniquement en production ; `X-Robots-Tag: noindex` forcé sur /admin, /checkout, /account, /order ; `poweredByHeader: false`.

## D027 — OG image dédiée générée
- `public/og/og-default.png` (navy + wordmark + tagline) remplace la photo hero comme image sociale par défaut (met à jour D024).

## D028 — Mode `preview` par défaut (frontend)
- Contexte : besoin de valider visuellement et techniquement le site AVANT toute infrastructure réelle, sans jamais simuler de succès business.
- Décision : `NEXT_PUBLIC_SITE_MODE=preview|live` (`lib/config.ts`). Preview = catalogue de démonstration local isolé (`lib/catalog/preview-data.ts`) + bandeau « Mode preview » + services renvoyant des statuts `preview` explicites (checkout ne crée aucune commande, newsletter/contact n'enregistrent rien, auth refusée sans compte simulé). Live = API réelle ; API absente = états vides honnêtes.
- JSON-LD Product supprimé en preview (pas de données structurées sur des données de démo).

## D029 — Abstraction catalogue `lib/catalog/source.ts`
- Les composants UI ignorent la provenance des données : une seule interface `CatalogSource` (products/product/categories/bundles/homepage) avec deux implémentations (preview locale / API live). Connecter la vraie base = changer une variable d'env, zéro réécriture de composant. Filtres/tri partagés (`filterProducts`, `sortProducts`) indépendants de la source.

## D030 — Correctifs UX/accessibilité/robustesse de la phase finale
- Contraste AA : liens texte sur fond clair passés de `ember` à `ember-dark` (icônes décoratives conservées en ember).
- Drawer panier : focus entrant à l'ouverture, restitution à la fermeture ; menu mobile : fermeture ESC + `aria-controls`.
- `SafeImage` : repli automatique sur placeholder si une image échoue (jamais d'image cassée).
- `OfflineNotice` : bandeau « connexion perdue » (online/offline) pour éviter tout doute utilisateur.
- Aucune refonte : identité, palette, typographies, composants et animations existants conservés.

## D031 — Cron paniers abandonnés : fréquence daily (compatible Vercel Hobby)
- Contexte : le plan Vercel Hobby limite Vercel Cron (intervalle minimal ~1 jour) ; un schedule hourly pouvait bloquer ou être throttlé au déploiement.
- Décision : `schedule: "0 9 * * *"` (1 passage/jour à 09:00 UTC) dans `backend/vercel.json`. La logique du endpoint reste identique (paniers ouverts ≥ 3 h, 1 rappel max). Si besoin de plus fréquent : plan Pro ou appel manuel authentifié (`Authorization: Bearer CRON_SECRET`).

## D032 — Passe éditoriale premium homepage & cartes (retour utilisateur « trop template »)
- Contexte : après premier déploiement, le rendu paraissait « boutique basique » (grilles de cartes standard).
- Décision : montée en gamme éditoriale SANS refonte d'identité (palette, Fraunces/Inter, composants conservés) :
  héro asymétrique typographié (N°01) + méta-chiffres ; ticker de marque (marquee, coupé si prefers-reduced-motion) ;
  univers en index numéroté hairline (N°02) ; sélection N°03 ; manifeste sombre numéroté remplaçant la grille
  « bénéfices » (N°04, contenu toujours piloté admin) ; packs en rédaction sticky (N°05) ; FAQ N°06 ; newsletter N°07 ;
  footer wordmark géant outline ; cartes produit 4/5 avec voile « Voir le produit » et prix « dès » ; fiche produit galerie sticky 4/5.
- Aucune donnée inventée ajoutée : les méta-chiffres du héro (48 h / 30 j / 14 produits) reprennent des engagements déjà documentés (livraison, retours, taille du catalogue seed).

## D033 — Animations éditoriales + packshots IA partiels
- Animations (toutes coupées si `prefers-reduced-motion`, fallback `<noscript>`) : reveal au scroll
  (IntersectionObserver, stagger 80-100 ms), line-mask sur le titre héro, ken burns 16 s sur le visuel héro,
  filets d'overline animés, card-lift au hover. Aucune librairie d'animation ajoutée (CSS + IO natif).
- Packshots IA provisoires : 7 produits photographiés (foyer, sentinelle, nuage, nid, bise, contact, braise)
  sur fond nuit polaire cohérent DA ; les 6 autres gardent le SVG marque en attendant la fin du quota
  d'images — **à remplacer par photos réelles avant lancement** (D016). Les packs utilisent un collage 2×2
  des visuels de leurs composants (résolution par SKU), jamais de visuel pack inventé.

## D034 — Passe magazine anti-template + animations tous navigateurs
- Contexte : retour utilisateur « encore une boutique e-com comme partout » + animations invisibles sur certains PC.
- Décision design : home reconstruite en expérience magazine — cover plein écran (typo géante line-mask,
  collage décalé avec légende « Pièce N°07 », sommaire cliquable 01-04), ticker, index des univers avec
  **aperçu image suivant le curseur** (desktop pointeur fin uniquement), sélection en **rail horizontal snap**
  (boutons prev/next, drag, clavier), **break parallaxe** pleine largeur avec citation, manifeste/packs/FAQ/newsletter
  renumérotés 03-06. Anciennes grilles hero/catégories supprimées (Hero.tsx, CategoryGrid.tsx).
- Décision animations : `prefers-reduced-motion` ne coupe plus TOUT : seuls marquee/kenburns/scroll-cue/parallaxe/
  cursor-preview sont stoppés ; les reveals deviennent des fondus opacité 300 ms (lisibles même avec effets
  Windows désactivés). Fallback `IntersectionObserver` absent → contenu visible. Barre de progression de lecture
  fixe en haut (gradient braise→glacier). Cursor-preview masqué sur tactile via `(hover: none)`.

## D035 — Cover plein écran + polaroids flottants (retour utilisateur)
- Contexte : fond bleu plat jugé fade ; demande explicite : image plein écran + multiplier les cartes
  « Pièce N°07 — Foyer » appréciées.
- Décision : cover = photo immersive 100svh (ken burns) + double dégradé d'encre pour la lisibilité ;
  4 polaroids légendés (Pièce N°07 Foyer, N°11 Sentinelle, N°13 Nid, N°01 Nuage) dispersés et flottants
  (animation 7 s alternate, délais échelonnés) sur desktop, rangée scrollable snap sur mobile ;
  sommaire et méta conservés en pied de cover. Reduced-motion : flottement coupé, tilt conservé.
