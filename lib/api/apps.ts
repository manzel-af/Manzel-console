'use client';

/**
 * Which app is on which phone (V037): every install the platform knows of,
 * the versions in use, and the targets that send a banner or a notification
 * to some of them only.
 *
 * A version is a label: "1.0.0+14" — the app's version and the build EAS gave
 * the binary — or "1.0.0" for an app from before V037, which never said its
 * build. Labels sort as the database sorts them (app_version_key): numbers,
 * not letters, and an unknown build before every build.
 */

import { useQuery } from '@tanstack/react-query';

import { fail } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import type { AdminAppInstall, AdminAppVersion, AppTarget } from '@/lib/supabase/database.types';

export type AppPlatform = AdminAppInstall['platform'];

export const appKeys = {
  installs: ['admin', 'apps', 'installs'] as const,
  versions: ['admin', 'apps', 'versions'] as const,
};

export function useAppInstalls() {
  return useQuery({
    queryKey: appKeys.installs,
    refetchInterval: 120_000,
    queryFn: async (): Promise<AdminAppInstall[]> => {
      const { data, error } = await getSupabase().rpc('admin_app_installs', { p_limit: 20_000 });
      if (error) fail(error);
      return (data ?? []) as AdminAppInstall[];
    },
  });
}

export function useAppVersions(enabled = true) {
  return useQuery({
    queryKey: appKeys.versions,
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AdminAppVersion[]> => {
      const { data, error } = await getSupabase().rpc('admin_app_versions');
      if (error) fail(error);
      return (data ?? []) as AdminAppVersion[];
    },
  });
}

/** A label as numbers, exactly as app_version_key() in the database. */
export function versionKey(label: string | null | undefined): number[] {
  const [version = '', build = ''] = (label ?? '').split('+');
  const part = (text: string) => Number(/^[0-9]{1,9}/.exec(text)?.[0] ?? 0);
  const [major = '', minor = '', patch = ''] = version.split('.');
  return [part(major), part(minor), part(patch), part(build)];
}

export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const x = versionKey(a);
  const y = versionKey(b);
  for (let i = 0; i < 4; i += 1) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

/** "1.0.0+14" → { version: "1.0.0", build: "14" }. */
export function splitLabel(label: string): { version: string; build: string | null } {
  const [version, build] = label.split('+');
  return { version, build: build ?? null };
}

/** The newest version seen on each platform in the last 30 days: what "up to date" means. */
export function latestByPlatform(versions: AdminAppVersion[]): Partial<Record<AppPlatform, string>> {
  const latest: Partial<Record<AppPlatform, string>> = {};
  for (const version of versions) {
    if (version.active === 0) continue;
    const current = latest[version.platform];
    if (!current || compareVersions(version.label, current) > 0) latest[version.platform] = version.label;
  }
  return latest;
}

/** Whether a platform and a label are what a target names — as platform_apps_match() decides. */
export function targetMatches(target: AppTarget | null, platform: AppPlatform | null, label: string | null): boolean {
  if (!target) return true;
  if (target.platforms && (!platform || !target.platforms.includes(platform))) return false;
  if (target.only) return Boolean(label && target.only.includes(label));
  if (target.below) return !label || compareVersions(label, target.below) < 0;
  if (target.atLeast) return Boolean(label && compareVersions(label, target.atLeast) >= 0);
  return true;
}

const LABEL = /^[0-9A-Za-z.+-]{1,49}$/;
const PLATFORMS = ['android', 'ios', 'web'] as const;

/**
 * A target from somewhere untrusted (a link's ?apps=): itself when it is one
 * the database would take, else null.
 */
export function parseTarget(value: unknown): AppTarget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keys = Object.keys(raw);
  if (keys.length === 0 || keys.some((key) => !['platforms', 'only', 'below', 'atLeast'].includes(key))) return null;
  const target: AppTarget = {};
  if (raw.platforms !== undefined) {
    if (!Array.isArray(raw.platforms) || raw.platforms.length < 1 || raw.platforms.length > 3) return null;
    if (!raw.platforms.every((platform) => (PLATFORMS as readonly unknown[]).includes(platform))) return null;
    target.platforms = [...new Set(raw.platforms as AppPlatform[])];
  }
  const ways = ['only', 'below', 'atLeast'].filter((key) => raw[key] !== undefined);
  if (ways.length > 1) return null;
  if (raw.only !== undefined) {
    if (!Array.isArray(raw.only) || raw.only.length < 1 || raw.only.length > 20) return null;
    if (!raw.only.every((label) => typeof label === 'string' && LABEL.test(label))) return null;
    target.only = [...new Set(raw.only as string[])];
  }
  if (raw.below !== undefined) {
    if (typeof raw.below !== 'string' || !LABEL.test(raw.below)) return null;
    target.below = raw.below;
  }
  if (raw.atLeast !== undefined) {
    if (typeof raw.atLeast !== 'string' || !LABEL.test(raw.atLeast)) return null;
    target.atLeast = raw.atLeast;
  }
  return target;
}

/** A target for a link: /notifications/new?apps=… */
export function targetParam(target: AppTarget): string {
  return encodeURIComponent(JSON.stringify(target));
}

export function targetFromParam(param: string | null): AppTarget | null {
  if (!param) return null;
  try {
    return parseTarget(JSON.parse(param));
  } catch {
    return null;
  }
}
