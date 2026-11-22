# BORÉALE — signaux de remboursement, 17 novembre 2026

La configuration Stripe est reportée à la demande du propriétaire. La tranche poursuivie sécurise uniquement la réception des signaux `charge.refunded` : **elle ne réalise pas de remboursement et ne valide pas le parcours d'achat**. Aucun changement graphique, produit activé, paiement, email, demande fournisseur ou déploiement du site.

## Comportement livré

Une transaction privée vérifie l'événement, la charge, le paiement, les montants et la devise. Elle conserve un maximum historique observé dans un journal séparé des montants financiers. Le même identifiant d'événement est sans effet à la deuxième réception ; un autre événement portant le même cumul reste conservé. Les cumuls anciens ne diminuent pas le maximum historique ; une seconde charge pour le même paiement est refusée plutôt qu'additionnée arbitrairement.

Chaque nouvel événement valide ouvre un incident `refund_provider_reconciliation`, attribué au support avec une prochaine action, visible dans l'administration existante. Les commandes payées ou en préparation passent en préparation bloquée ; une commande déjà expédiée ou livrée conserve son état physique. Un rejeu strict ne réouvre pas un incident rapproché manuellement.

Les statuts financiers, montants remboursés, stocks et totaux restent inchangés. Aucune mention « remboursée » n'est déduite du seul signal Charge. L'ancien chemin séquentiel et son email direct ont été supprimés. L'action de remboursement de l'administration reste désactivée. Le rapprochement des objets Refund, de leurs identifiants et de leurs états `pending/succeeded/failed/canceled/requires_action` reste à développer avant automatisation complète. [Événements et cycle de vie Stripe](https://docs.stripe.com/refunds), [montant cumulé d'une Charge](https://docs.stripe.com/api/charges/object).

## Validation et décisions du chef

- Première proposition **REJECTED** : elle assimilait le cumul Charge à un remboursement final. Correction vers un journal d'observations sans projection financière.
- Revue indépendante : **APPROVED pour le code/SQL bornés**, après ajout du blocage logistique et de la réouverture sur tout nouvel événement, y compris à cumul identique. L'auteur ne valide pas son propre travail.
- Tests ciblés : **77/77** (34 webhooks existants, 28 observations, 15 repository). Ce sous-ensemble ne doit pas être additionné au total global.
- Migration additive appliquée au projet existant `luojeyfznonjnacftxbm` via MCP : `20261117035632_boreale_refund_webhook_atomic.sql`. Fichier créé par CLI puis renommé selon la version réellement enregistrée ; contenu inchangé SHA-256 `FCC786BF7DD25DE15F590A7B4B9C2D445755630AF3F16036E08517B844BD823D`. Le commentaire « PREPARED ONLY » du fichier est celui du contenu relu avant application ; l'état d'application est consigné ici.
- Recette réelle PostgreSQL `backend/scripts/verify-refund-observations.sql` : **PASS**, assertions exécutées, rollback et neuf comptages résiduels à zéro. Droits privés/RLS, doublons, cumuls anciens, conflits, paiement non rapproché, blocage de l'expédition, réouverture d'incident et compatibilité avec le règlement existant sont vérifiés. Une connexion, aucune preuve de concurrence revendiquée.
- Lecture distincte après recette : zéro commande, paiement, client et utilisateur Auth ; trois produits privés, zéro actif ; les trois nouveaux journaux sont vides. Aucun jeu d'essai persistant.
- Advisors sécurité : **0 WARN/ERROR**, 23 notices INFO `rls_enabled_no_policy` sur les tables privées, dont les trois nouvelles. Aucune politique publique permissive ajoutée.

Contrôles globaux frais : **394/394 tests backend** dans 31 fichiers ; TypeScript, lint et compilation backend terminés avec code 0. Aucun fichier frontend changé par cette tranche ; pas de nouvelle recette navigateur. Les résultats sont consignés dans [le reçu de validation](qa/BOREALE_REFUND_OBSERVATIONS_20261117_RESULTS.json).

Checkpoint local sur la branche dédiée : aucun push des tranches en attente de recette UI et aucun déploiement du site. Les fichiers de guidance frontend non suivis ont été laissés hors du commit.

## État de la boutique

Les constats antérieurs restent détaillés dans [le rapport checkout](BOREALE_CHECKOUT_RECOVERY_20261116.md). Ils ne sont pas présentés comme une nouvelle recette navigateur.

| Module | Statut | Preuve disponible | Blocage restant |
|---|---|---|---|
| Architecture | Fonctionnel et testé sur cette tranche backend | Revue indépendante, tests, SQL transactionnel | Parcours complet non validé |
| Catalogue | Bloqué | 3 produits privés, 0 actif relus en base | Qualification commerciale |
| Fournisseurs | Bloqué | Dossiers/RFQ historiques | Devis et références exploitables |
| Prix et marges | Non réalisés pour des produits vendables | Aucun coût complet annoncé | Coûts rendus et prix approuvés |
| Livraison | Bloqué | Aucune promesse de transport ajoutée | Destinations, coûts et délais confirmés |
| Panier | Développé, recette récente incomplète | Rapport checkout historique | Recette navigateur et paiement |
| Paiement | Bloqué, configuration reportée | Préflight précédent `runtime_key_missing` | Configuration sécurisée et test isolé |
| Commandes | Fonctionnel et testé en SQL synthétique | Règlement existant, nouvelle recette rollback | Achat prestataire complet |
| Fulfillment | Protection locale testée | Préparation bloquée sur signal à rapprocher | Approvisionnement et suivi réels |
| Emails | Bloqué pour exploitation complète | Aucun email déclenché ici | Prestataire et réception contrôlée |
| Administration | Lecture des incidents existante ; protection SQL testée | Incident support et refus d'expédition | Recette avec administrateur propriétaire |
| SAV | Observations testées ; remboursement complet non réalisé | Journal et incident privés | Cycle Refund et reprise prestataire |
| SEO | Non retesté sur cette tranche | Rapport précédent | Vérification du site hébergé |
| Sécurité | Contrôles bornés testés | RLS, privilèges RPC, advisors | Sécurité complète du parcours réel |
| Conformité | Bloqué | Aucune identité légale inventée | Informations du vendeur et produits qualifiés |

**Décision de lancement : BLOCKED.** Les essais SQL utilisent des événements synthétiques, sans Stripe. Aucun remboursement prestataire, réception bancaire, achat client complet ou production validé. La configuration Stripe et les étapes nécessitant les accès du propriétaire sont différées ; aucune nouvelle demande de clé n'est envoyée. La reprise doit ensuite traiter le cycle Refund, les produits/livraisons, les emails et la recette complète. La publication du site conserve son exigence d'autorisation distincte.
