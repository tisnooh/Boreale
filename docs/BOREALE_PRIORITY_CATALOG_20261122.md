# BORÉALE — sélection éditoriale prioritaire, 22 novembre 2026

Le catalogue preview est recentré sur cinq fiches, dans cet ordre : Contact, Refuge, Braise, Nuage et semelles thermiques isolantes. Les quatre premières sont mises en avant ; les semelles restent un complément. Les trois catégories prioritaires sont Confort & Textile, Chaleur et Maison / Cocooning ; leurs comptes sont calculés depuis les cinq fiches. La catégorie historique Auto Hiver reste accessible en dernier, avec zéro produit proposé et un texte d'attente, pour préserver les liens des anciennes fiches. La mise en avant doit filtrer les catégories à zéro produit. Les packs historiques ne sont plus proposés par la source preview.

## Réutilisation et conservation

- Nuage et Braise conservent leurs identifiants locaux et leurs slugs existants.
- Contact et Refuge reprennent les slugs déjà présents dans le seed historique, sans recréer de référence commerciale en base. Ils étaient absents de la liste preview précédente.
- Les semelles non électriques sont ajoutées sous `semelles-thermiques-isolantes`, identifiant local `p-semelles`, référence interne `BOR-SEM`.
- Les anciens articles restent dans le fichier d'archive et accessibles par leur URL historique avec métadonnées `deferred`, texte neutralisé et aucun achat possible. Ils sont exclus des listes, bundles et recommandations preview.

## Contrat d'honnêteté

`ProductDTO.selection` indique le statut local `draft`/`deferred`, la priorité, `priceVerified:false`, une référence de dossier interne, un poids inconnu et les objectifs de sélection. Les couleurs et caractéristiques sont explicitement recherchées, pas des variantes disponibles ou des performances prouvées.

Le contrat DTO conserve `priceCents:number` pour compatibilité. La valeur locale `0` est une **sentinelle non commerciale** : les composants doivent masquer le prix dès que `selection.priceVerified === false`, y compris sur les anciennes fiches différées. Elle ne doit produire ni « 0 € », ni Offer/Product SEO commercial, ni variante, ni entrée panier. La partie composants/SEO est sous responsabilité du chef et doit être vérifiée avant validation de la tranche.

Toutes les fiches preview retournées, y compris différées, ont `inStock:false`, zéro variante, aucune remise, aucune galerie produit prétendue réelle. Les images sont vides tant qu'une référence et ses images autorisées ne sont pas confirmées. Les propriétés officielles de la marque, le logo, les polices et les tokens CSS ne sont pas modifiés.

`sourcing/priority-catalog.json` prépare cinq dossiers privés avec prix, poids, inventaire, fournisseur et données commerciales à `null` ou absents. Ce fichier n'est pas un seed ni une migration, n'est pas automatiquement importé et ne prétend pas constituer cinq produits Supabase. Les références `BOR-CON/REF/BRA/NUA/SEM` sont internes et non des SKU de variantes fournisseur validées.

## Validation et limites

Les tests catalogue vérifient les cinq slugs uniques, l'ordre, l'absence de stock/variantes/images non vérifiées, la disparition des packs en liste et les comptes des catégories. La suite existante a été adaptée au passage d'un catalogue de démonstration fictif à cinq projets de fiches honnêtes. Le chef centralise les tests UI, typecheck, lint et build après intégration des composants.

Aucune base, migration, seed historique, publication, prix public ou fournisseur connecté n'a été modifié. Sourcing, photo exacte, sécurité, matières, tailles, coût livré et prix de vente restent à valider. Cette livraison d'auteur requiert la revue indépendante ; aucun verdict commercial d'approbation n'est revendiqué.
