# Qualité et preuves

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

## Régressions restantes

- Panier : dialogue fermé encore tabulable, focus modal à compléter ; promo panier potentiellement périmée après quantité ; nettoyage après paiement confirmé à concevoir sans effacer un nouveau panier.
- SEO live : sitemap demande limit=500 alors API max50 ; pagination à corriger/tester.
- Admin : transitions manuelles vers payé et expédié sans toutes les preuves ; permissions staff/admin et révocation immédiate à renforcer.
- Emails : aucun reçu réel ; markSent malgré delivered=false ; consentement/information relance non démontré. Ne pas activer le cron marketing.
- Catalogue : seed contient encore stock fictif60/variante et activation par défaut ; ne pas l’exécuter sur une base opérationnelle. Aucune modification SQL ni application de migration dans cette mission.
- Sécurité historique : vérifier les rattachements user_id créés par ancien rapprochement email après accès DB autorisé ; aucune donnée existante assainie ici.

Suite backend globale : 101/102, un timeout5s sur rate-limit auth. Ce cas est ensuite passé en 1583ms dans la relance indépendante intégration9/9 avec délai30s. Ne pas déclarer une suite globale102/102 fraîche.

Suite frontend complète : 70/70, 13 fichiers, commande `npm.cmd run test --prefix frontend -- --maxWorkers=1 --minWorkers=1 --testTimeout=30000`. Typecheck, lint et build preview finaux passent (exit0). Lint : 0 erreur, 24 avertissements existants. Build backend passe (exit0) ; typecheck backend passé dans la vérification AG06. `git diff --check` passe. Aucun build n’est une preuve de vente réelle.

Logs livrés : `backend-master-checks.log`, `boreale-backend-build.log`, `boreale-frontend-checks.log`, `boreale-check-results.json` dans le dossier de livraison. Le mode preview du build final est destiné aux tests de conception, pas à la production.
