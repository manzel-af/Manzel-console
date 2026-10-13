'use client';

/**
 * Choose exactly who a notification goes to (the app's admin/push-pick.tsx):
 * the same search and presence filters as People, with a tick beside each
 * person. The choice is kept outside the page (lib/api/people), so closing
 * this keeps it, and so does a reload.
 */

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge, EmptyState, SkeletonRows } from '@/components/ui/feedback';
import { ChipGroup, SearchInput } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { PresenceDot } from '@/components/ui/presence-dot';
import { useAdminUsers } from '@/lib/api/admin';
import {
  PRESENCE_FILTERS, clearPicked, setPicked, togglePicked, useLastSeen, usePickedPeople, usePresenceQuery,
  type PresenceFilter,
} from '@/lib/api/people';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';

const SEARCH_PAUSE_MS = 350;

export function PeoplePicker({ open, onClose }: { open: boolean; onClose(): void }) {
  const t = useT();
  const fmt = useFormat();
  const picked = usePickedPeople();
  const lastSeen = useLastSeen();
  const presenceQuery = usePresenceQuery();

  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [presence, setPresence] = useState<PresenceFilter>('any');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  const users = useAdminUsers(search, presenceQuery(presence));
  const rows = users.data ?? [];
  const chosen = new Set(picked.map((person) => person.id));

  const addAllShown = () => {
    const merged = [...picked];
    for (const user of rows) {
      if (!chosen.has(user.profile_id)) merged.push({ id: user.profile_id, name: user.full_name });
    }
    setPicked(merged);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('admin.push.choosePeople')}
      description={t('admin.push.chosen', { n: fmt.number(picked.length) })}
      size="lg"
      footer={(
        <>
          <Button variant="ghost" label={t('admin.push.clearChosen')} disabled={picked.length === 0} onClick={clearPicked} />
          <Button icon="check" label={t('admin.push.done', { n: fmt.number(picked.length) })} onClick={onClose} />
        </>
      )}
    >
      <div className="flex flex-col gap-3">
        <SearchInput value={typed} onChange={setTyped} label={t('common.search')} placeholder={t('admin.users.search')} autoFocus />
        <ChipGroup<PresenceFilter>
          label={t('console.list.filters')}
          options={PRESENCE_FILTERS.map((value) => ({ value, label: t(`admin.presence.filters.${value}`) }))}
          value={presence}
          onChange={setPresence}
        />
        <Button variant="secondary" size="sm" icon="check" label={t('admin.push.selectShown')} className="self-start"
          disabled={rows.length === 0} onClick={addAllShown} />

        {users.isLoading ? <SkeletonRows rows={6} /> : rows.length === 0 ? (
          <EmptyState icon="users" title={t('admin.noMatches')} />
        ) : (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line">
            {rows.map((user) => {
              const selected = chosen.has(user.profile_id);
              return (
                <li key={user.profile_id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => togglePicked({ id: user.profile_id, name: user.full_name })}
                    className={cn('flex w-full items-center gap-3 px-4 py-3 text-start transition-colors',
                      selected ? 'bg-primary-soft/50' : 'hover:bg-surface-sunken')}
                  >
                    <span className={cn('grid h-5.5 w-5.5 shrink-0 place-items-center rounded-md',
                      selected ? 'bg-primary text-fg-on-primary' : 'border border-line-strong')}>
                      {selected ? <Icon name="check" size={14} strokeWidth={2.5} /> : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2">
                        <PresenceDot online={user.online} />
                        <span className="truncate font-semibold text-fg">{user.full_name || t('admin.users.noName')}</span>
                      </span>
                      <span className="truncate text-xs text-fg-muted">
                        {user.phone ? <><bdi dir="ltr">{user.phone}</bdi> · </> : null}
                        {lastSeen(user)}
                      </span>
                    </span>
                    {user.devices > 0 ? <Badge icon="bell" label={fmt.number(user.devices)} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
