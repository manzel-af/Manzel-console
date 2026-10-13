'use client';

/**
 * The console around every operator page: the gate, the sidebar, the top bar.
 *
 * The gate decides what to DRAW — signed in, with the authenticator (aal2),
 * as an operator — and sends anyone else to the sign-in page, which knows
 * which step they are on. The database decides what is ALLOWED, and checks
 * again on every call these pages make.
 *
 * The operator check is live: it is asked again every few minutes and when
 * the window comes back into focus, so revoking someone's role closes the
 * console for them without waiting for them to sign out.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';

import { AlertFeed } from '@/components/alert-feed';
import { LogoMark } from '@/components/brand/logo';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { useAdminStats } from '@/lib/api/admin';
import { useChatReports, useIdeaCounts, useSupportCounts } from '@/lib/api/support';
import { useAuth, useFactors, useIsOperator, useMyProfile } from '@/lib/auth/auth';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/format/use-format';
import { useI18n, useT } from '@/lib/i18n/client';
import { useOnline } from '@/lib/use-online';

import { PwaManager } from './pwa';
import { NAV, isActive, type NavCount } from './nav';
import { LanguageSwitch, ThemeSwitch } from './switchers';

const COLLAPSED_KEY = 'manzel.console.sidebar';

export function ConsoleShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { locale } = useI18n();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const factors = useFactors(Boolean(auth.session));
  const operator = useIsOperator();

  const verified = factors.data?.verified ?? [];
  const allowed = auth.ready && Boolean(auth.session) && factors.isSuccess && verified.length > 0
    && auth.aal === 'aal2' && operator.data === true;
  const decided = auth.ready && (!auth.session || (factors.isSuccess && !operator.isPending));

  useEffect(() => {
    if (decided && !allowed) {
      router.replace(`/${locale}/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [decided, allowed, router, locale, pathname]);

  if (!allowed) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg" aria-busy="true">
        <div className="flex flex-col items-center gap-4 text-fg-muted">
          <LogoMark size={56} className="animate-pulse" />
          <p className="text-sm">{t('console.shell.loading')}</p>
        </div>
      </div>
    );
  }

  return <Frame>{children}</Frame>;
}

function Frame({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  // The drawer belongs to the page it was opened on: a page chosen in it closes it.
  const [drawerOn, setDrawerOn] = useState<string | null>(null);
  const drawer = drawerOn === pathname;
  const setDrawer = (open: boolean) => setDrawerOn(open ? pathname : null);
  // Drawn only in the browser, after sign-in (ConsoleShell), so storage can be read at once.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1');
      } catch {
        // Lasts for this visit.
      }
      return !value;
    });
  };

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-pop">
        {t('console.skipToContent')}
      </a>

      {/* The sidebar, on a desk. */}
      <aside className={cn(
        'fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-line bg-surface transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}>
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* The same, as a drawer, on a phone. */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={t('console.nav.closeMenu')} onClick={() => setDrawer(false)}
            className="absolute inset-0 animate-fade-in bg-[var(--scrim)]" />
          <aside className="absolute inset-y-0 start-0 flex w-[min(19rem,86vw)] animate-rise flex-col border-e border-line bg-surface shadow-pop">
            <SidebarContent collapsed={false} onClose={() => setDrawer(false)} />
          </aside>
        </div>
      ) : null}

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'lg:ps-[4.5rem]' : 'lg:ps-64')}>
        <TopBar onMenu={() => setDrawer(true)} />
        <OfflineNotice />
        <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
      <PwaManager />
      <AlertFeed />
    </div>
  );
}

function useNavCounts(): Partial<Record<NavCount, number>> {
  const stats = useAdminStats();
  const support = useSupportCounts();
  const ideas = useIdeaCounts();
  const reports = useChatReports();
  return {
    requests: stats.data?.requests_pending,
    support: support.data?.queue,
    ideas: ideas.data?.open,
    reports: reports.data?.length,
  };
}

