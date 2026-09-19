# SOURCING.md — Validation commerciale du catalogue BORÉALE (14 produits)

> **Règle d'or du document : aucune donnée fournisseur n'est inventée.**
> Tout ce qui dépend d'un fournisseur réel (coût, MOQ, délai, tarif douanier, rapports de test,
> conditionnement) est marqué **« À SOURCER »**. Les seules données « certaines » ci-dessous
> sont celles de la boutique (prix de vente publics du seed, poids déclarés par variante dans
> le seed, rôles merchandising) et le cadre de marge décidé en interne.
>
> Périmètre : les 14 produits du catalogue de lancement (`backend/supabase/seed.sql`) + les
> 4 packs en annexe. Ce document ne modifie aucun code : les prix/stocks de la boutique
> restent pilotés depuis l'admin.

---

## 1. Cadre de marge utilisé pour les « coûts max acceptables »

Formules (toutes les hypothèses sont internes, pas fournisseur) :

```
PV HT            = PV TTC / 1,20                      (TVA France 20 %)
Coût max cible   = PV HT × (1 − 65 %)  = PV HT × 0,35  (marge brute cible sur HT)
Plancher absolu  = PV HT × (1 − 55 %)  = PV HT × 0,45  (sous ce seuil : produit refusé ou prix revu)
```

- **Marge brute cible = 65 % sur PV HT** ; **plancher de négociation = 55 %**. Entre les deux : acceptable avec arbitrage (volume, exclusivité, qualité).
- Le « coût max acceptable » s'entend **coût fournisseur HT, départ usine (EXW), hors** :
  fret international, droits de douane & taxes d'import, assurance transport, packaging
  spécifique non inclus, frais de paiement Stripe (~1,5 % + 0,25 €/commande), logistique
  unitaire (pick/pack), publicité. Ces coûts sont suivis séparément au P&L.
- **Coût rendu (landed) à comparer au plancher** :
  `landed = (COGS_EXW + fret_unitaire) × (1 + taux_douane) + frais_portuaires_unitaires`
  avec `taux_douane` dépendant du code TARIC de chaque produit → **À SOURCER/VALIDER**
  auprès d'un transitaire (le classement TARIC lui-même est À SOURCER par produit).
- Rappels : la TVA à l'import (20 %) est récupérable ; les droits de douane ne le sont pas.

---

## 2. Synthèse catalogue (données boutique + cadre interne)

| # | Produit | Univers | Rôle | PV TTC | PV HT | Coût max cible (65 %) | Plancher (55 %) | Poids/unité (seed) | UGC |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Chaussettes polaires « Nuage » | Confort & Textile | Vedette | 24,90 € | 20,75 € | **7,26 €** | 9,34 € | 180-200 g | 4/5 |
| 2 | Gants tactiles « Contact » | Confort & Textile | Cœur | 29,90 € | 24,92 € | **8,72 €** | 11,21 € | 120-130 g | 4/5 |
| 3 | Bonnet torsadé « Boréale » | Confort & Textile | Cœur | 34,90 € | 29,08 € | **10,18 €** | 13,09 € | 150 g | 3/5 |
| 4 | Cache-cou polaire « Bise » | Confort & Textile | **Appel** | 19,90 € | 16,58 € | **5,80 €** | 7,46 € | 80 g | 3/5 |
| 5 | Legging thermique « Seconde Peau » | Confort & Textile | **Upsell** | 39,90 € | 33,25 € | **11,64 €** | 14,96 € | 280-320 g | 4/5 |
| 6 | Chaussons fourrés « Refuge » | Confort & Textile / Maison | Cœur | 44,90 € | 37,42 € | **13,10 €** | 16,84 € | 520-620 g | 3/5 |
| 7 | Chaussons bouillotte « Foyer » | Chaleur / Maison | **HERO** | 44,90 € | 37,42 € | **13,10 €** | 16,84 € | 900 g | 5/5 |
| 8 | Chauffe-mains « Braise » (×2) | Chaleur / Auto | **Appel** | 16,90 € | 14,08 € | **4,93 €** | 6,34 € | 240 g (lot) | 4/5 |
| 9 | Plaid polaire « Alpage » | Maison | **Appel (volume)** | 29,90 € | 24,92 € | **8,72 €** | 11,21 € | 880 g | 3/5 |
| 10 | Bouillotte sèche « Brasero » | Chaleur / Maison | **Upsell** | 24,90 € | 20,75 € | **7,26 €** | 9,34 € | 850 g | 4/5 |
| 11 | Housse pare-brise « Sentinelle » | Auto Hiver | Vedette | 34,90 € (ST) / 39,90 € (XL) | 29,08 / 33,25 € | **10,18 € / 11,64 €** | 13,09 / 14,96 € | 700 / 820 g | 5/5 |
| 12 | Gant grattoir « Polaire » | Auto Hiver | **Appel** | 12,90 € | 10,75 € | **3,76 €** | 4,84 € | 110 g | 4/5 |
| 13 | Plaid sherpa « Nid » | Maison | Vedette | 59,90 € | 49,92 € | **17,47 €** | 22,46 € | 1 800 g | 4/5 |
| 14 | Plaid à manches « Cocon » | Maison | **Upsell** | 49,90 € | 41,58 € | **14,55 €** | 18,71 € | 1 200 g | 5/5 |

