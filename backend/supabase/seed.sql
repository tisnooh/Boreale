-- =============================================================
-- BORÉALE — seed.sql (catalogue de lancement)
-- Idempotent : peut être ré-exécuté (upserts sur slug/sku/code/key).
--
-- ⚠️ Les quantités de stock ci-dessous sont des VALEURS INITIALES
--    PLACEHOLDER : à remplacer par le stock réel dès réception
--    fournisseur (voir TASKS.md). Les prix sont les prix de vente
--    publics décidés dans docs/PRODUCT_RESEARCH.md.
-- =============================================================

-- ---------- Catégories ----------
insert into categories (slug, name, tagline, description, image_url, position) values
  ('confort-textile', 'Confort & Textile', 'La première ligne contre le froid',
   'Chaussettes polaires, gants tactiles, bonnets, cache-cous, leggings thermiques et chaussons fourrés : tout le textile qui vous isole du froid, sélectionné matière par matière.',
   '/images/cat-confort.svg', 1),
  ('chaleur', 'Chaleur', 'La chaleur, sans électricité',
   'Bouillottes sèches, chauffe-mains réutilisables, chaussons micro-ondes et plaids : des solutions de chaleur simples, sûres et durables — aucun produit électrique au catalogue tant que la conformité CE n''est pas vérifiée fournisseur par fournisseur.',
   '/images/cat-chaleur.svg', 2),
  ('auto-hiver', 'Auto Hiver', 'Rouler serein par tous les temps',
   'Housses pare-brise antigivre, gants grattoirs et accessoires pratiques : tout pour dégivrer vite, conduire tranquille et garder un coffre prêt pour l''hiver.',
   '/images/cat-auto.svg', 3),
  ('maison-cocooning', 'Maison / Cocooning', 'Le refuge parfait',
   'Plaids sherpa, plaids à manches, chaussons et bouillottes : transformer le salon en refuge quand le thermomètre plonge.',
   '/images/cat-maison.svg', 4)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  image_url = excluded.image_url, position = excluded.position;

-- ---------- Produits ----------
insert into products (slug, name, subtitle, description, long_description, type, is_featured, image_url, badge, tags, seo_title, seo_description, position) values
('chaussettes-polaires-nuage', 'Chaussettes polaires « Nuage »', 'Comme sur un nuage, entre le canapé et le bout du monde.',
 'Chaussettes épaisses en polaire doublée, intérieur brossé ultra-doux. Pensées pour les pieds qui n''ont jamais chaud : à la maison, au bureau, au chalet. Semelle antidérapante discrète et bord-côte qui ne serre pas.',
 'Les « Nuage » combinent une polaire 320 g/m² à l''extérieur et un intérieur brossé qui emprisonne l''air chaud. La semelle est dotée de picots antidérapants pour les parquets, et la maille du bord-côte maintient sans comprimer la cheville. Lavage en machine à 30°, séchage à plat. Trois raisons de les adopter : elles réchauffent dès l''enfilage, elles ne glissent pas sur le carrelage, et elles gardent leur moelleux lavage après lavage.',
 'product', true, '/products/chaussettes-polaires-nuage.svg', null,
 '{chaussettes,polaire,cocooning,cadeau}',
 'Chaussettes polaires chaudes et épaisses — Nuage | BORÉALE',
 'Chaussettes polaires doublées, intérieur brossé, semelle antidérapante. Chaudes dès l''enfilage. Expédié depuis la France, retours 30 jours.', 1),

('gants-tactiles-contact', 'Gants tactiles « Contact »', 'Répondre au téléphone sans se geler les doigts.',
 'Gants en maille chaude et stretch avec bouts conducteurs (pouce + index + majeur), paume antidérapante en silicone. Composer un code, payer sans contact, prendre une photo : tout se fait gants aux mains.',
 'Maille acrylique-nylon dense doublée d''une fine polaire, les « Contact » restent fins pour garder la dextérité tout en coupant le vent. Les trois doigts conducteurs fonctionnent avec tous les écrans capacitifs (smartphones, tablettes, écrans tactiles de voiture). Les picots silicone de la paume assurent la prise sur le guidon, le volant ou le téléphone. Entretien : lavage à la main, séchage à plat.',
 'product', false, '/products/gants-tactiles-contact.svg', null,
 '{gants,tactile,smartphone,velo}',
 'Gants tactiles chauds pour smartphone — Contact | BORÉALE',
 'Gants tactiles chauds et fins : bouts conducteurs, paume antidérapante. Utilisez votre smartphone sans les retirer. Livraison France offerte dès 69 €.', 2),

