'use client';

/**
 * The notifications sent from the platform (the app's admin/push.tsx): who
 * each went to, how many phones took it, how many people opened it.
 */

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Badge, Callout, EmptyState, ProgressBar, SkeletonRows, type BadgeTone } from '@/components/ui/feedback';
import { Card, IconTile, PageHeader } from '@/components/ui/surfaces';
import { DataTable, useShowMore, type Column } from '@/components/ui/table';
import { useAdminStats, usePushCampaigns } from '@/lib/api/admin';
import { useAudienceLabel } from '@/lib/api/audience';
import { clearPicked } from '@/lib/api/people';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminPushCampaign } from '@/lib/supabase/database.types';

const STATUS_TONE: Record<AdminPushCampaign['status'], BadgeTone> = {
  sending: 'warning',
  sent: 'success',
  failed: 'danger',
};

export function NotificationsScreen() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const fmt = useFormat();
  const errorText = useErrorText();
  const campaigns = usePushCampaigns();
  const stats = useAdminStats();
  const audienceLabel = useAudienceLabel();
  const rows = campaigns.data ?? [];
  const list = useShowMore(rows, 50);

  // A new message starts with nobody picked: People hands over its own choice.
  const compose = () => {
    clearPicked();
    router.push(href('/notifications/new'));
  };

  const status = (campaign: AdminPushCampaign) => (
    <span className="flex flex-wrap gap-1.5">
      {campaign.status === 'sent' ? null : (
        <Badge tone={STATUS_TONE[campaign.status]} label={t(`admin.push.status.${campaign.status}`)} />
      )}
      {campaign.importance === 'high' ? <Badge tone="accent" label={t('admin.push.importance.high')} /> : null}
      {campaign.is_test ? <Badge icon="phone" label={t('admin.push.wasTest')} /> : null}
    </span>
  );

  const read = (campaign: AdminPushCampaign) => (
    <span className="flex min-w-32 flex-col gap-1">
      <span className="text-xs text-fg-muted">
        {t('admin.push.readCount', { read: fmt.number(campaign.read_count), n: fmt.number(campaign.recipients) })}
      </span>
      <ProgressBar value={campaign.recipients > 0 ? campaign.read_count / campaign.recipients : 0} tone="success" />
    </span>
  );

  const columns: Column<AdminPushCampaign>[] = [
    {
      key: 'title',
      header: t('admin.push.message'),
      sort: (row) => row.title,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-3">
          <IconTile icon={row.is_test ? 'phone' : 'send'} tone={row.importance === 'high' ? 'accent' : 'primary'} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-1 font-semibold">{row.title}</span>
            <span className="line-clamp-1 text-xs text-fg-muted">{audienceLabel(row.audience)}</span>
          </span>
        </span>
      ),
    },
    { key: 'status', header: t('console.list.status'), cell: status, hideBelow: 'lg' },
    { key: 'read', header: t('admin.push.readLabel'), sort: (row) => (row.recipients ? row.read_count / row.recipients : 0), cell: read },
    {
      key: 'by',
      header: t('console.notifications.sentBy'),
      hideBelow: 'xl',
      sort: (row) => row.created_by_name ?? '',
      cell: (row) => <span className="text-fg-muted">{row.created_by_name ?? '—'}</span>,
    },
    {
      key: 'when',
      header: t('console.list.when'),
      align: 'end',
      sort: (row) => Date.parse(row.created_at),
      cell: (row) => (
        <time dateTime={row.created_at} title={fmt.dateTime(row.created_at)} className="whitespace-nowrap text-fg-muted">
          {fmt.relative(row.created_at)}
        </time>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.push.title')}
        subtitle={t('admin.push.subtitle')}
        actions={<Button icon="send" label={t('admin.push.new')} onClick={compose} />}
      />

      <div className="flex flex-col gap-5">
        {stats.data ? (
          <Card className="flex flex-wrap items-center gap-4">
            <IconTile icon="bell" tone="primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg-muted">{t('admin.push.reach')}</p>
              <p className="font-semibold text-fg">
                {t('admin.push.reachBody', {
                  people: fmt.number(stats.data.push_people),
                  devices: fmt.number(stats.data.push_devices),
                })}
              </p>
            </div>
            <Badge tone="success" dot icon="users" label={t('admin.home.onlineNow', { n: fmt.number(stats.data.online_now) })} />
          </Card>
        ) : null}

        {stats.data && stats.data.push_devices === 0 ? (
          <Callout tone="info" title={t('admin.push.noDevices')} body={t('admin.push.noDevicesBody')} />
        ) : null}
        {campaigns.error ? <Callout tone="danger" title={errorText(campaigns.error)} /> : null}

        <DataTable
          rows={list.visible}
          columns={columns}
          rowKey={(row) => row.id}
          rowHref={(row) => href(`/notifications/${row.id}`)}
          caption={t('admin.push.title')}
          loading={campaigns.isLoading ? <SkeletonRows rows={6} /> : undefined}
          empty={(
            <EmptyState icon="send" title={t('admin.push.empty')} body={t('admin.push.emptyBody')}
              action={<Button icon="send" label={t('admin.push.new')} onClick={compose} />} />
          )}
          mobile={(row) => (
            <>
              <IconTile icon={row.is_test ? 'phone' : 'send'} tone={row.importance === 'high' ? 'accent' : 'primary'} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <span className="line-clamp-2 min-w-0 flex-1 font-semibold text-fg">{row.title}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">{fmt.relative(row.created_at)}</span>
                </div>
                <span className="text-xs text-fg-muted">{audienceLabel(row.audience)}</span>
                {read(row)}
                {status(row)}
              </div>
            </>
          )}
        />
        {list.more ? <Button variant="secondary" label={t('console.list.loadMore')} className="self-center" onClick={list.showMore} /> : null}
      </div>
    </div>
  );
}
