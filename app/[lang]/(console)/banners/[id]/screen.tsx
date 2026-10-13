'use client';

import { use } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAdminBanners } from '@/lib/api/admin';
import { useHref, useT } from '@/lib/i18n/client';

import { BannerEditor } from '../banner-editor';

export function EditBannerScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const href = useHref();
  const banners = useAdminBanners();

  if (banners.isLoading) return <PageSkeleton rows={5} />;
  const existing = banners.data?.find((banner) => banner.id === id) ?? null;
  if (!existing) {
    return (
      <EmptyState icon="megaphone" title={t('admin.errors.notFound')}
        action={<ButtonLink href={href('/banners')} icon="back" label={t('admin.banners.title')} />} />
    );
  }
  // A fresh form per banner: its fields start from that banner's values.
  return <BannerEditor key={existing.id} existing={existing} />;
}
