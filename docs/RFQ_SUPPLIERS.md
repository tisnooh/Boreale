# RFQ_SUPPLIERS.md — Demandes de devis fournisseurs (14 produits + packs)

> **Code gelé : ce document n'entraîne aucune modification frontend/backend.**
> **Aucun fournisseur n'est cité ni inventé.** Aucune certification n'est présumée existante :
> chaque affirmation de conformité doit être **prouvée par le fournisseur** (copie de rapport,
> certificat daté, nom du laboratoire). Une case sans preuve = « NON DOCUMENTÉ ».
>
> Outils liés : `sourcing/rfq-fr.txt` et `sourcing/rfq-en.txt` (messages prêts à envoyer),
> `sourcing/supplier-comparison.csv` + `sourcing/supplier-comparison-template.xlsx`
> (saisie et décision), `docs/SUPPLIER_SCORECARD.md` (notation /100),
> `docs/SAMPLE_TEST_PLAN.md` (validation échantillons), `docs/SOURCING.md` (coûts max).

---

## 1. Règles transverses de toute RFQ BORÉALE

1. Devis **écrit** (PDF ou email), devise EUR ou USD + date de validité ≥ 30 jours.
2. Prix demandés à **4 paliers** : 100 / 300 / 500 / 1 000 unités — EXW, et FOB si disponible.
3. **Jamais de certification supposée** : formulation standard à utiliser —
   « List the certifications and test reports you can provide *with copies* (lab name, report
   number, date). Do not claim any certification you cannot document. »
4. Toute mesure demandée en **cm / g / unités par carton / CBM** — pas d'approximation « standard ».
5. Échantillons : exigés **avant toute commande**, idéalement en 3 tailles pour les produits taillés.
6. Réponse attendue sous 5 jours ouvrés ; relance J+6 ; abandon documentaire J+10 (pénalise le score Communication).
7. Chaque devis reçu est saisi le jour même dans `supplier-comparison-template.xlsx` (procédure §E du plan opérationnel).

---

## 2. Grille universelle RFQ (références R1→R37, identique pour les 14 produits)

| Réf | Champ demandé |
|---|---|
| R1 | Référence produit fournisseur + correspondance référence BORÉALE (indiquée dans la fiche) |
| R2 | Composition / matières détaillées (% par matériau, grammage g/m² si textile) |
| R3 | Dimensions produit (cm), **par taille/variante** le cas échéant |
| R4 | Poids net unitaire (g) |
| R5 | Poids emballé unitaire (g, avec packaging individuel) |
| R6 | Dimensions packaging individuel (cm) |
| R7 | MOQ (par variante ET par commande) |
| R8 | Prix EXW 100 unités (€/u) |
| R9 | Prix EXW 300 unités (€/u) |
| R10 | Prix EXW 500 unités (€/u) |
| R11 | Prix EXW 1 000 unités (€/u) |
| R12 | Prix FOB (port nommé) si disponible, mêmes paliers |
| R13 | Personnalisation logo : procédé (tissage/broderie/impression/transfert), position, coût/u, MOQ |
| R14 | Packaging personnalisé : types possibles (polybag imprimé, boîte, sleeve, cintre) |
| R15 | Coût packaging : par type et par unité, outillage éventuel (montant + amortissement) |
| R16 | Délai échantillon (jours ouvrés) |
| R17 | Prix échantillon (€/u + frais de port réel) |
| R18 | Délai de production (jours après approbation échantillon) |
| R19 | Capacité mensuelle (unités/mois) |
| R20 | Incoterms disponibles (EXW, FOB, CIF, DAP, DDP…) |
| R21 | Carton master : type (simple/double cannelure), référence |
| R22 | Unités par carton |
| R23 | Poids brut carton (kg) |
| R24 | Dimensions carton (cm) + CBM par carton |
| R25 | Pays d'origine (et usine de production : adresse) |
| R26 | Rapports de tests disponibles : liste + laboratoire + numéro + date (copies exigées) |
| R27 | Certifications applicables détenues : liste + copies datées (ne rien claimer sans preuve) |
| R28 | REACH : rapport(s) Annex XVII (azo, phtalates, PAH, nickel) ou justification écrite de non-applicabilité |
| R29 | OEKO-TEX Standard 100 (si textile) : classe, certificat, validité — ou « none » |
| R30 | Conformité européenne applicable identifiée **par le fournisseur** (règlements/directives) + preuves |
| R31 | Politique défauts/qualité : taux de défauts constaté, remplacements, avoirs, délai de traitement |
| R32 | AQL proposé : niveau d'inspection (ex. ISO 2859-1 niveau II), limites défauts majeurs/mineurs |
| R33 | Conditions de paiement (acompte %, solde, moyens, escompte) |
| R34 | DDP France possible : oui/non |
| R35 | Si oui : coût DDP estimatif vers France (code postal 69001 Lyon) au palier 500 |
| R36 | **Produits taillés uniquement** : mesures à plat exactes en cm par taille, tolérances de fabrication (± cm), tableau de tailles fournisseur, correspondance taille EU, échantillons en ≥ 3 tailles (min/médian/max) |
| R37 | Spécificités produit : voir fiche §3 (tests fonctionnels, notices, sécurité) |

