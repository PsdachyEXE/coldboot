/**
 * Generates every raster icon from the two authored SVG marks in assets/.
 * The outputs are committed so CI never depends on the native renderer.
 *
 *   npm run icons
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

const mark = readFileSync(resolve(root, 'assets/coldboot-mark.svg'), 'utf8');
const maskable = readFileSync(resolve(root, 'assets/coldboot-mark-maskable.svg'), 'utf8');

function render(svg: string, size: number): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: '#000000' });
  return Buffer.from(resvg.render().asPng());
}

/** Packs PNG images into a single .ico container (PNG-compressed entries, Vista and later). */
export function packIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette colours
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const pngs: Record<string, number> = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'apple-touch-icon.png': 180,
  'icon-32.png': 32,
};
for (const [name, size] of Object.entries(pngs)) {
  writeFileSync(resolve(outDir, name), render(mark, size));
}
writeFileSync(resolve(outDir, 'icon-maskable-512.png'), render(maskable, 512));

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const ico = packIco(icoSizes.map((size) => ({ size, png: render(mark, size) })));
writeFileSync(resolve(outDir, 'coldboot.ico'), ico);
writeFileSync(resolve(outDir, 'favicon.ico'), packIco([16, 32, 48].map((size) => ({ size, png: render(mark, size) }))));
copyFileSync(resolve(root, 'assets/coldboot-mark.svg'), resolve(outDir, 'coldboot.svg'));

console.info(`Icons written to ${outDir}`);
