# Blocages et décisions

## 16 novembre — mise à jour courante : confirmations validées en base

**GOAL IN PROGRESS ; ouverture commerciale BLOCKED.** Tranche confirmations APPROVED après revue indépendante TypeScript/SQL et correction des confirmations périmées après annulation/remboursement. Plus de blocage de quota de revue. Mode off : aucun prestataire email appelé ni remise prouvée, aucun achat Stripe ni déploiement de production. Code poussé sur master/operational-readiness : 3d7d87e1ae9105913218e5a244ffd3e9b60fceac, vérifié avec git ls-remote ; main reste à 0a4428bb5d9fcdd8ef4f31afdf4b0462aee937bc.

Migration appliquée via MCP (success=true) : 20261116051026_boreale_notification_delivery.sql, nom aligné sur la version distante, SHA-256 inchangé EF7BCF279C6D9B70C8C93C9B486C0E11E4B3D00F040536E15B7DE1AC8A7FCAE3. Recette SQL renforcée exécutée sans erreur : baux/jetons/corps figé, périmètre test, backoff, rétention, cinq tentatives, acquittement synthétique/rejeu, privilèges et incident support. Quatre comptages après rollback à zéro ; seconde requête : clients, commandes, notifications, incidents tous à zéro, zéro produit actif. Aucune concurrence entre deux connexions testée. Advisors : 19 INFO RLS sans policy sur tables privées, aucun WARN/ERROR ; protections conservées. Backend **273/273**, typecheck/lint/build exit 0 ; smoke HTTP désactivé **5/5**, externalRequests=0.

Recherche et corrections produits relues par le chef ; candidats non vendables. Les trois RFQ sont déjà autorisés. Wordans **SENT**, identifiant 1a1e2b5102560167 : aucune réception, lecture ou réponse prouvée ; ne pas renvoyer. Fuying et Haining Jinhu **non envoyés** : le contact officiel Alibaba redirige vers « Sign in or create account ». Connexion manuelle du propriétaire requise ; aucune authentification automatisée et aucune nouvelle autorisation d’envoi identique à demander. Stripe : cinq liens UNAUTHORIZED ; décisions exploitant non reçues.

| Blocage actuel | Responsable de la prochaine action | Action bornée |
|---|---|---|
| Deux RFQ Alibaba autorisés, session absente | Propriétaire : connexion manuelle ; agent : envoi ensuite | Ouvrir la session navigateur, puis envoyer exactement les deux demandes relues ; aucune authentification automatisée |
| Cinq liens Stripe UNAUTHORIZED | Accès propriétaire puis agent | Identifier le compte BORÉALE de test et valider l’intégration isolée ; aucun secret dans le chat |
| Aucun prestataire email appelé/réception vérifiée | Agent avec accès et destinataire autorisé | Valider domaine/expéditeur, tester isolément et vérifier la réception ; conserver off en attendant |
| Catalogue, approvisionnement, transport et retours non qualifiés | Agent/fournisseurs ; décisions exploitant attendues | Qualifier devis/variantes/stock/coûts/conformité ; Wordans envoyé ne vaut pas devis reçu |
| Identité légale, pays/code postal, budget, stock/direct et email admin non reçus | Propriétaire pour les décisions ; agent pour l’intégration | Finaliser les données et le compte exploitant par canal approprié |
| Fiabilité commerce encore incomplète | Agent | Idempotence checkout, remboursements atomiques/monotones, autres notifications, paniers persistants, mapping fournisseur/fulfillment et recette complète |

Résolus : revue indépendante disponible, worker confirmation développé, migration et recette SQL appliquées/exécutées. Restent non prouvées la concurrence entre deux connexions et la délivrabilité. [État complet et quinze modules](BOREALE_LAUNCH_PREPARATION_20261116.md). Les blocages ci-dessous sont historiques lorsque cette mise à jour les remplace.


## 16 novembre — exploitation de l’administration

| Origine | Impact | Responsable | Action attendue / dépendance |
|---|---|---|---|
| Compte propriétaire non configuré | Aucun accès exploitant personnel livré | Propriétaire + agent | Adresse email attendue ; mot de passe à définir uniquement dans un canal sécurisé, jamais dans le chat |
| Remboursement prestataire insuffisamment fiable | Route volontairement indisponible (503) | Agent + accès prestataire | Construire la reprise/idempotence et valider en environnement de test |
| Aucun worker d’envoi validé | File visible mais confirmations non envoyées | Agent + prestataire email | Connecter, tester et contrôler la délivrabilité sans envoi non autorisé |
| Approvisionnement/transport non confirmés | Les commandes bloquées ne peuvent avancer | Propriétaire + agent/fournisseurs | Devis, destination et mode de traitement réels ; pas de résolution artificielle de stock |

La connexion Supabase, les opérations atomiques et la révocation d’accès admin sont réalisées ; elles ne sont plus des blocages de développement. Recherche tablette corrigée, recette finale77/77 et neuf captures acceptées indépendamment ; aucun blocage restant dans la tranche locale livrée. Droits `staff` inchangés, MFA et matrice fine non validés. Limites détaillées dans [la livraison admin](BOREALE_ADMIN_ORDERS_DELIVERY.md).

