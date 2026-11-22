# BORÉALE — reprise durable du checkout, 16 novembre 2026

## 17 novembre — checkpoint local, parcours client non validé

**Code et SQL revus ; ouverture commerciale BLOCKED.** Les 351 tests backend et 165 tests frontend passent. Builds backend et frontend webpack réussis (34 pages générées côté frontend). Lint backend : zéro erreur/avertissement ; frontend global : zéro erreur et 27 avertissements existants, dont deux dans les fichiers ciblés. La recette SQL est exécutée et nettoyée ; les deux connexions observées sont en série, sans preuve de concurrence.

Le contrôle navigateur ne valide pas encore la confirmation : navigation DOMContentLoaded expirée à 30 s, puis titre attendu non observé à 60 s. Le formulaire preview à 320 px a passé ses trois premiers contrôles. Deux probes indépendants ont reçu le document et des ressources HTTP 200, mais aucun appel API ; DOM/body et capture sont devenus inaccessibles. Aucune erreur métier, CORS ou boucle applicative n’est démontrée par ces traces. Mesure Windows : 3,39 Go de RAM, environ 0,02 Go libres. **UI BLOCKED ; aucun parcours d’achat complet revendiqué.** Le harness instrumenté distingue maintenant disponibilité DOM et assertions métier ; il est relu et passe le contrôle de syntaxe, mais n’est pas relancé sous cette contrainte.

La clé serveur Stripe test et le secret webhook restent absents du fichier privé préparé ; la demande de saisie sécurisée est en attente. Le plugin est connecté au compte isolé choisi, ce qui ne configure pas les secrets du site. Les produits restent non vendables et la livraison non qualifiée. Les remboursements, autres notifications et opérations fournisseur restent à terminer par l’agent. Aucun achat réel, email client envoyé ou déploiement du site en production.

Le travail reste en checkpoint local : aucun push de cette nouvelle tranche avant validation UI. Après disponibilité de la clé et des ressources navigateur, l’agent reprend la recette, corrige tout échec réel et livre les preuves. Les applications tierces dont le travail en cours est inconnu ne sont pas arrêtées automatiquement. [Reçu structuré](qa/BOREALE_CHECKOUT_RECOVERY_20261116_RESULTS.json). Les états plus anciens ci-dessous sont historiques.


**GOAL commercial IN PROGRESS ; ouverture BLOCKED.** La tranche checkout est APPROVED après revue indépendante du code/SQL et corrections. La migration est appliquée et sa recette SQL isolée réussie. Aucun achat Stripe complet, paiement réel, email remis ou déploiement de production n’est validé par cette tranche. Le design est conservé ; aucun push effectué par la mission documentaire.

## Changements et périmètre accepté

Le navigateur conserve une clé opaque et une empreinte de la tentative. La requête porte idempotencyKey et customerMode guest/customer. Le backend vérifie l’identité attendue avant les effets ; une session client invalide ne devient pas une commande invitée. L’email ne prouve pas la propriété. L’intention existante est recherchée avant toute nouvelle tarification ; même clé et requête normalisée reprennent le même snapshot, et un contenu différent est refusé.

Préparation transactionnelle : contact/adresse lorsque permis, commande, lignes et intention sont créés ensemble. Le contact existant n’est ni transféré ni réécrit par égalité d’email ; l’ordre porte l’acteur authentifié. Paramètres Stripe complets et clé prestataire sont figés avant appel. Un bail borne le travail concurrent ; les reprises sont limitées à cinq tentatives et 23 heures. L’association intention/session/commande/paiement est atomique et ne régresse pas un paiement succeeded/refunded. Les RPC sont security invoker, privées au service_role ; RLS et refus anon/authenticated conservés. RPC absente ou acquittement incertain : échec fermé, aucun fallback vers des écritures séquentielles.

