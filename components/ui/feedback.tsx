/**
 * Feedback: badges, callouts, empty states, skeletons, progress, numbers at a
 * glance. Same names and tones as the app's components/ui/feedback.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';
import { TONE_SOFT, type Tone } from './surfaces';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-fg-muted border-line',
  primary: 'bg-primary-soft text-primary border-transparent',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
};

export function Badge({
  label, tone = 'neutral', icon, className, dot = false,
}: {
  label: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
  /** A small dot before the label, for live states. */
  dot?: boolean;
}) {
  return (
    <span className={cn(
      'inline-flex h-6 max-w-full shrink-0 items-center gap-1 rounded-pill border px-2.5 text-xs font-semibold whitespace-nowrap',
      BADGE[tone], className,
    )}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {icon ? <Icon name={icon} size={13} strokeWidth={2} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger';

const CALLOUT: Record<CalloutTone, { box: string; icon: IconName }> = {
  info: { box: 'border-primary/25 bg-primary-soft/60 text-fg', icon: 'info' },
  success: { box: 'border-success/25 bg-success-soft/70 text-fg', icon: 'check' },
  warning: { box: 'border-warning/25 bg-warning-soft/70 text-fg', icon: 'alert' },
  danger: { box: 'border-danger/25 bg-danger-soft/70 text-fg', icon: 'alert' },
};
const CALLOUT_ICON: Record<CalloutTone, string> = {
  info: 'text-primary', success: 'text-success', warning: 'text-warning', danger: 'text-danger',
};

/** The app's Banner: a message at the top of a page or section, with an optional action. */
export function Callout({
  tone = 'info', title, body, icon, action, className,
}: {
  tone?: CalloutTone;
  title: ReactNode;
  body?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}) {
  const look = CALLOUT[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-start gap-3 rounded-card border p-4', look.box, className)}>
      <Icon name={icon ?? look.icon} size={20} className={cn('mt-0.5', CALLOUT_ICON[tone])} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {body ? <div className="mt-0.5 text-sm text-fg-muted">{body}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = 'search', title, body, action, className,
}: {
  icon?: IconName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-sunken text-fg-subtle">
        <Icon name={icon} size={26} />
      </span>
      <div className="max-w-md">
        <p className="text-base font-semibold text-fg">{title}</p>
        {body ? <p className="mt-1 text-sm text-fg-muted">{body}</p> : null}
      </div>
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('skeleton block', className)} aria-hidden />;
}

/** Rows of placeholder while a list loads. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('divide-y divide-line overflow-hidden rounded-card border border-line bg-surface', className)}
      aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value, tone = 'primary', className }: { value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'accent'; className?: string }) {
  const fill = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', accent: 'bg-accent' }[tone];
  const percent = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-pill bg-surface-sunken', className)}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <div className={cn('h-full rounded-pill transition-[width] duration-500', fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}

/** A number at a glance: the overview's tiles. A link when it leads somewhere. */
export function StatTile({
  icon, tone, label, value, note, href, className,
}: {
  icon: IconName;
  tone: Tone;
  label: ReactNode;
  /** null while loading. */
  value: ReactNode | null;
  note?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className={cn('grid h-10 w-10 place-items-center rounded-xl', TONE_SOFT[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        {value === null ? <Skeleton className="h-7 w-16" /> : (
          <span className="truncate text-2xl font-bold text-fg tabular-nums">{value}</span>
        )}
        <span className="truncate text-sm text-fg-muted">{label}</span>
        {note ? <span className="truncate text-xs text-fg-subtle">{note}</span> : null}
      </span>
    </>
  );
  const classes = cn('flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card', className);
  if (href) {
    return (
      <Link href={href} className={cn(classes, 'transition-colors hover:border-line-strong hover:bg-surface-sunken/40')}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}

/** A small "updated" stamp for live lists. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );
}
