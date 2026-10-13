// Copied from the Manzel app (src/features/platform/content.ts) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

/**
 * What the operator writes in all three languages (V036): banners and
 * notifications, their buttons and their question.
 *
 *   Reading:  each person sees their own language (`pick`, `contentText`,
 *             `contentButtons`); something written before V036 has only the
 *             old title, body and link, and still reads as it did.
 *   Writing:  the operator fills Dari, Pashto and English for every piece of
 *             text — the database refuses anything less (V036's checks) —
 *             and `contentProblems` says what is missing, per language, so
 *             the editor can point at it before the database does.
 *   Phones:   `notificationActions` lays out the buttons an Android
 *             notification shows exactly as the server does (admin-push), so
 *             the operator's preview is what people get. Android shows three
 *             at most.
 */

import type { AppLanguage } from '@/lib/i18n/languages';
import type {
  ContentButton, ContentLabel, ContentLanguage, ContentQuestion, ContentTranslations,
} from '@/lib/supabase/database.types';

export type { ContentButton, ContentLabel, ContentLanguage, ContentQuestion, ContentTranslations };

/** The languages, in the order the editor shows them. */
export const CONTENT_LANGUAGES: readonly ContentLanguage[] = ['fa-AF', 'ps-AF', 'en'];

/** The database's limits (V036); it checks them again. */
export const CONTENT_LIMITS = {
  bannerTitle: 120,
  pushTitle: 100,
  body: 1000,
  label: 40,
  prompt: 200,
  url: 500,
  bannerButtons: 4,
  pushButtons: 3,
  minChoices: 2,
  maxChoices: 6,
  answer: 1000,
  /** Android's own limit on a notification's buttons. */
  notificationActions: 3,
} as const;

// ---- reading ---------------------------------------------------------------------

/** The person's language first, then Dari (most people's), English, Pashto. */
function order(language: AppLanguage): ContentLanguage[] {
  return [language, 'fa-AF', 'en', 'ps-AF'];
}

/** A label in `language`, or the nearest language it has; '' when it has none. */
export function pick(label: Partial<ContentLabel> | null | undefined, language: AppLanguage): string {
  if (!label) return '';
  for (const lang of order(language)) {
    const text = label[lang]?.trim();
    if (text) return text;
  }
  return '';
}

/** Anything with the old columns and, from V036, every language. */
interface WithText {
  title: string;
  body: string | null;
  translations?: ContentTranslations | null;
}

/** The title and text in `language`; the old columns for what was written before V036. */
export function contentText(row: WithText, language: AppLanguage): { title: string; body: string | null } {
  const translations = row.translations ?? {};
  for (const lang of order(language)) {
    const entry = translations[lang];
    const title = entry?.title?.trim();
    if (title) return { title, body: entry?.body?.trim() || null };
  }
  return { title: row.title, body: row.body };
}

interface WithButtons {
  buttons?: ContentButton[] | null;
  link_url: string | null;
  link_label: string | null;
}

/**
 * The buttons, labelled in `language`; the one link of something written
 * before V036. A label can be '' only for an old link without one — show the
 * app's own "Open" then.
 */
export function contentButtons(row: WithButtons, language: AppLanguage): { url: string; label: string }[] {
  if (row.buttons && row.buttons.length > 0) {
    return row.buttons.map((button) => ({ url: button.url, label: pick(button.label, language) }));
  }
  if (row.link_url) return [{ url: row.link_url, label: row.link_label?.trim() ?? '' }];
  return [];
}

function isLabel(value: unknown): value is ContentLabel {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return CONTENT_LANGUAGES.every((lang) => typeof record[lang] === 'string');
}

/** The stored question, or null if there is none (or it is not one: the column is jsonb). */
export function asQuestion(value: unknown): ContentQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!isLabel(record.prompt)) return null;
  if (record.kind === 'text') return { kind: 'text', prompt: record.prompt };
  if (record.kind === 'choice' && Array.isArray(record.choices) && record.choices.every(isLabel)) {
    return { kind: 'choice', prompt: record.prompt, choices: record.choices };
  }
  return null;
}

