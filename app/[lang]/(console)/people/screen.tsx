'use client';

/**
 * Everyone with an account (the app's admin/users.tsx): searchable by name,
 * phone or email — the server searches, after a pause in typing — and
 * filtered by what they are (operators, suspended, in no building) or by when
 * they were last here (online now, today, not for a day or a week, never, or
 * between two dates). "Online now" refreshes itself every half minute.
 *
 * Select mode turns the list into a way to notify exactly these people.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { Field, SearchInput, Segmented } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { PresenceDot } from '@/components/ui/presence-dot';
import { PageHeader } from '@/components/ui/surfaces';
import { DataTable } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminUsers, type UserFilters } from '@/lib/api/admin';
import {
  PRESENCE_FILTERS, clearPicked, setPicked, togglePicked, useLastSeen, usePickedPeople, usePresenceQuery,
  type PresenceFilter,
} from '@/lib/api/people';
import { cn } from '@/lib/cn';
import { downloadCsv, stamp } from '@/lib/csv';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminUser } from '@/lib/supabase/database.types';
import { dotted } from '@/lib/text';

type Filter = 'all' | 'operators' | 'suspended' | 'noBuilding';

const SEARCH_PAUSE_MS = 350;
const LIMIT = 200;

/** A `YYYY-MM-DD` from a date input, as the start of that day here. */
function dayStart(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

export function PeopleScreen() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const fmt = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const lastSeen = useLastSeen();
  const presenceQuery = usePresenceQuery();
  const picked = usePickedPeople();
  const params = useSearchParams();

  const initialPresence = params.get('presence');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [presence, setPresence] = useState<PresenceFilter>(
    PRESENCE_FILTERS.includes(initialPresence as PresenceFilter) ? initialPresence as PresenceFilter : 'any');
  const [seenAfter, setSeenAfter] = useState('');
  const [seenBefore, setSeenBefore] = useState('');
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(typed.trim()), SEARCH_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [typed]);

  const dateFilters: UserFilters = seenAfter || seenBefore
    ? { seenAfter: dayStart(seenAfter || null), seenBefore: dayStart(seenBefore || null), order: 'seen' }
    : {};
  const users = useAdminUsers(search, { ...presenceQuery(presence), ...dateFilters }, LIMIT);

  const rows = (users.data ?? []).filter((user) => {
    switch (filter) {
      case 'operators': return user.is_operator;
      case 'suspended': return user.suspended;
      case 'noBuilding': return user.buildings === 0;
      default: return true;
    }
  });
  const online = (users.data ?? []).filter((user) => user.online).length;
  const chosen = new Set(picked.map((person) => person.id));

  const exportRows = () => {
    downloadCsv(`manzel-people-${stamp()}`, rows, [
      { header: t('console.list.name'), value: (u) => u.full_name },
      { header: t('console.list.phone'), value: (u) => u.phone ?? '' },
      { header: t('console.list.email'), value: (u) => u.email ?? '' },
      { header: t('console.list.buildings'), value: (u) => u.building_names ?? '' },
      { header: t('console.list.lastSeen'), value: (u) => u.last_seen_at?.slice(0, 16).replace('T', ' ') ?? '' },
      { header: t('console.list.platform'), value: (u) => u.platform ?? '' },
      { header: t('console.list.appVersion'), value: (u) => u.app_version ?? '' },
      { header: t('admin.users.operator'), value: (u) => (u.is_operator ? t('console.list.yes') : '') },
      { header: t('admin.users.suspendedOne'), value: (u) => (u.suspended ? t('console.list.yes') : '') },
      { header: t('console.list.joined'), value: (u) => u.created_at.slice(0, 10) },
    ]);
    toast.show(t('console.list.exported', { n: fmt.number(rows.length) }));
  };

  const avatar = (user: AdminUser) => (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-sunken">
      <Icon name={user.is_operator ? 'shield' : 'user'} size={19}
        className={user.suspended ? 'text-danger' : user.is_operator ? 'text-accent' : 'text-fg-muted'} />
      <span className="absolute -end-0.5 -top-0.5 rounded-full border-2 border-surface">
        <PresenceDot online={user.online} />
      </span>
    </span>
  );

  const badge = (user: AdminUser) => (user.suspended ? <Badge tone="danger" label={t('admin.users.suspendedOne')} />
    : user.is_operator ? <Badge tone="accent" label={t('admin.users.operator')} />
      : user.devices > 0 ? <Badge icon="bell" label={fmt.number(user.devices)} /> : null);

  const checkbox = (user: AdminUser) => (
    <input type="checkbox" checked={chosen.has(user.profile_id)} aria-label={user.full_name}
      onChange={() => togglePicked({ id: user.profile_id, name: user.full_name })}
      onClick={(event) => event.stopPropagation()}
      className="h-4.5 w-4.5 accent-[var(--primary)]" />
  );

  return (
    <div>
      <PageHeader
        title={t('admin.users.title')}
        subtitle={users.data
          ? dotted(t('admin.users.count', { n: fmt.number(users.data.length) }), t('admin.home.onlineNow', { n: fmt.number(online) }))
          : t('admin.users.entry')}
        actions={selecting ? (
          <>
            <Button variant="ghost" label={t('common.cancel')} onClick={() => { setSelecting(false); clearPicked(); }} />
            <Button variant="secondary" label={t('admin.push.selectShown')} disabled={rows.length === 0}
              onClick={() => setPicked(rows.map((user) => ({ id: user.profile_id, name: user.full_name })))} />
            <Button icon="send" label={t('admin.push.notifyChosen', { n: fmt.number(picked.length) })} disabled={picked.length === 0}
              onClick={() => router.push(href('/notifications/new'))} />
          </>
        ) : (
          <>
            <Button variant="secondary" icon="download" label={t('console.list.export')} onClick={exportRows} disabled={rows.length === 0} />
            <Button icon="send" label={t('admin.push.new')} onClick={() => { clearPicked(); setSelecting(true); }} />
          </>
        )}
      />

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput value={typed} onChange={setTyped} placeholder={t('admin.users.search')} label={t('common.search')}
          className="md:max-w-md" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<PresenceFilter>
            size="sm"
            value={presence}
            onChange={(next) => { setPresence(next); setSeenAfter(''); setSeenBefore(''); }}
            label={t('console.list.lastSeen')}
            options={PRESENCE_FILTERS.map((value) => ({ value, label: t(`admin.presence.filters.${value}`) }))}
          />
          <Segmented<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            label={t('console.list.filters')}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'operators', label: t('admin.users.operators'), icon: 'shield' },
              { value: 'suspended', label: t('admin.users.suspended'), icon: 'lock' },
              { value: 'noBuilding', label: t('admin.users.noBuilding') },
            ]}
          />
        </div>
        {/* Between two dates, for anything the chips do not cover. */}
        <details className="group rounded-card border border-line bg-surface px-4 py-3 open:pb-4">
          <summary className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="calendar" size={17} className="text-fg-muted" />
            <span className="flex-1">{t('admin.presence.dateFilter')}</span>
            <span className="text-xs font-normal text-fg-muted">
              {seenAfter || seenBefore
                ? dotted(
                  seenAfter ? t('admin.presence.after', { date: fmt.date(dayStart(seenAfter), 'medium') }) : null,
                  seenBefore ? t('admin.presence.before', { date: fmt.date(dayStart(seenBefore), 'medium') }) : null,
                )
                : t('admin.presence.dateFilterHint')}
            </span>
            <Icon name="chevronDown" size={16} className="text-fg-subtle transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field type="date" dir="ltr" label={t('admin.presence.seenAfter')} value={seenAfter}
              hint={seenAfter ? fmt.date(dayStart(seenAfter), 'long') : undefined}
              onChange={(event) => { setSeenAfter(event.target.value); setPresence('any'); }} />
            <Field type="date" dir="ltr" label={t('admin.presence.seenBefore')} value={seenBefore}
              hint={seenBefore ? fmt.date(dayStart(seenBefore), 'long') : undefined}
              onChange={(event) => { setSeenBefore(event.target.value); setPresence('any'); }} />
          </div>
        </details>
      </div>

      {users.error ? <Callout tone="danger" title={errorText(users.error)} className="mb-4" /> : null}

      <DataTable
        rows={rows}
        rowKey={(user) => user.profile_id}
        rowHref={selecting ? undefined : (user) => href(`/people/${user.profile_id}`)}
        onRowClick={selecting ? (user) => togglePicked({ id: user.profile_id, name: user.full_name }) : undefined}
        loading={users.isPending ? <PageSkeleton rows={8} /> : undefined}
        empty={<EmptyState icon="users" title={t('admin.noMatches')} />}
        caption={t('admin.users.title')}
        columns={[
          ...(selecting ? [{ key: 'pick', header: <span className="sr-only">✓</span>, cell: checkbox, className: 'w-10' }] : []),
          {
            key: 'name',
            header: t('console.list.name'),
            sort: (user: AdminUser) => user.full_name,
            cell: (user: AdminUser) => (
              <div className="flex items-center gap-3">
                {avatar(user)}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.full_name || t('admin.users.noName')}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {user.phone ? <bdi dir="ltr">{user.phone}</bdi> : user.email ? <bdi dir="ltr">{user.email}</bdi> : '—'}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'buildings', header: t('console.list.buildings'), sort: (user: AdminUser) => user.buildings,
            cell: (user: AdminUser) => (
              <span className={cn('line-clamp-1', !user.building_names && 'text-fg-subtle')}>
                {user.building_names ?? t('admin.users.noBuilding')}
              </span>
            ),
            hideBelow: 'lg',
          },
          {
            key: 'seen', header: t('console.list.lastSeen'),
            sort: (user: AdminUser) => (user.online ? Number.MAX_SAFE_INTEGER : user.last_seen_at ? Date.parse(user.last_seen_at) : 0),
            cell: (user: AdminUser) => (
              <span className="inline-flex items-center gap-2 text-fg-muted">
                <PresenceDot online={user.online} />
                {lastSeen(user)}
              </span>
            ),
          },
          {
            key: 'app', header: t('console.list.appVersion'), sort: (user: AdminUser) => user.app_version ?? '',
            cell: (user: AdminUser) => (user.app_version
              ? <span className="text-fg-muted"><bdi dir="ltr">v{user.app_version}</bdi>{user.platform ? ` · ${t(`admin.presence.platform.${user.platform}`)}` : ''}</span>
              : <span className="text-fg-subtle">—</span>),
            hideBelow: 'xl',
          },
          { key: 'badge', header: <span className="sr-only">{t('console.list.status')}</span>, align: 'end', cell: (user: AdminUser) => badge(user) },
        ]}
        mobile={(user) => (
          <>
            {selecting ? <span className="pt-2.5">{checkbox(user)}</span> : avatar(user)}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{user.full_name || t('admin.users.noName')}</p>
              <p className="truncate text-sm text-fg-muted">
                {dotted(lastSeen(user), user.phone, user.building_names ?? t('admin.users.noBuilding'))}
              </p>
            </div>
            {badge(user)}
          </>
        )}
      />
      {(users.data?.length ?? 0) >= LIMIT ? (
        <Callout tone="info" className="mt-4" title={t('admin.users.refine', { n: fmt.number(LIMIT) })} />
      ) : null}
    </div>
  );
}
