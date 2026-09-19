/**
 * DONNÉES DE DÉMONSTRATION — MODE PREVIEW UNIQUEMENT.
 * Ces données servent EXCLUSIVEMENT à construire/valider l'interface avant connexion de
 * l'API réelle. Elles ne représentent aucun stock, prix négocié, fournisseur ou vente réelle.
 * En mode "live", elles ne sont jamais lues (lib/catalog/source.ts).
 * Remplacer par GET /api/products sans toucher aux composants : voir lib/catalog/source.ts.
 */
import type { CategoryDTO, HomepageSettings, ProductDTO } from '@/lib/types';
import { HOMEPAGE_FALLBACK } from '@/lib/homepage-fallback';

export const PREVIEW_CATEGORIES: CategoryDTO[] = [
  { id: 'c1', slug: 'confort-textile', name: 'Confort & Textile', tagline: 'La première ligne contre le froid', description: 'Chaussettes polaires, gants tactiles, bonnets, cache-cous et leggings thermiques.', imageUrl: '/images/cat-confort.svg', productCount: 5 },
  { id: 'c2', slug: 'chaleur', name: 'Chaleur', tagline: 'La chaleur, sans électricité', description: 'Bouillottes sèches, chauffe-mains réutilisables et chaussons bouillotte.', imageUrl: '/images/cat-chaleur.svg', productCount: 3 },
  { id: 'c3', slug: 'auto-hiver', name: 'Auto Hiver', tagline: 'Rouler serein par tous les temps', description: 'Housse pare-brise antigivre et gant grattoir.', imageUrl: '/images/cat-auto.svg', productCount: 2 },
  { id: 'c4', slug: 'maison-cocooning', name: 'Maison / Cocooning', tagline: 'Le refuge parfait', description: 'Plaids sherpa, plaids à manches et bouillottes.', imageUrl: '/images/cat-maison.svg', productCount: 4 },
];

const v = (id: string, sku: string, title: string, options: Record<string, string>, priceCents: number, quantity: number) => ({
  id, sku, title, options, priceCents, compareAtPriceCents: null, inStock: quantity > 0, quantity, lowStock: quantity > 0 && quantity <= 5,
});

