'use client';

/**
 * The activity log (the app's admin/audit.tsx): who did what, where, and
 * when, newest first, across the platform or for one building
 * (`?building=<id>`, from a building's page). The log is append-only on the
 * server; this reads it fifty entries at a time, and searches it there.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BuildingPicker } from '@/components/building-picker';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Dialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState, SkeletonRows } from '@/components/ui/feedback';
import { ChipGroup, SearchInput } from '@/components/ui/form';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconTile, PageHeader, type Tone } from '@/components/ui/surfaces';
import { DataTable, type Column } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminAudit, useAdminBuildings, type AuditFilters } from '@/lib/api/admin';
import { downloadCsv, stamp } from '@/lib/csv';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import type { AdminAuditEntry } from '@/lib/supabase/database.types';

/** The areas the chips offer, in the order an operator looks for them. */
const AREAS = ['money', 'people', 'notices', 'buildings', 'operator', 'push'] as const;
type Area = typeof AREAS[number];

/** A chip covers several action prefixes: "money" is invoices and payments. */
const AREA_ACTIONS: Record<Area, string[]> = {
  money: ['invoice', 'invoices', 'payment'],
  people: ['membership', 'join', 'account'],
  notices: ['announcement'],
  buildings: ['building', 'building_request'],
  operator: ['operator'],
  push: ['push'],
};

/** A `YYYY-MM-DD` as the start of that day here; `toEnd` for the day after. */
function dayEdge(date: string | null, toEnd = false): string | null {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day + (toEnd ? 1 : 0), 0, 0, 0, 0).toISOString();
}

const SEARCH_PAUSE_MS = 350;

/** Actions with a sentence of their own; anything else shows its code. */
const KNOWN = new Set([
  'invoice.created', 'invoice.voided', 'invoice.reissued', 'invoice.published', 'invoice.corrected',
  'invoices.generated', 'invoices.recalculated', 'payment.created', 'payment.updated', 'payment.reversed',
  'announcement.publish', 'announcement.end', 'announcement.resume', 'announcement.delete',
  'announcement.edit', 'announcement.draft',
  'chat.removed', 'chat.reported', 'chat.report_resolved', 'operator.review_access', 'account.review_sign_in',
  'operator.review_place', 'operator.review_place_removed', 'operator.review_account',
  'membership.added', 'membership.updated', 'membership.ended', 'membership.left',
  'building.approved', 'building.onboarded', 'building_request.rejected',
  'operator.building_updated', 'operator.building_suspended', 'operator.building_reactivated',
  'operator.building_deleted', 'operator.entered', 'operator.invite_revoked', 'operator.membership_ended',
  'operator.user_updated', 'operator.granted', 'operator.revoked',
  'account.suspended', 'account.unsuspended', 'account.deleted',
  'join.requested', 'join.approved', 'join.rejected', 'join.qr_rotated',
  'push.sent', 'push.tested', 'push.deleted',
]);

function lookOf(action: string): { icon: IconName; tone: Tone } {
  const [area, verb = ''] = action.split('.');
  const bad = /void|delete|revok|reject|reversed|suspended|ended|left/.test(verb);
  const icon = ({
    invoice: 'invoice', invoices: 'invoice', payment: 'receipt', announcement: 'megaphone',
    membership: 'users', building: 'building', building_request: 'building', operator: 'shield', account: 'user',
    join: 'gate', push: 'send', chat: 'chat',
  } as Record<string, IconName>)[area] ?? 'info';
  return { icon, tone: bad ? 'danger' : area === 'operator' || area === 'account' ? 'accent' : 'primary' };
}

