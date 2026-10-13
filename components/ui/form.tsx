'use client';

/**
 * Form controls. Every field has a visible label (not a placeholder pretending
 * to be one), an optional hint, and an error that is announced. Direction:
 * text fields follow the page, except where the content is always Latin —
 * emails, links, codes — which pass `dir="ltr"` so a cursor never jumps.
 */

import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

const control = 'w-full rounded-field border border-line bg-surface px-3.5 text-fg placeholder:text-fg-subtle shadow-card transition-[border-color,box-shadow] outline-none hover:border-line-strong focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus:ring-danger/20';

export function FieldShell({
  id, label, hint, error, required, optionalLabel, children, className, counter,
}: {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Shown after the label when the field is not required. */
  optionalLabel?: string;
  children: ReactNode;
  className?: string;
  /** "12/100" under the field. */
  counter?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="flex items-baseline gap-1.5 text-sm font-semibold text-fg">
          {label}
          {required ? <span className="text-danger" aria-hidden>*</span> : null}
          {!required && optionalLabel ? <span className="font-normal text-fg-subtle">{optionalLabel}</span> : null}
        </label>
      ) : null}
      {children}
      {error || hint || counter ? (
        <div className="flex items-start justify-between gap-3 text-xs">
          {error ? (
            <p id={`${id}-error`} className="font-semibold text-danger" role="alert">{error}</p>
          ) : hint ? (
            <p id={`${id}-hint`} className="text-fg-muted">{hint}</p>
          ) : <span />}
          {counter ? <span className="shrink-0 text-fg-subtle tabular-nums">{counter}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  icon?: IconName;
  optionalLabel?: string;
  counter?: ReactNode;
  /** Something at the end of the field: a unit, a button. */
  trailing?: ReactNode;
  wrapperClassName?: string;
};

export function Field({
  label, hint, error, icon, optionalLabel, counter, trailing, wrapperClassName, className, id: given, required, ...rest
}: InputProps) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}
      optionalLabel={optionalLabel} counter={counter} className={wrapperClassName}>
      <div className="relative flex items-center">
        {icon ? <Icon name={icon} size={18} className="pointer-events-none absolute start-3 text-fg-subtle" /> : null}
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(control, 'h-11', icon && 'ps-10', trailing ? 'pe-12' : undefined, className)}
          {...rest}
        />
        {trailing ? <div className="absolute end-1.5 flex items-center">{trailing}</div> : null}
      </div>
    </FieldShell>
  );
}

export function TextArea({
  label, hint, error, optionalLabel, counter, wrapperClassName, className, id: given, required, rows = 4, ...rest
}: Omit<ComponentPropsWithoutRef<'textarea'>, 'size'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  counter?: ReactNode;
  wrapperClassName?: string;
}) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}
      optionalLabel={optionalLabel} counter={counter} className={wrapperClassName}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(control, 'min-h-24 resize-y py-2.5 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Select({
  label, hint, error, optionalLabel, wrapperClassName, className, id: given, required, children, ...rest
}: Omit<ComponentPropsWithoutRef<'select'>, 'size'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  wrapperClassName?: string;
}) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}
      optionalLabel={optionalLabel} className={wrapperClassName}>
      <div className="relative flex items-center">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(control, 'h-11 appearance-none pe-10', className)}
          {...rest}
        >
          {children}
        </select>
        <Icon name="chevronDown" size={18} className="pointer-events-none absolute end-3 text-fg-subtle" />
      </div>
    </FieldShell>
  );
}

/** A switch: on or off, with its label beside it. */
export function Switch({
  checked, onChange, label, description, disabled, className, id: given,
}: {
  checked: boolean;
  onChange(next: boolean): void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-fg">{label}</span>
        {description ? <span className="text-sm text-fg-muted">{description}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-pill border transition-colors disabled:opacity-50',
          checked ? 'border-primary bg-primary' : 'border-line-strong bg-surface-sunken',
        )}
      >
        <span className={cn(
          'absolute top-0.5 h-5.5 w-5.5 rounded-full bg-surface shadow-card transition-[inset-inline-start] duration-200',
          checked ? 'start-[1.45rem]' : 'start-0.5',
        )} />
      </button>
    </div>
  );
}

export function Checkbox({
  checked, onChange, label, description, disabled, className,
}: {
  checked: boolean;
  onChange(next: boolean): void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4.5 w-4.5 shrink-0 accent-[var(--primary)]" />
      <label htmlFor={id} className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-fg">{label}</span>
        {description ? <span className="text-sm text-fg-muted">{description}</span> : null}
      </label>
    </div>
  );
}

/** One of a few, side by side: the app's segmented choices. */
export function Segmented<T extends string>({
  value, onChange, options, label, size = 'md', className,
}: {
  value: T;
  onChange(next: T): void;
  options: { value: T; label: ReactNode; icon?: IconName }[];
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label}
      className={cn('inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-surface-sunken p-1', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              selected ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option.icon ? <Icon name={option.icon} size={size === 'sm' ? 14 : 16} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A search box for lists: an icon, a clear button. */
export function SearchInput({
  value, onChange, placeholder, label, className, autoFocus,
}: {
  value: string;
  onChange(next: string): void;
  placeholder?: string;
  label: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Icon name="search" size={18} className="pointer-events-none absolute start-3 text-fg-subtle" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        className={cn(control, 'h-10 ps-10 pe-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="×"
          className="absolute end-2 grid h-6 w-6 place-items-center rounded-md text-fg-subtle hover:bg-surface-sunken hover:text-fg">
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Pills to choose one from, wrapping onto as many rows as they need: the
 * app's ChipGroup. `value` null: none chosen (a banner's tone while it has a
 * colour of its own).
 */
export function ChipGroup<T extends string>({
  value, onChange, options, label, className,
}: {
  value: T | null;
  onChange(next: T): void;
  options: { value: T; label: ReactNode; icon?: IconName }[];
  label?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-semibold transition-colors',
              selected
                ? 'border-primary bg-primary text-fg-on-primary'
                : 'border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-sunken',
            )}
          >
            {option.icon ? <Icon name={option.icon} size={15} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
