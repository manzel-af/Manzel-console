'use client';

/**
 * The editor for what people read in their own language (V036, the app's
 * components/admin/content-editor.tsx): a banner or a notification, written
 * in Dari, Pashto and English, with link buttons and a question.
 *
 * One language at a time. The tabs say which, and mark the languages that
 * still miss something; every field below them is that language's — the
 * title, the text, each button's words, the question and its choices — and
 * is typed in that language's direction and font, so Dari and Pashto run
 * right to left even inside the English console. What is the same in every
 * language — a button's link, how many choices — shows in every tab.
 */

import { useState, type ComponentPropsWithoutRef } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Segmented, TextArea } from '@/components/ui/form';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  CONTENT_LANGUAGES, CONTENT_LIMITS, emptyLabel, isHttpsUrl,
  type ContentButton, type ContentLabel, type ContentLanguage, type ContentQuestion, type TextDraft,
} from '@/lib/content';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/format/use-format';
import { useI18n, useT } from '@/lib/i18n/client';

export const isRtl = (lang: ContentLanguage) => lang !== 'en';

/** A saved row's buttons, for editing; a pre-V036 single link becomes the first, in Dari. */
export function editableButtons(row: {
  buttons?: ContentButton[] | null;
  link_url: string | null;
  link_label: string | null;
}): ContentButton[] {
  if (row.buttons && row.buttons.length > 0) {
    return row.buttons.map((button) => ({ url: button.url, label: { ...button.label } }));
  }
  if (row.link_url) return [{ url: row.link_url, label: { ...emptyLabel(), 'fa-AF': row.link_label ?? '' } }];
  return [];
}

// ---- languages ---------------------------------------------------------------

