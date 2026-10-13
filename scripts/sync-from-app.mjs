/**
 * Copies what the console shares with the Manzel app, so both say the same
 * thing in the same words and format a date the same way.
 *
 * The app's repository is the source of truth for all of it. Change it there,
 * then run `npm run sync` here and commit what changed. The copies are
 * committed because Vercel builds the console without the app next to it.
 *
 *   lib/format/*.ts           calendars, dates, money, digits
 *   lib/supabase/database.types.ts
 *   lib/content.ts            banners' and notifications' languages, buttons, questions
 *   lib/i18n/app/*.json       the app's words for everything the console shows too
 *   components/ui/icon-paths.tsx   the app's hand-drawn icons, as web SVG
 *
 * The app is expected at ../Manzel (override with MANZEL_APP=path).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const consoleRoot = path.resolve(here, '..');
const appRoot = path.resolve(process.env.MANZEL_APP ?? path.join(consoleRoot, '..', 'Manzel'));

if (!fs.existsSync(path.join(appRoot, 'src', 'lib', 'i18n', 'locales', 'en.json'))) {
  console.error(`The Manzel app was not found at ${appRoot}. Set MANZEL_APP to its folder.`);
  process.exit(1);
}

const read = (relative) => fs.readFileSync(path.join(appRoot, relative), 'utf8').replace(/\r\n/g, '\n');
const write = (relative, text) => {
  const target = path.join(consoleRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const previous = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (previous !== text) {
    fs.writeFileSync(target, text);
    console.log(`updated  ${relative}`);
  } else {
    console.log(`same     ${relative}`);
  }
};

const header = (source) =>
  `// Copied from the Manzel app (${source}) by scripts/sync-from-app.mjs.\n` +
  '// Do not edit here: change it in the app and run `npm run sync`.\n\n';

// ---- TypeScript that runs unchanged on the web -------------------------------

for (const name of ['calendars', 'date', 'money', 'numerals']) {
  write(`lib/format/${name}.ts`, header(`src/lib/format/${name}.ts`) + read(`src/lib/format/${name}.ts`));
}

write('lib/supabase/database.types.ts',
  header('src/lib/supabase/database.types.ts') + read('src/lib/supabase/database.types.ts'));

write('lib/content.ts',
  header('src/features/platform/content.ts') +
  read('src/features/platform/content.ts').replace("from '@/lib/i18n';", "from '@/lib/i18n/languages';"));

// The database's error codes → the words for them. One table, so a code the
// app explains is explained the same way here.
{
  const source = read('src/features/building/api.ts');
  const start = source.indexOf('/** Server message or code → translation key. */');
  const end = source.indexOf("return 'errors.generic';\n}\n", start);
  if (start === -1 || end === -1) {
    console.error('The app\'s errorKey() moved; update the error part of this script.');
    process.exit(1);
  }
  write('lib/error-key.ts', header('src/features/building/api.ts, errorKey') +
    `${source.slice(start, end + "return 'errors.generic';\n}\n".length)}`);
}

// ---- Words ------------------------------------------------------------------

/**
 * The parts of the app's dictionaries the console uses. The console keeps the
 * app's keys (`admin.home.buildings` means the same here), so a screen ported
 * from the app reads exactly as it does there. The console's own words live
 * in lib/i18n/console/*.json, under `console.`.
 */
const SECTIONS = [
  'common', 'errors', 'manage', 'admin', 'content', 'question', 'platform', 'support', 'ideas',
  'safety', 'reviewAccess', 'duplicates', 'calls', 'roles', 'dates', 'time', 'clock', 'theme',
  'language', 'numerals', 'fee', 'authEmail', 'signInEmail', 'auth', 'settings', 'people',
  'relationship', 'announcements', 'chat', 'complex', 'join', 'units', 'billing', 'invoices',
  'payments', 'tickets', 'meetings', 'multiBuilding', 'suspended', 'buildingClosed', 'inbox',
  // Where lib/error-key.ts sends some of the database's error codes.
  'notices', 'leave', 'recovery', 'profile', 'accountDelete', 'residents', 'sync',
];

const LOCALES = { fa: 'fa-AF', ps: 'ps-AF', en: 'en' };
for (const [short, file] of Object.entries(LOCALES)) {
  const full = JSON.parse(read(`src/lib/i18n/locales/${file}.json`));
  const picked = {};
  for (const section of SECTIONS) {
    if (full[section] !== undefined) picked[section] = full[section];
  }
  write(`lib/i18n/app/${short}.json`, `${JSON.stringify(picked, null, 2)}\n`);
}

// ---- Icons ------------------------------------------------------------------

const iconSource = read('src/components/ui/icon.tsx');
const union = iconSource.match(/export type IconName =([\s\S]*?);\n/);
const directional = iconSource.match(/const DIRECTIONAL: ReadonlySet<IconName> = new Set\(\[([\s\S]*?)\]\);/);
const pathsStart = iconSource.indexOf('const PATHS: Record<IconName, React.ReactNode> = {');
const pathsEnd = iconSource.indexOf('\n};\n', pathsStart);
if (!union || !directional || pathsStart === -1 || pathsEnd === -1) {
  console.error('The app\'s icon.tsx changed shape; update the icon part of this script.');
  process.exit(1);
}

const paths = iconSource
  .slice(pathsStart, pathsEnd + 3)
  .replace('const PATHS: Record<IconName, React.ReactNode> = {', 'export const APP_ICON_PATHS: Record<AppIconName, ReactNode> = {')
  .replace(/<Path\b/g, '<path')
  .replace(/<G\b/g, '<g')
  .replace(/<\/G>/g, '</g>')
  .replace(/<Circle\b/g, '<circle')
  .replace(/<Rect\b/g, '<rect');

// Only the drawings, after the declaration's own `Record<AppIconName, …>`.
const leftovers = paths.slice(paths.indexOf('= {')).match(/<[A-Z][A-Za-z]*\b/g);
if (leftovers) {
  console.error(`Icons use components this script does not convert: ${[...new Set(leftovers)].join(', ')}`);
  process.exit(1);
}

write('components/ui/icon-paths.tsx',
  header('src/components/ui/icon.tsx') +
  "import type { ReactNode } from 'react';\n\n" +
  `export type AppIconName =${union[1]};\n\n` +
  `/** Icons whose meaning depends on which way they point: mirrored in Dari and Pashto. */\n` +
  `export const APP_DIRECTIONAL: ReadonlySet<string> = new Set([${directional[1]}]);\n\n` +
  `${paths}\n`);

console.log('\nDone. Review the changes, run `npm run check`, and commit them.');
