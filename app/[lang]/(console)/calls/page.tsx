import { titled } from '@/lib/i18n/server';

import { CallsScreen } from './screen';

export const generateMetadata = titled('calls.admin.title');

export default function CallsPage() {
  return <CallsScreen />;
}