('bonnet-torse-boreale', 'Bonnet torsadé « Boréale »', 'Maille torsadée épaisse, doublure polaire.',
 'Le bonnet signature : grosses torsades façon tricot de grand-mère, doublure polaire intégrale et revers qui protège les oreilles. Il garde sa forme et ne gratte pas.',
 'Tricoté dans une maille épaisse 100 % acrylique premium, doublé d''une polaire douce sur toute la surface, le « Boréale » coupe le vent même par températures négatives. Le revers se porte remonté ou replié selon la couverture d''oreilles souhaitée. Taille unique élastique qui convient du 54 au 60 cm de tour de tête. Lavage à la main recommandé, séchage à plat pour préserver les torsades.',
 'product', false, '/products/bonnet-torse-boreale.svg', null,
 '{bonnet,maille,laine,polaire}',
 'Bonnet torsadé doublé polaire — Boréale | BORÉALE',
 'Bonnet torsadé épais avec doublure polaire intégrale. Chaud, sans grattage, taille unique. Disponible en bleu nuit, écru et braise.', 3),

('cache-cou-polaire-bise', 'Cache-cou polaire « Bise »', 'Le vent du nord ne passe plus.',
 'Cache-cou tubulaire en polaire ultra-douce, sans couture irritante, qui se fait oublier sous une capuche ou un manteau. Séchage rapide après l''effort.',
 'La « Bise » protège la zone la plus exposée au froid — le cou — avec une polaire double face 240 g/m², respirante et à séchage rapide. Sa forme tubulaire sans couture évite les frottements ; elle se porte en col, remontée sur le nez par grand froid, ou en bandeau. Compacte, elle se glisse dans une poche. Lavage machine 30°. Deux coloris intemporels : noir et bleu glacier.',
 'product', false, '/products/cache-cou-polaire-bise.svg', null,
 '{cache-cou,cou,polaire,ski}',
 'Cache-cou polaire chaud et doux — Bise | BORÉALE',
 'Cache-cou polaire tubulaire sans couture, séchage rapide. Protection cou et nez par grand froid. Idéal ski, vélo, quotidien.', 4),

('legging-thermique-seconde-peau', 'Legging thermique « Seconde Peau »', 'La chaleur invisible, toute la journée.',
 'Legging thermique intérieur brossé, extérieur mat : invisible sous un jean, une jupe ou un pantalon de ski. Taille haute qui tient en place sans rouler.',
 'Le « Seconde Peau » associe une maille extérieure opaque et mate à un intérieur brossé façon duvet qui conserve la chaleur corporelle. La ceinture haute large (8 cm) reste en place en position assise comme en mouvement. Matière stretch 4 directions, coutures plates anti-frottement. Parfait en sous-couche pour le ski, la randonnée ou les bureaux mal chauffés. Lavage machine 30°, pas d''adoucissant.',
 'product', false, '/products/legging-thermique-seconde-peau.svg', null,
 '{legging,thermique,sous-couche,ski}',
 'Legging thermique femme intérieur brossé — Seconde Peau | BORÉALE',
 'Legging thermique taille haute, intérieur brossé chaud, extérieur mat invisible sous les vêtements. Sous-couche idéale ski et quotidien.', 5),

('chaussons-fourres-refuge', 'Chaussons fourrés « Refuge »', 'Le carrelage a trouvé son adversaire.',
 'Chaussons fourrés façon peau lainée, semelle extérieure antidérapante assez robuste pour aller chercher le courrier. Dessus déperlant, doublure moelleuse.',
 'Les « Refuge » enveloppent le pied d''une doublure synthétique façon peau lainée (12 mm) et le maintiennent avec un dessus suédine déperlant. La semelle extérieure en caoutchouc thermoplastique antidérapant permet de circuler dehors sur sol sec (terrasse, boîte aux lettres, couloir). Entretien : lavage en surface, brossage de la doublure pour lui rendre son gonflant. Du 36 au 45.',
 'product', false, '/products/chaussons-fourres-refuge.svg', null,
 '{chaussons,fourres,maison,cadeau}',
 'Chaussons fourrés antidérapants homme et femme — Refuge | BORÉALE',
 'Chaussons fourrés peau lainée avec semelle antidérapante extérieur. Chauds, moelleux, du 36 au 45. Livraison France, retours 30 jours.', 6),