Le compte et le mode Stripe attendus sont figés dans les métadonnées et vérifiés avant les opérations prestataire. Une session déjà associée est récupérée chez Stripe avant de rendre une URL HTTPS checkout.stripe.com. Une session complete ne déclenche aucun nouveau paiement. Une expiration explicitement vérifiée renvoie un code distinct ; le navigateur conserve cette preuve après rechargement et propose une action explicite de nouvelle tentative. Aucun changement automatique de clé après timeout, erreur de stockage ou résultat incertain.

Les événements précoces passent par une récupération Stripe et des vérifications compte/mode/intent/commande/montant/devise, puis une association atomique avant règlement ou annulation. Les anciennes commandes associées par stripe_session_id conservent leur chemin de webhook. La page succès distingue l’état Stripe du règlement durable en base : une redirection ne prouve pas à elle seule une commande confirmée.

Deux HIGH de revue corrigés : suppression totale du pipeline séquentiel réservé aux tests ; les anciens tests utilisent le même service durable. L’action de nouvelle tentative après expiration reste explicite et peut être restaurée après rechargement. **Verdict indépendant APPROVED pour le code/SQL statique après corrections** ; application/recette ensuite exécutées par le chef.

## Choix de durée et reprise support

**Choix explicite : expiration Stripe par défaut de 24 heures, fenêtre de création/reprise automatique de 23 heures.** Aucun expires_at recalculé ne modifie le corps d’un POST rejoué. Une nouvelle intention recalcule les prix, remises et disponibilités ; une intention reprise honore son snapshot initial. Ce choix de validité du devis doit être confirmé dans les conditions commerciales avant ouverture. Le snapshot n’est ni une réservation fournisseur ni une garantie de stock : le règlement conserve les incidents/ruptures sans promettre une expédition.

Après cinq tentatives, échéance dépassée ou résultat prestataire incertain non rapprochable, un incident support durable exige un rapprochement. Un panier, contact ou compte modifié avant preuve d’expiration ne peut pas démarrer automatiquement une autre intention : **reprise avec les mêmes informations ou support uniquement**. Une session complete n’autorise pas une remise à zéro. Aucune garantie universelle « exactement un paiement » ni recette commerciale complète n’est revendiquée.

## Preuves collectées

| Contrôle | Résultat confirmé par le chef | Limite |
|---|---|---|
| Migration | MCP success ; version réelle 20261116142245_boreale_checkout_intent.sql | Même projet existant, aucun nouveau projet |
| Intégrité du fichier | SHA-256 EE9C2C93CDAB8FE8F97CE9C17B135C952F179880D8AE5F10AE827D67BCC8CB9B ; renommage aligné sur l’historique distant sans changement de contenu | [Migration canonique](../backend/supabase/bootstrap/migrations/20261116142245_boreale_checkout_intent.sql) |
| Recette SQL | Script renforcé exécuté via MCP sans erreur ; huit comptages après ROLLBACK à zéro | Sessions Stripe et deux identités Auth synthétiques ; aucun email/login/paiement prestataire |
| Seconde vérification | Commandes, intentions, paiements, clients et identités Auth QA : zéro ; trois produits privés, zéro actif | Aucune fixture commerciale conservée |
| Backend global | 351/351 PASS ; typecheck exit 0 ; lint 92 fichiers, zéro erreur et zéro warning ; build exit 0 | Tests prestataire simulés, pas un achat Stripe |
| Frontend ciblé et global | Ciblé 51/51 ; suite globale fraîche 165/165, zéro échec, succès confirmé ; typecheck exit 0 ; lint sans erreur, deux warnings existants | Build webpack final réussi : exit 0 et 34 pages générées ; build standard interrompu après compilation/typecheck, non déclaré terminé |
| Revue indépendante | APPROVED statique TypeScript/SQL après corrections des deux HIGH | Ne remplace pas une recette prestataire ou navigateur connecté |
| Deux connexions SQL, exécution en série | Même intention/commande ; comptages : une intention, une commande, une ligne, zéro produit actif ; nettoyage finally complet, cinq comptages à zéro | **Idempotence sur deux connexions en série PASS ; concurrence INCONCLUSIVE**, intervalles non chevauchants |

