# SUPPLIER_SCORECARD.md — Notation fournisseur /100 & moteur de décision

> Aucune note n'est attribuée sans **preuve reçue** (devis écrit, copie de rapport, photo
> d'échantillon testé, email daté). Un critère sans information = **case vide**, jamais une
> valeur supposée. Le score se calcule **par couple (produit ou pack, fournisseur)** —
> un même fournisseur peut scorer différemment sur deux familles.

---

## 1. Barème /100

| Critère | Poids | 100 % du poids | ~60-70 % du poids | ≤ 40 % du poids | 0 |
|---|---|---|---|---|---|
| **Prix / marge** | **30** | LANDED ≤ coût max cible (SOURCING.md) | LANDED ≤ cible × 1,10 | LANDED ≤ plancher (55 %) | LANDED > plancher |
| **Qualité** | **20** | Audit social/qualité copie (BSCI/SEDEX/ISO 9001) + AQL ≤ 2,5 + échantillon ≥ 80/100 (SAMPLE_TEST_PLAN) | Certifications partielles OU échantillon 65-79 | Échantillon ≥ seuil conditionnel mais preuves usine manquantes | Échantillon FAIL ou refus d'audit |
| **Conformité** | **15** | Tous les rapports/certs exigés par la fiche RFQ fournis, < 24 mois, laboratoire identifié | Manque 1 document non bloquant avec engagement daté | Manque ≥ 2 documents avec plan de rattrapage | Document refusé / claim sans preuve |
| **MOQ** | **10** | MOQ ≤ 300 u (par commande, toutes variantes) | MOQ ≤ 500 | MOQ ≤ 1 000 | MOQ > 1 000 |
| **Délais** | **10** | Échantillon ≤ 7 j **et** production ≤ 30 j | Production ≤ 45 j | Production ≤ 60 j | > 60 j |
| **Communication** | **5** | Réponse < 48 h, complète (R1-R37), langue claire, relances proactives | Réponse 2-4 j, ≤ 3 champs manquants après relance | Réponse 5-10 j ou incomplète répétée | > 10 j ou opaque |
| **Personnalisation** | **5** | Logo **et** packaging personnalisés au MOQ commande | Un des deux | Possible mais MOQ dédié élevé | Aucune |
| **Logistique** | **5** | DDP France chiffré OU FOB + données carton/CBM complètes et cohérentes | Données carton complètes, pas de DDP | Données partielles (manque CBM ou poids) | Aucune donnée logistique |

Score total = somme (0 → 100). **Arrondi à l'entier.** Toute case vide → le critère compte 0
dans le total, et le statut du devis reste « incomplet » (blocage GO, cf. §3).

### Preuves acceptées par critère (exemples)
- Prix : devis écrit daté avec paliers ; landed recalculé dans le xlsx (jamais le prix facial).
- Qualité : copie certificat + n° + date ; rapport d'inspection ; score échantillon signé.
- Conformité : PDF rapports (labo, n°, date) ; certificat OEKO-TEX avec n° ; FDS/CLP.
- Délais : engagement écrit dans le devis ; historique vérifiable si déjà client (sinon vide).
- Communication : horodatage des emails (boîte sourcing).
- Logistique : packing list type, photo cartons, cotation forwarder croisée.

---

## 2. Vocabulaires contrôlés (saisie xlsx/csv)

- `COMPLIANCE_STATUS` : `OK` | `PARTIEL` | `NON` | `NON_DOCUMENTE` (initial).
- `QUALITY_STATUS` : `OK` | `PARTIEL` | `NON` | `NON_DOCUMENTE` (initial).
- `DECISION` : calculée automatiquement (§3) — ne jamais la saisir à la main dans le xlsx
  (colonne formula) ; dans le CSV export, elle est recopiée depuis le xlsx.

---

## 3. Moteur de décision (GO / NEGOTIATE / NO GO / SAMPLE REQUIRED)

