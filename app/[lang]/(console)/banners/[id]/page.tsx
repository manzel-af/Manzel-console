import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { EditBannerScreen } from './screen';

export const generateMetadata = titled('admin.banner.edit');

export default function EditBannerPage({ params }: PageProps<'/[lang]/banners/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <EditBannerScreen params={params} />
    </Suspense>
  );
}
