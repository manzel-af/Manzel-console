import { titled } from '@/lib/i18n/server';

import { BannersScreen } from './screen';

export const generateMetadata = titled('admin.banners.title');

export default function BannersPage() {
  return <BannersScreen />;
}
