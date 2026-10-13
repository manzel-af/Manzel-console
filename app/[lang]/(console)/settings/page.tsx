import { titled } from '@/lib/i18n/server';

import { SettingsScreen } from './screen';

export const generateMetadata = titled('admin.settings.title');

export default function SettingsPage() {
  return <SettingsScreen />;
}
