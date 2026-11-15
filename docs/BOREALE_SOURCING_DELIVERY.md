# BORÉALE — liaison des candidats fournisseurs

Rapport finalisé le 16 novembre 2026. Exécutions du 15 novembre, état de base revérifié le 16. **APPROVED pour la liaison privée et l’administration de brouillons non vendables. BLOCKED pour ouverture commerciale.** Branche de livraison : master/operational-readiness ; base de code précédente7869563. Aucun déploiement en production, achat, message fournisseur ou publication produit.

## Résultat réel

Les trois dossiers BOR-ALI-20261114-01/02/03 sont enregistrés dans le même projet Supabase BORÉALE, luojeyfznonjnacftxbm (Paris), chacun relié à un produit interne inactif et non qualifié. Aucune variante, prix de vente, image autorisée, quantité de stock ou intégration logistique n’a été inventé. Les observations publiques datent du 14 novembre : elles ne sont pas des devis ni des prix actuels garantis.

Le registre sourcing/alibaba-candidates.json est distinct du registre historique BOR-CAND du13novembre. Aucun produit de démonstration Nid/Nuage/Bise n’est déclaré équivalent à ces références Alibaba. Les références fournisseurs, URL, date d’observation sans heure inventée, faits provisoires et preuves manquantes sont conservés.

## Implémentation

- Migration canonique20261115052055_boreale_sourcing_drafts : deux tables privées sourcing_candidates et sourcing_candidate_events, qualification produit et origine immuable. Fichier initial généré par CLI2.115.0 puis renommé à la version distante, contenu SHA-256 inchangé. Ne pas appliquer les migrations legacy ou le seed.
- RPC upsert_sourcing_candidate_draft : création/liaison atomique, verrou transactionnel par clé, réimports idempotents et historique append-only. Une erreur tardive annule le produit et son dossier. Un import identique ne crée pas d’événement supplémentaire.
- Routes admin GET/POST/PUT /api/admin/sourcing-candidates ; payload strict, provenance non substituable, erreurs utiles sans secrets. CRUD produit générique et base refusent activation/qualification des brouillons sourcés ; catalogue public, variantes et checkout refusent la qualification absente ou unverified.
- Administration /admin/sourcing, /nouveau et /[key] : liste réelle, sources et preuves, formulaire de métadonnées, origine existante en lecture seule. Produits sans variante : prix « Non renseigné ». Éditeur produit sourcé en lecture seule, lien dossier. Nouvelles variantes manuelles inactives ; stock omis conservé en édition, poids/titre inconnus non fabriqués. Navigation mobile complète défilable.

## Preuves et décisions de contrôle

| Contrôle | Résultat | Preuve |
|---|---|---|
| Backend global |219/219, exit0 | Reçu agrégé [validation](qa/BOREALE_SOURCING_VALIDATION.json), rapport brut sur D |
| Frontend global |119/119, exit0 | Même reçu ; inclut20 cas admin sourcing |
| Lint | Backend0 erreur/0 warning ; frontend0 erreur/24 warnings préexistants | Reçus globaux sur D |
| Types / compilation | Backend tsc et build réussis ; frontend webpack/types et génération34/34 réussis | Six étapes finales exit0 |
| PostgreSQL réel | RPC, répétition, histoire, origine/qualification, droits anon/client, erreur tardive et rollback réussis ; fixtures restantes0 | backend/scripts/verify-sourcing-drafts.sql exécuté dans une transaction annulée |
| API + base réelle |26 contrôles réussis | [Reçu API](qa/BOREALE_SOURCING_API_RESULTS.json) |
| API + navigateur compilé |42 contrôles réussis au total :26 API repris +16 interface, PC1440×900/mobile390×844 ; zéro exception JS | [Reçu combiné](qa/BOREALE_SOURCING_UI_RESULTS.json) |
| État final Supabase |3 dossiers,3 produits liés inactifs,3 événements ;0 variante/inventaire/commande/paiement/client ;25 tables publiques RLS | [État revérifié](qa/BOREALE_SOURCING_DB_STATE.json) |

