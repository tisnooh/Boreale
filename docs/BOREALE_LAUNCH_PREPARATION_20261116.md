# Préparation finale — état courant du 16 novembre 2026

**GOAL commercial IN PROGRESS ; ouverture BLOCKED.** La tranche confirmations est approuvée après revue indépendante et validée en base. Les envois restent désactivés (`ORDER_EMAIL_MODE=off`). Aucun prestataire email appelé, aucune remise email prouvée, aucun achat Stripe ni déploiement de production. Aucun push de cette tranche à ce checkpoint. Le design est conservé.

## Résultat et preuves de la tranche

[Reçu structuré de la reprise](qa/BOREALE_LAUNCH_PREPARATION_20261116_RESULTS.json) : résultats du chef, état de la migration et limites de validation.

- Revue indépendante TypeScript/SQL **APPROVED** après correction des confirmations périmées : les états pending, cancelled, refunded et partially_refunded ne déclenchent plus de confirmation originale. Un paiement tardif réellement enregistré en paid/blocked peut recevoir le texte de vérification, sans promesse d’expédition.
- Migration appliquée au projet Supabase existant : réponse MCP `success=true`, version réelle `20261116051026_boreale_notification_delivery.sql`. Le fichier canonique a été renommé pour correspondre à l’historique distant ; SHA-256 inchangé : `EF7BCF279C6D9B70C8C93C9B486C0E11E4B3D00F040536E15B7DE1AC8A7FCAE3`. [Migration](../backend/supabase/bootstrap/migrations/20261116051026_boreale_notification_delivery.sql).
- [Recette SQL renforcée](../backend/scripts/verify-notification-claims.sql) exécutée via MCP sans erreur : périmètre exact des destinataires, reprise de bail, corps figé, refus des anciens jetons, backoff, arrêt après 23 heures ou cinq tentatives, incident support, permissions des trois fonctions, rejet d’un acquittement sans corps et acquittement synthétique valide. L’état sent/provider_message_id/sent_at est testé avec un identifiant fictif, sans appel email.
- Les quatre comptages après ROLLBACK sont à zéro : clients, commandes, notifications et incidents QA. Une seconde requête confirme ces quatre zéros et zéro produit actif. Cela ne signifie pas que le catalogue privé est vide : les trois anciens produits restent inactifs.
- Advisors Supabase : **19 INFO `rls_enabled_no_policy`** sur les tables privées, aucun WARN/ERROR. Ces protections restent en place ; aucune policy permissive n’est ajoutée pour masquer les notices.
- Backend **273/273 PASS** ; typecheck, lint et build : exit 0. Le garde checkout et ses cinq tests ont aussi été relus et reproduits indépendamment : **5/5**, service checkout mocké, aucun appel prestataire. [Smoke HTTP désactivé](../backend/scripts/verify-notifications-disabled.mjs) : **5/5**, `externalRequests=0`. Les résultats de cette reprise sont rapportés et contrôlés par le chef ; les tests simulés ne valent pas recette d’un prestataire.

## Notifications : comportement et limites

Le worker traite uniquement les confirmations. Il possède un claim atomique `SKIP LOCKED`, un bail de cinq minutes et un jeton d’appartenance ; les reprises utilisent le même corps figé et la même clé d’idempotence. La requête prestataire est bornée à dix secondes. Le contrôle SQL effectué est dans une seule session : **aucune concurrence entre deux connexions n’a été testée dans cette tranche**.

POST `/api/cron/order-notifications` exige le secret cron et une comparaison à temps constant. Mode par défaut off, mode test limité à des destinataires exacts ; aucun planning automatique ajouté. Le montant/devise et la preuve de règlement durable doivent correspondre à la commande. Les erreurs persistées sont des codes limités, sans secret ni diagnostic privé du prestataire. Les échecs terminaux ont un incident attribué au support et une prochaine action de rapprochement.

