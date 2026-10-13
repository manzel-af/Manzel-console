/**
 * The way in. Static around the edges — the brand, the card — and the steps
 * themselves in the browser, where the session lives.
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SignInFlow } from '@/components/auth/sign-in-flow';
import { LogoMark } from '@/components/brand/logo';
import { LanguageSwitch, ThemeSwitch } from '@/components/shell/switchers';
import { Skeleton } from '@/components/ui/feedback';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/languages';

function pick(dictionary: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], dictionary);
  return typeof value === 'string' ? value : path;
}

export async function generateMetadata({ params }: PageProps<'/[lang]/sign-in'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dictionary = await getDictionary(lang);
  return { title: pick(dictionary, 'console.auth.title') };
}

export default async function SignInPage({ params }: PageProps<'/[lang]/sign-in'>) {
  const { lang } = await params;
  const dictionary = isLocale(lang) ? await getDictionary(lang) : {};

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden girih [--girih-opacity:0.05]">
      <div className="pointer-events-none absolute inset-0 window-glow opacity-70" aria-hidden />

      <header className="relative flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark size={36} />
          <span className="text-base font-bold text-fg">{pick(dictionary, 'console.name')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Suspense fallback={<span className="h-10 w-20" />}>
            <LanguageSwitch />
          </Suspense>
          <ThemeSwitch />
        </div>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[26rem] animate-rise rounded-[1.5rem] border border-line bg-surface/95 p-6 shadow-pop backdrop-blur sm:p-8">
          <Suspense fallback={(
            <div className="flex flex-col gap-4" aria-busy="true">
              <Skeleton className="mx-auto h-6 w-2/3" />
              <Skeleton className="mx-auto h-4 w-4/5" />
              <Skeleton className="h-11 w-full rounded-field" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          )}>
            <SignInFlow />
          </Suspense>
        </div>
      </main>

      <footer className="relative px-4 pb-6 text-center text-xs text-fg-subtle">
        {pick(dictionary, 'console.auth.secure')}
      </footer>
    </div>
  );
}
