/**
 * Adds the console's own words to all three dictionaries at once, so Dari,
 * Pashto and English never drift apart.
 *
 *   node scripts/add-keys.mjs words.json
 *
 * words.json maps a dotted key under `console.` to its three translations:
 *
 *   { "overview.allClear": { "en": "…", "fa": "…", "ps": "…" } }
 *
 * An existing key is replaced (say so with --replace; otherwise it stops).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [specFile, flag] = process.argv.slice(2);
if (!specFile) {
  console.error('Usage: node scripts/add-keys.mjs words.json [--replace]');
  process.exit(1);
}
const replace = flag === '--replace';
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));

for (const locale of ['en', 'fa', 'ps']) {
  const file = path.join(root, 'lib', 'i18n', 'console', `${locale}.json`);
  const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, words] of Object.entries(spec)) {
    const value = words[locale];
    if (typeof value !== 'string' || !value.trim()) {
      console.error(`"${key}" has no ${locale} text.`);
      process.exit(1);
    }
    const parts = ['console', ...key.split('.')];
    let node = dictionary;
    for (const part of parts.slice(0, -1)) {
      if (node[part] === undefined) node[part] = {};
      if (typeof node[part] !== 'object') {
        console.error(`"${key}": ${part} is a string, not a section.`);
        process.exit(1);
      }
      node = node[part];
    }
    const last = parts[parts.length - 1];
    if (node[last] !== undefined && !replace && node[last] !== value) {
      console.error(`"${key}" already exists (${locale}): ${JSON.stringify(node[last])}. Use --replace.`);
      process.exit(1);
    }
    node[last] = value;
  }
  fs.writeFileSync(file, `${JSON.stringify(dictionary, null, 2)}\n`);
}
console.log(`Added ${Object.keys(spec).length} keys to en, fa and ps.`);
