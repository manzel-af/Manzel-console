'use client';

/**
 * The support desk (V026, the app's admin/support.tsx), as a help desk is laid
 * out on a desk: the conversations on one side, the open one on the other.
 * On a phone it is one or the other.
 *
 * "Waiting" is everything nobody has claimed — the first operator to answer
 * owns it, which keeps two operators from talking over each other. "Mine" is
 * this operator's. "All" includes what colleagues hold, readable but not
 * writable, so a handover is asked for rather than grabbed. New conversations
 * arrive by themselves (polled every half minute, and live while open).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Badge, Callout, EmptyState, SkeletonRows, type BadgeTone } from '@/components/ui/feedback';
import { Segmented } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/surfaces';
import { useSupportDesk, type DeskScope } from '@/lib/api/support';
import { cn } from '@/lib/cn';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n, useT } from '@/lib/i18n/client';
import type { SupportStatus } from '@/lib/supabase/database.types';
import { dotted } from '@/lib/text';

export const SUPPORT_STATUS_TONE: Record<SupportStatus, BadgeTone> = {
  open: 'warning',
  assigned: 'primary',
  resolved: 'success',
  closed: 'neutral',
};

export function SupportFrame({ children }: { children: ReactNode }) {
  const t = useT();
  const { locale } = useI18n();
  const pathname = usePathname();
  const open = pathname.replace(`/${locale}/support`, '').split('/').filter(Boolean)[0] ?? null;

  return (
    <div>
      <PageHeader title={t('admin.support.title')} subtitle={t('admin.support.subtitle')} />
      <div className="grid gap-6 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
        <aside className={cn(open && 'hidden lg:block')}>
          <ThreadList openId={open} />
        </aside>
        <section className={cn(!open && 'hidden lg:block')}>{children}</section>
      </div>
    </div>
  );
}

function ThreadList({ openId }: { openId: string | null }) {
  const t = useT();
  const href = useHref();
  const fmt = useFormat();
  const errorText = useErrorText();
  const [tab, setTab] = useState<DeskScope>('queue');
  const threads = useSupportDesk(tab);
  const rows = threads.data ?? [];

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-24">
      <Segmented<DeskScope>
        size="sm"
        value={tab}
        onChange={setTab}
        label={t('admin.support.title')}
        options={[
          { value: 'queue', label: t('admin.support.tabs.queue'), icon: 'clock' },
          { value: 'mine', label: t('admin.support.tabs.mine'), icon: 'user' },
          { value: 'all', label: t('common.all'), icon: 'chat' },
          { value: 'closed', label: t('admin.support.tabs.closed'), icon: 'check' },
        ]}
      />
      {threads.error ? <Callout tone="danger" title={errorText(threads.error)} /> : null}
      {threads.isPending ? <SkeletonRows rows={5} /> : rows.length === 0 ? (
        <EmptyState icon="chat" title={t('admin.support.empty')} body={t('admin.support.emptyBody')}
          className="rounded-card border border-line bg-surface" />
      ) : (
        <ul className="flex max-h-[calc(100dvh-16rem)] flex-col gap-2 overflow-y-auto pe-1">
          {rows.map((thread) => {
            const active = thread.id === openId;
            return (
              <li key={thread.id}>
                <Link href={href(`/support/${thread.id}`)} aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-card border bg-surface p-3.5 shadow-card transition-colors',
                    active ? 'border-primary ring-2 ring-primary/15' : 'border-line hover:border-line-strong',
                  )}>
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">{thread.subject}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {dotted(thread.person_name, thread.building_name, thread.person_role ? t(`roles.${thread.person_role}`) : null)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={SUPPORT_STATUS_TONE[thread.status]} label={t(`support.status.${thread.status}`)} />
                      {thread.unread > 0 ? <Badge tone="danger" label={fmt.number(thread.unread)} /> : null}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm text-fg-muted">{thread.last_preview || t('support.attachmentOnly')}</span>
                  <span className="text-xs text-fg-subtle">
                    {dotted(
                      fmt.relative(thread.last_message_at),
                      thread.assigned_name
                        ? (thread.mine ? t('admin.support.yours') : t('admin.support.heldBy', { name: thread.assigned_name }))
                        : t('admin.support.unclaimed'),
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
