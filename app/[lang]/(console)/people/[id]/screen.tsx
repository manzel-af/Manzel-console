'use client';

/**
 * One person's account (the app's admin/user.tsx).
 *
 * Who they are and how to reach them, when they were last here and on what,
 * every building they belong or belonged to, and what an operator may do:
 * correct their name (and their contact number, while they have no verified
 * one — a verified number is a sign-in identity and changes only by
 * verifying), end a membership, make them an operator or revoke it, suspend
 * or unsuspend the account, give them a one-time sign-in code, and delete an
 * account that never did anything.
 *
 * Suspending and deleting go through the admin-users edge function (GoTrue's
 * admin API); the rest are admin_* functions. Nothing here acts on the
 * operator's own account.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import { SignInCodeDialog } from '@/components/sign-in-code-dialog';
import { Button, ButtonLink, IconButton } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { Field, TextArea } from '@/components/ui/form';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { PresenceDot } from '@/components/ui/presence-dot';
import { Card, DetailGrid, DetailItem, IconTile, PageHeader, RowList, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  accountAction, endMembershipAsOperator, refreshAdmin, resetMfa, setOperator, updateUser, useAccountStatusOf, useAdminUserDetail,
  useMfaStatus,
} from '@/lib/api/admin';
import { clearPicked, setPicked, useLastSeen } from '@/lib/api/people';
import { useAuth } from '@/lib/auth/auth';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminUserDetail } from '@/lib/supabase/database.types';
import { dotted, telHref } from '@/lib/text';

type Membership = AdminUserDetail['memberships'][number];
type Confirm =
  | { kind: 'grant' | 'revoke' | 'unsuspend' | 'delete' | 'mfa' }
  | { kind: 'end'; membership: Membership };

export function PersonScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fmt = useFormat();
  const auth = useAuth();
  const errorText = useErrorText();
  const lastSeen = useLastSeen();
  const detail = useAdminUserDetail(id);
  const status = useAccountStatusOf(id);
  const mfa = useMfaStatus(id, detail.data?.is_operator === true);

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [editing, setEditing] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [helping, setHelping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const u = detail.data;
  if (detail.isPending) return <PageSkeleton tiles rows={4} />;
  if (!u) {
    return (
      <div>
        <PageHeader title={t('admin.users.title')} back={href('/people')} backLabel={t('admin.users.title')} />
        <EmptyState icon="user" title={detail.error ? errorText(detail.error) : t('admin.errors.notFound')} />
      </div>
    );
  }

  const isSelf = u.profile_id === auth.user?.id;
  const active = u.memberships.filter((membership) => membership.active);
  const past = u.memberships.filter((membership) => !membership.active);

  /** `gone`: the action removed this person, so their page is not asked for again. */
  const run = async (action: () => Promise<unknown>, done: string, gone?: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refreshAdmin(queryClient, gone);
      toast.show(done);
      return true;
    } catch (caught) {
      setError(errorText(caught));
      return false;
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const onConfirm = async () => {
    if (!confirm) return;
    switch (confirm.kind) {
      case 'grant':
      case 'revoke':
        await run(() => setOperator(u.profile_id, confirm.kind === 'grant'),
          confirm.kind === 'grant' ? t('admin.user.granted') : t('admin.user.revoked'));
        break;
      case 'unsuspend':
        await run(() => accountAction(u.profile_id, 'unsuspend'), t('admin.user.unsuspended'));
        break;
      case 'delete':
        if (await run(() => accountAction(u.profile_id, 'delete'), t('admin.user.deleted'), u.profile_id)) router.push(href('/people'));
        break;
      case 'end':
        await run(() => endMembershipAsOperator(confirm.membership.membership_id), t('admin.building.accessEnded'));
        break;
      case 'mfa':
        if (await run(() => resetMfa(u.profile_id), t('console.mfa.resetDone'))) void mfa.refetch();
        break;
    }
  };

  const confirmCopy = confirm ? {
    grant: { title: t('admin.user.grantTitle', { name: u.full_name }), body: t('admin.user.grantBody'),
      label: t('admin.user.grant'), danger: false },
    revoke: { title: t('admin.user.revokeTitle', { name: u.full_name }), body: t('admin.user.revokeBody'),
      label: t('admin.user.revoke'), danger: true },
    unsuspend: { title: t('admin.user.unsuspendTitle', { name: u.full_name }), body: t('admin.user.unsuspendBody'),
      label: t('admin.user.unsuspend'), danger: false },
    delete: { title: t('admin.user.deleteTitle', { name: u.full_name }), body: t('admin.user.deleteBody'),
      label: t('common.delete'), danger: true },
    end: { title: t('admin.building.endTitle', { name: confirm.kind === 'end' ? confirm.membership.building_name : '' }),
      body: t('admin.building.endBody'), label: t('admin.building.end'), danger: true },
    mfa: { title: t('console.mfa.resetTitle', { name: u.full_name }), body: t('console.mfa.resetBody'),
      label: t('console.mfa.reset'), danger: true },
  }[confirm.kind] : null;

  const membershipRow = (membership: Membership) => (
    <div key={membership.membership_id} className="flex items-center gap-3 px-4 py-3">
      <IconTile icon={membership.role === 'resident' ? 'home' : membership.role === 'super_admin' ? 'shield' : 'key'}
        tone={membership.active ? 'primary' : 'default'} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-fg">{membership.building_name}</p>
        <p className="truncate text-sm text-fg-muted">
          {t(`roles.${membership.role}`)}
          {membership.unit_label ? <> · <bdi dir="ltr">{membership.unit_label}</bdi></> : null}
          {' · '}{fmt.date(membership.created_at, 'medium')}
        </p>
      </div>
      <ButtonLink href={href(`/buildings/${membership.building_id}`)} size="sm" variant="ghost" icon="building"
        label={t('admin.buildings.open')} className="hidden sm:inline-flex" />
      {membership.active ? (
        <IconButton icon="close" size="sm" label={t('admin.building.end')} className="text-danger"
          onClick={() => setConfirm({ kind: 'end', membership })} />
      ) : null}
    </div>
  );

  return (
    <div>
      <PageHeader
        back={href('/people')}
        backLabel={t('admin.users.title')}
        title={u.full_name || t('admin.users.noName')}
        subtitle={t('manage.admin.since', { date: fmt.date(u.created_at, 'medium') })}
        badge={(
          <span className="flex flex-wrap gap-1.5">
            {isSelf ? <Badge tone="primary" icon="user" label={t('admin.user.you')} /> : null}
            {u.is_operator ? <Badge tone="accent" icon="shield" label={t('admin.users.operator')} /> : null}
            {u.suspended ? <Badge tone="danger" icon="lock" label={t('admin.users.suspendedOne')} /> : null}
          </span>
        )}
        actions={(
          <>
            <Button variant="secondary" icon="edit" label={t('common.edit')} onClick={() => {
              setName(u.full_name);
              setPhone(u.phone && !u.phone_verified ? u.phone : '');
              setError(null);
              setEditing(true);
            }} />
            <Button icon="send" label={t('admin.push.notifyPerson')} onClick={() => {
              clearPicked();
              setPicked([{ id: u.profile_id, name: u.full_name }]);
              router.push(href('/notifications/new'));
            }} />
          </>
        )}
      />

      <div className="flex flex-col gap-6">
        {u.suspended ? (
          <Callout tone="danger" icon="lock" title={t('admin.user.suspendedTitle')}
            body={status.data?.reason ? t('admin.user.suspendedWhy', { reason: status.data.reason }) : t('admin.user.suspendedBody')} />
        ) : null}
        {error && !editing && !suspending ? <Callout tone="danger" title={error} /> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex flex-col gap-6">
            {/* ---- when they were last here, and on what (V023) ------------ */}
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <PresenceDot online={u.presence.online} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fg">{lastSeen({ online: u.presence.online, last_seen_at: u.presence.last_seen_at })}</p>
                  <p className="text-sm text-fg-muted">
                    {dotted(
                      u.presence.platform ? t(`admin.presence.platform.${u.presence.platform}`) : null,
                      u.presence.app_version ? `v${u.presence.app_version}` : null,
                      t('admin.presence.notifications', { received: fmt.number(u.notifications.received), read: fmt.number(u.notifications.read) }),
                    )}
                  </p>
                </div>
                <Badge tone={u.devices.length > 0 ? 'success' : 'neutral'} icon="bell"
                  label={u.devices.length > 0 ? t('admin.presence.devices', { n: fmt.number(u.devices.length) }) : t('admin.presence.noDevice')} />
              </div>
              {u.devices.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {u.devices.map((device, index) => (
                    <li key={index} className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm">
                      <IconTile icon="smartphone" size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-fg">
                          {t(`admin.presence.platform.${device.platform}`)}
                          {device.app_version ? <span className="font-normal text-fg-muted"> · <bdi dir="ltr">v{device.app_version}</bdi></span> : null}
                        </span>
                        <span className="block text-xs text-fg-muted">{t('admin.presence.lastSeen', { when: fmt.relative(device.last_seen_at) })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-fg-muted">{t('admin.presence.noDeviceHint')}</p>}
            </Card>

            {/* ---- buildings ------------------------------------------------ */}
            <Section title={t('admin.user.buildings', { n: fmt.number(active.length) })}>
              {active.length === 0
                ? <Card><p className="text-fg-muted">{t('admin.users.noBuilding')}</p></Card>
                : <RowList>{active.map(membershipRow)}</RowList>}
            </Section>
            {past.length > 0 ? (
              <Section title={t('admin.user.pastBuildings', { n: fmt.number(past.length) })}>
                <RowList>{past.map(membershipRow)}</RowList>
              </Section>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            {/* ---- contact ---------------------------------------------- */}
            <Card className="flex flex-col gap-4">
              <DetailGrid className="sm:grid-cols-1 lg:grid-cols-1">
                <DetailItem label={t('admin.user.phone')}>
                  <span className="flex flex-wrap items-center gap-2">
                    {u.phone ? <bdi dir="ltr" className="font-semibold">{u.phone}</bdi> : t('manage.admin.noPhone')}
                    <Badge tone={u.phone_verified ? 'success' : 'neutral'} icon="phone"
                      label={u.phone_verified ? t('admin.user.phoneVerified') : t('admin.user.phoneUnverified')} />
                    {u.phone ? <ButtonLink href={telHref(u.phone)} size="sm" variant="ghost" icon="phone" label={t('manage.admin.call')} /> : null}
                  </span>
                </DetailItem>
                <DetailItem label={t('admin.user.email')}>
                  {u.email ? <bdi dir="ltr">{u.email}</bdi> : t('admin.user.noEmail')}
                </DetailItem>
                <DetailItem label={t('admin.user.lastSignIn')}>
                  {u.last_sign_in_at ? fmt.relative(u.last_sign_in_at) : t('admin.building.never')}
                </DetailItem>
              </DetailGrid>
            </Card>

            {/* ---- activity -------------------------------------------- */}
            <div className="grid grid-cols-3 gap-3">
              {[
                [u.activity.payments_recorded, t('admin.user.payments')],
                [u.activity.tickets, t('admin.user.tickets')],
                [u.activity.notices, t('admin.user.notices')],
              ].map(([value, label]) => (
                <Card key={String(label)} className="flex flex-col gap-1 p-4">
                  <span className="text-xl font-bold text-fg tabular-nums">{fmt.number(value as number)}</span>
                  <span className="line-clamp-2 text-xs text-fg-muted">{label}</span>
                </Card>
              ))}
            </div>

            {/* ---- an operator's second step (V037) ---------------------- */}
            {u.is_operator ? (
              <Card className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <IconTile icon="shieldCheck" tone={(mfa.data?.verified ?? 0) > 0 ? 'success' : 'warning'} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{t('console.mfa.title')}</p>
                    <p className="text-sm text-fg-muted">
                      {mfa.isLoading ? t('common.loading') : (mfa.data?.verified ?? 0) > 0
                        ? t('console.mfa.statusOn', { n: fmt.number(mfa.data?.verified ?? 0) })
                        : t('console.mfa.statusOff')}
                    </p>
                  </div>
                </div>
                {isSelf ? (
                  <ButtonLink href={href('/account')} variant="secondary" icon="user" label={t('console.nav.account')} full />
                ) : (mfa.data?.verified ?? 0) + (mfa.data?.unverified ?? 0) > 0 ? (
                  <>
                    <Button variant="secondary" icon="undo" label={t('console.mfa.reset')} full onClick={() => setConfirm({ kind: 'mfa' })} />
                    <p className="text-xs text-fg-muted">{t('console.mfa.resetHint')}</p>
                  </>
                ) : null}
              </Card>
            ) : null}

            {/* ---- getting them back in (V030) ------------------------- */}
            {!isSelf ? (
              <Card className="flex flex-col gap-2">
                <Button variant="secondary" icon="key" label={t('recovery.helpButton')} full onClick={() => setHelping(true)} />
                <p className="text-xs text-fg-muted">{t('recovery.operatorHint')}</p>
              </Card>
            ) : null}

            {/* ---- the account ------------------------------------------ */}
            {!isSelf ? (
              <Section title={t('admin.dangerZone')}>
                <Card className="flex flex-col gap-3 border-danger/30">
                  {u.is_operator ? (
                    <Button variant="secondary" icon="shield" label={t('admin.user.revoke')} full onClick={() => setConfirm({ kind: 'revoke' })} />
                  ) : (
                    <Button variant="secondary" icon="shield" label={t('admin.user.grant')} full onClick={() => setConfirm({ kind: 'grant' })} />
                  )}
                  {u.suspended ? (
                    <Button icon="check" label={t('admin.user.unsuspend')} full onClick={() => setConfirm({ kind: 'unsuspend' })} />
                  ) : (
                    <Button variant="secondary" icon="lock" label={t('admin.user.suspend')} full disabled={u.is_operator}
                      onClick={() => { setReason(''); setError(null); setSuspending(true); }} />
                  )}
                  <Button variant="danger" icon="trash" label={t('admin.user.delete')} full disabled={!u.deletable || u.is_operator}
                    onClick={() => setConfirm({ kind: 'delete' })} />
                  <p className="text-xs text-fg-muted">
                    {u.is_operator ? t('admin.errors.isOperator') : u.deletable ? t('admin.user.deleteHint') : t('admin.errors.hasHistory')}
                  </p>
                </Card>
              </Section>
            ) : (
              <p className="text-center text-sm text-fg-muted">{t('admin.errors.self')}</p>
            )}
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
        loading={busy}
      />

      <Dialog
        open={suspending}
        onClose={() => setSuspending(false)}
        dismissible={!busy}
        title={t('admin.user.suspendTitle', { name: u.full_name })}
        description={t('admin.user.suspendBody')}
        footer={(
          <>
            <Button variant="ghost" label={t('common.cancel')} onClick={() => setSuspending(false)} disabled={busy} />
            <Button variant="danger" icon="lock" label={t('admin.user.suspend')} loading={busy} disabled={reason.trim().length < 3}
              onClick={async () => {
                const ok = await run(() => accountAction(u.profile_id, 'suspend', reason), t('admin.user.suspended'));
                if (ok) { setSuspending(false); setReason(''); }
              }} />
          </>
        )}
      >
        <div className="flex flex-col gap-3">
          <TextArea label={t('admin.user.reason')} hint={t('admin.user.reasonHint')} required rows={3} maxLength={500}
            value={reason} onChange={(event) => setReason(event.target.value)} />
          {error ? <Callout tone="danger" title={error} /> : null}
        </div>
      </Dialog>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        dismissible={!busy}
        title={t('admin.user.edit')}
        footer={(
          <>
            <Button variant="ghost" label={t('common.cancel')} onClick={() => setEditing(false)} disabled={busy} />
            <Button icon="check" label={t('common.save')} loading={busy} disabled={name.trim().length < 1}
              onClick={async () => {
                const ok = await run(() => updateUser(u.profile_id, name, u.phone_verified ? null : phone.trim()), t('admin.saved'));
                if (ok) setEditing(false);
              }} />
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <Field label={t('admin.user.name')} required icon="user" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          {u.phone_verified ? (
            <p className="text-sm text-fg-muted">{t('admin.user.phoneLocked')}</p>
          ) : (
            <Field label={t('admin.user.contactPhone')} icon="phone" type="tel" dir="ltr" maxLength={20} placeholder="07X XXX XXXX"
              hint={t('admin.user.contactPhoneHint')} value={phone} onChange={(event) => setPhone(event.target.value)} />
          )}
          {error ? <Callout tone="danger" title={error} /> : null}
        </div>
      </Dialog>

      <SignInCodeDialog open={helping} onClose={() => setHelping(false)} profileId={u.profile_id} name={u.full_name} />
    </div>
  );
}
