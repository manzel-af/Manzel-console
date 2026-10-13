/**
 * Words on the server: page titles in generateMetadata. The same lookup and
 * {{placeholder}} rule as the client's t().
 */

import 'server-only';

import { lang } from 'next/root-params';

import { getDictionary } from './dictionaries';
import { isLocale, type Locale } from './languages';

export type ServerT = (key: string, values?: Record<string, string | number>) => string;

export async function getServerT(lang: string): Promise<ServerT> {
  const locale: Locale = isLocale(lang) ? lang : 'fa';
  const dictionary = await getDictionary(locale);
  return (key, values) => {
    const found = key.split('.').reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      dictionary,
    );
    if (typeof found !== 'string') return key;
    return values ? found.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => String(values[name] ?? match)) : found;
  };
}

/**
 * generateMetadata for a page whose title is one key. The language comes from
 * the root parameter, known at build time — never from `params`, which on a
 * page like /people/[id] would make the title wait for the request.
 */
export function titled(key: string) {
  return async () => {
    const t = await getServerT(await lang());
    return { title: t(key) };
  };
}
