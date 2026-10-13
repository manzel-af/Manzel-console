'use client';

/**
 * Lists of things: a real table on a desk (sortable columns, the whole row a
 * link), cards on a phone — the same rows, without a sideways scroll.
 */

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { usePrefs } from '@/lib/prefs';

import { Icon } from './icon';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell(row: T): ReactNode;
  /** A value to sort by; the column is sortable when given. */
  sort?(row: T): string | number | null;
  align?: 'start' | 'end' | 'center';
  /** Hidden on narrower desks, to keep the table readable. */
  hideBelow?: 'md' | 'lg' | 'xl';
  className?: string;
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function DataTable<T>({
  rows, columns, rowKey, rowHref, onRowClick, mobile, empty, loading, className, caption, initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey(row: T): string;
  rowHref?(row: T): string;
  onRowClick?(row: T): void;
  /** How a row reads as a card on a phone. */
  mobile(row: T): ReactNode;
  empty?: ReactNode;
  loading?: ReactNode;
  className?: string;
  /** For screen readers: what the table lists. */
  caption?: string;
  initialSort?: { key: string; direction: 'asc' | 'desc' };
}) {
  const { density } = usePrefs();
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sort) return rows;
    const value = column.sort;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.direction === 'asc' ? order : -order;
    });
  }, [rows, columns, sort]);

  if (loading) return <>{loading}</>;
  if (rows.length === 0) return <>{empty}</>;

  const cellY = density === 'compact' ? 'py-2' : 'py-3.5';

  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface shadow-card', className)}>
      {/* A desk: the table. */}
      <table className="hidden w-full border-collapse text-sm md:table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-surface-sunken/60 text-start">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th key={column.key} scope="col"
                  aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(
                    'border-b border-line px-4 py-2.5 text-xs font-semibold text-fg-muted',
                    column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : 'text-start',
                    column.hideBelow && HIDE[column.hideBelow],
                  )}>
                  {column.sort ? (
                    <button type="button"
                      onClick={() => setSort(active
                        ? { key: column.key, direction: sort!.direction === 'asc' ? 'desc' : 'asc' }
                        : { key: column.key, direction: 'asc' })}
                      className="inline-flex items-center gap-1 hover:text-fg">
                      {column.header}
                      <Icon name={active ? 'chevronDown' : 'sort'} size={13}
                        className={cn(active && sort!.direction === 'asc' && 'rotate-180', !active && 'opacity-40')} />
                    </button>
                  ) : column.header}
                </th>
              );
            })}
            {rowHref || onRowClick ? <th aria-hidden className="w-10 border-b border-line" /> : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const href = rowHref?.(row);
            const interactive = Boolean(href || onRowClick);
            return (
              <tr key={rowKey(row)}
                className={cn('group relative border-b border-line last:border-b-0', interactive && 'cursor-pointer hover:bg-surface-sunken/50')}>
                {columns.map((column, index) => (
                  <td key={column.key}
                    className={cn(
                      'px-4 align-middle text-fg', cellY,
                      column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : 'text-start',
                      column.hideBelow && HIDE[column.hideBelow],
                      column.className,
                    )}>
                    {/* The first cell carries the link (or the button), so the row is one stop for the keyboard. */}
                    {index === 0 && href ? (
                      <Link href={href} className="outline-none after:absolute after:inset-0 focus-visible:underline">
                        {column.cell(row)}
                      </Link>
                    ) : index === 0 && onRowClick ? (
                      <button type="button" onClick={() => onRowClick(row)}
                        className="text-start outline-none after:absolute after:inset-0 focus-visible:underline">
                        {column.cell(row)}
                      </button>
                    ) : column.cell(row)}
                  </td>
                ))}
                {interactive ? (
                  <td className={cn('px-2 text-fg-subtle', cellY)}>
                    <Icon name="chevron" size={16} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* A phone: the same rows as cards. */}
      <ul className="divide-y divide-line md:hidden">
        {sorted.map((row) => {
          const href = rowHref?.(row);
          const body = <div className="flex items-start gap-3 px-4 py-3.5">{mobile(row)}</div>;
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link href={href} className="block active:bg-surface-sunken">{body}</Link>
              ) : onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)} className="block w-full text-start active:bg-surface-sunken">{body}</button>
              ) : body}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Up to `limit` rows, then "Show more" — long lists stay quick to draw. */
export function useShowMore<T>(rows: T[], step = 50) {
  const [limit, setLimit] = useState(step);
  return {
    visible: rows.slice(0, limit),
    more: rows.length > limit,
    showMore: () => setLimit((value) => value + step),
    reset: () => setLimit(step),
  };
}