L’état `sent` signifie **accepté par le prestataire**, sans preuve de remise. Les acquittements de recette sont synthétiques. Le [prestataire documente une conservation des clés d’idempotence de 24 heures](https://resend.com/docs/dashboard/emails/idempotency-keys) ; l’implémentation borne les reprises à 23 heures et cinq tentatives, puis impose un rapprochement manuel. Aucune garantie universelle « exactement un email » n’est revendiquée. [API prestataire](https://resend.com/docs/api-reference/emails/send-email).

Les lignes receipt/admin, la facturation et les notifications expédition/remboursement ne sont pas prises en charge par ce worker. Domaine, expéditeur et accès prestataire restent à valider, puis l’agent doit réaliser une recette isolée autorisée et vérifier la réception. La migration réussie ne permet pas d’activer automatiquement les envois.

## Recherche et demandes fournisseurs

La recherche complémentaire et les corrections de revue ont été relues par le chef. [Qualification](BOREALE_PRODUCT_QUALIFICATION_20261116.md), [registre](../sourcing/qualification-20261116.json), [demandes et suivi](BOREALE_QUALIFICATION_RFQS_20261116.md). Aucun candidat n’est déclaré vendable : références/variantes, disponibilité, minimums contradictoires, devis rendu, conformité, retours et droits images restent à qualifier. Les trois anciens brouillons sont préservés ; aucune activation ni nouvel import commercial.

Les **trois demandes non engageantes sont déjà autorisées**. Wordans est **envoyé**, identifiant `1a1e2b5102560167`, label SENT : aucune réception, lecture ou réponse prouvée. Ne pas le renvoyer. Fuying et Haining Jinhu restent **non envoyés** ; le contact officiel Alibaba redirige vers « Sign in or create account ». La connexion manuelle du propriétaire est requise ; aucune authentification automatisée. Après connexion, l’agent poursuit les deux envois déjà autorisés, sans nouvelle demande d’autorisation identique. Aucun achat, paiement, réservation ou échantillon autorisé par ces demandes.

## Accès et responsabilités restantes

| Dépendance | État courant | Action / responsable |
|---|---|---|
| Supabase | Projet existant accessible ; migration et recette réelles réussies | Agent : poursuivre sur ce projet, préserver RLS et données privées |
| Revue indépendante | APPROVED pour cette tranche ; plus de blocage de quota de revue | Agent : conserver la revue pour les changements suivants |
| Stripe | Cinq liens UNAUTHORIZED ; compte BORÉALE de test non identifié | Accès sécurisé requis ; agent : identifier le compte puis provisionner/valider l’intégration de test |
| Email | Aucun appel prestataire ni réception validés ; mode off | Agent : préparer l’adaptateur et la recette ; accès/domaine/expéditeur/destinataire autorisé à confirmer |
| Fournisseurs | Un RFQ envoyé, deux autorisés non envoyés faute de session Alibaba ; aucun devis exploitable reçu | Propriétaire : connexion manuelle uniquement ; agent : achever les envois autorisés puis qualifier les réponses |
| Exploitant | Pays/code postal, budget, mode stock/direct fournisseur et email admin non reçus ; informations légales manquantes | Propriétaire : fournir ces décisions via canal approprié ; agent : finaliser leur intégration sans demander de secret dans le chat |

Les accès manquants ne transfèrent pas les développements au propriétaire. **Restent sous responsabilité agent** : intention checkout idempotente et reprise création/association de session, remboursements atomiques et monotones avec reprise prestataire, autres notifications et facturation, paniers persistants et rapprochement, mapping fournisseur/variantes et fulfillment exploitable, puis recette complète achat/refus/rupture/prix/livraison/remboursement/ownership. Le garde checkout refuse avant tout travail client/commande/prestataire si les dépendances sont absentes ; une configuration présente ne prouve pas une connexion fonctionnelle.

## Matrice courante des quinze modules

Les catégories décrivent un périmètre : fonctionnel et testé, développé non testé en réel, simulé/mocké, bloqué ou non réalisé. Aucun statut local ne vaut validation de vente ou de production.

| Module | Catégorie / décision | Preuve disponible | Travail ou limite restante |
|---|---|---|---|
| Architecture | Fonctionnel et testé en partie ; IN PROGRESS | Transactions SQL réelles et tranche notifications ci-dessus ; [livraison transactionnelle](BOREALE_TRANSACTION_DELIVERY.md) | Idempotence checkout, reprises prestataires, intégration complète |
| Catalogue | Fonctionnel et testé pour les brouillons ; commercial BLOCKED | Trois produits privés liés ; zéro actif ; [sourcing livré](BOREALE_SOURCING_DELIVERY.md) | Aucun produit qualifié, variante/stock vendable ni prix approuvé |
| Fournisseurs | Recherche développée ; connexion commandes non réalisée ; BLOCKED | Qualification relue, Wordans SENT, deux RFQ autorisés non envoyés | Réponses, devis, variantes, conformité, droits et connexion d’exécution |
| Prix et marges | Simulé/hypothétique ; BLOCKED | Observations publiques séparées des coûts confirmés dans la qualification | Coût rendu, fiscalité, frais/retours et prix approuvés |
| Livraison | Développé et simulé ; réel BLOCKED | Règles preview et observations transport documentées | Origine, destination, devis contractuel, délais et retours réels |
| Panier | Fonctionnel et testé en preview ; persistance serveur non réalisée | [Responsive 300/300](BOREALE_RESPONSIVE_QA.md), tests existants | Panier durable, rapprochement connecté, offres/stock réels |
| Paiement | Développé et mocké ; BLOCKED | Gardes/tests backend ; smoke fermé 5/5 ; cinq liens Stripe UNAUTHORIZED | Compte test, intention idempotente, parcours Stripe isolé réel |
| Commandes | Fonctionnel et testé en base ; IN PROGRESS | Création/règlement/annulation atomiques ; [recette SQL](BOREALE_TRANSACTION_DELIVERY.md) | Achat connecté de bout en bout et reprises checkout/remboursements |
| Fulfillment | Développé partiellement ; connexion fournisseur non réalisée | Allocation interne, état blocked et incidents | Attributions réelles, commande fournisseur, suivi colis et traitement incidents |
| Emails | Worker confirmation fonctionnel et testé SQL/mock ; envoi réel BLOCKED | Migration appliquée, QA rollback, suite backend 273/273 ; mode off | Deux connexions concurrentes non testées ; aucun prestataire/réception ; autres types non réalisés |
| Administration | Fonctionnel et testé localement ; APPROVED borné | [77/77 et neuf captures revues](BOREALE_ADMIN_ORDERS_DELIVERY.md), opérations SQL réelles | Compte propriétaire absent ; données navigateur simulées ; exploitation complète non prouvée |
| SAV | Développé partiellement ; circuit réel BLOCKED | Notes/incidents admin et procédures existantes | Remboursements fiables, retours, tickets/responsabilités et notifications réelles |
| SEO | Développé et testé localement ; hébergé non testé | Sitemap/build et contrôles preview historiques | Métadonnées commerciales finales, mesure/performance et consentement réels |
| Sécurité | Fonctionnel et testé dans les périmètres bornés ; IN PROGRESS | Auth/RLS historiques, RPC privées, 19 INFO et zéro WARN/ERROR advisors | Revue globale et tests interclients/production ; advisors ne remplacent pas un audit exhaustif |
| Conformité | Développé documentaire ; finalisation BLOCKED | [Dossier conformité](BOREALE_COMPLIANCE.md), exigences produit à qualifier | Identité vendeur, fiscalité, obligations produit, retours et documents finaux |

## Décision et reprise

**APPROVED pour la tranche technique confirmations et sa migration/recette en base ; BLOCKED pour ouverture commerciale.** Reprendre les développements ; achever les deux demandes fournisseurs déjà autorisées après connexion manuelle Alibaba, puis les recettes prestataires lorsque les accès sont disponibles. Aucun push de cette tranche ni déploiement de production à ce checkpoint. Ne pas clore le GOAL : achat complet, réception email, approvisionnement et exploitation restent non validés.
