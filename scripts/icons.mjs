/**
 * The console's icons, drawn from the brand's own shapes
 * (components/brand/paths.ts — the arch-m, the app icon's drawing).
 *
 *   app/icon.svg              the tab's icon (the rounded tile)
 *   app/apple-icon.png        180×180, full-bleed: iOS rounds it itself
 *   public/icon-192.png       the installed app's icon
 *   public/icon-512.png
 *   public/icon-maskable-512.png   full-bleed, for Android's shaped icons
 *   public/badge-72.png       a one-colour mark for Android's status bar
 *
 *   npm run icons
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { BRAND, MARK, TILE } = await import(pathToFileURL(path.join(root, 'components', 'brand', 'paths.ts')).href);

const mark = (ink) => [
  ...MARK.letters.map((d) => `<path d="${d}" fill="${ink}" fill-rule="evenodd"/>`),
  ...MARK.light.map((d) => `<path d="${d}" fill="${BRAND.saffron}" fill-rule="evenodd"/>`),
].join('');

const tile = (radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE.size} ${TILE.size}">` +
  `<rect width="${TILE.size}" height="${TILE.size}" rx="${radius}" fill="${BRAND.lapis}"/>${mark(BRAND.paper)}</svg>`;

// The badge: white letters on nothing, scaled to fill; Android colours it.
const [vx, vy, vw, vh] = MARK.viewBox.split(' ').map(Number);
const side = Math.max(vw, vh) * 1.12;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx + vw / 2 - side / 2} ${vy + vh / 2 - side / 2} ${side} ${side}">` +
  `${[...MARK.letters, ...MARK.light].map((d) => `<path d="${d}" fill="#FFFFFF" fill-rule="evenodd"/>`).join('')}</svg>`;

const out = (relative) => path.join(root, relative);

fs.writeFileSync(out('app/icon.svg'), tile(TILE.radius));
await sharp(Buffer.from(tile(0)), { density: 600 }).resize(180, 180).png().toFile(out('app/apple-icon.png'));
await sharp(Buffer.from(tile(TILE.radius)), { density: 600 }).resize(192, 192).png().toFile(out('public/icon-192.png'));
await sharp(Buffer.from(tile(TILE.radius)), { density: 600 }).resize(512, 512).png().toFile(out('public/icon-512.png'));
await sharp(Buffer.from(tile(0)), { density: 600 }).resize(512, 512).png().toFile(out('public/icon-maskable-512.png'));
await sharp(Buffer.from(badge), { density: 600 }).resize(72, 72).png().toFile(out('public/badge-72.png'));

console.log('Icons written: app/icon.svg, app/apple-icon.png, public/icon-{192,512,maskable-512}.png, public/badge-72.png');
