import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { BannerAnswersScreen } from './screen';

export const generateMetadata = titled('content.answers.title');

export default function BannerAnswersPage({ params }: PageProps<'/[lang]/banners/[id]/answers'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <BannerAnswersScreen params={params} />
    </Suspense>
  );
}
