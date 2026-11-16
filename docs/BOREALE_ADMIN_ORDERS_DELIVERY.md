# Administration des commandes — 16 novembre 2026

Statut de recette : **APPROVED pour la tranche locale d’administration**, après correction et nouvelle revue indépendante des neuf captures finales. L’ouverture commerciale reste bloquée. Branche `master/operational-readiness`, design public conservé. Les pages existantes `/admin`, `/admin/commandes` et `/admin/commandes/[id]` ont été complétées ; aucune administration parallèle créée.

## Résultat

- Liste : recherche littérale par numéro/email, filtres de statut et préparation, pagination stable, erreur explicite et reprise, réponses périmées ignorées.
- Détail : articles/prix historiques, client/adresse, paiement enregistré, préparation, incidents avec responsable/prochaine action, notifications et historique avec opérateur.
- Actions : préparation, expédition avec transporteur et numéro requis, livraison, correction du suivi et notes internes. Une annulation manuelle ne concerne qu’une commande non encaissée en attente.
- Contrôles : statuts proposés par le serveur, comparaison de version, verrouillage en base, opération et historique dans la même transaction. Liens de suivi HTTP(S) sans identifiants seulement.
- Accès : chaque requête vérifie que le compte administrateur existe encore, reste actif et utilise son rôle actuel. Un compte client ne devient pas administrateur.
- Dashboard : compteurs d’incidents, préparations bloquées et notifications en attente/échec. Une erreur ou une agrégation tronquée est signalée au lieu de présenter un faux total.

## Revue des interactions

| Avant | Après | Pourquoi |
|---|---|---|
| Une panne pouvait apparaître comme une liste vide | Erreur distincte avec bouton Réessayer | Éviter de masquer les commandes |
| Tous les statuts étaient proposés | Actions autorisées calculées côté serveur | Ne pas fabriquer de confirmation de paiement |
| Statut et historique écrits séparément | Écriture atomique avec verrouillage et contrôle de version | Éviter les écrasements et états partiels |
| Entrée dans le suivi pouvait soumettre un changement de statut | Correction du suivi séparée et testée au clavier | Empêcher une livraison accidentelle |
| Incidents et notifications invisibles | État, responsable et prochaine action affichés | Permettre le suivi opérationnel |
| Un compte désactivé pouvait garder son jeton valable | Compte actif revérifié à chaque requête | Révocation immédiate de l’accès |

## Validation et nature des preuves

