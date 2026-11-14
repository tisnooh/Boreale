# Livraison — transactions commandes et paiements

## Résultat et portée

Le projet existant `luojeyfznonjnacftxbm` dispose maintenant d’une fondation transactionnelle pour la création des commandes et la confirmation des paiements. Migration additive `boreale_order_payment_atomic`, version distante `20261114033519`, après contrelecture indépendante. Aucun déploiement du site, aucun achat, aucun paiement Stripe ni email réel.

`ready` signifie que le stock interne a été alloué. Cela ne prouve ni un fournisseur exploitable, ni une expédition possible. Les ventes restent fermées.

## Changements

- Création de la commande, des lignes et de l’événement par un seul RPC. Contrôles des montants, des références et de la cohérence du client ; aucun fallback aux écritures séparées.
- Règlement sous verrou de commande : journal durable des événements, unicité session/intent, stock agrégé verrouillé dans un ordre stable, paiement et effets métier dans une transaction.
- En cas de rupture après paiement ou de paiement après annulation : encaissement conservé, incident avec responsable et prochaine action, traitement bloqué, aucune allocation partielle.
- Annulation d’une commande en attente sous le même verrou que le paiement. Une expiration tardive ne peut plus écraser le paiement confirmé.
- Notifications enregistrées dans une outbox unique par commande/type. Aucun email déclaré envoyé ; le worker reste à développer.
- Administration : paiement et remboursements manuels sans preuve prestataire refusés ; préparation sans allocation refusée ; expédition exige transporteur et suivi. Annulation d’une commande encaissée bloquée jusqu’au workflow atomique approprié, pour éviter un réapprovisionnement fictif.
- Remboursement reçu avant rapprochement du paiement : erreur 503 réessayable au lieu d’un acquittement silencieux.

## Preuves

Recette `backend/scripts/verify-order-transactions.mjs` : **32 contrôles réussis par le chef, puis 32 par l’auditeur indépendant**. Les requêtes et transactions Supabase sont réelles ; les données commerciales et événements de paiement sont synthétiques, les produits/variantes restent inactifs. Stripe : zéro requête. Emails : zéro envoi.

Contrôles : création et événement, rejet de totaux incohérents, concurrence du même événement, événements distincts pour la même session, paiement unique, stock et promotion consommés une fois, collision d’intent avec rollback tardif des effets, rupture multi-articles sans débit partiel, concurrence entre deux commandes sur une unité, paiement après annulation, course expiration/paiement et refus des accès publics.

Les journaux sont append-only pour le compte de service. Le script génère un nettoyage SQL réservé à l’administration, limité aux marqueurs uniques de son exécution. Le chef a exécuté ce nettoyage après chaque recette. La suite ne doit pas être relancée sans prendre en charge ce nettoyage ; aucune permission DELETE publique n’a été ajoutée pour faciliter les tests.

Les contrôles unitaires restent distincts : 48 tests webhook/repository contre-vérifiés indépendamment ; contrôles administratifs complémentaires et vérifications globales consignés dans `BOREALE_QA.md`.

Suite finale backend : **174/174 PASS**, lint global et compilation TypeScript PASS. Les dix garde-fous admin ont été contre-vérifiés indépendamment en deux exécutions (8 puis 2). Le contrôle SQL `backend/scripts/verify-create-order-rollback.sql` a également réussi : création complète puis échec volontaire après retour du RPC, rollback commande/lignes/événement et des fixtures. Aucune panne interne au RPC n’est revendiquée. Les séquences peuvent avancer malgré le rollback ; aucune remise à zéro n’a été tentée.

API locale redémarrée avec le build courant : `/api/health` 200, base configurée ; catalogue 200 vide ; `/api/me` 401 sans session. Le healthcheck confirme aussi Stripe/webhook absents et email en journalisation seule. Supabase confirme 23 tables publiques, toutes RLS. Aucune preuve de prestataire disponible n’est déduite du simple démarrage de l’API.

