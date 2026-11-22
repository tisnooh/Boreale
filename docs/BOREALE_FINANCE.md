# BORÉALE — modèle financier préparatoire

Date : 2026-11-13. Auteur : mission AGENT 05. Décision d’acceptation réservée au chef et au contrôle indépendant.

**Aucune rentabilité réelle n’est démontrée.** Aucun produit vendable n’a actuellement de coût complet confirmé dans les pièces examinées. Les scénarios ci-dessous sont des exercices arithmétiques hypothétiques, pas des prévisions de ventes ni des recommandations de prix.

Skill appliqué : `ecommerce-business-plan`, lu intégralement. Le modèle est adapté au site Next.js existant, sans hypothèse de migration Shopify, de mode de fulfillment ou de régime fiscal.

## Sources et constats locaux

- `sourcing/supplier-comparison.csv` contient des colonnes de coût EXW, transport, droits, coût rendu et prix HT. Les lignes examinées sont incomplètes ; les cibles de coût ne sont pas des devis. Aucun montant de ce fichier n’est repris comme coût confirmé dans ce modèle.
- `docs/PRODUCT_RESEARCH.md`, section « Méthode & honnêteté », présente des fourchettes fournisseurs estimées, hors transport et droits, ainsi que des marges avant frais. Le taux de paiement évoqué est historique et non vérifié : il ne doit pas être traité comme le contrat applicable à BORÉALE.
- `backend/src/services/pricing.ts` recalcule produits, remise et port en centimes. Sa grille de port (4,90 €, gratuité dès 69 €, express 9,90 €) est explicitement à confirmer par le propriétaire. Ces montants facturés au client ne sont pas les coûts transporteur.
- Le calcul de panier n’établit ni TVA collectée, ni coût complet, ni marge contributive. Aucun système de comptabilité analytique vérifié n’a été trouvé dans les services examinés. Des prix catalogue ne suffisent pas à annoncer une marge.

## Formules et conventions

Tous les calculs doivent être conservés en centimes, avec la monnaie et la date de conversion quand nécessaire. Les arrondis de présentation ne doivent pas remplacer les valeurs sources.

`CA net des taxes collectées = recettes produits après promotions + port facturé − remboursements de recettes − taxes effectivement collectées correspondantes`.

Les recettes remboursées et les coûts de retour sont deux éléments différents. Ne pas comptabiliser deux fois une perte de chiffre d’affaires dans une provision de retour.

`Coûts variables = achat rendu imputable + préparation/emballage + expédition réelle + commissions de paiement non récupérées + coûts nets de retours/incidents + acquisition imputable + autres frais variables`.

Le coût d’achat rendu comprend les frais fournisseur, transport amont, droits et taxes non récupérables imputables, répartis sur les unités réellement exploitables. Les taxes récupérables ne sont pas une charge de marge, mais leur avance peut être un besoin de trésorerie. Aucune récupérabilité ni aucun taux ne sont supposés ici ; ils doivent être confirmés selon le régime réel.

`Marge contributive = CA net des taxes collectées − coûts variables`.

`Taux de marge sur vente = marge contributive / CA net des taxes collectées × 100`, uniquement si ce CA est strictement positif.

`Contribution mensuelle après frais fixes = nombre de commandes × marge contributive moyenne − frais fixes`. Ce n’est pas un bénéfice net comptable : rémunérations, cotisations, impôts, amortissements et autres postes doivent être intégrés selon leur nature réelle.

`Seuil commandes = plafond(frais fixes / marge contributive moyenne)`, uniquement si la marge est positive ; sinon augmenter le volume ne produit pas de seuil rentable.

`CAC maximal sans contribution aux frais fixes = CA net − variables hors acquisition`. Pour couvrir les frais fixes au volume envisagé : retrancher `frais fixes / nombre de commandes`. Pour conserver un résultat cible, retrancher aussi `résultat cible / nombre de commandes`. Une valeur négative signifie qu’un CAC nul ne suffit pas au volume étudié.

Pour une promotion, recalculer recettes nettes, taxes, frais proportionnels, panier après remise, gratuité éventuelle du port et contribution. La baisse du prix ne réduit pas automatiquement le prix d’achat ni le transport.

## Trois scénarios entièrement hypothétiques

Les libellés « réaliste » et « optimiste » servent seulement à distinguer les cases du modèle. Aucun de ces volumes, paniers, tarifs ou coûts n’est observé chez BORÉALE. Unité : euro par commande, sauf mention mensuelle. Le CA inclut le port facturé, est déjà net des remboursements de recettes attendus et des taxes collectées ; aucun taux fiscal n’est choisi.

