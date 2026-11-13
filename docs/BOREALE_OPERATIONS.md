# BORÉALE — exploitation et fulfillment

État au 2026-11-13 : **BLOCKED pour exploitation réelle**. Procédure proposée, non exécutée sur une commande réelle. Skill `ecommerce-shipping-rates` lu ; aucun tarif, transporteur contractuel, destination, fournisseur ou délai validé par cette procédure. Aucun service externe contacté, aucune base consultée ou modifiée.

## Preuves disponibles et limites

- `backend/src/services/orders.ts` définit les statuts `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `partially_refunded`, `refunded`, les transitions et les snapshots retournés au client.
- `backend/src/controllers/admin.ts`, `setOrderStatus`, permet la mise à jour manuelle du statut, du transporteur, du numéro et de l’URL, puis l’ajout d’un événement. L’email d’expédition est optionnel et son échec est absorbé. L’absence d’erreur HTTP ne prouve donc pas sa réception.
- Le même contrôleur peut passer `pending` à `paid` via les transitions communes sans vérification du prestataire dans cette action. Ne jamais utiliser cette action comme preuve d’encaissement. Il peut marquer `shipped` sans exiger un suivi : la procédure doit exiger les preuves avant action, et un garde serveur reste nécessaire.
- `backend/supabase/migrations/0001_schema.sql`, tables `orders`, `order_items`, `payments`, `order_events` : snapshots de prix/adresse et historique existants ; un seul triplet de suivi par commande. Aucune association fournisseur, commande fournisseur, responsable, prochaine action, incident, retour ou multi-colis structuré n’est démontrée.
- Les tarifs dans `backend/src/services/pricing.ts` et `frontend/lib/constants.ts` sont des paramètres de conception. Aucun contrat transport ou devis daté n’établit ici leur coût réel ou leur disponibilité.

## Registre contrôlé à préparer

Avant toute vente, désigner une personne responsable de l’exploitation et son suppléant. Le registre doit être dans un espace approuvé, à accès nominatif restreint, avec sauvegarde et historique ; aucun fichier client public dans Git, aucune donnée de carte. Sa création et son environnement restent à décider. Ce document est un contrat de données, pas un outil déjà connecté à l’admin.

| Objet | Identifiant et informations obligatoires |
|---|---|
| Offre fournisseur | ID offre/version, UUID variante interne, SKU interne, entreprise fournisseur, référence fournisseur exacte, options exactes, URL/source, date de vérification, devise, prix d’achat, MOQ, Incoterm, disponibilité datée, preuve qualité/conformité et droits image, destinations desservies, frais et délais, conditions de retour |
| Attribution | ID attribution, ID commande et ligne, version d’offre choisie, quantité, responsable, état, prochaine action, échéance, preuve et date de mise à jour |
| Achat fournisseur | ID dossier interne, référence fournisseur, quantités par ligne, coût complet/devise, autorisation d’achat, accusé, date promise, référence facture ; aucun achat payé sans autorisation |
| Colis | ID colis distinct, commande, lignes/quantités transportées, origine, transporteur, service, numéro et URL officiels, date de prise en charge prouvée, statut transporteur, preuve de livraison |
| Incident | ID incident, commande/ligne/colis, type, gravité, propriétaire, échéance, prochaine action, preuves, décisions et résolution |
| Retour/remboursement | ID dossier, lignes/quantités, motif, date de demande, recevabilité à examiner, instructions autorisées, suivi retour, réception/inspection, décision, montant, référence remboursement prestataire, statut confirmé |

Les valeurs historiques sont figées par version. Une mise à jour du prix ou de l’offre fournisseur ne doit jamais réécrire une commande passée. L’équivalence de variante exige un contrôle explicite : matière, dimensions, couleur, taille, accessoires et conformité ; aucune substitution automatique.

## Cycle quotidien d’une commande payée

1. **Rapprocher le paiement.** Vérifier dans l’environnement autorisé la commande, son total/devise, son identifiant prestataire et le paiement confirmé. Un retour navigateur ou un statut saisi manuellement ne suffit pas. Isoler tout paiement sans commande et toute commande sans lignes dans un incident ; interdire l’expédition jusqu’au rapprochement.
2. **Attribuer.** Créer une attribution pour chaque ligne avec une offre et une variante exactes, une disponibilité récente, un responsable, une prochaine action et une échéance. Si une preuve manque, bloquer l’achat, ouvrir un incident et faire décider l’exploitant ; ne pas remplacer silencieusement le produit.
3. **Préparer l’approvisionnement.** Selon le modèle réellement retenu : réserver le stock détenu, transmettre un dossier à un logisticien contractuel, ou préparer l’achat au fournisseur. Sans connexion, tenir un dossier manuel unique par attribution pour éviter les doubles achats. Préparer n’autorise pas un paiement fournisseur ni un message externe dans cette mission.
4. **Enregistrer l’engagement.** Après autorisation adéquate, conserver référence fournisseur, accusé, quantités, coût constaté et date promise. Un défaut d’accusé reste une action en attente, jamais « expédié ».
5. **Expédier sur preuve.** Vérifier colis, adresse desservie, lignes/quantités et prise en charge transporteur. Enregistrer le suivi officiel puis marquer expédié et contrôler le résultat d’envoi de la notification. Ne pas inventer de suivi ni annoncer un départ au seul motif qu’une étiquette existe.
6. **Suivre et clôturer.** Contrôler l’état transporteur jusqu’à preuve de livraison. Une date promise dépassée ouvre un incident ; une commande n’est livrée que sur preuve compatible avec la situation du client. Conserver les références de preuve et la date de décision.

## Multi-colis et livraison partielle

Créer une entrée par colis avec la répartition de lignes et de quantités. La somme des quantités expédiées ne dépasse jamais les quantités commandées, diminuées des annulations traitées. Le schéma actuel n’expose qu’un suivi ; **ne pas écraser successivement ce champ avec plusieurs colis ni présenter la commande comme entièrement expédiée/livrée après le premier colis**. Les ventes nécessitant plusieurs colis restent bloquées jusqu’à un registre contrôlé et une communication client complète, puis une prise en charge applicative testée. Aucun multicolis intégré n’est revendiqué.

## Incidents, retours et remboursements

- **Indisponible après paiement :** arrêter l’approvisionnement, conserver le paiement et la commande en rapprochement, attribuer l’incident ; faire approuver solution ou remboursement sans substitution non vérifiée.
- **Retard :** enregistrer date promise, dernier événement et demande d’enquête préparée ; responsable et échéance de relance obligatoires. Aucun délai universel n’est inventé ici.
- **Perdu/non livré :** conserver preuve de prise en charge et réponse transporteur ; examiner l’issue client avec l’exploitant. Ne pas clôturer sur une simple étiquette « livré » contestée.
- **Retour :** ne pas donner d’adresse fournisseur sans accord ; confirmer l’adresse réellement disponible, les conditions applicables et la traçabilité des lignes. Séparer la décision commerciale/légale, la réception et le mouvement de stock.
- **Remboursement :** distinguer « demandé au prestataire » de « confirmé ». Contrôler le cumul remboursé, les quantités et les frais ; rattacher la référence prestataire. Une annulation n’est pas une preuve de remboursement et un remboursement n’est pas une preuve de stock remis en vente.

## Rapprochement quotidien obligatoire avant exploitation

Filtrer et attribuer : paiements sans commande ; commandes payées sans lignes/attribution ; achats sans accusé ; attributions sans responsable ou prochaine action ; quantités différentes entre commande, fournisseur et colis ; colis sans événement ou hors date promise ; notifications échouées ; retours ouverts sans échéance ; remboursements demandés non confirmés ; stocks restaurés sans preuve de retour. Le responsable tient une liste des écarts jusqu’à résolution. Ces vues ne sont pas encore implémentées dans le tableau de bord.

## Recette locale préparatoire

Avec identifiants fictifs marqués **SIMULATION**, sans coordonnées réelles ni fournisseur contacté : dérouler une commande à deux lignes, une indisponibilité, un paiement inconnu, deux colis, un retard, un retour partiel et un remboursement. Contrôler pour chaque étape identifiant stable, quantités réconciliées, responsable, prochaine action, échéance et preuve. Les tests existants `backend/test/catalog-orders.test.ts` couvrent transitions et DTO ; ils ne prouvent ni livraison, ni registre, ni service transport. La recette de cette procédure n’est pas encore exécutée.

## Décisions nécessaires avant levée du blocage

Modèle de fulfillment, origine du stock, assortiment et offres fournisseurs vérifiées, pays/territoires, poids et dimensions emballés, devis transport datés et conditions, prise en charge des droits/taxes, adresse/procédure retours, responsable opérationnel et suppléant, espace privé du registre et politique d’accès, autorisations de communication et d’achat. Les frais de port offerts et seuils commerciaux ne sont acceptables qu’après calcul du coût complet et de la marge.
