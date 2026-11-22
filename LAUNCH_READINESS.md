# Préparation à l’ouverture BORÉALE

**Verdict commercial — OUVERTURE BLOQUÉE.** Le site public sert la page d’attente. Le panier et le checkout renvoient vers l’accueil. [Vitrine publique](https://boreale-eight.vercel.app)

| Domaine | Statut | Preuve | Blocage |
|---|---|---|---|
| Frontend | NO GO | Catalogue connecté isolé des données démo et mode d’attente vérifié en production | Recette sur une API HTTPS connectée et vérification des sessions |
| Backend | NO GO | Tests locaux de l’API et des contrôles d’ouverture | Aucun projet API BORÉALE distinct dans l’équipe Vercel accessible. Configurer le runtime, puis vérifier /api/health et des routes dépendant de Supabase |
| Supabase | GO schéma | Projet BORÉALE actif, 7 migrations appliquées, RLS sur 29 tables publiques | Initialisation administrateur sécurisée et recette du runtime hébergé encore nécessaires |
| Stripe | NO GO | Compte sandbox vérifié par le connecteur. Préflight serveur : runtime_key_missing. Aucun webhook sandbox | Installer la clé sandbox dans le runtime privé et signer le webhook de l’API de test. Exécuter un achat complet |
| Emails | NO GO | Aucun accès Resend ni clé d’envoi détectés. Tests locaux des notifications | Domaine expéditeur vérifié, accès Resend et test de réception |
| Produits | NO GO | 3 brouillons fournisseur inactifs en base. 5 fiches prioritaires privées dans le dépôt | Référence exacte, approvisionnement et conformité à confirmer. Aucun produit actif ou vérifié |
| Images | NO GO | Galerie testée localement. Aucune photographie de variante approuvée pour la vente | Images du modèle exact et droits écrits, dont le troisième visuel Nuage |
| Stock | NO GO | 0 variante et 0 ligne de stock dans Supabase | Disponibilité réelle par variante et procédure de mise à jour |
| Livraison | NO GO | Tarifs de recette historiques et affichage de délai à confirmer | Frais livrés, destination, date ou délai, suivi et traitement des retours |
| Juridique | NO GO | Projets de CGV et politique de retours corrigés | Identité et contacts vendeur, médiateur, adresse et formulaire de retour, parcours de rétractation en ligne, fiscalité et conformité produit. [Service Public Entreprendre](https://entreprendre.service-public.gouv.fr/vosdroits/F33527) |
| Sécurité | NO GO commercial | RLS et droits vérifiés, tests locaux d’autorisation et de refus du checkout | Vérifier les cookies Safari, CORS de l’API hébergée, secrets du runtime et procédure de sauvegarde/restauration |
| Mobile | NO GO commercial | Tests de galerie et de navigation en cours de recette | Achat complet sur iPhone à vérifier avec API et Stripe test |

## Corrections et priorités

| Priorité | Responsable | Correction livrée ou résultat attendu |
|---|---|---|
| P0 | Backend et chef | Le checkout réel exige une activation générale, une approbation live explicite, une configuration Stripe et un expéditeur d’emails transactionnels valide. L’environnement test reste indépendant de l’autorisation live. |
| P0 | Frontend et chef | Vercel Production refuse le catalogue démo, le mode connecté hébergé exige deux origines HTTPS et la source catalogue n’exécute la démo qu’en mode preview. |
| P0 | Supabase et chef | La confirmation d’inscription revient vers l’origine publique prévue, y compris lorsque CORS autorise plusieurs origines. |
| P0 | Propriétaire et chef | Rendre les secrets sandbox/Resend disponibles dans le runtime sécurisé et valider l’identité commerciale. Préparer ensuite la recette réelle. |
| P0 | Sourcing et propriétaire | Qualifier une variante, sa livraison, ses retours, ses visuels et ses justificatifs avant activation. |
| P1 | Frontend et QA | Miniatures et balayage, rail mobile, messages client et retrait des promesses commerciales non confirmées. |

## Recette à consigner

Les scénarios fournisseur, Stripe sandbox, Resend, expédition et iPhone réel exigent une preuve distincte. Les tests automatisés locaux couvrent notamment la galerie, la séparation du catalogue, les protections d’accès, les stocks insuffisants, les codes de réduction et les transitions de paiement simulées.