/** The choice at `index` in `language`, for showing an answer. */
export function choiceText(question: ContentQuestion | null, index: number | null, language: AppLanguage): string {
  if (!question || question.kind !== 'choice' || index === null) return '';
  return pick(question.choices[index], language);
}

// ---- an Android notification's buttons -------------------------------------------

export type NotificationAction =
  | { type: 'link'; label: ContentLabel; url: string }
  | { type: 'answer' }
  | { type: 'choice'; label: ContentLabel; choice: number }
  | { type: 'open' };

/**
 * The buttons an Android notification shows, as admin-push lays them out:
 * a typed answer first; the choices if they fit beside the links, else one
 * Answer that opens the message in the app; then the links — three at most.
 */
export function notificationActions(buttons: ContentButton[], question: ContentQuestion | null): NotificationAction[] {
  const max = CONTENT_LIMITS.notificationActions;
  const links: NotificationAction[] = buttons.map((button) => ({ type: 'link', label: button.label, url: button.url }));
  if (!question) return links.slice(0, max);
  if (question.kind === 'text') return [{ type: 'answer' } as NotificationAction, ...links].slice(0, max);
  const choices: NotificationAction[] = question.choices.map((label, choice) => ({ type: 'choice', label, choice }));
  if (choices.length + links.length <= max) return [...choices, ...links];
  return [{ type: 'open' } as NotificationAction, ...links].slice(0, max);
}

/** Links that will not fit on the notification (they are still in the message in the app). */
export function linksLeftOff(buttons: ContentButton[], question: ContentQuestion | null): number {
  const shown = notificationActions(buttons, question).filter((action) => action.type === 'link').length;
  return Math.max(0, buttons.length - shown);
}

// ---- writing ---------------------------------------------------------------------

export function emptyLabel(): ContentLabel {
  return { 'fa-AF': '', 'ps-AF': '', en: '' };
}

/** The editor's working copy of the title and text: every language, possibly empty. */
export type TextDraft = Record<ContentLanguage, { title: string; body: string }>;

export function emptyTexts(): TextDraft {
  return { 'fa-AF': { title: '', body: '' }, 'ps-AF': { title: '', body: '' }, en: { title: '', body: '' } };
}

/** A saved row's texts for editing; the old title and body go in Dari, where they were meant to be read. */
export function textsFromRow(row: WithText): TextDraft {
  const draft = emptyTexts();
  const translations = row.translations ?? {};
  if (Object.keys(translations).length === 0) {
    draft['fa-AF'] = { title: row.title, body: row.body ?? '' };
    return draft;
  }
  for (const lang of CONTENT_LANGUAGES) {
    draft[lang] = { title: translations[lang]?.title ?? '', body: translations[lang]?.body ?? '' };
  }
  return draft;
}

/** The saved form: trimmed, and a text in every language or in none. */
export function translationsOf(draft: TextDraft): ContentTranslations {
  const anyBody = CONTENT_LANGUAGES.some((lang) => draft[lang].body.trim() !== '');
  const out: ContentTranslations = {};
  for (const lang of CONTENT_LANGUAGES) {
    const title = draft[lang].title.trim();
    const body = draft[lang].body.trim();
    out[lang] = anyBody ? { title, body } : { title };
  }
  return out;
}

export function trimLabel(label: ContentLabel): ContentLabel {
  return { 'fa-AF': label['fa-AF'].trim(), 'ps-AF': label['ps-AF'].trim(), en: label.en.trim() };
}

export function isHttpsUrl(url: string): boolean {
  const value = url.trim();
  return value.length <= CONTENT_LIMITS.url && /^https:\/\/\S+$/.test(value);
}

