import { titled } from '@/lib/i18n/server';

import { AlertsScreen } from './screen';

export const generateMetadata = titled('console.nav.alerts');

export default function AlertsPage() {
  return <AlertsScreen />;
}
