import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { PeopleScreen } from './screen';

export const generateMetadata = titled('admin.users.title');

export default function PeoplePage() {
  // The overview's "online now" opens this list already filtered (?presence=online).
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <PeopleScreen />
    </Suspense>
  );
}
