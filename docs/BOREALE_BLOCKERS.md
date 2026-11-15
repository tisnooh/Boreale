# Blocages et décisions

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
