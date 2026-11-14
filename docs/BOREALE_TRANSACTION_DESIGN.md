# Commandes et règlement atomiques — tranche du 14 novembre 2026

Migration additive : `backend/supabase/bootstrap/migrations/20261114033519_boreale_order_payment_atomic.sql`.
Créée par `supabase migration new` CLI 3.1.0 après consultation de son aide. Aucune exécution
distante par l’auteur SQL. Après sa livraison, le chef a appliqué la migration après revue indépendante,
puis chef et auditeur ont chacun exécuté 32 contrôles DB réussis. Voir `BOREALE_TRANSACTION_DELIVERY.md`.
Le nom local est aligné sur la version distante. Les sections de conception ci-dessous décrivent le contrat SQL.

## Contrats

`public.create_order_atomic(p_input jsonb) returns public.orders` accepte l’objet
`NewOrderInput` camelCase du dépôt : `customerId`, `userId` nullable, `email`, `currency`
(trois lettres majuscules), `subtotalCents`, `discountCents`, `shippingCents`, `totalCents`,
`shippingMethod`, `discountCode` nullable, `shippingAddress`, `stripeSessionId` optionnel,
`items`. Chaque ligne utilise les noms SQL : `variant_id`, `sku`, `product_name`,
`variant_title`, `unit_price_cents`, `quantity`, `total_cents`, `image_url`.

Entre une et cent lignes ; montants et quantités entiers JSON, non négatifs et dans la plage
integer. Quantités strictement positives. Les totaux lignes, leur somme et le total final
sont contrôlés. Client, email et éventuelle identité Auth sont cohérents. Les FK variantes
doivent exister. Commande, lignes et événement initial sont insérés dans la même transaction.
Le caller backend reste responsable des prix courants, de la disponibilité commerciale,
des destinations et de la validation complète de l’adresse ; ce RPC n’est pas public.
Une relance de création sans identifiant idempotent crée une autre commande pending :
la déduplication des clics checkout n’est pas couverte par ce RPC.

`public.settle_order_payment(p_event_id text, p_session_id text, p_payment_intent_id text,
p_amount_cents integer, p_currency text) returns jsonb` possède **cinq paramètres**.
Le contrôleur doit avoir vérifié la signature Stripe et l’état effectivement payé.
Montant/devise proviennent de cet événement vérifié, jamais du navigateur.

Réponse : `{ "order_id": "uuid", "duplicate": false,
"fulfillment_status": "ready", "incident_code": null }`.
`ready` signifie uniquement que le stock interne a été alloué. Cela ne confirme ni
fournisseur, ni préparation, ni transporteur, ni expédition. `blocked` impose une revue
opérationnelle avant toute promesse de traitement. Le statut paiement reste conservé.

`public.cancel_pending_order(p_order_id uuid, p_reason text) returns boolean` traite
l’expiration et l’échec asynchrone. Il prend le même verrou commande `FOR UPDATE`, puis
annule uniquement si le statut reste `pending` et qu’aucun règlement durable n’existe.
Annulation et événement `order_cancelled` sont atomiques. Un retour `false` signifie
commande absente ou non annulable : le caller ne doit pas forcer ensuite une annulation
ou une dégradation du paiement. Motif requis, limité à 200 caractères ; RPC service-role.
Paiement gagnant la course : l’annulation retourne false. Annulation gagnante : le paiement
ultérieur est conservé avec incident et traitement bloqué.

## Transaction de règlement

1. Verrou exclusif de la commande trouvée par la session Stripe. Absence ou montant/devise
   incohérents lèvent une exception et annulent toute écriture, afin de permettre la reprise.
2. Journal durable `payment_webhook_events` par identifiant événement. Une réutilisation avec
   des paramètres différents échoue. Un événement déjà connu ou un autre événement de la
   même session retrouve `order_payment_settlements` et ne répète aucun effet métier.
3. Besoins agrégés, puis boucle par UUID croissant : chaque quantité est lue dans le même
   `SELECT ... FOR UPDATE` qui verrouille sa ligne. Une ligne absente devient immédiatement
   une rupture pour cette tentative, même si elle est ajoutée pendant la transaction.
   L’allocation utilise exclusivement la liste des lignes effectivement verrouillées et
   vérifie le nombre de lignes modifiées. Si une ligne manque ou est insuffisante, aucun
   stock n’est consommé.
4. Paiement réellement reçu conservé dans `payments`, commande payée si pending/cancelled,
   journal de règlement, consommation du code promo, conversion panier et événement commande
   enregistrés atomiquement. Un paiement après annulation est enregistré avec incident.
5. Incident durable avec responsable `operations`, prochaine action et détails en cas de
   stock insuffisant, lignes manquantes, état inattendu ou code promotion introuvable.
   Dépassement de quota d’une promotion payée : compteur réel et incident séparé, sans
   facturation supplémentaire du client ni double comptage lors d’un rejeu.
6. Trois notifications durables en outbox : `confirmation`, `receipt`, `admin`, avec unicité
   `(order_id,type)`. Aucun email n’est envoyé dans SQL. Le futur worker doit adapter son
   message à `fulfillment_status` et `incident_code`, puis gérer reprise et déduplication
   fournisseur d’email. La présence d’une outbox n’est pas une preuve de délivrabilité.