| Hypothèse / calcul | Pessimiste | Réaliste (hypothèse centrale) | Optimiste |
|---|---:|---:|---:|
| Commandes par mois (hypothèse) | 30 | 100 | 250 |
| CA net des taxes / commande (hypothèse) | 35,00 | 40,00 | 45,00 |
| Achat rendu (hypothèse) | 16,00 | 14,00 | 13,00 |
| Préparation/expédition (hypothèse) | 7,00 | 6,00 | 5,00 |
| Frais de paiement (hypothèse forfaitaire, pas un tarif Stripe) | 1,00 | 1,00 | 1,00 |
| Emballage (hypothèse) | 1,00 | 1,00 | 1,00 |
| Coûts nets de retours/incidents hors recettes déjà remboursées (hypothèse) | 3,00 | 2,00 | 1,50 |
| CAC moyen imputé (hypothèse) | 10,00 | 8,00 | 6,00 |
| Total variables calculé | 38,00 | 32,00 | 27,50 |
| Marge contributive calculée | −3,00 | 8,00 | 17,50 |
| Taux calculé | −8,57 % | 20,00 % | 38,89 % |
| Frais fixes mensuels (hypothèse) | 300,00 | 300,00 | 300,00 |
| Contribution mensuelle après ces seuls frais fixes | −390,00 | 500,00 | 4 075,00 |
| Seuil commandes calculé | Aucun avec cette marge | 38 | 18 |
| CAC maximal avant frais fixes, résultat unitaire nul | 7,00 | 16,00 | 23,50 |
| CAC maximal couvrant les fixes au volume hypothétique, résultat nul | −3,00 (impossible) | 13,00 | 22,30 |

Contrôle de calcul indépendant à reproduire : scénario central `40 − (14+6+1+1+2+8) = 8`; `8/40 = 20 %`; `100×8−300 = 500`; `plafond(300/8)=38`. À 37 commandes : −4 € ; à 38 : +4 €, sous ces seules hypothèses.

Les frais fixes réels à documenter : hébergement, domaine, logiciels, comptabilité, assurance, éventuel stockage minimum, rémunération et autres engagements. Leur nature fixe ou variable dépend du contrat ; aucun abonnement n’est supposé activé.

## Trésorerie et calendrier des flux

Suivre séparément, par jour : date d’encaissement client, date de disponibilité bancaire nette prestataire, retenues/réserves, acompte et solde fournisseur, transport/droits, coûts publicitaires éventuels, remboursements, échéances fiscales et frais fixes. Un paiement client confirmé ne signifie pas que la somme est déjà disponible pour payer le fournisseur.

`Besoin de trésorerie maximal = maximum dans le temps de (décaissements cumulés − encaissements réellement disponibles cumulés)`, auquel ajouter le coussin de sécurité décidé. Ajouter les investissements/initiaux, stock, taxes avancées et réserves sans les compter deux fois dans le calendrier.

Exemple de stress **hypothétique**, sans stock initial ni investissement : 100 commandes uniformes sur 30 jours, 30 € de décaissements variables immédiats par commande (variables centrales 32 € moins provision non immédiatement décaissée de 2 €), fonds clients disponibles 7 jours après ces sorties, fixes à financer 300 €, réserve incidents additionnelle 200 €. Pont de liquidité simplifié : `(100/30)×30×7 + 300 + 200 = 1 200 €`. Ce montant n’est pas le budget nécessaire à BORÉALE : saisonnalité, délais fournisseur, acompte/MOQ, stock, TVA, retenues du prestataire et variation des ventes ne sont pas connus. Pour un modèle avec stock acheté avant vente, remplacer ce raccourci par un calendrier d’achat/vente réel.

## Données nécessaires avant validation commerciale

1. Par variante : devis daté, devise, Incoterm, MOQ, coût exact, disponibilité, transport amont, droits/taxes non récupérables, emballage, quantité exploitable, preuve de conformité et droits photos.
2. Par destination et panier : tarif transporteur confirmé, préparation, surcharges, colis multiples, retours, pertes et personne qui supporte chaque coût.
3. Régime fiscal applicable, modalités de facturation et récupérabilité des taxes à confirmer avec les sources officielles et le conseil compétent ; pas de calcul fiscal définitif à partir des valeurs du seed.
4. Contrat prestataire de paiement : commissions selon moyens/cartes/devises, remboursements et litiges, délais de versement et réserves. Ne demander aucune clé secrète en conversation.
5. Budget disponible, assortiment, modèle stock/logistique, frais fixes réels, objectif de contribution et tolérance de trésorerie validés par le propriétaire.
6. Mesures réelles, lorsque disponibles : CA net, coût d’acquisition total y compris création/prestations imputables, taux de retour, coût des incidents et délai encaissement/décaissement. Aucun indicateur actuel n’est inventé.

Prochaine action : compléter les preuves par variante, recalculer les scénarios avec les valeurs vérifiées, puis faire contrôler les résultats par le chef et l’auditeur. Tant que ces données manquent, statut commercial **BLOCKED**, calculs d’exemple seulement.