---

## 3. Fiches RFQ par produit (R1→R36 s'appliquent ; R37 = bloc ci-dessous)

Lecture : **Réf BORÉALE** = slug + SKUs seed ; **Coût max** = cible / plancher EXW HT (SOURCING.md §2).

### 3.1 chaussettes-polaires-nuage — « Nuage » (vedette)
- SKUs : BOR-NUA-SM-BN / -SM-EC / -LX-BN / -LX-EC. Coût max : **7,26 € / 9,34 €**.
- R3 : hauteur tige, tour de cheville/tenue du bord-côte (cm, non étiré et étiré).
- R36 : S/M (36-41) & L/XL (42-46) : longueur pied cm, tolérance ±.
- R37 : grammage polaire intérieur/extérieur + preuve pesée ; test boulochage ≥ 10 lavages 30° (Martindale ou équivalent, valeur chiffrée) ; rétrécissement après 5 lavages (%) ; semelle antidérapante : matériau + test de glissance (valeur) ; solidité couleurs (note ISO 105). Échantillons : 2 tailles × 2 coloris.

### 3.2 gants-tactiles-contact — « Contact »
- SKUs : BOR-CON-SM-NO / -SM-GL / -LX-NO / -LX-GL. Coût max : **8,72 € / 11,21 €**.
- R3 : longueur totale, longueur majeur, tour de paume (cm).
- R36 : S/M & L/XL + correspondance EU (8/9/10…) + tolérances.
- R37 : technologie tactile (fil argent tricoté / encre conductive) + doigts concernés ; durabilité conductive après X lavages (test chiffré, protocole nommé) ; matière paume silicone + test d'abrasion (cycles) ; coupe-vent : oui/non + mesure perméabilité à l'air. Échantillons : 2 tailles × 1 coloris + 1 paire lavée 10× par le fournisseur si possible.

### 3.3 bonnet-torse-boreale — « Boréale »
- SKUs : BOR-BON-U-BN / -EC / -BR. Coût max : **10,18 € / 13,09 €**.
- R3 : tour de tête non étiré / étiré max (cm), hauteur, revers (cm).
- R36 (taille unique) : plage annoncée 54-60 cm → preuve test d'extension 50 cycles sans déformation.
- R37 : composition maille + doublure % ; tenue des torsades après lavage/séchage (photo avant/après fournie) ; nuanciers Pantone TCX des 3 coloris ; grammage. Échantillons : 3 coloris.

### 3.4 cache-cou-polaire-bise — « Bise » (appel)
- SKUs : BOR-BIS-U-NO / -BL. Coût max : **5,80 € / 7,46 €**.
- R3 : hauteur, circonférence (cm, non étiré/étiré).
- R37 : grammage double face ; absence de couture intérieure irritante (photo coupe) ; temps de séchage mesuré (min) ; respirabilité (g/m²/24h si disponible). Échantillons : 2 coloris.

