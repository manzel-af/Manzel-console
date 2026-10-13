// Copied from the Manzel app (src/lib/format/calendars.ts) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/**
 * The two other calendars people here read: Gregorian and Hijri (lunar).
 *
 * The app's dates are Shamsi everywhere (date.ts). These two appear beside it
 * where a person wants all three at a glance — the home screen's "today" — the
 * way an Afghan wall calendar prints them: ۳۱ سنبله ۱۴۰۵ · 22 September 2026 ·
 * 11 Rabi al-Thani 1448.
 *
 * Hijri follows Umm al-Qura, the calendar most phones and printed calendars in
 * the region use, from a table generated from ICU (1440–1480 AH, 2018–2059).
 * Not from Intl: Hermes does not support every calendar on every phone.
 * Outside the table the arithmetic (civil) calendar is used, which can differ
 * from a sighted month by a day. The day is the phone's local calendar day.
 */

import type { AppLanguage } from './date';
import { formatDigits, type NumeralSystem } from './numerals';

const GREGORIAN_MONTHS: Record<AppLanguage, readonly string[]> = {
  'fa-AF': ['جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون', 'جولای', 'آگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
  'ps-AF': ['جنوري', 'فبروري', 'مارچ', 'اپرېل', 'مۍ', 'جون', 'جولای', 'اګست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const HIJRI_MONTHS: Record<AppLanguage, readonly string[]> = {
  'fa-AF': ['محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی‌القعده', 'ذی‌الحجه'],
  'ps-AF': ['محرم', 'صفر', 'ربیع الاول', 'ربیع الثاني', 'جمادی الاول', 'جمادی الثاني', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی القعده', 'ذی الحجه'],
  en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'],
};

// Generated from ICU's islamic-umalqura calendar: per Hijri year, the day
// number (days since 1970-01-01) of 1 Muharram, and a mask whose bit m is set
// when month m+1 has 30 days.
const UMM_AL_QURA_FIRST_YEAR = 1440;
const UMM_AL_QURA: readonly (readonly [number, number])[] = [
  [17785, 0x2ba], [18139, 0x5b5], [18494, 0x5aa], [18848, 0xd55],
  [19203, 0xa9a], [19557, 0x92e], [19911, 0x26e], [20265, 0x55d],
  [20620, 0xada], [20975, 0x6d4], [21329, 0x6a5], [21683, 0xb27],
  [22038, 0xa4d], [22392, 0x4ad], [22746, 0x56d], [23101, 0xb5a],
  [23456, 0x754], [23810, 0xf49], [24165, 0xe92], [24519, 0xd26],
  [24873, 0xa56], [25227, 0x356], [25581, 0x6b5], [25936, 0xbaa],
  [26291, 0xb92], [26645, 0xb25], [26999, 0x68b], [27353, 0xa9b],
  [27708, 0x55a], [28062, 0xada], [28417, 0x5b4], [28771, 0xda9],
  [29126, 0xb52], [29480, 0xa9a], [29834, 0x536], [30188, 0x276],
  [30542, 0x575], [30897, 0xaf2], [31252, 0x6d4], [31606, 0x6a9],
  [31960, 0x555],
];

export interface CalendarDate {
  year: number;
  /** 1-based. */
  month: number;
  day: number;
}

/** The phone's local calendar day, as days since 1970-01-01. */
function localDayNumber(value: Date): number {
  return Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000);
}

function yearLength(mask: number): number {
  let days = 0;
  for (let month = 0; month < 12; month += 1) days += (mask >> month) & 1 ? 30 : 29;
  return days;
}

/** The arithmetic Islamic calendar, for dates outside the Umm al-Qura table. */
function civilHijri(dayNumber: number): CalendarDate {
  const jd = dayNumber + 2_440_588;
  let l = jd - 1_948_440 + 10_632;
  const n = Math.floor((l - 1) / 10_631);
  l = l - 10_631 * n + 354;
  const j = Math.floor((10_985 - l) / 5316) * Math.floor((50 * l) / 17_719)
    + Math.floor(l / 5670) * Math.floor((43 * l) / 15_238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17_719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15_238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { year: 30 * n + j - 30, month, day };
}

export function toHijri(value: Date): CalendarDate {
  const dayNumber = localDayNumber(value);
  for (let index = UMM_AL_QURA.length - 1; index >= 0; index -= 1) {
    const [start, mask] = UMM_AL_QURA[index];
    if (dayNumber < start) continue;
    let offset = dayNumber - start;
    if (offset >= yearLength(mask)) break;
    for (let month = 0; month < 12; month += 1) {
      const length = (mask >> month) & 1 ? 30 : 29;
      if (offset < length) return { year: UMM_AL_QURA_FIRST_YEAR + index, month: month + 1, day: offset + 1 };
      offset -= length;
    }
  }
  return civilHijri(dayNumber);
}

/** "22 September 2026", "۲۲ سپتمبر ۲۰۲۶". */
export function formatGregorian(value: Date, options: { language: AppLanguage; numerals: NumeralSystem }): string {
  const months = GREGORIAN_MONTHS[options.language] ?? GREGORIAN_MONTHS['fa-AF'];
  const digits = (n: number) => formatDigits(String(n), options.numerals);
  return `${digits(value.getDate())} ${months[value.getMonth()]} ${digits(value.getFullYear())}`;
}

/** "11 Rabi al-Thani 1448", "۱۱ ربیع‌الثانی ۱۴۴۸". */
export function formatHijri(value: Date, options: { language: AppLanguage; numerals: NumeralSystem }): string {
  const hijri = toHijri(value);
  const months = HIJRI_MONTHS[options.language] ?? HIJRI_MONTHS['fa-AF'];
  const digits = (n: number) => formatDigits(String(n), options.numerals);
  return `${digits(hijri.day)} ${months[hijri.month - 1]} ${digits(hijri.year)}`;
}
