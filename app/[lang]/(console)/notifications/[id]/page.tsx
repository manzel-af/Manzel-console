import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { CampaignScreen } from './screen';

export const generateMetadata = titled('admin.push.delivery');

export default function CampaignPage({ params }: PageProps<'/[lang]/notifications/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} tiles />}>
      <CampaignScreen params={params} />
    </Suspense>
  );
}
