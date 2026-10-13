'use client';

/**
 * The store reviewers' sign-in (V033, the app's admin/review.tsx).
 *
 * Apple and Google sign in to Manzel before it is published, and Manzel has
 * no open sign-up. This is the way in they are given: one code, reusable,
 * that opens one demo account ("App Review"). It works only while it is on
 * here; turn it off once the review is over, and make a new code for the
 * next one. The code is shown once — only its hash is kept.
 *
 * The demo account is set up here too: make it, then give it its places —
 * manager of a demo building, and resident of a flat — so reviewers find a
 * working app, not an empty one.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button, IconButton } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge, Callout, SkeletonRows } from '@/components/ui/feedback';
import { SearchInput, Segmented } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Card, IconTile, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  addReviewPlace, createReviewAccount, removeReviewPlace, reviewAccessKey, setReviewAccess, useAdminBuildings,
  useReviewAccess,
} from '@/lib/api/admin';
import { cn } from '@/lib/cn';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import { isolate } from '@/lib/text';
import { useOnline } from '@/lib/use-online';

const STEPS = ['code', 'account', 'content', 'notes', 'off'] as const;

type PlaceRole = 'manager' | 'resident';

export function ReviewScreen() {
  const t = useT();
  const fmt = useFormat();
  const toast = useToast();
  const online = useOnline();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const access = useReviewAccess();
  const buildings = useAdminBuildings();

  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  // Adding the demo account to a building.
  const [adding, setAdding] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  const [role, setRole] = useState<PlaceRole>('manager');
  const [search, setSearch] = useState('');

  const run = async (work: () => Promise<void>, done?: string) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await queryClient.invalidateQueries({ queryKey: reviewAccessKey });
      if (done) toast.show(done);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const change = (enabled: boolean, newCode: boolean) => {
    setConfirmNew(false);
    void run(async () => {
      const result = await setReviewAccess(enabled, newCode);
      setCode(result.code ?? null);
    }, enabled ? t('reviewAccess.turnedOn') : t('reviewAccess.turnedOff'));
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.show(t('reviewAccess.copied'));
    } catch {
      // The code stays on the page to copy by hand.
    }
  };

  const add = () => {
    if (!building) return;
    void run(async () => {
      await addReviewPlace(building, role);
      setAdding(false);
      setBuilding(null);
    }, t('reviewAccess.demo.added'));
  };

  const data = access.data;
  const hasAccount = Boolean(data?.profile_name);
  const needle = search.trim().toLowerCase();
  const options = (buildings.data ?? []).filter((option) =>
    !needle || option.name.toLowerCase().includes(needle) || option.code.toLowerCase().includes(needle));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('reviewAccess.title')} subtitle={t('reviewAccess.lead')} />

      {access.isLoading ? <SkeletonRows rows={4} /> : access.error ? (
        <Callout tone="danger" title={errorText(access.error)} />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {/* ---- the code ---- */}
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <IconTile icon="key" tone={data.enabled ? 'success' : 'default'} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fg">{t('reviewAccess.status')}</p>
                  {data.code_created_at ? (
                    <p className="text-sm text-fg-muted">{t('reviewAccess.codeMade')} · {fmt.relative(data.code_created_at)}</p>
                  ) : null}
                </div>
                <Badge tone={data.enabled ? 'success' : 'neutral'} dot={data.enabled}
                  label={data.enabled ? t('reviewAccess.on') : t('reviewAccess.off')} />
              </div>

              {code ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 p-5 text-center">
                  <p className="text-sm text-fg-muted">{t('reviewAccess.codeOnce')}</p>
                  <p dir="ltr" className="font-mono text-2xl font-bold tracking-wider text-fg select-all">{code}</p>
                  <Button label={t('reviewAccess.copy')} variant="secondary" size="sm" icon="copy" onClick={() => void copy()} />
                </div>
              ) : null}

              {error ? <Callout tone="danger" title={error} /> : null}

              <div className="flex flex-wrap gap-2">
                {data.enabled ? (
                  <>
                    <Button label={t('reviewAccess.newCode')} variant="secondary" icon="sync"
                      disabled={!online || busy} onClick={() => setConfirmNew(true)} />
                    <Button label={t('reviewAccess.turnOff')} variant="ghost" icon="lock"
                      disabled={!online || busy} loading={busy} onClick={() => change(false, false)} />
                  </>
                ) : (
                  <Button label={t('reviewAccess.turnOn')} icon="key" disabled={!online || busy} loading={busy}
                    onClick={() => change(true, false)} />
                )}
              </div>
            </Card>

            {/* ---- the demo account ---- */}
            <Section title={t('reviewAccess.demo.title')}>
              {!hasAccount ? (
                <Card className="flex flex-col gap-3">
                  <p className="text-fg-muted">{t('reviewAccess.demo.none')}</p>
                  <Button label={t('reviewAccess.demo.create')} variant="secondary" icon="user" className="self-start"
                    disabled={!online || busy} loading={busy}
                    onClick={() => void run(async () => { await createReviewAccount(); }, t('reviewAccess.demo.created'))} />
                </Card>
              ) : (
                <>
                  <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <IconTile icon="user" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold text-fg">{data.profile_name}</span>
                        <span className="text-sm text-fg-muted">{t('reviewAccess.demo.account')}</span>
                      </span>
                    </div>
                    {data.places.map((place) => (
                      <div key={place.membership_id} className="flex items-center gap-3 px-4 py-3.5">
                        <IconTile icon="building" tone="primary" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-semibold text-fg">{place.building_name}</span>
                          <span className="text-sm text-fg-muted">
                            {t(`roles.${place.role}`)}
                            {place.unit_label ? ` · ${t('reviewAccess.demo.flat', { flat: isolate(place.unit_label) })}` : null}
                          </span>
                        </span>
                        <IconButton icon="close" label={t('reviewAccess.demo.remove')} size="sm" disabled={!online || busy}
                          onClick={() => void run(async () => { await removeReviewPlace(place.membership_id); },
                            t('reviewAccess.demo.removed'))} />
                      </div>
                    ))}
                  </div>
                  {data.places.length === 0 ? <Callout tone="warning" title={t('reviewAccess.demo.noPlaces')} /> : null}
                  <Button label={t('reviewAccess.demo.add')} variant="secondary" icon="plus" className="self-start"
                    disabled={!online || busy} onClick={() => setAdding(true)} />
                </>
              )}
            </Section>
          </div>

          {/* ---- how a review goes ---- */}
          <Section title={t('reviewAccess.stepsTitle')} className="lg:sticky lg:top-24">
            <Card>
              <ol className="flex flex-col gap-3">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {fmt.number(index + 1)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-fg">{t(`reviewAccess.steps.${step}`)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </Section>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        onConfirm={() => change(true, true)}
        title={t('reviewAccess.newCodeTitle')}
        body={t('reviewAccess.newCodeBody')}
        confirmLabel={t('reviewAccess.newCode')}
        loading={busy}
      />

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={t('reviewAccess.demo.addTitle')}
        description={t('reviewAccess.demo.addWarning')}
        dismissible={!busy}
        footer={(
          <>
            <Button variant="ghost" label={t('common.cancel')} disabled={busy} onClick={() => setAdding(false)} />
            <Button icon="plus" label={t('reviewAccess.demo.addButton')} disabled={!building || !online || busy} loading={busy}
              onClick={add} />
          </>
        )}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-fg">{t('reviewAccess.demo.as')}</p>
          <Segmented<PlaceRole>
            value={role}
            onChange={setRole}
            label={t('reviewAccess.demo.as')}
            options={[
              { value: 'manager', label: t('roles.manager') },
              { value: 'resident', label: t('roles.resident') },
            ]}
          />
          {role === 'resident' ? <p className="text-xs text-fg-subtle">{t('reviewAccess.demo.residentHint')}</p> : null}
          <SearchInput value={search} onChange={setSearch} label={t('common.search')} placeholder={t('admin.buildings.search')} />
          <ul role="listbox" aria-label={t('console.list.buildings')} className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {options.map((option) => {
              const selected = building === option.id;
              return (
                <li key={option.id} role="option" aria-selected={selected}>
                  <button type="button" onClick={() => setBuilding(option.id)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-colors',
                      selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:bg-surface-sunken')}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold text-fg">{option.name}</span>
                      <span className="truncate text-sm text-fg-muted">
                        {t('reviewAccess.demo.members', { n: fmt.number(option.members), city: option.city })}
                      </span>
                    </span>
                    {selected ? <Icon name="check" size={18} className="text-primary" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Dialog>
    </div>
  );
}
