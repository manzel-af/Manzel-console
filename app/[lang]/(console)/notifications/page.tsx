import { titled } from '@/lib/i18n/server';

import { NotificationsScreen } from './screen';

export const generateMetadata = titled('admin.push.title');

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
