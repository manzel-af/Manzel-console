import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { EditBuildingScreen } from './screen';

export const generateMetadata = titled('admin.building.edit');

export default function EditBuildingPage({ params }: PageProps<'/[lang]/buildings/[id]/edit'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <EditBuildingScreen params={params} />
    </Suspense>
  );
}
