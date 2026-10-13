/**
 * Buttons. One family: primary (the one thing a page is for), secondary,
 * ghost (quiet, in toolbars and rows), danger (what cannot be undone), and
 * soft-danger for the second step of one. With `href` it is a link that
 * looks like a button — never a button that navigates.
 */

import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft-danger' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-fg-on-primary hover:bg-primary-hover shadow-card',
  secondary: 'bg-surface text-fg border border-line hover:border-line-strong hover:bg-surface-sunken shadow-card',
  ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
  danger: 'bg-danger text-bg hover:opacity-90 shadow-card',
  'soft-danger': 'bg-danger-soft text-danger hover:brightness-95',
  soft: 'bg-primary-soft text-primary hover:brightness-95',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm rounded-lg',
  md: 'h-10 gap-2 px-4 text-sm rounded-[0.7rem]',
  lg: 'h-12 gap-2 px-5 text-base rounded-xl',
};

const ICON_SIZES: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('animate-spin', className)} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface CommonProps {
  label: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** An icon after the label: a chevron, an external link. */
  trailingIcon?: IconName;
  loading?: boolean;
  full?: boolean;
  className?: string;
}

function inner({ label, icon, trailingIcon, loading, size = 'md' }: CommonProps) {
  return (
    <>
      {loading ? <Spinner size={ICON_SIZES[size]} /> : icon ? <Icon name={icon} size={ICON_SIZES[size]} /> : null}
      <span className="truncate">{label}</span>
      {trailingIcon && !loading ? <Icon name={trailingIcon} size={ICON_SIZES[size] - 2} className="opacity-70" /> : null}
    </>
  );
}

const base = 'inline-flex shrink-0 select-none items-center justify-center font-semibold whitespace-nowrap transition-[background-color,border-color,color,opacity,filter] duration-150 disabled:opacity-50 disabled:pointer-events-none';

export function Button({
  label, variant = 'primary', size = 'md', icon, trailingIcon, loading = false, full = false, className,
  disabled, type = 'button', ...rest
}: CommonProps & Omit<ComponentPropsWithoutRef<'button'>, 'children'>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, VARIANTS[variant], SIZES[size], full && 'w-full', className)}
      {...rest}
    >
      {inner({ label, icon, trailingIcon, loading, size })}
    </button>
  );
}

export function ButtonLink({
  label, variant = 'secondary', size = 'md', icon, trailingIcon, full = false, className, href, external, ...rest
}: CommonProps & { href: string; external?: boolean } & Omit<ComponentPropsWithoutRef<'a'>, 'children' | 'href'>) {
  const classes = cn(base, VARIANTS[variant], SIZES[size], full && 'w-full', className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {inner({ label, icon, trailingIcon: trailingIcon ?? 'external', size })}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {inner({ label, icon, trailingIcon, size })}
    </Link>
  );
}

/** A button that is only an icon. `label` is required: it is what a screen reader says, and the tooltip. */
export function IconButton({
  icon, label, size = 'md', variant = 'ghost', className, badge, ...rest
}: {
  icon: IconName;
  label: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  /** A small count on the corner, already in the page's digits (fmt.number). */
  badge?: string | null;
} & Omit<ComponentPropsWithoutRef<'button'>, 'children'>) {
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-[0.7rem]', lg: 'h-12 w-12 rounded-xl' }[size];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('relative', base, VARIANTS[variant], box, className)}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZES[size]} />
      {badge ? (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-pill bg-danger px-1 text-[0.65rem] font-bold leading-[1.15rem] text-bg">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
