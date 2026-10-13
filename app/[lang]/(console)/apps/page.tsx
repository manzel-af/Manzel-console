import { titled } from '@/lib/i18n/server';

import { AppsScreen } from './screen';

export const generateMetadata = titled('console.nav.apps');

export default function AppsPage() {
  return <AppsScreen />;
}
