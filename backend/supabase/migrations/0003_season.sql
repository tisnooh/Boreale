-- =============================================================
-- BORÉALE — 0003_season.sql
-- Architecture saisonnière : une seule boutique, deux univers.
-- Ajoute la notion de saison aux produits et catégories,
-- et seed les 6 univers ÉTÉ (taxonomie uniquement, aucun produit
-- inventé : le sourcing été sera une phase séparée).
-- =============================================================

alter table if exists products
  add column if not exists season text not null default 'winter'
  check (season in ('winter', 'summer', 'all-season'));

alter table if exists categories
  add column if not exists season text not null default 'winter'
  check (season in ('winter', 'summer', 'all-season'));

create index if not exists products_season_idx on products(season) where is_active;
create index if not exists categories_season_idx on categories(season) where is_active;

-- ---------- Univers ÉTÉ (taxonomie de réflexion, cf. mission) ----------
insert into categories (slug, name, tagline, description, image_url, position, season) values
  ('plage-piscine', 'Plage & Piscine', 'Le soleil, sans les coups de soleil',
   'Accessoires de plage et de piscine, serviettes et confort, rangement malin, protection solaire : l’été les pieds dans l’eau.',
   '/images/summer/cat-plage-piscine.svg', 10, 'summer'),
  ('voyage', 'Voyage', 'Partir léger, arriver frais',
   'Accessoires de voyage, organisation, bagagerie légère, confort en transport : tout pour les trajets d’été.',
   '/images/summer/cat-voyage.svg', 11, 'summer'),
  ('fraicheur', 'Fraîcheur', 'Garder la tête froide',
   'Accessoires rafraîchissants et solutions pratiques contre la chaleur, à la maison comme dehors.',
   '/images/summer/cat-fraicheur.svg', 12, 'summer'),
  ('outdoor', 'Outdoor', 'Dehors, tout simplement',
   'Pique-nique, camping léger, extérieur et loisirs : l’été se vit hors les murs.',
   '/images/summer/cat-outdoor.svg', 13, 'summer'),
  ('auto-ete', 'Auto Été', 'La voiture au frais',
   'Pare-soleil, organisation de voiture, protection chaleur et accessoires pratiques pour les trajets estivaux.',
   '/images/summer/cat-auto-ete.svg', 14, 'summer'),
  ('maison-terrasse', 'Maison & Terrasse', 'Vivre dehors, même chez soi',
   'Confort extérieur, accessoires de terrasse, organisation et produits pratiques pour les soirées d’été.',
   '/images/summer/cat-maison-terrasse.svg', 15, 'summer')
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  image_url = excluded.image_url, position = excluded.position, season = excluded.season;

-- Contenu homepage été par défaut (clé séparée, système mutualisé settings)
insert into site_settings (key, value) values ('homepage-summer', '{
  "announcementBar": null,
  "hero": {
    "eyebrow": "Collection Été",
    "title": "L’été, à ciel ouvert.",
    "subtitle": "Des essentiels lumineux et malins pour la plage, les trajets et les terrasses — sélectionnés avec la même exigence que l’hiver.",
    "ctaLabel": "Découvrir l’été",
    "ctaHref": "/collections?saison=ete",
    "secondaryCtaLabel": "Voir les univers",
    "secondaryCtaHref": "/ete#univers",
    "image": "/images/summer/hero-ete.jpg"
  },
  "benefits": [
    {"icon": "truck", "title": "Expédition France", "text": "Préparé et expédié depuis la France sous 24-48 h ouvrées."},
    {"icon": "shield", "title": "Paiement sécurisé", "text": "Stripe — cartes bancaires, Apple Pay, Google Pay."},
    {"icon": "return", "title": "Retours 30 jours", "text": "Un produit ne convient pas ? Retour simple sous 30 jours."},
    {"icon": "sparkle", "title": "Sélection testée", "text": "Chaque produit est choisi et essayé avant d’entrer au catalogue."}
  ],
  "featuredProductSlugs": [],
  "bundleSlugs": [],
  "faq": [
    {"q": "La boutique été est-elle déjà ouverte ?", "a": "L’univers été est en préparation : les univers et la narration sont en place, la sélection de produits arrive après une phase de sourcing dédiée. Inscrivez-vous au courrier d’été pour être prévenu."},
    {"q": "Puis-je commander des produits hiver et été ensemble ?", "a": "Oui : le panier, le checkout et votre compte sont uniques et communs aux deux saisons."},
    {"q": "Les retours sont-ils identiques en été ?", "a": "Oui : 30 jours pour changer d’avis, quelle que soit la saison du produit."},
    {"q": "Y aura-t-il des packs été ?", "a": "Le système de packs est prêt : les compositions été seront publiées avec la sélection, avec des économies réelles calculées sur les prix du moment."},
    {"q": "Comment passer de l’hiver à l’été ?", "a": "Utilisez le sélecteur Hiver / Été présent dans l’en-tête sur tous les écrans, ou les adresses / et /ete."}
  ]
}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
