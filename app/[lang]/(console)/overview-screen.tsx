'use client';

/**
 * The platform at a glance — the app's control panel home (admin/index.tsx),
 * for a desk: buildings, flats, people, money owed and collected, who is in
 * the app now, what is waiting for an operator, and anything switched on that
 * changes the app for everyone (maintenance, closed registrations).
 */

import { useQueryClient } from '@tanstack/react-query';

import { AlertsPrompt } from '@/components/alerts-prompt';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Callout, ProgressBar, Skeleton, StatTile } from '@/components/ui/feedback';
import { Card, ListRow, PageHeader, RowList, Section } from '@/components/ui/surfaces';
import { refreshAdmin, usePlatformSettings, useReviewAccess, useAdminStats } from '@/lib/api/admin';
import { useChatReports, useIdeaCounts, useSupportCounts } from '@/lib/api/support';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useI18n, useT } from '@/lib/i18n/client';

export function OverviewScreen() {
  const t = useT();
  const { locale } = useI18n();
  const fmt = useFormat();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const stats = useAdminStats();
  const settings = usePlatformSettings();
  const support = useSupportCounts();
  const ideas = useIdeaCounts();
  const reports = useChatReports();
  const review = useReviewAccess();
  const s = stats.data;
  const at = (path: string) => `/${locale}${path}`;

  const currencies = s ? [...new Set([...Object.keys(s.outstanding), ...Object.keys(s.collected_30d)])] : [];

  const attention = [
    { count: s?.requests_pending ?? 0, title: t('admin.requests.title'), subtitle: t('admin.requests.entry'), icon: 'clock' as const, href: at('/requests') },
    { count: support.data?.queue ?? 0, title: t('admin.support.title'), subtitle: t('admin.support.entry'), icon: 'chat' as const, href: at('/support') },
    { count: reports.data?.length ?? 0, title: t('safety.reports.title'), subtitle: t('safety.reports.entry'), icon: 'flag' as const, href: at('/reports') },
    { count: ideas.data?.open ?? 0, title: t('admin.ideas.title'), subtitle: t('admin.ideas.entry'), icon: 'bolt' as const, href: at('/ideas') },
  ];
  const waiting = attention.filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('console.nav.overview')}
        subtitle={t('admin.subtitle')}
        actions={(
          <>
            <Button variant="secondary" icon="sync" label={stats.isFetching ? t('console.shell.refreshing') : t('console.shell.refresh')}
              loading={stats.isFetching} onClick={() => void refreshAdmin(queryClient)} />
            <ButtonLink href={at('/notifications/new')} variant="primary" icon="send" label={t('admin.push.new')} />
          </>
        )}
      />

      {stats.error ? <Callout tone="danger" title={errorText(stats.error)} /> : null}
      <AlertsPrompt />
      {settings.data?.maintenance_enabled ? (
        <Callout tone="warning" icon="wrench" title={t('admin.home.maintenanceOn')} body={t('admin.home.maintenanceOnBody')}
          action={<ButtonLink href={at('/settings')} size="sm" label={t('admin.home.openSettings')} />} />
      ) : null}
      {settings.data && !settings.data.building_requests_open ? (
        <Callout tone="info" icon="lock" title={t('admin.home.requestsClosed')}
          action={<ButtonLink href={at('/settings')} size="sm" label={t('admin.home.openSettings')} />} />
      ) : null}
      {review.data?.enabled ? (
        <Callout tone="warning" icon="key" title={t('reviewAccess.title')} body={t('reviewAccess.entryOn')}
          action={<ButtonLink href={at('/review')} size="sm" label={t('console.list.open')} />} />
      ) : null}

      {/* ---- at a glance --------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon="building" tone="primary" label={t('admin.home.buildings')} href={at('/buildings')}
          value={s ? fmt.number(s.buildings) : null}
          note={s && s.buildings_suspended > 0 ? t('admin.home.suspended', { n: fmt.number(s.buildings_suspended) }) : undefined} />
        <StatTile icon="users" tone="accent" label={t('admin.home.people')} href={at('/people')}
          value={s ? fmt.number(s.people) : null}
          note={s ? t('admin.home.newThisWeek', { n: fmt.number(s.signups_7d) }) : undefined} />
        <StatTile icon="clock" tone={s && s.requests_pending > 0 ? 'warning' : 'success'} label={t('admin.home.waiting')}
          href={at('/requests')} value={s ? fmt.number(s.requests_pending) : null} />
        <StatTile icon="wrench" tone="danger" label={t('admin.home.repairs')} value={s ? fmt.number(s.tickets_open) : null} />
        <StatTile icon="users" tone="success" label={t('admin.home.online')} href={at('/people?presence=online')}
          value={s ? fmt.number(s.online_now) : null}
          note={s ? t('admin.home.activeToday', { n: fmt.number(s.active_24h) }) : undefined} />
        <StatTile icon="bell" tone="primary" label={t('admin.home.reachable')} href={at('/notifications')}
          value={s ? fmt.number(s.push_people) : null}
          note={s ? t('admin.home.devicesCount', { n: fmt.number(s.push_devices) }) : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          {/* Flats: how full the platform's buildings are. */}
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-fg">{t('admin.home.flats')}</h2>
              {s ? (
                <span className="text-sm font-semibold text-fg-muted">
                  {t('admin.home.occupied', { n: fmt.number(s.flats_occupied), total: fmt.number(s.flats) })}
                </span>
              ) : <Skeleton className="h-4 w-24" />}
            </div>
            <ProgressBar value={s && s.flats > 0 ? s.flats_occupied / s.flats : 0} />
            {s ? (
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary" icon="key" label={t('admin.home.managers', { n: fmt.number(s.managers) })} />
                <Badge tone="neutral" icon="home" label={t('admin.home.residents', { n: fmt.number(s.residents) })} />
                <Badge tone="neutral" icon="gate" label={t('admin.home.guards', { n: fmt.number(s.guards) })} />
                <Badge tone="neutral" icon="wallet" label={t('admin.home.accountants', { n: fmt.number(s.accountants) })} />
                <Badge tone="accent" icon="shield" label={t('admin.home.operators', { n: fmt.number(s.operators) })} />
              </div>
            ) : null}
          </Card>

          {/* Money, per currency. */}
          {s && currencies.length > 0 ? (
            <Card bare className="divide-y divide-line">
              {currencies.map((currency) => (
                <div key={currency} className="grid grid-cols-1 gap-4 p-5 min-[28rem]:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-fg-muted">{t('admin.home.outstanding')}</span>
                    <span className={`text-xl font-bold tabular-nums ${(s.outstanding[currency] ?? 0) > 0 ? 'text-danger' : 'text-fg'}`}>
                      {fmt.money(s.outstanding[currency] ?? 0, { currency })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-fg-muted">{t('admin.home.collected30', { n: fmt.number(30) })}</span>
                    <span className="text-xl font-bold text-success tabular-nums">
                      {fmt.money(s.collected_30d[currency] ?? 0, { currency })}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          ) : null}

          {s ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label={t('console.overview.activeWeek')} value={fmt.number(s.active_7d)} />
              <MiniStat label={t('console.overview.bannersLive')} value={fmt.number(s.banners_live)} />
              <MiniStat label={t('console.overview.pushes30')} value={fmt.number(s.pushes_30d)} />
              <MiniStat label={t('console.overview.inBuildings')} value={fmt.number(s.people_in_buildings)} />
            </div>
          ) : null}
        </div>

        {/* What is waiting for an operator. */}
        <Section title={t('console.overview.waitingTitle')}>
          {waiting.length > 0 ? (
            <RowList>
              {waiting.map((item) => (
                <ListRow key={item.href} href={item.href} icon={item.icon} iconTone="warning" title={item.title}
                  subtitle={item.subtitle} trailing={<Badge tone="warning" label={fmt.number(item.count)} />} />
              ))}
            </RowList>
          ) : (
            <Card className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-success-soft text-success">
                <CheckMark />
              </span>
              <p className="text-fg-muted">{t('console.overview.allClear')}</p>
            </Card>
          )}
          <h3 className="mt-2 text-sm font-semibold text-fg-subtle">{t('console.overview.shortcuts')}</h3>
          <RowList>
            <ListRow href={at('/buildings')} icon="building" iconTone="primary" title={t('admin.buildings.title')}
              subtitle={t('admin.buildings.entry')} />
            <ListRow href={at('/people')} icon="users" iconTone="accent" title={t('admin.users.title')}
              subtitle={t('admin.users.entry')} />
            <ListRow href={at('/banners')} icon="megaphone" iconTone="primary" title={t('admin.banners.title')}
              subtitle={s ? t('admin.banners.entry', { n: fmt.number(s.banners_live) }) : undefined} />
            <ListRow href={at('/audit')} icon="activity" title={t('admin.audit.title')} subtitle={t('admin.audit.entry')} />
          </RowList>
        </Section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border border-line bg-surface px-4 py-3">
      <span className="text-lg font-bold text-fg tabular-nums">{value}</span>
      <span className="truncate text-xs text-fg-muted">{label}</span>
    </div>
  );
}

function CheckMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}
