'use client';

/**
 * Reported messages from every building's room (V033, the app's
 * chat/reports.tsx). Each shows what the message said when it was reported,
 * who said it, why, and who reported it. Remove takes it out of the room for
 * everyone; Keep leaves it. Either answers every report of that message.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge, Callout, EmptyState, SkeletonRows } from '@/components/ui/feedback';
import { Card, PageHeader } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import { resolveReport, supportKeys, useChatReports } from '@/lib/api/support';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import type { ChatReport } from '@/lib/supabase/database.types';

export function ReportsScreen() {
  const t = useT();
  const toast = useToast();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const reports = useChatReports();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = reports.data ?? [];

  const answer = async (report: ChatReport, action: 'remove' | 'keep') => {
    setBusy(report.id);
    setError(null);
    try {
      await resolveReport(report.id, action);
      await queryClient.invalidateQueries({ queryKey: supportKeys.reports });
      toast.show(action === 'remove' ? t('safety.reports.removed') : t('safety.reports.kept'));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title={t('safety.reports.title')} subtitle={t('safety.reports.lead')}
        badge={rows.length > 0 ? <Badge tone="warning" label={fmt.number(rows.length)} /> : null} />
      {error ? <Callout tone="danger" title={error} className="mb-4" /> : null}
      {reports.isPending ? <SkeletonRows rows={3} /> : reports.error ? (
        <Callout tone="danger" title={errorText(reports.error)} />
      ) : rows.length === 0 ? (
        <EmptyState icon="flag" title={t('safety.reports.empty')} body={t('safety.reports.emptyBody')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((report) => (
            <Card key={report.id} as="article" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="danger" icon="flag" label={t(`safety.reasons.${report.reason}`)} />
                <Badge icon="building" label={report.building_name} />
                {report.message_removed ? <Badge tone="success" label={t('safety.reports.alreadyRemoved')} /> : null}
                <span className="text-xs text-fg-subtle">{fmt.relative(report.created_at)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-fg">{report.reported_name ?? t('chat.formerMember')}</p>
                <div className="rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-fg">
                  {report.message_body
                    ? <bdi className="whitespace-pre-wrap">{report.message_body}</bdi>
                    : report.had_attachment ? t('safety.reports.attachmentOnly') : '—'}
                </div>
                <p className="text-sm text-fg-muted">{t('safety.reports.by', { name: report.reporter_name ?? t('chat.formerMember') })}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
                {report.message_removed ? (
                  <Button variant="secondary" icon="check" label={t('safety.reports.done')} loading={busy === report.id}
                    disabled={busy !== null} onClick={() => void answer(report, 'remove')} />
                ) : (
                  <>
                    <Button variant="danger" icon="trash" label={t('safety.reports.remove')} loading={busy === report.id}
                      disabled={busy !== null} onClick={() => void answer(report, 'remove')} />
                    <Button variant="secondary" label={t('safety.reports.keep')} disabled={busy !== null}
                      onClick={() => void answer(report, 'keep')} />
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
