import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { CampaignAnswersScreen } from './screen';

export const generateMetadata = titled('content.answers.title');

export default function CampaignAnswersPage({ params }: PageProps<'/[lang]/notifications/[id]/answers'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <CampaignAnswersScreen params={params} />
    </Suspense>
  );
}
