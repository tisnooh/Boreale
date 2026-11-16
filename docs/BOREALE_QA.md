# Qualité et preuves

## 17 novembre — checkpoint local, parcours client non validé

**Code et SQL revus ; ouverture commerciale BLOCKED.** Les 351 tests backend et 165 tests frontend passent. Builds backend et frontend webpack réussis (34 pages générées côté frontend). Lint backend : zéro erreur/avertissement ; frontend global : zéro erreur et 27 avertissements existants, dont deux dans les fichiers ciblés. La recette SQL est exécutée et nettoyée ; les deux connexions observées sont en série, sans preuve de concurrence.

Le contrôle navigateur ne valide pas encore la confirmation : navigation DOMContentLoaded expirée à 30 s, puis titre attendu non observé à 60 s. Le formulaire preview à 320 px a passé ses trois premiers contrôles. Deux probes indépendants ont reçu le document et des ressources HTTP 200, mais aucun appel API ; DOM/body et capture sont devenus inaccessibles. Aucune erreur métier, CORS ou boucle applicative n’est démontrée par ces traces. Mesure Windows : 3,39 Go de RAM, environ 0,02 Go libres. **UI BLOCKED ; aucun parcours d’achat complet revendiqué.** Le harness instrumenté distingue maintenant disponibilité DOM et assertions métier ; il est relu et passe le contrôle de syntaxe, mais n’est pas relancé sous cette contrainte.

La clé serveur Stripe test et le secret webhook restent absents du fichier privé préparé ; la demande de saisie sécurisée est en attente. Le plugin est connecté au compte isolé choisi, ce qui ne configure pas les secrets du site. Les produits restent non vendables et la livraison non qualifiée. Les remboursements, autres notifications et opérations fournisseur restent à terminer par l’agent. Aucun achat réel, email client envoyé ou déploiement du site en production.

Le travail reste en checkpoint local : aucun push de cette nouvelle tranche avant validation UI. Après disponibilité de la clé et des ressources navigateur, l’agent reprend la recette, corrige tout échec réel et livre les preuves. Les applications tierces dont le travail en cours est inconnu ne sont pas arrêtées automatiquement. [Rapport détaillé](BOREALE_CHECKOUT_RECOVERY_20261116.md) et [reçu structuré](qa/BOREALE_CHECKOUT_RECOVERY_20261116_RESULTS.json). Les états plus anciens ci-dessous sont historiques.


## 16 novembre — état courant : reprise checkout validée en base

**GOAL IN PROGRESS ; ouverture commerciale BLOCKED.** Tranche checkout APPROVED après revue indépendante du code/SQL et correction des deux HIGH : aucun pipeline séquentiel réservé aux tests ; action explicite après expiration vérifiée, restaurable après rechargement. Migration appliquée via MCP : version réelle 20261116142245_boreale_checkout_intent.sql, SHA-256 inchangé EE9C2C93CDAB8FE8F97CE9C17B135C952F179880D8AE5F10AE827D67BCC8CB9B. Script SQL renforcé exécuté sans erreur, huit comptages post-rollback à zéro ; seconde requête confirme commandes/intentions/paiements/clients/Auth QA à zéro, trois produits privés et zéro actif. Deux connexions SQL réelles retrouvent une intention/commande et une ligne : idempotence en série PASS. Intervalles non chevauchants : concurrence INCONCLUSIVE, aucun test concurrent réussi revendiqué. Nettoyage finally confirmé : produits/variantes/commandes/clients/intentions QA tous à zéro.

Backend global **351/351**, typecheck/build exit 0, lint 92 fichiers sans erreur ni warning. Frontend **51/51 ciblés et 165/165 globaux**, zéro échec, suite globale fraîche confirmée ; typecheck exit 0, lint sans erreur et deux warnings existants. Build webpack final réussi (exit 0, 34 pages générées). Le build standard Turbopack interrompu après compilation/typecheck ne compte pas comme un build terminé. Aucun achat Stripe complet, paiement réel, email remis ou production validé. Stripe est désormais accessible : compte utilisateur choisi acct_1Uc6bxGLTNMkV9aW, environnement BORÉALE isolé livemode=false ; webhooks lus vides. Les anciennes mentions UNAUTHORIZED sont historiques. Clé Stripe/whsec/email absents de la configuration locale contrôlée ; fichier privé ignoré Git préparé sans clé, demande sécurisée utilisateur déjà en attente. Vercel : une équipe accessible, aucun projet lié BORÉALE trouvé lors de deux lectures personnel/équipe.

