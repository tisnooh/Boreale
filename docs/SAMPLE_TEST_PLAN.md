# SAMPLE_TEST_PLAN.md — Plan de test des échantillons (seuil PASS/FAIL)

> Objectif : transformer chaque échantillon reçu en **preuve** (score /100, photos, vidéos,
> écarts vs promesse fournisseur) avant toute décision GO. Aucun échantillon non testé ne
> fonde une commande. Tests réalisés en interne, protocoles simples et reproductibles,
> résultats archivés dans `sourcing/attachments/<fournisseur>/<produit>/sample-report.md`.

---

## 1. Checklist universelle (16 points, pondérée /100)

| # | Point | Poids | Méthode | Knockout si |
|---|---|---|---|---|
| 1 | Aspect général | 6 | Inspection visuelle 50 cm + lumière du jour | défaut visible majeur (tache, trou, asymétrie) |
| 2 | Matière / touché | 8 | Comparaison au descriptif devis (composition, grammage annoncé) | matière différente du devis |
| 3 | Odeur | 6 | À l'ouverture du colis puis 24 h aéré | odeur chimique persistante après 24 h |
| 4 | Finitions (bords, fils, impressions) | 6 | Inspection macro photo | fils tirés > 3 points, bords non finis |
| 5 | Coutures | 8 | Traction manuelle + examen points/cm | couture ouverte ou saut de points |
| 6 | Dimensions | 8 | Mètre ruban, 3 mesures par cote vs table cm fournisseur | écart > tolérance déclarée (± 1 cm textile, ± 0,5 cm semelle) |
| 7 | Poids | 4 | Balance 1 g vs poids net devis (R4) | écart > 10 % |
| 8 | Packaging reçu | 4 | État colis, protection, étiquetage présent | produit arrivé endommagé par packaging inadapté |
| 9 | Résistance (usage simulé) | 10 | Protocole produit (§2) | rupture fonctionnelle |
| 10 | Fonctionnement | 12 | Protocole produit (§2) | fonction principale non tenue |
| 11 | Confort / ergonomie | 8 | Port/test 30 min par 2 personnes internes | irritation, gêne rédhibitoire (2/2 testeurs) |
| 12 | Lavage (si pertinent) | 8 | 3 cycles 30 °C selon étiquette, séchage à plat | déformation > 3 %, boulochage visible niveau ≥ 3, couleurs dégorgeant |
| 13 | Photo | 4 | Pack photo réalisé (produit, étiquettes, packaging, macro défauts) | non réalisé = point 0 (non knockout) |
| 14 | Vidéo | 4 | Vidéo 30-60 s du test fonctionnel (§2) | non réalisée = point 0 |
| 15 | Comparaison promesse fournisseur | 10 | Écart devis/échantillon : composition, grammage, dims, poids, fonction | écart matériel non déclaré |
| 16 | Défauts constatés | 4 | Liste datée + photos | défaut de sécurité |

**Score /100 = somme des points obtenus (0 → poids du point).**

### Seuil PASS/FAIL
- **PASS : score ≥ 80** et **zéro knockout** → alimente QUALITY_STATUS = OK (si preuves usine reçues par ailleurs).
- **CONDITIONNEL : 65-79** ou 1 point non-knockout à 0 → QUALITY_STATUS = PARTIEL ; actions correctives écrites au fournisseur + **contre-échantillon obligatoire** avant GO.
- **FAIL : < 65 ou tout knockout** → QUALITY_STATUS = NON → décision NO GO (moteur SCORECARD §3).

---

## 2. Protocoles fonctionnels par produit (point 9-10 détaillés)

| Produit | Protocole minimal (à consigner : valeurs + photos/vidéo) |
|---|---|
| Nuage | 3 lavages ; semelle : 20 pas carrelage sec/humide (glisse ?) ; bord-côte : 10 enfilages (tenue) |
| Contact | Tactile : 30 interactions écran (3 doigts claimés) neuf + après 3 lavages ; paume : 10 min guidon/volant |
| Bonnet | Extension 20× (reprise de forme) ; port 30 min (gratte ?) ; lavage main + séchage (torsades) |
| Bise | Port 30 min extérieur/ventilateur (couvre nez sans gêne) ; séchage après humidification (min) |
| Seconde Peau | Port 2 h assis/debout (ceinture roule ?) ; opacité test lumière ; 3 lavages (rétrécissement mesuré) |
| Refuge | 20 pas carrelage + 10 pas extérieur sec (adhérence, usure) ; enfilage 10× ; odeur doublure 24 h |
| **Foyer** | **50 cycles micro-ondes 90 s/800 W** (relevé T° surface/cœur à 0/10/30/60 min aux cycles 1, 10, 25, 50) ; intégrité coutures garnissage après cycles (photo macro) ; odeur à chaud ; housse : 3 lavages ; adaptabilité pointures 36/41/45 ; vérification notice FR vs comportement réel |
| Braise | 20 cristallisations (durée chaleur mesurée à 20 °C ambiant) ; régénérations 20× eau frémissante ; chute 1,5 m × 3 + compression 20 kg (fuite ?) ; froid −18 °C 12 h (fissure ?) |
| Alpage | Pesée m² (grammage) ; 3 lavages dims ; frottement 200 cycles tissu coton (boulochage noté 1-5) |
| Brasero | 30 cycles chauffe (micro-ondes 2 min/800 W + four 10 min/100 °C alternés) : odeur, coutures, T° surface 0/15/30 min ; housse lavée 3× |
| Sentinelle | Pose/retrait 20× sur véhicule réel ; nuit de gel réelle (ou congélateur −18 °C sur vitre témoin) : retrait sans grattage ; aimants : mesure d'arrachement (dynamomètre ou peson) vs claim ; vent simulé (souffleur 60 km/h 2 min) ; souplesse −18 °C |
| Polaire (gant grattoir) | Grattage givre réel ou glace −18 °C 10 min : efficacité + main sèche/intacte ; choc à froid −18 °C (chute 1 m, casse ?) ; arête : passage doigt (coupant ?) |
| Nid | Pesée m² 2 faces ; 3 lavages dims + boulochage 200 frottements ; traction couture 10 kg ; poil sherpa : arrachage manuel noté |
| Cocon | Port 1 h télétravail (manches/poche fonctionnelles) ; poche chargée 2 kg 10 min (coutures) ; 3 lavages dims |

Chaque protocole produit une **fiche relevé** datée : valeurs mesurées vs valeurs claimées
(R2-R4, R37 du devis) → alimente le point 15 « comparaison promesse ».

---

## 3. Règles de campagne d'échantillons

1. Commander **dès le statut SAMPLE REQUIRED** si le devis est crédible (landed estimé ≤ plancher) — sinon archiver sans frais.
2. Quantité : 2 unités par variante critique (1 test destructif + 1 témoin archive) ; produits taillés : ≥ 3 tailles (RFQ_SUPPLIERS §5).
3. Coût échantillon + port saisi dans `SAMPLE_COST` du xlsx (coût d'acquisition, pas un coût produit).
4. Délai de test interne cible : **7 jours ouvrés** réception → rapport signé (sinon pénalité interne planning, pas fournisseur).
5. Le témoin archive est étiqueté (fournisseur, date, n° devis) et conservé 24 mois (référence litige/qualité).
6. Photos/vidéos de test = futurs contenus marketing **authentiques** (avec accord écrit du fournisseur si images d'usine).
7. Un contre-échantillon de **production** (post-PO, pré-série) repasse la checklist complète avant libération de la série : même seuil PASS.
