/**
 * The words for one language: the app's (lib/i18n/app, copied by `npm run
 * sync`, same keys as in the app) and the console's own (lib/i18n/console,
 * under `console.`). Loaded on the server and handed to the client provider,
 * so a page never paints raw keys.
 */

import 'server-only';

import type { Locale } from './languages';

export type Dictionary = Record<string, unknown>;

const loaders: Record<Locale, () => Promise<[{ default: Dictionary }, { default: Dictionary }]>> = {
  fa: () => Promise.all([import('./app/fa.json'), import('./console/fa.json')]),
  ps: () => Promise.all([import('./app/ps.json'), import('./console/ps.json')]),
  en: () => Promise.all([import('./app/en.json'), import('./console/en.json')]),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const [app, own] = await loaders[locale]();
  return { ...app.default, ...own.default };
}

/**
 * The few words a banner or notification shows in the language it is being
 * WRITTEN in, whatever the console's: placeholders that say which language to
 * type, and the preview's own words ("Show more", "Answer"). Small sections,
 * for all three languages.
 */
export async function getPreviewWords(): Promise<Record<string, Dictionary>> {
  const entries = await Promise.all((['fa', 'ps', 'en'] as const).map(async (locale) => {
    const all = await getDictionary(locale);
    const admin = (all.admin ?? {}) as Record<string, Record<string, unknown>>;
    return [locale === 'fa' ? 'fa-AF' : locale === 'ps' ? 'ps-AF' : 'en', {
      content: all.content,
      platform: all.platform,
      question: all.question,
      common: all.common,
      admin: {
        push: { previewTitle: admin.push?.previewTitle, previewBody: admin.push?.previewBody },
        banner: { previewTitle: admin.banner?.previewTitle },
      },
    }] as const;
  }));
  return Object.fromEntries(entries);
}
