'use client';

/**
 * A banner as people see it at the top of their home screen (the app's
 * components/platform-banner.tsx): the list shows each banner this way, and
 * the editor previews it in every language as it is written.
 *
 * Soft tones sit on the page like any card; "brand" and a colour of the
 * operator's own fill it, with words in whichever of white or ink reads on
 * that colour. The text folds to four lines with Show more; the buttons wrap;
 * every word wraps inside the card, a long link included.
 *
 * `language` shows it in a language other than the console's, and the card
 * then runs that language's way: a Dari preview in the English console reads
 * right to left, in Dari's face, with the app's own words (Show more, Send)
 * in Dari too. Nothing on it does anything — it is a picture of the banner.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';
import { asQuestion, CONTENT_LIMITS, contentButtons, contentText, isHttpsUrl, pick, type ContentQuestion } from '@/lib/content';
import { cn } from '@/lib/cn';
import { useI18n, type Translate } from '@/lib/i18n/client';
import type { AppLanguage } from '@/lib/i18n/languages';
import type { PlatformAnnouncementRow, PlatformTone } from '@/lib/supabase/database.types';

/** The icons an operator may put on a banner: the app's list, so the phone has every one. */
export const BANNER_ICONS = [
  'megaphone', 'info', 'alert', 'check', 'bolt', 'water', 'wrench', 'lift', 'generator',
  'broom', 'shield', 'gate', 'key', 'wallet', 'invoice', 'building', 'users', 'calendar',
  'clock', 'phone', 'mail', 'chat', 'globe', 'download', 'sun', 'cloud', 'rain', 'snow',
] as const satisfies readonly IconName[];

export const TONE_ICON: Record<PlatformTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
  brand: 'megaphone',
  neutral: 'megaphone',
};

/** Lines of the banner's text before Show more. */
const BODY_LINES = 4;

