import { titled } from '@/lib/i18n/server';

import { BillingScreen } from './screen';

export const generateMetadata = titled('admin.billing.title');

export default function BillingPage() {
  return <BillingScreen />;
}
