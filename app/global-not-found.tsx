/**
 * The console's 404, for an address that matches nothing. Next renders it
 * outside every layout — there is no language yet to choose words by — so it
 * says it in all three, each in its own direction and face, and sends the
 * operator to the start, where the proxy picks their language again.
 */

import type { Metadata } from 'next';

import { LogoMark } from '@/components/brand/logo';
import en from '@/lib/i18n/console/en.json';
import fa from '@/lib/i18n/console/fa.json';
import ps from '@/lib/i18n/console/ps.json';
import { THEME_SCRIPT } from '@/lib/theme-script';

import { fontVariables } from './fonts';

import './globals.css';

export const metadata: Metadata = {
  title: '404 · Manzel Console',
  robots: { index: false, follow: false },
};

const LANGUAGES = [
  { lang: 'fa-AF', dir: 'rtl', words: fa.console.errors },
  { lang: 'ps-AF', dir: 'rtl', words: ps.console.errors },
  { lang: 'en', dir: 'ltr', words: en.console.errors },
] as const;

export default function GlobalNotFound() {
  return (
    <html lang="fa-AF" dir="rtl" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-6 py-16 text-center">
          <LogoMark size={64} />
          <p dir="ltr" className="font-mono text-5xl font-bold text-primary">404</p>
          <div className="flex w-full flex-col divide-y divide-line">
            {LANGUAGES.map(({ lang, dir, words }) => (
              <section key={lang} lang={lang} dir={dir} className="flex flex-col items-center gap-1.5 py-5">
                <h1 className="text-lg font-bold text-fg">{words.notFoundTitle}</h1>
                <p className="text-sm text-fg-muted">{words.notFoundBody}</p>
              </section>
            ))}
          </div>
          {/* A plain link on purpose: a full load through the proxy, which picks the
              operator's language and so the page's <html lang dir>. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-fg-on-primary shadow-card hover:bg-primary-hover">
            <span lang="fa-AF">{fa.console.errors.goHome}</span>
            <span aria-hidden className="opacity-60">·</span>
            <span lang="en">{en.console.errors.goHome}</span>
          </a>
        </main>
      </body>
    </html>
  );
}
