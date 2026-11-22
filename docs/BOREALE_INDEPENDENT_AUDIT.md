# Contrôle indépendant AG10 — 2026-11-13

## Périmètre et limites

Revue du diff local du chef, d’AG02 et d’AG06 : checkout, webhooks, configuration, isolation commandes, régressions UX ; lecture indépendante des modèles finance et opérations. Aucun code modifié par AG10, aucun accès DB, Stripe ou compte externe, aucune recette de production. Le skill `security-scan` a été lu : il exclut les diffs de travail ; ce contrôle n’est donc pas présenté comme un scan de sécurité exhaustif du dépôt.

Signal « diff final » reçu du chef. Revue finale effectuée sur les modifications présentes, y compris le contrôle anticipé des lignes Stripe avant création client/commande. Aucun déploiement examiné.

## Résultats de revue

- `backend/src/services/checkout.ts` agrège les quantités avant contrôle du stock ; persistance session injectée et erreur propagée avant restitution de l’URL. La création commande/lignes et la création de session ne forment toujours pas une transaction distribuée.
- `backend/src/services/webhooks.ts` rejette montant/devise divergents et paiement payé sans commande associée ; traite le succès asynchrone. La prise en charge persistante et concurrente du paiement/stock reste insuffisante : lecture `pending`, marquage payé, puis décrément best effort. Un retry après crash n’est pas une preuve de reprise complète.
- `frontend/app/checkout/page.tsx` conserve les classes de présentation, supprime le formulaire imbriqué et n’efface plus le panier avant Stripe. Les tests de rejet du service sont des simulations locales, pas des paiements refusés par Stripe. Nettoyage après succès fiable et focus du drawer restent à vérifier.
- `backend/src/config.ts` refuse en production les valeurs de secrets de développement, valeurs courtes et secrets JWT/cron identiques. Cela ne prouve pas la qualité des secrets réellement configurés.
- Contrôle indépendant du défaut email : `authService.register` émet un JWT avant vérification de possession email ; les anciens chemins ownership par égalité email et import automatique des commandes invitées étaient exploitables. La correction exige ownership par `user_id` authentifié et suppression de l’attribution checkout par email. Les données historiques potentiellement attribuées avant correction doivent être auditées séparément, sans modification DB dans cette mission.
- `docs/BOREALE_FINANCE.md` sépare correctement hypothèses et observations ; calculs des trois scénarios et seuils cohérents. Aucune rentabilité réelle démontrée.
- `docs/BOREALE_OPERATIONS.md` décrit un registre et une procédure manuels ; ce document n’est pas une intégration ni une recette exécutée.

## Tests indépendants exécutés

Commande initiale : `npm.cmd exec -- vitest run test/checkout.test.ts test/webhook.test.ts test/config.test.ts test/integration.test.ts --maxWorkers=1 --minWorkers=1`.

Résultat : checkout **14/14**, webhook **13/13**, configuration **7/7** ; intégration **6/9**, trois timeouts à 5 secondes (checkout fermé, health, rate-limit). Total **40/43**. Durée totale 393 s, dont collecte 247 s : machine fortement ralentie. Ce résultat reste un échec de validation, pas une réussite supposée ; aucun défaut métier n’est établi par ces seuls timeouts.

Relance ciblée avec timeout explicite de 30 secondes, sans modifier les tests : `npm.cmd exec -- vitest run test/integration.test.ts test/order-ownership.test.ts test/stripe-lines.test.ts --maxWorkers=1 --minWorkers=1 --testTimeout=30000 --hookTimeout=30000`.

Résultat indépendant : **22/22 réussis** — intégration HTTP **9/9**, isolation HTTP/auth avec dépôts simulés **6/6**, payload Stripe pur **7/7** (dont boucle de 120 combinaisons d’arrondis). Durée 441,84 s, dont collecte 266,36 s. Les trois timeouts initiaux n’ont pas été reproduits avec ce budget explicite. Les assertions n’ont pas été affaiblies. Aucun paiement ou accès DB réel n’est intervenu.

Revue finale des frontières : `optionalUser` précède le contrôleur checkout ; seul `req.user.sub` est transmis au service. Les lectures de commandes privées exigent le `user_id` propriétaire ou un administrateur. Les commandes invitées ne sont plus fusionnées par email. La validation d’adresse borne les demandes à FR et aux préfixes métropolitains prévus ; ce contrôle de syntaxe ne prouve ni une adresse existante ni une offre transporteur.

Le helper Stripe conserve total et quantités, ne produit pas de centimes négatifs, rejette les totaux incohérents et les payloads dépassant 100 lignes. Le contrôle anticipé présent avant `upsertCustomer` évite les effets de bord pour ce dernier rejet. L’appel anticipé a été contrôlé statiquement ; pas de nouveau test d’effets de bord spécifique exécuté par AG10 après cette dernière insertion.

## Conclusion indépendante soumise au chef

Les corrections locales contrôlées ne présentent pas de défaut critique introduit identifié dans ce périmètre. Les régressions indépendantes listées ci-dessus passent ; cela permet une acceptation bornée de ces corrections par le chef. Ce contrôle ne valide pas un parcours d’achat réel et ne constitue pas un audit exhaustif des permissions, du runtime, des secrets ou de la sécurité du dépôt. Les constats critiques de persistance/concurrence existants restent non résolus et l’ouverture des ventes reste refusée.

## Conditions non satisfaites avant ventes

Maintenir `CHECKOUT_ENABLED=false`. Achat Stripe isolé, enregistrement DB, idempotence concurrente/reprise durable, livraison réelle, fournisseur exact, réception emails, conformité et recette mobile complète ne sont pas validés. La disparition de défauts locaux n’autorise pas l’ouverture commerciale.

La décision d’acceptation finale appartient au chef ; AG10 ne valide pas son propre rapport.
