'use client';

/**
 * The console as an installed app.
 *
 * Registers the service worker (public/sw.js: alerts and their clicks; it
 * caches nothing, so an operator never acts on an old copy of a page), and
 * offers to install the console once — where the browser can (Chrome, Edge,
 * Android) with its own prompt, on an iPhone with the two taps it takes.
 * "Not now" is remembered for a fortnight.
 */

import { useEffect, useState } from 'react';

import { Button, IconButton } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/logo';
import { useT } from '@/lib/i18n/client';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SNOOZE_KEY = 'manzel.console.installSnoozed';
const SNOOZE_MS = 14 * 24 * 3600_000;

function snoozed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** iPhones and iPads never send `beforeinstallprompt`; Safari installs from Share. */
function isApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Drawn only in the browser, after sign-in (the console's frame). */
export function PwaManager() {
  const t = useT();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios] = useState(isApple);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || snoozed()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    if (ios) {
      const timer = window.setTimeout(() => setVisible(true), 4000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onPrompt);
      };
    }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [ios]);

  if (!visible) return null;

  const snooze = () => {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // Shown again next visit.
    }
    setVisible(false);
  };

  return (
    <div role="dialog" aria-label={t('console.shell.install')}
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md animate-rise items-start gap-3 rounded-[1.25rem] border border-line bg-surface-raised p-4 shadow-pop sm:end-6 sm:start-auto sm:mx-0">
      <LogoMark size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{t('console.shell.install')}</p>
        <p className="mt-0.5 text-sm text-fg-muted">{ios ? t('console.shell.installIos') : t('console.shell.installBody')}</p>
        {prompt ? (
          <div className="mt-3 flex gap-2">
            <Button size="sm" label={t('console.shell.installAction')} icon="download"
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
                setVisible(false);
              }} />
            <Button size="sm" variant="ghost" label={t('console.shell.notNow')} onClick={snooze} />
          </div>
        ) : null}
      </div>
      <IconButton icon="close" size="sm" label={t('console.shell.notNow')} onClick={snooze} />
    </div>
  );
}
