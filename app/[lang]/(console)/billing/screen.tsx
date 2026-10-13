'use client';

/**
 * Who has paid the platform fee, and who has not (V025, the app's
 * admin/billing.tsx).
 *
 * The money arrives outside the app — cash, a transfer, a wallet — so the
 * operator records it here and the building opens again by itself: marking
 * the fee paid clears a fee_overdue closure the moment nothing is overdue,
 * and every phone in the building hears of it in seconds.
 *
 * "Waive" closes a month that should not be charged at all, without money.
 * "Undo" puts back a month marked by mistake. "Issue this month" runs the
 * nightly pass now — this month's fees, then closing whatever is past due;
 * running it twice changes nothing.
 */

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState, SkeletonRows, StatTile, type BadgeTone } from '@/components/ui/feedback';
import { Segmented, TextArea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/surfaces';
import { DataTable, type Column } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  markFeePaid, refreshBilling, runBilling, unmarkFeePaid, useAdminBilling, waiveFee, type AdminBillingFilter,
} from '@/lib/api/billing';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminBuildingBilling, BuildingFeeStatus, PlatformFeeMethod } from '@/lib/supabase/database.types';
import { dotted } from '@/lib/text';
import { useOnline } from '@/lib/use-online';

const TABS: AdminBillingFilter[] = ['unpaid', 'overdue', 'paid', 'all'];

const STATUS_TONE: Record<BuildingFeeStatus, BadgeTone> = {
  none: 'neutral',
  open: 'warning',
  overdue: 'danger',
  paid: 'success',
  waived: 'neutral',
};

const METHODS: PlatformFeeMethod[] = ['cash', 'transfer', 'wallet', 'other'];

type ActionKind = 'pay' | 'waive' | 'undo';

/** Each action's words: the dialog's title and text, the note's label and hint, the button. */
const WORDS: Record<ActionKind, { title: string; body: string; note: string; hint: string; button: string }> = {
  pay: {
    title: 'admin.billing.markPaidTitle',
    body: 'admin.billing.markPaidBody',
    note: 'admin.billing.note',
    hint: 'admin.billing.noteHint',
    button: 'admin.billing.markPaid',
  },
  waive: {
    title: 'admin.billing.waiveTitle',
    body: 'admin.billing.waiveBody',
    note: 'admin.billing.reason',
    hint: 'admin.billing.reasonHint',
    button: 'admin.billing.waive',
  },
  undo: {
    title: 'admin.billing.undoTitle',
    body: 'admin.billing.undoBody',
    note: 'admin.billing.undoReason',
    hint: 'admin.billing.undoReasonHint',
    button: 'admin.billing.undo',
  },
};

