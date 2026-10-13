/**
 * The console's faces, shared by the root layout and the pages that render
 * outside it (global-not-found, global-error).
 */

import localFont from 'next/font/local';

/** Dari and Pashto, and the wordmark: always preloaded. */
export const vazirmatn = localFont({
  src: './fonts/Vazirmatn-Variable.woff2',
  variable: '--font-vazirmatn',
  weight: '100 900',
  display: 'swap',
});

/** English. */
export const sansation = localFont({
  src: [
    { path: './fonts/Sansation-Light.woff2', weight: '300' },
    { path: './fonts/Sansation-Regular.woff2', weight: '400' },
    { path: './fonts/Sansation-Bold.woff2', weight: '700' },
  ],
  variable: '--font-sansation',
  display: 'swap',
  preload: false,
});

/** The afghani sign, which neither face has: fetched only by a page that prints one. */
export const afghani = localFont({
  src: [
    { path: './fonts/ManzelAfghani-Regular.woff2', weight: '400' },
    { path: './fonts/ManzelAfghani-Bold.woff2', weight: '700' },
  ],
  variable: '--font-afghani',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+060B' }],
});

export const fontVariables = `${vazirmatn.variable} ${sansation.variable} ${afghani.variable}`;
