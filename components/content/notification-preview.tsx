'use client';

/**
 * An operator's notification as an Android phone draws it (V036, the app's
 * components/admin/notification-preview.tsx), so what is seen while writing
 * is what people get.
 *
 * The app draws it itself from a data-only push: the title; the text, with
 * the question under it; the picture — wide under the words, or small beside
 * them when there is a question to read instead; and the buttons, laid out by
 * notificationActions() exactly as admin-push lays them out, three at most. A
 * typed question is an Answer typed in the notification; choices are buttons
 * of their own when they fit beside the links, otherwise one Answer opens the
 * message to choose.
 *
 * One language at a time, the one being written: everyone gets their own.
 */

import { Icon, type IconName } from '@/components/ui/icon';
import { Divider } from '@/components/ui/surfaces';
import {
  linksLeftOff, notificationActions,
  type ContentButton, type ContentLanguage, type ContentQuestion, type NotificationAction,
} from '@/lib/content';
import { useFormat } from '@/lib/format/use-format';
import { useI18n } from '@/lib/i18n/client';
import type { PushImportance } from '@/lib/supabase/database.types';

const clamp = (lines: number) => ({
  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden',
} as const);

export function NotificationPreview({
  lang, title, body, imageUrl, importance, buttons, question,
}: {
  lang: ContentLanguage;
  title: string;
  body: string;
  imageUrl: string | null;
  importance: PushImportance;
  buttons: ContentButton[];
  question: ContentQuestion | null;
}) {
  const { t, wordsIn } = useI18n();
  const fmt = useFormat();
  const words = wordsIn(lang);
  const rtl = lang !== 'en';

  const shownTitle = title.trim() || words('admin.push.previewTitle');
  const shownBody = body.trim() || words('admin.push.previewBody');
  const prompt = question ? question.prompt[lang].trim() || words('content.placeholder.prompt') : '';
  const actions = notificationActions(buttons, question);
  const leftOff = linksLeftOff(buttons, question);

  // Answer and Open are the notification's own words (admin-push's WORDS),
  // in the reader's language like everything else on it.
  const labelOf = (action: NotificationAction): string =>
    action.type === 'answer' || action.type === 'open'
      ? words('content.notification.answer')
      : action.label[lang].trim() || '…';

  const notes: { icon: IconName; text: string }[] = [
    { icon: 'lock', text: importance === 'quiet' ? t('admin.push.previewQuiet') : t('admin.push.previewLock') },
  ];
  if (question?.kind === 'text') notes.push({ icon: 'edit', text: t('admin.push.previewTyped') });
  if (question?.kind === 'choice') {
    notes.push(actions.some((action) => action.type === 'choice')
      ? { icon: 'check', text: t('admin.push.previewChoices') }
      : { icon: 'info', text: t('admin.push.previewChoicesOpen') });
  }
  if (leftOff > 0) notes.push({ icon: 'globe', text: t('admin.push.previewLeftOff', { n: fmt.number(leftOff) }) });
  if (actions.length > 0) notes.push({ icon: 'phone', text: t('admin.push.previewOtherPhones') });

  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface-sunken p-3">
      <div dir={rtl ? 'rtl' : 'ltr'} className="flex flex-col gap-3 rounded-card bg-surface p-3 shadow-card">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-fg-on-primary">
            <Icon name="home" size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
            {/* The phone writes this line itself, in its own language. */}
            <p className="flex items-center gap-1.5 text-xs">
              <span className="text-fg-muted">{t('common.appName')}</span>
              <span className="text-fg-subtle">· {t('admin.push.now')}</span>
            </p>
            <p lang={lang} className="truncate font-semibold text-fg">{shownTitle}</p>
            <p lang={lang} className="text-xs whitespace-pre-line wrap-break-word text-fg-muted" style={clamp(4)}>{shownBody}</p>
            {prompt ? (
              <p lang={lang} className="mt-1.5 text-xs font-semibold wrap-break-word text-fg" style={clamp(3)}>{prompt}</p>
            ) : null}
          </div>
          {imageUrl ? (
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-11 w-11 object-cover" />
            </span>
          ) : null}
        </div>

        {/* Opened out, a picture fills the notification — unless there is a question to read. */}
        {imageUrl && !question ? (
          <span className="block overflow-hidden rounded-xl bg-surface-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
          </span>
        ) : null}

        {actions.length > 0 ? (
          // Under the words, past the app's icon, as Android puts them.
          <div className="flex gap-5 ps-12">
            {actions.map((action, index) => (
              <span key={index} lang={lang} className="min-w-0 truncate text-sm font-semibold text-primary">
                {labelOf(action)}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {notes.map((note) => (
        <p key={note.text} className="flex items-start gap-1.5 px-1 text-xs text-fg-subtle">
          <Icon name={note.icon} size={13} className="mt-0.5" />
          <span className="min-w-0 flex-1">{note.text}</span>
        </p>
      ))}
      <Divider />
      <p className="px-1 text-xs text-fg-subtle">{t('admin.push.previewInbox')}</p>
    </div>
  );
}
