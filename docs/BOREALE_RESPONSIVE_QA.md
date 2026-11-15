# BORÉALE — recette responsive du 15 novembre 2026

Décision chef : **APPROVED pour l’affichage et le parcours UI anonyme en preview**. Le GOAL commercial reste ouvert et les ventes fermées. Branche de livraison autorisée : master/operational-readiness, origine https://github.com/tisnooh/Boreale.git. Aucun déploiement en production, achat, commande réelle, message externe ou modification de base dans cette tranche.

## Preuves finales

- Reçu machine versionné : [300 contrôles](qa/BOREALE_RESPONSIVE_RESULTS.json). Les 300 noms sont uniques, toutes les assertions sont passed ; sept écrans terminés, zéro échec, zéro exception JavaScript et zéro tentative d’écriture inattendue.
- Chromium159.0.8154.6, émulation viewport uniquement :320×740,390×844,768×1024,1024×768,1280×800,1440×900,844×390. Pas de test sur appareil physique, Safari ou Firefox ; aucune performance de chargement validée.
- Parcours par les vrais liens : accueil, collections, fiche Nuage, ajout panier, quantité, fermeture du drawer, panier détaillé, checkout rempli, compte, suivi, FAQ, contact et été. Chaque destination attend son titre propre ; checkout exige le vrai formulaire. Contrôles largeur, images visibles chargées, actions header, menu défilable/paysage, focus, Tab/Shift+Tab, Escape et restauration du défilement.
- Chef : reçu JSON relu et neuf captures examinées. Images conservées hors dépôt dans D:/CodexTools/BorealeAudit-20261114/evidence/responsive : accueil390/768/1440, checkout390/768/1440, panier-mobile, menu-paysage, ete-1280.
- Vitest : rapport complet99/99 assertions passées, zéro attente/échec,17 fichiers terminés, compteur agrégé45/45 suites, success=true. Le lanceur a été interrompu juste après émission du rapport complet ; son code d’interruption n’est pas présenté comme un exit0. Ces données ont été recoupées indépendamment.
- ESLint global : exit0,124fichiers, zéro erreur/fatale,24avertissements préexistants. scripts/** est exclu de ce lint ; le script bénéficie de node --check et d’une revue séparés.
- Build webpack complet sur D : exit0, TypeScript réussi, génération32/32. Avertissements Next internes Edge Runtime et middleware déprécié conservés. Aucun paquet ajouté à l’application.
- Revue indépendante :16fichiers du diff approuvés ; harness client approuvé séparément. Empreintes C↔D identiques12/12 pour sept sources, trois tests et deux polices. L’auditeur n’a pas exécuté un second passage navigateur ; le passage300/300 est exécuté et contrôlé par le chef.

## Corrections et fichiers

| Défaut constaté | Correction | Fichiers |
|---|---|---|
| Compte/panier hors écran sur mobile, largeur454px sur390 | Wrapper de visibilité saisonnier, espacement mobile adapté | Header.tsx |
| Navigation été1098px sur1024 | Menu compact jusqu’au seuil1280 | Header.tsx |
| Menu paysage finissant à446px sur390 | Hauteur disponible calculée avec offset du bandeau, défilement interne, recalcul resize/scroll | Header.tsx |
| Colonne accueil664px sur390 | Grille mobile explicite et min-width0 | Cover.tsx |
| Drawer fermé encore tabulable, focus/scroll mal restaurés | inert, confinement clavier, Escape, restauration du focus et de l’overflow précédent | CartDrawer.tsx |
| Quantité réinitialisant le focus ; double verrou de défilement | Callbacks stables et un seul propriétaire du verrou | use-cart.tsx |
| Titre masqué en mouvement réduit | État statique explicite des line-mask | globals.css |
| Build dépendant de téléchargements Google | Mêmes fichiers Fraunces/Inter copiés du build précédent, next/font/local et licences OFL | app/layout.tsx, app/fonts/ |
| Trois chemins preview sans fichier | Placeholder BORÉALE déjà existant, sans inventer de photo | lib/catalog/preview-data.ts |

Tests : header-preview, cart-drawer-accessibility et cart-drawer-provider. Le rejet initial de l’auditeur sur les callbacks instables et le double verrou a été corrigé puis retesté avec le vrai provider. Le design, les couleurs et les images existantes sont conservés ; aucune refonte. L’identité historique des anciens binaires Google repose sur la provenance consignée dans app/fonts/README.md : le cache d’origine n’était plus disponible pour la contre-vérification indépendante finale.

## Nature de la simulation

Catalogue et panier de démonstration locaux. GET /api/me et POST /api/auth/refresh sont isolés en401 (14 appels consignés), les autres écritures sont bloquées et signalées. Cela ne valide ni Auth réel, ni prix serveur, livraison réelle, paiement, commande DB, emails ou fournisseur. Aucun formulaire de commande soumis. Les navigations client sont vérifiées ; les rechargements directs des autres routes ne le sont pas dans ce passage. Le probe cold checkout séparé utilise une fixture QA locale et ne prouve pas une vente.

## Incidents de validation conservés

Le passage antérieur185contrôles/six tailles a signalé quatre anomalies : images absentes, débordement été1024, menu paysage et appels automatiques de refresh comptés comme mutations. Les causes sont corrigées ou explicitement isolées dans le harness.

Sur D, un premier passage29contrôles/2échecs s’est arrêté sur l’attente60s du main checkout ; la capture montrait le chargement. Un second passage4contrôles/2échecs attendait DOMContentLoaded de l’accueil alors qu’une capture montrait l’accueil affiché. Un probe distinct a rendu le vrai formulaire checkout320px, documentcomplete et main320px, sans exception ni ressource cassée. Une exécution intermédiaire interrompue pour corriger un sélecteur avant assertions n’est pas comptée. Le passage final attend commit puis l’interface spécifique et suit les liens clients ; budget fonctionnel local120s, sans seuil de performance. Ces changements ont été relus indépendamment et n’ont supprimé aucun contrôle de mise en page ou d’interaction.

## Environnement et reprise

C: saturé (zéro octet libre au constat), environ3,5Go de RAM totale. Build/lint sur C ont échoué par ENOSPC et ne sont pas comptés comme réussis. Deux suppressions de caches avaient été refusées par l’approbation automatique (« blocked by policy ») ; aucune action n’a contourné ce refus. Les contrôles ont été réalisés sur une copie de travail sur D, avec dépendances existantes, sans copier de secrets.

Copie de livraison : D:/CodexTools/BorealeAudit-20261114/checkout. Même historique de base ba6e069, même branche et même origine. Les journaux et la recette actuels sont sur D ; la copie C conserve ses modifications non committées et son ancien checkpoint. Ne pas confondre les deux. Aucun reset destructif de C effectué.

Preuves hors dépôt : evidence/tests.json, lint.json, build.log, validation.json et responsive/. Paquet playwright-core installé hors application ; navigateurs et fichiers temporaires sur D. Pour reproduire, démarrer le frontend compilé en preview sur3102, fournir BOREALE_PLAYWRIGHT_MODULE, PLAYWRIGHT_BROWSERS_PATH, TEMP/TMP et BOREALE_AUDIT_OUTPUT vers des dossiers d’outils, puis exécuter frontend/scripts/verify-responsive.cjs depuis frontend. Les helpers start-preview.cjs et run-audit.cjs sur D conservent la configuration utilisée.

La publication de code est limitée à la branche dédiée. Les fichiers AGENTS.md/CLAUDE.md générés, caches, dépendances, captures et secrets sont exclus du commit. [État des quinze modules et décisions restantes](BOREALE_LAUNCH_READINESS.md).