export function isHexColor(value: string | null | undefined): value is string {
  return Boolean(value && /^#[0-9A-Fa-f]{6}$/.test(value));
}

/** Whether dark text reads better than white on `hex`. */
function isLight(hex: string): boolean {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((at) => Number.parseInt(value.slice(at, at + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b) > 0.45;
}

/** `hex` moved towards black by `amount` (0–1), for the far end of the fill. */
function darken(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const channel = (at: number) => Math.round(Number.parseInt(value.slice(at, at + 2), 16) * (1 - amount));
  return `#${[0, 2, 4].map((at) => channel(at).toString(16).padStart(2, '0')).join('')}`;
}

/** A colour (hex or a theme variable) at `percent` strength. */
const faded = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

interface QuestionColours {
  text: string;
  muted: string;
  faint: string;
  tile: string;
  line: string;
  /** Send, in the question's colours. */
  accent: string;
  onAccent: string;
}

interface Look {
  /** The card's own background: a soft colour, or a gradient fill. */
  background: string;
  border: string;
  accent: string;
  title: string;
  body: string;
  tile: string;
  question: QuestionColours;
}

/** The app's useLook, in the console's theme variables, so dark mode follows by itself. */
function lookOf(tone: PlatformTone, color: string | null, rtl: boolean): Look {
  const corner = rtl ? 'to bottom left' : 'to bottom right';
  if (isHexColor(color)) {
    const light = isLight(color);
    const ink = light ? '#14110E' : '#FFFFFF';
    return {
      background: `linear-gradient(${corner}, ${color}, ${darken(color, 0.22)})`,
      border: 'transparent',
      accent: ink,
      title: ink,
      body: light ? 'rgba(20,17,14,0.78)' : 'rgba(255,255,255,0.86)',
      tile: light ? 'rgba(20,17,14,0.10)' : 'rgba(255,255,255,0.18)',
      question: {
        text: ink,
        muted: light ? 'rgba(20,17,14,0.72)' : 'rgba(255,255,255,0.8)',
        faint: light ? 'rgba(20,17,14,0.5)' : 'rgba(255,255,255,0.6)',
        tile: light ? 'rgba(20,17,14,0.08)' : 'rgba(255,255,255,0.14)',
        line: light ? 'rgba(20,17,14,0.18)' : 'rgba(255,255,255,0.3)',
        // Send in the ink, lettered in the banner's colour.
        accent: ink,
        onAccent: color,
      },
    };
  }
  if (tone === 'brand') {
    const ink = 'var(--fg-on-primary)';
    return {
      background: `linear-gradient(${corner}, var(--primary), var(--primary-hover))`,
      border: 'transparent',
      accent: ink,
      title: ink,
      body: ink,
      tile: 'rgba(255,255,255,0.18)',
      question: {
        text: ink,
        muted: faded(ink, 80),
        faint: faded(ink, 60),
        tile: 'rgba(255,255,255,0.14)',
        line: faded(ink, 30),
        accent: ink,
        onAccent: 'var(--primary)',
      },
    };
  }
  const soft = {
    info: { bg: 'var(--primary-soft)', accent: 'var(--primary)' },
    success: { bg: 'var(--success-soft)', accent: 'var(--success)' },
    warning: { bg: 'var(--warning-soft)', accent: 'var(--warning)' },
    danger: { bg: 'var(--danger-soft)', accent: 'var(--danger)' },
    neutral: { bg: 'var(--surface)', accent: 'var(--fg-muted)' },
  }[tone];
  const line = tone === 'neutral' ? 'var(--line)' : faded(soft.accent, 20);
  const tile = tone === 'neutral' ? 'var(--surface-sunken)' : 'var(--surface)';
  return {
    background: soft.bg,
    border: line,
    accent: soft.accent,
    title: 'var(--fg)',
    body: 'var(--fg-muted)',
    tile,
    question: {
      text: 'var(--fg)',
      muted: 'var(--fg-muted)',
      faint: 'var(--fg-subtle)',
      tile,
      line,
      // A grey Send would look switched off: the neutral card has it in the brand's blue.
      accent: tone === 'neutral' ? 'var(--primary)' : soft.accent,
      onAccent: 'var(--fg-on-primary)',
    },
  };
}

/** What a banner shows; a banner from before V036 has only the old title, text and link. */
export type BannerContent = Pick<
  PlatformAnnouncementRow,
  'title' | 'body' | 'tone' | 'color' | 'icon' | 'image_url' | 'link_url' | 'link_label' | 'dismissible'
> & Partial<Pick<PlatformAnnouncementRow, 'translations' | 'buttons' | 'question'>>;

export function BannerPreview({
  banner, language: shown, className,
}: {
  banner: BannerContent;
  /** Show it in this language rather than the console's. */
  language?: AppLanguage;
  className?: string;
}) {
  const { language: consoleLanguage, wordsIn } = useI18n();
  const language = shown ?? consoleLanguage;
  const words = wordsIn(language);
  const rtl = language !== 'en';
  const look = lookOf(banner.tone, banner.color, rtl);
  const icon: IconName = banner.icon && (BANNER_ICONS as readonly string[]).includes(banner.icon)
    ? banner.icon as IconName
    : TONE_ICON[banner.tone];

  const { title, body } = contentText(banner, language);
  const buttons = contentButtons(banner, language)
    .filter((button) => isHttpsUrl(button.url))
    .slice(0, CONTENT_LIMITS.bannerButtons);
  const question = asQuestion(banner.question);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={language}
      className={cn('flex flex-col gap-3 overflow-hidden rounded-card p-4 text-start wrap-break-word', className)}
      style={{ background: look.background, border: `1px solid ${look.border}` }}
    >
      <div className="flex items-center gap-3">
        {banner.image_url ? (
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
            {/* Any https picture the operator chose: not one Next's optimiser knows. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.image_url} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
          </span>
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: look.tile, color: look.accent }}>
            <Icon name={icon} size={24} />
          </span>
        )}
        <p className="min-w-0 flex-1 font-semibold leading-snug" style={{ color: look.title }}>{title}</p>
        {banner.dismissible ? (
          <span className="-me-1.5 -mt-1.5 grid h-8 w-8 shrink-0 place-items-center self-start rounded-full"
            style={{ color: look.accent }} title={words('platform.dismiss')}>
            <Icon name="close" size={18} />
          </span>
        ) : null}
      </div>

      {body ? (
        <FoldingText text={body} color={look.body} accent={look.accent} more={words('platform.more')} less={words('platform.less')} />
      ) : null}

      {buttons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {buttons.map((button, index) => (
            <span key={index} title={button.url}
              className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-semibold"
              style={{ background: look.tile, color: look.accent }}>
              <span className="line-clamp-2 min-w-0">{button.label || words('platform.open')}</span>
              <Icon name="arrow" size={14} />
            </span>
          ))}
        </div>
      ) : null}

      {question ? (
        <>
          <span className="h-px" style={{ background: look.question.line }} />
          <QuestionPicture question={question} language={language} words={words} colours={look.question} />
        </>
      ) : null}
    </div>
  );
}

/** Four lines, then Show more — when there is more; measured, not guessed. */
function FoldingText({ text, color, accent, more, less }: { text: string; color: string; accent: string; more: string; less: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || open) return;
    const measure = () => setLong(node.scrollHeight > node.clientHeight + 1);
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text, open]);

  const clamp: CSSProperties = open ? {} : {
    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: BODY_LINES, overflow: 'hidden',
  };
  return (
    <div>
      <p ref={ref} className="text-sm leading-relaxed whitespace-pre-line" style={{ color, ...clamp }}>{text}</p>
      {long ? (
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
          className="mt-1 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>
          {open ? less : more}
          <Icon name="chevronDown" size={14} className={open ? 'rotate-180' : undefined} />
        </button>
      ) : null}
    </div>
  );
}

/** The banner's question as people see it before answering: everything shows, nothing answers. */
function QuestionPicture({
  question, language, words, colours,
}: { question: ContentQuestion; language: AppLanguage; words: Translate; colours: QuestionColours }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: colours.muted }}>
          <Icon name="chat" size={15} />
          {words('question.title')}
        </span>
        <p className="font-semibold" style={{ color: colours.text }}>{pick(question.prompt, language)}</p>
      </div>
      {question.kind === 'choice' ? (
        <div className="flex flex-col gap-2" role="radiogroup" aria-disabled>
          {question.choices.map((choice, index) => (
            <span key={index} className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5"
              style={{ background: colours.tile, border: `1px solid ${colours.line}`, color: colours.text }}>
              <span className="h-5 w-5 shrink-0 rounded-full" style={{ border: `2px solid ${colours.muted}` }} />
              <span className="min-w-0 flex-1 font-medium">{pick(choice, language)}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <span className="min-h-22 rounded-[14px] px-3.5 py-3 text-[15px]"
            style={{ background: colours.tile, border: `1px solid ${colours.line}`, color: colours.faint }}>
            {words('question.placeholder')}
          </span>
          <span className="inline-flex h-10 items-center gap-1.5 self-end rounded-pill px-4 text-sm font-semibold opacity-50"
            style={{ background: colours.accent, color: colours.onAccent }}>
            <Icon name="send" size={16} />
            {words('question.send')}
          </span>
        </div>
      )}
    </div>
  );
}
