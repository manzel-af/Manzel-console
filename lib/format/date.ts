// Copied from the Manzel app (src/lib/format/date.ts) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/**
 * Dates — Solar Hijri (Shamsi).
 *
 * The database stores ISO 8601 in UTC. Every date the user reads is Shamsi —
 * bills, receipts, notices, pickers. The one exception is the home screen's
 * "today", which also prints the Gregorian and Hijri (lunar) dates beside it,
 * as an Afghan wall calendar does (calendars.ts).
 *
 * Month names are the AFGHAN ones (حمل، ثور، جوزا …), not the Iranian ones
 * (فروردین، اردیبهشت …). Same calendar, different names, and using the Iranian
 * set marks the app as foreign on the first screen a resident sees.
 */

import { toGregorian, toJalaali } from 'jalaali-js';

import { formatDigits, type NumeralSystem } from './numerals';

export type AppLanguage = 'fa-AF' | 'ps-AF' | 'en';

export interface ShamsiDate {
  year: number;
  /** 1 = Hamal. */
  month: number;
  day: number;
}

/** Afghan Solar Hijri month names. */
const MONTHS: Record<AppLanguage, readonly string[]> = {
  'fa-AF': [
    'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
    'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت',
  ],
  'ps-AF': [
    'وری', 'غویی', 'غبرګولی', 'چنګاښ', 'زمری', 'وږی',
    'تله', 'لړم', 'لیندۍ', 'مرغومی', 'سلواغه', 'کب',
  ],
  en: [
    'Hamal', 'Sawr', 'Jawza', 'Saratan', 'Asad', 'Sunbula',
    'Mizan', 'Aqrab', 'Qaws', 'Jadi', 'Dalw', 'Hut',
  ],
};

/** Weekdays, starting at Saturday — the first day of the Afghan week. */
const WEEKDAYS: Record<AppLanguage, readonly string[]> = {
  'fa-AF': ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
  'ps-AF': ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'څلورشنبه', 'پنجشنبه', 'جمعه'],
  en: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
};

export function shamsiMonthNames(language: AppLanguage): readonly string[] {
  return MONTHS[language] ?? MONTHS['fa-AF'];
}

export function shamsiWeekdayNames(language: AppLanguage): readonly string[] {
  return WEEKDAYS[language] ?? WEEKDAYS['fa-AF'];
}

/** Accepts an ISO string, a Date, or a `YYYY-MM-DD` date column. */
export function toDate(value: string | Date | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  // A bare date column has no timezone. Parsing it as UTC and reading it back in
  // UTC keeps "the 1st" the 1st, instead of the 31st in a negative offset.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  return new Date(value);
}

export function toShamsi(value: string | Date | number): ShamsiDate {
  const date = toDate(value);
  const { jy, jm, jd } = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { year: jy, month: jm, day: jd };
}

export function fromShamsi({ year, month, day }: ShamsiDate): Date {
  const { gy, gm, gd } = toGregorian(year, month, day);
  return new Date(gy, gm - 1, gd);
}

/** The Shamsi year of "now". Used for invoice and receipt number prefixes. */
export function currentShamsiYear(): number {
  return toShamsi(new Date()).year;
}

export interface DateFormatOptions {
  language?: AppLanguage;
  numerals?: NumeralSystem;
  /**
   * short  — ۱۴ حمل
   * medium — ۱۴ حمل ۱۴۰۴      (default)
   * long   — پنجشنبه، ۱۴ حمل ۱۴۰۴
   * numeric— ۱۴۰۴/۰۱/۱۴
   */
  style?: 'short' | 'medium' | 'long' | 'numeric';
  /** For the time part of a date-time. */
  clock?: ClockFormat;
}

export function formatShamsi(
  value: string | Date | number | null | undefined,
  options: DateFormatOptions = {},
): string {
  if (value === null || value === undefined || value === '') return '—';

  const { language = 'fa-AF', numerals = 'arabic', style = 'medium' } = options;
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';

  const { year, month, day } = toShamsi(date);
  const monthName = shamsiMonthNames(language)[month - 1];

  if (style === 'numeric') {
    const text = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    return formatDigits(text, numerals);
  }

  const core = style === 'short'
    ? `${day} ${monthName}`
    : `${day} ${monthName} ${year}`;

  if (style !== 'long') return formatDigits(core, numerals);

  // JS getDay(): 0 = Sunday. The Afghan week starts Saturday, so shift by one.
  const weekday = shamsiWeekdayNames(language)[(date.getDay() + 1) % 7];
  const separator = language === 'en' ? ', ' : '، ';
  return formatDigits(`${weekday}${separator}${core}`, numerals);
}

