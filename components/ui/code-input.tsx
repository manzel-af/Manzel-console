'use client';

/**
 * A six-digit code: from an email, or an authenticator app. One field (so
 * pasting and the phone's "from Messages" suggestion work), left to right
 * whatever the page's language, Eastern digits accepted from a Dari or Pashto
 * keyboard, and it submits itself once the sixth digit is in.
 */

import { useEffect, useId, useRef } from 'react';

import { cn } from '@/lib/cn';

/** ۰-۹ and ٠-٩ to 0-9; everything else that is not a digit is dropped. */
export function asciiDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '');
}

export function CodeInput({
  value, onChange, onComplete, label, error, disabled, autoFocus = true, length = 6,
}: {
  value: string;
  onChange(next: string): void;
  onComplete?(code: string): void;
  label: string;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const lastSubmitted = useRef<string | null>(null);

  useEffect(() => {
    if (value.length === length && value !== lastSubmitted.current && !disabled) {
      lastSubmitted.current = value;
      onComplete?.(value);
    }
    if (value.length < length) lastSubmitted.current = null;
  }, [value, length, disabled, onComplete]);

  useEffect(() => {
    // A wrong code: select it, so the next one simply replaces it.
    if (error) ref.current?.select();
  }, [error]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-fg">{label}</label>
      <input
        ref={ref}
        id={id}
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={length}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(asciiDigits(event.target.value).slice(0, length))}
        placeholder={'•'.repeat(length)}
        className={cn(
          'h-14 w-full rounded-field border border-line bg-surface text-center font-mono text-2xl font-semibold tracking-[0.55em] text-fg shadow-card outline-none transition-[border-color,box-shadow]',
          'placeholder:text-fg-subtle/60 hover:border-line-strong focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:opacity-60',
          error && 'border-danger focus:ring-danger/20',
        )}
      />
      {error ? <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
