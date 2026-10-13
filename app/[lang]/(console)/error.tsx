'use client';

/** Something on a page failed to draw: say so in the console's frame, and offer to try again. */

import { useEffect } from 'react';

import { ErrorView } from '@/components/error-view';
import { useT } from '@/lib/i18n/client';

export default function ConsoleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorView icon="alert" title={t('console.errors.pageTitle')} body={t('console.errors.pageBody')}
      onRetry={retry} reference={error.digest} />
  );
}
