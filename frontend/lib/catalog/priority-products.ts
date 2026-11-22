import type { ProductDTO } from '@/lib/types';

type Brief = { id: string; slug: string; name: string; sku: string; subtitle: string; description: string; details: string; categories: ProductDTO['categories']; colors: string[]; specifications: string[] };
const textile = { slug: 'confort-textile', name: 'Confort & Textile' };
const maison = { slug: 'maison-cocooning', name: 'Maison / Cocooning' };
const briefs: Brief[] = [
  { id: 'p-contact', slug: 'gants-tactiles-contact', name: 'Gants thermiques tactiles « Contact »', sku: 'BOR-CON', subtitle: 'Le confort des mains, au quotidien.',
    description: 'Des gants pour les trajets et les promenades par temps froid, pensés pour garder les mains couvertes quand on utilise son téléphone.',
    details: 'La référence repérée annonce une doublure polaire, des doigts tactiles et une paume antidérapante. La coupe, la composition et le guide des tailles seront précisés après vérification.', categories: [textile], colors: ['Bleu nuit', 'Noir discret'],
    specifications: ['Objectif : fonction tactile à vérifier sur le modèle retenu.', 'Objectif : doublure chaude et paume antidérapante.', 'Direction : silhouette sobre, sans logo visible.'] },
  { id: 'p-refuge', slug: 'chaussons-fourres-refuge', name: 'Chaussons fourrés « Refuge »', sku: 'BOR-REF', subtitle: 'L’esprit cocon, à la maison.',
    description: 'Des chaussons d’intérieur fermés, pensés pour retrouver ses pieds au chaud en rentrant chez soi.',
    details: 'La référence repérée annonce un talon fermé, un intérieur peluche et une semelle antidérapante. La matière et les pointures seront précisées sur le modèle retenu.', categories: [textile, maison], colors: ['Crème', 'Beige', 'Écru', 'Gris clair'],
    specifications: ['Objectif : forme fermée et doublure fourrée.', 'Objectif : semelle antidérapante à contrôler.', 'Direction : aucune marque fournisseur visible.'] },
  { id: 'p-braise', slug: 'chauffe-mains-reutilisables-braise', name: 'Chauffe-mains réutilisables « Braise » (×2)', sku: 'BOR-BRA', subtitle: 'Une idée de chaleur à emporter.',
    description: 'Un duo de chaufferettes de poche à emporter pour les sorties d’hiver.',
    details: 'Le format recherché est une poche de gel réutilisable à pastille métallique. Les consignes d’activation et de réutilisation dépendront du modèle validé.', categories: [{ slug: 'chaleur', name: 'Chaleur' }], colors: ['Bleu glacier', 'Neutre'],
    specifications: ['Objectif : lot de deux chaufferettes à activation par pastille.', 'Objectif : modèle réutilisable sans branchement.', 'Température, durée et nombre de cycles non confirmés.'] },
  { id: 'p-nuage', slug: 'chaussettes-polaires-nuage', name: 'Chaussettes polaires « Nuage »', sku: 'BOR-NUA', subtitle: 'La douceur des moments chez soi.',
    description: 'Des chaussettes épaisses pour la maison, à porter pendant les soirées et les matins froids.',
    details: 'La référence repérée annonce une doublure polaire et des zones d’adhérence sous le pied. La quantité par lot, la composition, les coloris et les tailles restent à vérifier.', categories: [textile, maison], colors: ['Crème', 'Écru', 'Beige', 'Bleu nuit'],
    specifications: ['Objectif : toucher polaire ou sherpa, à confirmer.', 'Objectif : confort maison et épaisseur adaptée.', 'Option recherchée : dessous antidérapant.'] },
  { id: 'p-semelles', slug: 'semelles-thermiques-isolantes', name: 'Semelles thermiques isolantes', sku: 'BOR-SEM', subtitle: 'Un complément discret pour l’hiver.',
    description: 'Des semelles isolantes à glisser dans des chaussures d’hiver ou des bottes.',
    details: 'La référence repérée annonce une paire de semelles thermiques. L’épaisseur, les pointures, la composition et la compatibilité avec les chaussures seront précisées après vérification.', categories: [textile], colors: ['Gris clair', 'Blanc', 'Beige'],
    specifications: ['Objectif : isolation sans batterie ni branchement.', 'Matières étudiées : feutre, laine ou couche aluminium, non encore sélectionnées.', 'Épaisseur, compatibilité et isolation non confirmées.'] },
];

export const PRIORITY_PRODUCTS: ProductDTO[] = briefs.map((brief, index) => ({
  id: brief.id, slug: brief.slug, name: brief.name, subtitle: brief.subtitle, description: brief.description,
  longDescription: brief.details,
  type: 'product', season: 'winter', isFeatured: index < 4, imageUrl: null, images: [], badge: null,
  tags: ['selection-hiver'], bundleItems: [], seoTitle: `${brief.name} | BORÉALE`, seoDescription: brief.description,
  // Compatibility sentinel only. Consumers MUST hide prices whenever priceVerified is false.
  priceCents: 0, variantCount: 0, inStock: false, variants: [], categories: brief.categories,
  selection: { status: 'draft', priority: index + 1, priceVerified: false, referenceSku: brief.sku,
    weightGrams: null, specifications: brief.specifications, targetColors: brief.colors, targetSizes: [] },
}));
