'use client';

import { use } from 'react';

import { AnswersView } from '@/components/content/answers';
import { useHref, useT } from '@/lib/i18n/client';

export function BannerAnswersScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const href = useHref();
  return <AnswersView of={{ announcementId: id }} back={href(`/banners/${id}`)} backLabel={t('admin.banner.edit')} />;
}
