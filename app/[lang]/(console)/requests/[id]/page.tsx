import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { RequestScreen } from './screen';

export const generateMetadata = titled('manage.admin.requests');

export default function RequestPage({ params }: PageProps<'/[lang]/requests/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <RequestScreen params={params} />
    </Suspense>
  );
}
