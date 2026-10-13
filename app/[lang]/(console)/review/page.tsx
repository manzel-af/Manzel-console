import { titled } from '@/lib/i18n/server';

import { ReviewScreen } from './screen';

export const generateMetadata = titled('reviewAccess.title');

export default function ReviewPage() {
  return <ReviewScreen />;
}
