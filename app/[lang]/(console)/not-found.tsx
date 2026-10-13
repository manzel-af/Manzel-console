'use client';

/** A console address with nothing behind it (notFound() on a page). */

import { ErrorView } from '@/components/error-view';
import { useT } from '@/lib/i18n/client';

export default function ConsoleNotFound() {
  const t = useT();
  return <ErrorView icon="search" title={t('console.errors.notFoundTitle')} body={t('console.errors.notFoundBody')} />;
}
