'use client';

/**
 * "Help them sign in" (V030, the app's SignInCodeSheet): a one-time code for
 * someone who cannot get into their own account, to pass on by hand.
 *
 * Two steps: what it does and the one rule (give it only to that person, in
 * person or on a call); then the code, large and spaced for reading aloud,
 * with when it stops working. Shown once: closing forgets it, and making
 * another cancels this one.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Callout } from '@/components/ui/feedback';
import { issueSignInCode } from '@/lib/api/people';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import type { SignInCodeIssued } from '@/lib/supabase/database.types';

export function SignInCodeDialog({
  open, onClose, profileId, name,
}: {
  open: boolean;
  onClose(): void;
  profileId: string;
  name: string;
}) {
  const t = useT();
  const fmt = useFormat();
  const errorText = useErrorText();
  const [issued, setIssued] = useState<SignInCodeIssued | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setIssued(null);
    setError(null);
    onClose();
  };

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      setIssued(await issueSignInCode(profileId, null));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  // "ABCD EFGH": two groups of four are easier to read out and to type.
  const spaced = issued ? `${issued.code.slice(0, 4)} ${issued.code.slice(4)}` : '';

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('recovery.helpTitle', { name })}
      size="sm"
      footer={issued ? (
        <>
          <Button variant="secondary" icon={copied ? 'check' : 'copy'} label={copied ? t('console.list.copied') : t('console.list.copy')}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(t('recovery.shareMessage', { code: spaced, time: fmt.time(issued.expires_at) }));
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                // The code is on screen.
              }
            }} />
          <Button icon="check" label={t('common.done')} onClick={close} />
        </>
      ) : (
        <>
          <Button variant="ghost" label={t('common.cancel')} onClick={close} />
          <Button icon="key" label={t('recovery.make')} loading={busy} onClick={() => void make()} />
        </>
      )}
    >
      {issued ? (
        <div className="flex flex-col gap-4">
          <p className="text-fg-muted">{t('recovery.giveBody', { name })}</p>
          <div dir="ltr" className="rounded-card border border-primary/25 bg-primary-soft px-4 py-6 text-center">
            <span className="font-mono text-4xl font-bold tracking-[0.18em] text-primary select-all"
              aria-label={issued.code.split('').join(' ')}>
              {spaced}
            </span>
          </div>
          <p className="text-center text-sm font-semibold text-fg-muted">
            {t('recovery.validUntil', { time: fmt.time(issued.expires_at) })}
          </p>
          <p className="text-center text-xs text-fg-subtle">{t('recovery.whereToType')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p>{t('recovery.helpBody', { name })}</p>
          <Callout tone="warning" icon="shield" title={t('recovery.onlyThem', { name })} />
          {error ? <Callout tone="danger" title={error} /> : null}
        </div>
      )}
    </Dialog>
  );
}