Le [script SQL](../backend/scripts/verify-checkout-intents.sql) contrôle notamment le rejeu sans double commande/adresse, le corps figé, les anciens jetons, le bind atomique, le refus d’un montant divergent, la conservation d’un état refunded, le rollback tardif, les cinq tentatives et l’échéance, les privilèges et l’incident support. Deux identités Auth de recette vérifient les portées guest/acteur1/acteur2, la propriété des commandes et l’absence de transfert du contact/address book d’un autre acteur. Les huit compteurs finaux concernent clients, commandes, produits, variantes, intentions, paiements, Auth et profils.

Deux connexions PostgreSQL réelles ont été observées : PID 302826 du 16 novembre à 14:36:53.066356Z jusqu’à 14:36:57.120378Z ; PID 302850 de 14:37:15.998238Z à 14:37:16.007883Z. Toutes deux retrouvent l’intention bb43a543-8e01-4585-b779-b124dcb596e9 et la commande ae595f9c-bb90-4815-9799-3b5e13cdcbf2. Le dispatch MCP observé n’a pas produit de chevauchement : ce résultat ne prouve ni contention de verrou ni course simultanée. [Script relu indépendamment avant appel](../backend/scripts/verify-checkout-concurrency.sql). Après finally : produits, variantes, commandes, clients et intentions QA tous à zéro. Les métriques de cette recette sont distinctes des huit comptages du script transactionnel précédent.

Sources de code : [checkout](../backend/src/services/checkout.ts), [intentions](../backend/src/services/checkout-intents.ts), [repository](../backend/src/repositories/checkout-intents.ts), [récupération webhook](../backend/src/services/checkout-recovery.ts), [vérification succès](../backend/src/services/checkout-verification.ts), [garde Stripe](../backend/src/lib/stripe-environment.ts), [reprise navigateur](../frontend/lib/checkout-attempt.ts). Les tests de service/repository/prestataire utilisent des dépendances simulées ; aucune donnée secrète n’est requise dans le rapport.

## Accès actuels et dépendances externes

| Service | État réellement constaté | Prochaine action |
|---|---|---|
| Stripe | Compte choisi par l’utilisateur désormais accessible : acct_1Uc6bxGLTNMkV9aW, environnement BORÉALE isolé, livemode=false ; liste des webhooks lue vide | L’ancien blocage « cinq liens UNAUTHORIZED » est historique ; agent : connecter la configuration serveur sécurisée, créer/vérifier le webhook de test lorsque le point d’entrée existe, puis recette isolée |
| Configuration locale | Vérification de l’environnement local existant : clé Stripe, secret webhook et clé email absents. Fichier privé backend/.env.stripe.local préparé et ignoré Git, sans clé écrite | Demande asynchrone de configuration sécurisée déjà adressée à l’utilisateur ; réponse non reçue. Aucun secret à copier dans les documents/chat |
| Vercel | Une équipe accessible ; deux lectures des périmètres personnel/équipe n’ont pas montré de projet lié au dépôt BORÉALE | Agent : identifier ou préparer le rattachement autorisé et le point d’entrée de test ; aucune production existante ou déployée déduite de ces lectures |
| Fournisseurs | Aucun candidat vendable. Wordans : un envoi SENT, sans réponse/réception prouvée ; Fuying et Haining Jinhu non envoyés, session Alibaba absente | Les trois RFQ sont déjà autorisés : après connexion manuelle Alibaba, agent envoie les deux restants puis qualifie les réponses ; ne pas renvoyer Wordans |
| Exploitant | Destination/pays/code postal, budget, modèle stock/direct, email admin et informations légales non reçus | Propriétaire : fournir les décisions et accès qui dépendent de lui ; agent : intégrer et finaliser les développements, sans transfert de charge technique |

## Matrice courante des quinze modules

Catégories : fonctionnel et testé dans le périmètre prouvé ; développé non testé en réel ; simulé/mocké ; bloqué ; non réalisé. Les validations techniques ne valent pas validation de vente.