/** Something the operator must still fix, and where: `lang` when it is one language's. */
export type ContentProblem =
  | { code: 'title'; lang: ContentLanguage }
  | { code: 'titleLong'; lang: ContentLanguage }
  | { code: 'body'; lang: ContentLanguage }
  | { code: 'bodyLong'; lang: ContentLanguage }
  | { code: 'buttonLabel'; lang: ContentLanguage; index: number }
  | { code: 'buttonUrl'; index: number }
  | { code: 'tooManyButtons' }
  | { code: 'prompt'; lang: ContentLanguage }
  | { code: 'choice'; lang: ContentLanguage; index: number }
  | { code: 'choiceCount' };

/**
 * Everything that stops this content from saving — the database's own rules
 * (V036): a title in every language; text in every language or in none (in
 * all three for a notification); each button's label in every language and
 * an https link; the question's prompt and each choice in every language,
 * and two to six choices.
 */
export function contentProblems(input: {
  kind: 'banner' | 'push';
  texts: TextDraft;
  buttons: ContentButton[];
  question: ContentQuestion | null;
}): ContentProblem[] {
  const problems: ContentProblem[] = [];
  const titleMax = input.kind === 'banner' ? CONTENT_LIMITS.bannerTitle : CONTENT_LIMITS.pushTitle;
  const anyBody = CONTENT_LANGUAGES.some((lang) => input.texts[lang].body.trim() !== '');
  const bodyRequired = input.kind === 'push' || anyBody;

  for (const lang of CONTENT_LANGUAGES) {
    const title = input.texts[lang].title.trim();
    const body = input.texts[lang].body.trim();
    if (!title) problems.push({ code: 'title', lang });
    else if (title.length > titleMax) problems.push({ code: 'titleLong', lang });
    if (bodyRequired && !body) problems.push({ code: 'body', lang });
    else if (body.length > CONTENT_LIMITS.body) problems.push({ code: 'bodyLong', lang });
  }

  const maxButtons = input.kind === 'banner' ? CONTENT_LIMITS.bannerButtons : CONTENT_LIMITS.pushButtons;
  if (input.buttons.length > maxButtons) problems.push({ code: 'tooManyButtons' });
  input.buttons.forEach((button, index) => {
    if (!isHttpsUrl(button.url)) problems.push({ code: 'buttonUrl', index });
    for (const lang of CONTENT_LANGUAGES) {
      const label = button.label[lang].trim();
      if (!label || label.length > CONTENT_LIMITS.label) problems.push({ code: 'buttonLabel', lang, index });
    }
  });

  const question = input.question;
  if (question) {
    for (const lang of CONTENT_LANGUAGES) {
      const prompt = question.prompt[lang].trim();
      if (!prompt || prompt.length > CONTENT_LIMITS.prompt) problems.push({ code: 'prompt', lang });
    }
    if (question.kind === 'choice') {
      if (question.choices.length < CONTENT_LIMITS.minChoices || question.choices.length > CONTENT_LIMITS.maxChoices) {
        problems.push({ code: 'choiceCount' });
      }
      question.choices.forEach((choice, index) => {
        for (const lang of CONTENT_LANGUAGES) {
          const text = choice[lang].trim();
          if (!text || text.length > CONTENT_LIMITS.label) problems.push({ code: 'choice', lang, index });
        }
      });
    }
  }
  return problems;
}

/** The languages that still have something missing: the editor marks their tabs. */
export function languagesWithProblems(problems: ContentProblem[]): Set<ContentLanguage> {
  const out = new Set<ContentLanguage>();
  for (const problem of problems) if ('lang' in problem) out.add(problem.lang);
  return out;
}

/** The question as saved: trimmed. */
export function questionOf(question: ContentQuestion | null): ContentQuestion | null {
  if (!question) return null;
  if (question.kind === 'text') return { kind: 'text', prompt: trimLabel(question.prompt) };
  return { kind: 'choice', prompt: trimLabel(question.prompt), choices: question.choices.map(trimLabel) };
}

/** The buttons as saved: trimmed. */
export function buttonsOf(buttons: ContentButton[]): ContentButton[] {
  return buttons.map((button) => ({ url: button.url.trim(), label: trimLabel(button.label) }));
}
