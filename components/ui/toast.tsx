'use client';

/**
 * Toasts: a short word that something happened ("Saved", "Sent to 1,204
 * people"), announced to screen readers, gone after a few seconds. Errors stay
 * a little longer, and anything that needs a decision is a dialog instead.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

type ToastTone = 'success' | 'info' | 'danger';

interface ToastItem {
  id: number;
  message: ReactNode;
  tone: ToastTone;
}

interface ToastApi {
  show(message: ReactNode, tone?: ToastTone): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, IconName> = { success: 'check', info: 'info', danger: 'alert' };
const TONES: Record<ToastTone, string> = {
  success: 'text-success',
  info: 'text-primary',
  danger: 'text-danger',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: ReactNode, tone: ToastTone = 'success') => {
    const id = nextId++;
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)),
      tone === 'danger' ? 6500 : 3800);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:pe-6">
        {items.map((item) => (
          <div key={item.id}
            className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm font-semibold text-fg shadow-pop">
            <Icon name={ICONS[item.tone]} size={18} className={cn(TONES[item.tone])} />
            <span className="min-w-0">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
