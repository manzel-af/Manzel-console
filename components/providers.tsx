'use client';

/**
 * Everything every page needs on the client: the words, the data cache, who
 * is signed in, and the toasts.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth/auth';
import { I18nProvider } from '@/lib/i18n/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/languages';

export function Providers({
  locale, dictionary, preview, children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  preview: Record<string, Dictionary>;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Operators act on what they see: keep it fresh, but do not refetch
        // a page's data on every click between tabs.
        staleTime: 20_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  }));

  return (
    <I18nProvider locale={locale} dictionary={dictionary} preview={preview}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
