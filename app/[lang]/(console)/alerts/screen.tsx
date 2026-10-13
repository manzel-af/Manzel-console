'use client';

/**
 * Alerts (V037): how the platform tells its operators that something needs
 * them — a support message waiting, a building request, an idea or a
 * problem report, a reported chat message.
 *
 *   * By email, always: support to support@manzel.af, everything else to
 *     admin@manzel.af, from the company's mailbox.
 *   * By web push, to each console that turns it on here: the browser asks
 *     once, and the alert then arrives like any notification — on the desk,
 *     or on a phone with the console installed.
 *
 * Below, every recent alert and what became of it.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ALERT_ICON } from '@/components/alert-feed';
import { Button } from '@/components/ui/button';
import { Badge, Callout, EmptyState, SkeletonRows, type BadgeTone } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icon';
import { Card, IconTile, PageHeader, Section } from '@/components/ui/surfaces';
import { DataTable, useShowMore, type Column } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  sendTestAlert, subscribeThisBrowser, unsubscribeThisBrowser, useMySubscriptions, useOperatorAlerts, usePushState,
} from '@/lib/api/alerts';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n } from '@/lib/i18n/client';
import type { OperatorAlertRow, OperatorAlertStatus } from '@/lib/supabase/database.types';

const STATUS_TONE: Record<OperatorAlertStatus, BadgeTone> = {
  pending: 'warning',
  sent: 'success',
  failed: 'danger',
  skipped: 'neutral',
};

export function AlertsScreen() {
  const { t, language } = useI18n();
  const fmt = useFormat();
  const href = useHref();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const alerts = useOperatorAlerts();
  const mine = useMySubscriptions();
  const { state, refresh } = usePushState();
  const [busy, setBusy] = useState<'on' | 'off' | 'test' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = useShowMore(alerts.data ?? [], 50);

  const run = async (what: 'on' | 'off' | 'test', work: () => Promise<void>, done: string) => {
    setBusy(what);
    setError(null);
    try {
      await work();
      toast.show(done);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const rows = alerts.data ?? [];
  const lastEmail = rows.find((row) => row.email_status !== 'pending');
  const emailUnset = lastEmail?.email_error === 'smtp_not_configured';
  const pushUnset = rows.find((row) => row.push_status !== 'pending')?.push_error === 'vapid_not_configured';

  const status = (row: OperatorAlertRow, what: 'email' | 'push') => {
    const value = what === 'email' ? row.email_status : row.push_status;
    const problem = what === 'email' ? row.email_error : row.push_error;
    return (
      <span title={problem ?? undefined}>
        <Badge tone={STATUS_TONE[value]} icon={what === 'email' ? 'mail' : 'bell'}
          label={what === 'push' && value === 'sent'
            ? t('console.alerts.pushedTo', { n: fmt.number(row.pushed) })
            : t(`console.alerts.status.${value}`)} />
      </span>
    );
  };

  const columns: Column<OperatorAlertRow>[] = [
    {
      key: 'what',
      header: t('console.audit.action'),
      cell: (row) => (
        <span className="flex min-w-0 items-start gap-3">
          <IconTile icon={ALERT_ICON[row.kind]} tone={row.kind === 'support' ? 'primary' : row.kind === 'chat_report' || row.kind === 'report' ? 'danger' : 'accent'} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-fg-muted">{t(`console.alerts.kinds.${row.kind}`)}</span>
            <span className="line-clamp-1 font-semibold">{row.kind === 'test' ? t('console.alerts.testTitle') : row.title}</span>
            {row.detail ? <span className="line-clamp-1 text-xs text-fg-muted">{row.detail}</span> : null}
          </span>
        </span>
      ),
    },
    { key: 'email', header: t('console.alerts.email'), hideBelow: 'md', cell: (row) => status(row, 'email') },
    { key: 'push', header: t('console.alerts.push'), hideBelow: 'md', cell: (row) => status(row, 'push') },
    {
      key: 'when',
      header: t('console.list.when'),
      align: 'end',
      cell: (row) => <time dateTime={row.created_at} title={fmt.dateTime(row.created_at)} className="whitespace-nowrap text-fg-muted">{fmt.relative(row.created_at)}</time>,
    },
  ];

  const thisBrowser = (() => {
    switch (state.status) {
      case 'checking': return { tone: 'default' as const, title: t('common.loading'), body: null };
      case 'unsupported': return { tone: 'default' as const, title: t('console.alerts.unsupported'), body: t('console.alerts.unsupportedBody') };
      case 'unconfigured': return { tone: 'warning' as const, title: t('console.alerts.unconfigured'), body: t('console.alerts.unconfiguredBody') };
      case 'blocked': return { tone: 'danger' as const, title: t('console.alerts.blocked'), body: t('console.alerts.blockedBody') };
      case 'off': return { tone: 'default' as const, title: t('console.alerts.off'), body: t('console.alerts.offBody') };
      case 'on': return { tone: 'success' as const, title: t('console.alerts.on'), body: t('console.alerts.onBody') };
    }
  })();

  return (
    <div>
      <PageHeader title={t('console.nav.alerts')} subtitle={t('console.alerts.subtitle')} />

      <div className="flex flex-col gap-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ---- this browser ---- */}
          <Card className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <IconTile icon="bell" tone={thisBrowser.tone === 'default' ? 'default' : thisBrowser.tone} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-fg-muted">{t('console.alerts.thisBrowser')}</p>
                <p className="font-semibold text-fg">{thisBrowser.title}</p>
                {thisBrowser.body ? <p className="mt-0.5 text-sm text-fg-muted">{thisBrowser.body}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.status === 'off' ? (
                <Button icon="bell" label={t('console.alerts.turnOn')} loading={busy === 'on'}
                  onClick={() => void run('on', () => subscribeThisBrowser(language), t('console.alerts.turnedOn'))} />
              ) : null}
              {state.status === 'on' ? (
                <Button variant="secondary" icon="minus" label={t('console.alerts.turnOff')} loading={busy === 'off'}
                  onClick={() => void run('off', unsubscribeThisBrowser, t('console.alerts.turnedOff'))} />
              ) : null}
              <Button variant="secondary" icon="send" label={t('console.alerts.sendTest')} loading={busy === 'test'}
                onClick={() => void run('test', sendTestAlert, t('console.alerts.testSent'))} />
            </div>
            {mine.data && mine.data.length > 0 ? (
              <p className="text-xs text-fg-muted">{t('console.alerts.yourConsoles', { n: fmt.number(mine.data.length) })}</p>
            ) : null}
          </Card>

          {/* ---- email ---- */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <IconTile icon="mail" tone={emailUnset ? 'warning' : 'primary'} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-fg-muted">{t('console.alerts.email')}</p>
                <p className="font-semibold text-fg">{t('console.alerts.emailTitle')}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex flex-wrap items-center gap-2">
                <Icon name="chat" size={16} className="text-fg-subtle" />
                <span className="text-fg-muted">{t('console.alerts.kinds.support')}</span>
                <bdi dir="ltr" className="ms-auto font-mono text-fg">support@manzel.af</bdi>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Icon name="grid" size={16} className="text-fg-subtle" />
                <span className="text-fg-muted">{t('console.alerts.everythingElse')}</span>
                <bdi dir="ltr" className="ms-auto font-mono text-fg">admin@manzel.af</bdi>
              </li>
            </ul>
            {emailUnset ? <Callout tone="warning" title={t('console.alerts.emailUnset')} body={t('console.alerts.emailUnsetBody')} /> : null}
          </Card>
        </div>

        {error ? <Callout tone="danger" title={error} /> : null}
        {pushUnset && state.status !== 'unconfigured' ? (
          <Callout tone="warning" title={t('console.alerts.pushUnset')} body={t('console.alerts.pushUnsetBody')} />
        ) : null}

        <Section title={t('console.alerts.recent')}>
          {alerts.error ? <Callout tone="danger" title={errorText(alerts.error)} /> : null}
          <DataTable
            rows={list.visible}
            columns={columns}
            rowKey={(row) => row.id}
            rowHref={(row) => href(row.path)}
            caption={t('console.alerts.recent')}
            loading={alerts.isLoading ? <SkeletonRows rows={6} /> : undefined}
            empty={<EmptyState icon="bell" title={t('console.alerts.empty')} body={t('console.alerts.emptyBody')} />}
            mobile={(row) => (
              <>
                <IconTile icon={ALERT_ICON[row.kind]} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-xs text-fg-muted">{t(`console.alerts.kinds.${row.kind}`)}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{fmt.relative(row.created_at)}</span>
                  </div>
                  <span className="font-semibold text-fg">{row.kind === 'test' ? t('console.alerts.testTitle') : row.title}</span>
                  <span className="flex flex-wrap gap-1.5">{status(row, 'email')}{status(row, 'push')}</span>
                </div>
              </>
            )}
          />
          {list.more ? <Button variant="secondary" label={t('console.list.loadMore')} className="self-center" onClick={list.showMore} /> : null}
        </Section>
      </div>
    </div>
  );
}
