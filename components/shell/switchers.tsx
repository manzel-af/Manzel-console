'use client';

/**
 * Language and theme, as small controls for the top bar and the sign-in page.
 *
 * The language links are plain <a>, not <Link>: a new language is a new
 * <html lang dir> from the server, and a client navigation across the [lang]
 * segment would remount the root layout without it (the website learnt this).
 */

import { usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useI18n, useT } from '@/lib/i18n/client';
import { LOCALE_COOKIE, localeInfo, locales, swapLocale } from '@/lib/i18n/languages';
import { usePrefs, type ThemeChoice } from '@/lib/prefs';

import { Icon } from '../ui/icon';
import { Menu } from '../ui/menu';

export function LanguageSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  const { locale } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();

  return (
    <Menu
      className={className}
      trigger={(props) => (
        <button type="button" {...props} aria-label={t('console.shell.language')} title={t('console.shell.language')}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-[0.7rem] px-2.5 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg',
          )}>
          <Icon name="globe" size={18} />
          {!compact ? <span>{localeInfo[locale].nativeName}</span> : null}
        </button>
      )}
      items={locales.map((next) => ({
        label: (
          <span lang={localeInfo[next].language} className="flex w-full items-center justify-between gap-3">
            {localeInfo[next].nativeName}
            {next === locale ? <Icon name="check" size={16} className="text-primary" /> : null}
          </span>
        ),
        href: `${swapLocale(pathname, next)}${query ? `?${query}` : ''}`,
        checked: next === locale,
        onSelect: () => {
          document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        },
      }))}
    />
  );
}

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

export function ThemeSwitch({ className }: { className?: string }) {
  const t = useT();
  const prefs = usePrefs();
  const icon = prefs.theme === 'dark' ? 'moon' : prefs.theme === 'light' ? 'sun' : 'monitor';
  const label = `${t('console.shell.theme')}: ${t(`theme.${prefs.theme}`)}`;
  return (
    <button
      type="button"
      onClick={() => prefs.set({ theme: ORDER[(ORDER.indexOf(prefs.theme) + 1) % ORDER.length] })}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-[0.7rem] text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg',
        className,
      )}
    >
      <Icon name={icon} size={19} />
    </button>
  );
}
