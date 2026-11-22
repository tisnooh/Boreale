// Offline art direction only. Does not generate, download, edit or publish images.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const products = [
  { slug: 'gants-tactiles-contact', name: 'Contact', colors: ['bleu nuit', 'noir discret'], fidelity: 'Conserver exactement les coutures, le tissage, la doublure visible et les zones tactiles/adhérentes du modèle photographié. Ne pas inventer de picots, de fonction tactile ou de résistance au froid.' },
  { slug: 'chaussons-fourres-refuge', name: 'Refuge', colors: ['crème', 'beige', 'écru', 'gris clair'], fidelity: 'Conserver la forme fermée, la hauteur, le volume de doublure et la semelle réels. Ne pas inventer de fourrure, de picots antidérapants ou une finition plus épaisse que la référence.' },
  { slug: 'chauffe-mains-reutilisables-braise', name: 'Braise', colors: ['bleu glacier', 'neutre'], fidelity: 'Montrer deux poches du modèle exact uniquement si le lot de deux est confirmé. Conserver la transparence, la pastille métallique, les soudures et la couleur réelles ; aucun câble, batterie, voyant, vapeur ni effet de chaleur fictif.' },
  { slug: 'chaussettes-polaires-nuage', name: 'Nuage', colors: ['crème', 'écru', 'beige', 'bleu nuit'], fidelity: 'Conserver la longueur, la maille, la densité, le bord et le dessous exacts. Ne pas ajouter un intérieur sherpa ou des picots absents de la référence.' },
  { slug: 'semelles-thermiques-isolantes', name: 'Semelles', colors: ['gris clair', 'blanc', 'beige'], fidelity: 'Conserver découpe, épaisseur, couches et matière visibles du modèle réel. Aucun éclaté imaginaire, feuille aluminium ajoutée, couche laine fictive ou composant électrique.' },
];
const shots = [
  { key: 'studio', ratio: '4:5', size: '1600x2000', brief: 'Vue studio principale, paire ou lot commercial exact centré, angle trois quarts doux. Fond uni Snow #F7FAFC ou Cream #F6EFE6, lumière latérale diffuse, ombre légère réaliste, espace négatif régulier, aucune décoration superflue.' },
  { key: 'texture', ratio: '1:1', size: '1600x1600', brief: 'Gros plan secondaire d’un détail réellement présent : couture, maille, doublure, soudure ou matière. Lumière rasante douce, profondeur de champ raisonnable, pas d’agrandissement qui invente des fibres ou une finition. Aucun texte technique ajouté.' },
  { key: 'lifestyle', ratio: '4:5', size: '1600x2000', brief: 'Situation d’usage adulte sobre et conforme à la notice du produit retenu. Ambiance hivernale intérieure claire ou extérieur calme selon l’usage confirmé ; bois clair, textile neutre, quelques détails Ink #0B1B2B ou Glacier #3D7EA6. Produit central, proportions réalistes, pas de visage obligatoire ni enfant. Aucun usage médical, dangereux ou non prévu par le fabricant.' },
];
const entries = [];
for (const product of products) {
  const folder = resolve(root, 'assets/product-visuals', product.slug);
  await mkdir(folder, { recursive: true });
  for (const shot of shots) {
    const file = `${shot.key}.prompt.md`;
    const prompt = `# BORÉALE — ${product.name} — ${shot.key}\n\nSTATUT : PRÉPARÉ, NON GÉNÉRÉ, NON APPROUVÉ POUR LE SITE.\n\nPrérequis bloquant : photo réelle utilisable légalement du modèle et de la variante exacts, confirmation écrite du contenu du lot et de la couleur. Sans ces références : ne pas générer de visuel présenté comme ce produit commercial.\n\nUtiliser la photo de référence validée comme seule source de géométrie, de matière et de couleur. ${product.fidelity}\n\n${shot.brief}\n\nDirection recherchée : ${product.colors.join(', ')}. Ces couleurs ne sont pas des variantes confirmées : ne jamais recolorer le produit pour les simuler. Choisir d’abord une référence réelle disponible dans la bonne teinte.\n\nIdentité : e-commerce premium sobre, lumière naturelle douce, matières fidèles, photographie crédible. Palette de décor Snow/Ice/Cream/Ink/Glacier ; Ember #E8622C uniquement en accent très discret si nécessaire, jamais recoloration produit. Aucun logo fournisseur visible : utiliser un modèle sans logo confirmé ; ne pas effacer une marque d’un produit pour faire croire qu’une variante neutre existe. Pas de watermark, texte, prix, badge, avis, label CE, fausse certification ni ajout de marque BORÉALE sur le produit.\n\nLivrable prévu : ${shot.size}, ratio ${shot.ratio}, WebP sRGB, noms de fichiers stables. Contrôle humain contre la référence, droits et approbation avant copie dans public/.\n`;
    await writeFile(resolve(folder, file), prompt, 'utf8');
    entries.push({ productSlug: product.slug, shot: shot.key, prompt: `assets/product-visuals/${product.slug}/${file}`, plannedPublicPath: `/images/products/${product.slug}/${shot.key}.webp`, dimensions: shot.size, status: 'prepared_not_generated', referencePhotoRequired: true, rightsVerified: false, modelVerified: false, approvedForPublic: false });
  }
}
await writeFile(resolve(root, 'assets/product-visuals/manifest.json'), JSON.stringify({ generatedImages: 0, preparedPrompts: entries.length, entries }, null, 2) + '\n');
console.log(JSON.stringify({ generatedImages: 0, preparedPrompts: entries.length, publishedImages: 0 }));
