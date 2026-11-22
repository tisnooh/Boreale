# BORÉALE — configuration Stripe de test

Compte choisi et accès connecteur confirmés : `acct_1Uc6bxGLTNMkV9aW`, environnement de test Boreale, `livemode=false`. Aucun compte supplémentaire créé.

Le fichier privé `backend/.env.stripe.local` est exclu de Git. La clé serveur et le secret webhook y sont toujours absents au contrôle du 17 novembre. Aucun secret n’est écrit dans ce document.

Depuis `backend/`, `npm run stripe:verify-test` charge ce fichier et contrôle le mode test, le compte choisi, puis l’identité réelle renvoyée par Stripe et la présence des réglages webhook. Aucun produit, paiement, webhook ou paramètre distant n’est créé. Les erreurs sont résumées sans clé ni diagnostic privé. Un résultat ACCOUNT_VERIFIED ne valide jamais un achat complet.

La recherche d’opérations du connecteur pour les API keys n’a retourné aucune opération de création de clé utilisable. Le planner intégré n’a pas fourni de procédure de provisionnement. Aucun jeton du connecteur n’est récupéré ou réutilisé comme clé du site.

Les clés restreintes peuvent être créées dans le Dashboard ; leur configuration serveur est décrite par [Stripe](https://docs.stripe.com/keys/restricted-api-keys). Une autre possibilité documentée est une intégration d’hébergement avec [clés gérées](https://docs.stripe.com/keys/managed-api-keys) ; elle n’est pas installée ou présumée disponible ici. Aucun choix d’hébergement ou déploiement de production n’est effectué par cette vérification.

Une fois l’accès serveur disponible, l’agent doit vérifier le webhook, effectuer l’achat isolé, contrôler l’enregistrement et les événements répétés, puis obtenir la recette UI. Produits, approvisionnement, livraison et dossier vendeur restent à qualifier avant toute vente réelle. Les ventes restent fermées.