('chaussons-bouillotte-foyer', 'Chaussons bouillotte « Foyer »', 'Des chaussons qui sortent du micro-ondes.',
 'Chaussons chauffants à garnissage naturel (graines de lin + lavande) : 90 secondes au micro-ondes et jusqu''à une heure de chaleur enveloppante. Le rituel d''hiver qui réconcilie avec les soirées froides.',
 'Les « Foyer » contiennent des graines de lin françaises et des fleurs de lavande qui restituent une chaleur sèche et régulière, sans électricité ni eau bouillante. Mode d''emploi : 90 secondes au micro-ondes à 800 W maximum (toujours surveiller la première chauffe), puis enfiler et profiter jusqu''à ~1 heure de chaleur. Housse externe lavable (zip), chaussons intérieurs à garnissage non lavable. Ne pas utiliser sur peau lésée ; tester la température avant usage ; ne pas réchauffer plus longtemps que la durée indiquée. Taille unique souple, convient du 36 au 45.',
 'product', true, '/products/chaussons-bouillotte-foyer.svg', 'Coup de cœur',
 '{chaussons,bouillotte,micro-ondes,lavande,cadeau}',
 'Chaussons bouillotte micro-ondes graines de lin — Foyer | BORÉALE',
 'Chaussons chauffants micro-ondes à graines de lin et lavande : 90 s et jusqu''à 1 h de chaleur. Housse lavable, taille 36-45.', 7),

('chauffe-mains-reutilisables-braise', 'Chauffe-mains réutilisables « Braise » (×2)', 'La chaleur de poche, sans piles.',
 'Cliquez, cristallisez, chauffez : chaleur instantanée jusqu''à ~40 minutes. Réutilisables des centaines de fois — 10 minutes dans l''eau bouillante suffisent à les régénérer.',
 'Chaque « Braise » contient une solution d''acétate de sodium surfondue : la pastille métallique déclenche une cristallisation exothermique immédiate et sans danger (pas de flamme, pas de piles, pas de combustion). Format 10 × 14 cm glissable dans une poche ou des gants. Régénération : envelopper dans un linge et plonger 10 minutes dans l''eau frémissante jusqu''à dissolution complète des cristaux. Vendus par deux. Enveloppe PVC résistante, ne pas percer ; usage externe uniquement.',
 'product', false, '/products/chauffe-mains-reutilisables-braise.svg', null,
 '{chauffe-mains,poches,reutilisable,randonnee}',
 'Chauffe-mains réutilisables sans piles (×2) — Braise | BORÉALE',
 'Chauffe-mains réutilisables à cristallisation : chaleur instantanée ~40 min, régénérables à l''eau bouillante. Lot de 2. Sans piles.', 8),

('plaid-polaire-alpage', 'Plaid polaire « Alpage » 130×170', 'L''indispensable du canapé, version dense.',
 'Plaid en polaire 280 g/m² dense et légère à la fois, traitement anti-boulochage, lavable en machine. Sur le canapé, au lit, ou dans les gradins un soir de match.',
 'L''« Alpage » est tricoté dans une polaire double face 280 g/m² : assez dense pour couper un courant d''air, assez léger (moins de 900 g) pour être emporté partout. Finition ourlets cousus, pas de surfilage qui s''effiloche. Anti-boulochage testé 20 lavages. Dimensions généreuses 130 × 170 cm pour s''y envelopper entièrement. Lavage machine 30°, séchage rapide à l''air libre. Trois coloris : bleu nuit, écru, vert sapin.',
 'product', false, '/products/plaid-polaire-alpage.svg', null,
 '{plaid,polaire,canape,cadeau}',
 'Plaid polaire chaud 130×170 anti-boulochage — Alpage | BORÉALE',
 'Plaid polaire 280 g/m², 130×170 cm, anti-boulochage, lavable en machine. Léger et chaud. Trois coloris hiver.', 9),

('bouillotte-noyaux-cerise-brasero', 'Bouillotte sèche « Brasero » noyaux de cerise', 'Des noyaux de cerise, et c''est tout.',
 'Bouillotte sèche 100 % coton garnie de noyaux de cerise nettoyés : micro-ondes ou four, elle épouse la nuque, les lombaires ou le ventre et diffuse une chaleur douce ~30 minutes.',
 'Le « Brasero » reprend un remède de grand-mère éprouvé : les noyaux de cerise emmagasinent la chaleur et la restituent lentement, sans risque de brûlure par liquide comme une bouillotte à eau. Enveloppe 100 % coton à deux compartiments pour que les noyaux restent en place. Chauffe : 2 min au micro-ondes (800 W) ou 10 min au four à 100 °C dans un plat. Housse externe amovible lavable à 30°. Dimensions ~50 × 15 cm. Toujours tester la température avant application ; ne pas utiliser sur peau lésée ou sur un enfant sans surveillance.',
 'product', false, '/products/bouillotte-noyaux-cerise-brasero.svg', null,
 '{bouillotte,noyaux-cerise,douleur,cocooning}',
 'Bouillotte sèche noyaux de cerise coton — Brasero | BORÉALE',
 'Bouillotte sèche garnie de noyaux de cerise, housse 100 coton lavable. Chaleur douce ~30 min, micro-ondes ou four. Fabriquée simplement, sûre.', 10),

