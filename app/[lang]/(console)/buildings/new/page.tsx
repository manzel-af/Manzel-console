import { titled } from '@/lib/i18n/server';

import { NewBuildingScreen } from './screen';

export const generateMetadata = titled('manage.admin.newBuilding');

export default function NewBuildingPage() {
  return <NewBuildingScreen />;
}
