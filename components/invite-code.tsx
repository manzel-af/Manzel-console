'use client';

/**
 * A new invite code, as the app's InviteCodeCard shows it: big, one letter per
 * box so it can be read out over the phone, when it expires, and a copy
 * button. The operator passes it on; the console never sends it anywhere.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';

export function InviteCode({ code, expiresAt, body, onDone }: { code: string; expiresAt: string; body?: string; onDone?(): void }) {
  const t = useT();
  const fmt = useFormat();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {body ? <p className="text-sm text-fg-muted">{body}</p> : null}
      <div dir="ltr" className="flex flex-wrap justify-center gap-1.5" aria-label={code.split('').join(' ')}>
        {code.split('').map((character, index) => (
          <span key={index}
            className="grid h-12 w-10 place-items-center rounded-xl border border-line bg-surface-sunken font-mono text-2xl font-bold text-fg">
            {character}
          </span>
        ))}
      </div>
      <p className="text-sm text-fg-muted">{t('residents.expiresOn', { date: fmt.date(expiresAt, 'medium') })}</p>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          icon={copied ? 'check' : 'copy'}
          label={copied ? t('console.list.copied') : t('residents.copyCode')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              toast.show(t('residents.codeCopied'));
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard blocked: the code is on screen to copy by hand.
            }
          }}
        />
        {onDone ? <Button variant="ghost" label={t('common.done')} onClick={onDone} /> : null}
      </div>
    </div>
  );
}
