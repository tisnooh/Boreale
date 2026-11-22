# Administration, emails et SAV — audit AG09

2026-11-13. Inspection locale ; aucune base ni compte de service contacté. Résultats soumis au chef et à l’auditeur indépendant, aucune acceptation opérationnelle autonome.

## Fonctions présentes dans le code

- Routes administration protégées par JWT admin (`backend/src/routes/index.ts`), authentification et limiteur de login.
- Écrans commandes, produits, clients, promotions, messages et newsletter dans `frontend/app/admin/(panel)`.
- Détail commande avec paiement et événements ; prix et adresse historiques dans les snapshots.
- Messages de contact enregistrés et marquage « traité » (`contactRepo`, `adminController.markMessageHandled`). Pas de gestion complète de tickets avec responsable, échéance, réponse et historique des échanges.
- Templates confirmation, reçu, expédition, remboursement et notification admin (`backend/src/services/email.ts`). Leur existence ne prouve pas la réception d’un email.

## Défauts et limites

| Sujet | Preuve | Risque / action |
|---|---|---|
| Propriété des commandes | `services/auth.ts:register` émet une session sans vérification email ; ancien `controllers/checkout.ts:getById/myOrders` utilisait aussi l’email | Un compte nouvellement créé pouvait accéder aux commandes invitées de la même adresse. Correction locale AG09 : propriété strictement `user_id`, suppression fusion par email, tests HTTP. Vérification chef/AG10 requise. |
| Attribution à la création | `services/checkout.ts`, ancien `findUserByEmail` | Ne pas rattacher un achat invité à un compte sur simple email non vérifié. Le chef traite ce chemin distinct. Le correctif de lecture ne suffit pas si les nouvelles commandes sont attribuées incorrectement. |
| Suivi invité | `ordersController.lookup`, `ordersRepo.getByNumberAndEmail` | Numéro de commande + email donnent le DTO complet. Pas de jeton dédié et limiteur spécifique absent à cette route : secret de suivi plus fort ou accès vérifié à prévoir. Ne pas prétendre isoler tout accès invité avec le seul patch `user_id`. |
| Désactivation d’un admin | `middleware/auth.ts:requireAdmin`, `lib/jwt.ts`, `authService.adminLogin` | `is_active` vérifié au login seulement ; JWT admin valide 12 h. Révocation/suspension durable à vérifier en base de test ; aucune preuve de révocation immédiate. |
| Rôle staff | Toutes routes admin utilisent `requireAdmin` | Aucun contrôle distinct admin/staff pour remboursement ou campagne. Définir les pouvoirs réels avant exploitation ; ne pas annoncer un RBAC fin inexistant. |
| Statuts manuels | `controllers/admin.ts:setOrderStatus` | Transition vers paid manuelle et expédition sans preuve transporteur dans le code audité. Exiger preuve paiement et suivi confirmé ; correction/contrôle chef requis. |
| Remboursement | `controllers/admin.ts:refundOrder` | Appel Stripe sans clé d’idempotence persistante ; nouvelles tentatives et concurrence non démontrées. Le webhook règle les statuts ; aucune recette Stripe/DB réelle effectuée. |
| Emails | `services/email.ts:sendEmail` | Sans configuration : `delivered:false`. Avec API sans erreur : requête acceptée par Resend, pas une preuve de réception, ni livraison boîte finale. Pas de journal durable/reprise démontrés pour chaque notification. |
| Relance panier | `controllers/misc.ts:cronController.abandonedCarts` | `markSent` appelé même si `delivered:false` ; échecs perdent la reprise. Consentement et droit d’opposition à résoudre avant activation. |
| Contact | `contactController.submit` | Enregistrement en base puis notification best effort ; le message API « envoyé » ne prouve pas réception par l’équipe. Le back-office reste la source des demandes à traiter. |

## Procédure d’exploitation à valider

Chaque jour, un responsable nommé consulte les commandes payées, paiements sans commande, expéditions à échéance, remboursements demandés et messages non traités. Il affecte à chaque dossier une prochaine action et une échéance dans le registre prévu par `BOREALE_OPERATIONS.md`.

Avant de marquer « traité », conserver la demande, la réponse préparée, le résultat de l’action et sa preuve. Aucun message externe n’est envoyé dans cette mission. Une demande de retour conserve numéro de dossier, commande/lignes/quantités, motif, décision, conditions de retour, preuve réception et référence de remboursement. Ne pas déclencher un remboursement réel sans autorisation.

## Recette requise avant ouverture

1. Session client A ne lit aucune commande B, y compris mêmes emails non vérifiés ; administrateur et propriétaire conservent leurs accès légitimes.
2. Inscription utilisant l’email d’un invité ne rattache aucune commande historique ou future sans preuve d’identité.
3. Désactivation admin et séparation des rôles vérifiées dans l’environnement isolé.
4. Commande test suivie par l’administration, expédition avec preuve, incident, retour et remboursement test sans modification directe de la base.
5. Emails réellement reçus et contenus vérifiés ; échec prestataire enregistré et rejouable sans doublon.

**État : développé partiellement ; exploitation et réception emails BLOCKED par absence de recette des services et données réelles.**