('housse-pare-brise-sentinelle', 'Housse pare-brise antigivre « Sentinelle »', 'Plus jamais gratter le matin.',
 'Battant de protection magnétique qui se déplie en 30 secondes sur le pare-brise : fini le grattage, le sel et les essuie-glaces collés par le gel. Aussi utile contre neige, feuilles et UV.',
 'La « Sentinelle » se fixe en un geste : aimants intégrés pris dans les portières avant (maintien même par vent fort jusqu''à ~60 km/h), rabats latéraux et sangles de rétroviseurs. Tissu tricouche : aluminium réfléchissant, mousse isolante, intérieur doux anti-rayures. Taille Standard (145 × 110 cm) pour berlines et citadines ; taille XL (165 × 120 cm) pour SUV et monospaces. Se replie dans un sac fourni (format A4). Stockage coffre ou boîte à gants. Ne remplace pas un dégivrage réglementaire complet avant de rouler : retirez la housse, démarrez, vérifiez la visibilité sur toutes les vitres.',
 'product', true, '/products/housse-pare-brise-sentinelle.svg', null,
 '{voiture,pare-brise,antigivre,hiver}',
 'Housse pare-brise antigivre magnétique — Sentinelle | BORÉALE',
 'Bâche pare-brise magnétique anti-givre et anti-neige, pose en 30 s, tailles berline et SUV. Plus de grattage le matin. Expédié de France.', 11),

('gant-grattoir-polaire', 'Gant grattoir « Polaire »', 'Gratter sans se geler la main.',
 'Le grattoir à pare-brise dans un gant : lame ABS rigide d''un côté, fourrure polaire qui protège la main et bloque la neige de l''autre. Fini les doigts rouges et mouillés.',
 'Le « Polaire » combine une lame ABS de 10 cm (arête plane pour le givre, dents pour la glace épaisse) et une manchette en fausse fourrure polaire qui empêche la neige fondue de couler dans la manche. Le gant intérieur est en polyester brossé, la paume antidérapante. Taille unique adulte. Se secoue et se range sec dans la boîte à gants. Ne pas utiliser sur vitres teintées ou films : testez sur une petite zone.',
 'product', false, '/products/gant-grattoir-polaire.svg', null,
 '{grattoir,pare-brise,voiture,gant}',
 'Gant grattoir pare-brise polaire — Polaire | BORÉALE',
 'Grattoir pare-brise avec gant fourré intégré : lame ABS + manchette polaire anti-neige. Grattez sans vous geler la main.', 12),

('plaid-sherpa-nid', 'Plaid sherpa « Nid » 150×200', 'Double face : polaire lisse, sherpa nuage.',
 'Le plaid XL double face : sherpa ultra-moelleux à l''intérieur, polaire lisse à l''extérieur. 150 × 200 cm pour s''y perdre à deux. La pièce maîtresse de l''hiver à la maison.',
 'Le « Nid » associe une face sherpa 380 g/m² (poil long 15 mm, toucher peluche) à une face polaire lisse qui retient la chaleur. Format généreux 150 × 200 cm : assez grand pour un canapé deux places ou un lit une personne. Ourlets renforcés double piqûre. Lavage machine 30° en cycle doux, séchage à plat — la sherpa retrouve son gonflant en la brossant à rebrousse-poil. Deux coloris : écru et bleu nuit.',
 'product', true, '/products/plaid-sherpa-nid.svg', null,
 '{plaid,sherpa,xl,cocooning,cadeau}',
 'Plaid sherpa XL 150×200 double face — Nid | BORÉALE',
 'Plaid sherpa ultra-doux 150×200 cm, double face sherpa/polaire, lavable en machine. Le cocon des soirées d''hiver.', 13),

('plaid-manches-cocon', 'Plaid à manches « Cocon »', 'Le plaid qui libère les mains.',
 'Plaid à manches oversize avec poche kangourou : lire, télécommander, siroter — sans jamais avoir froid. S''enfile en deux secondes et remplace peignoir et plaid.',
 'Le « Cocon » est coupé oversize (manches larges, longueur 150 cm, envergure 130 cm) pour envelopper toutes les morphologies, homme ou femme. Polaire double face 300 g/m², poche kangourou centrale pour téléphone/télécommande/mains, col cheminée. Se lave en machine à 30°. Deux coloris : gris orage et vert sapin. Parfait pour le télétravail dans un bureau frais, les soirées TV ou les matins de week-end.',
 'product', false, '/products/plaid-manches-cocon.svg', null,
 '{plaid,manches,cocooning,teletravail}',
 'Plaid à manches polaire oversize — Cocon | BORÉALE',
 'Plaid à manches oversize avec poche kangourou, polaire 300 g/m². Chaud, libre de ses mouvements, lavable en machine.', 14),