export function AuditScreen() {
  const t = useT();
  const fmt = useFormat();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const errorText = useErrorText();
  const buildings = useAdminBuildings();

  const buildingId = params.get('building');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [area, setArea] = useState<Area | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [open, setOpen] = useState<AdminAuditEntry | null>(null);
  const [pickBuilding, setPickBuilding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const filters: AuditFilters = { search, from: dayEdge(from), to: dayEdge(to, true), areas: area ? AREA_ACTIONS[area] : [] };
  const filtered = Boolean(search || area || from || to);
  const audit = useAdminAudit(buildingId, filters);
  const rows = audit.data?.pages.flat() ?? [];
  const buildingName = buildingId ? buildings.data?.find((building) => building.id === buildingId)?.name ?? '…' : null;

  // The building lives in the address, so a link to one building's log stays one.
  const showBuilding = (id: string | null) => router.replace(id ? `${pathname}?building=${id}` : pathname);

  const label = (action: string) => (KNOWN.has(action) ? t(`admin.audit.actions.${action.replace('.', '_')}`) : action);

  const clear = () => {
    setTyped('');
    setSearch('');
    setArea(null);
    setFrom(null);
    setTo(null);
  };

  const exportCsv = () => {
    downloadCsv(`activity-${stamp()}`, rows, [
      { header: t('console.list.when'), value: (row) => fmt.dateTime(row.occurred_at) },
      { header: t('console.audit.action'), value: (row) => label(row.action) },
      { header: t('console.audit.code'), value: (row) => row.action },
      { header: t('console.audit.who'), value: (row) => row.actor_name ?? t('admin.audit.system') },
      { header: t('console.list.building'), value: (row) => row.building_name },
      { header: t('console.audit.detail'), value: (row) => (row.diff ? JSON.stringify(row.diff) : '') },
    ]);
    toast.show(t('console.list.exported', { n: fmt.number(rows.length) }));
  };

  const columns: Column<AdminAuditEntry>[] = [
    {
      key: 'action',
      header: t('console.audit.action'),
      cell: (row) => {
        const look = lookOf(row.action);
        return (
          <span className="flex min-w-0 items-center gap-3">
            <IconTile icon={look.icon} tone={look.tone} size="sm" />
            <span className="line-clamp-2 font-semibold">{label(row.action)}</span>
          </span>
        );
      },
    },
    { key: 'who', header: t('console.audit.who'), cell: (row) => row.actor_name ?? <span className="text-fg-subtle">{t('admin.audit.system')}</span> },
    ...(buildingId ? [] : [{
      key: 'building',
      header: t('console.list.building'),
      hideBelow: 'lg' as const,
      cell: (row: AdminAuditEntry) => row.building_name ?? <span className="text-fg-subtle">—</span>,
    }]),
    {
      key: 'when',
      header: t('console.list.when'),
      align: 'end',
      cell: (row) => (
        <time dateTime={row.occurred_at} title={fmt.dateTime(row.occurred_at)} className="whitespace-nowrap text-fg-muted">
          {fmt.dateTime(row.occurred_at)}
        </time>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.audit.title')}
        subtitle={buildingName ?? t('admin.audit.everywhere')}
        actions={(
          <>
            <Button variant="secondary" icon="sync" label={t('console.shell.refresh')}
              loading={audit.isRefetching && !audit.isFetchingNextPage} onClick={() => void audit.refetch()} />
            <Button variant="secondary" icon="download" label={t('console.list.export')} disabled={rows.length === 0}
              onClick={exportCsv} />
          </>
        )}
      />

      <div className="flex flex-col gap-4">
        {/* ---- filters ---- */}
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <SearchInput value={typed} onChange={setTyped} label={t('common.search')} placeholder={t('admin.audit.search')} />
            <button type="button" onClick={() => setPickBuilding(true)}
              className="flex h-10 items-center gap-2 rounded-field border border-line bg-surface px-3.5 text-sm font-semibold text-fg shadow-card hover:border-line-strong">
              <Icon name="building" size={17} className="text-fg-muted" />
              <span className="max-w-60 truncate">{buildingName ?? t('admin.audit.everywhere')}</span>
              <Icon name="chevronDown" size={16} className="text-fg-subtle" />
            </button>
          </div>
          <ChipGroup<string>
            label={t('console.list.filters')}
            options={[{ value: 'all', label: t('common.all') }, ...AREAS.map((value) => ({ value, label: t(`admin.audit.areas.${value}`) }))]}
            value={area ?? 'all'}
            onChange={(next) => setArea(next === 'all' ? null : next as Area)}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <DateField label={t('admin.audit.from')} value={from} onChange={setFrom} placeholder={t('admin.audit.dates')} />
            <DateField label={t('admin.audit.to')} value={to} onChange={setTo} placeholder={t('admin.audit.dates')} />
          </div>
          {filtered || buildingId ? (
            <div className="flex flex-wrap gap-2">
              {buildingId ? <Button variant="ghost" size="sm" icon="close" label={t('admin.audit.showAll')} onClick={() => showBuilding(null)} /> : null}
              {filtered ? <Button variant="ghost" size="sm" icon="close" label={t('admin.audit.clear')} onClick={clear} /> : null}
            </div>
          ) : null}
        </div>

        {audit.error ? <Callout tone="danger" title={errorText(audit.error)} /> : null}

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => setOpen(row)}
          caption={t('admin.audit.title')}
          loading={audit.isLoading ? <SkeletonRows rows={8} /> : undefined}
          empty={<EmptyState icon="activity" title={filtered ? t('admin.noMatches') : t('admin.audit.empty')} />}
          mobile={(row) => {
            const look = lookOf(row.action);
            return (
              <>
                <IconTile icon={look.icon} tone={look.tone} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold text-fg">{label(row.action)}</span>
                  <span className="truncate text-xs text-fg-muted">
                    {[row.actor_name ?? t('admin.audit.system'), buildingId ? null : row.building_name, fmt.dateTime(row.occurred_at)]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
              </>
            );
          }}
        />
        {audit.hasNextPage ? (
          <Button variant="secondary" label={t('admin.audit.more')} className="self-center" loading={audit.isFetchingNextPage}
            onClick={() => void audit.fetchNextPage()} />
        ) : null}
      </div>

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={open ? label(open.action) : ''}
        description={open ? fmt.dateTime(open.occurred_at) : undefined} size="lg">
        {open ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge icon="user" label={open.actor_name ?? t('admin.audit.system')} />
              {open.building_name ? <Badge icon="building" label={open.building_name} /> : null}
              <Badge label={<bdi dir="ltr">{open.action}</bdi>} />
            </div>
            {open.diff ? (
              // Data, not prose: always left to right.
              <pre dir="ltr" className="max-h-96 overflow-auto rounded-xl bg-surface-sunken p-3 text-start font-mono text-xs leading-relaxed text-fg">
                {JSON.stringify(open.diff, null, 2)}
              </pre>
            ) : <p className="text-sm text-fg-muted">{t('admin.audit.noDetail')}</p>}
          </div>
        ) : null}
      </Dialog>

      <BuildingPicker
        open={pickBuilding}
        onClose={() => setPickBuilding(false)}
        value={buildingId}
        onPick={showBuilding}
        title={t('console.list.building')}
        everyLabel={t('admin.audit.everywhere')}
      />
    </div>
  );
}
