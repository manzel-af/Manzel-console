/**
 * The console's three languages, and everything that depends on which one a
 * page is in.
 *
 * URLs use the short codes (`/fa`, `/ps`, `/en`), as the website does; the
 * app's own codes (`fa-AF`, `ps-AF`, `en`) are what its shared code and the
 * database speak. Dari is the default, as everywhere in Manzel.
 */

export const locales = ['fa', 'ps', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fa';

/** The app's language codes (src/lib/i18n there). */
export type AppLanguage = 'fa-AF' | 'ps-AF' | 'en';

interface LocaleInfo {
  /** BCP-47, for `<html lang>`; also the app's language code. */
  language: AppLanguage;
  dir: 'rtl' | 'ltr';
  /** The language's own name for itself, for the switcher. */
  nativeName: string;
}

export const localeInfo: Record<Locale, LocaleInfo> = {
  fa: { language: 'fa-AF', dir: 'rtl', nativeName: 'دری' },
  ps: { language: 'ps-AF', dir: 'rtl', nativeName: 'پښتو' },
  en: { language: 'en', dir: 'ltr', nativeName: 'English' },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value) && (locales as readonly string[]).includes(value as string);
}

export function localeOfLanguage(language: string | null | undefined): Locale {
  if (language === 'ps-AF') return 'ps';
  if (language === 'en') return 'en';
  return 'fa';
}

/**
 * A locale from an Accept-Language header. `prs` is ISO 639-3 for Dari; some
 * Afghan Android builds send it instead of `fa`.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [range, ...params] = part.trim().toLowerCase().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { range: range.trim(), q: q ? Number(q.split('=')[1]) || 0 : 1 };
    })
    .filter((entry) => entry.range && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { range } of ranked) {
    const primary = range.split('-')[0];
    if (primary === 'ps' || primary === 'pus') return 'ps';
    if (primary === 'fa' || primary === 'prs' || primary === 'per') return 'fa';
    if (primary === 'en') return 'en';
  }
  return defaultLocale;
}

/** Remembers the language chosen with the switcher, for the next visit to `/`. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** `/fa/people/1` → `/en/people/1`, keeping the rest of the path and the query. */
export function swapLocale(pathname: string, next: Locale): string {
  const segments = pathname.split('/');
  if (isLocale(segments[1])) {
    segments[1] = next;
    return segments.join('/') || `/${next}`;
  }
  return `/${next}${pathname === '/' ? '' : pathname}`;
}