Choix explicite : session Stripe par défaut 24 heures, reprises de création bornées à 23 heures/cinq tentatives, corps et compte/mode figés ; nouvelle intention = prix recalculés. Modification du contenu avant preuve d’expiration : mêmes informations ou support, aucune nouvelle clé automatique. Wordans reste un SENT sans réponse/réception prouvée ; deux RFQ Alibaba déjà autorisés restent bloqués sur connexion manuelle. Candidats non vendables, décisions exploitant non reçues. [Rapport courant et matrice des quinze modules](BOREALE_CHECKOUT_RECOVERY_20261116.md).

Preuves nouvelles : privilèges privés, rejeu, gel des paramètres, jetons périmés, bind atomique et conservation refunded, rollback tardif, bornes cinq tentatives/23 h, incident support, deux acteurs Auth fictifs et absence de transfert de contact/address book. SQL exécuté réellement ; aucun appel Stripe/email dans cette recette. Les acquittements/session IDs restent synthétiques. Revue indépendante APPROVED statique après les deux corrections HIGH ; l’application et les comptages finaux sont ceux du chef. Concurrence réelle INCONCLUSIVE : les deux connexions ont exécuté en série, sans chevauchement ; aucun build frontend final réussi revendiqué à cet instant. Historique conservé ci-dessous.


## 16 novembre — mise à jour courante : confirmations validées en base

**GOAL IN PROGRESS ; ouverture commerciale BLOCKED.** Tranche confirmations APPROVED après revue indépendante TypeScript/SQL et correction des confirmations périmées après annulation/remboursement. Plus de blocage de quota de revue. Mode off : aucun prestataire email appelé ni remise prouvée, aucun achat Stripe ni déploiement de production. Code poussé sur master/operational-readiness : 3d7d87e1ae9105913218e5a244ffd3e9b60fceac, vérifié avec git ls-remote ; main reste à 0a4428bb5d9fcdd8ef4f31afdf4b0462aee937bc.

Migration appliquée via MCP (success=true) : 20261116051026_boreale_notification_delivery.sql, nom aligné sur la version distante, SHA-256 inchangé EF7BCF279C6D9B70C8C93C9B486C0E11E4B3D00F040536E15B7DE1AC8A7FCAE3. Recette SQL renforcée exécutée sans erreur : baux/jetons/corps figé, périmètre test, backoff, rétention, cinq tentatives, acquittement synthétique/rejeu, privilèges et incident support. Quatre comptages après rollback à zéro ; seconde requête : clients, commandes, notifications, incidents tous à zéro, zéro produit actif. Aucune concurrence entre deux connexions testée. Advisors : 19 INFO RLS sans policy sur tables privées, aucun WARN/ERROR ; protections conservées. Backend **273/273**, typecheck/lint/build exit 0 ; smoke HTTP désactivé **5/5**, externalRequests=0.

Recherche et corrections produits relues par le chef ; candidats non vendables. Les trois RFQ sont déjà autorisés. Wordans **SENT**, identifiant 1a1e2b5102560167 : aucune réception, lecture ou réponse prouvée ; ne pas renvoyer. Fuying et Haining Jinhu **non envoyés** : le contact officiel Alibaba redirige vers « Sign in or create account ». Connexion manuelle du propriétaire requise ; aucune authentification automatisée et aucune nouvelle autorisation d’envoi identique à demander. Stripe : cinq liens UNAUTHORIZED ; décisions exploitant non reçues.