### 3.5 legging-thermique-seconde-peau — « Seconde Peau » (upsell, **taillé**)
- SKUs : BOR-LEG-XS / -ML / -XL. Coût max : **11,64 € / 14,96 €**.
- R3 : entrejambe, tour de taille non étiré/étiré, hauteur ceinture (cm).
- R36 : **prioritaire** : table cm complète XS/S, M/L, XL/XXL + tolérances ± cm + correspondance EU 34-48 + échantillons 3 tailles.
- R37 : composition % + grammage intérieur brossé ; opacité (test lumière, photo) ; tenue ceinture (test 8 h port, protocole) ; rétrécissement 5 lavages ; REACH contact peau prolongé (rapport). Échantillons : 3 tailles × 1 coloris.

### 3.6 chaussons-fourres-refuge — « Refuge » (**taillé**)
- SKUs : BOR-REF-3637 → 4445 (5 pointures). Coût max : **13,10 € / 16,84 €**.
- R3 : longueur semelle interne (cm) **par pointure** — donnée critique anti-retours.
- R36 : grille pointures EU → semelle interne cm + tolérances ± ; échantillons 3 pointures (38-39, 42-43, 44-45).
- R37 : matériaux dessus/doublure/semelle ; coefficient de glissance sec & humide (valeur + norme interne) ; déperlance (test pulvérisation, note) ; usure semelle (abrasion cycles) ; usage extérieur limité : mention fournie. Échantillons : 3 pointures.

### 3.7 chaussons-bouillotte-foyer — « Foyer » — **HERO, voir §4**
- SKU : BOR-FOY-U. Coût max : **13,10 € / 16,84 €** (priorité n°1, plancher négociable uniquement contre volume/documentaire complet).
- R3 : longueur interne utile (cm), hauteur tige.
- R36 (taille unique 36-45) : preuve d'adaptabilité (test 3 pointures 36/41/45).
- R37 : **bloc complet §4** (micro-ondes, garnissage, notice FR, flamme, packaging, QC).

### 3.8 chauffe-mains-reutilisables-braise — « Braise » ×2 (appel)
- SKU : BOR-BRA-U (lot de 2). Coût max : **4,93 € / 6,34 € le lot**.
- R3 : dimensions 1 poche (cm) ; R4/R5 par lot.
- R37 : FDS acétate de sodium + classification CLP ou attestation de non-classification (laboratoire) ; cycles de cristallisation garantis (test chiffré : nombre de cycles, durée chaleur par cycle à 20 °C ambiant) ; test étanchéité (chute 1,5 m + compression, protocole) ; enveloppe sans phtalates (REACH) ; sachet individuel inclus ? Échantillons : 3 lots.

### 3.9 plaid-polaire-alpage — « Alpage » (appel volume)
- SKUs : BOR-ALP-BN / -EC / -SA. Coût max : **8,72 € / 11,21 €**.
- R3 : 130 × 170 cm finis ± tolérance.
- R37 : grammage 280 g/m² **prouvé** (pesée m²) ; anti-boulochage (test chiffré) ; dimensions après 3 lavages ; compression export (sac vide ? dims) ; CBM carton (critique fret). Échantillons : 3 coloris.

### 3.10 bouillotte-noyaux-cerise-brasero — « Brasero » (upsell)
- SKU : BOR-BRS-U. Coût max : **7,26 € / 9,34 €**.
- R3 : 50 × 15 cm ± ; R4 : poids garnissage vs housse.
- R37 : fiche sanitaire noyaux (origine, nettoyage, dépoussiérage, humidité résiduelle) ; compartimentage interne (photo coupe) ; test chauffe répété 30 cycles (micro-ondes 2 min/800 W : odeur, intégrité coutures, température surface) ; housse amovible composition + lavage ; **notice FR/EN fournie** (températures, avertissements). Échantillons : 2.

