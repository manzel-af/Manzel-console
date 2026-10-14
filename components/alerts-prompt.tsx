'use client';

/**
 * Home's reminder (2026-10-14): while this browser's alerts are off or
 * blocked, the overview says so — off, with the one click that turns them on
 * (the click Firefox and Safari need before they ask); blocked, with where to
 * allow them. "Not now" hides it until the console is next opened.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { refreshPushState, turnOnAlertsHere, usePushState } from '@/lib/api/alerts';
import { useErrorText } from '@/lib/errors';
import { useI18n } from '@/lib/i18n/client';

const HIDDEN = 'manzel-console-alerts-prompt-hidden';

function hiddenThisVisit(): boolean {
  try {
    return window.sessionStorage.getItem(HIDDEN) === '1';
  } catch {
    return false;
  }
}

export function AlertsPrompt() {
  const { t, language } = useI18n();
  const toast = useToast();
  const errorText = useErrorText();
  const { state } = usePushState();
  const [hidden, setHidden] = useState(() => typeof window !== 'undefined' && hiddenThisVisit());
  const [busy, setBusy] = useState(false);

  if (hidden || (state.status !== 'off' && state.status !== 'blocked')) return null;

  const hide = () => {
    try {
      window.sessionStorage.setItem(HIDDEN, '1');
    } catch {
      // Private mode: it shows again on the next page, which is harmless.
    }
    setHidden(true);
  };
  const notNow = <Button size="sm" variant="ghost" label={t('console.alerts.notNow')} onClick={hide} />;

  if (state.status === 'blocked') {
    return (
      <Callout tone="warning" icon="bell" title={t('console.alerts.blocked')} body={t('console.alerts.blockedBody')}
        action={notNow} />
    );
  }

  const turnOn = async () => {
    setBusy(true);
    try {
      await turnOnAlertsHere(language);
      toast.show(t('console.alerts.turnedOn'));
    } catch (caught) {
      toast.show(errorText(caught), 'danger');
    } finally {
      setBusy(false);
      void refreshPushState();
    }
  };

  return (
    <Callout tone="info" icon="bell" title={t('console.alerts.homeOff')} body={t('console.alerts.homeOffBody')}
      action={(
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" icon="bell" label={t('console.alerts.turnOn')} loading={busy}
            onClick={() => void turnOn()} />
          {notNow}
        </div>
      )} />
  );
}
