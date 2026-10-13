import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { AuditScreen } from './screen';

export const generateMetadata = titled('admin.audit.title');

/** The building to narrow to is in the address (?building=), read in the browser. */
export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <AuditScreen />
    </Suspense>
  );
}