/** 'پنجشنبه' — the day of the week, on its own. */
export function formatWeekday(
  value: string | Date | number,
  language: AppLanguage = 'fa-AF',
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  // JS getDay(): 0 = Sunday; the list starts at Saturday.
  return shamsiWeekdayNames(language)[(date.getDay() + 1) % 7];
}

/** How a person reads the clock: '14:30' or '2:30 PM'. A per-device setting. */
export type ClockFormat = '24h' | '12h';

/** Before and after noon, as each language abbreviates them. */
export const DAY_HALVES: Record<AppLanguage, readonly [string, string]> = {
  'fa-AF': ['ق.ظ', 'ب.ظ'],
  'ps-AF': ['غ.م', 'غ.و'],
  en: ['AM', 'PM'],
};

/**
 * '۱۴:۳۰', or with the 12-hour clock '۲:۳۰ ب.ظ' / '2:30 PM'. The 24-hour clock
 * is the default: it needs no am/pm, which is not how time is spoken here.
 */
export function formatTime(
  value: string | Date | number | null | undefined,
  numerals: NumeralSystem = 'arabic',
  clock: ClockFormat = '24h',
  language: AppLanguage = 'fa-AF',
): string {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (clock === '12h') {
    const half = (DAY_HALVES[language] ?? DAY_HALVES['fa-AF'])[hours < 12 ? 0 : 1];
    return `${formatDigits(`${hours % 12 || 12}:${minutes}`, numerals)} ${half}`;
  }
  return formatDigits(`${String(hours).padStart(2, '0')}:${minutes}`, numerals);
}

export function formatShamsiDateTime(
  value: string | Date | number | null | undefined,
  options: DateFormatOptions = {},
): string {
  if (!value) return '—';
  return `${formatShamsi(value, options)} • ${formatTime(value, options.numerals, options.clock, options.language)}`;
}

/** 'حمل ۱۴۰۴' — the label a billing period is known by. */
export function formatShamsiMonth(
  value: string | Date | number,
  options: DateFormatOptions = {},
): string {
  const { language = 'fa-AF', numerals = 'arabic' } = options;
  const { year, month } = toShamsi(value);
  return formatDigits(`${shamsiMonthNames(language)[month - 1]} ${year}`, numerals);
}

/**
 * Relative time, in whole days.
 *
 * Deliberately coarse. "3 minutes ago" is noise on a screen someone opens twice
 * a month, and precision the app cannot honour anyway when the device has been
 * offline for a week.
 */
export function formatRelativeDays(
  value: string | Date | number | null | undefined,
  language: AppLanguage = 'fa-AF',
  numerals: NumeralSystem = 'arabic',
): string {
  if (!value) return '—';
  const date = toDate(value);
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);

  const n = (count: number) => formatDigits(String(Math.abs(count)), numerals);

  if (language === 'en') {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days === -1) return 'Tomorrow';
    return days > 0 ? `${n(days)} days ago` : `in ${n(days)} days`;
  }

  if (language === 'ps-AF') {
    if (days === 0) return 'نن';
    if (days === 1) return 'پرون';
    if (days === -1) return 'سبا';
    return days > 0 ? `${n(days)} ورځې وړاندې` : `په ${n(days)} ورځو کې`;
  }

  if (days === 0) return 'امروز';
  if (days === 1) return 'دیروز';
  if (days === -1) return 'فردا';
  return days > 0 ? `${n(days)} روز پیش` : `${n(days)} روز بعد`;
}

/** Whole days between now and a due date. Positive means overdue. */
export function daysOverdue(dueDate: string | Date | null | undefined): number {
  if (!dueDate) return 0;
  const due = toDate(dueDate);
  const diff = Math.floor((Date.now() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

/** First and last day of the Shamsi month containing `value`, as ISO dates. */
export function shamsiMonthRange(value: string | Date | number = new Date()): {
  start: string;
  end: string;
  label: ShamsiDate;
} {
  const { year, month } = toShamsi(value);
  const start = fromShamsi({ year, month, day: 1 });

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(fromShamsi({ year: nextYear, month: nextMonth, day: 1 }).getTime() - 86_400_000);

  return { start: toIsoDate(start), end: toIsoDate(end), label: { year, month, day: 1 } };
}

/** `YYYY-MM-DD` in local time, which is what a Postgres `date` column wants. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
