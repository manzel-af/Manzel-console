// Copied from the Manzel app (src/lib/format/money.ts) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/**
 * Money.
 *
 * Everything is a bigint-safe integer in MINOR units. 1,500 AFN is 150000.
 * There is no float in this file and there must never be one: 0.1 + 0.2 is a
 * funny anecdote in a blog post and a lost afghani in a receipt book.
 *
 * JavaScript's `number` is exact for integers up to 2^53, which is 90 trillion
 * AFN. A building that bills more than that has bigger problems than this app.
 */

import { decimalMark, formatDigits, groupThousands, parseDigits, type NumeralSystem } from './numerals';

export type CurrencyCode = 'AFN' | 'USD' | 'EUR' | 'PKR';

interface CurrencyInfo {
  /** Digits after the decimal point. */
  readonly decimals: number;
  /** Symbol as written in Dari/Pashto text. */
  readonly symbol: { fa: string; ps: string; en: string };
}

const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  // U+060B AFGHANI SIGN. Rendered by Vazirmatn; not by every system font,
  // which is one more reason the font is bundled.
  // ؋ in every language, English included: it is what the on-screen amounts
  // show (components/ui/money.tsx), so text, toasts and PDFs must agree.
  AFN: { decimals: 2, symbol: { fa: '؋', ps: '؋', en: '؋' } },
  USD: { decimals: 2, symbol: { fa: '$', ps: '$', en: '$' } },
  EUR: { decimals: 2, symbol: { fa: '€', ps: '€', en: '€' } },
  PKR: { decimals: 2, symbol: { fa: 'Rs', ps: 'Rs', en: 'Rs' } },
};

export function currencyDecimals(currency: string): number {
  return CURRENCIES[currency as CurrencyCode]?.decimals ?? 2;
}

export function currencySymbol(currency: string, language: string): string {
  const info = CURRENCIES[currency as CurrencyCode];
  if (!info) return currency;
  if (language.startsWith('ps')) return info.symbol.ps;
  if (language.startsWith('en')) return info.symbol.en;
  return info.symbol.fa;
}

export interface MoneyFormatOptions {
  currency?: string;
  numerals?: NumeralSystem;
  language?: string;
  /** Show the currency symbol. Off inside a table where the column says AFN. */
  withSymbol?: boolean;
  /**
   * Drop ".00". Service charges here are whole afghanis in practice, and a
   * column of "1,500.00" is harder to scan than a column of "1,500".
   */
  hideZeroDecimals?: boolean;
}

/**
 * Minor units -> display string.
 *
 * formatMoney(150000) === '۱٬۵۰۰ ؋'
 * formatMoney(150050, { numerals: 'latin' }) === '1,500.50 AFN'
 */
export function formatMoney(minor: number, options: MoneyFormatOptions = {}): string {
  const {
    currency = 'AFN',
    numerals = 'arabic',
    language = 'fa-AF',
    withSymbol = true,
    hideZeroDecimals = true,
  } = options;

  const decimals = currencyDecimals(currency);
  const negative = minor < 0;
  const absolute = Math.abs(Math.trunc(minor));

  const divisor = 10 ** decimals;
  const whole = Math.floor(absolute / divisor);
  const fraction = absolute % divisor;

  let body = groupThousands(String(whole), numerals);
  if (!(hideZeroDecimals && fraction === 0)) {
    body += decimalMark(numerals) + String(fraction).padStart(decimals, '0');
  }

  let result = formatDigits(body, numerals);
  if (negative) result = `−${result}`; // U+2212 MINUS, not a hyphen

  if (withSymbol) {
    const symbol = currencySymbol(currency, language);
    // Symbol trails the number in Dari and Pashto, leads it in English for
    // $ and €. AFN trails in all three.
    const symbolLeads = language.startsWith('en') && (symbol === '$' || symbol === '€');
    result = symbolLeads ? `${symbol}${result}` : `${result} ${symbol}`;

    // ؋ is an Arabic-script character, so Unicode counts it as right-to-left.
    // In English, a sentence that STARTS with an amount ("500 ؋ for the
    // building · 41.67 ؋ a flat.") then has ؋ as its first strong character,
    // and Android and iOS lay the whole sentence out right to left:
    // ".a flat ؋ 41.67 · for the building ؋ 500". An invisible LEFT-TO-RIGHT
    // MARK in front makes the first strong character left-to-right, whatever
    // sentence the amount is dropped into. Dari and Pashto are right to left
    // anyway and need nothing.
    if (language.startsWith('en') && symbol === '؋') result = `‎${result}`;
  }

  return result;
}

/** The number without the symbol, for a screen that shows the unit separately. */
export function formatAmount(minor: number, numerals: NumeralSystem = 'arabic', currency = 'AFN'): string {
  return formatMoney(minor, { numerals, currency, withSymbol: false });
}

/**
 * What the user typed -> minor units.
 * Accepts Eastern or Latin digits, either decimal mark, and any grouping.
 * Returns null when the input is not a number, so a caller cannot mistake a
 * typo for zero.
 */
export function parseMoneyToMinor(raw: string, currency = 'AFN'): number | null {
  const decimals = currencyDecimals(currency);
  const normalised = parseDigits(raw.trim()).replace(/[^\d.\-]/g, '');
  if (normalised === '' || normalised === '-' || normalised === '.') return null;

  const negative = normalised.startsWith('-');
  const [wholePart = '0', fractionPart = ''] = normalised.replace('-', '').split('.');

  const whole = Number(wholePart || '0');
  if (!Number.isFinite(whole)) return null;

  const fraction = Number((fractionPart + '0'.repeat(decimals)).slice(0, decimals) || '0');
  const minor = whole * 10 ** decimals + fraction;

  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

/** Splits `total` into `parts` without losing or inventing a single unit. */
export function splitEvenly(totalMinor: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(totalMinor / parts);
  const remainder = totalMinor - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}