| Module | Catégorie / décision | Preuve | Travail ou limite restante |
|---|---|---|---|
| Architecture | Fonctionnel et testé en base ; IN PROGRESS | Intention durable et transactions, QA SQL rollback, backend 351/351 | Idempotence deux connexions en série prouvée ; concurrence INCONCLUSIVE ; parcours prestataires complet |
| Catalogue | Fonctionnel pour les brouillons ; vente BLOCKED | Trois produits privés, zéro actif ; [sourcing](BOREALE_SOURCING_DELIVERY.md) | Aucun candidat/variante/stock qualifié vendable |
| Fournisseurs | Recherche développée ; connexion commandes non réalisée ; BLOCKED | Qualification relue, Wordans SENT, deux RFQ autorisés bloqués sur session | Réponses, devis, disponibilité, conformité, droits images et exécution fournisseur |
| Prix et marges | Hypothèses/simulation ; BLOCKED | Snapshots checkout et calcul serveur testés ; recherche commerciale séparée | Coût rendu, fiscalité, retours/frais, prix approuvés et politique de validité du devis |
| Livraison | Développé et simulé ; réel BLOCKED | Grille preview et observations fournisseur documentées | Destination, origine stock, tarifs/délais contractuels et retours réels |
| Panier | Fonctionnel et testé en preview ; persistance serveur non réalisée | Responsive historique et reprise checkout ciblée | Paniers durables/connectés, rapprochement et catalogue réel |
| Paiement | Développé/mocké ; accès test résolu ; achat complet BLOCKED | Compte isolé identifié, garde compte/mode, backend 351/351 | Configuration clé/whsec absente, point d’entrée/webhook et achat sandbox à recetter |
| Commandes | Fonctionnel et testé en base ; IN PROGRESS | Intention/commande/lignes atomiques, bind/paiement et règlement durables | Achat connecté bout en bout et remboursements fiables |
| Fulfillment | Développé partiellement ; connexion non réalisée | Allocation interne, blocked et incidents | Mapping fournisseur/variantes, commande fournisseur, suivi colis et incidents réels |
| Emails | Confirmation testée SQL/mock ; envoi réel BLOCKED | [Tranche confirmations](BOREALE_LAUNCH_PREPARATION_20261116.md), mode off | Domaine/expéditeur/prestataire/réception ; autres notifications/facturation à faire |
| Administration | Fonctionnel et testé localement ; APPROVED borné | [Recette 77/77 et captures](BOREALE_ADMIN_ORDERS_DELIVERY.md) | Compte propriétaire et exploitation avec données réelles non livrés |
| SAV | Développé partiellement ; réel BLOCKED | Notes/incidents support et procédures existantes | Remboursements atomiques/monotones et reprise prestataire, retours/tickets/notifications |
| SEO | Développé et testé localement ; hébergé non testé | Sitemap et builds/preview historiques | Données commerciales finales, mesure/performance et consentement réels |
| Sécurité | Fonctionnel et testé par périmètres ; IN PROGRESS | RPC privées/RLS, acteur et non-transfert, garde Stripe compte/mode | Audit global, recette interclients connectée et environnement hébergé |
| Conformité | Préparation documentaire ; BLOCKED | [Dossier conformité](BOREALE_COMPLIANCE.md) et qualification produit | Identité vendeur/fiscalité, obligations produit, retours et documents finaux |

## Décision et suite sous responsabilité agent

APPROVED pour cette tranche technique et sa recette en base ; **GOAL ouvert, lancement BLOCKED**. La compilation frontend est terminée ; la concurrence réelle reste une preuve manquante, puis prépare le point d’entrée/configuration Stripe de test dès disponibilité de l’accès sécurisé. Aucun paiement réel ni production. Il conserve les remboursements fiables, les autres notifications/facturation, le fulfillment et les paniers persistants, la qualification fournisseurs et la recette complète achat/refus/rupture/prix/livraison/remboursement/ownership. Les accès et décisions manquants ne transfèrent pas ces développements au propriétaire.
