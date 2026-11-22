# BORÉALE — préparation email, 17 novembre 2026

## Livré

Le worker transactionnel existant `backend/src/services/order-notifications.ts` est conservé. Le nouvel outil `backend/scripts/verify-email-readiness.mjs` contrôle sa configuration sans appeler le worker, sans lecture de commande et sans envoi. Il n'active jamais les notifications.

Depuis `backend`, exécuter `node scripts/verify-email-readiness.mjs`. La configuration provient de l'environnement puis des fichiers privés existants `.env.local` et `.env.email.local`, jamais affichés. Ne pas enregistrer de secrets dans Git. Les variables utilisent les noms existants : `EMAIL_API_KEY`, `EMAIL_FROM`, `ORDER_EMAIL_MODE`, `ORDER_EMAIL_TEST_RECIPIENTS`.

Le contrôle distingue la présence de clé, un expéditeur valide, une liste explicite de destinataires de test (maximum 20), l'accès de lecture aux domaines et la vérification du domaine exact de l'expéditeur. Seuls des GET Resend sont possibles : liste de domaines puis détail du domaine correspondant. Une liste paginée incomplète ne prouve pas l'absence du domaine. Les diagnostics privés, adresses destinataires, valeurs DNS et secrets ne figurent pas dans le résultat. Le nombre de lignes DNS non vérifiées est disponible lorsque la lecture du domaine aboutit. Par prudence, toute ligne DNS non vérifiée maintient le verdict bloqué, y compris un éventuel enregistrement de réception facultatif : un administrateur doit alors examiner le domaine.

Sources API officielles consultées : [liste des domaines](https://resend.com/docs/api-reference/domains/list-domains), [détail d'un domaine](https://resend.com/docs/api-reference/domains/get-domain).

## Preuves fraîches

- `node --test scripts/verify-email-readiness.test.mjs` : **8 tests réussis**, zéro échec. Réponses Resend simulées explicitement ; aucun accès prestataire dans ces tests.
- Exécution locale réelle : **BLOCKED / sender_domain_required**, `mode=off`, clé absente, expéditeur invalide/non configuré, zéro email et zéro mutation. Aucun appel domaine n'est tenté dans cette configuration. Le processus Node utilise le code 2 en cas de blocage ; le lanceur shell peut le normaliser à 1.
- Scénarios couverts : clé absente sans appel, destinataire manquant, injection d'en-tête, exception contenant un secret, domaine vérifié sans preuve de remise, DNS en attente, envoi désactivé, refus d'accès, pagination et réponse malformée.

## Dépendances restantes

L'expéditeur et son domaine doivent être choisis et configurés dans le stockage privé ; la clé doit autoriser la lecture des domaines pour ce préflight. Une clé limitée à l'envoi peut fonctionner pour le worker tout en laissant ce contrôle de domaine bloqué : un refus de lecture ne signifie pas que le domaine n'existe pas.

Aucun destinataire de recette n'est actuellement vérifié par cette configuration. Une adresse explicitement autorisée doit figurer dans `ORDER_EMAIL_TEST_RECIPIENTS` avant une recette réelle. L'outil ne demande aucune clé dans la conversation et ne sollicite aucun destinataire réel.

`DOMAIN_VERIFIED` signifie uniquement que les réponses de lecture confirment le domaine et son état DNS. **Ce n'est ni une preuve d'envoi, ni une preuve de réception.** Le worker garde son mode existant, y compris `off`. L'envoi réel, le retour prestataire et la réception dans la boîte autorisée restent à recetter séparément. Les notifications d'expédition/remboursement et la réception administrateur ne sont pas déclarées terminées par ce préflight.

Verdict proposé au chef : outil local testé, intégration et délivrabilité réelles **BLOCKED**. Revue indépendante encore requise ; aucun fichier de configuration, schéma, frontend ou route d'administration modifié.
