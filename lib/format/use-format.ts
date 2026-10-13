'use client';

/**
 * The app's formatters, bound to this page's language and this browser's
 * choices — the same `fmt` the app's screens use (useLocale().fmt there), so
 * a date reads 12 میزان ۱۴۰۵ here exactly as on the phone.
 */

import { useMemo } from 'react';

import { useI18n } from '@/lib/i18n/client';
import { numeralsFor, usePrefs } from '@/lib/prefs';

import {
  formatRelativeDays, formatShamsi, formatShamsiDateTime, formatShamsiMonth, formatTime, formatWeekday,
  type DateFormatOptions,
} from './date';
import { formatAmount, formatMoney, type MoneyFormatOptions } from './money';
import { formatDigits, type NumeralSystem } from './numerals';

export interface Formatters {
  numerals: NumeralSystem;
  money(minor: number, options?: Omit<MoneyFormatOptions, 'numerals' | 'language'>): string;
  amount(minor: number, currency?: string): string;
  date(value: string | Date | number | null | undefined, style?: DateFormatOptions['style']): string;
  dateTime(value: string | Date | number | null | undefined): string;
  time(value: string | Date | number | null | undefined): string;
  month(value: string | Date | number): string;
  weekday(value: string | Date | number): string;
  relative(value: string | Date | number | null | undefined): string;
  number(value: number | string): string;
}

export function useFormat(): Formatters {
  const { language } = useI18n();
  const { numerals: chosen, clock } = usePrefs();
  const numerals = numeralsFor(language, chosen);

  return useMemo<Formatters>(() => ({
    numerals,
    money: (minor, options) => formatMoney(minor, { ...options, numerals, language }),
    amount: (minor, currency) => formatAmount(minor, numerals, currency),
    date: (value, style = 'medium') => formatShamsi(value, { language, numerals, style }),
    dateTime: (value) => formatShamsiDateTime(value, { language, numerals, clock }),
    time: (value) => formatTime(value, numerals, clock, language),
    month: (value) => formatShamsiMonth(value, { language, numerals }),
    weekday: (value) => formatWeekday(value, language),
    relative: (value) => formatRelativeDays(value, language, numerals),
    number: (value) => formatDigits(String(value), numerals),
  }), [language, numerals, clock]);
}
