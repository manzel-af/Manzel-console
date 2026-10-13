'use client';

import { useSearchParams } from 'next/navigation';

import { targetFromParam } from '@/lib/api/apps';

import { BannerEditor } from '../banner-editor';

/** A new banner — for some app versions only when the App versions page sent one (?apps=). */
export function NewBannerScreen() {
  const params = useSearchParams();
  return <BannerEditor existing={null} initialApps={targetFromParam(params.get('apps'))} />;
}
