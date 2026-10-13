'use client';

/**
 * Which app is on which phone (V037).
 *
 * At a glance: the phones in use in the last 30 days, how many run the
 * newest version of their platform, how many versions are in use, how many
 * cannot get notifications. Per platform: every version in use, its share,
 * and from each one a notification or a banner for exactly those phones —
 * or for every phone that is not up to date. Then every install, filtered
 * and exported: who, which version and build, which OTA update, which phone
 * and OS, push or not, last opened.
 *
 * Apps from before V037 report less: their push token and presence say the
 * version, not the build or the phone. They are listed too, and marked.
 */

import { useDeferredValue, useState } from 'react';

import { VersionLabel, versionText } from '@/components/content/apps-target';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Callout, EmptyState, ProgressBar, SkeletonRows, StatTile } from '@/components/ui/feedback';
import { ChipGroup, SearchInput, Segmented, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { PresenceDot } from '@/components/ui/presence-dot';
import { Card, PageHeader, Section } from '@/components/ui/surfaces';
import { DataTable, useShowMore, type Column } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  compareVersions, latestByPlatform, targetParam, useAppInstalls, useAppVersions, type AppPlatform,
} from '@/lib/api/apps';
import { downloadCsv, stamp } from '@/lib/csv';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n } from '@/lib/i18n/client';
import type { AdminAppInstall, AppTarget } from '@/lib/supabase/database.types';
import { useNow } from '@/lib/use-now';

const DAY = 86_400_000;
const PLATFORMS: AppPlatform[] = ['android', 'ios', 'web'];
type Status = 'all' | 'latest' | 'older' | 'unknown';
type Seen = '7' | '30' | '90' | 'any';

