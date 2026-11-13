# Blocages et décisions

| Origine | Impact | Responsable | Action attendue | Dépendance |
|---|---|---|---|---|
| Mauvais compte connecté au plugin Supabase, accès interdit par le propriétaire | Aucun test DB réel ni migration | Propriétaire | Connecter le bon compte et autoriser la recette isolée | Supabase |
| Aucun produit/fournisseur confirmé par le propriétaire | Vente et marge non validables | Propriétaire + sourcing | Choisir modèle de fulfillment, budget, assortiment ; obtenir devis, échantillons, conformité, stock et droits images | Fournisseurs |
| Identité juridique et régime fiscal inconnus | Documents et TVA non finalisables | Propriétaire | Fournir identité vendeur et régime applicable via canal approprié ; aucun secret | Exploitant |
| Transport et retours non contractualisés | Délais/coûts/destinations non prouvés | Propriétaire + logistique | Confirmer origine stock, destinations, transport et adresse/procédure retours | Prestataires |
| Paiement/email non vérifiés en environnement isolé | Achat et réception emails non validés | Chef après disponibilité services | Préparer connexions sécurisées de test, aucun secret en conversation | Stripe/Resend existants à vérifier |

Les montants du seed, stocks de démonstration et shortlists historiques ne constituent pas des preuves commerciales actuelles.

## Blocages techniques sous responsabilité agent

Ces défauts sont des travaux à poursuivre, pas des demandes d’action propriétaire : sitemap live paginé, drawer clavier, promo panier, transitions admin/RBAC, reprises emails et consentement, modèle incident/fulfillment. Les transactions et l’idempotence persistante nécessitent également une conception locale puis une recette DB autorisée. Ne pas considérer les échecs techniques comme résolus parce que les services externes sont absents.

## Limitation de vérification locale

Machine très saturée : timeouts5s lors des suites globales. Conserver les échecs initiaux et relances ciblées30s dans le journal QA ; ne pas les transformer en paiement réel réussi. Le chef doit lire les sorties de checks finaux avant de déclarer validation globale.
