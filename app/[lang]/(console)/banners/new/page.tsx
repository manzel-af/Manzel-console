import { Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { titled } from '@/lib/i18n/server';

import { NewBannerScreen } from './screen';

export const generateMetadata = titled('admin.banners.new');

/** The apps a new banner is for may be in the address (?apps=), read in the browser. */
export default function NewBannerPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <NewBannerScreen />
    </Suspense>
  );
}
