import { titled } from '@/lib/i18n/server';

import { BuildingsScreen } from './screen';

export const generateMetadata = titled('admin.buildings.title');

export default function BuildingsPage() {
  return <BuildingsScreen />;
}
