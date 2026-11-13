# Qualité et preuves

## Complément : Supabase Auth, sourcing et sitemap

La suite backend de la reprise passe114/114, avec timeout30s et un seul worker ; build, typecheck et lint passent. Auth Supabase préparée opt-in, sans requête réelle : 12 tests provider/HTTP mockés et régressions ownership/JWT. Le chef et le reviewer ont contrôlé séparément l’identité issue de getUser, la séparation admin, l’absence de fallback JWT legacy et les métadonnées réservées à l’affichage. Le profil reste explicitement indisponible tant que le mapping FK n’est pas validé.

Sitemap : suppression de la requête limit500 rejetée ; pagination50 jusqu’à10 pages, correspondant au plafond catalogue actuel500. Tests sitemap/preview6/6 et typecheck/lint frontend ciblés passent. Aucune vérification contre une API réelle connectée n’est revendiquée.

Sourcing : trois candidats JSON contrôlés indépendamment (identifiants uniques, draft, non publiés/non commandables, prix de vente et stocknull). Sources fournisseur Camalex et Wordans recoupées par chef et reviewer ; trois contributions recalculées. Les marges restent hypothétiques et les approvisionnements non validés.

Supabase : appel direct du chef sur le compte dédié retourne projects:[], sans erreur. Aucun schéma distant, policy RLS, grant ou projet n’a donc été inspecté, aucune mutation ni connexion réellement effectuée. La visibilité du projet ou son URL non secrète est demandée au propriétaire. Ne pas confondre préparation Auth locale et connexion DB.

Complément refresh frontend : 17 régressions ajoutées ; refresh single-flight après401 client, replay unique, admin/auth/checkout exclus. Une vérification session avant checkout empêche le basculement involontaire en invité ; chargement initial bloquant et identité comparée avant transaction. Le reviewer a demandé cette correction, puis a vérifié8/8 tests checkout indépendamment. Réutilisation de getUser limitée à la même requête : test ajouté, aucun cache partagé entre utilisateurs.

État final des tests à cette reprise : backend115/115 ; frontend92/92 avant ajout du dernier cas authLoading, puis fichier checkout final8/8 revérifié indépendamment. Ne pas transformer cette combinaison en suite globale93/93 fraîche. Backend Auth13/13 et frontend refresh/sitemap/launch23/23 contrôlés indépendamment. Typecheck frontend/backend et lint passent ; builds backend et frontend preview passent (exit0). Le lint frontend conserve les avertissements existants, sans erreur. Aucun build ne constitue une preuve de connexion distante.

Décision du chef : APPROVED pour la préparation locale Auth/refresh, le correctif sitemap et les dossiers de recherche en brouillon, après contre-vérification. BLOCKED pour connexion Supabase, schéma/RLS/profils, synchronisation et achat réel complet. Aucun nouveau produit vendu, aucune modification distante.

2026-11-13 — audit en cours. Aucun achat réel ou Stripe TEST complet exécuté dans cette mission.

Les tests unitaires injectent des dépendances simulées ; ils ne valident pas les services externes.

| Scénario requis | État initial | Preuve exigée |
|---|---|---|
| Achat réussi, refusé, remboursement, emails | BLOCKED | Environnement isolé + enregistrement DB + reçu prestataire |
| Indisponibilité, prix modifié, multi-articles | À tester localement | Régressions backend et panier |
| Webhook dupliqué | À auditer | Répétition et concurrence, transaction persistante |
| Destination impossible | À auditer | Rejet avant effets de bord |
| Isolation commandes clients | À auditer | Contrôles ownership et tests adverses |
| Mobile et non-régression | À vérifier | Navigateur + tests existants |

Décisions du chef : aucune validation globale de la boutique à ce stade.

## Revue indépendante AG10 et décision du chef

Preuves : `BOREALE_INDEPENDENT_AUDIT.md`. Exécutions indépendantes : checkout 14/14, webhook 13/13, config 7/7 ; relance ciblée intégration 9/9, ownership 6/6, payload Stripe 7/7 (120 combinaisons d’arrondis). Des timeouts à 5 s initiaux ont été observés sur machine saturée ; relance avec 30 s CLI, assertions inchangées. Aucun paiement ni base réelle utilisés : HTTP réel et JWT réel avec persistance simulée pour ownership.

AG02 : 4 tests régression checkout passent. Ils prouvent formulaire promo indépendant et panier conservé lors d’une tentative ; ils ne prouvent pas un refus bancaire Stripe réel. Classes visuelles conservées, aucune refonte.

Chef : APPROVED pour ces correctifs locaux bornés après examen et contre-vérification AG10. REJECTED pour l’affirmation « boutique opérationnelle ». BLOCKED pour la validation DB/Stripe/email/fournisseur/transport réelle.

Les défauts persistants ne sont pas cachés : création commande non transactionnelle, webhook sans claim atomique ni reprise durable après stock/email, remboursement sans idempotence durable ; aucun test de concurrence DB réussi. Aucune garantie de non-perte ou non-duplication globale annoncée.

## Régressions de la tranche initiale (actualisations de reprise ci-dessus)

- Panier : dialogue fermé encore tabulable, focus modal à compléter ; promo panier potentiellement périmée après quantité ; nettoyage après paiement confirmé à concevoir sans effacer un nouveau panier.
- SEO live : sitemap demande limit=500 alors API max50 ; pagination à corriger/tester.
- Admin : transitions manuelles vers payé et expédié sans toutes les preuves ; permissions staff/admin et révocation immédiate à renforcer.
- Emails : aucun reçu réel ; markSent malgré delivered=false ; consentement/information relance non démontré. Ne pas activer le cron marketing.
- Catalogue : seed contient encore stock fictif60/variante et activation par défaut ; ne pas l’exécuter sur une base opérationnelle. Aucune modification SQL ni application de migration dans cette mission.
- Sécurité historique : vérifier les rattachements user_id créés par ancien rapprochement email après accès DB autorisé ; aucune donnée existante assainie ici.

Suite backend globale : 101/102, un timeout5s sur rate-limit auth. Ce cas est ensuite passé en 1583ms dans la relance indépendante intégration9/9 avec délai30s. Ne pas déclarer une suite globale102/102 fraîche.

Suite frontend complète : 70/70, 13 fichiers, commande `npm.cmd run test --prefix frontend -- --maxWorkers=1 --minWorkers=1 --testTimeout=30000`. Typecheck, lint et build preview finaux passent (exit0). Lint : 0 erreur, 24 avertissements existants. Build backend passe (exit0) ; typecheck backend passé dans la vérification AG06. `git diff --check` passe. Aucun build n’est une preuve de vente réelle.

Logs livrés : `backend-master-checks.log`, `boreale-backend-build.log`, `boreale-frontend-checks.log`, `boreale-check-results.json` dans le dossier de livraison. Le mode preview du build final est destiné aux tests de conception, pas à la production.
