'use client';

/**
 * Errors as words. Every server failure becomes a ManageError carrying a
 * translation key — the same keys, from the same table (error-key.ts, copied
 * from the app), so "that code is in use" reads alike on the phone and here.
 */

import { useCallback } from 'react';

import { useT } from '@/lib/i18n/client';

import { errorKey } from './error-key';

export class ManageError extends Error {
  constructor(readonly key: string, readonly detail?: string) {
    super(key);
  }
}

export function fail(error: { message?: string; code?: string } | null): never {
  throw new ManageError(errorKey(error?.message, error?.code), error?.message);
}

export { errorKey };

/** Any thrown thing → a sentence in the page's language. */
export function useErrorText(): (error: unknown) => string {
  const t = useT();
  return useCallback((error: unknown) => {
    if (error instanceof ManageError) return t(error.key);
    if (error instanceof Error && /network|fetch|Failed to fetch/i.test(error.message)) return t('errors.network');
    return t('errors.generic');
  }, [t]);
}
