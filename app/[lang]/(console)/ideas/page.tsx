import { titled } from '@/lib/i18n/server';

import { IdeasScreen } from './screen';

export const generateMetadata = titled('admin.ideas.title');

export default function IdeasPage() {
  return <IdeasScreen />;
}