Lecture : un devis fournisseur **au-dessus du plancher** = produit non viable à ce prix de
vente → renégocier, re-sourcer, ou ajuster le PV (décision commerciale assumée, jamais
automatique).

---

## 3. Fiches produits

### 3.1 Chaussettes polaires « Nuage » — BOR-NUA-*
- **Catégorie (univers)** : Confort & Textile (secondaire : Maison / Cocooning).
- **Cible** : 25-55 ans frileux·ses à domicile, télétravail, cadeaux modestes ; acheteuses majoritaires attendues (à confirmer par les données réelles).
- **Problème résolu** : pieds glacés à la maison dès que le chauffage baisse ; chaussettes classiques trop fines qui glissent sur le carrelage.
- **Prix de vente boutique** : 24,90 € TTC (4 variantes S/M & L/XL × bleu nuit & écru).
- **Coût fournisseur max acceptable** : cible **7,26 €** / plancher **9,34 €** (EXW HT, hors fret/douane — coût réel **À SOURCER**).
- **Poids / logistique** : 180 g (S/M) – 200 g (L/XL) ; petit volume, pliable → coût fret faible ; carton d'export et CBM **À SOURCER**.
- **Risque retour** : **faible** (2 tailles larges seulement, pas d'essayage critique) ; hygiène : retour accepté non porté uniquement (politique /legal/returns).
- **Risque réglementaire** : **faible-moyen** — étiquetage composition textile obligatoire (règl. UE 1007/2011 + mention française), REACH Annex XVII (colorants azoïques, phtalates) : rapports de test **À SOURCER** auprès du fournisseur.
- **Potentiel UGC/TikTok** : **4/5** — test « verser de l'eau /对比 épaisseur », ASMR matière, avant/après pieds froids (concepts MARKETING.md #14, #18).
- **Rôle** : produit **vedette** homepage (featured seed).
- **À demander au fournisseur** : composition exacte % et grammage polaire (g/m²) ; test de boulochage après ≥ 10 lavages 30° ; rétrécissement après 5 lavages ; solidité des couleurs ; semelle antidérapante : matériau + test de glissance ; tolerances de tailles (cm) ; échantillons des 2 coloris ; photo/vidéo usine du produit réel.

### 3.2 Gants tactiles « Contact » — BOR-CON-*
- **Catégorie** : Confort & Textile.
- **Cible** : actifs urbains 20-45 ans, vélo/trottinette, livraison, sportifs extérieurs.
- **Problème résolu** : devoir retirer ses gants pour chaque écran (froid + temps perdu).
- **Prix boutique** : 29,90 € TTC (S/M, L/XL × noir, gris glacier).
- **Coût max** : cible **8,72 €** / plancher **11,21 €** — coût réel **À SOURCER**.
- **Poids / logistique** : 120-130 g ; très compact.
- **Risque retour** : **moyen** (tailles de main) → guide des tailles à publier avant lancement (mesure tour de paume).
- **Risque réglementaire** : **faible** — étiquetage textile ; conductivité = claim fonctionnel à prouver (test interne sur écrans capacitifs réels à documenter).
- **UGC** : **4/5** — duel « message chrono gants vs mains nues » (#15).
- **Rôle** : cœur de gamme ; composant Pack Grand Froid & Pack Ski.
- **À demander** : quels doigts conducteurs (fil argent vs encre conductive) ; durabilité conductive après X lavages (test chiffré) ; matière paume silicone + abrasion ; coupe et tolérances (cm) ; performance au vent (coupe-vent oui/non, mesure) ; échantillons 4 variantes.

### 3.3 Bonnet torsadé « Boréale » — BOR-BON-*
- **Catégorie** : Confort & Textile.
- **Cible** : 20-50 ans urbain & montagne douce ; cadeau mixte.
- **Problème résolu** : oreilles/tête gelées + bonnets qui grattent ou se déforment.
- **Prix boutique** : 34,90 € TTC (3 coloris, taille unique 54-60 cm).
- **Coût max** : cible **10,18 €** / plancher **13,09 €** — **À SOURCER**.
- **Poids / logistique** : 150 g ; compressible.
- **Risque retour** : **faible** (taille unique élastique).
- **Risque réglementaire** : **faible** — étiquetage composition ; claim « ne gratte pas » = subjectif, ne pas en faire un argument mesuré.
- **UGC** : **3/5** — transitions dressing, portés (#16).
- **Rôle** : cœur ; composant Pack Grand Froid (bleu nuit) & Pack Ski (braise).
- **À demander** : composition maille + doublure (acrylique ? % polaire) ; tenue des torsades après lavage/séchage ; élasticité réelle (test étirement 50 cycles) ; nuancier Pantone/TCX des 3 coloris ; échantillons.

### 3.4 Cache-cou polaire « Bise » — BOR-BIS-* · PRODUIT D'APPEL
- **Catégorie** : Confort & Textile.
- **Cible** : commuters vélo/scooter/moto douce, skieurs, parents pressés ; achat d'impulsion < 20 €.
- **Problème résolu** : courant d'air au cou (zone la plus exposée) sous veste ou casque.
- **Prix boutique** : 19,90 € TTC (noir, bleu glacier).
- **Coût max** : cible **5,80 €** / plancher **7,46 €** — **À SOURCER**.
- **Poids / logistique** : 80 g ; le plus léger du catalogue → idéal glissé en colis (upsell physique).
- **Risque retour** : **très faible** (tubulaire, sans taille).
- **Risque réglementaire** : **faible** — étiquetage textile.
- **UGC** : **3/5** — démo « remonté sur le nez par -5° » (#8 famille auto/froid).
- **Rôle** : **produit d'appel** ; composant Pack Grand Froid & Pack Ski.
- **À demander** : grammage polaire double face ; coutures (sans couture intérieure ?) ; respirabilité/séchage (test temps de séchage) ; tenue des couleurs ; échantillons 2 coloris.

### 3.5 Legging thermique « Seconde Peau » — BOR-LEG-* · UPSELL
- **Catégorie** : Confort & Textile.
- **Cible** : femmes 25-50 ans (bureaux froids, robes/jupes d'hiver, ski sous-couche).
- **Problème résolu** : avoir chaud sous des vêtements de ville sans épaisseur visible.
- **Prix boutique** : 39,90 € TTC (XS/S, M/L, XL/XXL).
- **Coût max** : cible **11,64 €** / plancher **14,96 €** — **À SOURCER**.
- **Poids / logistique** : 280-320 g ; compact.
- **Risque retour** : **moyen-élevé** (tailles/morphologies) → tableau de tailles détaillé (cm) + conseil « entre deux tailles » obligatoire avant lancement ; politique hygiène stricte.
- **Risque réglementaire** : **moyen** — étiquetage textile + REACH contact peau prolongé (rapports **À SOURCER**) ; claim « thermique » non normé : rester descriptif (grammage, brossage).
- **UGC** : **4/5** — « une journée dehors sous ma jupe » (#17).
- **Rôle** : **upsell** panier textile ; composant Pack Ski (M/L).
- **À demander** : composition % (polyester/élasthanne), grammage intérieur brossé ; opacité extérieure (test lumière) ; tenue de la ceinture (test 8 h assis/debout) ; rétrécissement ; tailles = table cm fournisseur + échantillons 3 tailles.

### 3.6 Chaussons fourrés « Refuge » — BOR-REF-*
- **Catégorie** : Confort & Textile + Maison.
- **Cible** : 30-65 ans, maisons à sols froids ; cadeau parents/grands-parents.
- **Problème résolu** : carrelage glacé + allers-retours dehors (courrier, terrasse) sans changer de chaussure.
- **Prix boutique** : 44,90 € TTC (5 pointures 36-45).
- **Coût max** : cible **13,10 €** / plancher **16,84 €** — **À SOURCER**.
- **Poids / logistique** : 520-620 g/paire ; volume moyen (boîte ou polybag compressé → choix packaging **À SOURCER**).
- **Risque retour** : **moyen** (pointures) → correspondance pointures EU + longueur de semelle interne en cm affichée.
- **Risque réglementaire** : **faible-moyen** — étiquetage textile + semelle extérieure : claim antidérapant à étayer (test de glissance fournisseur **À SOURCER**) ; usage extérieur limité à mentionner.
- **UGC** : **3/5** — routine maison, « du canapé à la boîte aux lettres » (#19).
- **Rôle** : cœur de gamme maison.
- **À demander** : matériaux dessus/doublure/semelle ; coefficient de glissance sec/mouillé ; déperlance mesurée ; usure semelle (test abrasion) ; grille pointures → cm ; échantillons 3 pointures.

### 3.7 Chaussons bouillotte « Foyer » — BOR-FOY-U · **HERO PRODUCT**
- **Catégorie** : Chaleur (+ Maison).
- **Cible** : 18-45 ans sensibles au froid, acheteurs de cadeaux (Noël, fêtes), communauté TikTok « cozy ».
- **Problème résolu** : pieds glacés le soir + envie d'un rituel chaleur immédiat, sans électricité.
- **Prix boutique** : 44,90 € TTC (taille unique 36-45).
- **Coût max** : cible **13,10 €** / plancher **16,84 €** — **À SOURCER**. **Priorité de négociation n°1 du catalogue** (produit d'acquisition : on peut accepter le plancher si le volume d'acquisition suit).
- **Poids / logistique** : 900 g (garnissage graines) ; volume chaussure ; résistance aux chocs bonne (pas de casse).
- **Risque retour** : **faible** (taille unique souple) ; risque principal = **SAV usage** (surchauffe micro-ondes) → notice FR impérative.
- **Risque réglementaire** : **moyen** — pas de certification électrique (aucune) mais sécurité générale des produits (Code conso / DGCCRF) : notice de chauffe (90 s / 800 W max, ne pas réchauffer en continu, tester la température), avertissements peau lésée/enfants ; garnissage lin+lavande : origine, traitement sanitaire (poussière, congélation/désinfection), info allergènes lavande ; comportement au feu du textile (rapport fournisseur **À SOURCER**) ; housse lavable : conformité étiquetage textile.
- **UGC** : **5/5** — le meilleur ratio démo/émotion du catalogue (concepts #1-#7 MARKETING.md).
- **Rôle** : **HERO** — acquisition sociale + vedette homepage.
- **À demander** : protocole test micro-ondes documenté (cycles répétés 90 s/800 W : températures mesurées, intégrité coutures) ; origine et traitement des graines de lin + lavande (fiche sanitaire, allergènes) ; housse : composition, fermeture, lavabilité ; résistance coutures (charge/abrasion) ; comportement flamme (norme applicable fournie par le fournisseur — **À SOURCER**) ; notice multilingue FR/EN ; échantillons 2 exemplaires (1 pour test destructif).

### 3.8 Chauffe-mains réutilisables « Braise » (lot de 2) — BOR-BRA-U · PRODUIT D'APPEL
- **Catégorie** : Chaleur (+ Auto Hiver).
- **Cible** : extérieurs (marchés, sportifs, spectateurs), travailleurs dehors, trousses hivernales ; achat d'impulsion.
- **Problème résolu** : mains gelées sans piles ni flamme, chaleur immédiate réutilisable.
- **Prix boutique** : 16,90 € TTC le lot de 2.
- **Coût max** : cible **4,93 €** / plancher **6,34 €** **pour le lot** — **À SOURCER**.
- **Poids / logistique** : 240 g/lot ; plat, minuscule → fret minimal, idéal glissé en colis.
- **Risque retour** : **très faible** ; risque SAV = fuite/perçage → test étanchéité à exiger.
- **Risque réglementaire** : **moyen-faible** — solution d'acétate de sodium : FDS (fiche de données sécurité) + classification CLP ou attestation de non-classification **À SOURCER** ; mention « ne pas percer, usage externe » ; jouet : non (ne pas marketer < 3 ans sans conformité jouet — exclusion éditoriale).
- **UGC** : **4/5** — clic cristallisation en macro (#24 famille).
- **Rôle** : **produit d'appel** ; composant Pack Auto Hiver.
- **À demander** : FDS + CLP ; nombre de cycles cristallisation garantis (test chiffré) ; test étanchéité (pression/chute) ; matière enveloppe (PVC/TPU) sans phtalates (REACH) ; dimensions lot ; sachet individuel ou blister ; échantillons lot.

### 3.9 Plaid polaire « Alpage » 130×170 — BOR-ALP-* · PRODUIT D'APPEL (volume)
- **Catégorie** : Maison / Cocooning.
- **Cible** : foyers 25-60 ans, premier achat maison, cadeaux petits budgets.
- **Problème résolu** : couverture d'appoint fine/frileuse sur canapé ou lit.
- **Prix boutique** : 29,90 € TTC (3 coloris).
- **Coût max** : cible **8,72 €** / plancher **11,21 €** — **À SOURCER**.
- **Poids / logistique** : 880 g ; **volumineux compressible** → coût fret = fonction du compression bag (méthode de conditionnement **À SOURCER**).
- **Risque retour** : **faible** (pas de taille portées) ; attentes couleur → photos réelles avant lancement.
- **Risque réglementaire** : **faible** — étiquetage textile + inflammabilité textiles d'ameublement (usage domestique : vérifier exigence applicable avec le fournisseur — **À SOURCER**).
- **UGC** : **3/5** — ambiance, avant/après canapé.
- **Rôle** : **appel volume** (panier moyen) ; pas de pack l'utilise (le Cocooning utilise le Nid).
- **À demander** : grammage réel (280 g/m² annoncé — preuve pesée) ; traitement anti-boulochage (test Martindale chiffré) ; dimensions après 3 lavages ; solidité ourlets ; compression d'export (dim. carton, CBM) ; échantillons 3 coloris.

### 3.10 Bouillotte sèche noyaux de cerise « Brasero » — BOR-BRS-U · UPSELL
- **Catégorie** : Chaleur + Maison.
- **Cible** : 30-65 ans (tensions nuque/lombaires, soirées), femmes enceintes cherchant chaleur sans électricité (discours prudent, non médical).
- **Problème résolu** : chaleur localisée douce et mobile, sans eau ni électricité.
- **Prix boutique** : 24,90 € TTC (50×15 cm).
- **Coût max** : cible **7,26 €** / plancher **9,34 €** — **À SOURCER**.
- **Poids / logistique** : 850 g ; plat, robuste.
- **Risque retour** : **très faible** ; SAV = notice (surchauffe four/micro-ondes).
- **Risque réglementaire** : **moyen-faible** — sécurité générale + notice FR (2 min/800 W ou 10 min/100 °C, tester température, peau lésée, enfants) ; noyaux : origine, nettoyage/dépoussiérage, absence de résidus (fiche sanitaire **À SOURCER**) ; housse coton : étiquetage textile ; **aucun claim médical** (ne pas citer soulagement de douleurs comme efficacité thérapeutique).
- **UGC** : **4/5** — rituel détente, nuque après écran (#24).
- **Rôle** : **upsell** naturel du Foyer ; composant Pack Cocooning.
- **À demander** : fiche sanitaire noyaux (origine, traitement, poussière) ; compartimentage (coutures internes) ; test chauffe répété (odeur, intégrité) ; housse amovible : composition + lavage ; notice FR/EN ; échantillons.

### 3.11 Housse pare-brise antigivre « Sentinelle » — BOR-SEN-ST / -XL · Vedette
- **Catégorie** : Auto Hiver.
- **Cible** : automobilistes 30-65 ans, régions à gelées, flotteurs/parents pressés ; extérieur du véhicule = achat rationnel fort.
- **Problème résolu** : 10-15 min de grattage/attente chaque matin de gel.
- **Prix boutique** : 34,90 € (Standard 145×110) / 39,90 € (XL 165×120).
- **Coût max** : ST cible **10,18 €** / plancher **13,09 €** ; XL cible **11,64 €** / plancher **14,96 €** — **À SOURCER**.
- **Poids / logistique** : 700/820 g ; pliable mais **surface plane grande** → carton plat, CBM **À SOURCER**.
- **Risque retour** : **faible-moyen** (adéquation taille véhicule) → guide compatibilités (berline/SUV) + dimensions publiées.
- **Risque réglementaire** : **faible** — pas de certification auto requise (accessoire externe) ; **aimants** : puissance d'arrachement à documenter (claim « tient au vent ») + règles transport aérien des aimants si fret avion (**À SOURCER**) ; ne pas claimer « remplace le dégivrage réglementaire » (mention contraire déjà prévue).
- **UGC** : **5/5** — split-screen « voisin gratte vs toi 30 s » (#8-#13).
- **Rôle** : vedette homepage ; composant Pack Auto Hiver (ST).
- **À demander** : structure tricouche (matériaux exacts) ; force magnétique mesurée (N ou gauss) + test vent chiffré ; dimensions réelles ± tolérance ; traitement UV (test vieillissement) ; sac de rangement inclus ? ; résistance basses températures (−20 °C, souplesse) ; échantillons 2 tailles.

### 3.12 Gant grattoir « Polaire » — BOR-GGP-U · PRODUIT D'APPEL
- **Catégorie** : Auto Hiver.
- **Cible** : tous automobilistes, achat d'impulsion < 15 €, cadeau gadget utile.
- **Problème résolu** : gratter le givre main nue = douleur + mouillé.
- **Prix boutique** : 12,90 € TTC.
- **Coût max** : cible **3,76 €** / plancher **4,84 €** — **À SOURCER** (le coût le plus bas du catalogue : fort levier de marge relative).
- **Poids / logistique** : 110 g ; minuscule.
- **Risque retour** : **très faible**.
- **Risque réglementaire** : **faible** — sécurité mécanique : arête de lame non coupante pour la main, ABS résistant au froid (casse à −20 °C = risque SAV) ; tests **À SOURCER**.
- **UGC** : **4/5** — démo eau glacée sur main protégée (#11).
- **Rôle** : **produit d'appel** ; composant Pack Auto Hiver.
- **À demander** : dureté/fragilité ABS à −20 °C (test choc) ; sécurité arête (non tranchante peau) ; manchette fourrure : composition + étiquetage ; taille unique = dimensions ; échantillons.

### 3.13 Plaid sherpa « Nid » 150×200 — BOR-NID-* · Vedette
- **Catégorie** : Maison / Cocooning.
- **Cible** : 25-55 ans intérieur soigné, cadeaux de mariage/pendaison de crémaillère, télétravail.
- **Problème résolu** : plaids trop petits/trop fins : le vrai cocon 2 personnes.
- **Prix boutique** : 59,90 € TTC (écru, bleu nuit) — **ticket le plus élevé du catalogue hors packs**.
- **Coût max** : cible **17,47 €** / plancher **22,46 €** — **À SOURCER**.
- **Poids / logistique** : 1 800 g ; **le plus volumineux** → compression d'export décisive pour le landed cost ; CBM/carton **À SOURCER**.
- **Risque retour** : **faible** ; attentes toucher → photos/vidéos réelles obligatoires avant lancement.
- **Risque réglementaire** : **faible** — étiquetage textile + inflammabilité ameublement (exigence applicable **À SOURCER** avec le fournisseur).
- **UGC** : **4/5** — texture sherpa en macro, test bouloche 10 lavages (#22).
- **Rôle** : vedette homepage ; composant Pack Cocooning (écru).
- **À demander** : grammages des 2 faces (380 g/m² annoncé — preuve) ; longueur poil sherpa ; test boulochage chiffré ; dimensions après lavage ; solidité coutures double piqûre ; compression export + CBM ; échantillons 2 coloris.

### 3.14 Plaid à manches « Cocon » — BOR-COC-* · UPSELL
- **Catégorie** : Maison / Cocooning.
- **Cible** : télétravailleurs, lecteurs/séries 20-50 ans, cadeaux humour-chaleureux.
- **Problème résolu** : plaid classique = bras immobilisés ou épaules nues.
- **Prix boutique** : 49,90 € TTC (gris orage, vert sapin).
- **Coût max** : cible **14,55 €** / plancher **18,71 €** — **À SOURCER**.
- **Poids / logistique** : 1 200 g ; volumineux compressible (CBM **À SOURCER**).
- **Risque retour** : **faible** (oversize volontaire) ; bien expliquer « coupe ample » pour éviter les « trop grand ».
- **Risque réglementaire** : **faible** — étiquetage textile + inflammabilité ameublement (**À SOURCER**).
- **UGC** : **5/5** — défi « 10 tâches sans sortir les bras » (#20).
- **Rôle** : **upsell** cocooning (panier > 69 € = livraison offerte atteinte avec un appel).
- **À demander** : grammage 300 g/m² preuve ; dimensions réelles (manches, longueur, envergure) ; poche kangourou solidité charge ; test boulochage ; compression export ; échantillons 2 coloris.

---

## 4. Packs : coûts max combinés (annexe marge)

| Pack | PV TTC | PV HT | Coût composants max cible (65 %) | Plancher (55 %) |
|---|---|---|---|---|
| Pack Cocooning | 94,90 € | 79,08 € | **27,68 €** | 35,59 € |
| Pack Grand Froid | 109,90 € | 91,58 € | **32,05 €** | 41,21 € |
| Pack Auto Hiver | 54,90 € | 45,75 € | **16,01 €** | 20,59 € |
| Pack Ski | 104,90 € | 87,42 € | **30,60 €** | 39,34 € |

⚠️ **Alerte marge packs** : si chaque composant est acheté à son propre coût max cible (65 %),
la somme dépasse le coût max du pack. Ex. Pack Cocooning : 17,47 (Nid) + 7,26 (Nuage) +
7,26 (Brasero) = **31,99 €** > 27,68 € → marge pack ≈ 59,5 % HT seulement. Décision
commerciale à assumer par pack : (a) négocier les composants **sous** leur cible individuelle,
(b) accepter ~55-60 % sur les packs (ils servent l'AOV et l'acquisition), ou (c) recomposer le
pack. À trancher lors du sourcing, pack par pack.

---

## 5. RFQ type — informations EXACTES à demander à chaque fournisseur

Grille commune (copier-coller dans chaque demande de devis ; toute case vide = **À SOURCER**) :

1. Prix unitaire HT EXW par paliers : 100 / 300 / 500 / 1 000 / 3 000 unités (devis écrit, devise EUR ou USD + taux de référence).
2. MOQ réel par variante (taille/couleur) et par commande.
3. Coût + délai des échantillons ; échantillons de production (pas seulement photos).
4. Délai de production après approbation d'échantillon (jours ouvrés) et capacité mensuelle.
5. Code **HS/TARIC** du produit + pays d'origine (base du calcul douanier — taux à valider ensuite avec un transitaire).
6. Conditionnement : polybag individuel ?, carton d'export (dims, poids brut, unités/carton, **CBM**), compression sous vide possible ?.
7. Composition/matériaux exacts et grammages, avec **preuve pesée/test** si claim (g/m², N, cycles).
8. Étiquetage : étiquette composition textile UE 1007/2011 en français fournie ou à produire ?, étiquette entretien, marquage origine (« Fabriqué en … »), notice d'usage FR pour produits chauffants.
9. Conformité : rapports REACH (azo, phtalates, PAH, nickel) < 12 mois, OEKO-TEX Standard 100 si disponible, FDS/CLP pour préparations chimiques, rapports de test spécifiques listés par fiche produit ci-dessus.
10. Audit social/qualité usine : BSCI / SEDEX / ISO 9001 (copie du certificat + date d'audit).
11. Qualité : taux de défauts constaté (AQL proposé), politique de remplacement des défauts, garantie durée.
12. Personnalisation : étiquette marque tissée/cousue, packaging imprimé BORÉALE (coût + MOQ), couleur Pantone/TCX disponibles.
13. Logistique : Incoterms proposés (EXW/FOB/DDP), port de chargement, lead time fret indicatif (à recouper transitaire), emballage aimants le cas échéant (IATA).
14. Codes-barres : EAN-13 fournis ou à générer côté BORÉALE (GS1 France).
15. Conditions : paiement (acompte/solde), pénalités retard, responsabilité conformité produit à l'import (clause écrite).

Spécificités déjà listées par produit en §3 (tests micro-ondes du Foyer, force magnétique de la
Sentinelle, cycles des Braise, tables de tailles textiles, etc.).

---

## 6. Processus de décision sourcing (interne)

1. **Court-list** : 2-3 fournisseurs par famille (textile polaire, graines/bouillottes, accessoires auto) — recherche propriétaire, aucune recommandation fournie ici.
2. **RFQ** avec la grille §5 → comparaison landed cost (formule §1) vs coût max/plancher de chaque fiche.
3. **Échantillons** : test 2 semaines réel (5 lavages, 50 cycles micro-ondes Foyer/Brasero, gel/dégel Sentinelle/GGP, cristallisation ×20 Braise) — résultats consignés, photos/vidéos = futurs contenus UGC authentiques.
4. **Décision** : sous la cible = GO ; entre cible et plancher = GO conditionnel (volume/exclusivité) ; au-dessus du plancher = NO GO ou révision PV assumée.
5. **Mise à jour boutique** (admin, sans code) : coûts réels → recalcul de marge, prix si nécessaire, stocks réels à la place des 60/variante du seed, photos réelles à la place des SVG provisoires.
6. **Traçabilité** : chaque rapport de test reçu est archivé et referencedans la fiche produit (base de la conformité et du discours « sélection testée »).

---

## 7. Inconnues assumées (rappel)

Sont **À SOURCER** pour les 14 produits : coûts réels, MOQ, délais, CBM/cartons, codes TARIC et
taux de douane, rapports de test (REACH, inflammabilité, glissance, magnétisme, FDS/CLP),
certifications usines, taux de défauts, coûts de personnalisation. Sont **internes et
modifiables** : prix de vente, seuils de marge (65/55), rôles merchandising, contenus packs.
Aucune donnée de ce document ne peut être publiée telle quelle en argument commercial :
seuls les résultats de tests réels reçus (§6.3) pourront alimenter le discours produit.