Le SQL vérifie les trois fonctions contre anon/authenticated et leur accès service_role, le refus d’acquittement sans corps, un acquittement synthétique valide vers sent/provider_message_id/sent_at, le refus du rejeu et d’une sixième tentative. Fixtures UUID/préfixes dédiés ; SELECT après ROLLBACK et seconde requête confirment leur absence. Ces contrôles ne prouvent ni appel prestataire ni remise email, ni concurrence entre deux connexions. Tests simulés et smoke fermé ne sont pas un achat de bout en bout.

Verdict indépendant APPROVED pour code et SQL statique après correction des états périmés ; application/QA réelles ensuite confirmées par le chef. Le reviewer a reproduit 26 tests notifications après correction et cinq tests du garde checkout (service mocké, aucun appel prestataire) ; la suite globale finale 273/273 est celle du chef. Aucun nouveau scan exhaustif sécurité ni recette frontend globale revendiqué. [Rapport et quinze modules](BOREALE_LAUNCH_PREPARATION_20261116.md). Historique conservé ci-dessous.


## 16 novembre — contrôle indépendant des commandes admin

SQL et code revus indépendamment : corrections imposées sur les emails administrateurs longs, l’échappement de recherche (dont `*`), le tri stable, les libellés et la touche Entrée du suivi. SQL réel PASS : verrouillage/CAS, transitions non financières, suivi, notes/historique et rollback, droits RPC privés. Comptes désactivés/rôles actuels contrôlés à chaque requête.

Suites 242/242 backend et 127/127 frontend ; reprises ciblées 9/9 backend et 8/8 frontend après les derniers changements. Lints sans erreur (27 avertissements frontend au global), types/builds passés. Recette initiale71/71 avec vrai login QA et commandes d’interface simulées ; verdict visuel **REJECTED** car la recherche disparaît à 768 px malgré l’absence de débordement racine. Correction en grille, nouvelles assertions de largeur/visibilité/clic, nouveau build et recette finale **77/77**, zéro exception JS. Neuf nouvelles captures et reçu relus indépendamment : **APPROVED**, blocage tablette résolu. Suppression du compte QA et absence de données commerciales de recette confirmées en base. Voir [rapport détaillé](BOREALE_ADMIN_ORDERS_DELIVERY.md).

## 16 novembre — liaison sourcing privée

Tranche sourcing privée APPROVED : trois BOR-ALI reliés à trois produits inactifs dans le projet Supabase existant, sans variante ni inventaire. Migration20261115052055 appliquée après revue indépendante ; RLS/droits/rollback vérifiés réellement. Backend219/219, frontend119/119, lints et types/build réussis. Recette finale42 contrôles API+UI réussis (26 API +16 interface), quatre captures examinées. Voir BOREALE_SOURCING_DELIVERY.md et ses reçus. Aucun paiement réel, message fournisseur, publication ou déploiement en production.

Revues : défaut de variante active par défaut et perte de diagnostic RPC rejetés puis corrigés. URLs .com/.co.uk alignées. Les42 contrôles combinés incluent les26 API déjà exécutés : ne pas les présenter comme68 tests distincts ni42 tests navigateur seuls. Session admin de QA éphémère, pas un login propriétaire. Advisors19 INFO privés intentionnels, pas zéro notice.


## 15 novembre — adaptation des écrans APPROVED, périmètre UI

Code et harness relus indépendamment ; rejet initial focus/scroll corrigé. Rapport complet99/99 assertions confirmé indépendamment (processus interrompu après rapport, sans exit0 revendiqué). Lint124fichiers :0erreur/24warnings préexistants, exit0. Buildwebpack et TypeScript :exit0,32pages générées. Chef :300contrôles uniques tous réussis, sept écrans complets, zéro exceptionJS/mutation inattendue ; neuf captures examinées. Reçu versionné et limites dans BOREALE_RESPONSIVE_QA.md. Aucun second passage navigateur indépendant revendiqué. Auth simulée anonyme, catalogue/panier preview ; aucun achat Stripe ou commande réelle. La performance et les navigateurs/appareils physiques ne sont pas validés ici.

