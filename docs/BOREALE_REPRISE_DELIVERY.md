# BORÉALE — livraison complémentaire du 13 novembre 2026

Branche conservée : master/operational-readiness. Aucun nouveau projet, produit publié, achat, contact externe, accès client, migration distante, push ou déploiement. Design conservé.

## Recherche produits

Recherche autonome puis contrôle indépendant : plaid Springwood, chaussettes maison, cache-cou BF280R. Deux offres comparées par famille, références/variantes, prix par palier, concurrence, transport et retours sourcés. Des contradictions de stock/prix et des informations essentielles manquantes empêchent l’acceptation commerciale.

Livrables : BOREALE_PRODUCT_RESEARCH_CURRENT.md et sourcing/catalog-candidates.json. Trois candidats avec identifiants uniques, en brouillon non commandable/non publié ; stock exploitable et prix de vente null. Aucun coût livré ni rentabilité réelle annoncés. Les simulations financières sont recalculées indépendamment et explicitement hypothétiques. Aucune substitution aux anciens produits sans preuve d’équivalence.

## Supabase

Appel direct au compte « Supabase de Boreale » : projects:[], sans erreur. Le compte connecté n’est pas une référence de projet. Aucun projet n’a pu être inspecté ni connecté. Aucune permission401/403 n’est démontrée ; ne pas conclure que le projet n’existe pas.

Action précise attendue : autoriser le projet existant dans cette connexion, ou fournir son URL dashboard non secrète pour un contrôle ciblé. Aucune clé privée à communiquer dans le chat. Le fallback navigateur a échoué sur un timeout d’attachement ; aucun réglage de compte ni droit distant modifié.

Préparation locale opt-in : Auth Supabase, vérification getUser, cookies httpOnly, rotation sérialisée, rafraîchissement sur401 client avec retry unique et exclusion des transactions. Le checkout attend l’état Auth et vérifie une session connue avant de créer une commande. Aucun JWT maison accepté en mode Supabase. Administration conservée.

Limites : AUTH_PROVIDER reste legacy par défaut ; aucune activation réelle. PATCH profil bloqué explicitement, car les FK du schéma historique visent public.users et non auth.users. Mapping/migration, RLS/grants, synchro données, confirmation email réelle, achat et commande DB restent à vérifier après accès. La révocation distante logout n’est pas affirmée lorsqu’elle n’est pas confirmée.

## Vérification

Backend : suite finale115/115, build réussi ; typecheck et lint réussis. Frontend : suite92/92 puis ajout du dernier cas de chargement, fichier checkout final8/8 revérifié indépendamment ; ne pas annoncer une suite93/93 fraîche. Refresh/sitemap/launch23/23 et Auth backend13/13 contrôlés indépendamment.

Build frontend preview et lint global réussis (exit0), sans déploiement. Sitemap : pagination50 corrigée conformément à l’API ; aucune requête limit500. Préouverture et preview conservées.

Le chef accepte les correctifs locaux et les dossiers préparatoires ; il refuse toute déclaration de connexion Supabase, de produit vendable ou de boutique opérationnelle. Voir BOREALE_QA et BOREALE_LAUNCH_READINESS pour la matrice globale et les travaux encore nécessaires.
