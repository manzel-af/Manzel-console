'use client';

/**
 * One building, all of it (the app's admin/building.tsx): its numbers, its
 * staff and unused invites, and everything an operator may do to it — edit
 * its details, take a manager's place in it (used in the Manzel app), issue
 * a manager invite, end a staff member's access, revoke an invite, close or
 * reopen it, and delete it while it has never billed anyone.
 *
 * Every action is confirmed first, and every one is written to the audit log
 * on the server with the operator as actor.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useState, type ReactNode } from 'react';

import { InviteCode } from '@/components/invite-code';
import { Button, ButtonLink, IconButton } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { TextArea } from '@/components/ui/form';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Card, DetailGrid, DetailItem, IconTile, PageHeader, RowList, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  deleteBuilding, endMembershipAsOperator, enterBuilding, issueManagerInvite, refreshAdmin, revokeInvite,
  setBuildingActive, useAdminBuildingDetail,
} from '@/lib/api/admin';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminInvite, AdminStaffMember } from '@/lib/supabase/database.types';
import { dotted, isolate } from '@/lib/text';

type Confirm =
  | { kind: 'reactivate' | 'delete' | 'leave' }
  | { kind: 'endStaff'; member: AdminStaffMember }
  | { kind: 'revoke'; invite: AdminInvite };

export function BuildingScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fmt = useFormat();
  const errorText = useErrorText();
  const detail = useAdminBuildingDetail(id);

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ inviteCode: string; expiresAt: string } | null>(null);

  const d = detail.data;
  if (detail.isPending) return <PageSkeleton tiles rows={4} />;
  if (!d) {
    return (
      <div>
        <PageHeader title={t('admin.buildings.title')} back={href('/buildings')} backLabel={t('admin.buildings.title')} />
        <EmptyState icon="building" title={detail.error ? errorText(detail.error) : t('admin.errors.notFound')} />
      </div>
    );
  }

  const building = d.building;
  const hasRecords = d.invoices > 0 || d.payments > 0;

  /** One action: busy state, errors in the page's language, lists fetched again. */
  const run = async (key: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await refreshAdmin(queryClient);
      if (done) toast.show(done);
      return true;
    } catch (caught) {
      setError(errorText(caught));
      return false;
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const onConfirm = async () => {
    if (!confirm) return;
    switch (confirm.kind) {
      case 'reactivate':
        await run('reactivate', () => setBuildingActive(building.id, true), t('admin.building.reactivated'));
        break;
      case 'delete':
        if (await run('delete', () => deleteBuilding(building.id), t('admin.building.deleted'))) router.push(href('/buildings'));
        break;
      case 'leave':
        await run('leave', () => endMembershipAsOperator(d.my_membership_id!), t('admin.building.left'));
        break;
      case 'endStaff':
        await run('endStaff', () => endMembershipAsOperator(confirm.member.membership_id), t('admin.building.accessEnded'));
        break;
      case 'revoke':
        await run('revoke', () => revokeInvite(confirm.invite.id), t('admin.building.inviteRevoked'));
        break;
    }
  };

  const confirmCopy = confirm ? {
    reactivate: { title: t('admin.building.reactivateTitle', { name: building.name }), body: t('admin.building.reactivateBody'),
      label: t('admin.building.reactivate'), danger: false },
    delete: { title: t('admin.building.deleteTitle', { name: building.name }), body: t('admin.building.deleteBody'),
      label: t('common.delete'), danger: true },
    leave: { title: t('admin.building.leaveTitle'), body: t('admin.building.leaveBody'),
      label: t('admin.building.leave'), danger: true },
    endStaff: { title: t('admin.building.endTitle', { name: confirm.kind === 'endStaff' ? confirm.member.full_name : '' }),
      body: t('admin.building.endBody'), label: t('admin.building.end'), danger: true },
    revoke: { title: t('admin.building.revokeTitle'), body: t('admin.building.revokeBody'),
      label: t('admin.building.revoke'), danger: true },
  }[confirm.kind] : null;

  return (
    <div>
      <PageHeader
        back={href('/buildings')}
        backLabel={t('admin.buildings.title')}
        title={building.name}
        subtitle={dotted(isolate(building.code), building.city)}
        badge={building.active
          ? <Badge tone="success" dot label={t('admin.buildings.active')} />
          : <Badge tone="danger" label={t('admin.buildings.suspendedOne')} />}
        actions={(
          <>
            <ButtonLink href={href(`/audit?building=${building.id}`)} icon="activity" label={t('admin.audit.title')} />
            <ButtonLink href={href(`/buildings/${building.id}/edit`)} icon="edit" label={t('common.edit')} variant="primary" />
          </>
        )}
      />

      <div className="flex flex-col gap-6">
        {!building.active ? (
          <Callout tone="danger" icon="lock" title={t('admin.building.suspendedTitle')}
            body={building.suspension_reason ? `${t('admin.building.suspendedBody')} — ${building.suspension_reason}` : t('admin.building.suspendedBody')}
            action={<Button size="sm" label={t('admin.building.reactivate')} onClick={() => setConfirm({ kind: 'reactivate' })} />} />
        ) : null}
        {error ? <Callout tone="danger" title={error} /> : null}

        {/* ---- numbers ---------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Metric icon="home" label={t('admin.building.flats')}
            value={t('admin.home.occupied', { n: fmt.number(d.flats_occupied), total: fmt.number(d.flats) })} />
          <Metric icon="users" label={t('admin.building.people')} value={fmt.number(d.members)}
            note={t('admin.home.residents', { n: fmt.number(d.residents) })} />
          <Metric icon="wallet" label={t('admin.home.outstanding')}
            value={<span className={d.outstanding_minor > 0 ? 'text-danger' : undefined}>
              {fmt.money(d.outstanding_minor, { currency: building.default_currency })}</span>} />
          <Metric icon="receipt" label={t('admin.home.collected30', { n: fmt.number(30) })}
            value={<span className="text-success">{fmt.money(d.collected_30d_minor, { currency: building.default_currency })}</span>} />
          <Metric icon="wrench" label={t('admin.home.repairs')} value={fmt.number(d.tickets_open)} />
          <Metric icon="clock" label={t('admin.building.lastActivity')}
            value={d.last_activity ? fmt.relative(d.last_activity) : t('admin.building.never')} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* ---- staff ---------------------------------------------------- */}
          <Section title={t('admin.building.staff', { n: fmt.number(d.staff.length) })}>
            {d.staff.length === 0 ? (
              <Card><p className="text-fg-muted">{t('manage.admin.noManager')}</p></Card>
            ) : (
              <RowList>
                {d.staff.map((member) => (
                  <div key={member.membership_id} className="flex items-center gap-3 px-4 py-3">
                    <IconTile icon={member.role === 'super_admin' ? 'shield' : member.role === 'manager' ? 'key' : 'user'}
                      tone={member.role === 'super_admin' ? 'accent' : 'primary'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fg">{member.full_name}</p>
                      <p className="truncate text-sm text-fg-muted">
                        {t(`roles.${member.role}`)}
                        {member.phone ? <> · <bdi dir="ltr">{member.phone}</bdi></> : null}
                      </p>
                    </div>
                    <ButtonLink href={href(`/people/${member.profile_id}`)} size="sm" variant="ghost" icon="user"
                      label={t('admin.users.open')} className="hidden sm:inline-flex" />
                    {member.membership_id !== d.my_membership_id ? (
                      <IconButton icon="close" size="sm" label={t('admin.building.end')} className="text-danger"
                        onClick={() => setConfirm({ kind: 'endStaff', member })} />
                    ) : null}
                  </div>
                ))}
              </RowList>
            )}

            {d.invites.length > 0 ? (
              <>
                <h3 className="mt-2 text-sm font-semibold text-fg-subtle">{t('admin.building.invites', { n: fmt.number(d.invites.length) })}</h3>
                <RowList>
                  {d.invites.map((open) => (
                    <div key={open.id} className="flex items-center gap-3 px-4 py-3">
                      <IconTile icon="key" size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-semibold text-fg"><bdi dir="ltr">{open.code}</bdi></p>
                        <p className="truncate text-sm text-fg-muted">
                          {dotted(
                            t(`roles.${open.role}`),
                            t('admin.building.inviteUses', { n: fmt.number(open.used_count), max: fmt.number(open.max_uses) }),
                            t('admin.building.expires', { date: fmt.date(open.expires_at, 'medium') }),
                          )}
                        </p>
                      </div>
                      <IconButton icon="trash" size="sm" label={t('admin.building.revoke')} className="text-danger"
                        onClick={() => setConfirm({ kind: 'revoke', invite: open })} />
                    </div>
                  ))}
                </RowList>
              </>
            ) : null}
          </Section>

          <div className="flex flex-col gap-6">
            {/* ---- access --------------------------------------------------- */}
            <Section title={t('admin.building.access')}>
              <Card className="flex flex-col gap-4">
                <ActionRow icon="key" title={d.my_membership_id ? t('admin.building.openAgain') : t('admin.building.open')}
                  body={t('admin.building.openBody')}
                  action={<Button size="sm" variant="secondary" label={t('common.confirm')} loading={busy === 'enter'}
                    disabled={Boolean(busy)}
                    onClick={() => void run('enter', () => enterBuilding(building.id), t('console.buildings.openedInApp', { name: building.name }))} />} />
                <ActionRow icon="plus" title={t('console.buildings.newInvite')} body={t('admin.building.inviteBody')}
                  action={<Button size="sm" variant="secondary" label={t('manage.admin.managerInvite')} loading={busy === 'invite'}
                    disabled={Boolean(busy)}
                    onClick={() => void run('invite', async () => setInvite(await issueManagerInvite(building.code)))} />} />
                {d.my_membership_id ? (
                  <ActionRow icon="logout" title={t('admin.building.leave')} body={t('admin.building.leaveHint')}
                    action={<Button size="sm" variant="soft-danger" label={t('admin.building.leave')}
                      onClick={() => setConfirm({ kind: 'leave' })} />} />
                ) : null}
              </Card>
            </Section>

            {/* ---- details -------------------------------------------------- */}
            <Section title={t('admin.building.details')}>
              <Card>
                <DetailGrid className="lg:grid-cols-2">
                  <DetailItem label={t('manage.building.billingDay')}>{fmt.number(building.billing_day)}</DetailItem>
                  <DetailItem label={t('manage.building.dueDays')}>{fmt.number(building.due_days)}</DetailItem>
                  <DetailItem label={t('admin.building.currency')}>{building.default_currency}</DetailItem>
                  <DetailItem label={t('admin.building.created')}>{fmt.date(building.created_at, 'medium')}</DetailItem>
                  {building.address ? (
                    <DetailItem label={t('manage.register.address')} className="sm:col-span-2">{building.address}</DetailItem>
                  ) : null}
                </DetailGrid>
              </Card>
            </Section>

            {/* ---- danger zone ---------------------------------------------- */}
            <Section title={t('admin.dangerZone')}>
              <Card className="flex flex-col gap-3 border-danger/30">
                <div className="flex flex-wrap gap-2">
                  {building.active ? (
                    <Button label={t('admin.building.suspend')} icon="lock" variant="secondary"
                      onClick={() => { setSuspendReason(''); setSuspending(true); }} />
                  ) : (
                    <Button label={t('admin.building.reactivate')} icon="check"
                      onClick={() => setConfirm({ kind: 'reactivate' })} />
                  )}
                  <Button label={t('admin.building.delete')} icon="trash" variant="danger" disabled={hasRecords}
                    onClick={() => setConfirm({ kind: 'delete' })} />
                </div>
                <p className="text-sm text-fg-muted">
                  {hasRecords ? t('admin.errors.buildingHasRecords') : t('admin.building.deleteHint')}
                </p>
              </Card>
            </Section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => void onConfirm()}
        title={confirmCopy?.title ?? ''}
        body={confirmCopy?.body}
        confirmLabel={confirmCopy?.label ?? t('common.confirm')}
        tone={confirmCopy?.danger ? 'danger' : 'primary'}
        loading={Boolean(busy)}
      />

      {/* Closing a building must say why: its people read it on the screen that locks them out. */}
      <Dialog
        open={suspending}
        onClose={() => setSuspending(false)}
        dismissible={busy !== 'suspend'}
        title={t('admin.building.suspendTitle', { name: building.name })}
        description={t('admin.building.suspendBody')}
        footer={(
          <>
            <Button variant="ghost" label={t('common.cancel')} onClick={() => setSuspending(false)} disabled={busy === 'suspend'} />
            <Button variant="danger" icon="lock" label={t('admin.building.suspend')} loading={busy === 'suspend'}
              disabled={suspendReason.trim().length < 3}
              onClick={async () => {
                const ok = await run('suspend', () => setBuildingActive(building.id, false, suspendReason), t('admin.building.suspended'));
                if (ok) { setSuspending(false); setSuspendReason(''); }
              }} />
          </>
        )}
      >
        <TextArea label={t('admin.building.suspendReason')} hint={t('admin.building.suspendReasonHint')} required
          value={suspendReason} onChange={(event) => setSuspendReason(event.target.value)} maxLength={500} rows={3} />
      </Dialog>

      <Dialog open={Boolean(invite)} onClose={() => setInvite(null)} title={t('manage.admin.managerInviteCreated')}>
        {invite ? (
          <InviteCode code={invite.inviteCode} expiresAt={invite.expiresAt} body={t('manage.admin.managerInviteBody')}
            onDone={() => setInvite(null)} />
        ) : null}
      </Dialog>
    </div>
  );
}

function Metric({ icon, label, value, note }: { icon: IconName; label: string; value: ReactNode; note?: string }) {
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <span className="flex items-center gap-2 text-sm text-fg-muted">
        <Icon name={icon} size={16} />
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate font-bold text-fg tabular-nums">{value}</span>
      {note ? <span className="truncate text-xs text-fg-subtle">{note}</span> : null}
    </Card>
  );
}

function ActionRow({ icon, title, body, action }: { icon: IconName; title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <IconTile icon={icon} size="sm" tone="primary" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-semibold text-fg">{title}</p>
        <p className="text-sm text-fg-muted">{body}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