- Tests unitaires/intégration avec dépendances simulées : backend **242/242**, frontend **127/127**. Les tests de composants ne constituent pas une preuve de paiement réel.
- Revue indépendante du SQL et du code : acceptée après correction de l’email administrateur long lors d’une annulation, des touches clavier du suivi, de la recherche et du tri stable.
- Supabase réel, projet existant `luojeyfznonjnacftxbm` : migration additive `20261115233647_boreale_admin_order_operations.sql`, SHA-256 `0D75C6CD4D919E79BF46D92118C610614FDD565ED65FDE02B36233931ED5EBC1`. Exécution refusée aux rôles anon/authenticated ; service_role uniquement, SECURITY INVOKER, search_path vide.
- Script réel `backend/scripts/verify-admin-order-operations.sql` : transitions, suivi, notes, historique, annulation, email long, refus des états périmés, préparation bloquée et modifications financières, rollback et absence d’envoi vérifiés. Toutes les commandes de recette existent uniquement dans la transaction annulée. Aucun appel Stripe, email ou fournisseur.
- Suites complètes : backend **242/242**, frontend **127/127**. Après le dernier correctif de recherche littérale, les **9/9 tests ciblés**, le typecheck et le build backend ont de nouveau réussi. Ces 9 assertions font partie de la suite, ce ne sont pas neuf tests distincts supplémentaires.
- Lints globaux : zéro erreur ; backend zéro avertissement, frontend **27 avertissements React** conservés. Typecheck/build backend et build webpack/TypeScript frontend réussis, 34 pages générées. Dernier build frontend effectué après la correction textuelle du bandeau preview.
- Recette finale `backend/scripts/verify-orders-admin-live.mjs` : **77/77 contrôles, zéro exception JavaScript**, répartis en **25 contrôles HTTP/base/accès/nettoyage et 52 contrôles navigateur**. Connexion réelle d’un compte QA privé, mauvais mot de passe, cookie httpOnly, listes/compteurs vides réels, recherche sur trois vrais brouillons, remboursement indisponible, révocation immédiate et suppression exacte du compte. Ne pas présenter ce login QA comme le login propriétaire.
- Chromium **320, 768 et 1440 px** : liste réelle vide, reprise sur erreur simulée, liste/détail peuplés explicitement simulés, notes avec échec puis reprise, préparation, expédition, correction du suivi au clavier, livraison, incidents bloquants et absence de débordement racine, y compris champs très longs. Neuf captures complètes conservées hors dépôt. Les largeurs sont émulées ; aucun appareil physique ni autre moteur navigateur validé ici.
- Reçus versionnés : [résultats](qa/BOREALE_ADMIN_ORDERS_RESULTS.json) et [validation](qa/BOREALE_ADMIN_ORDERS_VALIDATION.json). Scripts de recette reproductibles dans `backend/scripts/`. Captures/logs locaux : `D:/CodexTools/BorealeAudit-20261114/evidence/orders-admin/`.
- Premier contrôle supplémentaire de l’accueil : mesure trop précoce avant disponibilité du titre/polices ; rejetée. Diagnostic sans correction CSS : racine/corps 320 px une fois prêt. La recette finale attend les mêmes critères de disponibilité que l’audit responsive précédent et garde la limite stricte `scrollWidth <= innerWidth`. Le défaut de synchronisation de l’attente « préparation » du harness a également été corrigé avant acceptation.
- La première recette 71/71 a été **REJECTED** par l’auditeur visuel : recherche masquée sur tablette malgré les contrôles de débordement. La ligne de filtres a été remplacée par une grille responsive ; recherche sur sa propre ligne à 768 px. Six nouveaux contrôles vérifient la largeur exploitable des champs/boutons et le clic réel avec réponse HTTP 200 aux trois tailles. Les 8 tests admin, lint et build frontend ont été repris après correction, puis les 77 contrôles et les captures refaits. Aucun contrôle d’échec supprimé pour obtenir ce résultat.
- Nettoyage final Supabase : commandes, articles, événements, clients, paiements, administrateurs, notifications et incidents **0** ; produits privés **3**, produits actifs/variantes/inventaire **0**. Advisors : **19 INFO RLS sans politique**, tables volontairement privées ; aucun accès public ajouté pour supprimer ces informations.

