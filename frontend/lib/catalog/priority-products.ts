import type { ProductDTO } from '@/lib/types';

type Brief = { id: string; slug: string; name: string; sku: string; subtitle: string; description: string; categories: ProductDTO['categories']; colors: string[]; specifications: string[] };
const textile = { slug: 'confort-textile', name: 'Confort & Textile' };
const maison = { slug: 'maison-cocooning', name: 'Maison / Cocooning' };
const briefs: Brief[] = [
  { id: 'p-contact', slug: 'gants-tactiles-contact', name: 'Gants thermiques tactiles « Contact »', sku: 'BOR-CON', subtitle: 'Le confort des mains, au quotidien.',
    description: 'Notre sélection de gants pour les sorties d’hiver est en préparation. Le modèle, les matières et les tailles seront précisés après vérification.', categories: [textile], colors: ['Bleu nuit', 'Noir discret'],
    specifications: ['Objectif : fonction tactile à vérifier sur le modèle retenu.', 'Objectif : doublure chaude et paume antidérapante.', 'Direction : silhouette sobre, sans logo visible.'] },
  { id: 'p-refuge', slug: 'chaussons-fourres-refuge', name: 'Chaussons fourrés « Refuge »', sku: 'BOR-REF', subtitle: 'L’esprit cocon, à la maison.',
    description: 'Des chaussons fermés à la ligne épurée sont à l’étude. La doublure, la semelle et les pointures seront confirmées sur la référence sélectionnée.', categories: [textile, maison], colors: ['Crème', 'Beige', 'Écru', 'Gris clair'],
    specifications: ['Objectif : forme fermée et doublure fourrée.', 'Objectif : semelle antidérapante à contrôler.', 'Direction : aucune marque fournisseur visible.'] },
  { id: 'p-braise', slug: 'chauffe-mains-reutilisables-braise', name: 'Chauffe-mains réutilisables « Braise » (×2)', sku: 'BOR-BRA', subtitle: 'Une idée de chaleur à emporter.',
    description: 'Nous recherchons un duo de chaufferettes à pastille métallique, sans batterie. La composition, les consignes et les performances restent à vérifier avant toute vente.', categories: [{ slug: 'chaleur', name: 'Chaleur' }], colors: ['Bleu glacier', 'Neutre'],
    specifications: ['Objectif : lot de deux chaufferettes à activation par pastille.', 'Objectif : modèle réutilisable sans branchement.', 'Température, durée et nombre de cycles non confirmés.'] },
  { id: 'p-nuage', slug: 'chaussettes-polaires-nuage', name: 'Chaussettes polaires « Nuage »', sku: 'BOR-NUA', subtitle: 'La douceur des moments chez soi.',
    description: 'Une sélection de chaussettes épaisses pour la maison est en préparation. Matière, épaisseur, tailles et éventuelle semelle antidérapante seront détaillées après qualification.', categories: [textile, maison], colors: ['Crème', 'Écru', 'Beige', 'Bleu nuit'],
    specifications: ['Objectif : toucher polaire ou sherpa, à confirmer.', 'Objectif : confort maison et épaisseur adaptée.', 'Option recherchée : dessous antidérapant.'] },
  { id: 'p-semelles', slug: 'semelles-thermiques-isolantes', name: 'Semelles thermiques isolantes', sku: 'BOR-SEM', subtitle: 'Un complément discret pour l’hiver.',
    description: 'Des semelles isolantes non électriques sont à l’étude pour compléter la sélection. La composition, la découpe, les pointures et les propriétés seront vérifiées sur le modèle retenu.', categories: [textile], colors: ['Gris clair', 'Blanc', 'Beige'],
    specifications: ['Objectif : isolation sans batterie ni branchement.', 'Matières étudiées : feutre, laine ou couche aluminium, non encore sélectionnées.', 'Épaisseur, compatibilité et isolation non confirmées.'] },
];

export const PRIORITY_PRODUCTS: ProductDTO[] = briefs.map((brief, index) => ({
  id: brief.id, slug: brief.slug, name: brief.name, subtitle: brief.subtitle, description: brief.description,
  longDescription: `${brief.description} Les couleurs envisagées sont une direction de sélection, pas des variantes disponibles. Prix, stock, poids et livraison ne sont pas encore confirmés.`,
  type: 'product', season: 'winter', isFeatured: index < 4, imageUrl: null, images: [], badge: null,
  tags: ['selection-hiver'], bundleItems: [], seoTitle: `${brief.name} | BORÉALE`, seoDescription: brief.description,
  // Compatibility sentinel only. Consumers MUST hide prices whenever priceVerified is false.
  priceCents: 0, variantCount: 0, inStock: false, variants: [], categories: brief.categories,
  selection: { status: 'draft', priority: index + 1, priceVerified: false, referenceSku: brief.sku,
    weightGrams: null, specifications: brief.specifications, targetColors: brief.colors, targetSizes: [] },
}));
