# BORÉALE — marketing, SEO et mesure

Audit AG08 du 2026-11-13, inspection locale uniquement. Skill `ecommerce-keyword-research` lu intégralement pour cadrer le plan organique ; aucun volume de recherche, trafic, classement ou conversion n’a été mesuré. Acceptation réservée au chef après contrôle indépendant.

## Constats prouvés par le code

| Sujet | Preuve locale | Conséquence / décision proposée |
|---|---|---|
| Sitemap live invalide pour les produits | `frontend/app/sitemap.ts` appelle `/api/products?limit=500` ; `backend/src/validators/catalog.ts:14` impose `limit <= 50` | **REJECTED avant live** : réponse 422 et absence d’URLs produit. Utiliser des pages de 50 et l’enveloppe `data,page,limit,total` (`backend/src/services/catalog.ts:94-99,141-150`), avec test plusieurs pages et erreur API. |
| Préouverture et démonstration séparées | `frontend/app/sitemap.ts:12-13` : preview vide, launch accueil seul ; `frontend/app/robots.ts:6` interdit exploration preview ; layout `:53` pose noindex preview | Protection prévue localement. Vérifier les sorties HTTP après build de chaque mode et l’URL publique réelle avant publication. |
| Métadonnées et données structurées | `frontend/lib/seo.ts`, `frontend/app/products/[slug]/page.tsx:57-58` | Canonical, OG, Product/Offer présents ; Product JSON-LD supprimé en preview. Validité effective des données commerciales et résultat rich-results non démontrés. |
| Adresse publique par défaut locale | `frontend/lib/constants.ts:11` | `NEXT_PUBLIC_SITE_URL` doit correspondre à l’hébergement final, sinon canonical/OG/sitemap pointent sur localhost. |
| Aucun outil analytics identifié | Recherche `analytics,gtag,posthog,pixel,consent` et fichiers frontend | Aucun événement de conversion réellement collecté ou taux mesuré démontré. Ne pas annoncer de suivi des ventes fonctionnel. |
| Capture abandon au blur | `frontend/app/checkout/page.tsx:64-77,169`, route `backend/src/routes/index.ts:56` | L’adresse est envoyée dès sortie du champ en live, sans preuve d’un choix spécifique dans ce flux. **REJECTED avant live** : examiner base légale et information ; désactiver tant que le cadre n’est pas validé. |
| Relances sans filtre marketing montré | `backend/src/controllers/misc.ts:70-99`, `backend/src/repositories/misc.ts:145-154` | Sélectionne panier ouvert avant cutoff, sans vérification d’autorisation de communication dans cette requête. La déclaration de confidentialité seule n’est pas une preuve de conformité. |
| État envoyé possiblement trompeur | `backend/src/controllers/misc.ts:95-97` | `markSent` est appelé même si `sendEmail` retourne `delivered:false`. Faire distinguer tentative et livraison acceptée avant validation opérationnelle. |
| Consentement newsletters partiel | `backend/src/validators/auth.ts`, `backend/src/services/auth.ts:33-34` | Optin inscription présent. Preuve durable, désinscription effective et non-réinscription abusive à tester ; aucun envoi réalisé ici. |

Les constats décrivent le code à la date d’audit et peuvent précéder des corrections de l’équipe. Le journal QA final doit indiquer celles effectivement acceptées.

## Contrat de mesure à préparer, sans activer de traceur

| Événement | Source d’autorité | Déduplication et contenu minimal |
|---|---|---|
| `view_item` | Fiche produit publiée et vérifiée | Un affichage de page ; identifiant interne et variante si choisie ; aucun email/adresse |
| `add_to_cart`, `remove_from_cart` | Mutation réussie du panier | Identifiant d’action unique, SKU/variante, quantité, devise ; distinguer clic et résultat |
| `begin_checkout` | Entrée effective au checkout avec panier | Identifiant d’intention panier ; aucun événement de vente |
| `shipping_unavailable`, `checkout_error` | Validation serveur | Code d’erreur normalisé, pas de données personnelles |
| `purchase` | Paiement confirmé et commande persistée transactionnellement | Identifiant commande unique ; montant, taxes, frais, devise et lignes snapshot ; jamais déclenché par page succès seule |
| `refund` | Écriture de remboursement vérifiée | Identifiant remboursement unique + commande et montant |

Choisir l’outil seulement après clarification du besoin, des traitements et du cadre consentement/exemption. Tester refus, retrait, double navigation, webhook répété et absence de fuite de données avant activation. Les statistiques commerciales doivent provenir des commandes réconciliées, pas du seul navigateur.

## Plan organique mesurable proposé

1. Avant vente : page de marque honnête, URL publique validée, aucun produit non vérifié indexé, aucun formulaire promettant un enregistrement absent.
2. Après sélection réelle : associer chaque produit et catégorie à une intention de recherche documentée. Exemples à rechercher, **sans volume prétendu** : choix d’une housse pare-brise, entretien de chaussettes polaires, comparaison des matières d’un plaid. Ne pas créer de promesse thermique, qualité ou livraison sans preuve.
3. Publier d’abord fiches vérifiées et un guide utile par univers prioritaire, photos autorisées et liens internes cohérents. Aucun avis, prix barré ou certification inventé.
4. Une fois hébergement autorisé : préparer Search Console, sitemap corrigé et contrôle d’indexation. Compter les pages valides, erreurs, impressions et clics réellement observés ; distinguer visiteurs organiques et ventes réconciliées.
5. Examiner chaque semaine erreurs checkout, abandons mesurables avec traitement conforme, contribution par commande et retours. Fixer des objectifs chiffrés seulement après une période de données fiables.

## Dépendances et validation

Outil de mesure et comptes non vérifiés ; aucune campagne payante activée. Catalogue, livraison, coûts et preuves légales restent requis. Le parcours d’achat complet, les emails et la mesure non dupliquée sont **bloqués** tant que les services de test et la base autorisée ne sont pas disponibles. Aucun code modifié dans cette mission.
