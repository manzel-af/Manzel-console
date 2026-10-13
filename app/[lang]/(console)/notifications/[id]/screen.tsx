'use client';

/**
 * One notification and how it went (the app's admin/push-campaign.tsx).
 *
 * Sent, delivered and failed are three different things: Expo accepts a
 * message (sent), Apple or Google then take it (delivered) or refuse it
 * (failed, and a dead device is forgotten). Receipts take a few minutes, so
 * this checks them when it is opened, and on the button.
 *
 * "Read" is the only number that means a person saw it: they opened it in the
 * app. Deleting takes it out of every inbox; a push already on a phone cannot
 * be recalled, and the confirmation says so.
 */

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';

import { ButtonLink, Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState, ProgressBar, StatTile, type BadgeTone } from '@/components/ui/feedback';
import { Segmented } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Card, PageHeader, Section } from '@/components/ui/surfaces';
import { DataTable, useShowMore, type Column } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { checkPushReceipts, deletePushCampaign, refreshAdmin, useAnswerCount, usePushCampaign } from '@/lib/api/admin';
import { useAudienceLabel } from '@/lib/api/audience';
import { asQuestion, contentButtons, contentText, pick } from '@/lib/content';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n } from '@/lib/i18n/client';
import type { AdminPushCampaignDetail, PushStatus } from '@/lib/supabase/database.types';

/** Receipts are not ready at once; Expo suggests waiting about this long. */
const RECEIPTS_AFTER_MS = 2 * 60_000;

type Recipient = AdminPushCampaignDetail['recipients'][number];

const PUSH_TONE: Record<PushStatus, BadgeTone> = {
  pending: 'warning',
  no_device: 'neutral',
  sent: 'primary',
  delivered: 'success',
  failed: 'danger',
  skipped: 'neutral',
};

const FILTERS = ['all', 'read', 'unread', 'failed', 'no_device'] as const;
type Filter = typeof FILTERS[number];

function matches(person: Recipient, filter: Filter): boolean {
  switch (filter) {
    case 'read': return person.read_at !== null;
    case 'unread': return person.read_at === null;
    case 'failed': return person.push_status === 'failed';
    case 'no_device': return person.push_status === 'no_device';
    default: return true;
  }
}

