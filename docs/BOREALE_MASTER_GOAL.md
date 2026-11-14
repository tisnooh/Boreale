# BORÉALE — mandat d’exploitation

Checkpoint du 14 novembre : le GOAL global reste ouvert. La tranche commandes/règlement est revue et testée en base, sans valider les ventes. Référence actuelle : `BOREALE_TRANSACTION_DELIVERY.md`. Conserver le même dépôt, la même branche, le même projet Supabase et le design ; reprendre les tâches non terminées listées dans `BOREALE_PROGRESS.md`. Les limites sur production, dépenses, engagements et données commerciales restent applicables.

Date : 2026-11-13. Branche : `master/operational-readiness`.

## Autorisation la plus récente — premier projet Supabase

Après constat organisation vide, le propriétaire a explicitement autorisé la création du premier projet BORÉALE dans l’organisation boreale. Projet créé : luojeyfznonjnacftxbm, Paris eu-west-3, coût annoncé par Supabase0/mois, état ACTIVE_HEALTHY. Bootstrap et connexion réalisés dans le cadre de l’autorisation de connecter les modules et Auth. Aucun deuxième projet ni branche, aucun produit publié, dépense payante ou déploiement storefront.

Cette autorisation remplace la contrainte historique « ne pas créer de projet supplémentaire » uniquement pour ce premier projet. Les autres limites restent applicables.

## Complément autorisé le 13 novembre

Le propriétaire demande une recherche produits/fournisseurs autonome avec preuves actuelles et prépare des candidats brouillons, sans achat ni publication. Il autorise désormais l’identification et la connexion du projet Supabase existant dédié à BORÉALE, Supabase Auth, contrôle RLS et recette. Cette autorisation remplace l’interdiction d’accès Supabase mentionnée ci-dessous ; elle ne permet ni projet supplémentaire, dépense, mutation destructive, ni déploiement de production. Inspecter l’existant avant toute écriture distante et conserver le design.

Missions séparées : recherche produits, identification/inventaire Supabase en lecture seule, adaptation locale Auth. Le chef examine les résultats puis demande une revue indépendante. Aucun secret dans les documents ou le chat.

Objectif : une chaîne produit → fournisseur → prix → livraison → panier → paiement → commande → fulfillment → SAV vérifiable. Une compilation ou simulation ne valide pas une vente réelle.

Contraintes : conserver le design, aucun accès Supabase (compte non corrigé), aucune migration appliquée, production, dépense, commande payante, message externe ou secret dans les rapports. Aucune nouvelle dépendance sans demande.

## Ordre des phases

1. Audit ; 2. Architecture ; 3. Catalogue ; 4. Fournisseurs ; 5. Tarification ; 6. Livraison ; 7. Panier ; 8. Paiement ; 9. Commandes ; 10. Fulfillment ; 11. Administration ; 12. Emails/SAV ; 13. Marketing/SEO ; 14. QA indépendante ; 15. Préparation au lancement.

## Équipe et validation

Dix missions spécialisées, exécutées par vagues de trois sous-agents maximum : 01 architecture, 02 UX, 03 catalogue, 04 sourcing, 05 finance, 06 checkout, 07 logistique, 08 marketing, 09 administration, 10 audit indépendant. Aucun sous-agent ne prononce son acceptation. Le chef inspecte et l’auditeur indépendant contrôle les corrections ; seuls les résultats prouvés sont acceptés.

Statuts de décision : APPROVED, REJECTED, BLOCKED, IN PROGRESS. Les statuts décrivent le périmètre réellement testé, jamais une intégration supposée.

Reprise : lire les cinq journaux BOREALE_*, `git status`, branche et dernier commit. Ne pas répéter des vérifications sans changement ou preuve manquante. Aucun travail n’est garanti après l’arrêt du chat.