## 14 novembre — validation transactionnelle bornée

Décision chef : **APPROVED pour création atomique et confirmation de paiement en base**, après corrections des courses détectées par l’auditeur. **BLOCKED pour ouverture commerciale et achat complet.** Voir `BOREALE_TRANSACTION_DELIVERY.md` pour le détail et les 15 modules.

- Backend global : **174/174 PASS**, zéro échec ; rapport JSON `work/boreale-transactions-tests.json` hors dépôt. ESLint global PASS. Typecheck indépendant PASS ; compilation finale consignée dans la livraison.
- Indépendant : 48/48 tests webhook/repository et 8/8 premiers garde-fous admin ; deux cas supplémentaires refusent les statuts remboursement manuels et sont inclus dans la suite globale de 174.
- Supabase réel : 32/32 contrôles chef puis 32/32 auditeur. Produits/variantes QA inactifs, événements Stripe synthétiques. Ni email ni requête Stripe. Nettoyage privilégié exact des deux marqueurs exécuté ; comptage final des dix tables commerciales contrôlées : toutes zéro.
- Concurrence : même événement, événements distincts/même session, commandes concurrentes pour un stock de 1, expiration simultanée au paiement. Une seule allocation quand elle est possible, encaissement conservé avec incident sinon.
- Rollback tardif règlement : collision d’intent après effets stock/promotion ; aucun effet partiel ni événement conservé. Création : validation des erreurs et contrôle supplémentaire du rollback transactionnel après retour réussi du RPC ; cette dernière preuve n’est pas une panne injectée à l’intérieur du RPC.
- Échecs corrigés : annulation pouvant écraser `paid`, ligne de stock nouvellement apparue non verrouillée, cleanup impossible avec journaux append-only (nettoyage admin ciblé conservant les permissions), deux erreurs de typage dans le harness admin corrigées avant la suite globale.
- Advisors : 17 signaux INFO `rls_enabled_no_policy` (13 précédents + quatre tables backend privées). Refus public vérifié réellement ; pas de policy permissive ajoutée. [Explication Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Limites non résolues : clé durable checkout, remboursements concurrents/désordonnés, transitions admin hors annulation, worker outbox et délivrabilité, recette Stripe et fulfillment réel. Le frontend n’a pas changé dans cette tranche ; aucune nouvelle recette mobile revendiquée.

## Preuves réelles du nouveau projet

Projet luojeyfznonjnacftxbm créé après autorisationexplicite dans organisationboreale ; coût annoncé0/mois. Avantbootstrap :public0table,migrations0,authusers0. Aprèsbootstrap :19tables,19RLS, migrationboreale_initial_auth/version20261113193043.

Script reproductible : `cd backend` puis `node --env-file=.env.local scripts/verify-supabase-bootstrap.mjs`. GardeURLprojetexacte ; ne logue ni clés, ni tokens, ni motsdepasse. ComptesQAadminconfirmés avec adresses@example.invalid et runUUID, aucunemailenvoyé ; suppression limitéeaux IDscréés, marqueurrun+emailrevérifiés.

Résultat chef puis auditeur indépendant :29checksPASS chacun,2comptescréés/2supprimés chacun. Preuves :Authpasswordlogin,getUser,triggerprofil,lecture/updateowner,refusautreprofil,changementowner/insertrefusés, tablesprivées refuséesanonetclient,RPCstockanonrefusée,cataloguevide. Aprèsnettoyage :authusers0,profiles0,products0,inventory0.

APIExpressréellementreliée : GET/api/health200 DBconfigured, GET/api/products?limit=50 et/api/categories200[] ; GET/api/me et/api/me/orders401 sanssession. npmstartcorrigé versdist/src/start.js et chargement.envlocal avantconfiguration. backend129/129tests,build,typecheck,lint passent. Aucune nouvellemodificationfrontend à cette étape.

Advisorssecurity :13signauxINFO rls_enabled_no_policy sur tablesbackendprivées. C’est le deny-by-default volontaire, associéà révocationdesgrantsclients, pas une validation d’accèslarge. Référence : https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . Ne pas annoncer zéroavis ni ouvrir les donnéespourlesfaire disparaître.

Acceptationchef : APPROVED fondationSupabase/Auth/RLS et connexionAPIlocale après contre-vérificationindépendante. BLOCKED pour achatStripecomplet, inscriptionavecréceptionemail, fournisseurs, fulfillment et fiabilitétransactionnelle descommandes. Aucun produitmis envente.

Recette HTTP réelle supplémentaire : `node --env-file=.env.local scripts/verify-boreale-auth-http.mjs`, API locale déjà démarrée sur4000. 11 contrôles passent : connexion et profil persisté, cookies httpOnly, identité, modification du profil via JWT utilisateur, rotation refresh avec valeurs DB, refus admin d’un jeton client, checkout fermé503, révocation logout confirmée et refus après déconnexion. Compte QA unique supprimé après vérification de son marqueur. Premier essai : le test visait `/api/admin/me` au lieu de `/api/admin/auth/me` et échouait après7contrôles sur404 ; chemin de test corrigé, aucune assertion affaiblie, relance11/11.

## Complément : Supabase Auth, sourcing et sitemap

La suite backend de la reprise passe114/114, avec timeout30s et un seul worker ; build, typecheck et lint passent. Auth Supabase préparée opt-in, sans requête réelle : 12 tests provider/HTTP mockés et régressions ownership/JWT. Le chef et le reviewer ont contrôlé séparément l’identité issue de getUser, la séparation admin, l’absence de fallback JWT legacy et les métadonnées réservées à l’affichage. Le profil reste explicitement indisponible tant que le mapping FK n’est pas validé.

Sitemap : suppression de la requête limit500 rejetée ; pagination50 jusqu’à10 pages, correspondant au plafond catalogue actuel500. Tests sitemap/preview6/6 et typecheck/lint frontend ciblés passent. Aucune vérification contre une API réelle connectée n’est revendiquée.

Sourcing : trois candidats JSON contrôlés indépendamment (identifiants uniques, draft, non publiés/non commandables, prix de vente et stocknull). Sources fournisseur Camalex et Wordans recoupées par chef et reviewer ; trois contributions recalculées. Les marges restent hypothétiques et les approvisionnements non validés.

Supabase : appel direct du chef sur le compte dédié retourne projects:[], sans erreur. Aucun schéma distant, policy RLS, grant ou projet n’a donc été inspecté, aucune mutation ni connexion réellement effectuée. La visibilité du projet ou son URL non secrète est demandée au propriétaire. Ne pas confondre préparation Auth locale et connexion DB.

Complément refresh frontend : 17 régressions ajoutées ; refresh single-flight après401 client, replay unique, admin/auth/checkout exclus. Une vérification session avant checkout empêche le basculement involontaire en invité ; chargement initial bloquant et identité comparée avant transaction. Le reviewer a demandé cette correction, puis a vérifié8/8 tests checkout indépendamment. Réutilisation de getUser limitée à la même requête : test ajouté, aucun cache partagé entre utilisateurs.

État final des tests à cette reprise : backend115/115 ; frontend92/92 avant ajout du dernier cas authLoading, puis fichier checkout final8/8 revérifié indépendamment. Ne pas transformer cette combinaison en suite globale93/93 fraîche. Backend Auth13/13 et frontend refresh/sitemap/launch23/23 contrôlés indépendamment. Typecheck frontend/backend et lint passent ; builds backend et frontend preview passent (exit0). Le lint frontend conserve les avertissements existants, sans erreur. Aucun build ne constitue une preuve de connexion distante.

Décision du chef : APPROVED pour la préparation locale Auth/refresh, le correctif sitemap et les dossiers de recherche en brouillon, après contre-vérification. BLOCKED pour connexion Supabase, schéma/RLS/profils, synchronisation et achat réel complet. Aucun nouveau produit vendu, aucune modification distante.

2026-11-13 — audit en cours. Aucun achat réel ou Stripe TEST complet exécuté dans cette mission.

Les tests unitaires injectent des dépendances simulées ; ils ne valident pas les services externes.

| Scénario requis | État initial | Preuve exigée |
|---|---|---|
| Achat réussi, refusé, remboursement, emails | BLOCKED | Environnement isolé + enregistrement DB + reçu prestataire |
| Indisponibilité, prix modifié, multi-articles | À tester localement | Régressions backend et panier |
| Webhook dupliqué | À auditer | Répétition et concurrence, transaction persistante |
| Destination impossible | À auditer | Rejet avant effets de bord |
| Isolation commandes clients | À auditer | Contrôles ownership et tests adverses |
| Mobile et non-régression | À vérifier | Navigateur + tests existants |

Décisions du chef : aucune validation globale de la boutique à ce stade.

## Revue indépendante AG10 et décision du chef

Preuves : `BOREALE_INDEPENDENT_AUDIT.md`. Exécutions indépendantes : checkout 14/14, webhook 13/13, config 7/7 ; relance ciblée intégration 9/9, ownership 6/6, payload Stripe 7/7 (120 combinaisons d’arrondis). Des timeouts à 5 s initiaux ont été observés sur machine saturée ; relance avec 30 s CLI, assertions inchangées. Aucun paiement ni base réelle utilisés : HTTP réel et JWT réel avec persistance simulée pour ownership.

AG02 : 4 tests régression checkout passent. Ils prouvent formulaire promo indépendant et panier conservé lors d’une tentative ; ils ne prouvent pas un refus bancaire Stripe réel. Classes visuelles conservées, aucune refonte.

Chef : APPROVED pour ces correctifs locaux bornés après examen et contre-vérification AG10. REJECTED pour l’affirmation « boutique opérationnelle ». BLOCKED pour la validation DB/Stripe/email/fournisseur/transport réelle.

Les défauts persistants ne sont pas cachés : création commande non transactionnelle, webhook sans claim atomique ni reprise durable après stock/email, remboursement sans idempotence durable ; aucun test de concurrence DB réussi. Aucune garantie de non-perte ou non-duplication globale annoncée.

## Régressions de la tranche initiale (actualisations de reprise ci-dessus)

- Panier : dialogue fermé encore tabulable, focus modal à compléter ; promo panier potentiellement périmée après quantité ; nettoyage après paiement confirmé à concevoir sans effacer un nouveau panier.
- SEO live : sitemap demande limit=500 alors API max50 ; pagination à corriger/tester.
- Admin : transitions manuelles vers payé et expédié sans toutes les preuves ; permissions staff/admin et révocation immédiate à renforcer.
- Emails : aucun reçu réel ; markSent malgré delivered=false ; consentement/information relance non démontré. Ne pas activer le cron marketing.
- Catalogue : seed contient encore stock fictif60/variante et activation par défaut ; ne pas l’exécuter sur une base opérationnelle. Aucune modification SQL ni application de migration dans cette mission.
- Sécurité historique : vérifier les rattachements user_id créés par ancien rapprochement email après accès DB autorisé ; aucune donnée existante assainie ici.

Suite backend globale : 101/102, un timeout5s sur rate-limit auth. Ce cas est ensuite passé en 1583ms dans la relance indépendante intégration9/9 avec délai30s. Ne pas déclarer une suite globale102/102 fraîche.

Suite frontend complète : 70/70, 13 fichiers, commande `npm.cmd run test --prefix frontend -- --maxWorkers=1 --minWorkers=1 --testTimeout=30000`. Typecheck, lint et build preview finaux passent (exit0). Lint : 0 erreur, 24 avertissements existants. Build backend passe (exit0) ; typecheck backend passé dans la vérification AG06. `git diff --check` passe. Aucun build n’est une preuve de vente réelle.

Logs livrés : `backend-master-checks.log`, `boreale-backend-build.log`, `boreale-frontend-checks.log`, `boreale-check-results.json` dans le dossier de livraison. Le mode preview du build final est destiné aux tests de conception, pas à la production.
