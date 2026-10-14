/**
 * Surfaces: cards, sections, rows, the page header. The same names as the
 * app's components (Card, Section, ListRow, Divider) so a screen ported from
 * it keeps its shape.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

export type Tone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

export const TONE_SOFT: Record<Tone, string> = {
  default: 'bg-surface-sunken text-fg-muted',
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Card({
  children, className, bare = false, as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** No padding: for lists of rows that bring their own. */
  bare?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag className={cn('rounded-card border border-line bg-surface shadow-card', !bare && 'p-5', className)}>
      {children}
    </Tag>
  );
}

export function Section({
  title, description, actions, children, className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-base font-bold text-fg">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}

/** The round tinted square an icon sits in. */
export function IconTile({ icon, tone = 'default', size = 'md' }: { icon: IconName; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  const glyph = { sm: 16, md: 20, lg: 24 }[size];
  return (
    <span className={cn('grid shrink-0 place-items-center', box, TONE_SOFT[tone])}>
      <Icon name={icon} size={glyph} />
    </span>
  );
}

/**
 * A row in a list: icon, title, subtitle, something at the end. With `href`
 * it is a link to somewhere; with `onClick` a button; otherwise just a row.
 */
export function ListRow({
  title, subtitle, icon, iconTone = 'default', trailing, href, onClick, chevron, className, leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  iconTone?: Tone;
  /** Anything at the end: a badge, a value, a switch. */
  trailing?: ReactNode;
  /** Something other than an icon at the start: an avatar. */
  leading?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Defaults to true for links and buttons. */
  chevron?: boolean;
  className?: string;
}) {
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      {leading ?? (icon ? <IconTile icon={icon} tone={iconTone} /> : null)}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span className="truncate font-semibold text-fg">{title}</span>
        {subtitle ? <span className="truncate text-sm text-fg-muted">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2">{trailing}</span> : null}
      {(chevron ?? interactive) ? <Icon name="chevron" size={18} className="text-fg-subtle" /> : null}
    </>
  );
  const classes = cn(
    'flex w-full items-center gap-3 px-4 py-3.5',
    interactive && 'transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken',
    className,
  );
  if (href) return <Link href={href} className={classes}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={classes}>{content}</button>;
  return <div className={classes}>{content}</div>;
}

/** Rows inside one card, divided. */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card', className)}>
      {children}
    </div>
  );
}

/**
 * The top of every page: where you are, what it is, and what you can do here.
 * `back` is the parent page, as a link — the browser's own back still works.
 */
export function PageHeader({
  title, subtitle, actions, back, backLabel, badge,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: string;
  backLabel?: string;
  badge?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-6">
      {back ? (
        <Link href={back} className="inline-flex w-fit items-center gap-1 rounded-lg py-1 text-sm font-semibold text-fg-muted hover:text-fg">
          <Icon name="back" size={16} />
          {backLabel}
        </Link>
      ) : null}
      {/* On a phone the title has the whole width and the buttons go under it;
          wider, the title keeps at least 16rem before the buttons wrap below.
          (The title once shrank to a word a line so the buttons could stay beside it.) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-6">
        <div className="min-w-0 sm:flex-1 sm:basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 wrap-break-word text-2xl font-bold text-fg sm:text-[1.7rem]">{title}</h1>
            {badge}
          </div>
          {subtitle ? <p className="mt-1 max-w-3xl wrap-break-word text-fg-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** A label above a value, for detail pages. */
export function DetailItem({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      {/* No letter-spacing or capitals: they break the joined letters of Dari and Pashto. */}
      <dt className="text-xs font-semibold text-fg-subtle">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-fg">{children}</dd>
    </div>
  );
}

export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</dl>;
}