-- ---------- Bundles (type = bundle ; économie = somme des prix actuels − prix pack) ----------
('pack-cocooning', 'Pack Cocooning', 'La soirée refuge, tout compris.',
 'Plaid sherpa « Nid » (écru) + chaussettes polaires « Nuage » (S/M, écru) + bouillotte sèche « Brasero ». Soit 109,70 € séparément — le pack est à 94,90 €, vous économisez 14,80 €.',
 'Le pack des soirées d''hiver : on enfile les « Nuage », on allume une bougie, on chauffe le « Brasero » deux minutes, et on disparaît dans le « Nid ». Contenu : 1 plaid sherpa 150×200 écru, 1 paire de chaussettes polaires S/M écru, 1 bouillotte noyaux de cerise. Le pack a son propre stock ; en cas de rupture d''un composant, nous vous contactons avant expédition pour proposer un remplacement ou un remboursement.',
 'bundle', false, '/products/pack-cocooning.svg', '−14,80 €',
 '{pack,cocooning,cadeau,plaid}',
 'Pack Cocooning : plaid sherpa + chaussettes + bouillotte | BORÉALE',
 'Le pack soirée d''hiver : plaid sherpa Nid, chaussettes polaires Nuage, bouillotte Brasero. 94,90 € au lieu de 109,70 € séparément.', 15),

('pack-grand-froid', 'Pack Grand Froid', 'Kit complet pour températures négatives.',
 'Bonnet torsadé « Boréale » (bleu nuit) + cache-cou « Bise » (noir) + gants tactiles « Contact » (L/XL, noir) + chaussons bouillotte « Foyer ». Soit 129,60 € séparément — le pack est à 109,90 €, vous économisez 19,70 €.',
 'Tout l''équipement grand froid en un pack : la tête (bonnet doublé polaire), le cou (cache-cou sans couture), les mains (gants tactiles) et les pieds (chaussons bouillotte pour le retour à la maison). Contenu détaillé dans « Ce pack contient » ci-dessous. Idéal cadeau de Noël utile ou préparation vague de froid.',
 'bundle', false, '/products/pack-grand-froid.svg', '−19,70 €',
 '{pack,grand-froid,cadeau,noel}',
 'Pack Grand Froid : bonnet + cache-cou + gants + chaussons | BORÉALE',
 'Kit complet grand froid : bonnet Boréale, cache-cou Bise, gants tactiles Contact, chaussons bouillotte Foyer. 109,90 € au lieu de 129,60 €.', 16),

('pack-auto-hiver', 'Pack Auto Hiver', 'La voiture prête avant la première gelée.',
 'Housse pare-brise « Sentinelle » (Standard) + gant grattoir « Polaire » + chauffe-mains « Braise » ×2. Soit 64,70 € séparément — le pack est à 54,90 €, vous économisez 9,80 €.',
 'Le trio du pare-brise gelé et des mains froides au volant : la « Sentinelle » se pose le soir (plus de givre le matin), le « Polaire » dépanne sur les vitres latérales, les « Braise » réchauffent les mains le temps que le chauffage monte. Un pack à garder dans le coffre d''octobre à mars.',
 'bundle', false, '/products/pack-auto-hiver.svg', '−9,80 €',
 '{pack,voiture,auto,hiver}',
 'Pack Auto Hiver : housse pare-brise + grattoir + chauffe-mains | BORÉALE',
 'Le pack voiture hiver : housse antigivre Sentinelle, gant grattoir Polaire, chauffe-mains Braise ×2. 54,90 € au lieu de 64,70 €.', 17),

('pack-ski', 'Pack Ski', 'Sur les pistes et au coin du feu.',
 'Legging thermique « Seconde Peau » (M/L) + cache-cou « Bise » (bleu glacier) + gants tactiles « Contact » (L/XL) + bonnet « Boréale » (braise). Soit 124,60 € séparément — le pack est à 104,90 €, vous économisez 19,70 €.',
 'La sous-couche et les accessoires pour une journée de ski complète : le legging thermique sous la combinaison, le cache-cou remonté sur le nez dans le télésiège, les gants tactiles pour le forfait et le téléphone, le bonnet sous le casque ou à l''après-ski. Taille des composants modifiables sur demande via le service client.',
 'bundle', false, '/products/pack-ski.svg', '−19,70 €',
 '{pack,ski,pistes,montagne}',
 'Pack Ski : legging thermique + cache-cou + gants + bonnet | BORÉALE',
 'Le pack journée de ski : legging Seconde Peau, cache-cou Bise, gants Contact, bonnet Boréale. 104,90 € au lieu de 124,60 €.', 18)
