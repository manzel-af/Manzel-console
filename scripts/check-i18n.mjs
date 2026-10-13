/**
 * Every word the console asks for exists in Dari, Pashto and English.
 *
 * Finds each t('…') / t("…") in the source and looks the key up in the merged
 * dictionary (the app's words + the console's) of every language. A key built
 * at run time — t(`manage.admin.status.${status}`) — is checked as far as its
 * fixed beginning: that section must exist. Also reports console keys that
 * are in one language and not another.
 *
 *   npm run check:i18n
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['fa', 'ps', 'en'];

const load = (locale) => ({
  ...JSON.parse(fs.readFileSync(path.join(root, 'lib/i18n/app', `${locale}.json`), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(root, 'lib/i18n/console', `${locale}.json`), 'utf8')),
});
const dictionaries = Object.fromEntries(LOCALES.map((locale) => [locale, load(locale)]));

const get = (dictionary, key) => key.split('.').reduce(
  (node, part) => (node && typeof node === 'object' ? node[part] : undefined), dictionary);

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'scripts', 'public'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(tsx?|mts)$/.test(entry.name)) yield full;
  }
}

const problems = [];
let checked = 0;

for (const file of files(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file);
  // Plain keys: t('a.b.c') and has('a.b.c'), and nav/menu label keys in quotes.
  for (const match of source.matchAll(/\b(?:t|has)\(\s*'([a-zA-Z][\w.]*\.[\w.]+)'/g)) {
    checked += 1;
    for (const locale of LOCALES) {
      if (typeof get(dictionaries[locale], match[1]) !== 'string') {
        problems.push(`${relative}: '${match[1]}' missing in ${locale}`);
      }
    }
  }
  // Keys built at run time: their fixed part must be a section.
  for (const match of source.matchAll(/\bt\(\s*`([a-zA-Z][\w.]*)\.\$\{/g)) {
    checked += 1;
    for (const locale of LOCALES) {
      const node = get(dictionaries[locale], match[1]);
      if (!node || typeof node !== 'object') problems.push(`${relative}: section '${match[1]}' missing in ${locale}`);
    }
  }
  // Labels written as data (nav.ts): label: 'a.b'.
  for (const match of source.matchAll(/\b(?:label|title|labelKey): '([a-zA-Z][\w]*\.[\w.]+)'/g)) {
    checked += 1;
    for (const locale of LOCALES) {
      if (typeof get(dictionaries[locale], match[1]) !== 'string') {
        problems.push(`${relative}: '${match[1]}' missing in ${locale}`);
      }
    }
  }
}

// The console's own words: the same keys in all three languages.
const flatten = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) =>
  typeof value === 'object' && value !== null ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]);
const own = Object.fromEntries(LOCALES.map((locale) => [locale, new Set(flatten(JSON.parse(
  fs.readFileSync(path.join(root, 'lib/i18n/console', `${locale}.json`), 'utf8'))))]));
for (const locale of LOCALES) {
  for (const key of own[locale]) {
    for (const other of LOCALES) {
      if (!own[other].has(key)) problems.push(`console words: '${key}' is in ${locale} but not ${other}`);
    }
  }
}

const unique = [...new Set(problems)];
if (unique.length > 0) {
  console.error(unique.join('\n'));
  console.error(`\n${unique.length} problem(s) in ${checked} uses.`);
  process.exit(1);
}
console.log(`i18n: ${checked} uses, every key in Dari, Pashto and English.`);
