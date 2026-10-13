import { Suspense } from 'react';

import { SkeletonRows } from '@/components/ui/feedback';
import { titled } from '@/lib/i18n/server';

import { ConversationScreen } from './screen';

export const generateMetadata = titled('admin.support.title');

export default function ConversationPage({ params }: PageProps<'/[lang]/support/[id]'>) {
  return (
    <Suspense fallback={<SkeletonRows rows={5} />}>
      <ConversationScreen params={params} />
    </Suspense>
  );
}
