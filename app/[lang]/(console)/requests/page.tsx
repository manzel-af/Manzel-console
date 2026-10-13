import { titled } from '@/lib/i18n/server';

import { RequestsScreen } from './screen';

export const generateMetadata = titled('admin.requests.title');

export default function RequestsPage() {
  return <RequestsScreen />;
}
