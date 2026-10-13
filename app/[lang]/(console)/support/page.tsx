import { EmptyState } from '@/components/ui/feedback';
import { getServerT, titled } from '@/lib/i18n/server';
import { lang } from 'next/root-params';

export const generateMetadata = titled('admin.support.title');

/** Nothing open yet: on a desk, the conversation pane says so. */
export default async function SupportPage() {
  const t = await getServerT(await lang());
  return (
    <EmptyState icon="chat" title={t('console.support.choose')} body={t('console.support.chooseBody')}
      className="rounded-card border border-dashed border-line-strong bg-surface/60 py-24" />
  );
}
