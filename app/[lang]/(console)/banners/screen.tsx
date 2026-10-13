'use client';

/**
 * The platform's banners (the app's admin/banners.tsx): what is live now,
 * what is scheduled, what is switched off or has ended. Each shows exactly as
 * people see it, with who it is for and until when.
 */

import Link from 'next/link';
import { useState } from 'react';

import { useTargetLabel } from '@/components/content/apps-target';
import { BannerPreview } from '@/components/content/banner-preview';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Callout, EmptyState, Skeleton, type BadgeTone } from '@/components/ui/feedback';
import { Segmented } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/surfaces';
import { bannerStatus, useAdminBanners, useAdminBuildings, type BannerStatus } from '@/lib/api/admin';
import { cn } from '@/lib/cn';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import { useNow } from '@/lib/use-now';

const STATUS_TONE: Record<BannerStatus, BadgeTone> = {
  live: 'success',
  scheduled: 'primary',
  ended: 'neutral',
  off: 'neutral',
};

const ORDER: Record<BannerStatus, number> = { live: 0, scheduled: 1, off: 2, ended: 3 };
const FILTERS = ['all', 'live', 'scheduled', 'off', 'ended'] as const;
type Filter = typeof FILTERS[number];

export function BannersScreen() {
  const t = useT();
  const href = useHref();
  const fmt = useFormat();
  const now = useNow(30_000);
  const errorText = useErrorText();
  const banners = useAdminBanners();
  const buildings = useAdminBuildings();
  const [filter, setFilter] = useState<Filter>('all');
  const targetLabel = useTargetLabel();

  const buildingName = (id: string | null) =>
    id ? buildings.data?.find((building) => building.id === id)?.name ?? '…' : t('admin.banner.everyBuilding');

  const sorted = [...(banners.data ?? [])].sort((a, b) =>
    ORDER[bannerStatus(a, now)] - ORDER[bannerStatus(b, now)] || b.priority - a.priority);
  const counts = sorted.reduce<Record<Filter, number>>((tally, banner) => {
    tally[bannerStatus(banner, now)] += 1;
    tally.all += 1;
    return tally;
  }, { all: 0, live: 0, scheduled: 0, off: 0, ended: 0 });
  const rows = filter === 'all' ? sorted : sorted.filter((banner) => bannerStatus(banner, now) === filter);

  return (
    <div>
      <PageHeader
        title={t('admin.banners.title')}
        subtitle={t('admin.banners.subtitle')}
        actions={<ButtonLink href={href('/banners/new')} variant="primary" icon="plus" label={t('admin.banners.new')} />}
      />

      {banners.error ? <Callout tone="danger" title={errorText(banners.error)} className="mb-5" /> : null}

      {counts.all > 0 ? (
        <Segmented<Filter>
          className="mb-5"
          value={filter}
          onChange={setFilter}
          label={t('console.list.status')}
          options={FILTERS.map((value) => ({
            value,
            label: (
              <>
                {value === 'all' ? t('common.all') : t(`admin.banners.status.${value}`)}
                <span className="text-fg-subtle tabular-nums">{fmt.number(counts[value])}</span>
              </>
            ),
          }))}
        />
      ) : null}

      {banners.isLoading ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-40 rounded-card" />)}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon="megaphone" title={t('admin.banners.empty')} body={t('admin.banners.emptyBody')}
          action={<ButtonLink href={href('/banners/new')} variant="primary" icon="plus" label={t('admin.banners.new')} />} />
      ) : rows.length === 0 ? (
        <EmptyState icon="filter" title={t('admin.noMatches')} />
      ) : (
        <ul className="grid gap-5 xl:grid-cols-2">
          {rows.map((banner) => {
            const status = bannerStatus(banner, now);
            const quiet = status === 'off' || status === 'ended';
            return (
              <li key={banner.id} className="animate-rise">
                <Link
                  href={href(`/banners/${banner.id}`)}
                  className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-3 shadow-card transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-pop"
                >
                  <div className={cn('transition-opacity', quiet && 'opacity-60 group-hover:opacity-90')}>
                    <BannerPreview banner={banner} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 px-1 pb-1">
                    <Badge tone={STATUS_TONE[status]} dot={status === 'live'} label={t(`admin.banners.status.${status}`)} />
                    <Badge icon="users" label={t(`admin.banner.audience.${banner.audience}`)} />
                    <Badge icon="building" label={buildingName(banner.building_id)} className="max-w-56" />
                    {banner.apps ? <Badge tone="accent" icon="smartphone" label={targetLabel(banner.apps)} className="max-w-72" /> : null}
                    <span className="min-w-0 flex-1 truncate text-end text-xs text-fg-muted">
                      {status === 'scheduled'
                        ? t('admin.banners.from', { date: fmt.date(banner.starts_at, 'medium') })
                        : banner.ends_at
                          ? t('admin.banners.until', { date: fmt.date(banner.ends_at, 'medium') })
                          : t('admin.banners.noEnd')}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