on conflict (slug) do update set
  name = excluded.name, subtitle = excluded.subtitle, description = excluded.description,
  long_description = excluded.long_description, type = excluded.type, is_featured = excluded.is_featured,
  image_url = excluded.image_url, badge = excluded.badge, tags = excluded.tags,
  seo_title = excluded.seo_title, seo_description = excluded.seo_description, position = excluded.position;

-- ---------- Liaisons produits ↔ catégories ----------
insert into product_categories (product_id, category_id)
select p.id, c.id from products p cross join categories c
where (p.slug, c.slug) in (values
  ('chaussettes-polaires-nuage','confort-textile'), ('chaussettes-polaires-nuage','maison-cocooning'),
  ('gants-tactiles-contact','confort-textile'),
  ('bonnet-torse-boreale','confort-textile'),
  ('cache-cou-polaire-bise','confort-textile'),
  ('legging-thermique-seconde-peau','confort-textile'),
  ('chaussons-fourres-refuge','confort-textile'), ('chaussons-fourres-refuge','maison-cocooning'),
  ('chaussons-bouillotte-foyer','chaleur'), ('chaussons-bouillotte-foyer','maison-cocooning'),
  ('chauffe-mains-reutilisables-braise','chaleur'), ('chauffe-mains-reutilisables-braise','auto-hiver'),
  ('plaid-polaire-alpage','maison-cocooning'),
  ('bouillotte-noyaux-cerise-brasero','chaleur'), ('bouillotte-noyaux-cerise-brasero','maison-cocooning'),
  ('housse-pare-brise-sentinelle','auto-hiver'),
  ('gant-grattoir-polaire','auto-hiver'),
  ('plaid-sherpa-nid','maison-cocooning'),
  ('plaid-manches-cocon','maison-cocooning'),
  ('pack-cocooning','maison-cocooning'),
  ('pack-grand-froid','confort-textile'),
  ('pack-auto-hiver','auto-hiver'),
  ('pack-ski','confort-textile')
)
on conflict do nothing;

