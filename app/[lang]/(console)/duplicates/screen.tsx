'use client';

/**
 * Accounts that belong to the same person (V030, the app's
 * admin/duplicates.tsx), grouped by phone number.
 *
 * In each group, choose the account to KEEP — the one that can sign in on its
 * own (a verified phone or a real email) is listed first and chosen by
 * default — and merge the others into it: their buildings, roles and history
 * move to the kept account, and the extra login is deleted. Operators are
 * never removed by a merge, and nothing is merged without a confirmation that
 * names both accounts. It cannot be undone.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import { duplicatesKey, mergeAccounts, useDuplicateAccounts } from '@/lib/api/people';
import { useAuth } from '@/lib/auth/auth';
import { cn } from '@/lib/cn';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { DuplicateAccount, DuplicateGroup } from '@/lib/supabase/database.types';
import { dotted } from '@/lib/text';

export function DuplicatesScreen() {
  const t = useT();
  const fmt = useFormat();
  const errorText = useErrorText();
  const groups = useDuplicateAccounts();
  const rows = groups.data ?? [];

  return (
    <div>
      <PageHeader
        title={t('duplicates.title')}
        subtitle={t('duplicates.body')}
        badge={rows.length > 0 ? <Badge tone="warning" label={fmt.number(rows.length)} /> : null}
        actions={<Button variant="secondary" icon="sync" label={t('console.shell.refresh')}
          loading={groups.isFetching && !groups.isPending} onClick={() => void groups.refetch()} />}
      />
      {groups.isPending ? <PageSkeleton rows={3} /> : groups.error ? (
        <Callout tone="danger" title={errorText(groups.error)} />
      ) : rows.length === 0 ? (
        <EmptyState icon="users" title={t('duplicates.none')} body={t('duplicates.noneBody')} />
      ) : (
        <div className="flex flex-col gap-8">
          {rows.map((group) => <GroupView key={group.phone} group={group} />)}
        </div>
      )}
    </div>
  );
}

function GroupView({ group }: { group: DuplicateGroup }) {
  const t = useT();
  const href = useHref();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const fmt = useFormat();
  const auth = useAuth();
  // The first account can sign in on its own when any of them can: keep it.
  const [keepId, setKeepId] = useState(group.accounts[0]?.id ?? '');
  const [merging, setMerging] = useState<DuplicateAccount | null>(null);
  const [busy, setBusy] = useState(false);

  const kept = group.accounts.find((account) => account.id === keepId) ?? group.accounts[0];

  const merge = async () => {
    if (!merging || !kept) return;
    setBusy(true);
    try {
      const result = await mergeAccounts(kept.id, merging.id);
      toast.show(`${t('duplicates.merged', { name: kept.full_name })} — ${t('duplicates.mergedDetail', {
        n: fmt.number(result.memberships_moved + result.memberships_ended),
      })}`);
      setMerging(null);
      await queryClient.invalidateQueries({ queryKey: duplicatesKey });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    } catch (caught) {
      toast.show(errorText(caught), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={<bdi dir="ltr">{group.phone}</bdi>}>
      <div role="radiogroup" aria-label={group.phone} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {group.accounts.map((account) => {
          const keep = account.id === kept?.id;
          const blocked = account.operator || account.id === auth.user?.id;
          return (
            <div key={account.id}
              className={cn('flex flex-col gap-3 rounded-card border bg-surface p-4 shadow-card transition-colors',
                keep ? 'border-primary ring-2 ring-primary/15' : 'border-line')}>
              <button type="button" role="radio" aria-checked={keep} onClick={() => setKeepId(account.id)}
                className="flex items-start gap-3 text-start">
                <span className={cn('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                  keep ? 'border-primary' : 'border-line-strong')}>
                  {keep ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{account.full_name}</span>
                  <span className="block text-xs text-fg-subtle">
                    {dotted(
                      account.last_sign_in_at
                        ? t('duplicates.lastSignIn', { when: fmt.relative(account.last_sign_in_at) })
                        : t('duplicates.neverSignedIn'),
                      t('duplicates.created', { when: fmt.date(account.created_at) }),
                    )}
                  </span>
                </span>
                {keep ? <Badge tone="primary" label={t('duplicates.keep')} /> : null}
              </button>

              <div className="flex flex-wrap gap-1.5">
                {account.phone_verified ? <Badge tone="success" icon="phone" label={t('duplicates.signsInPhone')} />
                  : account.email_kind === 'email'
                    ? <Badge tone="success" icon="mail" label={account.email ?? t('duplicates.signsInEmail')} />
                    : <Badge tone="warning" icon="alert" label={t('duplicates.cannotSignIn')} />}
                {account.operator ? <Badge tone="accent" icon="shield" label={t('duplicates.operator')} /> : null}
              </div>

              {account.memberships.length === 0 ? (
                <p className="text-xs text-fg-subtle">{t('duplicates.noBuildings')}</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm text-fg-muted">
                  {account.memberships.map((membership, index) => (
                    <li key={`${membership.building_code}-${membership.role}-${index}`}>
                      {membership.building_name} · {t(`roles.${membership.role}`)}
                      {membership.unit_label ? <> · <bdi dir="ltr">{membership.unit_label}</bdi></> : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto flex flex-wrap gap-2">
                <ButtonLink href={href(`/people/${account.id}`)} size="sm" variant="ghost" icon="user" label={t('admin.users.open')} />
                {!keep ? (
                  <Button size="sm" variant="secondary" icon="users" disabled={blocked}
                    label={t('duplicates.mergeInto', { name: kept?.full_name ?? '' })} onClick={() => setMerging(account)} />
                ) : null}
              </div>
              {!keep && blocked ? <p className="text-xs text-fg-subtle">{t('duplicates.cannotRemove')}</p> : null}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(merging)}
        onClose={() => setMerging(null)}
        onConfirm={() => void merge()}
        title={t('duplicates.confirmTitle', { removed: merging?.full_name ?? '', kept: kept?.full_name ?? '' })}
        body={t('duplicates.confirmBody', { removed: merging?.full_name ?? '', kept: kept?.full_name ?? '' })}
        confirmLabel={t('duplicates.confirm')}
        tone="danger"
        loading={busy}
      />
    </Section>
  );
}
