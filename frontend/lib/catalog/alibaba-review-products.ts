import type { CategoryDTO } from '@/lib/types';
import { toDraftProduct } from './priority-products';

const review = { slug: 'alibaba-hiver-revue', name: 'Sélection Hiver à valider' };
const home = { slug: 'maison-cocooning', name: 'Maison / Cocooning' };
const warmth = { slug: 'chaleur', name: 'Chaleur' };
const textile = { slug: 'confort-textile', name: 'Confort & Textile' };

export const ALIBABA_REVIEW_PRODUCTS = [
  {
    sourcePhoto: 'Hf66fd21894da439f823cc2bdaeac0f34z.png',
    id: 'alibaba-review-cape', slug: 'cape-couverture-cocooning', name: 'Cape-couverture de détente',
    sku: 'BOR-REV-CAPE', subtitle: 'Une couverture à porter chez soi.',
    description: 'Une couverture à porter autour des épaules pendant les moments calmes à la maison. Elle permet de rester enveloppé tout en bougeant.',
    details: 'La forme, la matière et les finitions de la variante à intégrer restent à confirmer auprès du fournisseur.',
    categories: [home, review], colors: [],
    specifications: ['Format de couverture à porter.', 'Pensée pour les pauses à la maison.', 'À confirmer auprès du fournisseur : dimensions, matière, entretien et contenu du colis.'],
  },
  {
    sourcePhoto: 'H8c07393c282b474cb661c83385832de7J.png',
    id: 'alibaba-review-bouillotte', slug: 'bouillotte-housse-peluche', name: 'Bouillotte à eau avec housse douce',
    sku: 'BOR-REV-BOU', subtitle: 'Un format d’intérieur avec housse amovible annoncée.',
    description: 'Une bouillotte à eau à utiliser pour les pauses à la maison. La housse souple enveloppe le réservoir pour faciliter sa prise en main.',
    details: 'L’annonce présente une housse peluche amovible. La contenance, les matériaux et la notice française doivent être confirmés avant toute vente.',
    categories: [warmth, review], colors: [],
    specifications: ['Bouillotte à eau.', 'Housse amovible annoncée.', 'À confirmer auprès du fournisseur : dimensions, contenance, consignes et contenu du colis.'],
  },
  {
    sourcePhoto: 'H841c1e38fb354747be30e1eff99c0d4fF.jpg',
    id: 'alibaba-review-cache-oreilles', slug: 'cache-oreilles-pliants-fausse-fourrure', name: 'Cache-oreilles pliant en fausse fourrure',
    sku: 'BOR-REV-ORE', subtitle: 'Un accessoire couvre-oreilles pour les trajets d’hiver.',
    description: 'Un accessoire à glisser dans son sac pour les journées froides. Le modèle recherché se replie pour le rangement.',
    details: 'La finition, le réglage et la forme de l’arceau dépendent de la référence définitive.',
    categories: [textile, review], colors: [],
    specifications: ['Protection couvrant les oreilles.', 'Format pliant recherché.', 'À confirmer auprès du fournisseur : coloris, matière, réglage et entretien.'],
  },
  {
    sourcePhoto: 'H6add91a07e3d45eaa067255ed2732c645.jpg',
    id: 'alibaba-review-assise', slug: 'coussin-assise-exterieur-pliant', name: 'Assise pliante en mousse pour l’extérieur',
    sku: 'BOR-REV-ASS', subtitle: 'Un support à déplier pendant les pauses dehors.',
    description: 'Une assise à poser sur un banc ou au sol pour les pauses en extérieur. Son format pliant est conçu pour être rangé après usage.',
    details: 'L’annonce indique une mousse XPE et un pliage en Z. Les dimensions, le poids et le contenu précis du colis restent à confirmer.',
    categories: [textile, review], colors: [],
    specifications: ['Pliage en Z annoncé.', 'Mousse XPE annoncée.', 'À confirmer auprès du fournisseur : dimensions, poids et inclusion du sac de rangement.'],
  },
  {
    sourcePhoto: 'H1bdde0b291f040eda41f293837e826b0R.jpg',
    id: 'alibaba-review-sac', slug: 'sac-gourde-bandouliere', name: 'Sac porte-gourde à bandoulière',
    sku: 'BOR-REV-GOU', subtitle: 'Pour transporter une gourde lors des trajets à pied.',
    description: 'Un porte-gourde en tissu qui se porte à l’épaule. Il laisse les mains libres pour les sorties et les trajets quotidiens.',
    details: 'L’annonce associée présente un sac à gourde en tissu. Les dimensions compatibles, la composition et les détails de la sangle restent à confirmer.',
    categories: [textile, review], colors: [],
    specifications: ['Port à l’épaule annoncé.', 'Format dédié au transport d’une gourde.', 'À confirmer auprès du fournisseur : compatibilité, composition et contenu du colis.'],
  },
].map(({ sourcePhoto, ...brief }, index) => {
  const imageUrl = `https://s.alicdn.com/@sc04/kf/${sourcePhoto}`;
  return { ...toDraftProduct(brief, index), imageUrl, images: [imageUrl], badge: 'Photo fournisseur' };
});

export const ALIBABA_REVIEW_CATEGORY: CategoryDTO = {
  ...review,
  id: review.slug,
  season: 'winter',
  tagline: 'Cinq fiches fournisseur à vérifier avant ouverture.',
  description: 'Aperçu de travail BORÉALE en attendant la qualification des références et de leurs variantes.',
  imageUrl: null,
  productCount: ALIBABA_REVIEW_PRODUCTS.length,
};