export function AppsScreen() {
  const { t } = useI18n();
  const fmt = useFormat();
  const href = useHref();
  const toast = useToast();
  const now = useNow(60_000);
  const errorText = useErrorText();
  const installs = useAppInstalls();
  const versions = useAppVersions();

  const [platform, setPlatform] = useState<'all' | AppPlatform>('all');
  const [status, setStatus] = useState<Status>('all');
  const [seen, setSeen] = useState<Seen>('30');
  const [version, setVersion] = useState('all');
  const [typed, setTyped] = useState('');
  const search = useDeferredValue(typed.trim().toLowerCase());

  const rows = installs.data ?? [];
  const latest = latestByPlatform(versions.data ?? []);
  const active = rows.filter((row) => now - Date.parse(row.last_seen_at) < 30 * DAY);
  const statusOf = (row: AdminAppInstall): Exclude<Status, 'all'> => {
    if (!row.version_label) return 'unknown';
    const newest = latest[row.platform];
    return newest && compareVersions(row.version_label, newest) >= 0 ? 'latest' : 'older';
  };
  const upToDate = active.filter((row) => statusOf(row) === 'latest').length;
  const labelsInUse = new Set(active.map((row) => `${row.platform}:${row.version_label ?? '?'}`)).size;
  const withoutPush = active.filter((row) => !row.has_push).length;

  const filtered = rows.filter((row) => {
    if (platform !== 'all' && row.platform !== platform) return false;
    if (status !== 'all' && statusOf(row) !== status) return false;
    if (seen !== 'any' && now - Date.parse(row.last_seen_at) > Number(seen) * DAY) return false;
    if (version !== 'all' && row.version_label !== version) return false;
    if (search) {
      const haystack = [row.full_name, row.phone, row.device_model, row.device_brand].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
  const list = useShowMore(filtered, 100);
  const versionOptions = [...new Set(rows
    .filter((row) => platform === 'all' || row.platform === platform)
    .map((row) => row.version_label)
    .filter((label): label is string => Boolean(label)))]
    .sort((a, b) => compareVersions(b, a));

  const notifyHref = (target: AppTarget) => href(`/notifications/new?apps=${targetParam(target)}`);
  const bannerHref = (target: AppTarget) => href(`/banners/new?apps=${targetParam(target)}`);

  const exportCsv = () => {
    downloadCsv(`app-versions-${stamp()}`, filtered, [
      { header: t('console.list.name'), value: (row) => row.full_name },
      { header: t('console.list.phone'), value: (row) => row.phone },
      { header: t('console.list.platform'), value: (row) => t(`console.apps.platforms.${row.platform}`) },
      { header: t('console.list.appVersion'), value: (row) => versionText(row.version_label) },
      { header: t('console.apps.columns.update'), value: (row) => (row.update_created_at ? fmt.dateTime(row.update_created_at) : '') },
      { header: t('console.apps.columns.device'), value: (row) => [row.device_brand, row.device_model].filter(Boolean).join(' ') },
      { header: 'OS', value: (row) => row.os_version },
      { header: t('console.apps.columns.push'), value: (row) => (row.has_push ? t('console.list.yes') : '') },
      { header: t('console.list.lastSeen'), value: (row) => fmt.dateTime(row.last_seen_at) },
    ]);
    toast.show(t('console.list.exported', { n: fmt.number(filtered.length) }));
  };

  const appCell = (row: AdminAppInstall) => {
    const state = statusOf(row);
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Icon name={row.platform === 'web' ? 'globe' : 'smartphone'} size={16} className="text-fg-subtle" />
        <span className="text-sm text-fg-muted">{t(`console.apps.platforms.${row.platform}`)}</span>
        <VersionLabel label={row.version_label} className="text-sm font-semibold text-fg" />
        {state === 'latest' ? <Badge tone="success" label={t('console.apps.latest')} /> : state === 'older' ? <Badge tone="warning" label={t('console.apps.older')} /> : null}
        {row.source !== 'app' ? <Badge label={t('console.apps.legacy')} /> : null}
      </span>
    );
  };

  const deviceCell = (row: AdminAppInstall) => (
    <span className="flex flex-col text-sm">
      <span className="text-fg">{[row.device_brand, row.device_model].filter(Boolean).join(' ') || '—'}</span>
      {row.os_version ? <span className="text-xs text-fg-muted"><bdi dir="ltr">{row.platform === 'ios' ? 'iOS' : row.platform === 'android' ? 'Android' : ''} {row.os_version}</bdi></span> : null}
    </span>
  );

  const columns: Column<AdminAppInstall>[] = [
    {
      key: 'person',
      header: t('console.list.name'),
      sort: (row) => row.full_name ?? '',
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <PresenceDot online={row.online} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{row.full_name || t('admin.users.noName')}</span>
            {row.phone ? <span className="truncate text-xs text-fg-muted"><bdi dir="ltr">{row.phone}</bdi></span> : null}
          </span>
        </span>
      ),
    },
    { key: 'app', header: t('console.apps.columns.app'), sort: (row) => versionSortKey(row), cell: appCell },
    { key: 'device', header: t('console.apps.columns.device'), hideBelow: 'lg', sort: (row) => row.device_model ?? '', cell: deviceCell },
    {
      key: 'update',
      header: t('console.apps.columns.update'),
      hideBelow: 'xl',
      sort: (row) => (row.update_created_at ? Date.parse(row.update_created_at) : 0),
      cell: (row) => (row.source !== 'app' ? <span className="text-fg-subtle">—</span> : row.update_created_at
        ? <span className="text-sm text-fg-muted">{t('console.apps.updateOf', { date: fmt.date(row.update_created_at, 'medium') })}</span>
        : <span className="text-sm text-fg-subtle">{t('console.apps.noUpdate')}</span>),
    },
    {
      key: 'push',
      header: t('console.apps.columns.push'),
      align: 'center',
      sort: (row) => (row.has_push ? 1 : 0),
      cell: (row) => (row.has_push
        ? <Icon name="bell" size={16} className="inline text-success" label={t('console.list.yes')} />
        : <Icon name="minus" size={16} className="inline text-fg-subtle" label="—" />),
    },
    {
      key: 'seen',
      header: t('console.list.lastSeen'),
      align: 'end',
      sort: (row) => Date.parse(row.last_seen_at),
      cell: (row) => <time dateTime={row.last_seen_at} title={fmt.dateTime(row.last_seen_at)} className="whitespace-nowrap text-fg-muted">{fmt.relative(row.last_seen_at)}</time>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('console.nav.apps')}
        subtitle={t('console.apps.subtitle')}
        actions={(
          <>
            <Button variant="secondary" icon="sync" label={t('console.shell.refresh')} loading={installs.isFetching}
              onClick={() => { void installs.refetch(); void versions.refetch(); }} />
            <Button variant="secondary" icon="download" label={t('console.list.export')} disabled={filtered.length === 0} onClick={exportCsv} />
          </>
        )}
      />

      {installs.error ? <Callout tone="danger" title={errorText(installs.error)} className="mb-5" /> : null}

      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon="smartphone" tone="primary" label={t('console.apps.tiles.active', { n: fmt.number(30) })}
            value={installs.data ? fmt.number(active.length) : null} />
          <StatTile icon="check" tone="success" label={t('console.apps.tiles.upToDate')}
            value={installs.data ? (active.length ? t('content.answers.share', { n: fmt.number(Math.round((upToDate / active.length) * 100)) }) : '—') : null}
            note={installs.data ? t('console.apps.phones', { n: fmt.number(upToDate) }) : undefined} />
          <StatTile icon="grid" tone="accent" label={t('console.apps.tiles.versions')} value={installs.data ? fmt.number(labelsInUse) : null} />
          <StatTile icon="bell" tone={withoutPush > 0 ? 'warning' : 'default'} label={t('console.apps.tiles.noPush')}
            value={installs.data ? fmt.number(withoutPush) : null} />
        </div>

        {/* ---- each platform: its versions, and who to tell ---- */}
        {installs.isLoading ? <SkeletonRows rows={4} /> : (
          <div className="grid gap-5 xl:grid-cols-2">
            {PLATFORMS.map((one) => {
              const onPlatform = active.filter((row) => row.platform === one);
              if (onPlatform.length === 0) return null;
              const newest = latest[one];
              const counts = new Map<string, { phones: number; people: Set<string> }>();
              for (const row of onPlatform) {
                const key = row.version_label ?? '';
                const entry = counts.get(key) ?? { phones: 0, people: new Set<string>() };
                entry.phones += 1;
                entry.people.add(row.profile_id);
                counts.set(key, entry);
              }
              const labels = [...counts.keys()].sort((a, b) => compareVersions(b || null, a || null));
              const behind = onPlatform.filter((row) => statusOf(row) !== 'latest').length;
              return (
                <Card key={one} className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="flex-1 text-base font-bold text-fg">{t(`console.apps.platforms.${one}`)}</h2>
                    {newest ? (
                      <Badge tone="success" label={<>{t('console.apps.latest')}: <VersionLabel label={newest} /></>} />
                    ) : null}
                    <Badge label={t('console.apps.phones', { n: fmt.number(onPlatform.length) })} />
                  </div>
                  <ul className="flex flex-col divide-y divide-line">
                    {labels.map((label) => {
                      const entry = counts.get(label)!;
                      const share = entry.phones / onPlatform.length;
                      const target: AppTarget | null = label ? { platforms: [one], only: [label] } : null;
                      return (
                        <li key={label || 'unknown'} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <VersionLabel label={label || null} className="font-semibold text-fg" />
                            {label && label === newest ? <Badge tone="success" label={t('console.apps.latest')} /> : null}
                            <span className="ms-auto text-sm text-fg-muted">
                              {t('console.apps.phones', { n: fmt.number(entry.phones) })} · {t('console.apps.people', { n: fmt.number(entry.people.size) })}
                            </span>
                          </div>
                          <ProgressBar value={share} tone={label && label === newest ? 'success' : 'primary'} />
                          <div className="flex flex-wrap gap-2">
                            {target ? (
                              <>
                                <ButtonLink href={notifyHref(target)} size="sm" variant="ghost" icon="send" label={t('console.apps.notify')} />
                                <ButtonLink href={bannerHref(target)} size="sm" variant="ghost" icon="megaphone" label={t('console.apps.banner')} />
                              </>
                            ) : null}
                            <Button size="sm" variant="ghost" icon="filter" label={t('console.apps.showThem')}
                              onClick={() => { setPlatform(one); setVersion(label || 'all'); setStatus(label ? 'all' : 'unknown'); setSeen('30'); }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {newest && behind > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft/60 p-3">
                      <Icon name="alert" size={18} className="text-warning" />
                      <span className="min-w-0 flex-1 text-sm font-semibold text-fg">{t('console.apps.outdated', { n: fmt.number(behind) })}</span>
                      <ButtonLink href={notifyHref({ platforms: [one], below: newest })} size="sm" icon="send" label={t('console.apps.notifyOutdated')} />
                      <ButtonLink href={bannerHref({ platforms: [one], below: newest })} size="sm" variant="secondary" icon="megaphone" label={t('console.apps.bannerOutdated')} />
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}

        {/* ---- every install ---- */}
        <Section title={t('console.apps.installs')} description={t('console.list.showing', { shown: fmt.number(filtered.length), total: fmt.number(rows.length) })}>
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
            <SearchInput value={typed} onChange={setTyped} label={t('common.search')} placeholder={t('console.apps.search')} />
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <ChipGroup<'all' | AppPlatform>
                label={t('console.list.platform')}
                value={platform}
                onChange={(next) => { setPlatform(next); setVersion('all'); }}
                options={[{ value: 'all', label: t('common.all') }, ...PLATFORMS.map((one) => ({ value: one, label: t(`console.apps.platforms.${one}`) }))]}
              />
              <Segmented<Status>
                label={t('console.list.status')}
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: t('common.all') },
                  { value: 'latest', label: t('console.apps.latest') },
                  { value: 'older', label: t('console.apps.older') },
                  { value: 'unknown', label: t('console.apps.unknownVersion') },
                ]}
              />
              <Segmented<Seen>
                label={t('console.apps.lastOpened')}
                value={seen}
                onChange={setSeen}
                options={[
                  { value: '7', label: t('console.apps.days', { n: fmt.number(7) }) },
                  { value: '30', label: t('console.apps.days', { n: fmt.number(30) }) },
                  { value: '90', label: t('console.apps.days', { n: fmt.number(90) }) },
                  { value: 'any', label: t('console.apps.anyTime') },
                ]}
              />
              <Select aria-label={t('console.list.appVersion')} value={version} onChange={(event) => setVersion(event.target.value)}
                wrapperClassName="min-w-48">
                <option value="all">{t('console.apps.everyVersion')}</option>
                {versionOptions.map((label) => <option key={label} value={label}>{versionText(label)}</option>)}
              </Select>
            </div>
          </div>

          <DataTable
            rows={list.visible}
            columns={columns}
            rowKey={(row) => row.install_id}
            rowHref={(row) => href(`/people/${row.profile_id}`)}
            caption={t('console.apps.installs')}
            loading={installs.isLoading ? <SkeletonRows rows={8} /> : undefined}
            empty={rows.length === 0
              ? <EmptyState icon="smartphone" title={t('console.apps.empty')} body={t('console.apps.emptyBody')} />
              : <EmptyState icon="filter" title={t('console.list.noResults')} body={t('console.list.noResultsBody')} />}
            mobile={(row) => (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <PresenceDot online={row.online} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-fg">{row.full_name || t('admin.users.noName')}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">{fmt.relative(row.last_seen_at)}</span>
                </div>
                {appCell(row)}
                {deviceCell(row)}
              </div>
            )}
          />
          {list.more ? <Button variant="secondary" label={t('console.list.loadMore')} className="self-center" onClick={list.showMore} /> : null}
          <p className="text-xs text-fg-muted">{t('console.apps.howCounted')}</p>
        </Section>
      </div>
    </div>
  );
}

/** Platform first, then the version as the database orders it. */
function versionSortKey(row: AdminAppInstall): string {
  const key = [0, 0, 0, 0];
  const [version = '', build = ''] = (row.version_label ?? '').split('+');
  const parts = version.split('.');
  for (let i = 0; i < 3; i += 1) key[i] = Number(/^[0-9]{1,9}/.exec(parts[i] ?? '')?.[0] ?? 0);
  key[3] = Number(/^[0-9]{1,9}/.exec(build)?.[0] ?? 0);
  return `${row.platform}:${key.map((n) => String(n).padStart(9, '0')).join('.')}`;
}
