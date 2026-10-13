// Copied from the Manzel app (src/lib/format/numerals.ts) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/**
 * Numerals.
 *
 * Eastern Arabic-Indic digits (۰۱۲۳۴۵۶۷۸۹) are what people read here. Latin
 * digits are what a database stores and what a keyboard sometimes produces.
 * Every number the user sees goes through `formatDigits`; nothing is ever
 * stored in Eastern digits.
 *
 * The reverse direction matters just as much: a resident typing an amount on an
 * Afghan keyboard produces ۱۲۰۰, and `parseDigits` is what makes that a number.
 */

export type NumeralSystem = 'arabic' | 'latin';

const EASTERN = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** Arabic-Indic (٠١٢٣) as well as Extended (۰۱۲۳): Arabic keyboards emit both. */
const ARABIC_INDIC_START = 0x0660;
const EXTENDED_ARABIC_INDIC_START = 0x06f0;

/** Thousands separator. U+066C is the Arabic thousands separator. */
const EASTERN_GROUP = '٬';
const LATIN_GROUP = ',';

/** Decimal mark. U+066B is the Arabic decimal separator. */
const EASTERN_DECIMAL = '٫';
const LATIN_DECIMAL = '.';

/** Latin digits in, chosen numerals out. Leaves every other character alone. */
export function formatDigits(input: string, system: NumeralSystem): string {
  if (system === 'latin') return input;
  return input.replace(/\d/g, (d) => EASTERN[Number(d)]);
}

/** Any numerals in, Latin digits out. Safe to call on text that has none. */
export function parseDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - EXTENDED_ARABIC_INDIC_START))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_START))
    .replace(new RegExp(`[${EASTERN_GROUP}${LATIN_GROUP}]`, 'g'), '')
    .replace(new RegExp(`[${EASTERN_DECIMAL}]`, 'g'), LATIN_DECIMAL);
}

/** Groups thousands with the separator that belongs to the numeral system. */
export function groupThousands(digits: string, system: NumeralSystem): string {
  const separator = system === 'arabic' ? EASTERN_GROUP : LATIN_GROUP;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function decimalMark(system: NumeralSystem): string {
  return system === 'arabic' ? EASTERN_DECIMAL : LATIN_DECIMAL;
}

/**
 * Turns whatever the user typed into an integer, tolerantly.
 * Returns null rather than NaN so callers are forced to handle "not a number".
 */
export function parseIntegerInput(raw: string): number | null {
  const normalised = parseDigits(raw).replace(/[^\d]/g, '');
  if (normalised.length === 0) return null;
  const value = Number(normalised);
  return Number.isSafeInteger(value) ? value : null;
}
