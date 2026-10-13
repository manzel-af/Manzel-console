'use client';

/**
 * One building, or every building, chosen from a searchable list: who sees a
 * banner, which building a log is narrowed to. Searches name and code.
 */

import { useState, type ReactNode } from 'react';

import { Dialog } from '@/components/ui/dialog';
import { SkeletonRows } from '@/components/ui/feedback';
import { SearchInput } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { useAdminBuildings } from '@/lib/api/admin';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

export function BuildingPicker({
  open, onClose, value, onPick, title, everyLabel,
}: {
  open: boolean;
  onClose(): void;
  value: string | null;
  onPick(buildingId: string | null): void;
  title: string;
  /** The choice of no building in particular; absent, a building must be chosen. */
  everyLabel?: string;
}) {
  const t = useT();
  const buildings = useAdminBuildings();
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const options = (buildings.data ?? []).filter((building) =>
    !needle || building.name.toLowerCase().includes(needle) || building.code.toLowerCase().includes(needle));

  const pick = (id: string | null) => {
    onPick(id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={title} size="md">
      <div className="flex flex-col gap-3">
        <SearchInput value={search} onChange={setSearch} label={t('common.search')} placeholder={t('admin.buildings.search')} autoFocus />
        {buildings.isLoading ? <SkeletonRows rows={4} /> : (
          <ul className="flex max-h-[min(26rem,55dvh)] flex-col gap-1.5 overflow-y-auto" role="listbox" aria-label={title}>
            {everyLabel ? (
              <Option selected={value === null} onClick={() => pick(null)} label={everyLabel} />
            ) : null}
            {options.map((building) => (
              <Option key={building.id} selected={value === building.id} onClick={() => pick(building.id)}
                label={building.name} description={<><bdi dir="ltr">{building.code}</bdi> · {building.city}</>} />
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function Option({
  selected, onClick, label, description,
}: { selected: boolean; onClick(): void; label: string; description?: ReactNode }) {
  return (
    <li role="option" aria-selected={selected}>
      <button type="button" onClick={onClick}
        className={cn('flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-colors',
          selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:bg-surface-sunken')}>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-fg">{label}</span>
          {description ? <span className="truncate text-sm text-fg-muted">{description}</span> : null}
        </span>
        {selected ? <Icon name="check" size={18} className="text-primary" /> : null}
      </button>
    </li>
  );
}
