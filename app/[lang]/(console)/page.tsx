import { titled } from '@/lib/i18n/server';

import { OverviewScreen } from './overview-screen';

export const generateMetadata = titled('console.nav.overview');

export default function OverviewPage() {
  return <OverviewScreen />;
}
