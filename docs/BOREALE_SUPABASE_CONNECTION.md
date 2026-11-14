# BORÉALE — premier projet et connexion vérifiée

Mise à jour du 14 novembre : une seconde migration additive `20261114033519_boreale_order_payment_atomic.sql` a été appliquée au même projet après revue. Le schéma compte désormais 23 tables publiques RLS, dont quatre nouvelles tables privées de règlement, événements, incidents et notifications. Recette transactionnelle réelle 32/32 par le chef puis 32/32 par l’auditeur, paiements synthétiques, nettoyage confirmé. Les constats initiaux de 19 tables/13 advisors ci-dessous décrivent le bootstrap précédent ; l’état suivant comporte 17 advisors INFO de tables privées sans policy client. Voir `BOREALE_TRANSACTION_DELIVERY.md` pour la portée et les limites. Aucune ouverture des ventes.

Date : 13 novembre 2026. Autorisation explicite du propriétaire pour créer le premier projet après constat d’une organisation vide. Aucun second projet, branche ou abonnement payant.

- Organisation : boreale, jpyeitgsliddczxzxmro.
- Projet : boreale, luojeyfznonjnacftxbm.
- Région : Paris, eu-west-3 ; état relu ACTIVE_HEALTHY.
- Coût de création annoncé par le connecteur Supabase :0/mois, aucun plan payant activé.
- Tableau de bord : https://supabase.com/dashboard/project/luojeyfznonjnacftxbm
- URL API publique : https://luojeyfznonjnacftxbm.supabase.co

## Configuration et schéma

URL, clé publishable et clé serveur existante configurées uniquement dans backend/.env.local, ignoré par Git. Aucune clé dans ce rapport. Le backend utilise AUTH_PROVIDER=supabase et CHECKOUT_ENABLED=false. L’interface de conception reste en preview ; aucune publication storefront.

Bootstrap canonique : backend/supabase/bootstrap/migrations/20261113193043_boreale_initial_auth.sql. Ce dossier est séparé de la chaîne legacy ; ne pas exécuter les deux. Le fichier a été généré par CLI migration new, puis son nom a été aligné sur la version appliquée par le connecteur sans modifier son SHA256.

19 tables avec RLS. Aucun public.users ni mot de passe client ; relations clientes vers auth.users. Profils propriétaire avec quatre colonnes modifiables ; trigger privé limité à des champs de présentation typés et bornés, sans rôle depuis metadata. Commerce et inventaire privés au backend. Produits/variantes inactifs par défaut, stock initial zéro ; aucun seed exécuté.

## Résultats réels

Chef puis auditeur indépendant :29 contrôles réussis chacun. Connexion Auth par mot de passe et identité serveur, création du profil par trigger, lecture et mise à jour propriétaire, refus des autres profils et de réattribution du propriétaire, refus des tables privées et RPC stock pour clients/anonymes. Chaque exécution a créé et supprimé ses deux comptes techniques identifiés ; aucun email envoyé. Comptage après nettoyage :0 compte,0 profil,0 produit,0 ligne de stock.

API locale : health200, catalogue et catégories200 avec listes vides, compte et commandes401 sans session. npm start charge maintenant .env.local avant l’application et cible le chemin compilé correct. Suite backend129/129, compilation, TypeScript et lint réussis.

Recette HTTP de l’application :11 contrôles réels réussis sur connexion, cookies httpOnly, lecture/modification du profil, rotation refresh avec profil persisté, refus du jeton client sur l’administration, checkout fermé, déconnexion distante confirmée puis accès refusé. Un compte QA confirmé par API admin a été créé et supprimé ; aucune réception d’email n’est simulée ou revendiquée. Le premier essai avait un chemin de test admin erroné, corrigé avant la relance réussie. Commande : `node --env-file=.env.local scripts/verify-boreale-auth-http.mjs` après `npm start`.

Cette recette HTTP a également été reproduite indépendamment :11/11, compte QA nettoyé. Contrôle final distant après toutes les recettes :0 compte Auth,0 profil,0 produit,0 stock,0 commande. Les scripts ont d’abord nécessité des imports Node explicites pour ESLint ; lint et TypeScript finaux passent après correction.

Advisors :13 avis INFO pour RLS activée sans policy sur les tables réservées au backend. Les droits clients sont révoqués et le refus est testé. Ce choix protège les données par défaut ; ne pas ajouter de policy publique pour masquer cet avis. [Explication Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Portée et suite

Cette étape valide la fondation Supabase et Auth/profils/Data API ; elle ne valide pas un achat complet. Restent notamment transactions et reprise des commandes/webhooks, mapping fournisseurs/offres, paniers persistants, fulfillment/incidents, paiement test complet et emails réellement reçus. Aucun produit non vérifié n’est publié.