## 16 novembre — liaison sourcing privée

Résolu techniquement : persistance/liaison dossiers-produits, administration privée et protections de publication, preuves dans BOREALE_SOURCING_DELIVERY.md.

Restent : devis par variante/quantité/destination, stock réel, coût livré, droits images/conformité/retours. Propriétaire : accord avant contact fournisseur, compte Alibaba approprié, destination/code postal, budget et mode de fulfillment ; identité légale et provisionnement sécurisé de son compte admin. Agent : qualification contrôlée, checkout idempotent, remboursements et transitions atomiques, worker email et durcissement admin. C: saturé ; copie D conservée pour travailler. Aucun secret demandé dans la conversation.


## 15 novembre — environnement local et dépendances restantes

- Responsive : APPROVED dans le périmètre UI anonyme preview (300/300, sept tailles). Build/lint/typecheck terminés sur D ; plus de blocage de cette recette. Preuves et limites dans BOREALE_RESPONSIVE_QA.md.
- C: saturé ; copie C conservée, copie de livraison sur D:/CodexTools/BorealeAudit-20261114/checkout. Agent responsable de la livraison GitHub depuis D ; propriétaire responsable du traitement ultérieur du disque système. Aucune suppression contournant le refus automatique des caches.
- Alibaba : trois pistes publiques, aucun devis rendu France, variante/stock/retour/conformité confirmés ; aucune marge annoncée ni produit publiable. Chef/sourcing : rechercher les preuves et préparer les devis sans envoi ; propriétaire : valider assortiment, budget et mode de fulfillment avant engagement.
- Dépendances de lancement : Stripe de test et parcours réel isolé, domaine email vérifié et réception, fournisseurs/transport/retours et identité exploitant. Les travaux techniques restants (idempotence checkout, remboursements atomiques, worker outbox, transitions admin et fulfillment) restent sous responsabilité agent, pas délégués au propriétaire.

## Mise à jour du 14 novembre

Création commande transactionnelle, confirmation de paiement durable et annulation pending sont désormais appliquées et testées sur Supabase, avec contre-vérification indépendante. Aucun blocage d’accès à la base. Les anciens paragraphes contraires décrivent les étapes antérieures.

Travaux agent prioritaires restants : intention checkout idempotente et reprise interprestataire ; remboursements atomiques et monotones ; transitions admin atomiques ; worker de notifications ; fournisseurs/offres/attributions, paniers persistants et fulfillment. L’outbox existe mais n’envoie rien. `fulfillment_status=ready` confirme seulement une allocation de stock interne. Les dépendances commerciales du tableau restent requises avant toute ouverture.

| Origine | Impact | Responsable | Action attendue | Dépendance |
|---|---|---|---|---|
| Résolu : organisation vide, premier projet autorisé puis créé et connecté | Fondation Auth/profils/catalogue réellement testée | Chef | Poursuivre transactions, modèle fournisseurs et panier persistant ; aucun autre projet nécessaire | Aucun blocage de visibilité Supabase actuel |
| Aucun produit/fournisseur confirmé par le propriétaire | Vente et marge non validables | Propriétaire + sourcing | Choisir modèle de fulfillment, budget, assortiment ; obtenir devis, échantillons, conformité, stock et droits images | Fournisseurs |
| Identité juridique et régime fiscal inconnus | Documents et TVA non finalisables | Propriétaire | Fournir identité vendeur et régime applicable via canal approprié ; aucun secret | Exploitant |
| Transport et retours non contractualisés | Délais/coûts/destinations non prouvés | Propriétaire + logistique | Confirmer origine stock, destinations, transport et adresse/procédure retours | Prestataires |
| Paiement/email non vérifiés en environnement isolé | Achat et réception emails non validés | Chef après disponibilité services | Préparer connexions sécurisées de test, aucun secret en conversation | Stripe/Resend existants à vérifier |

Les montants du seed, stocks de démonstration et shortlists historiques ne constituent pas des preuves commerciales actuelles.

## Blocages techniques sous responsabilité agent

La fondation Supabase est maintenant appliquée et sespermissions réellement testées. Restent sous responsabilitéagent : créationcommande transactionnelle, idempotence/repriseswebhooks, fournisseurs/offres/attributions, panierspersistants (abandoned_carts n’est pas un panier synchronisé), modèlesincidents/fulfillment et durcissementadmin. Ne pas qualifier la connexion initiale comme chaîneachatcomplète.

Ces défauts sont des travaux à poursuivre, pas des demandes d’action propriétaire : sitemap live paginé, drawer clavier, promo panier, transitions admin/RBAC, reprises emails et consentement, modèle incident/fulfillment. Les transactions et l’idempotence persistante nécessitent également une conception locale puis une recette DB autorisée. Ne pas considérer les échecs techniques comme résolus parce que les services externes sont absents.

## Limitation de vérification locale

Machine très saturée : timeouts5s lors des suites globales. Conserver les échecs initiaux et relances ciblées30s dans le journal QA ; ne pas les transformer en paiement réel réussi. Le chef doit lire les sorties de checks finaux avant de déclarer validation globale.
