# BORÉALE — mandat d’exploitation

Date : 2026-11-13. Branche : `master/operational-readiness`.

Objectif : une chaîne produit → fournisseur → prix → livraison → panier → paiement → commande → fulfillment → SAV vérifiable. Une compilation ou simulation ne valide pas une vente réelle.

Contraintes : conserver le design, aucun accès Supabase (compte non corrigé), aucune migration appliquée, production, dépense, commande payante, message externe ou secret dans les rapports. Aucune nouvelle dépendance sans demande.

## Ordre des phases

1. Audit ; 2. Architecture ; 3. Catalogue ; 4. Fournisseurs ; 5. Tarification ; 6. Livraison ; 7. Panier ; 8. Paiement ; 9. Commandes ; 10. Fulfillment ; 11. Administration ; 12. Emails/SAV ; 13. Marketing/SEO ; 14. QA indépendante ; 15. Préparation au lancement.

## Équipe et validation

Dix missions spécialisées, exécutées par vagues de trois sous-agents maximum : 01 architecture, 02 UX, 03 catalogue, 04 sourcing, 05 finance, 06 checkout, 07 logistique, 08 marketing, 09 administration, 10 audit indépendant. Aucun sous-agent ne prononce son acceptation. Le chef inspecte et l’auditeur indépendant contrôle les corrections ; seuls les résultats prouvés sont acceptés.

Statuts de décision : APPROVED, REJECTED, BLOCKED, IN PROGRESS. Les statuts décrivent le périmètre réellement testé, jamais une intégration supposée.

Reprise : lire les cinq journaux BOREALE_*, `git status`, branche et dernier commit. Ne pas répéter des vérifications sans changement ou preuve manquante. Aucun travail n’est garanti après l’arrêt du chat.
