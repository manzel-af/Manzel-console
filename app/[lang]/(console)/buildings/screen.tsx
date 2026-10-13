'use client';

/**
 * Every building on the platform (the app's admin/buildings.tsx): searchable
 * by name, code or city, filtered to the ones that need a look (no manager,
 * suspended), sortable, and exportable for a spreadsheet.
 */

import { useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { SearchInput, Segmented } from '@/components/ui/form';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { IconTile, PageHeader } from '@/components/ui/surfaces';
import { DataTable, useShowMore } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminBuildings } from '@/lib/api/admin';
import { downloadCsv, stamp } from '@/lib/csv';
import { useErrorText } from '@/lib/errors';
import { currencyDecimals } from '@/lib/format/money';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminBuilding } from '@/lib/supabase/database.types';
import { dotted, isolate } from '@/lib/text';

type Filter = 'all' | 'active' | 'suspended' | 'noManager';

export function BuildingsScreen() {
  const t = useT();
  const href = useHref();
  const fmt = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const buildings = useAdminBuildings();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const needle = search.trim().toLowerCase();
  const rows = (buildings.data ?? []).filter((building) => {
    if (filter === 'active' && !building.active) return false;
    if (filter === 'suspended' && building.active) return false;
    if (filter === 'noManager' && building.managers) return false;
    if (!needle) return true;
    return [building.name, building.code, building.city].some((field) => field.toLowerCase().includes(needle));
  });
  const page = useShowMore(rows);

  const tone = (building: AdminBuilding) => (!building.active ? 'danger' : building.managers ? 'primary' : 'warning');

  const exportRows = () => {
    downloadCsv(`manzel-buildings-${stamp()}`, rows, [
      { header: t('console.list.name'), value: (b) => b.name },
      { header: t('console.list.code'), value: (b) => b.code },
      { header: t('console.list.city'), value: (b) => b.city },
      { header: t('console.list.flats'), value: (b) => b.flats },
      { header: t('console.list.people'), value: (b) => b.members },
      { header: t('roles.manager'), value: (b) => b.managers ?? '' },
      { header: t('admin.home.outstanding'), value: (b) => b.outstanding_minor / 10 ** currencyDecimals(b.currency) },
      { header: t('console.list.status'), value: (b) => (b.active ? t('admin.buildings.active') : t('admin.buildings.suspendedOne')) },
      { header: t('console.list.created'), value: (b) => b.created_at.slice(0, 10) },
    ]);
    toast.show(t('console.list.exported', { n: fmt.number(rows.length) }));
  };

  return (
    <div>
      <PageHeader
        title={t('admin.buildings.title')}
        subtitle={buildings.data ? t('admin.buildings.count', { n: fmt.number(buildings.data.length) }) : t('admin.buildings.entry')}
        actions={(
          <>
            <Button variant="secondary" icon="download" label={t('console.list.export')} onClick={exportRows}
              disabled={rows.length === 0} />
            <ButtonLink href={href('/buildings/new')} variant="primary" icon="plus" label={t('manage.admin.newBuilding')} />
          </>
        )}
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput value={search} onChange={(value) => { setSearch(value); page.reset(); }}
          placeholder={t('admin.buildings.search')} label={t('common.search')} className="md:max-w-sm md:flex-1" />
        <Segmented<Filter>
          value={filter}
          onChange={(value) => { setFilter(value); page.reset(); }}
          label={t('console.list.filters')}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'active', label: t('admin.buildings.active') },
            { value: 'suspended', label: t('admin.buildings.suspended') },
            { value: 'noManager', label: t('manage.admin.noManager') },
          ]}
        />
      </div>

      {buildings.error ? <Callout tone="danger" title={errorText(buildings.error)} className="mb-4" /> : null}

      <DataTable
        rows={page.visible}
        rowKey={(building) => building.id}
        rowHref={(building) => href(`/buildings/${building.id}`)}
        loading={buildings.isPending ? <PageSkeleton rows={6} /> : undefined}
        empty={<EmptyState icon="building" title={needle || filter !== 'all' ? t('admin.noMatches') : t('manage.admin.noBuildings')} />}
        caption={t('admin.buildings.title')}
        columns={[
          {
            key: 'name',
            header: t('console.list.building'),
            sort: (building) => building.name,
            cell: (building) => (
              <div className="flex items-center gap-3">
                <IconTile icon="building" tone={tone(building)} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{building.name}</p>
                  <p className="truncate text-xs text-fg-muted">{dotted(isolate(building.code), building.city)}</p>
                </div>
              </div>
            ),
          },
          { key: 'flats', header: t('console.list.flats'), sort: (b) => b.flats, align: 'end',
            cell: (b) => <span className="tabular-nums">{fmt.number(b.flats)}</span>, hideBelow: 'lg' },
          { key: 'people', header: t('console.list.people'), sort: (b) => b.members, align: 'end',
            cell: (b) => <span className="tabular-nums">{fmt.number(b.members)}</span>, hideBelow: 'lg' },
          {
            key: 'managers', header: t('roles.manager'), sort: (b) => b.managers ?? '',
            cell: (b) => b.managers
              ? <span className="line-clamp-1">{b.managers}</span>
              : <Badge tone="warning" label={t('manage.admin.noManager')} />,
          },
          {
            key: 'owed', header: t('admin.home.outstanding'), sort: (b) => b.outstanding_minor, align: 'end', hideBelow: 'xl',
            cell: (b) => (
              <span className={`tabular-nums ${b.outstanding_minor > 0 ? 'text-danger' : 'text-fg-muted'}`}>
                {fmt.money(b.outstanding_minor, { currency: b.currency, hideZeroDecimals: true })}
              </span>
            ),
          },
          {
            key: 'status', header: t('console.list.status'), sort: (b) => (b.active ? 1 : 0), align: 'end',
            cell: (b) => (b.active
              ? <Badge tone="success" dot label={t('admin.buildings.active')} />
              : <Badge tone="danger" label={t('admin.buildings.suspendedOne')} />),
          },
        ]}
        mobile={(building) => (
          <>
            <IconTile icon="building" tone={tone(building)} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{building.name}</p>
              <p className="truncate text-sm text-fg-muted">
                {dotted(isolate(building.code), building.city, t('manage.admin.flatsCount', { n: fmt.number(building.flats) }),
                  building.managers ?? t('manage.admin.noManager'))}
              </p>
            </div>
            {!building.active ? <Badge tone="danger" label={t('admin.buildings.suspendedOne')} /> : null}
          </>
        )}
      />
      {page.more ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" label={t('console.list.loadMore')} onClick={page.showMore} />
        </div>
      ) : null}
    </div>
  );
}