### 3.11 housse-pare-brise-sentinelle — « Sentinelle » (vedette, 2 tailles)
- SKUs : BOR-SEN-ST (coût max **10,18 / 13,09 €**) ; BOR-SEN-XL (**11,64 / 14,96 €**) → 2 lignes de devis distinctes.
- R3 : 145 × 110 (ST) / 165 × 120 (XL) ± ; longueurs sangles rétroviseurs, rabats latéraux (cm).
- R37 : structure tricouche (matériaux + épaisseurs) ; force magnétique mesurée (N ou gauss, protocole) ; test tenue vent réel ou soufflerie (vitesse km/h) ; traitement UV (test vieillissement h) ; souplesse à −20 °C ; sac rangement inclus (dims) ; **règles transport aimants si fret aérien** (documentation IATA ou mention « sea/road only »). Échantillons : 2 tailles.

### 3.12 gant-grattoir-polaire — « Polaire » (appel)
- SKU : BOR-GGP-U. Coût max : **3,76 € / 4,84 €**.
- R3 : longueur lame, largeur lame, longueur manchette (cm).
- R37 : test choc ABS à −20 °C (protocole + résultat) ; sécurité arête pour la main (rayon/absence de tranchant, photo macro) ; composition manchette + étiquetage textile ; dimensions main (taille unique : tour de main cm couvert). Échantillons : 3.

### 3.13 plaid-sherpa-nid — « Nid » (vedette)
- SKUs : BOR-NID-EC / -BN. Coût max : **17,47 € / 22,46 €**.
- R3 : 150 × 200 cm finis ±.
- R37 : grammages 2 faces prouvés (pesée) ; longueur poil sherpa (mm) ; test boulochage chiffré ; solidité coutures (test traction N) ; dimensions après lavage ; **compression export + CBM** (poste fret dominant). Échantillons : 2 coloris.

### 3.14 plaid-manches-cocon — « Cocon » (upsell)
- SKUs : BOR-COC-GR / -SA. Coût max : **14,55 € / 18,71 €**.
- R3 : longueur totale, envergure, longueur manche, ouverture poche (cm).
- R37 : grammage 300 g/m² prouvé ; solidité poche (charge kg testée) ; test boulochage ; coupe oversize : table de correspondance morphologies (tour de poitrine cm couverts). Échantillons : 2 coloris.

---

## 4. HERO PRODUCT — « Foyer » : exigence fournisseur renforcée

**Priorité fournisseur n°1 du catalogue.** Un prix bas seul ne valide JAMAIS ce produit :
sans le pack documentaire complet ci-dessous, statut maximal = **SAMPLE REQUIRED**, jamais GO.

### 4.1 Pack documentaire obligatoire (copies, laboratoire nommé, dates)
1. **Tests micro-ondes** : protocole écrit + relevés : 90 s / 800 W (et 700/900 W) — températures surface & cœur à t=0/10/30/60 min ; **50 cycles répétés** sans défaillance couture/odeur/combustion ; consigne « ne pas dépasser X min » documentée.
2. **Résistance thermique** : comportement des tissus & coutures après cycles (photos macro avant/après) ; point de fusion/flammabilité du textile extérieur (rapport ou norme applicable fournie par le fournisseur).
3. **Composition complète** : housse (textile %), garnissage (graines de lin % + lavande %), fermeture (type, matériau).
4. **Garnissage** : origine graines, traitement sanitaire (nettoyage, dépoussiérage, congélation ou équivalent), humidité résiduelle, fiche allergènes lavande (composants parfumants listés).
5. **Notice française** prête à imprimer : durée/puissance de chauffe, interdiction réchauffe continue, test température avant usage, peau lésée/enfants/animaux, entretien housse, non-lavage du garnissage. (Sinon : le fournisseur fournit les données, BORÉALE rédige — coût de relecture à prévoir.)
6. **Avertissements** : pictogrammes et mentions imprimés sur produit ou étiquette cousue (contenu + emplacement).
7. **Packaging** : type, protection humidité du garnissage pendant transport maritime, test carton chute (protocole).
8. **Contrôle qualité** : AQL proposé (R32) + contrôle 100 % coutures garnissage oui/non + taux de défauts 12 mois.
9. Étiquetage textile UE housse (R29/R30) + marquage origine + EAN.

