# Décision de lancement

## Décision du 14 novembre — ventes toujours fermées

**APPROVED, périmètre technique borné :** fondation Auth/RLS et transactions commande/règlement. Nouvelle migration appliquée au même projet, aucun doublon. Recettes Supabase réelles 32/32 par le chef et 32/32 indépendants ; backend 174/174. Fixtures nettoyées, aucune donnée commerciale fictive persistante.

**BLOCKED pour lancement :** aucun achat Stripe complet, fournisseur exploitable, transport réel, réception email, catalogue vendable ou dossier juridique finalisé. Checkout durable, remboursements atomiques et worker outbox restent à développer. Le statut `ready` ne vaut pas validation fournisseur/logistique.

Le rapport courant et la matrice des 15 modules sont dans `BOREALE_TRANSACTION_DELIVERY.md`. Les sections plus anciennes ci-dessous sont historiques et ne remplacent pas cette décision. Aucun déploiement storefront, achat, campagne, publication ou message externe autorisé par cette validation.

## Mise à jour — premier projet Supabase opérationnel pour la fondation

Le propriétaire a autorisé la création après constat d’une organisation vide. Projet boreale luojeyfznonjnacftxbm, Paris, coût annoncé0/mois, état actif. Connexion sécurisée locale et bootstrap19tables RLS réellement appliqués. Deux exécutions indépendantes de29contrôles Auth/RLS réussies et comptes QA nettoyés. Recette HTTP locale Auth/profil/refresh/logout11contrôles réussie. Backend129/129, compilation/lint réussis.

Les anciens statuts d’identification bloquée sont historiques. Auth/profils/RLS et connexion locale sont APPROVED dans ce périmètre ; les ventes restent BLOCKED. Aucune recette Stripe, fournisseur, fulfillment, transaction commande durable ou email réellement reçu n’est démontrée. Aucun produit ni stock ajouté. Voir BOREALE_SUPABASE_CONNECTION.md.

## Évolution — missions complémentaires

| Périmètre | Décision actuelle | Preuve | Limite |
|---|---|---|---|
| Recherche produits autonome | APPROVED comme dossier préparatoire | Trois candidats, deux offres comparées chacun, sources primaires recoupées, JSON contrôlé | Aucun produit déclaré vendable/rentable prouvé |
| Identification Supabase | BLOCKED | Appel compte Boreale retourne projects:[] | Autoriser visibilité du projet existant ou fournir URL dashboard non secrète pour contrôle ciblé |
| Supabase Auth | Développé et testé avec mocks, non activé | Tests/Auth et isolation locale | Projet, profils/FK, RLS et confirmation email réelle non vérifiés |
| Sitemap live | APPROVED correction locale | Pagination50, 6 tests sitemap/preview passent | Production et catalogue distant non testés |

L’autorisation Supabase est maintenant donnée ; l’ancienne mention « accès interdit » dans les historiques est dépassée. Aucun autre projet n’est créé. Les ventes restent fermées et le design est conservé.

**BLOCKED — ventes non autorisées.** Une page de préouverture existe ; ce n’est pas une boutique opérationnelle.

Les quinze modules du rapport final seront évalués séparément : architecture, catalogue, fournisseurs, prix/marges, livraison, panier, paiement, commandes, fulfillment, emails, administration, SAV, SEO, sécurité, conformité.

Classification obligatoire : fonctionnel et testé localement ; développé non testé ; simulé ; bloqué ; non réalisé. Une validation locale ne vaut pas validation de production.

Avant ouverture : produits vérifiés, coûts complets, destinations/retours, documents vendeur, services de test puis parcours complet, audit indépendant, autorisation explicite de production. Aucun objectif financier réel n’est déclaré avant obtention des coûts et du régime fiscal.

## Matrice de livraison du 13 novembre

| Module | Statut chef | Réalité et preuve | Blocage restant |
|---|---|---|---|
| Architecture | REJECTED globale | Développée, tests locaux ; audit01 | Transactions commande/paiement non démontrées |
| Catalogue | BLOCKED | Preview simulée, audit03 ; UUID/SKU présents dans schéma | 0 produit validé, seed non exploitable tel quel |
| Fournisseurs | BLOCKED | 39 lignes CSV, 20 noms candidats, 0 coûts rendus confirmés ; audit04 | Devis, variantes, conformité, stock et modèle fulfillment |
| Prix et marges | BLOCKED réelle | Modèle 3 scénarios hypothétiques dans BOREALE_FINANCE | Coûts, taxes et prix approuvés manquants |
| Livraison | BLOCKED | Rejet local des destinations hors métropole développé | Aucun contrat/coût/délai confirmé ; grille existante indicative |
| Panier | APPROVED partiel | Régression checkout 4 tests ; design conservé | Drawer/promo quantité et mobile complet à terminer |
| Paiement | BLOCKED externe | Payload/remises, montant/devise, liaison tests simulés | Paiement sandbox non exécuté, idempotence durable |
| Commandes | APPROVED isolation locale seulement | AG10 ownership6/6, checkout14/14 | DB réelle, transactions, historique user_id |
| Fulfillment | BLOCKED | Procédure manuelle proposée BOREALE_OPERATIONS | Mapping fournisseur, multicolis, affectations absents en code |
| Emails | BLOCKED | Templates développés, pas de réception réelle | Domaine/prestataire, preuve envoi et reprise |
| Administration | REJECTED globale | Back-office développé ; BOREALE_ADMIN_SAV | Accès réel non testé, transitions/RBAC à renforcer |
| SAV | BLOCKED | Procédure documentée, pas de workflow ticket complet | Responsables, adresse retours, circuit réel |
| SEO | REJECTED live | Preview/launch présents ; BOREALE_MARKETING | Sitemap live, URL finale et performance mobile à contrôler |
| Sécurité | APPROVED correctifs bornés | Secrets production et ownership audités AG10 | Pas de scan exhaustif ni preuve DB/production ; risques historiques/admin |
| Conformité | BLOCKED | Sources officielles consultées ; BOREALE_COMPLIANCE | Exploitant, fiscalité, produits et rétractation en ligne |

## Décisions précises du propriétaire

1. Connecter le bon compte Supabase puis autoriser explicitement une recette DB isolée ; aucun secret en conversation.
2. Choisir stock propre, prestataire ou expédition directe ; budget d’échantillons et assortiment initial.
3. Valider offres fournisseur exactes, pays desservis, origine expédition et lieu de retours après preuves.
4. Fournir identité/régime vendeur et coordonnées professionnelles par les canaux appropriés.
5. Autoriser ultérieurement les connexions de test et, séparément, toute prise de contact, achat ou production.

Aucune de ces décisions n’est remplacée par une hypothèse financière ou une réussite de test simulé.
