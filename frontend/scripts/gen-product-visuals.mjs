/**
 * Génère les visuels produits SVG provisoires (DECISIONS.md D016).
 * Exécution : node scripts/gen-product-visuals.mjs   (déjà exécuté — fichiers commités dans public/products/)
 * À REMPLACER par de vraies photos produits avant le lancement commercial.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'products');
mkdirSync(root, { recursive: true });

// Thèmes par catégorie (palette marque — docs/BRANDING.md)
const THEMES = {
  confort: { bg1: '#16324A', bg2: '#0B1B2B', accent: '#E8622C', glyph: 'textile' },
  chaleur: { bg1: '#3D2317', bg2: '#1C0F08', accent: '#E8622C', glyph: 'flame' },
  auto: { bg1: '#1E3A4C', bg2: '#0E2230', accent: '#7FB2CE', glyph: 'car' },
  maison: { bg1: '#33445C', bg2: '#182636', accent: '#F6EFE6', glyph: 'home' },
  pack: { bg1: '#0B1B2B', bg2: '#05101B', accent: '#E8622C', glyph: 'pack' },
};

const PRODUCTS = [
  ['chaussettes-polaires-nuage', 'Nuage', 'CH', 'confort'],
  ['gants-tactiles-contact', 'Contact', 'CT', 'confort'],
  ['bonnet-torse-boreale', 'Boréale', 'BN', 'confort'],
  ['cache-cou-polaire-bise', 'Bise', 'BS', 'confort'],
  ['legging-thermique-seconde-peau', 'Seconde Peau', 'SP', 'confort'],
  ['chaussons-fourres-refuge', 'Refuge', 'RF', 'confort'],
  ['chaussons-bouillotte-foyer', 'Foyer', 'FY', 'chaleur'],
  ['chauffe-mains-reutilisables-braise', 'Braise', 'BR', 'chaleur'],
  ['plaid-polaire-alpage', 'Alpage', 'AL', 'maison'],
  ['bouillotte-noyaux-cerise-brasero', 'Brasero', 'BE', 'chaleur'],
  ['housse-pare-brise-sentinelle', 'Sentinelle', 'ST', 'auto'],
  ['gant-grattoir-polaire', 'Polaire', 'PL', 'auto'],
  ['plaid-sherpa-nid', 'Nid', 'ND', 'maison'],
  ['plaid-manches-cocon', 'Cocon', 'CC', 'maison'],
  ['pack-cocooning', 'Pack Cocooning', 'PK', 'pack'],
  ['pack-grand-froid', 'Pack Grand Froid', 'PK', 'pack'],
  ['pack-auto-hiver', 'Pack Auto Hiver', 'PK', 'pack'],
  ['pack-ski', 'Pack Ski', 'PK', 'pack'],
];

const GLYPHS = {
  textile: `<path d="M120 210 q60 -46 120 0 q60 46 120 0" fill="none" stroke="{A}" stroke-width="10" stroke-linecap="round"/>
    <path d="M120 250 q60 -46 120 0 q60 46 120 0" fill="none" stroke="{A}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>`,
  flame: `<path d="M240 120 c 34 44 56 66 56 100 a56 56 0 0 1 -112 0 c0 -22 12 -40 26 -56 c4 14 12 22 20 24 c-6 -26 -4 -46 10 -68z" fill="{A}"/>`,
  car: `<path d="M110 250 l26 -56 h208 l26 56 v34 a10 10 0 0 1 -10 10 h-240 a10 10 0 0 1 -10 -10 z" fill="none" stroke="{A}" stroke-width="10"/>
    <circle cx="170" cy="304" r="18" fill="{A}"/><circle cx="310" cy="304" r="18" fill="{A}"/>`,
  home: `<path d="M130 235 L240 140 L350 235" fill="none" stroke="{A}" stroke-width="12" stroke-linecap="round"/>
    <rect x="160" y="235" width="160" height="95" rx="10" fill="none" stroke="{A}" stroke-width="10"/>`,
  pack: `<rect x="140" y="170" width="200" height="150" rx="14" fill="none" stroke="{A}" stroke-width="10"/>
    <path d="M240 170 V320 M140 235 H340" stroke="{A}" stroke-width="8"/>
    <path d="M205 170 c0 -26 70 -26 70 0" fill="none" stroke="{A}" stroke-width="8"/>`,
};

function snowflakes(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let out = '';
  for (let i = 0; i < 14; i++) {
    const x = Math.round(rnd() * 480);
    const y = Math.round(rnd() * 480);
    const r = (rnd() * 2.2 + 1).toFixed(1);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#F7FAFC" opacity="${(rnd() * 0.25 + 0.06).toFixed(2)}"/>`;
  }
  return out;
}

for (const [slug, name, initials, themeKey] of PRODUCTS) {
  const t = THEMES[themeKey];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="480" fill="url(#bg)"/>
  ${snowflakes(slug.length * 977 + initials.charCodeAt(0) * 31)}
  <g opacity="0.9">${GLYPHS[t.glyph].replaceAll('{A}', t.accent)}</g>
  <text x="240" y="392" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="600" fill="#F7FAFC">${name}</text>
  <text x="240" y="424" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="4" fill="${t.accent}">BORÉALE</text>
  <text x="240" y="452" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#F7FAFC" opacity="0.45">visuel provisoire — photo produit à venir</text>
</svg>
`;
  writeFileSync(join(root, `${slug}.svg`), svg);
}

// Placeholder générique
writeFileSync(
  join(root, 'placeholder.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <rect width="480" height="480" fill="#E9F1F7"/>
  <text x="240" y="248" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#0B1B2B">BORÉALE</text>
</svg>`
);

console.log(`✓ ${PRODUCTS.length + 1} visuels SVG générés dans public/products/`);
