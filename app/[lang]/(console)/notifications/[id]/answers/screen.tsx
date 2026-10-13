'use client';

import { use } from 'react';

import { AnswersView } from '@/components/content/answers';
import { useHref, useT } from '@/lib/i18n/client';

export function CampaignAnswersScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const href = useHref();
  return <AnswersView of={{ campaignId: id }} back={href(`/notifications/${id}`)} backLabel={t('admin.push.delivery')} />;
}