Advisors après migration : 17 informations `rls_enabled_no_policy` pour les tables backend privées ; refus publics réellement testés, aucun élargissement des accès. [Explication du diagnostic Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Limites et suite

1. Aucun paiement de test prestataire, remboursement Stripe, réception d’email ou achat mobile complet validé.
2. La création du checkout n’a pas encore de clé durable d’intention : une nouvelle soumission peut créer une autre commande en attente. La déduplication des notifications ne résout pas ce cas.
3. Les remboursements restent multi-écritures et non monotones face aux événements désordonnés. Les transitions administratives de préparation/livraison restent à rendre atomiques avec les autres changements.
4. L’outbox conserve le travail à faire ; aucun worker, reprise d’envoi ni preuve de délivrabilité opérationnelle.
5. Aucun mapping fournisseur, devis livré, catalogue vendable, régime fiscal ou document vendeur finalisé.
6. Le scénario de création rejetée avant insertion ne constitue pas une injection d’erreur au milieu du RPC. Toute preuve de rollback transactionnel après son retour doit être nommée ainsi.

La validation porte sur cette fondation technique. L’ouverture commerciale reste **BLOCKED**.

## Références de la revue

[Transactions PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html), [verrous PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html), [fonctions Supabase et permissions](https://supabase.com/docs/guides/database/functions), [webhooks Stripe : doublons et désordre](https://docs.stripe.com/webhooks).

## Modules — état de lancement

| Module | Statut | Preuve actuelle | Dépendance restante |
|---|---|---|---|
| Architecture | Fonctionnel et testé, périmètre borné | Auth/RLS puis transactions DB réelles | Checkout idempotent et autres workflows atomiques |
| Catalogue | Bloqué pour vente | Trois dossiers de recherche en brouillon | Données, conformité, images et prix approuvés |
| Fournisseurs | Bloqué | Offres publiques comparées et contradictions conservées | Références, disponibilités et devis livrés confirmés |
| Prix et marges | Simulé | Scénarios explicitement hypothétiques | Coûts vérifiés et régime fiscal |
| Livraison | Bloqué | Restrictions locales préparées | Prestataire, frais, délais et retours réels |
| Panier | Testé localement, parcours complet non validé | Régressions existantes | Synchronisation persistante, recette mobile complète |
| Paiement | Fondation DB testée, prestataire non testé | Concurrence/déduplication avec événements synthétiques | Stripe isolé et remboursements atomiques |
| Commandes | Création/règlement DB testés | Recettes chef + auditeur | Idempotence checkout et reprise interprestataire |
| Fulfillment | Non réalisé comme intégration | Incidents de stock persistés | Fournisseurs, attributions et expéditions |
| Emails | Développé partiellement, non envoyé | Outbox persistée | Worker, configuration, contenu légal et réception |
| Administration | Garde-fous testés, exploitation incomplète | Refus des transitions financières sans preuve | Interface incidents et transitions atomiques |
| SAV | Procédure préparée | Rapport opérations | Workflow et remboursements testés |
| SEO | Testé localement | Sitemap paginé, gardes préouverture | Catalogue réel et domaine approuvé |
| Sécurité | Contrôles ciblés testés | RLS/Auth/ownership et RPC privés | Recette des modules restant à intégrer |
| Conformité | Bloqué | Liste des informations à fournir | Identité exploitant, fiscalité, retours, produits |

## Décisions propriétaire nécessaires

L’identité et le régime de l’exploitant, l’assortiment et le modèle d’approvisionnement doivent être confirmés pour ouvrir les ventes. Les produits candidats restent en brouillon ; aucun achat ni contact fournisseur n’a été engagé. La connexion sécurisée au prestataire de paiement de test et à l’email reste à vérifier dans les accès disponibles ; aucune clé secrète n’est demandée dans la conversation. Dépense, publication et production nécessitent toujours une autorisation distincte.