### 4.2 Gates de décision spécifiques Foyer
- GO uniquement si : échantillon ≥ seuil PASS du SAMPLE_TEST_PLAN **ET** points 1-8 documentés **ET** landed ≤ plancher (16,84 €) ou ≤ cible avec volume.
- Un seul des points 1-5 manquant après relance → **NO GO** (produit hero = risque image + SAV).
- Capacité mensuelle < 3 000 u → plafond de croissance : exiger plan de montée en capacité écrit ou dual-sourcing prévu.

---

## 5. PRODUITS TAILLÉS — mesures, tolérances et guide des tailles BORÉALE

### 5.1 Produits concernés et données exigées (R36)
| Produit | Tailles seed | Mesures à plat exigées (cm) | Échantillons minimaux |
|---|---|---|---|
| Nuage | S/M, L/XL | longueur pied, hauteur tige, tour bord-côte (non étiré/étiré) | 2 tailles |
| Contact | S/M, L/XL | longueur totale, longueur majeur, tour de paume | 2 tailles |
| Seconde Peau | XS/S, M/L, XL/XXL | entrejambe, tour taille (repos/étiré), hauteur ceinture | 3 tailles |
| Refuge | 36-37 → 44-45 | **longueur semelle interne par pointure**, largeur avant-pied | 3 pointures |
| Boréale (bonnet) | unique 54-60 | tour repos/étiré max, hauteur | 1 + test extension |
| Foyer | unique 36-45 | longueur interne utile, adaptabilité 36/41/45 | 1 + test 3 pointures |

Tolérances exigées : **± 1,0 cm** textile, **± 0,5 cm** semelle interne chausson. Au-delà : spécification BORÉALE non tenable → NEGOTIATE/NO GO.

### 5.2 Plan guide des tailles BORÉALE (objectif : réduire les retours taille)
1. **Spécification maître** : BORÉALE publie sa propre table cm par variante ; le fournisseur produit **contre cette spécification**, pas contre son tableau interne (clause au devis/PO).
2. **Fiche produit** (contenu admin, sans code) : bloc « Mesures à plat (cm) » par variante + schéma « comment mesurer » (pied, paume, taille, entrejambe) + conseil entre-deux-tailles + mention tolérance ±.
3. **Validation porteurs** : panel interne 5-10 personnes par produit taillé lors de la réception échantillons (mensurations réelles vs table) ; écarts > 1 taille → respec ou NO GO variante.
4. **Correspondance EU** affichée uniquement après croisement table fournisseur + test panel (jamais avant).
5. **Boucle retours** : motif de retour tagué « taille » à la commande de retour ; revue mensuelle ; ajustement table/guide si un motif dépasse 20 % des retours d'une variante ; objectif interne : retours liés taille < 6 % des unités expédiées à 6 mois (KPI interne, pas une promesse client).
6. **Traçabilité** : chaque table cm validée est archivée dans `sourcing/` (fichier par produit) et recopiée dans le contenu admin.

---

## 6. PACKS — trois options d'approvisionnement, analyse de marge

**Hypothèses internes affichées** (à remplacer dès devis reçus) :
- H-ASSY : coût d'assemblage interne = **1,20 €/pack** (≈ 4 min/pack, coût chargé interne estimé).
- H-SLEEVE : sleeve/boîte pack = **0,60 €/pack** (devis packaging à recevoir = À SOURCER).
- Les prix composants aux paliers viennent des RFQ (R8-R11) : **aucun pourcentage de remise n'est supposé** — l'option C se calcule avec les vrais prix de palier combinés.

Formules (coût landed par pack, hors fret déjà inclus dans landed composants) :
```
A (assemblé par nous)      = Σ landed(composant au volume du pack) + H-ASSY + H-SLEEVE
B (pack préparé fournisseur)= landed(prix pack fournisseur, SKU unique) [+ H-SLEEVE si non inclus]
C (volume combiné)         = Σ landed(composant au palier atteint GRÂCE au volume pack+unité)
                             + H-ASSY + H-SLEEVE
Marge pack = (PV HT pack − coût option) / PV HT pack   → comparer à cible 65 % / plancher 55 %
```

