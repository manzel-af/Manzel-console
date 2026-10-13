import { titled } from '@/lib/i18n/server';

import { AccountScreen } from './screen';

export const generateMetadata = titled('console.account.title');

export default function AccountPage() {
  return <AccountScreen />;
}
