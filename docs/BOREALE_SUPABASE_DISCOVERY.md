# BORÉALE — découverte Supabase, lecture seule

Date : 13 novembre 2026. Mission AGENT Supabase, acceptation réservée au chef.

## Résultat vérifié

**BLOCKED pour l’identification technique du projet et sa connexion réelle.** Le compte connecté nommé « Compte Supabase de Boreale » est présent dans les métadonnées des outils, avec `link_id=link_6af6988a6e008191b75bb88a73e81422`. Le nouvel appel direct exécuté par le chef retourne une liste vide : `{projects:[]}`, `isError:false`, en 1,4 seconde. Aucun projet accessible n’est donc listé par cette connexion. Cela ne prouve pas que le projet existant n’existe pas. Ce lien de compte n’est pas une référence de projet et ne suffit pas à construire son URL API.

L’utilisateur a confirmé que ce compte correspond à Boréale et a autorisé sa connexion au projet existant. Aucun projet ni branche n’a été créé ; aucune écriture distante, lecture de données clients, demande de clé privée ou modification Auth/RLS n’a été effectuée par cette mission.

## Appels et limites exactes

- Skill `supabase` lu intégralement avant l’investigation.
- Un appel `supabase_list_projects` avec le seul lien Boréale a été lancé dans un groupe avec la consultation officielle `https://supabase.com/changelog.md`.
- Le groupe n’a produit aucun résultat exploitable pendant environ cinq minutes ; il a été interrompu par le mécanisme de terminaison de l’outil d’orchestration.
- Aucune réponse HTTP, erreur d’authentification, refus de permission ou liste de projets n’a été reçue. Avec ce groupe en attente, il n’est pas possible d’attribuer définitivement la latence à l’un des deux appels.
- Preuve plus récente transmise par le chef : appel direct `supabase_list_projects({link_id:'link_6af6988a6e008191b75bb88a73e81422'})`, terminé en 1,4 seconde, résultat `{projects:[]}`, `isError:false`. Cette réponse remplace l’hypothèse d’un transport sans réponse pour la liste des projets. Aucun `401` ou `403` n’a été signalé.
- Le contenu du changelog n’a donc pas pu être examiné. Aucune implémentation Supabase ne doit être annoncée comme vérifiée contre ce contenu sur la base de cette mission.
- Aucun `project_id`, nom de projet distant, région, URL API ou environnement production/test n’est établi ici. Tables, migrations appliquées, policies, grants et advisors distants restent **non inspectés**.

Il serait inexact de déclarer un accès Supabase refusé, d’inventer un identifiant, ou de considérer la présence du nom de compte comme une connexion de la boutique.

## Éléments locaux vérifiés

- `backend/src/lib/supabase.ts` construit déjà un client backend à partir de `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. La clé privilégiée n’est pas destinée au navigateur ; son utilisation contourne RLS et impose les contrôles applicatifs.
- `backend/supabase/migrations/0001_schema.sql:24-33` définit `public.users` avec `password_hash`, puis `profiles.user_id` lié à cette table.
- `0001_schema.sql:55` et `:192` relient également `customers.user_id` et `orders.user_id` à ces identités applicatives. Ce schéma local ne prouve pas l’état de la base distante.
- `0002_rls.sql:38-63` contient des policies de lecture catalogue publiques. Leur existence locale ne prouve ni leur application ni l’état des grants sur le projet.
- Le chef développe séparément une option Auth Supabase dans le code local. Cette mission de découverte ne l’a pas implémentée ni testée ; elle ne l’accepte pas.

## Séquence sûre dès que le transport répond

1. Obtenir la liste de projets du seul lien Boréale ; identifier un projet existant par son nom et sa référence. En cas de plusieurs candidats, comparer avec l’URL non secrète fournie par le propriétaire avant toute écriture.
2. Lire les détails du projet, URL API, schémas `public`/`auth`, historique migrations, politiques, grants et advisors sécurité/performance/santé. Ne lire aucune ligne client inutile.
3. Comparer l’état distant au schéma du dépôt. Préparer une migration additive et réversible si nécessaire ; conserver les données et identités historiques, sans seed de stock fictif ni remplacement de projet.
4. Pour Supabase Auth, établir explicitement le mapping entre `auth.users.id` et les identités métier existantes. Ne pas remplacer les anciennes clés étrangères, fusionner par email non vérifié, ni générer de droit de compte depuis des métadonnées modifiables par l’utilisateur.
5. Configurer URL et clé publiable dans les emplacements adaptés, clé privilégiée backend uniquement par canal sécurisé ; aucune clé en conversation ou journal. Garder les ventes fermées.
6. Tester session confirmée, expiration/refresh, inscription sans fausse connexion avant confirmation, isolation propriétaire, refus anon sur données privées, synchronisation profil, commandes historiques et erreurs de persistance.
7. Tester les requêtes réelles et les advisors après modifications autorisées, puis une recette paiement isolée seulement lorsque ses autres dépendances sont disponibles.

Références officielles à consulter de nouveau avant implémentation : [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [gestion des utilisateurs](https://supabase.com/docs/guides/auth/managing-user-data), [sécurisation de la Data API](https://supabase.com/docs/guides/api/securing-your-api).

## Autorisation ou action réellement nécessaire

L’autorisation du propriétaire de travailler sur le projet existant est déjà donnée. La connexion répond maintenant mais ne liste aucun projet accessible. Le chef a demandé au propriétaire d’autoriser le projet existant dans la connexion du compte Boréale, ou de fournir son URL dashboard non secrète pour l’identifier. La liste vide ne distingue pas à elle seule un périmètre OAuth trop restreint, un autre compte d’organisation ou une autre cause de visibilité ; ne pas annoncer un refus `403` ni un projet inexistant. Aucun accès aux autres comptes n’est autorisé dans cette mission. Une fois la référence et l’accès établis, reprendre l’inventaire en lecture seule avant toute écriture. Ne jamais demander une clé secrète en clair.

Découverte documentaire : terminée avec limite explicitée. Connexion réelle, schéma/Auth/RLS, synchronisation et parcours de commande : non validés.
