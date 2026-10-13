'use client';

/**
 * The operator's own account: who they are signed in as, the authenticators
 * that guard it, how the console looks for them, and signing out of every
 * device.
 *
 * Authenticators: a spare can be added (a second phone — if one is lost, the
 * other still signs in), and one removed, but never the last: an operator
 * without one could not sign in again. Removing one needs this session's own
 * second step, which every console session has.
 *
 * Preferences are this browser's (lib/prefs): the theme, the digits, the
 * clock, how dense tables are. The language is the address's.
 */

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { EnrollStep } from '@/components/auth/sign-in-flow';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge, Callout, SkeletonRows } from '@/components/ui/feedback';
import { Segmented } from '@/components/ui/form';
import { Card, DetailGrid, DetailItem, IconTile, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import { useAuth, useFactors, useMyProfile } from '@/lib/auth/auth';
import { cn } from '@/lib/cn';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useI18n } from '@/lib/i18n/client';
import { LOCALE_COOKIE, localeInfo, locales, swapLocale } from '@/lib/i18n/languages';
import { usePrefs, type Density, type ThemeChoice } from '@/lib/prefs';
import { getSupabase } from '@/lib/supabase/client';

type NumeralChoice = 'auto' | 'arabic' | 'latin';

export function AccountScreen() {
  const { t, locale } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const auth = useAuth();
  const profile = useMyProfile();
  const factors = useFactors();
  const prefs = usePrefs();

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [everywhere, setEverywhere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verified = factors.data?.verified.filter((factor) => factor.status === 'verified') ?? [];

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await getSupabase().auth.mfa.unenroll({ factorId: removing.id });
      if (failure) throw failure;
      await auth.refresh();
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.show(t('admin.saved'));
      setRemoving(null);
    } catch (caught) {
      setError(errorText(caught));
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    setBusy(true);
    try {
      await auth.signOut('global');
      router.replace(`/${locale}/sign-in`);
    } finally {
      setBusy(false);
    }
  };

  const numerals: NumeralChoice = prefs.numerals ?? 'auto';
  const now = new Date();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('console.account.title')} subtitle={t('console.account.subtitle')} />

      <div className="flex flex-col gap-8">
        {/* ---- who ---- */}
        <Section title={t('console.account.profile')} description={t('console.account.openInApp')}>
          <Card>
            <DetailGrid>
              <DetailItem label={t('console.list.name')}>{profile.data?.full_name || '—'}</DetailItem>
              <DetailItem label={t('console.account.email')}><bdi dir="ltr">{auth.user?.email ?? '—'}</bdi></DetailItem>
              <DetailItem label={t('console.list.phone')}>
                {profile.data?.phone ? <bdi dir="ltr">{profile.data.phone}</bdi> : '—'}
              </DetailItem>
            </DetailGrid>
          </Card>
        </Section>

        {/* ---- authenticators ---- */}
        <Section
          title={t('console.mfa.factors')}
          description={t('console.mfa.addAnotherBody')}
          actions={<Button variant="secondary" icon="plus" label={t('console.mfa.addAnother')} onClick={() => setAdding(true)} />}
        >
          {error ? <Callout tone="danger" title={error} /> : null}
          {factors.isLoading ? <SkeletonRows rows={2} /> : (
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {verified.map((factor) => (
                <div key={factor.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <IconTile icon="shieldCheck" tone="success" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold text-fg">{factor.friendly_name || t('console.mfa.title')}</span>
                    <span className="text-sm text-fg-muted">{t('console.mfa.factorAdded', { date: fmt.date(factor.created_at, 'medium') })}</span>
                  </span>
                  <Button variant="ghost" size="sm" icon="trash" label={t('console.mfa.remove')}
                    disabled={verified.length <= 1}
                    title={verified.length <= 1 ? t('console.mfa.lastFactor') : undefined}
                    onClick={() => setRemoving({ id: factor.id, name: factor.friendly_name || t('console.mfa.title') })} />
                </div>
              ))}
            </div>
          )}
          {verified.length === 1 ? <p className="text-sm text-fg-muted">{t('console.mfa.lastFactor')}</p> : null}
          <p className="text-sm text-fg-muted">{t('console.mfa.lostDevice')}</p>
        </Section>

        {/* ---- preferences ---- */}
        <Section title={t('console.account.preferences')}>
          <Card className="flex flex-col gap-6">
            <Preference label={t('console.prefs.language')}>
              <div className="flex flex-wrap gap-2">
                {locales.map((next) => (
                  // A plain link: a new language is a new <html lang dir> from the server.
                  <a key={next} href={swapLocale(pathname, next)} lang={localeInfo[next].language}
                    aria-current={next === locale ? 'true' : undefined}
                    onClick={() => {
                      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
                    }}
                    className={cn('inline-flex h-9 items-center rounded-pill border px-4 text-sm font-semibold transition-colors',
                      next === locale ? 'border-primary bg-primary text-fg-on-primary' : 'border-line bg-surface text-fg hover:bg-surface-sunken')}>
                    {localeInfo[next].nativeName}
                  </a>
                ))}
              </div>
            </Preference>
            <Preference label={t('console.prefs.theme')}>
              <Segmented<ThemeChoice>
                value={prefs.theme}
                onChange={(theme) => prefs.set({ theme })}
                label={t('console.prefs.theme')}
                options={[
                  { value: 'system', label: t('theme.system'), icon: 'monitor' },
                  { value: 'light', label: t('theme.light'), icon: 'sun' },
                  { value: 'dark', label: t('theme.dark'), icon: 'moon' },
                ]}
              />
            </Preference>
            <Preference label={t('console.prefs.numerals')}>
              <Segmented<NumeralChoice>
                value={numerals}
                onChange={(next) => prefs.set({ numerals: next === 'auto' ? null : next })}
                label={t('console.prefs.numerals')}
                options={[
                  { value: 'auto', label: t('console.prefs.numeralsAuto') },
                  { value: 'arabic', label: t('numerals.arabic') },
                  { value: 'latin', label: t('numerals.latin') },
                ]}
              />
            </Preference>
            <Preference label={t('console.prefs.clock')} note={t('clock.example', { time: fmt.time(now) })}>
              <Segmented<'24h' | '12h'>
                value={prefs.clock}
                onChange={(clock) => prefs.set({ clock })}
                label={t('console.prefs.clock')}
                options={[
                  { value: '24h', label: t('clock.h24', { n: fmt.number(24) }) },
                  { value: '12h', label: t('clock.h12', { n: fmt.number(12) }) },
                ]}
              />
            </Preference>
            <Preference label={t('console.prefs.density')}>
              <Segmented<Density>
                value={prefs.density}
                onChange={(density) => prefs.set({ density })}
                label={t('console.prefs.density')}
                options={[
                  { value: 'comfortable', label: t('console.prefs.comfortable') },
                  { value: 'compact', label: t('console.prefs.compact') },
                ]}
              />
            </Preference>
          </Card>
        </Section>

        {/* ---- sign-ins ---- */}
        <Section title={t('console.account.sessions')}>
          <Card className="flex flex-wrap items-center gap-4">
            <IconTile icon="logout" tone="danger" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">{t('console.account.signOutEverywhere')}</p>
              <p className="text-sm text-fg-muted">{t('console.account.signOutEverywhereBody')}</p>
            </div>
            <Button variant="soft-danger" icon="logout" label={t('console.account.signOutEverywhere')} onClick={() => setEverywhere(true)} />
          </Card>
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Badge tone="success" dot label={t('console.status.live')} />
            {t('console.shell.signedInAs', { email: auth.user?.email ?? '' })}
          </p>
        </Section>
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title={t('console.mfa.addAnother')}
        description={t('console.mfa.addAnotherBody')} size="md">
        {adding ? (
          <EnrollStep compact onDone={() => {
            setAdding(false);
            toast.show(t('console.mfa.enabled'));
          }} />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => void remove()}
        title={t('console.mfa.removeTitle')}
        body={removing ? `${removing.name} · ${t('console.mfa.removeBody')}` : undefined}
        confirmLabel={t('console.mfa.remove')}
        tone="danger"
        loading={busy}
      />

      <ConfirmDialog
        open={everywhere}
        onClose={() => setEverywhere(false)}
        onConfirm={() => void signOutEverywhere()}
        title={t('console.account.signOutEverywhereTitle')}
        body={t('console.account.signOutEverywhereBody')}
        confirmLabel={t('console.account.signOutEverywhere')}
        tone="danger"
        loading={busy}
      />
    </div>
  );
}

function Preference({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex flex-col sm:w-44 sm:shrink-0 sm:pt-1.5">
        <span className="text-sm font-semibold text-fg">{label}</span>
        {note ? <span className="text-xs text-fg-muted">{note}</span> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
