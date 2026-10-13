'use client';

/**
 * Building registration requests — waiting ones by default, every one on the
 * second tab (the app's admin/requests.tsx). Look-alikes of an existing
 * building or complex are flagged before a request is opened.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { Segmented } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { IconTile, PageHeader } from '@/components/ui/surfaces';
import { DataTable } from '@/components/ui/table';
import { useAdminRequests } from '@/lib/api/admin';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminBuildingRequest, BuildingRequestStatus } from '@/lib/supabase/database.types';
import { dotted, isolate } from '@/lib/text';

type Filter = 'pending' | 'all';

export const REQUEST_STATUS_TONE: Record<BuildingRequestStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export function RequestsScreen() {
  const t = useT();
  const href = useHref();
  const fmt = useFormat();
  const errorText = useErrorText();
  const [filter, setFilter] = useState<Filter>('pending');
  const requests = useAdminRequests(filter);
  const rows = requests.data ?? [];

  const flagged = (request: AdminBuildingRequest) =>
    request.similar_buildings.length > 0 || (request.similar_complexes ?? []).length > 0;

  return (
    <div>
      <PageHeader
        title={t('admin.requests.title')}
        subtitle={t('admin.requests.entry')}
        actions={<Button variant="secondary" icon="sync" label={t('console.shell.refresh')}
          loading={requests.isFetching && !requests.isPending} onClick={() => void requests.refetch()} />}
      />
      <div className="mb-4">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          label={t('console.list.status')}
          options={[
            { value: 'pending', label: t('manage.admin.status.pending'), icon: 'clock' },
            { value: 'all', label: t('common.all'), icon: 'receipt' },
          ]}
        />
      </div>

      {requests.error ? <Callout tone="danger" title={errorText(requests.error)} className="mb-4" /> : null}

      <DataTable
        rows={rows}
        rowKey={(request) => request.id}
        rowHref={(request) => href(`/requests/${request.id}`)}
        loading={requests.isPending ? <PageSkeleton rows={4} /> : undefined}
        empty={<EmptyState icon="check" title={t('manage.admin.noRequests')} body={t('admin.requests.emptyBody')} />}
        caption={t('admin.requests.title')}
        initialSort={{ key: 'when', direction: 'desc' }}
        columns={[
          {
            key: 'building',
            header: t('admin.buildings.title'),
            sort: (request) => request.building_name,
            cell: (request) => (
              <div className="flex items-center gap-3">
                <IconTile icon={flagged(request) ? 'alert' : request.kind === 'complex' ? 'chart' : 'building'}
                  tone={flagged(request) ? 'warning' : 'primary'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{request.building_name}</p>
                  <p className="truncate text-xs text-fg-muted">{dotted(isolate(request.building_code), request.city)}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'size',
            header: t('admin.home.flats'),
            sort: (request) => request.unit_count,
            cell: (request) => (
              <span className="text-fg-muted">
                {dotted(
                  request.kind === 'complex' ? t('complex.admin.kind', { n: fmt.number(request.building_count ?? 0) }) : null,
                  t('manage.admin.flatsCount', { n: fmt.number(request.unit_count) }),
                )}
              </span>
            ),
            hideBelow: 'lg',
          },
          {
            key: 'requester',
            header: t('manage.admin.requester'),
            sort: (request) => request.requester_name,
            cell: (request) => (
              <div className="min-w-0">
                <p className="truncate">{request.requester_name}</p>
                {request.requester_phone ? (
                  <p className="truncate text-xs text-fg-muted"><bdi dir="ltr">{request.requester_phone}</bdi></p>
                ) : <p className="text-xs text-danger">{t('manage.admin.noPhone')}</p>}
              </div>
            ),
          },
          {
            key: 'when',
            header: t('console.list.received'),
            sort: (request) => Date.parse(request.created_at),
            cell: (request) => <span className="text-fg-muted" title={fmt.dateTime(request.created_at)}>{fmt.relative(request.created_at)}</span>,
            hideBelow: 'md',
          },
          {
            key: 'status',
            header: t('console.list.status'),
            sort: (request) => request.status,
            align: 'end',
            cell: (request) => (
              <Badge tone={REQUEST_STATUS_TONE[request.status]} label={t(`manage.admin.status.${request.status}`)} />
            ),
          },
        ]}
        mobile={(request) => (
          <>
            <IconTile icon={flagged(request) ? 'alert' : request.kind === 'complex' ? 'chart' : 'building'}
              tone={flagged(request) ? 'warning' : 'primary'} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{request.building_name}</p>
              <p className="truncate text-sm text-fg-muted">
                {dotted(
                  isolate(request.building_code),
                  request.city,
                  t('manage.admin.flatsCount', { n: fmt.number(request.unit_count) }),
                  fmt.relative(request.created_at),
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge tone={REQUEST_STATUS_TONE[request.status]} label={t(`manage.admin.status.${request.status}`)} />
              <Icon name="chevron" size={16} className="text-fg-subtle" />
            </div>
          </>
        )}
      />
    </div>
  );
}