La concurrence réelle est testée par six POST simultanés par candidat (18 requêtes), répétés sans doublon ni nouvel événement. Les essais d’activation générique retournent409 avant toute variante ou stock écrit. Les détails publics retournent404 et le catalogue réel reste vide. Le garde checkout fermé retourne503 sans création de commande.

Les tests navigateur utilisent une session admin signée éphémère, uniquement sur loopback, et les vraies réponses API/base. **Ce n’est pas un login du propriétaire : aucun compte administrateur exploitant n’existe encore dans la base.** Aucune clé privée ni jeton n’est imprimé ou conservé dans les reçus. Le script charge un fichier sécurisé indiqué par BOREALE_ENV_FILE, force la fermeture du checkout et désactive les clés paiement/email pour la recette. Aucun achat/paiement ni envoi d’email testé. Ce n’est pas une validation Safari/Firefox ou appareil physique.

Quatre captures lues par le chef : admin-sourcing-1440/390 et admin-source-detail-1440/390, dans D:/CodexTools/BorealeAudit-20261114/evidence/sourcing. Certaines captures du formulaire montrent sa fin après la sauvegarde. Le mode preview du storefront reste distinct de la connexion réelle de cette administration ; le bandeau preview générique existant ne sert pas de preuve de connexion.

Revues indépendantes SQL, backend et UI : deux défauts rejetés puis corrigés (variantes manuelles actives par défaut, diagnostic RPC effacé). L’API britannique .co.uk et les bornes SQL/API ont aussi été alignées et les trois vrais dossiers testés. Dernières corrections navigation/origines readonly testées par auteur, relues par le chef puis exercées dans la recette réelle. Aucun agent n’a déclaré sa propre livraison globalement approuvée ; décision finale du chef après intégration.

Advisors :19 notices INFO rls_enabled_no_policy, dont les deux nouvelles tables volontairement privées ; pas de policy publique permissive ajoutée. [Documentation du diagnostic Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Les grants et RLS ont été contrôlés séparément, conformément à la [documentation de sécurisation de l’API](https://supabase.com/docs/guides/api/securing-your-api).

## Reproduction et limites

Code et preuves actuels sur D:/CodexTools/BorealeAudit-20261114/checkout, C: saturé et original conservé. Rapports bruts dans evidence/sourcing du dossier d’outils. Scripts : verify-sourcing-drafts.sql et verify-sourcing-live.mjs sous backend/scripts. Le second démarre une API loopback4001, utilise un secret de session QA aléatoire et s’arrête en fin de recette. Pour l’UI : compiler le frontend en preview avec NEXT_PUBLIC_API_URL=http://127.0.0.1:4001, démarrer sur3103 et fournir BOREALE_ADMIN_UI_URL ainsi que le module/binaire Playwright externe. Aucun paquet ajouté à l’application.

La recette publique responsive300/300 de la tranche précédente est historique et n’a pas été refaite ; ses composants publics/styles sont inchangés. Les écritures multiples du CRUD produit générique restent non atomiques hors dossiers sourcés. Le middleware admin historique vérifie le jeton sans relire le compte à chaque requête : durcissement restant, aucune session propriétaire réelle validée. La qualification commerciale et la promotion de ces brouillons ne sont pas disponibles dans cette tranche ; elles nécessitent un workflow de preuves et d’approbation, pas une modification manuelle de statut.

## Suite et décisions requises

Trois [demandes de devis](BOREALE_SUPPLIER_RFQS.md) prêtes, non envoyées. Envoi interdit sans accord explicite et accès au compte Alibaba approprié. Destination/code postal, budget/quantité et choix lot ou livraison unitaire restent à préciser. Aucun prix de vente, marge ou coût livré ne peut être validé sans ces données et les confirmations fournisseur.

Sous responsabilité agent : workflow de qualification avec preuves, intention checkout idempotente, remboursements atomiques/monotones, transitions admin, worker outbox et contrôle d’accès admin. Dépendances externes : fournisseur exploitable, variantes/stock/droits/conformité, transport/retours, comptes paiement/email de test, identité exploitant et provisionnement sécurisé du compte propriétaire. Le GOAL global reste ouvert ; ce rapport ne valide aucune vente.