-- ---------- Variantes ----------
-- Chaussettes Nuage (taille × couleur)
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-NUA-SM-BN','S/M · Bleu nuit','{"taille":"S/M (36-41)","couleur":"Bleu nuit"}',2490,180,0),
  ('BOR-NUA-SM-EC','S/M · Écru','{"taille":"S/M (36-41)","couleur":"Écru"}',2490,180,1),
  ('BOR-NUA-LX-BN','L/XL · Bleu nuit','{"taille":"L/XL (42-46)","couleur":"Bleu nuit"}',2490,200,2),
  ('BOR-NUA-LX-EC','L/XL · Écru','{"taille":"L/XL (42-46)","couleur":"Écru"}',2490,200,3)
) as v(sku,title,options,price,weight,ord)
where p.slug='chaussettes-polaires-nuage'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Gants Contact
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-CON-SM-NO','S/M · Noir','{"taille":"S/M","couleur":"Noir"}',2990,120,0),
  ('BOR-CON-SM-GL','S/M · Gris glacier','{"taille":"S/M","couleur":"Gris glacier"}',2990,120,1),
  ('BOR-CON-LX-NO','L/XL · Noir','{"taille":"L/XL","couleur":"Noir"}',2990,130,2),
  ('BOR-CON-LX-GL','L/XL · Gris glacier','{"taille":"L/XL","couleur":"Gris glacier"}',2990,130,3)
) as v(sku,title,options,price,weight,ord)
where p.slug='gants-tactiles-contact'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Bonnet Boréale
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-BON-U-BN','Taille unique · Bleu nuit','{"couleur":"Bleu nuit"}',3490,150,0),
  ('BOR-BON-U-EC','Taille unique · Écru','{"couleur":"Écru"}',3490,150,1),
  ('BOR-BON-U-BR','Taille unique · Braise','{"couleur":"Braise"}',3490,150,2)
) as v(sku,title,options,price,weight,ord)
where p.slug='bonnet-torse-boreale'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Cache-cou Bise
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-BIS-U-NO','Taille unique · Noir','{"couleur":"Noir"}',1990,80,0),
  ('BOR-BIS-U-BL','Taille unique · Bleu glacier','{"couleur":"Bleu glacier"}',1990,80,1)
) as v(sku,title,options,price,weight,ord)
where p.slug='cache-cou-polaire-bise'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Legging Seconde Peau
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-LEG-XS','XS/S','{"taille":"XS/S (34-38)"}',3990,280,0),
  ('BOR-LEG-ML','M/L','{"taille":"M/L (38-42)"}',3990,300,1),
  ('BOR-LEG-XL','XL/XXL','{"taille":"XL/XXL (42-48)"}',3990,320,2)
) as v(sku,title,options,price,weight,ord)
where p.slug='legging-thermique-seconde-peau'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Chaussons Refuge
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-REF-3637','36-37','{"taille":"36-37"}',4490,520,0),
  ('BOR-REF-3839','38-39','{"taille":"38-39"}',4490,540,1),
  ('BOR-REF-4041','40-41','{"taille":"40-41"}',4490,560,2),
  ('BOR-REF-4243','42-43','{"taille":"42-43"}',4490,600,3),
  ('BOR-REF-4445','44-45','{"taille":"44-45"}',4490,620,4)
) as v(sku,title,options,price,weight,ord)
where p.slug='chaussons-fourres-refuge'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Foyer (hero), Braise, Brasero, gant Polaire (variante unique)
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('chaussons-bouillotte-foyer','BOR-FOY-U','Taille unique (36-45)','{"taille":"Unique (36-45)"}',4490,900,0),
  ('chauffe-mains-reutilisables-braise','BOR-BRA-U','Lot de 2','{"contenu":"Lot de 2"}',1690,240,0),
  ('bouillotte-noyaux-cerise-brasero','BOR-BRS-U','Standard 50×15 cm','{"taille":"50×15 cm"}',2490,850,0),
  ('gant-grattoir-polaire','BOR-GGP-U','Taille unique','{"taille":"Unique"}',1290,110,0)
) as v(slug,sku,title,options,price,weight,ord)
where p.slug=v.slug
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Plaid Alpage
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-ALP-BN','Bleu nuit','{"couleur":"Bleu nuit"}',2990,880,0),
  ('BOR-ALP-EC','Écru','{"couleur":"Écru"}',2990,880,1),
  ('BOR-ALP-SA','Vert sapin','{"couleur":"Vert sapin"}',2990,880,2)
) as v(sku,title,options,price,weight,ord)
where p.slug='plaid-polaire-alpage'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Sentinelle (2 tailles)
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('BOR-SEN-ST','Standard (berlines, citadines)','{"taille":"Standard 145×110 cm"}',3490,700,0),
  ('BOR-SEN-XL','XL (SUV, monospaces)','{"taille":"XL 165×120 cm"}',3990,820,1)
) as v(sku,title,options,price,weight,ord)
where p.slug='housse-pare-brise-sentinelle'
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Nid et Cocon
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('plaid-sherpa-nid','BOR-NID-EC','Écru','{"couleur":"Écru"}',5990,1800,0),
  ('plaid-sherpa-nid','BOR-NID-BN','Bleu nuit','{"couleur":"Bleu nuit"}',5990,1800,1),
  ('plaid-manches-cocon','BOR-COC-GR','Gris orage','{"couleur":"Gris orage"}',4990,1200,0),
  ('plaid-manches-cocon','BOR-COC-SA','Vert sapin','{"couleur":"Vert sapin"}',4990,1200,1)
) as v(slug,sku,title,options,price,weight,ord)
where p.slug=v.slug
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

-- Bundles (variante unique chacun) + contenu bundle_items
insert into product_variants (product_id, sku, title, options, price_cents, weight_g, position)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.weight, v.ord
from products p cross join (values
  ('pack-cocooning','BOR-PCK-COCOON','Pack Cocooning','{}',9490,2900,0),
  ('pack-grand-froid','BOR-PCK-GDFROID','Pack Grand Froid','{}',10990,1400,0),
  ('pack-auto-hiver','BOR-PCK-AUTO','Pack Auto Hiver','{}',5490,1050,0),
  ('pack-ski','BOR-PCK-SKI','Pack Ski','{}',10490,930,0)
) as v(slug,sku,title,options,price,weight,ord)
where p.slug=v.slug
on conflict (sku) do update set title=excluded.title, options=excluded.options, price_cents=excluded.price_cents;

update products set bundle_items = '[
  {"sku":"BOR-NID-EC","name":"Plaid sherpa « Nid » — Écru","quantity":1},
  {"sku":"BOR-NUA-SM-EC","name":"Chaussettes polaires « Nuage » — S/M, Écru","quantity":1},
  {"sku":"BOR-BRS-U","name":"Bouillotte sèche « Brasero »","quantity":1}
]'::jsonb where slug='pack-cocooning';

update products set bundle_items = '[
  {"sku":"BOR-BON-U-BN","name":"Bonnet torsadé « Boréale » — Bleu nuit","quantity":1},
  {"sku":"BOR-BIS-U-NO","name":"Cache-cou polaire « Bise » — Noir","quantity":1},
  {"sku":"BOR-CON-LX-NO","name":"Gants tactiles « Contact » — L/XL, Noir","quantity":1},
  {"sku":"BOR-FOY-U","name":"Chaussons bouillotte « Foyer »","quantity":1}
]'::jsonb where slug='pack-grand-froid';

