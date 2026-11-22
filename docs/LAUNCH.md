# Mise en ligne avant ouverture

Le mode `launch` publie uniquement une page « ouverture prochaine » avec l’identité BORÉALE.
Aucun produit de démonstration, prix, compte, paiement, collecte d’email ou promesse de livraison
n’est proposé. Les anciennes routes de la boutique redirigent temporairement vers l’accueil.
Le sitemap contient seulement l’accueil. Aucun backend ni compte Supabase n’est nécessaire.

## Vérifier en local (PowerShell)

Depuis `frontend` :

```powershell
npm.cmd ci
$env:NEXT_PUBLIC_SITE_MODE = 'launch'
$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
npm.cmd run build
npm.cmd start
```

Ouvrir `http://localhost:3000`. Les variables `NEXT_PUBLIC_*` sont intégrées au build :
reconstruire après chaque changement de mode. Pour continuer la conception de la boutique,
repasser `NEXT_PUBLIC_SITE_MODE=preview`, puis relancer le serveur de développement.

## Préparer l’hébergement

Un seul projet frontend suffit à cette étape, avec Root Directory = `frontend` et :

```text
NEXT_PUBLIC_SITE_MODE=launch
NEXT_PUBLIC_SITE_URL=https://ADRESSE-PUBLIQUE-REELLE
```

Remplacer l’adresse par le domaine ou l’URL effective de l’hébergement, puis reconstruire.
Ne pas déployer le backend à cette étape ; ne lancer aucune migration, aucun seed,
aucune création d’administrateur. Aucune clé Supabase, Stripe ou Resend n’est requise.
Ce document prépare la publication ; il ne constitue pas une preuve de déploiement.

## Avant d’ouvrir les ventes

- Sélectionner les premiers produits, obtenir les échantillons et photos réelles, confirmer
  fournisseurs, coûts complets, disponibilité, délais et organisation des retours.
- Finaliser l’identité de l’exploitant, les coordonnées et les textes légaux applicables.
  Les modèles existants avec des champs à compléter ne sont pas des documents finalisés.
- Connecter le bon compte Supabase, puis vérifier séparément le schéma et les migrations.
- Configurer les services de paiement et d’email, les stocks et les tarifs réels.
- Vérifier une commande de test complète : paiement, webhook, stock, emails,
  préparation, expédition et remboursement avant la bascule en `live`.

L’ordre conseillé : page d’attente → petit assortiment validé → services connectés →
recette complète → ouverture des commandes. Aucune date d’ouverture n’est promise.