function SidebarContent({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle?(): void; onClose?(): void }) {
  const t = useT();
  const { locale } = useI18n();
  const fmt = useFormat();
  const pathname = usePathname();
  const counts = useNavCounts();

  return (
    <>
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 border-b border-line', collapsed ? 'justify-center px-2' : 'px-4')}>
        <Link href={`/${locale}`} className="flex min-w-0 items-center gap-2.5" aria-label={t('console.name')}>
          <LogoMark size={34} />
          {!collapsed ? (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[0.95rem] font-bold text-fg">{t('common.appName')}</span>
              <span className="truncate text-xs text-fg-muted">{t('console.short')}</span>
            </span>
          ) : null}
        </Link>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label={t('console.nav.closeMenu')}
            className="ms-auto grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-sunken hover:text-fg">
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" aria-label={t('console.nav.menu')}>
        {NAV.map((section, index) => (
          <div key={index} className={cn(index > 0 && 'mt-4')}>
            {section.title && !collapsed ? (
              <p className="px-3 pb-1.5 text-xs font-semibold text-fg-subtle">{t(section.title)}</p>
            ) : section.title ? <div className="mx-3 mb-2 border-t border-line" /> : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, locale, item.path);
                const count = item.count ? counts[item.count] : undefined;
                const label = t(item.label);
                return (
                  <li key={item.path}>
                    <Link
                      href={`/${locale}${item.path}`}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'group relative flex h-10 items-center gap-3 rounded-[0.7rem] text-sm font-semibold transition-colors',
                        collapsed ? 'justify-center px-0' : 'px-3',
                        active ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                      )}
                    >
                      <Icon name={item.icon} size={19} filled={false} />
                      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
                      {count ? (
                        collapsed ? (
                          <span className="absolute end-2 top-1.5 h-2 w-2 rounded-full bg-danger" aria-label={fmt.number(count)} />
                        ) : (
                          <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning tabular-nums">
                            {fmt.number(count)}
                          </span>
                        )
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {onToggle ? (
        <div className="border-t border-line p-2.5">
          <button type="button" onClick={onToggle}
            aria-label={collapsed ? t('console.nav.expand') : t('console.nav.collapse')}
            title={collapsed ? t('console.nav.expand') : t('console.nav.collapse')}
            className={cn('flex h-10 w-full items-center gap-3 rounded-[0.7rem] text-sm font-semibold text-fg-muted hover:bg-surface-sunken hover:text-fg',
              collapsed ? 'justify-center' : 'px-3')}>
            <Icon name="sidebar" size={19} />
            {!collapsed ? <span>{t('console.nav.collapse')}</span> : null}
          </button>
        </div>
      ) : null}
    </>
  );
}

function TopBar({ onMenu }: { onMenu(): void }) {
  const t = useT();
  const { locale } = useI18n();
  const auth = useAuth();
  const profile = useMyProfile();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const name = profile.data?.full_name || auth.user?.email || '';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '؟';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur sm:px-6 lg:px-10">
      <button type="button" onClick={onMenu} aria-label={t('console.nav.openMenu')}
        className="grid h-10 w-10 place-items-center rounded-[0.7rem] text-fg-muted hover:bg-surface-sunken hover:text-fg lg:hidden">
        <Icon name="menu" size={20} />
      </button>
      <Link href={`/${locale}`} className="flex items-center gap-2 lg:hidden" aria-label={t('console.name')}>
        <LogoMark size={30} />
      </Link>

      <div className="ms-auto flex items-center gap-1">
        <Suspense fallback={<span className="h-10 w-10" />}>
          <LanguageSwitch compact />
        </Suspense>
        <ThemeSwitch />
        <Menu
          trigger={(props) => (
            <button type="button" {...props} aria-label={t('console.nav.account')}
              className="ms-1 flex h-10 items-center gap-2 rounded-pill border border-line bg-surface ps-1 pe-1 shadow-card hover:border-line-strong sm:pe-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-fg-on-primary">
                {initials}
              </span>
              <span className="hidden max-w-40 truncate text-sm font-semibold text-fg sm:block">{name}</span>
            </button>
          )}
          header={(
            <div className="flex flex-col">
              <span className="truncate text-sm font-semibold text-fg">{profile.data?.full_name ?? ''}</span>
              <span dir="ltr" className="truncate text-xs text-fg-muted">{auth.user?.email}</span>
            </div>
          )}
          items={[
            { label: t('console.nav.account'), icon: 'user', onSelect: () => router.push(`/${locale}/account`) },
            'divider',
            { label: t('console.shell.signOut'), icon: 'logout', tone: 'danger', onSelect: () => setConfirm(true) },
          ]}
        />
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('console.shell.signOutTitle')}
        body={t('console.shell.signOutBody')}
        confirmLabel={t('console.shell.signOut')}
        tone="danger"
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          await auth.signOut('local');
          setBusy(false);
          setConfirm(false);
          router.replace(`/${locale}/sign-in`);
        }}
      />
    </header>
  );
}

function OfflineNotice() {
  const t = useT();
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-sm font-semibold text-warning">
      <Icon name="offline" size={16} />
      {t('console.shell.offline')}
    </div>
  );
}
