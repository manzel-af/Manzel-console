import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { PersonScreen } from './screen';

export const generateMetadata = titled('admin.users.title');

export default function PersonPage({ params }: PageProps<'/[lang]/people/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton tiles rows={4} />}>
      <PersonScreen params={params} />
    </Suspense>
  );
}
