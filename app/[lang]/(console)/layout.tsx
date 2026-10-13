/**
 * Every operator page sits inside the console shell: the gate (signed in,
 * authenticator verified, operator) and the sidebar. Its prerendered shell is
 * the brand's loading mark; the rest is drawn in the browser with the
 * operator's own session.
 */

import { Suspense } from 'react';

import { LogoMark } from '@/components/brand/logo';
import { ConsoleShell } from '@/components/shell/console-shell';

export default function ConsoleLayout({ children }: LayoutProps<'/[lang]'>) {
  return (
    <Suspense fallback={(
      <div className="grid min-h-dvh place-items-center bg-bg" aria-busy="true">
        <LogoMark size={56} className="animate-pulse" />
      </div>
    )}>
      <ConsoleShell>{children}</ConsoleShell>
    </Suspense>
  );
}