export function CampaignScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, language } = useI18n();
  const fmt = useFormat();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const audienceLabel = useAudienceLabel();
  const detail = usePushCampaign(id);

  const [checking, setChecking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const autoChecked = useRef(false);

  const data = detail.data;
  const campaign = data?.campaign;
  // V036: its question, and how many have answered it.
  const question = asQuestion(campaign?.question);
  const answerCount = useAnswerCount(question ? { campaignId: id } : null);

  const recipients = (data?.recipients ?? []).filter((person) => matches(person, filter));
  const list = useShowMore(recipients, 100);

  const check = async (quiet: boolean) => {
    setChecking(true);
    setError(null);
    try {
      await checkPushReceipts(id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'push'] });
    } catch (caught) {
      if (!quiet) setError(errorText(caught));
    } finally {
      setChecking(false);
    }
  };

  // Once, when a notification old enough to have receipts is opened.
  useEffect(() => {
    if (!campaign || autoChecked.current) return;
    const sentAt = campaign.sent_at ? Date.parse(campaign.sent_at) : null;
    const due = sentAt !== null && Date.now() - sentAt > RECEIPTS_AFTER_MS;
    const recent = campaign.receipts_checked_at
      ? Date.now() - Date.parse(campaign.receipts_checked_at) < 10 * 60_000
      : false;
    if (campaign.push_ok > 0 && due && !recent) {
      autoChecked.current = true;
      // After this render, not during it.
      void Promise.resolve().then(() => check(true));
    }
    // The ref lets this run once per page, so `check` is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign]);

  const remove = async () => {
    setDeleting(true);
    try {
      await deletePushCampaign(id);
      await refreshAdmin(queryClient);
      toast.show(t('admin.push.deleted'));
      router.push(href('/notifications'));
    } catch (caught) {
      setError(errorText(caught));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (detail.isLoading) return <PageSkeleton rows={6} tiles />;
  if (!data || !campaign) {
    return (
      <EmptyState icon="send" title={detail.error ? errorText(detail.error) : t('admin.errors.notFound')}
        action={<ButtonLink href={href('/notifications')} icon="back" label={t('admin.push.title')} />} />
    );
  }

  const readShare = campaign.recipients > 0 ? data.read_count / campaign.recipients : 0;
  // In the console's language: all three were written (V036).
  const { title, body } = contentText(campaign, language);
  const buttons = contentButtons(campaign, language);

  const columns: Column<Recipient>[] = [
    {
      key: 'name',
      header: t('console.list.name'),
      sort: (row) => row.full_name,
      cell: (row) => (
        <span className="flex items-center gap-2.5">
          <Icon name={row.read_at ? 'check' : 'user'} size={16} className={row.read_at ? 'text-success' : 'text-fg-subtle'} />
          <span className="font-semibold">{row.full_name || t('admin.users.noName')}</span>
        </span>
      ),
    },
    {
      key: 'push',
      header: t('admin.push.delivery'),
      sort: (row) => row.push_status,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={PUSH_TONE[row.push_status]} label={t(`admin.push.pushStatus.${row.push_status}`)} />
          {row.push_error ? <span className="text-xs text-danger" dir="ltr">{row.push_error}</span> : null}
        </span>
      ),
    },
    {
      key: 'read',
      header: t('admin.push.readLabel'),
      align: 'end',
      sort: (row) => (row.read_at ? Date.parse(row.read_at) : null),
      cell: (row) => (row.read_at
        ? <time dateTime={row.read_at} title={fmt.dateTime(row.read_at)} className="text-fg-muted">{fmt.relative(row.read_at)}</time>
        : <span className="text-fg-subtle">—</span>),
    },
  ];

  const countOf = (value: Filter) => data.recipients.filter((person) => matches(person, value)).length;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`${audienceLabel(campaign.audience)} · ${fmt.dateTime(campaign.created_at)}`}
        back={href('/notifications')}
        backLabel={t('admin.push.title')}
        actions={(
          <>
            <Button variant="secondary" icon="sync" label={t('admin.push.checkDelivery')} loading={checking}
              onClick={() => void check(false)} />
            <Button variant="soft-danger" icon="trash" label={t('common.delete')} onClick={() => setConfirmDelete(true)} />
          </>
        )}
      />

      <div className="flex flex-col gap-6">
        {campaign.status === 'sending' ? (
          <Callout icon="sync" title={t('admin.push.sending')} body={t('admin.push.sendingBody')} />
        ) : null}
        {campaign.status === 'failed' ? (
          <Callout tone="danger" title={t('admin.push.failed')} body={campaign.error ?? undefined} />
        ) : null}
        {campaign.is_test ? <Callout icon="phone" title={t('admin.push.wasTest')} /> : null}
        {error ? <Callout tone="danger" title={error} /> : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* ---- the message ---- */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {campaign.image_url ? (
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={campaign.image_url} alt="" className="h-14 w-14 object-cover" />
                </span>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-semibold text-fg">{title}</p>
                {body ? <p className="whitespace-pre-line wrap-break-word text-fg-muted">{body}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={campaign.importance === 'high' ? 'accent' : 'neutral'} label={t(`admin.push.importance.${campaign.importance}`)} />
              {buttons.map((button, index) => (
                <a key={`${index}-${button.url}`} href={button.url} target="_blank" rel="noopener noreferrer" title={button.url}>
                  <Badge tone="primary" icon="globe" label={button.label || t('inbox.openLink')} />
                </a>
              ))}
              {campaign.screen ? <Badge tone="primary" icon="arrow" label={t(`inbox.screens.${campaign.screen}`)} /> : null}
              {data.created_by_name ? <Badge icon="user" label={data.created_by_name} /> : null}
            </div>
          </Card>

          {/* ---- its question, and who answered (V036) ---- */}
          {question ? (
            <Card className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-fg-muted">{t('content.question.title')}</p>
              <p className="font-semibold text-fg">{pick(question.prompt, language)}</p>
              {question.kind === 'choice' ? (
                <ul className="flex flex-col gap-1.5">
                  {question.choices.map((choice, index) => (
                    <li key={index} className="flex items-center gap-2 text-fg-muted">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg-muted" />
                      {pick(choice, language)}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-fg-muted">{t('content.question.textHint')}</p>}
              <Link href={href(`/notifications/${campaign.id}/answers`)}
                className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-surface-sunken">
                <Icon name="chat" size={20} className="text-primary" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-fg">{t('content.answers.title')}</span>
                  <span className="text-sm text-fg-muted">
                    {answerCount.data === undefined
                      ? t('content.answers.entry')
                      : t('content.answers.total', { n: fmt.number(answerCount.data) })}
                  </span>
                </span>
                <Icon name="chevron" size={18} className="text-fg-subtle" />
              </Link>
            </Card>
          ) : null}
        </div>

        {/* ---- how it went ---- */}
        <Section title={t('admin.push.delivery')}
          description={campaign.receipts_checked_at
            ? t('admin.push.checkedAt', { when: fmt.relative(campaign.receipts_checked_at) })
            : undefined}>
          <Card className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-fg-muted">{t('admin.push.readLabel')}</span>
              <span className="text-sm font-semibold text-fg">
                {t('admin.push.readCount', { read: fmt.number(data.read_count), n: fmt.number(campaign.recipients) })}
              </span>
            </div>
            <ProgressBar value={readShare} tone="success" />
          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile icon="users" tone="default" label={t('admin.push.recipients')} value={fmt.number(campaign.recipients)} />
            <StatTile icon="bell" tone="default" label={t('admin.push.reachable')} note={t('admin.push.reachableHint')}
              value={fmt.number(campaign.reachable)} />
            <StatTile icon="send" tone="primary" label={t('admin.push.pushed')} note={t('admin.push.pushedHint')}
              value={fmt.number(campaign.push_ok)} />
            <StatTile icon="check" tone="success" label={t('admin.push.delivered')} note={t('admin.push.deliveredHint')}
              value={fmt.number(campaign.push_delivered)} />
            <StatTile icon="alert" tone={campaign.push_failed > 0 ? 'danger' : 'default'} label={t('admin.push.failedCount')}
              value={fmt.number(campaign.push_failed)} />
            <StatTile icon="phone" tone="default" label={t('admin.push.noDevice')} note={t('admin.push.noDeviceHint')}
              value={fmt.number(data.by_status.no_device ?? 0)} />
          </div>
        </Section>

        {/* ---- who ---- */}
        <Section title={t('admin.push.people', { n: fmt.number(data.recipients.length) })}>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            label={t('console.list.filters')}
            options={FILTERS.map((value) => ({
              value,
              label: (
                <>
                  {t(`console.notifications.filters.${value}`)}
                  <span className="text-fg-subtle tabular-nums">{fmt.number(countOf(value))}</span>
                </>
              ),
            }))}
          />
          <DataTable
            rows={list.visible}
            columns={columns}
            rowKey={(row) => row.profile_id}
            rowHref={(row) => href(`/people/${row.profile_id}`)}
            caption={t('admin.push.recipients')}
            empty={<Card><EmptyState icon="users" title={t('admin.noMatches')} /></Card>}
            mobile={(row) => (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Icon name={row.read_at ? 'check' : 'user'} size={16} className={row.read_at ? 'text-success' : 'text-fg-subtle'} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-fg">{row.full_name || t('admin.users.noName')}</span>
                  {row.read_at ? <span className="shrink-0 text-xs text-fg-subtle">{t('admin.push.readAt', { when: fmt.relative(row.read_at) })}</span> : null}
                </div>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={PUSH_TONE[row.push_status]} label={t(`admin.push.pushStatus.${row.push_status}`)} />
                  {row.push_error ? <span className="text-xs text-danger" dir="ltr">{row.push_error}</span> : null}
                </span>
              </div>
            )}
          />
          {list.more ? <Button variant="secondary" label={t('console.list.loadMore')} className="self-center" onClick={list.showMore} /> : null}
        </Section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title={t('admin.push.deleteTitle')}
        body={t('admin.push.deleteBody')}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
