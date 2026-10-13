'use client';

/**
 * The last resort: the root layout itself failed, so there are no words, no
 * theme and no language to lean on. Like the 404, it speaks all three
 * languages, and offers to try again.
 */

import { useEffect } from 'react';

import en from '@/lib/i18n/console/en.json';
import fa from '@/lib/i18n/console/fa.json';
import ps from '@/lib/i18n/console/ps.json';
import { THEME_SCRIPT } from '@/lib/theme-script';

import { fontVariables } from './fonts';

import './globals.css';

const LANGUAGES = [
  { lang: 'fa-AF', dir: 'rtl', words: fa.console.errors },
  { lang: 'ps-AF', dir: 'rtl', words: ps.console.errors },
  { lang: 'en', dir: 'ltr', words: en.console.errors },
] as const;

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fa-AF" dir="rtl" className={fontVariables} suppressHydrationWarning>
      <head>
        <title>Manzel Console</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <div className="flex w-full flex-col divide-y divide-line">
            {LANGUAGES.map(({ lang, dir, words }) => (
              <section key={lang} lang={lang} dir={dir} className="flex flex-col items-center gap-1.5 py-5">
                <h1 className="text-lg font-bold text-fg">{words.pageTitle}</h1>
                <p className="text-sm text-fg-muted">{words.pageBody}</p>
              </section>
            ))}
          </div>
          <button type="button" onClick={() => retry()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-fg-on-primary shadow-card hover:bg-primary-hover">
            <span lang="fa-AF">{fa.console.errors.tryAgain}</span>
            <span aria-hidden className="opacity-60">·</span>
            <span lang="en">{en.console.errors.tryAgain}</span>
          </button>
          {error.digest ? <p dir="ltr" className="font-mono text-xs text-fg-subtle">{error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