La recherche utilise une expression régulière échappée pour conserver les caractères saisis littéralement. Le remplacement initial ILIKE a été rejeté : PostgREST transforme aussi `*` en joker, même dans une valeur entre guillemets. Le comportement est confirmé par le [code officiel de PostgREST](https://github.com/PostgREST/postgrest/blob/main/src/library/PostgREST/Query/SqlFragment.hs) et vérifié sur les trois brouillons réels, sans créer de commande persistante.

## État des modules de la boutique

| Module | Statut et nature | Preuve | Blocage / travail restant |
|---|---|---|---|
| Architecture | Fonctionnalités transactionnelles testées ; boutique complète non validée | Recette SQL des commandes et opérations | Chaîne fournisseur/paiement/livraison complète absente |
| Catalogue | Trois brouillons privés réels ; non vendables | Livraison sourcing précédente et contrôles de base | Variantes, qualification et disponibilité à confirmer |
| Fournisseurs | Dossiers sourcés, connexion de commandes non réalisée | Registre Alibaba et devis en brouillon | Conditions réelles et autorisation d’envoi des demandes |
| Prix et marges | Hypothèses documentées ; rentabilité non validée | Dossiers produits/finance | Prix d’achat, transport et frais vérifiés manquants |
| Livraison | Bloquée | Absence de devis rendu/destination confirmée | Destination, modalités, tarifs et retours réels |
| Panier | Composants/parcours locaux testés | Suites frontend et recette responsive précédente | Achat connecté de bout en bout non validé |
| Paiement | Enregistrement atomique testé avec événements synthétiques | Recette transactionnelle précédente | Prestataire test connecté, refus et remboursements à valider |
| Commandes | SQL réel avec fixtures annulées ; interface peuplée simulée | Scripts de cette livraison | Aucune commande client réelle ni achat prestataire exécuté |
| Fulfillment | Suivi manuel borné ; intégration fournisseur non réalisée | Actions préparation/expédition/livraison testées | Traitement fournisseur et réallocation après incident |
| Emails | File consultable ; envoi non opérationnel | Notifications et compteurs réels | Worker, prestataire et délivrabilité à tester |
| Administration | Fonctionnelle et testée localement ; propriétaire non configuré | Recette finale 77/77 et connexion QA réelle supprimée | Adresse du compte propriétaire et création sécurisée |
| SAV | Notes/historique/incidents consultables ; remboursement bloqué | Recettes de notes et garde-fous | Workflow de retours/remboursements fiable |
| SEO | Travaux précédents, pas de nouvelle validation SEO exhaustive | Sitemap paginé et rapports existants | Produits confirmés et domaine de lancement |
| Sécurité | Contrôles admin/RPC vérifiés ; audit global non revendiqué | Révocation, contrôle du rôle, RLS et droits RPC | MFA et matrice fine de permissions non validés |
| Conformité | Documentation préparatoire ; validation bloquée | Rapport conformité existant | Identité du vendeur et données produit/pays réels |

## Exploitation et limites

Fichiers principaux : les trois pages `frontend/app/admin/(panel)/page.tsx`, `commandes/page.tsx`, `commandes/[id]/page.tsx`, types et `tests/AdminOrders.test.tsx` ; contrôleur/routes/validators commandes backend, repository `orders.ts`, services `admin-orders.ts` et `stats.ts`, middleware Auth/JWT et repository administrateurs. La migration canonique et les trois scripts de recette accompagnent les tests d’opérations, d’accès et de statistiques. Le script sourcing existant utilise désormais un compte QA actif temporaire pour respecter le contrôle d’accès renforcé. Le bandeau preview conserve son style, avec un texte qui ne prétend plus que les services privés sont déconnectés. Aucune dépendance ajoutée.

Le compte propriétaire n’est pas encore configuré : l’adresse email a été demandée dans la conversation. Ne communiquer aucun mot de passe ou clé secrète dans le chat. La recette utilise un compte QA privé temporaire, supprimé après contrôle ; ce compte ne doit pas être présenté comme l’accès propriétaire.

Les remboursements sont volontairement indisponibles (API 503) : l’ancien parcours n’apportait pas de garantie de reprise/idempotence suffisante. L’envoi de notifications est également indisponible ; les statuts affichés décrivent la file réelle, pas une preuve d’envoi. Aucune action ne marque artificiellement un paiement comme réussi.

Les incidents peuvent être consultés et documentés par note. Leur résolution, la réallocation du stock et l’envoi fournisseur ne sont pas automatisés ; une préparation bloquée reste bloquée. Le backend continue d’être nécessaire pour toutes les données privées ; aucune politique publique permissive ajoutée.

Le dashboard échoue explicitement si les lignes nécessaires à son agrégation sont tronquées par la limite Data API ou dépassent sa borne 5 000 ; une agrégation SQL adaptée au volume reste à prévoir. Les comptes `staff` conservent les droits opérationnels existants, sans matrice fine supplémentaire. L’authentification admin reste distincte de Supabase Auth client ; pas de MFA validé ici.

Cette livraison ne valide ni fournisseur, ni tarif de livraison, ni paiement/remboursement réel, ni email, ni vente. Aucun produit activé, message externe, achat, fusion dans main ou déploiement en production.
