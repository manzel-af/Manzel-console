import { titled } from '@/lib/i18n/server';

import { DuplicatesScreen } from './screen';

export const generateMetadata = titled('duplicates.title');

export default function DuplicatesPage() {
  return <DuplicatesScreen />;
}
