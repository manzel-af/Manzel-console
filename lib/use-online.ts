'use client';

/**
 * Whether the browser is connected: the offline strip in the shell, and
 * every form's Save, which waits for the connection rather than failing.
 */

import { useSyncExternalStore } from 'react';

function subscribe(changed: () => void) {
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  return () => {
    window.removeEventListener('online', changed);
    window.removeEventListener('offline', changed);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
