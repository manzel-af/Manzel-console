'use client';

/**
 * The console's per-browser preferences: theme, number style, clock, table
 * density. Kept in localStorage — they are this person's taste on this
 * machine, nothing the server needs — and read through useSyncExternalStore,
 * so the server render uses the defaults and the browser switches to the
 * stored choice without a hydration error.
 *
 * The theme is also applied before first paint by the inline script in the
 * root layout (THEME_SCRIPT); setTheme() keeps that and the page in step.
 */

import { useSyncExternalStore } from 'react';

import type { ClockFormat } from '@/lib/format/date';
import type { NumeralSystem } from '@/lib/format/numerals';
import type { AppLanguage } from '@/lib/i18n/languages';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export interface Prefs {
  theme: ThemeChoice;
  /** null: the language's own (Eastern digits in Dari and Pashto, Latin in English). */
  numerals: NumeralSystem | null;
  clock: ClockFormat;
  density: Density;
}

const KEYS = {
  theme: 'theme',
  numerals: 'manzel.console.numerals',
  clock: 'manzel.console.clock',
  density: 'manzel.console.density',
} as const;

const DEFAULTS: Prefs = { theme: 'system', numerals: null, clock: '24h', density: 'comfortable' };

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function load(): Prefs {
  const theme = read(KEYS.theme);
  const numerals = read(KEYS.numerals);
  return {
    theme: theme === 'light' || theme === 'dark' ? theme : 'system',
    numerals: numerals === 'arabic' || numerals === 'latin' ? numerals : null,
    clock: read(KEYS.clock) === '12h' ? '12h' : '24h',
    density: read(KEYS.density) === 'compact' ? 'compact' : 'comfortable',
  };
}

let current: Prefs | null = null;
const listeners = new Set<() => void>();

function snapshot(): Prefs {
  if (!current) current = load();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed them.
  const onStorage = (event: StorageEvent) => {
    if (event.key && Object.values(KEYS).includes(event.key as never)) {
      current = load();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function update(next: Partial<Prefs>) {
  current = { ...snapshot(), ...next };
  try {
    if (next.theme !== undefined) {
      if (next.theme === 'system') window.localStorage.removeItem(KEYS.theme);
      else window.localStorage.setItem(KEYS.theme, next.theme);
    }
    if (next.numerals !== undefined) {
      if (next.numerals === null) window.localStorage.removeItem(KEYS.numerals);
      else window.localStorage.setItem(KEYS.numerals, next.numerals);
    }
    if (next.clock !== undefined) window.localStorage.setItem(KEYS.clock, next.clock);
    if (next.density !== undefined) window.localStorage.setItem(KEYS.density, next.density);
  } catch {
    // Private mode: the choice lasts for this tab.
  }
  if (next.theme !== undefined) applyTheme(next.theme);
  listeners.forEach((listener) => listener());
}

/** The same rule as THEME_SCRIPT: an explicit choice, else the system's. */
export function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark'
    || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function usePrefs(): Prefs & { set(next: Partial<Prefs>): void } {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
  return { ...prefs, set: update };
}

export function numeralsFor(language: AppLanguage, chosen: NumeralSystem | null): NumeralSystem {
  return chosen ?? (language === 'en' ? 'latin' : 'arabic');
}