```
SI UNIT_EXW vide OU LANDED vide            → SAMPLE REQUIRED   (rien à décider sans devis)
SI COMPLIANCE = NON OU QUALITY = NON       → NO GO             (knockout)
SI LANDED ≤ CIBLE  ET COMPLIANCE = OK
   ET QUALITY = OK ET SCORE ≥ 70           → GO
SI LANDED ≤ PLANCHER ET COMPLIANCE ≠ NON
   ET QUALITY ≠ NON ET SCORE ≥ 55          → NEGOTIATE
SINON                                      → NO GO
```

**Gates manuels prioritaires sur le moteur** (documentés, non automatisables) :
1. **FOYER (hero)** : GO interdit tant que le pack documentaire §4 de RFQ_SUPPLIERS.md
   (tests micro-ondes, notice FR, garnissage, flamme, packaging, QC) n'est pas complet —
   même avec un landed sous la cible et un score ≥ 70. Statut maximal sans docs : SAMPLE REQUIRED.
2. **Échantillon FAIL** (SAMPLE_TEST_PLAN) : NO GO immédiat, quel que soit le score.
3. **Certification claimée sans copie** : conformité = NON (knockout) — règle « jamais supposer ».
4. **Produit taillé** : GO interdit sans table cm + tolérances + échantillons ≥ 3 tailles reçus
   (risque retours) — sinon SAMPLE REQUIRED.

### Interprétation opérationnelle
- **GO** : lancement PO possible après validation interne (2 yeux : sourcing + direction).
- **NEGOTIATE** : levier identifié par critère faible (ex. prix entre cible et plancher →
  demander palier 1 000, packaging simplifié, FOB au lieu d'EXW+forwarder ; conformité PARTIEL
  → deadline écrite de fourniture du rapport).
- **NO GO** : archiver avec motif ; ne recontacter que si un critère knockout change (nouveau rapport).
- **SAMPLE REQUIRED** : action = commander l'échantillon (coût tracé dans SAMPLE_COST) ou
  compléter les champs manquants ; statut temporaire par défaut de toute ligne neuve.

---

## 4. Utilisation du xlsx (`sourcing/supplier-comparison-template.xlsx`)

- **Onglet « Devis »** : 1 ligne = 1 couple (produit, fournisseur, palier de quantité).
  Colonnes internes pré-remplies : TARGET_MAX_COST, FLOOR_MAX_COST, SELLING_PRICE_HT
  (verrouillées, issues de SOURCING.md). Colonnes calculées automatiquement :
  `LANDED_UNIT_COST = UNIT_EXW + PACKAGING + FREIGHT + DUTY + OTHER_COSTS` ;
  `GROSS_MARGIN_EUR = SELLING_PRICE_HT − LANDED_UNIT_COST` ;
  `GROSS_MARGIN_PERCENT = GROSS_MARGIN_EUR / SELLING_PRICE_HT` ;
  `DECISION` = moteur §3 (formule). `SCORE` = report manuel depuis l'onglet Scorecard.
- **Onglet « Scorecard »** : saisir 0→poids par critère ; total /100 automatique ; recopier dans Devis.SCORE.
- **Onglet « Packs »** : lignes A/B/C par pack ; saisir les landed composants/pack reçus ;
  la meilleure option = min des trois à conformité égale (règles RFQ_SUPPLIERS.md §6).
- **Onglet « Procédure »** : rappel pas-à-pas de saisie et d'archivage.
- Export CSV : enregistrer sous `sourcing/supplier-comparison.csv` (mêmes colonnes, même ordre).

---

## 5. Règles d'hygiène des données

1. Une source par cellule : chaque valeur saisie a sa preuve archivée
   (`sourcing/attachments/<fournisseur>/<produit>/…`) et référencée en colonne NOTES.
2. Ne **jamais** modifier TARGET/FLOOR/SELLING_PRICE_HT dans les outils (décision commerciale
   distincte, tracée dans DECISIONS.md si elle advient).
3. Devise : saisir en EUR ; si devis USD, convertir au taux du jour du devis (taux + date en NOTES).
4. Landed : fret/douane par unité = cotation forwarder réelle divisée par le nombre d'unités du
   palier considéré (le palier change le landed → une ligne par palier si besoin).
5. Historique : ne pas écraser une ligne décidée — dupliquer la ligne avec la date de la nouvelle offre.
