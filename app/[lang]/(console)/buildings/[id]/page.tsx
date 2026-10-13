import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { BuildingScreen } from './screen';

export const generateMetadata = titled('admin.buildings.title');

export default function BuildingPage({ params }: PageProps<'/[lang]/buildings/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton tiles rows={4} />}>
      <BuildingScreen params={params} />
    </Suspense>
  );
}