export function BillingScreen() {
  const t = useT();
  const href = useHref();
  const fmt = useFormat();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const online = useOnline();

  const [tab, setTab] = useState<AdminBillingFilter>('unpaid');
  const rows = useAdminBilling(tab);
  const everything = useAdminBilling('all');

  const [action, setAction] = useState<{ kind: ActionKind; row: AdminBuildingBilling } | null>(null);
  const [method, setMethod] = useState<PlatformFeeMethod>('cash');
  const [note, setNote] = useState('');
  const [runNow, setRunNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = (kind: ActionKind, row: AdminBuildingBilling) => {
    setNote('');
    setMethod('cash');
    setError(null);
    setAction({ kind, row });
  };

  const act = async () => {
    const invoiceId = action?.row.invoice_id;
    if (!action || !invoiceId) return;
    setBusy(true);
    setError(null);
    try {
      if (action.kind === 'pay') {
        const result = await markFeePaid(invoiceId, method, note);
        toast.show(result.reopened ? t('admin.billing.paidAndOpened') : t('admin.billing.paid'));
      } else if (action.kind === 'waive') {
        await waiveFee(invoiceId, note);
        toast.show(t('admin.billing.waived'));
      } else {
        const result = await unmarkFeePaid(invoiceId, note);
        toast.show(result.closed ? t('admin.billing.undoneAndClosed') : t('admin.billing.undone'));
      }
      await refreshBilling(queryClient);
      setAction(null);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await runBilling();
      await refreshBilling(queryClient);
      toast.show(t('admin.billing.ranResult', { issued: fmt.number(result.issued), closed: fmt.number(result.closed) }));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setRunNow(false);
      setBusy(false);
    }
  };

  // The numbers at the top: every building, whatever the tab.
  const all = everything.data ?? [];
  const unpaid = all.filter((row) => row.status === 'open' || row.status === 'overdue').length;
  const overdue = all.filter((row) => row.status === 'overdue' || row.days_overdue > 0).length;
  const paid = all.filter((row) => row.status === 'paid').length;
  const owed = new Map<string, number>();
  for (const row of all) {
    const currency = row.currency ?? 'AFN';
    if (row.owed_minor > 0) owed.set(currency, (owed.get(currency) ?? 0) + row.owed_minor);
  }
  const owedText = owed.size === 0
    ? fmt.money(0)
    : [...owed].map(([currency, minor]) => fmt.money(minor, { currency })).join(' + ');

  const building = (row: AdminBuildingBilling) => (
    <span className="flex min-w-0 flex-col">
      <Link href={href(`/buildings/${row.building_id}`)} className="truncate font-semibold text-fg hover:text-primary hover:underline">
        {row.building_name}
      </Link>
      <span className="truncate text-xs text-fg-muted">
        <bdi dir="ltr">{row.building_code}</bdi>
        {' · '}
        {dotted(t('admin.billing.flats', { n: fmt.number(row.flats) }), row.period_start ? fmt.month(row.period_start) : null)}
      </span>
    </span>
  );

  const status = (row: AdminBuildingBilling) => (
    <span className="flex flex-wrap gap-1.5">
      <Badge tone={STATUS_TONE[row.status]} label={t(`fee.status.${row.status}`)} />
      {!row.active ? (
        <Badge tone="danger" icon="lock"
          label={row.suspension_code === 'fee_overdue' ? t('admin.billing.closedForFee') : t('admin.billing.closedByOperator')} />
      ) : null}
    </span>
  );

  const money = (row: AdminBuildingBilling) => (row.invoice_id ? (
    <span className="flex flex-col">
      <span className="font-semibold text-fg">{fmt.money(row.amount_minor ?? 0, { currency: row.currency ?? 'AFN' })}</span>
      {row.share_minor !== null ? (
        <span className="text-xs text-fg-muted">
          {t('fee.perFlat', { amount: fmt.money(row.share_minor, { currency: row.currency ?? 'AFN' }) })}
        </span>
      ) : null}
    </span>
  ) : <span className="text-sm text-fg-subtle">{t('admin.billing.notIssued')}</span>);

  const when = (row: AdminBuildingBilling) => (row.invoice_id ? (
    <span className="flex flex-col">
      <span className={row.days_overdue > 0 ? 'font-semibold text-danger' : 'text-fg-muted'}>
        {row.days_overdue > 0
          ? t('fee.daysOverdue', { n: fmt.number(row.days_overdue) })
          : row.paid_at
            ? t('fee.paidOn', { date: fmt.date(row.paid_at, 'medium') })
            : t('fee.dueOn', { date: row.due_date ? fmt.date(row.due_date, 'medium') : '—' })}
      </span>
      {row.unpaid_months > 1 ? (
        <span className="text-xs text-danger">
          {t('admin.billing.owes', {
            n: fmt.number(row.unpaid_months),
            amount: fmt.money(row.owed_minor, { currency: row.currency ?? 'AFN' }),
          })}
        </span>
      ) : null}
    </span>
  ) : null);

  const actions = (row: AdminBuildingBilling) => (
    <span className="flex flex-wrap justify-end gap-2">
      {row.status === 'open' || row.status === 'overdue' ? (
        <>
          <Button size="sm" icon="check" label={t('admin.billing.markPaid')} disabled={!online || busy}
            onClick={() => start('pay', row)} />
          <Button size="sm" variant="secondary" label={t('admin.billing.waive')} disabled={!online || busy}
            onClick={() => start('waive', row)} />
        </>
      ) : row.invoice_id && (row.status === 'paid' || row.status === 'waived') ? (
        <Button size="sm" variant="ghost" icon="undo" label={t('admin.billing.undo')} disabled={!online || busy}
          onClick={() => start('undo', row)} />
      ) : null}
    </span>
  );

  const columns: Column<AdminBuildingBilling>[] = [
    { key: 'building', header: t('console.list.building'), sort: (row) => row.building_name, cell: building },
    { key: 'status', header: t('console.list.status'), sort: (row) => row.status, cell: status },
    { key: 'amount', header: t('fee.thisMonth'), sort: (row) => row.amount_minor ?? 0, cell: money, hideBelow: 'lg' },
    { key: 'due', header: t('fee.due'), sort: (row) => row.days_overdue, cell: when },
    { key: 'actions', header: <span className="sr-only">{t('console.list.actions')}</span>, align: 'end', cell: actions },
  ];

  const words = action ? WORDS[action.kind] : null;
  const needsReason = action !== null && action.kind !== 'pay';

  return (
    <div>
      <PageHeader
        title={t('admin.billing.title')}
        subtitle={t('admin.billing.subtitle')}
        actions={<Button variant="secondary" icon="sync" label={t('admin.billing.runNow')} disabled={!online || busy}
          onClick={() => setRunNow(true)} />}
      />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon="clock" tone="warning" label={t('admin.billing.tabs.unpaid')} value={everything.data ? fmt.number(unpaid) : null} />
          <StatTile icon="alert" tone="danger" label={t('admin.billing.tabs.overdue')} value={everything.data ? fmt.number(overdue) : null} />
          <StatTile icon="check" tone="success" label={t('admin.billing.tabs.paid')} value={everything.data ? fmt.number(paid) : null} />
          <StatTile icon="wallet" tone="accent" label={t('console.billing.owed')} value={everything.data ? owedText : null} />
        </div>

        {error && !action ? <Callout tone="danger" title={error} /> : null}
        {rows.error ? <Callout tone="danger" title={errorText(rows.error)} /> : null}

        <Segmented<AdminBillingFilter>
          value={tab}
          onChange={setTab}
          label={t('console.list.filters')}
          options={TABS.map((value) => ({
            value,
            label: value === 'all' ? t('common.all') : t(`admin.billing.tabs.${value}`),
            icon: value === 'unpaid' ? 'clock' : value === 'overdue' ? 'alert' : value === 'paid' ? 'check' : 'building',
          }))}
        />

        <DataTable
          rows={rows.data ?? []}
          columns={columns}
          rowKey={(row) => row.building_id}
          caption={t('admin.billing.title')}
          loading={rows.isLoading ? <SkeletonRows rows={6} /> : undefined}
          empty={<EmptyState icon="receipt" title={t('admin.billing.empty')} body={t('admin.billing.emptyBody')} />}
          mobile={(row) => (
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">{building(row)}</div>
                {money(row)}
              </div>
              {status(row)}
              {when(row)}
              {actions(row)}
            </div>
          )}
        />
      </div>

      <Dialog
        open={action !== null}
        onClose={() => setAction(null)}
        dismissible={!busy}
        size="sm"
        title={action && words ? t(words.title, { building: action.row.building_name }) : ''}
        description={words ? t(words.body) : undefined}
        footer={action && words ? (
          <>
            <Button variant="ghost" label={t('common.cancel')} disabled={busy} onClick={() => setAction(null)} />
            <Button
              variant={action.kind === 'pay' ? 'primary' : 'danger'}
              icon={action.kind === 'pay' ? 'check' : action.kind === 'undo' ? 'undo' : undefined}
              label={t(words.button)}
              loading={busy}
              disabled={!online || (needsReason && note.trim().length < 3)}
              onClick={() => void act()}
            />
          </>
        ) : null}
      >
        {action && words ? (
          <div className="flex flex-col gap-4">
            {action.kind === 'pay' ? (
              <Segmented<PlatformFeeMethod>
                value={method}
                onChange={setMethod}
                label={t('admin.billing.markPaid')}
                options={METHODS.map((value) => ({ value, label: t(`fee.methods.${value}`) }))}
              />
            ) : null}
            <TextArea label={t(words.note)} hint={t(words.hint)} required={needsReason} value={note} maxLength={300} rows={2}
              onChange={(event) => setNote(event.target.value)} />
            {action.kind === 'undo' && action.row.days_overdue > 0 ? (
              <Callout tone="warning" title={t('admin.billing.undoWillClose')} />
            ) : null}
            {error ? <Callout tone="danger" title={error} /> : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={runNow}
        onClose={() => setRunNow(false)}
        onConfirm={() => void issue()}
        title={t('admin.billing.runNow')}
        body={t('admin.billing.runNowBody')}
        confirmLabel={t('admin.billing.runNow')}
        loading={busy}
      />
    </div>
  );
}
