'use client';

/**
 * Dialogs, on the browser's own <dialog>: it traps focus, answers Escape,
 * restores focus when it closes, and draws its backdrop — nothing to rebuild.
 * On a phone it rises from the bottom like the app's sheets; on a desk it sits
 * in the middle.
 */

import { useEffect, useRef, type ReactNode } from 'react';

import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/cn';

import { Button, IconButton } from './button';

export function Dialog({
  open, onClose, title, description, children, footer, size = 'md', dismissible = true,
}: {
  open: boolean;
  onClose(): void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** The buttons at the bottom. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** False while something is being saved: Escape and the backdrop do nothing. */
  dismissible?: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current && dismissible) onClose();
      }}
      className={cn(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[1.5rem] border border-line bg-surface p-0 text-fg shadow-pop',
        'sm:m-auto sm:rounded-[1.25rem]', width,
        'open:animate-rise',
      )}
    >
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start gap-3 px-6 pb-3 pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-fg">{title}</h2>
              {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
            </div>
            {dismissible ? <IconButton icon="close" label={t('common.close')} size="sm" onClick={onClose} /> : null}
          </div>
          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div> : null}
          {footer ? (
            <div className="flex flex-wrap-reverse justify-end gap-2 border-t border-line bg-surface-sunken/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * "Are you sure?" — before anything that moves money, closes something, or
 * cannot be undone. The app's ConfirmSheet.
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel, cancelLabel, tone = 'primary', loading = false, children,
}: {
  open: boolean;
  onClose(): void;
  onConfirm(): void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  /** Extra fields, e.g. a reason. */
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={body}
      size="sm"
      dismissible={!loading}
      footer={(
        <>
          <Button label={cancelLabel ?? t('common.cancel')} variant="ghost" onClick={onClose} disabled={loading} />
          <Button label={confirmLabel} variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading}
            icon={tone === 'danger' ? 'alert' : 'check'} onClick={onConfirm} />
        </>
      )}
    >
      {children}
    </Dialog>
  );
}
