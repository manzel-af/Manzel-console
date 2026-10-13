'use client';

/**
 * Which apps a banner or a notification is for (V037): every app, or some
 * platforms, and at most one way of choosing versions — these versions,
 * older than one, or one and newer. The versions offered are the ones in use
 * (admin_app_versions), newest first, each with how many phones run it.
 */

import { useCallback, type ReactNode } from 'react';

import { Checkbox, Segmented, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { compareVersions, splitLabel, useAppVersions, type AppPlatform } from '@/lib/api/apps';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/format/use-format';
import { useI18n } from '@/lib/i18n/client';
import type { AppTarget } from '@/lib/supabase/database.types';

type Way = 'every' | 'only' | 'below' | 'atLeast';

const PLATFORMS: AppPlatform[] = ['android', 'ios'];

/** A version as people read it: "1.0.0 (14)", always left to right. */
export function VersionLabel({ label, className }: { label: string | null; className?: string }) {
  const { t } = useI18n();
  if (!label) return <span className={className}>{t('console.apps.unknownVersion')}</span>;
  const { version, build } = splitLabel(label);
  return (
    <bdi dir="ltr" className={cn('font-mono tabular-nums', className)}>
      {version}
      {build ? <span className="text-fg-muted"> ({build})</span> : null}
    </bdi>
  );
}

/** The same, as plain text, for sentences and CSV. */
export function versionText(label: string | null): string {
  if (!label) return '—';
  const { version, build } = splitLabel(label);
  return build ? `${version} (${build})` : version;
}

/** A target in words: "Android · older than 1.0.0 (15)". */
export function useTargetLabel() {
  const { t, language } = useI18n();
  return useCallback((target: AppTarget | null | undefined): string | null => {
    if (!target) return null;
    const parts: string[] = [];
    if (target.platforms?.length) {
      parts.push(target.platforms.map((platform) => t(`console.apps.platforms.${platform}`)).join(language === 'en' ? ', ' : '، '));
    }
    const wrap = (label: string) => `⁦${versionText(label)}⁩`;
    if (target.only) parts.push(t('console.apps.target.onlyThese', { list: target.only.map(wrap).join(language === 'en' ? ', ' : '، ') }));
    if (target.below) parts.push(t('console.apps.target.olderThan', { version: wrap(target.below) }));
    if (target.atLeast) parts.push(t('console.apps.target.andNewer', { version: wrap(target.atLeast) }));
    return parts.join(' · ');
  }, [t, language]);
}

function wayOf(target: AppTarget | null): Way {
  if (target?.only) return 'only';
  if (target?.below) return 'below';
  if (target?.atLeast) return 'atLeast';
  return 'every';
}

/** Null when nothing is chosen: every app. */
function tidy(target: AppTarget): AppTarget | null {
  const next: AppTarget = {};
  if (target.platforms?.length) next.platforms = target.platforms;
  if (target.only?.length) next.only = target.only;
  if (target.below) next.below = target.below;
  if (target.atLeast) next.atLeast = target.atLeast;
  return Object.keys(next).length > 0 ? next : null;
}

export function AppTargetEditor({
  value, onChange, footer,
}: {
  value: AppTarget | null;
  onChange(next: AppTarget | null): void;
  /** Under the choices: how many it reaches. */
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const versions = useAppVersions();
  const some = value !== null;
  const way = wayOf(value);
  const platforms = value?.platforms ?? [];

  // The versions in use on the platforms chosen (all, if none), newest first, one row per label.
  const offered = new Map<string, number>();
  for (const version of versions.data ?? []) {
    if (platforms.length > 0 && !platforms.includes(version.platform)) continue;
    offered.set(version.label, (offered.get(version.label) ?? 0) + version.installs);
  }
  const labels = [...offered.keys()].sort((a, b) => compareVersions(b, a));

  const set = (patch: Partial<AppTarget>, drop: (keyof AppTarget)[] = []) => {
    const next: AppTarget = { ...(value ?? {}), ...patch };
    for (const key of drop) delete next[key];
    onChange(tidy(next));
  };

  const togglePlatform = (platform: AppPlatform) => {
    const next = platforms.includes(platform) ? platforms.filter((one) => one !== platform) : [...platforms, platform];
    set({ platforms: next });
  };

  const chooseWay = (next: Way) => {
    const newest = labels[0];
    if (next === 'every') set({}, ['only', 'below', 'atLeast']);
    else if (next === 'only') set({ only: newest ? [newest] : [] }, ['below', 'atLeast']);
    else if (next === 'below') set({ below: newest }, ['only', 'atLeast']);
    else set({ atLeast: newest }, ['only', 'below']);
  };

  return (
    <div className="flex flex-col gap-4">
      <Segmented<'all' | 'some'>
        value={some ? 'some' : 'all'}
        onChange={(next) => onChange(next === 'all' ? null : { platforms: ['android', 'ios'] })}
        label={t('console.apps.target.title')}
        options={[
          { value: 'all', label: t('console.apps.target.everyApp') },
          { value: 'some', label: t('console.apps.target.someApps'), icon: 'smartphone' },
        ]}
      />

      {some ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg">{t('console.apps.target.platforms')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('console.apps.target.platforms')}>
              {PLATFORMS.map((platform) => {
                const on = platforms.includes(platform);
                return (
                  <button key={platform} type="button" aria-pressed={on} onClick={() => togglePlatform(platform)}
                    className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-semibold transition-colors',
                      on ? 'border-primary bg-primary text-fg-on-primary' : 'border-line bg-surface text-fg hover:bg-surface-sunken')}>
                    {on ? <Icon name="check" size={15} /> : null}
                    {t(`console.apps.platforms.${platform}`)}
                  </button>
                );
              })}
            </div>
            {platforms.length === 0 ? <p className="text-xs text-fg-muted">{t('console.apps.target.anyPlatform')}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg">{t('console.apps.target.versions')}</p>
            <Segmented<Way>
              value={way}
              onChange={chooseWay}
              label={t('console.apps.target.versions')}
              options={[
                { value: 'every', label: t('console.apps.target.everyVersion') },
                { value: 'only', label: t('console.apps.target.only') },
                { value: 'below', label: t('console.apps.target.below') },
                { value: 'atLeast', label: t('console.apps.target.atLeast') },
              ]}
            />
            {way !== 'every' && labels.length === 0 ? (
              <p className="text-sm text-fg-muted">{versions.isLoading ? t('common.loading') : t('console.apps.target.noVersions')}</p>
            ) : null}
            {way === 'only' && labels.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {labels.map((label) => (
                  <Checkbox
                    key={label}
                    checked={value?.only?.includes(label) ?? false}
                    onChange={(checked) => {
                      const current = value?.only ?? [];
                      set({ only: checked ? [...current, label] : current.filter((one) => one !== label) });
                    }}
                    label={<VersionLabel label={label} />}
                    description={t('console.apps.phones', { n: fmt.number(offered.get(label) ?? 0) })}
                  />
                ))}
              </div>
            ) : null}
            {(way === 'below' || way === 'atLeast') && labels.length > 0 ? (
              <Select
                aria-label={t('console.apps.target.versions')}
                dir="ltr"
                wrapperClassName="max-w-72"
                value={(way === 'below' ? value?.below : value?.atLeast) ?? ''}
                onChange={(event) => set(way === 'below' ? { below: event.target.value } : { atLeast: event.target.value })}
              >
                {labels.map((label) => (
                  <option key={label} value={label}>{versionText(label)}</option>
                ))}
              </Select>
            ) : null}
            <p className="text-xs text-fg-muted">
              {way === 'below' ? t('console.apps.target.belowHint') : way === 'atLeast' ? t('console.apps.target.atLeastHint') : t('console.apps.target.hint')}
            </p>
          </div>
        </>
      ) : null}
      {footer}
    </div>
  );
}
