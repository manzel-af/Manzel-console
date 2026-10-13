/**
 * The root layout. The language segment sits above it, so each language has
 * its own <html lang dir> from the first byte — no flip from LTR to RTL after
 * the page loads.
 *
 * Just the shell: fonts, theme, words. Everything an operator sees lives
 * behind the sign-in in (console)/layout.tsx, and is drawn in the browser
 * with the operator's own session.
 */

import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';

import { Providers } from '@/components/providers';
import { getDictionary, getPreviewWords } from '@/lib/i18n/dictionaries';
import { isLocale, localeInfo, locales } from '@/lib/i18n/languages';
import { THEME_SCRIPT } from '@/lib/theme-script';

import { fontVariables } from '../fonts';

import '../globals.css';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const NAMES: Record<string, string> = { fa: 'کنسول منزل', ps: 'د منزل کنسول', en: 'Manzel Console' };

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  const name = NAMES[lang] ?? NAMES.fa;
  return {
    title: { default: name, template: `%s · ${name}` },
    applicationName: name,
    description: 'Manzel Console',
    // Never in a search engine, never in a link preview.
    robots: { index: false, follow: false, nocache: true },
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF8F3' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1116' },
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover',
};

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const info = localeInfo[lang];
  const [dictionary, preview] = await Promise.all([getDictionary(lang), getPreviewWords()]);

  return (
    <html
      lang={info.language}
      dir={info.dir}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <Providers locale={lang} dictionary={dictionary} preview={preview}>{children}</Providers>
      </body>
    </html>
  );
}
