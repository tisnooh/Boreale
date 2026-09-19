# QA_TEST_PLAN.md — Plan de recette

## 1. Automatisé (exécuté et ✅ vert)
### Backend (`cd backend`)
- `npm run lint` — ESLint 9 + typescript-eslint : 0 erreur.
- `npm run typecheck` — tsc strict : 0 erreur.
- `npm run test` — **68 tests Vitest** dont 8 tests d'intégration HTTP réels (app Express démarrée sur port éphémère) : pricing (seuils livraison, remises %, fixes, plafonds, bundles), password scrypt (round-trip, rejet, sels, NFKC), JWT (user/admin, expiration, falsification), validators Zod (checkout, codes promo, pagination), **webhook Stripe** (paiement, idempotence, expiration, remboursement, oversell) avec dépendances injectées, **checkout** (prix serveur, stock, doublons fusionnés, remises, erreurs) avec deps factices, transitions de statut, mappers DTO.
- `npm run build` — tsc → dist.
- Smoke test manuel exécuté : `/api/health` 200 ; `/api/products` 503 explicite sans DB ; 404 JSON ; validation 422 ; CORS 403 origine inconnue / allowlist localhost OK.

### Frontend (`cd frontend`)
- `npm run lint` — 0 erreur (12 warnings `react-hooks/set-state-in-effect` assumés, D021).
- `npm run typecheck` — 0 erreur.
- `npm run test` — **36 tests Vitest + Testing Library** : logique panier (ajout/fusion/plafond stock/20 max/persistance corrompue), totaux miroir client, format fr-FR, stockLabel, client API (enveloppes, erreurs, réseau coupé), rendu ProductCard (prix, rupture, badge, bundle).
- `npm run build` — 30 routes compilées (Turbopack par défaut ; `build:lowmem` webpack pour machines < 2 Go, D022).
- Smoke test manuel exécuté (`next start`) : `/`, `/collections`, `/faq`, `/about`, `/legal/*`, `/cart`, `/admin/login` → 200 ; `/products/inconnu` → 404 ; `/robots.txt`, `/sitemap.xml` servis.

## 2. Recette manuelle sur environnement réel (🧑 propriétaire, après connexion Supabase + Stripe TEST)
Exécuter dans l'ordre ; cocher chaque ligne.

### Compte & auth
- [ ] Inscription (email + mot de passe faible refusé avec messages clairs)
- [ ] Login / logout ; cookie httpOnly présent ; `/api/me` OK après refresh
- [ ] Profil éditable (prénom/nom/téléphone) ; opt-in newsletter crée l'abonné + email bienvenue (si Resend)
- [ ] Commande invité avec le même email rattachée au compte créé ensuite

### Catalogue & navigation (mobile 375 px ET desktop 1440 px)
- [ ] Homepage : hero, catégories, vedettes, packs, FAQ — contenu piloté par admin → modifier un titre dans /admin/contenu et le voir changer
- [ ] Collections : recherche `plaid`, tri prix ↑↓, filtres catégorie, pagination
- [ ] Fiche produit : sélecteur variante (taille/couleur), prix qui suit la variante, stock (« plus que X » sous seuil), rupture désactive l'ajout
- [ ] Produits liés, fil d'Ariane, images (remplacer les SVG provisoires par les photos réelles avant lancement)

### Panier
- [ ] Lien de restauration : créer un panier, déclencher le cron manuellement, cliquer le lien `?restore=` de l'email (logs serveur sans Resend) → panier re-rempli avec prix/stocks SERVEUR ; lignes en rupture écartées ; URL nettoyée
- [ ] Ajout → drawer ouvert, jauge livraison offerte, +/− bornés au stock, suppression
- [ ] Persistance après refresh ; panier vide → états propres (page + drawer)
- [ ] Code promo : WELCOME10 (valide), code expiré (message), minimum non atteint (message)

### Checkout Stripe TEST
- [ ] Formulaire complet ; email saisi → panier abandonné enregistré (vérifier table)
- [ ] Carte `4242…` : redirection Stripe, page succès avec numéro réel, email confirmation + reçu, commande `paid` en admin, **stock décrémenté**, `used_count` du code +1, panier abandonné → `converted`
- [ ] Carte refusée `4000 0000 0000 9995` : erreur gérée, commande reste pending → expirée/annulée par webhook
- [ ] Abandon du paiement (retour) : page /checkout/cancel, panier conservé
- [ ] Tentative de fraude prix : modifier le payload (DevTools) → 409/422 serveur, jamais de commande à 1 €
- [ ] `stripe trigger checkout.session.completed` avec webhook CLI : idempotence (pas de double email/statut)

### Commandes & suivi
- [ ] /account/orders liste ; /order/[id] owner OK ; autre compte → 403
- [ ] /track-order invité : numéro+email OK ; mauvais email → not_found
- [ ] Admin : passer `shipped` avec transporteur/n° suivi + notify → email expédition reçu ; `delivered` ; annuler une commande payée → stock ré-incrémenté
- [ ] Remboursement partiel puis total en admin → webhook `charge.refunded` → statuts + emails ; remboursement > restant refusé

### Emails (Resend domaine vérifié)
- [ ] Bienvenue, confirmation commande, reçu, expédition, remboursement, panier abandonné (cron manuel : `curl -H "Authorization: Bearer $CRON_SECRET" https://api.../api/cron/abandoned-carts`), campagne newsletter
- [ ] Lien de désinscription signé fonctionne ; sans signature → 400

### Admin & permissions
- [ ] Login admin (compte créé par script) ; sans cookie : toutes les routes /api/admin/* → 401
- [ ] Token CLIENT sur route admin → 401 (séparation des rôles)
- [ ] CRUD produit complet : création, variantes, stocks, catégories, bundle_items, activation/désactivation, SEO
- [ ] Promotions : création, dates, max_uses atteint → invalidé ; suppression
- [ ] Dashboard : chiffres cohérents avec les commandes passées en test (CA, AOV, série 14 j, top produits, alertes stock)
- [ ] Messages contact reçus + marqués traités

### Sécurité
- [ ] CORS : `fetch` depuis une autre origine → bloqué ; origin inconnue → 403
- [ ] SQL/XSS : message contact avec `<script>` → affiché comme texte en admin
- [ ] Rate-limit : 10 logins admin rapides → 429
- [ ] Cookies : `Secure` + `SameSite=None` en prod ; httpOnly partout
- [ ] `SUPABASE_SERVICE_ROLE_KEY` absente de tout bundle frontend (grep du build)

### Performance
- [ ] Lighthouse mobile ≥ 85 perf / ≥ 95 accessibilité sur `/` et une fiche produit
- [ ] LCP < 2,5 s (hero), pas de CLS visible, INP correct au scroll panier
- [ ] Images produits en next/image dimensionnées

### Juridique (🧑 avec un juriste)
- [ ] CGV/mentions/privacy/returns complétées ([RAISON SOCIALE], médiateur, TVA…)
- [ ] Bandeau cookies si analytics ajouté ; registre RGPD ; durées de conservation appliquées
- [ ] Étiquetage textile conforme sur les fiches (composition réelle fournisseur)

## 3. Tests E2E automatisés (V2 recommandée)
Playwright : parcours achat complet (stripe-mock), auth, admin guard. À brancher une fois les URLs réelles stabilisées (DECISIONS D017).
