import { NextResponse, type NextRequest } from 'next/server';

import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from '@/lib/i18n/languages';

/**
 * Every page lives under a language: /fa, /ps or /en. A path without one —
 * the bare domain, an old bookmark, a link from an email — goes to the same
 * place in the remembered language, else the browser's, else Dari.
 *
 * Nothing about who is signed in is decided here: the session lives in the
 * browser, and the database checks every call.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first] = pathname.split('/');
  if (isLocale(first)) return;

  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(remembered) ? remembered : negotiateLocale(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    // Pages only: not Next's internals, metadata routes, the service worker,
    // or any file (a dot in the path).
    '/((?!_next|api|manifest.webmanifest|sw.js|icon|apple-icon|.*\\..*).*)',
  ],
};
