import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { ComposeScreen } from './screen';

export const generateMetadata = titled('admin.push.new');

/** Some apps only may be in the address (?apps=, from App versions), read in the browser. */
export default function ComposePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <ComposeScreen />
    </Suspense>
  );
}