### 6.1 Application aux 4 packs (avec coûts cibles internes, en attendant devis)
| Pack | PV HT | Coût max cible | Σ cibles composants | A (cibles+H) | Marge A | C si palier combiné atteint la cible composant−10 % | B : prix pack requis pour cible |
|---|---|---|---|---|---|---|---|
| Cocooning (Nid+Nuage+Brasero) | 79,08 | 27,68 | 31,99 | 33,79 | 57,3 % | 30,59 → 61,3 % | ≤ 27,08 € landed |
| Grand Froid (Bonnet+Bise+Contact+Foyer) | 91,58 | 32,05 | 37,00 | 38,80 | 57,6 % | 35,10 → 61,7 % | ≤ 31,45 € landed |
| Auto Hiver (Sentinelle+Polaire+Braise) | 45,75 | 16,01 | 18,87 | 20,67 | 54,8 % ⚠️ sous plancher | 18,78 → 58,9 % | ≤ 15,41 € landed |
| Ski (Legging+Bise+Contact+Bonnet) | 87,42 | 30,60 | 35,92 | 37,72 | 56,8 % | 34,13 → 61,0 % | ≤ 30,00 € landed |

(Σ cibles = somme des coûts max cibles individuels SOURCING.md ; A = Σ + 1,20 + 0,60 ;
C illustré à −10 % **uniquement comme illustration de sensibilité** — le calcul réel utilisera
les paliers R8-R11 reçus ; B = prix pack landed maximal pour atteindre 65 %.)

### 6.2 Lecture et règles de choix
- **Auto Hiver en option A est sous le plancher 55 %** → ce pack ne se lance pas en A avec des composants au coût cible : C obligatoire (palier combiné) ou recomposition (ex. retirer Braise du pack ou PV pack revu).
- **C est l'option structurelle par défaut** : les RFQ demandent déjà 4 paliers, donc dès 2 devis on calcule C exactement (volume pack + volume unitaire du même composant).
- **B n'est pertinente que si un fournisseur unique couvre ≥ 80 % de la valeur du pack** (ex. famille textile pour Grand Froid/Ski) ET propose un kitting avec QC documenté (AQL sur pack fini) ; demander systématiquement dans la RFQ famille : « Can you kit bundle X ? Price per bundled unit ? ».
- **A reste le repli des premières séries** (volumes < palier 300, multi-fournisseurs) — assumer alors 55-60 % de marge pack, compensée par l'AOV.
- Décision finale par pack = min(A,B,C) **à conformité égale**, saisie dans l'onglet « Packs » du xlsx.

---

## 7. Familles fournisseurs et ordre de contact (synthèse)

| Ordre | Famille | Produits | Pourquoi cet ordre |
|---|---|---|---|
| 1 | Graines/chauffants textiles | Foyer, Brasero | Hero + pack documentaire long (tests micro-ondes) = lead time critique |
| 2 | Textile polaire/accessoires | Nuage, Bise, Bonnet, Contact, Legging (+ composants packs Grand Froid/Ski/Cocooning) | Couvre 5 produits + 3 packs → pouvoir de négociation volume (option C) |
| 3 | Accessoires auto | Sentinelle (2 tailles), Polaire | Saisonnalité Q4 forte, UGC 5/5, aimants = contrainte fret à clarifier tôt |
| 4 | Plaids/maison | Nid, Alpage, Cocon | Volumineux : le CBM décide du landed → devis fret tôt |
| 5 | Chaussons | Refuge | Pointures = risque retour, semelle extérieure = spec technique |
| 6 | Chaufferettes gel | Braise | Petit ticket, fournisseur spécialiste chimie (FDS/CLP) |

Règle : **2 à 3 RFQ parallèles par famille** dès l'ordre 1 lancé ; ne jamais attendre un
fournisseur unique (single-source = risque de lancement).
