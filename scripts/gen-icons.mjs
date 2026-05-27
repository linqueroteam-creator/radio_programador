/**
 * scripts/gen-icons.mjs
 * ------------------------------------------------------------
 * Gera os PNGs de ícone PWA a partir do SVG mestre em public/icon.svg.
 * Roda manualmente uma vez (já gerou — versionado em git). Re-rodar
 * só quando o SVG mudar.
 *
 *     node scripts/gen-icons.mjs
 *
 * Cria 3 arquivos em public/:
 *   - icon-192.png         (Android home screen, etc.)
 *   - icon-512.png         (Android splash, install dialog)
 *   - icon-maskable-512.png (mesma imagem com padding pra Android adaptive)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const svgPath = resolve(root, 'public/icon.svg');
const svg = readFileSync(svgPath);

async function gen(size, outName, { padding = 0 } = {}) {
  const targetInner = size - padding * 2;
  let pipeline = sharp(svg).resize(targetInner, targetInner, { fit: 'contain', background: { r: 91, g: 45, b: 142, alpha: 1 } });
  if (padding > 0) {
    pipeline = pipeline.extend({
      top: padding, bottom: padding, left: padding, right: padding,
      background: { r: 91, g: 45, b: 142, alpha: 1 },
    });
  }
  const buf = await pipeline.png().toBuffer();
  const out = resolve(root, 'public', outName);
  writeFileSync(out, buf);
  console.log(`  · ${outName}  (${size}×${size})`);
}

console.log('Gerando ícones PWA a partir de public/icon.svg...');
await gen(192, 'icon-192.png');
await gen(512, 'icon-512.png');
// Maskable: precisa de "safe zone" — Android corta o ícone em formato (círculo, squircle).
// Padding de ~10% garante que a parte importante não é cortada.
await gen(512, 'icon-maskable-512.png', { padding: 56 });
console.log('OK.');