Tout échec SQL remonte au caller ; aucune exception n’est avalée dans les fonctions.
Les tables sont RLS sans policy client. Les fonctions sont `SECURITY INVOKER`,
`search_path=''`, relations qualifiées, EXECUTE uniquement `service_role`. Le journal
et le règlement n’ont pas de droits UPDATE/DELETE service-role : ce sont des preuves
persistantes, pas des données effaçables par un simple nettoyage applicatif.

## Recette SQL réelle à exécuter indépendamment

Préférer une base test dédiée ou une transaction extérieure `BEGIN ... ROLLBACK` exécutée
par un administrateur avec rôle `service_role` pour les RPC. Les fixtures sont explicitement
QA, jamais publiques et jamais considérées comme stock réel. Pour les tests concurrents,
deux connexions réelles et un jeu QA isolé sont nécessaires ; un seul appel SQL séquentiel
ne prouve pas la concurrence.

| Cas | Procédure | Résultat exigé |
|---|---|---|
| Création invalide | Appeler avec une ligne manquante ou subtotal incohérent | Exception ; aucun order/item/event nouveau |
| Échec tardif création | Trigger QA `BEFORE INSERT order_events` qui lève une exception dans la transaction test | Aucune commande ni ligne persistée ; retirer le trigger QA par rollback |
| Règlement normal | Commande QA, session unique, inventaire disponible, appel règlement | 1 paiement succeeded, 1 settlement, 1 ledger, 1 event, 3 outbox ; stock agrégé décrémenté une fois |
| Stock insuffisant | Deux variantes dont une en rupture | Paiement conservé, commande paid/blocked, incident ouvert ; aucune des deux variantes décrémentée |
| Montant/devise altérés | Montant différent puis devise différente | Exceptions ; pas de ledger, settlement, paiement, stock ou outbox supplémentaire |
| Session absente | Session sans commande | Exception `payment_order_unresolved`, réessayable après rapprochement |
| Duplicata exact | Rejouer le même événement | `duplicate=true`, compteurs et stock inchangés |
| Événement distinct | Même session/intention avec nouvel event ID | `duplicate=true`, un ledger additionnel, aucun autre effet |
| Concurrent même session | Deux connexions appellent simultanément pour deux event IDs | Une seule allocation ; seconde connexion attend le verrou et retourne duplicate |
| Concurrent stock partagé | Deux commandes pour le dernier article, deux connexions | Une ready ; l’autre paid/blocked ; stock jamais négatif |
| Ligne inventaire ajoutée pendant règlement | Première variante sans inventaire ; suspendre au verrou d’une seconde variante puis insérer la première depuis une autre connexion | Commande paid/blocked, aucune allocation, y compris la ligne apparue après sa lecture initiale |
| Rollback règlement tardif | Trigger QA outbox levant une exception après allocation | Tous les effets de la transaction annulés, puis une relance sans trigger réussit |
| Annulation avant paiement | Commande QA cancelled puis paiement valide | Paiement conservé, état paid/blocked, incident ; pas d’allocation |
| Annulation après paiement | Régler puis appeler cancel_pending_order | Retour false, état paid et stock alloué inchangés, aucun événement cancelled |
| Course annulation/paiement | Deux connexions appellent cancellation et settlement sur la même commande | Serialisation au verrou ; jamais cancelled avec paiement settled ; ordre inverse payé/blocked avec incident |
| Collision intention | Intention déjà affectée à une autre commande | Exception et rollback complet |
| Droits client | EXECUTE / lecture tables en rôles anon et authenticated | Permission refusée ; aucune donnée commerciale exposée |

Requêtes d’inspection (UUID QA exact à substituer, en contexte privé autorisé) :

```sql
select status, fulfillment_status, paid_at from public.orders where id = 'UUID_QA';
select * from public.order_payment_settlements where order_id = 'UUID_QA';
select * from public.payment_webhook_events where order_id = 'UUID_QA';
select * from public.order_operational_incidents where order_id = 'UUID_QA';
select type, status, attempts from public.order_notification_outbox where order_id = 'UUID_QA';
```

## Limites explicites

- Pas d’envoi d’email, de service fournisseur, d’achat, de réservation avant paiement ni de
  réconciliation automatique d’incident. Le stock disponible peut changer avant paiement ;
  le règlement conserve alors l’encaissement et impose le traitement de l’incident.
- L’annulation pending est couverte par le RPC dédié ; toute autre transition administrative
  et les remboursements restent hors périmètre. Les chemins existants doivent préserver les
  verrous et conditions pour ne pas écraser un paiement concurrent. Un remboursement
  ne doit pas être validé sur la seule existence de ce nouveau règlement.
- Autres écritures manuelles service-role pouvant contourner les RPC : elles nécessitent une
  discipline backend ; ces RPC ne rendent pas toutes les opérations administrateur atomiques.
- La validation concurrente, la livraison et la réception effective d’emails ne sont pas
  prouvées par des tests TypeScript simulés ou la compilation de cette migration.

Références officielles : [verrouillage PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html),
[fonctions Supabase](https://supabase.com/docs/guides/database/functions),
[RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
