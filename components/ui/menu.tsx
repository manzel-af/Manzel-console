'use client';

/**
 * A dropdown of actions: a row's "…", the account menu. Opens on click, closes
 * on Escape, on a click outside, and after choosing. Arrow keys move between
 * the items.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

export interface MenuItem {
  label: ReactNode;
  icon?: IconName;
  onSelect?: () => void;
  href?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export function Menu({
  trigger, items, align = 'end', header, className,
}: {
  /** Renders the button; receives the props it must spread. */
  trigger: (props: { onClick(): void; 'aria-expanded': boolean; 'aria-controls': string; 'aria-haspopup': 'menu' }) => ReactNode;
  items: (MenuItem | 'divider')[];
  align?: 'start' | 'end';
  header?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const buttons = [...(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];
        const index = buttons.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        buttons[(next + buttons.length) % buttons.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // The first item takes focus, so the keyboard can go straight on.
    list.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={box} className={cn('relative', className)}>
      {trigger({ onClick: () => setOpen((value) => !value), 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'menu' })}
      {open ? (
        <div ref={list} id={id} role="menu"
          className={cn(
            'absolute z-50 mt-2 min-w-56 animate-pop overflow-hidden rounded-xl border border-line bg-surface-raised p-1.5 shadow-pop',
            align === 'end' ? 'end-0' : 'start-0',
          )}>
          {header ? <div className="border-b border-line px-3 pb-2.5 pt-1.5">{header}</div> : null}
          {items.map((item, index) => {
            if (item === 'divider') return <div key={`d${index}`} className="my-1 border-t border-line" />;
            const classes = cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium outline-none',
              item.tone === 'danger' ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'text-fg hover:bg-surface-sunken focus:bg-surface-sunken',
              item.disabled && 'pointer-events-none opacity-50',
            );
            const content = (
              <>
                {item.icon ? <Icon name={item.icon} size={17} /> : null}
                <span className="flex-1">{item.label}</span>
              </>
            );
            if (item.href) {
              return (
                <a key={index} role="menuitem" href={item.href} className={classes} aria-disabled={item.disabled || undefined}
                  onClick={() => setOpen(false)}>
                  {content}
                </a>
              );
            }
            return (
              <button key={index} type="button" role="menuitem" className={classes} aria-disabled={item.disabled || undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}>
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