update products set bundle_items = '[
  {"sku":"BOR-SEN-ST","name":"Housse pare-brise « Sentinelle » — Standard","quantity":1},
  {"sku":"BOR-GGP-U","name":"Gant grattoir « Polaire »","quantity":1},
  {"sku":"BOR-BRA-U","name":"Chauffe-mains réutilisables « Braise » (×2)","quantity":1}
]'::jsonb where slug='pack-auto-hiver';

update products set bundle_items = '[
  {"sku":"BOR-LEG-ML","name":"Legging thermique « Seconde Peau » — M/L","quantity":1},
  {"sku":"BOR-BIS-U-BL","name":"Cache-cou polaire « Bise » — Bleu glacier","quantity":1},
  {"sku":"BOR-CON-LX-NO","name":"Gants tactiles « Contact » — L/XL","quantity":1},
  {"sku":"BOR-BON-U-BR","name":"Bonnet torsadé « Boréale » — Braise","quantity":1}
]'::jsonb where slug='pack-ski';

-- ---------- Stocks initiaux (PLACEHOLDER — à ajuster au stock réel, voir TASKS.md) ----------
insert into inventory (variant_id, quantity, low_stock_threshold)
select id, 60, 8 from product_variants
on conflict (variant_id) do nothing;

-- ---------- Codes promo de lancement (modifiables/désactivables dans l'admin) ----------
insert into discounts (code, type, value, min_subtotal_cents, description, is_active) values
  ('WELCOME10', 'percentage', 10, 2000, 'Bienvenue : −10 % dès 20 € d''achat (première commande).', true),
  ('PACK10', 'fixed', 1000, 9000, '−10 € dès 90 € d''achat — cumulable uniquement hors bundles remisés.', true)
on conflict (code) do update set
  type = excluded.type, value = excluded.value, min_subtotal_cents = excluded.min_subtotal_cents,
  description = excluded.description;

-- ---------- Contenu homepage (modifiable dans l'admin → Contenu) ----------
insert into site_settings (key, value) values ('homepage', '{
  "announcementBar": "Livraison offerte dès 69 € · Expédié depuis la France · Retours sous 30 jours",
  "hero": {
    "eyebrow": "Collection Hiver",
    "title": "L''hiver, du bon côté.",
    "subtitle": "Des essentiels chauds, beaux et durables pour affronter le froid — sélectionnés et testés, expédiés depuis la France.",
    "ctaLabel": "Découvrir la collection",
    "ctaHref": "/collections",
    "secondaryCtaLabel": "Voir les packs",
    "secondaryCtaHref": "/collections#packs",
    "image": "/images/hero-hiver.jpg"
  },
  "benefits": [
    {"icon": "truck", "title": "Expédition France", "text": "Préparé et expédié depuis la France sous 24-48 h ouvrées."},
    {"icon": "shield", "title": "Paiement sécurisé", "text": "Stripe — cartes bancaires, Apple Pay, Google Pay."},
    {"icon": "return", "title": "Retours 30 jours", "text": "Un produit ne convient pas ? Retour simple sous 30 jours."},
    {"icon": "sparkle", "title": "Sélection testée", "text": "Chaque produit est choisi et essayé avant d''entrer au catalogue."}
  ],
  "featuredProductSlugs": ["chaussons-bouillotte-foyer", "housse-pare-brise-sentinelle", "plaid-sherpa-nid", "chaussettes-polaires-nuage"],
  "bundleSlugs": ["pack-cocooning", "pack-grand-froid", "pack-auto-hiver", "pack-ski"],
  "faq": [
    {"q": "Quels sont les délais de livraison ?", "a": "Les commandes sont préparées sous 24-48 h ouvrées depuis la France. Livraison standard : 48-72 h ouvrées (offerte dès 69 €). Express : 24-48 h ouvrées."},
    {"q": "Puis-je retourner un article ?", "a": "Oui, vous disposez de 30 jours après réception pour un retour, article non porté et dans son emballage. Remboursement sous 5 jours ouvrés après réception."},
    {"q": "Le paiement est-il sécurisé ?", "a": "Les paiements sont traités par Stripe (carte, Apple Pay, Google Pay). Nous ne stockons jamais vos données bancaires."},
    {"q": "Comment suivre ma commande ?", "a": "Un email de suivi vous est envoyé à l''expédition. Vous pouvez aussi suivre votre commande via la page Suivi avec votre numéro de commande et votre email."},
    {"q": "Les produits chauffants sont-ils électriques ?", "a": "Non : au lancement, nous ne proposons que des produits chauffants sans électricité (bouillottes sèches, chauffe-mains réutilisables, chaussons micro-ondes), plus simples et sûrs à utiliser."}
  ]
}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