export const PREVIEW_PRODUCTS: ProductDTO[] = [
  {
    id: 'p-foyer', slug: 'chaussons-bouillotte-foyer', name: 'Chaussons bouillotte « Foyer »',
    subtitle: 'Des chaussons qui sortent du micro-ondes.',
    description: 'Chaussons chauffants à garnissage naturel (graines de lin + lavande) : 90 secondes au micro-ondes et jusqu’à une heure de chaleur enveloppante.',
    longDescription: 'Les « Foyer » contiennent des graines de lin et des fleurs de lavande qui restituent une chaleur sèche et régulière, sans électricité ni eau bouillante. Housse externe lavable, chaussons intérieurs à garnissage non lavable. Taille unique souple, convient du 36 au 45.',
    type: 'product', isFeatured: true, imageUrl: '/images/products/chaussons-bouillotte-foyer.jpg',
    images: ['/images/products/chaussons-bouillotte-foyer.jpg', '/images/cat-chaleur.svg', '/images/hero-hiver.jpg'],
    badge: 'Coup de cœur', tags: ['chaussons', 'bouillotte', 'cadeau'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 4490, variantCount: 1, inStock: true,
    categories: [{ slug: 'chaleur', name: 'Chaleur' }, { slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
    variants: [v('v-foyer-u', 'BOR-FOY-U', 'Taille unique (36-45)', { taille: 'Unique (36-45)' }, 4490, 12)],
  },
  {
    id: 'p-sentinelle', slug: 'housse-pare-brise-sentinelle', name: 'Housse pare-brise antigivre « Sentinelle »',
    subtitle: 'Plus jamais gratter le matin.',
    description: 'Battant de protection magnétique qui se déplie en 30 secondes sur le pare-brise : fini le grattage, le sel et les essuie-glaces collés par le gel.',
    longDescription: 'La « Sentinelle » se fixe en un geste : aimants intégrés pris dans les portières avant, rabats latéraux et sangles de rétroviseurs. Tissu tricouche : aluminium réfléchissant, mousse isolante, intérieur doux anti-rayures.',
    type: 'product', isFeatured: true, imageUrl: '/images/products/housse-pare-brise-sentinelle.jpg',
    images: ['/images/products/housse-pare-brise-sentinelle.jpg', '/images/cat-auto.svg'],
    badge: null, tags: ['voiture', 'pare-brise', 'antigivre'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 3490, variantCount: 2, inStock: true,
    categories: [{ slug: 'auto-hiver', name: 'Auto Hiver' }],
    variants: [
      v('v-sen-st', 'BOR-SEN-ST', 'Standard (berlines, citadines)', { taille: 'Standard 145×110 cm' }, 3490, 9),
      v('v-sen-xl', 'BOR-SEN-XL', 'XL (SUV, monospaces)', { taille: 'XL 165×120 cm' }, 3990, 0),
    ],
  },
  {
    id: 'p-nuage', slug: 'chaussettes-polaires-nuage', name: 'Chaussettes polaires « Nuage »',
    subtitle: 'Comme sur un nuage, entre le canapé et le bout du monde.',
    description: 'Chaussettes épaisses en polaire doublée, intérieur brossé ultra-doux. Semelle antidérapante discrète et bord-côte qui ne serre pas.',
    longDescription: 'Les « Nuage » combinent une polaire dense à l’extérieur et un intérieur brossé qui emprisonne l’air chaud. Lavage en machine à 30°, séchage à plat.',
    type: 'product', isFeatured: true, imageUrl: '/images/products/chaussettes-polaires-nuage.jpg',
    images: ['/images/products/chaussettes-polaires-nuage.jpg', '/images/cat-confort.svg'],
    badge: null, tags: ['chaussettes', 'polaire', 'cocooning'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 2490, variantCount: 4, inStock: true,
    categories: [{ slug: 'confort-textile', name: 'Confort & Textile' }, { slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
    variants: [
      v('v-nua-sm-bn', 'BOR-NUA-SM-BN', 'S/M · Bleu nuit', { taille: 'S/M (36-41)', couleur: 'Bleu nuit' }, 2490, 20),
      v('v-nua-sm-ec', 'BOR-NUA-SM-EC', 'S/M · Écru', { taille: 'S/M (36-41)', couleur: 'Écru' }, 2490, 18),
      v('v-nua-lx-bn', 'BOR-NUA-LX-BN', 'L/XL · Bleu nuit', { taille: 'L/XL (42-46)', couleur: 'Bleu nuit' }, 2490, 4),
      v('v-nua-lx-ec', 'BOR-NUA-LX-EC', 'L/XL · Écru', { taille: 'L/XL (42-46)', couleur: 'Écru' }, 2490, 0),
    ],
  },
  {
    id: 'p-nid', slug: 'plaid-sherpa-nid', name: 'Plaid sherpa « Nid » 150×200',
    subtitle: 'Double face : polaire lisse, sherpa nuage.',
    description: 'Le plaid XL double face : sherpa ultra-moelleux à l’intérieur, polaire lisse à l’extérieur. 150 × 200 cm pour s’y perdre à deux.',
    longDescription: 'Le « Nid » associe une face sherpa poil long à une face polaire lisse qui retient la chaleur. Ourlets renforcés double piqûre.',
    type: 'product', isFeatured: true, imageUrl: '/images/products/plaid-sherpa-nid.jpg',
    images: ['/images/products/plaid-sherpa-nid.jpg', '/images/cat-maison.svg', '/images/hero-hiver.jpg'],
    badge: null, tags: ['plaid', 'sherpa', 'cocooning'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 5990, variantCount: 2, inStock: true,
    categories: [{ slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
    variants: [
      v('v-nid-ec', 'BOR-NID-EC', 'Écru', { couleur: 'Écru' }, 5990, 7),
      v('v-nid-bn', 'BOR-NID-BN', 'Bleu nuit', { couleur: 'Bleu nuit' }, 5990, 6),
    ],
  },
  {
    id: 'p-bise', slug: 'cache-cou-polaire-bise', name: 'Cache-cou polaire « Bise »',
    subtitle: 'Le vent du nord ne passe plus.',
    description: 'Cache-cou tubulaire en polaire ultra-douce, sans couture irritante, qui se fait oublier sous une capuche ou un manteau.',
    longDescription: 'La « Bise » protège la zone la plus exposée au froid — le cou — avec une polaire double face respirante et à séchage rapide.',
    type: 'product', isFeatured: false, imageUrl: '/images/products/cache-cou-polaire-bise.jpg', images: ['/images/products/cache-cou-polaire-bise.jpg'],
    badge: null, tags: ['cache-cou', 'polaire'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 1990, variantCount: 2, inStock: true,
    categories: [{ slug: 'confort-textile', name: 'Confort & Textile' }],
    variants: [v('v-bis-no', 'BOR-BIS-U-NO', 'Noir', { couleur: 'Noir' }, 1990, 25), v('v-bis-bl', 'BOR-BIS-U-BL', 'Bleu glacier', { couleur: 'Bleu glacier' }, 1990, 22)],
  },
  {
    id: 'p-ggp', slug: 'gant-grattoir-polaire', name: 'Gant grattoir « Polaire »',
    subtitle: 'Gratter sans se geler la main.',
    description: 'Le grattoir à pare-brise dans un gant : lame ABS rigide d’un côté, fourrure polaire qui protège la main de l’autre.',
    longDescription: 'Le « Polaire » combine une lame ABS de 10 cm et une manchette en fausse fourrure polaire qui empêche la neige fondue de couler dans la manche.',
    type: 'product', isFeatured: false, imageUrl: '/images/products/gant-grattoir-polaire.jpg', images: ['/images/products/gant-grattoir-polaire.jpg'],
    badge: null, tags: ['grattoir', 'voiture'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 1290, variantCount: 1, inStock: true,
    categories: [{ slug: 'auto-hiver', name: 'Auto Hiver' }],
    variants: [v('v-ggp-u', 'BOR-GGP-U', 'Taille unique', { taille: 'Unique' }, 1290, 30)],
  },
  {
    id: 'p-braise', slug: 'chauffe-mains-reutilisables-braise', name: 'Chauffe-mains réutilisables « Braise » (×2)',
    subtitle: 'La chaleur de poche, sans piles.',
    description: 'Cliquez, cristallisez, chauffez : chaleur instantanée jusqu’à ~40 minutes. Réutilisables des centaines de fois.',
    longDescription: 'Chaque « Braise » contient une solution d’acétate de sodium surfondue : la pastille métallique déclenche une cristallisation exothermique immédiate et sans danger.',
    type: 'product', isFeatured: false, imageUrl: '/images/products/chauffe-mains-reutilisables-braise.jpg', images: ['/images/products/chauffe-mains-reutilisables-braise.jpg'],
    badge: null, tags: ['chauffe-mains', 'reutilisable'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 1690, variantCount: 1, inStock: true,
    categories: [{ slug: 'chaleur', name: 'Chaleur' }, { slug: 'auto-hiver', name: 'Auto Hiver' }],
    variants: [v('v-bra-u', 'BOR-BRA-U', 'Lot de 2', { contenu: 'Lot de 2' }, 1690, 40)],
  },
  {
    id: 'p-brasero', slug: 'bouillotte-noyaux-cerise-brasero', name: 'Bouillotte sèche « Brasero »',
    subtitle: 'Des noyaux de cerise, et c’est tout.',
    description: 'Bouillotte sèche 100 % coton garnie de noyaux de cerise : micro-ondes ou four, elle épouse la nuque, les lombaires ou le ventre.',
    longDescription: 'Le « Brasero » reprend un remède de grand-mère éprouvé : les noyaux de cerise emmagasinent la chaleur et la restituent lentement.',
    type: 'product', isFeatured: false, imageUrl: '/products/bouillotte-noyaux-cerise-brasero.svg', images: ['/products/bouillotte-noyaux-cerise-brasero.svg'],
    badge: null, tags: ['bouillotte', 'noyaux-cerise'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 2490, variantCount: 1, inStock: true,
    categories: [{ slug: 'chaleur', name: 'Chaleur' }, { slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
    variants: [v('v-brs-u', 'BOR-BRS-U', 'Standard 50×15 cm', { taille: '50×15 cm' }, 2490, 15)],
  },
  {
    id: 'p-cocon', slug: 'plaid-manches-cocon', name: 'Plaid à manches « Cocon »',
    subtitle: 'Le plaid qui libère les mains.',
    description: 'Plaid à manches oversize avec poche kangourou : lire, télécommander, siroter — sans jamais avoir froid.',
    longDescription: 'Le « Cocon » est coupé oversize pour envelopper toutes les morphologies, avec poche kangourou centrale et col cheminée.',
    type: 'product', isFeatured: false, imageUrl: '/products/plaid-manches-cocon.svg', images: ['/products/plaid-manches-cocon.svg'],
    badge: null, tags: ['plaid', 'manches'], bundleItems: [],
    seoTitle: null, seoDescription: null, priceCents: 4990, variantCount: 2, inStock: true,
    categories: [{ slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
    variants: [v('v-coc-gr', 'BOR-COC-GR', 'Gris orage', { couleur: 'Gris orage' }, 4990, 8), v('v-coc-sa', 'BOR-COC-SA', 'Vert sapin', { couleur: 'Vert sapin' }, 4990, 5)],
  },
  {
    id: 'p-pack-cocooning', slug: 'pack-cocooning', name: 'Pack Cocooning',
    subtitle: 'La soirée refuge, tout compris.',
    description: 'Plaid sherpa « Nid » + chaussettes polaires « Nuage » + bouillotte sèche « Brasero ». Moins cher que les articles achetés séparément.',
    longDescription: 'Le pack des soirées d’hiver : on enfile les « Nuage », on chauffe le « Brasero » deux minutes, et on disparaît dans le « Nid ».',
    type: 'bundle', isFeatured: false, imageUrl: '/images/products/pack-cocooning.jpg', images: ['/images/products/pack-cocooning.jpg'],
    badge: '−14,80 €', tags: ['pack', 'cocooning'],
    bundleItems: [
      { sku: 'BOR-NID-EC', name: 'Plaid sherpa « Nid » — Écru', quantity: 1 },
      { sku: 'BOR-NUA-SM-EC', name: 'Chaussettes polaires « Nuage » — S/M, Écru', quantity: 1 },
      { sku: 'BOR-BRS-U', name: 'Bouillotte sèche « Brasero »', quantity: 1 },
    ],
    seoTitle: null, seoDescription: null, priceCents: 9490, variantCount: 1, inStock: true,
    categories: [{ slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
    variants: [v('v-pack-coc', 'BOR-PCK-COCOON', 'Pack Cocooning', {}, 9490, 10)],
  },
  {
    id: 'p-pack-grand-froid', slug: 'pack-grand-froid', name: 'Pack Grand Froid',
    subtitle: 'Kit complet pour températures négatives.',
    description: 'Bonnet torsadé + cache-cou « Bise » + gants tactiles + chaussons bouillotte « Foyer ». Économie réelle vs articles séparés.',
    longDescription: 'Tout l’équipement grand froid en un pack : la tête, le cou, les mains et les pieds.',
    type: 'bundle', isFeatured: false, imageUrl: '/images/products/pack-grand-froid.jpg', images: ['/images/products/pack-grand-froid.jpg'],
    badge: '−19,70 €', tags: ['pack', 'grand-froid'],
    bundleItems: [
      { sku: 'BOR-BON-U-BN', name: 'Bonnet torsadé « Boréale » — Bleu nuit', quantity: 1 },
      { sku: 'BOR-BIS-U-NO', name: 'Cache-cou polaire « Bise » — Noir', quantity: 1 },
      { sku: 'BOR-CON-LX-NO', name: 'Gants tactiles « Contact » — L/XL, Noir', quantity: 1 },
      { sku: 'BOR-FOY-U', name: 'Chaussons bouillotte « Foyer »', quantity: 1 },
    ],
    seoTitle: null, seoDescription: null, priceCents: 10990, variantCount: 1, inStock: true,
    categories: [{ slug: 'confort-textile', name: 'Confort & Textile' }],
    variants: [v('v-pack-gf', 'BOR-PCK-GDFROID', 'Pack Grand Froid', {}, 10990, 6)],
  },
];

export const PREVIEW_HOMEPAGE: HomepageSettings = HOMEPAGE_FALLBACK;
