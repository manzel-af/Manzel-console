'use client';

/**
 * A page that could not be drawn, or a thing that is not there — inside the
 * console's frame, so the sidebar and the way back stay where they were.
 */

import { ButtonLink, Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useHref, useT } from '@/lib/i18n/client';
import { isolate } from '@/lib/text';

export function ErrorView({
  icon, title, body, onRetry, reference,
}: {
  icon: IconName;
  title: string;
  body: string;
  onRetry?(): void;
  /** The server's digest, to find the error in its logs. */
  reference?: string;
}) {
  const t = useT();
  const href = useHref();
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-sunken text-fg-subtle">
        <Icon name={icon} size={30} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold text-fg">{title}</h1>
        <p className="text-fg-muted">{body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry ? <Button icon="sync" label={t('console.errors.tryAgain')} onClick={onRetry} /> : null}
        <ButtonLink href={href('/')} variant={onRetry ? 'secondary' : 'primary'} icon="grid" label={t('console.errors.goHome')} />
      </div>
      {reference ? (
        <p className="font-mono text-xs text-fg-subtle">{t('console.errors.reference', { code: isolate(reference) })}</p>
      ) : null}
    </div>
  );
}
