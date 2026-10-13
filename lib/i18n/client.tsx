'use client';

/**
 * Words on the client. `t('admin.home.buildings')` reads the same key as the
 * app; `{{name}}` placeholders are filled from the second argument, as with
 * the app's i18next. A key that is missing shows itself, so a gap is seen in
 * review rather than shipped as a blank (scripts/check-i18n.mjs finds them).
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Dictionary } from './dictionaries';
import { localeInfo, type AppLanguage, type Locale } from './languages';

export type TranslateValues = Record<string, string | number | null | undefined>;
export type Translate = (key: string, values?: TranslateValues) => string;

interface I18nValue {
  locale: Locale;
  /** The app's code for the language: fa-AF, ps-AF or en. */
  language: AppLanguage;
  dir: 'rtl' | 'ltr';
  rtl: boolean;
  t: Translate;
  /** Whether a key exists, for words that are only sometimes there. */
  has(key: string): boolean;
  /**
   * Words in another language, for what is being written in it: a banner's
   * preview and placeholders (content, platform, question, the preview's
   * own words). Falls back to this page's words.
   */
  wordsIn(language: AppLanguage): Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

function lookup(dictionary: Dictionary, key: string): unknown {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function interpolate(text: string, values?: TranslateValues): string {
  if (!values) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function I18nProvider({
  locale, dictionary, preview, children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  /** getPreviewWords(): a few sections in every language. */
  preview?: Record<string, Dictionary>;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const info = localeInfo[locale];
    const t: Translate = (key, values) => {
      const found = lookup(dictionary, key);
      return typeof found === 'string' ? interpolate(found, values) : key;
    };
    return {
      locale,
      language: info.language,
      dir: info.dir,
      rtl: info.dir === 'rtl',
      t,
      has: (key) => typeof lookup(dictionary, key) === 'string',
      wordsIn: (language) => {
        const words = preview?.[language];
        if (!words || language === info.language) return t;
        return (key, values) => {
          const found = lookup(words, key);
          return typeof found === 'string' ? interpolate(found, values) : t(key, values);
        };
      },
    };
  }, [locale, dictionary, preview]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

export function useT(): Translate {
  return useI18n().t;
}

/** `/people` → `/fa/people`: a console path in the page's language. */
export function useHref(): (path: string) => string {
  const { locale } = useI18n();
  return (path: string) => `/${locale}${path === '/' ? '' : path}`;
}
