/**
 * The console's map: every page, in the sections an operator thinks in. The
 * labels are the app's own titles for the same screens wherever there is one
 * (admin.requests.title…), so the phone and the desk name things alike.
 */

import type { IconName } from '../ui/icon';

export type NavCount = 'requests' | 'support' | 'ideas' | 'reports';

export interface NavItem {
  /** Path after /<lang>; '' is the overview. */
  path: string;
  icon: IconName;
  label: string;
  /** A live number beside it. */
  count?: NavCount;
}

export interface NavSection {
  title: string | null;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: null,
    items: [{ path: '', icon: 'grid', label: 'console.nav.overview' }],
  },
  {
    title: 'console.nav.manage',
    items: [
      { path: '/requests', icon: 'clock', label: 'admin.requests.title', count: 'requests' },
      { path: '/buildings', icon: 'building', label: 'admin.buildings.title' },
      { path: '/people', icon: 'users', label: 'admin.users.title' },
      { path: '/duplicates', icon: 'copy', label: 'duplicates.title' },
    ],
  },
  {
    title: 'console.nav.communicate',
    items: [
      { path: '/support', icon: 'chat', label: 'admin.support.title', count: 'support' },
      { path: '/banners', icon: 'megaphone', label: 'admin.banners.title' },
      { path: '/notifications', icon: 'send', label: 'admin.push.title' },
      { path: '/ideas', icon: 'bolt', label: 'admin.ideas.title', count: 'ideas' },
      { path: '/reports', icon: 'flag', label: 'safety.reports.title', count: 'reports' },
    ],
  },
  {
    title: 'console.nav.platform',
    items: [
      { path: '/billing', icon: 'receipt', label: 'admin.billing.title' },
      { path: '/review', icon: 'key', label: 'reviewAccess.title' },
      { path: '/calls', icon: 'phone', label: 'calls.admin.title' },
      { path: '/settings', icon: 'settings', label: 'admin.settings.title' },
    ],
  },
  {
    title: 'console.nav.monitor',
    items: [
      { path: '/apps', icon: 'smartphone', label: 'console.nav.apps' },
      { path: '/alerts', icon: 'bell', label: 'console.nav.alerts' },
      { path: '/audit', icon: 'activity', label: 'admin.audit.title' },
    ],
  },
];

/** Whether `pathname` is this item's page or one under it. */
export function isActive(pathname: string, locale: string, path: string): boolean {
  const base = `/${locale}${path}`;
  if (path === '') return pathname === `/${locale}` || pathname === `/${locale}/`;
  return pathname === base || pathname.startsWith(`${base}/`);
}
