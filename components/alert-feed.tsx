'use client';

/**
 * Each new alert, live, while a console is open (V037): a toast that says
 * what came in and opens it, and every list and count fetched again — so a
 * waiting support message shows on the sidebar the moment it is written,
 * not at the next refresh. The same alert also goes out by email and push
 * (the operator-alerts function); this is only the open console's share.
 */

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';
import { useAutoAlerts } from '@/lib/api/alerts';
import { useI18n } from '@/lib/i18n/client';
import { getSupabase } from '@/lib/supabase/client';
import type { OperatorAlertKind, OperatorAlertRow } from '@/lib/supabase/database.types';

export const ALERT_ICON: Record<OperatorAlertKind, IconName> = {
  support: 'chat',
  building_request: 'building',
  idea: 'bolt',
  report: 'alert',
  chat_report: 'flag',
  test: 'bell',
};

export function AlertFeed() {
  // Stable values only: the channel is opened once, not at every render.
  const { t, locale, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  // The browser's own alerts turn on by themselves, once an operator is in.
  useAutoAlerts(language);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel('console-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'operator_alerts' }, (payload) => {
        const alert = payload.new as OperatorAlertRow;
        void queryClient.invalidateQueries({ queryKey: ['admin'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
        void queryClient.invalidateQueries({ queryKey: ['safety'] });
        // A test is the operator's own, and the alerts page already says it went.
        if (alert.kind === 'test') return;
        toast.show(
          <Link href={`/${locale}${alert.path}`} className="flex min-w-0 items-start gap-2 hover:underline">
            <Icon name={ALERT_ICON[alert.kind]} size={16} className="mt-0.5 shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="text-xs opacity-80">{t(`console.alerts.kinds.${alert.kind}`)}</span>
              <span className="line-clamp-2 font-semibold">{alert.title}</span>
            </span>
          </Link>,
          'info',
        );
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, toast, locale, t]);

  return null;
}
