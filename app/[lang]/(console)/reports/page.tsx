import { titled } from '@/lib/i18n/server';

import { ReportsScreen } from './screen';

export const generateMetadata = titled('safety.reports.title');

export default function ReportsPage() {
  return <ReportsScreen />;
}
