# BORÉALE — modèle financier hors ligne

Outil `backend/scripts/calculate-unit-economics.mjs`, sans dépendance et sans écriture commerciale. Aucun prix d'achat, stock, coût transport ou prix de vente BORÉALE n'est fourni par défaut. Le modèle ne qualifie aucun produit et ne recommande aucun prix public.

## Utilisation

`node backend/scripts/calculate-unit-economics.mjs chemin/entrees.json`

Le JSON exige `currency: "EUR"` et `scenarios` contenant `pessimistic`, `realistic`, `optimistic`. Chaque scénario renseigne tous les champs exportés dans `requiredFields`. Chaque champ est un objet `{ "value": 0, "status": "assumption", "source": "justification explicite de cette hypothèse" }`. Zéro est autorisé uniquement s'il est explicitement renseigné et sourcé. `confirmed` est une déclaration du rédacteur, pas une vérification automatique de la preuve. Les entrées sont conservées dans le résultat pour révision.

Les montants sont en centimes entiers, les taux en points de base (10000 = 100 %), les délais en jours entiers. Les coûts `Net` doivent intégrer les taxes non récupérables et exclure seulement les taxes effectivement récupérables. Le taux TVA unique, son applicabilité et le traitement fiscal doivent être validés par le propriétaire ; zéro n'est jamais choisi automatiquement. Des régimes ou taux mixtes nécessitent un calcul adapté avant exploitation.

Champs : prix TTC, livraison facturée TTC, réduction TTC, taux TVA ; achat, transport entrant, droits, livraison sortante, traitement, emballage et autres coûts variables ; frais paiement proportionnels et fixes ; acquisition ; taux de retour, remboursement TTC par retour, frais de traitement et coût d'inventaire récupérable par retour ; frais fixes mensuels, nombre de commandes, délai d'encaissement et de paiement fournisseur, trésorerie initiale d'inventaire.

## Calculs et limites

- CA net = (montant encaissé TTC − remboursement TTC attendu) / (1 + taux TVA).
- Coûts variables = coûts de base + frais de paiement sur l'encaissement initial + acquisition + traitement attendu des retours − valeur d'inventaire récupérable attendue.
- Marge contributive = CA net − coûts variables ; taux sur vente = marge / CA net. Les frais fixes sont séparés.
- Seuil mensuel = arrondi supérieur des frais fixes / marge unitaire positive ; sans marge positive, aucun seuil fini n'est annoncé.
- CAC maximal à contribution nulle = contribution avant acquisition, bornée à zéro. Ce n'est pas un budget publicitaire recommandé ni un seuil incluant tous les frais fixes.
- Trésorerie indicative = inventaire initial + coûts variables décaissables × commandes/30 × délai de financement positif + un mois de frais fixes. Le crédit économique d'inventaire récupéré ne réduit pas le décaissement estimé. Ce calcul simplifié n'est pas un échéancier bancaire ni une prévision des paiements fiscaux.

Tout champ absent, invalide, sans provenance, ou scénario absent retourne `BLOCKED` et aucun résultat chiffré. Des hypothèses présentes donnent `PROVISIONAL`. Les moyennes attendues peuvent avoir des fractions de centime : elles ne servent pas à créer une facture ou à encaisser un paiement.

## État réel

Les données rendues, les frais contractuels, le régime fiscal, les retours et le modèle logistique des candidats BORÉALE restent à confirmer. **Marges vérifiées de produits vendables : aucune calculée par cet outil.** Trois scénarios chiffrés de boutique restent bloqués tant que leurs entrées n'existent pas ; aucun résultat synthétique des tests ne constitue un prévisionnel commercial.

Validation ciblée : `node --test backend/scripts/calculate-unit-economics.test.mjs`. Les tests utilisent des montants synthétiques explicitement marqués. Revue indépendante et décision finale du chef requises ; l'auteur ne s'auto-approuve pas.
