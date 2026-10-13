'use client';

/**
 * A Shamsi date field and its calendar (the app's components/ui/date-picker).
 *
 * Dates are chosen the way they are spoken here: Afghan month names, the week
 * from Saturday, digits in the reader's numerals. The value in and out is a
 * Gregorian `YYYY-MM-DD` — what a Postgres `date` column stores — so no
 * caller converts calendars. The grid is a CSS grid, so in Dari and Pashto
 * Saturday sits on the right, as on every printed Afghan calendar.
 *
 * The calendar opens under the field and closes on Escape, on a click
 * outside, or when a day is picked.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { fromShamsi, shamsiMonthNames, shamsiWeekdayNames, toIsoDate, toShamsi, type ShamsiDate } from '@/lib/format/date';
import { useFormat } from '@/lib/format/use-format';
import { useI18n } from '@/lib/i18n/client';

import { Button, IconButton } from './button';
import { Icon } from './icon';

/** Days in a Shamsi month: from its first day to the next month's. */
function daysInMonth(year: number, month: number): number {
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const first = fromShamsi({ year, month, day: 1 }).getTime();
  const after = fromShamsi({ ...next, day: 1 }).getTime();
  return Math.round((after - first) / 86_400_000);
}

/** 0 = Saturday … 6 = Friday. */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 1) % 7;
}

export function DateField({
  label, value, onChange, placeholder, hint, clearable = true, disabled, className,
}: {
  label: string;
  /** `YYYY-MM-DD` or null. */
  value: string | null;
  onChange(next: string | null): void;
  placeholder?: string;
  hint?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const id = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={box} className={cn('relative flex flex-col gap-1.5', className)}>
      <span id={`${id}-label`} className="text-sm font-semibold text-fg">{label}</span>
      <div className={cn(
        'flex h-11 items-center gap-1 rounded-field border border-line bg-surface ps-3.5 pe-1 shadow-card transition-colors hover:border-line-strong',
        open && 'border-primary ring-3 ring-primary/20',
        disabled && 'opacity-60',
      )}>
        <button
          type="button"
          aria-labelledby={`${id}-label`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-start outline-none"
        >
          <Icon name="calendar" size={18} className={value ? 'text-primary' : 'text-fg-subtle'} />
          <span className={cn('truncate', value ? 'text-fg' : 'text-fg-subtle')}>
            {value ? fmt.date(value, 'long') : (placeholder ?? t('dates.choose'))}
          </span>
        </button>
        {value && clearable && !disabled ? (
          <IconButton icon="close" label={t('dates.clear')} size="sm" onClick={() => onChange(null)} />
        ) : null}
      </div>
      {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}

      {open ? (
        <div role="dialog" aria-labelledby={`${id}-label`}
          className="absolute start-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] animate-pop rounded-card border border-line bg-surface p-3 shadow-pop">
          <Calendar
            value={value}
            onPick={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** A month of the Shamsi calendar, today ringed and the chosen day filled. */
export function Calendar({ value, onPick }: { value: string | null; onPick(next: string): void }) {
  const { t, language } = useI18n();
  const fmt = useFormat();

  const today = toShamsi(new Date());
  const selected: ShamsiDate | null = value ? toShamsi(value) : null;
  const [view, setView] = useState({ year: (selected ?? today).year, month: (selected ?? today).month });

  const monthNames = shamsiMonthNames(language);
  const weekdays = shamsiWeekdayNames(language).map((name) => (language === 'en' ? name.slice(0, 2) : name.charAt(0)));

  const count = daysInMonth(view.year, view.month);
  const lead = weekdayIndex(fromShamsi({ year: view.year, month: view.month, day: 1 }));
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ];

  const shift = (delta: number) => setView((current) => {
    const index = current.year * 12 + (current.month - 1) + delta;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <IconButton icon="back" label={t('dates.previousMonth')} size="sm" onClick={() => shift(-1)} />
        <p className="flex-1 text-center font-semibold text-fg">{`${monthNames[view.month - 1]} ${fmt.number(view.year)}`}</p>
        <IconButton icon="chevron" label={t('dates.nextMonth')} size="sm" onClick={() => shift(1)} />
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-fg-muted" aria-hidden>
        {weekdays.map((name, index) => (
          <span key={index} className={cn('py-1', index === 6 && 'text-danger')}>{name}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const isSelected = selected?.year === view.year && selected.month === view.month && selected.day === day;
          const isToday = today.year === view.year && today.month === view.month && today.day === day;
          const iso = toIsoDate(fromShamsi({ year: view.year, month: view.month, day }));
          return (
            <span key={day} className="grid place-items-center">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={fmt.date(iso, 'long')}
                onClick={() => onPick(iso)}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full text-sm transition-colors',
                  isSelected ? 'bg-primary font-semibold text-fg-on-primary'
                    : isToday ? 'border border-primary font-semibold text-fg hover:bg-primary-soft'
                      : 'text-fg hover:bg-surface-sunken',
                )}
              >
                {fmt.number(day)}
              </button>
            </span>
          );
        })}
      </div>
      <Button label={t('dates.today')} variant="secondary" size="sm" icon="calendar" full
        onClick={() => onPick(toIsoDate(new Date()))} />
    </div>
  );
}
