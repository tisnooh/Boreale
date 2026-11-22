# Livraison de la sélection hiver BORÉALE

Le catalogue local en mode preview présente Contact, Refuge, Braise, Nuage et les nouvelles semelles, dans cet ordre. Les anciens produits restent consultables comme références en attente. Les packs de démonstration sortent du merchandising. Les brouillons ne proposent ni prix, ni variantes commandables, ni offres SEO. Le backend conserve ses contrôles de publication et utilise des textes d’accueil sans promesses de livraison par défaut. Le seed de démonstration a été archivé et son point d’entrée refuse toute exécution commerciale. La base distante est hors de cette livraison.

## Fournisseurs

Les deux dossiers de sourcing couvrent douze annonces Alibaba. Ils détaillent les liens, prix affichés, minimums, teintes, dimensions, matières, photos, emballages, échantillons, signaux vendeurs et inconnues. Aucun fournisseur ni variante n’a franchi la qualification. Contact et Refuge ont les pistes unitaires les plus proches du modèle recherché. Braise, Nuage et les semelles restent à sourcer à la commande. Les couleurs des fiches indiquent les teintes recherchées.

- Contact et Braise · [dossier](sourcing/BOREALE_CONTACT_BRAISE_20261122.md)
- Refuge, Nuage et semelles · [dossier](sourcing/BOREALE_REFUGE_NUAGE_SEMELLES_20261122.md)
- [Données privées de préparation](../sourcing/priority-catalog.json)

## Images

Le [manifeste](../assets/product-visuals/manifest.json) donne les quinze prompts studio, texture et usage, ainsi que les destinations prévues. Aucun visuel produit commercial n’est intégré pour les cinq brouillons. Les gabarits affichent un état de préparation. La création de visuels fidèles dépend d’une référence exacte et de photos utilisables. Les prises de vue prévues préservent la forme, la matière, la teinte et le contenu du lot réellement fourni.

## Fichiers

- `backend/src/services/settings.ts`
- `backend/supabase/seed.sql`
- `frontend/app/collections/page.tsx`
- `frontend/app/products/[slug]/page.tsx`
- `frontend/components/home/Cover.tsx`
- `frontend/components/home/Folio.tsx`
- `frontend/components/home/Manifesto.tsx`
- `frontend/components/home/UniversIndex.tsx`
- `frontend/components/home/WinterHome.tsx`
- `frontend/components/layout/Footer.tsx`
- `frontend/components/product/ProductCard.tsx`
- `frontend/components/product/ProductPurchase.tsx`
- `frontend/lib/catalog/preview-data.ts`
- `frontend/lib/catalog/source.ts`
- `frontend/lib/constants.ts`
- `frontend/lib/homepage-fallback.ts`
- `frontend/lib/season/nav.ts`
- `frontend/lib/seo.ts`
- `frontend/lib/types.ts`
- `frontend/tests/catalog-source.test.ts`
- `assets/product-visuals/README.md`
- `assets/product-visuals/chauffe-mains-reutilisables-braise/lifestyle.prompt.md`
- `assets/product-visuals/chauffe-mains-reutilisables-braise/studio.prompt.md`
- `assets/product-visuals/chauffe-mains-reutilisables-braise/texture.prompt.md`
- `assets/product-visuals/chaussettes-polaires-nuage/lifestyle.prompt.md`
- `assets/product-visuals/chaussettes-polaires-nuage/studio.prompt.md`
- `assets/product-visuals/chaussettes-polaires-nuage/texture.prompt.md`
- `assets/product-visuals/chaussons-fourres-refuge/lifestyle.prompt.md`
- `assets/product-visuals/chaussons-fourres-refuge/studio.prompt.md`
- `assets/product-visuals/chaussons-fourres-refuge/texture.prompt.md`
- `assets/product-visuals/gants-tactiles-contact/lifestyle.prompt.md`
- `assets/product-visuals/gants-tactiles-contact/studio.prompt.md`
- `assets/product-visuals/gants-tactiles-contact/texture.prompt.md`
- `assets/product-visuals/manifest.json`
- `assets/product-visuals/semelles-thermiques-isolantes/lifestyle.prompt.md`
- `assets/product-visuals/semelles-thermiques-isolantes/studio.prompt.md`
- `assets/product-visuals/semelles-thermiques-isolantes/texture.prompt.md`
- `backend/supabase/seed.historical.sql.txt`
- `backend/test/settings-readiness.test.ts`
- `docs/BOREALE_PRIORITY_CATALOG_20261122.md`
- `docs/BOREALE_PRIORITY_DELIVERY_20261122.md`
- `docs/qa/priority-catalog-20261122/before.json`
- `docs/sourcing/BOREALE_CONTACT_BRAISE_20261122.md`
- `docs/sourcing/BOREALE_REFUGE_NUAGE_SEMELLES_20261122.md`
- `frontend/lib/catalog/priority-products.ts`
- `frontend/scripts/prepare-priority-image-briefs.mjs`
- `frontend/scripts/verify-priority-catalog.cjs`
- `frontend/tests/priority-merchandising.test.tsx`
- `frontend/tests/priority-product-ui.test.tsx`
- `sourcing/contact-braise-shortlist.json`
- `sourcing/priority-catalog.json`
- `sourcing/refuge-nuage-semelles-shortlist.json`

- `frontend/tests/season.test.ts`
- `docs/BOREALE_PRIORITY_DELIVERY_20261122.md`

## Vérifications

Typecheck frontend réussi. Les 24 tests ciblés finaux couvrent les cinq produits, le merchandising, la séparation saisonnière et l’interdiction d’achat. Le serveur Next compilé a servi les six routes contrôlées par HTTP. La page d'accueil présente les cinq priorités dans l’ordre et chaque fiche annonce son indisponibilité à la vente, sans bouton d’ajout ni indexation. Le build backend a terminé avec code 0.

La comparaison visuelle reste bloquée. Chromium a expiré à la navigation lors de la capture initiale, puis au délai global sur le serveur compilé. Les deux reçus sous `docs/qa/priority-catalog-20261122` contiennent zéro capture. La palette, les polices, le logo et les feuilles de style sont inchangés selon le diff Git. Ce contrôle ne remplace pas la comparaison de captures.

La revue indépendante a relevé le lien Auto cassé, les anciennes promesses de l’accueil backend et la possibilité de poursuivre le seed après son erreur. Les trois corrections sont intégrées. La catégorie Auto historique reste accessible, les valeurs par défaut sont alignées et le seed exécutable ne contient plus de données fictives.

## Dépendances avant mise en vente

Pour chacun des cinq modèles, confirmer la finition sans logo, les variantes, les tailles, le poids, le coût livré et l’expédition à l’unité vers le client français. Vérifier aussi les retours, les documents de sécurité, les droits photo et leur correspondance avec la variante. Les cinq dossiers restent au stade brouillon local.

Suite backend finale 397/397. La suite frontend a donné 173 succès et un échec dû à l’ancien seuil de plus de cinq produits. L’assertion a été alignée sur les cinq priorités, puis le fichier saison et les trois suites ciblées ont passé ensemble 24/24. La suite frontend complète n’a pas été rejouée après cette correction de test.