/** Dari | Pashto | English: a dot on a language still missing something, a tick on a finished one. */
export function LanguageTabs({
  value, onChange, missing, className,
}: {
  value: ContentLanguage;
  onChange(next: ContentLanguage): void;
  missing: ReadonlySet<ContentLanguage>;
  className?: string;
}) {
  const t = useT();
  return (
    <div role="tablist" className={cn('grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-sunken p-1', className)}>
      {CONTENT_LANGUAGES.map((lang) => {
        const selected = lang === value;
        const done = !missing.has(lang);
        const name = t(`content.languages.${lang}`);
        return (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={done ? t('content.tabDone', { language: name }) : t('content.tabMissing', { language: name })}
            onClick={() => onChange(lang)}
            className={cn(
              'flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-colors',
              selected ? 'bg-surface text-primary shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            {done ? <Icon name="check" size={14} className="text-success" /> : <span className="h-2 w-2 rounded-full bg-warning" />}
            <span lang={lang} className="truncate">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * A field for one language's words: typed in that language's direction and
 * script. The label stays in the console's language, where it is read.
 */
export function LanguageField({
  lang, ...rest
}: { lang: ContentLanguage } & Omit<ComponentPropsWithoutRef<typeof Field>, 'dir' | 'lang'>) {
  return <Field dir={isRtl(lang) ? 'rtl' : 'ltr'} lang={lang} {...rest} />;
}

/** LanguageField's longer sibling, for a body of text. */
export function LanguageArea({
  lang, ...rest
}: { lang: ContentLanguage } & Omit<ComponentPropsWithoutRef<typeof TextArea>, 'dir' | 'lang'>) {
  return <TextArea dir={isRtl(lang) ? 'rtl' : 'ltr'} lang={lang} {...rest} />;
}

// ---- the title and the text ----------------------------------------------------

export function ContentTexts({
  kind, lang, texts, onChange,
}: {
  kind: 'banner' | 'push';
  lang: ContentLanguage;
  texts: TextDraft;
  onChange(next: TextDraft): void;
}) {
  const t = useT();
  const fmt = useFormat();
  const { wordsIn } = useI18n();
  const words = wordsIn(lang);
  const entry = texts[lang];
  const titleMax = kind === 'banner' ? CONTENT_LIMITS.bannerTitle : CONTENT_LIMITS.pushTitle;

  const set = (patch: Partial<TextDraft[ContentLanguage]>) => onChange({ ...texts, [lang]: { ...entry, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <LanguageField lang={lang} label={t('content.title')} required value={entry.title} maxLength={titleMax}
        placeholder={words('content.placeholder.title')} onChange={(event) => set({ title: event.target.value })}
        counter={`${fmt.number(entry.title.length)}/${fmt.number(titleMax)}`} />
      <LanguageArea lang={lang} rows={kind === 'banner' ? 3 : 4} label={t('content.body')} required={kind === 'push'}
        value={entry.body} maxLength={CONTENT_LIMITS.body} placeholder={words('content.placeholder.body')}
        onChange={(event) => set({ body: event.target.value })}
        hint={kind === 'banner' ? t('content.bodyOptional') : t('admin.push.bodyHint', { n: fmt.number(240) })}
        counter={`${fmt.number(entry.body.length)}/${fmt.number(CONTENT_LIMITS.body)}`} />
    </div>
  );
}

// ---- buttons ---------------------------------------------------------------

function RowAction({
  icon, label, onClick, disabled = false, danger = false, rotate,
}: { icon: IconName; label: string; onClick(): void; disabled?: boolean; danger?: boolean; rotate?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className={cn('grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:opacity-35',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-fg-muted hover:bg-surface-sunken hover:text-fg')}>
      <Icon name={icon} size={16} className={rotate ? 'rotate-180' : undefined} />
    </button>
  );
}

/**
 * The link buttons: each an https link and its words in every language;
 * added, removed and put in order here. Banners have up to four,
 * notifications three — and Android draws three at most, a question's
 * included, which the notification's preview shows.
 */
export function ButtonsEditor({
  kind, lang, buttons, onChange,
}: {
  kind: 'banner' | 'push';
  lang: ContentLanguage;
  buttons: ContentButton[];
  onChange(next: ContentButton[]): void;
}) {
  const t = useT();
  const fmt = useFormat();
  const { wordsIn } = useI18n();
  const words = wordsIn(lang);
  const max = kind === 'banner' ? CONTENT_LIMITS.bannerButtons : CONTENT_LIMITS.pushButtons;

  const update = (index: number, next: ContentButton) => onChange(buttons.map((button, at) => (at === index ? next : button)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...buttons];
    const [moved] = next.splice(index, 1);
    next.splice(index + by, 0, moved);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">{t('content.buttons.hint', { n: fmt.number(max) })}</p>
      {buttons.map((button, index) => {
        const url = button.url.trim();
        return (
          <div key={index} className="flex flex-col gap-3 rounded-card border border-line bg-surface-sunken/40 p-4">
            <div className="flex items-center gap-1">
              <span className="flex-1 text-sm font-semibold text-fg">{t('content.buttons.button', { n: fmt.number(index + 1) })}</span>
              <RowAction icon="chevronDown" rotate label={t('content.buttons.moveUp')} disabled={index === 0} onClick={() => move(index, -1)} />
              <RowAction icon="chevronDown" label={t('content.buttons.moveDown')} disabled={index === buttons.length - 1} onClick={() => move(index, 1)} />
              <RowAction icon="trash" danger label={t('content.buttons.remove')} onClick={() => onChange(buttons.filter((_, at) => at !== index))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {/* A link reads left to right in every language. */}
              <Field label={t('content.buttons.link')} required type="url" dir="ltr" icon="globe" placeholder="https://"
                value={button.url} maxLength={CONTENT_LIMITS.url} onChange={(event) => update(index, { ...button, url: event.target.value })}
                error={url && !isHttpsUrl(url) ? t('admin.errors.link') : null} />
              <LanguageField lang={lang} label={t('content.buttons.label')} required value={button.label[lang]}
                maxLength={CONTENT_LIMITS.label} placeholder={words('content.placeholder.label')}
                onChange={(event) => update(index, { ...button, label: { ...button.label, [lang]: event.target.value } })} />
            </div>
          </div>
        );
      })}
      {buttons.length < max ? (
        <Button variant="secondary" icon="plus" label={t('content.buttons.add')} className="w-fit"
          onClick={() => onChange([...buttons, { url: '', label: emptyLabel() }])} />
      ) : <p className="text-xs text-fg-subtle">{t('content.buttons.full')}</p>}
    </div>
  );
}

// ---- the question ----------------------------------------------------------

type QuestionKind = 'none' | ContentQuestion['kind'];

const twoChoices = (): ContentLabel[] => [emptyLabel(), emptyLabel()];

/**
 * No question, a typed answer, or two to six choices — the prompt and every
 * choice in all three languages. Switching kind, or to none and back, keeps
 * what was written.
 */
export function QuestionEditor({
  lang, question, onChange,
}: {
  lang: ContentLanguage;
  question: ContentQuestion | null;
  onChange(next: ContentQuestion | null): void;
}) {
  const t = useT();
  const fmt = useFormat();
  const { wordsIn } = useI18n();
  const words = wordsIn(lang);
  const kind: QuestionKind = question ? question.kind : 'none';
  const [kept, setKept] = useState<{ prompt: ContentLabel; choices: ContentLabel[] }>(() => ({
    prompt: question?.prompt ?? emptyLabel(),
    choices: question?.kind === 'choice' ? question.choices : twoChoices(),
  }));

  const choose = (next: QuestionKind) => {
    if (next === kind) return;
    const memory = question
      ? { prompt: question.prompt, choices: question.kind === 'choice' ? question.choices : kept.choices }
      : kept;
    setKept(memory);
    if (next === 'none') onChange(null);
    else if (next === 'text') onChange({ kind: 'text', prompt: memory.prompt });
    else onChange({ kind: 'choice', prompt: memory.prompt, choices: memory.choices.length >= 2 ? memory.choices : twoChoices() });
  };

  const setChoices = (choices: ContentLabel[]) => {
    if (question?.kind === 'choice') onChange({ ...question, choices });
  };

  return (
    <div className="flex flex-col gap-3">
      <Segmented<QuestionKind>
        value={kind}
        onChange={choose}
        label={t('content.question.title')}
        options={[
          { value: 'none', label: t('content.question.kinds.none') },
          { value: 'text', label: t('content.question.kinds.text') },
          { value: 'choice', label: t('content.question.kinds.choice') },
        ]}
      />
      {!question ? (
        <p className="text-sm text-fg-muted">{t('content.question.hint')}</p>
      ) : (
        <>
          <LanguageField lang={lang} label={t('content.question.prompt')} required value={question.prompt[lang]}
            maxLength={CONTENT_LIMITS.prompt} placeholder={words('content.placeholder.prompt')}
            onChange={(event) => onChange({ ...question, prompt: { ...question.prompt, [lang]: event.target.value } })} />
          {question.kind === 'text' ? (
            <p className="text-sm text-fg-muted">{t('content.question.textHint')}</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {question.choices.map((choice, index) => (
                  <div key={index} className="flex items-end gap-1.5">
                    <LanguageField lang={lang} wrapperClassName="flex-1" required value={choice[lang]}
                      label={t('content.question.choice', { n: fmt.number(index + 1) })}
                      maxLength={CONTENT_LIMITS.label} placeholder={words('content.placeholder.choice')}
                      onChange={(event) => setChoices(question.choices.map((other, at) =>
                        (at === index ? { ...other, [lang]: event.target.value } : other)))} />
                    <span className="mb-1.5">
                      <RowAction icon="close" danger label={t('content.question.removeChoice')}
                        disabled={question.choices.length <= CONTENT_LIMITS.minChoices}
                        onClick={() => setChoices(question.choices.filter((_, at) => at !== index))} />
                    </span>
                  </div>
                ))}
              </div>
              {question.choices.length < CONTENT_LIMITS.maxChoices ? (
                <Button variant="secondary" icon="plus" label={t('content.question.addChoice')} className="w-fit"
                  onClick={() => setChoices([...question.choices, emptyLabel()])} />
              ) : null}
              <p className="text-xs text-fg-muted">
                {t('content.question.choicesHint', { min: fmt.number(CONTENT_LIMITS.minChoices), max: fmt.number(CONTENT_LIMITS.maxChoices) })}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
