'use client';

/**
 * A file in a private bucket, drawn: a picture, a voice note, or a link. The
 * console never holds a public address for these — it asks for a signed link
 * that expires within the hour, and only when the message is on screen.
 */

import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/ui/icon';
import { signedUrl } from '@/lib/api/support';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';

export function useSignedUrl(bucket: string, path: string | null) {
  return useQuery({
    queryKey: ['signed-url', bucket, path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: () => signedUrl(bucket, path!, 3600),
  });
}

export function isVoice(type: string | null | undefined): boolean {
  return Boolean(type && type.startsWith('audio/'));
}

export function isImage(type: string | null | undefined): boolean {
  return Boolean(type && type.startsWith('image/'));
}

export function Attachment({
  bucket, path, type, durationMs,
}: {
  bucket: string;
  path: string;
  type: string | null;
  durationMs?: number | null;
}) {
  const t = useT();
  const fmt = useFormat();
  const url = useSignedUrl(bucket, path);

  if (url.isPending) return <span className="skeleton block h-40 w-56 rounded-xl" aria-busy="true" />;
  if (!url.data) {
    return <span className="text-sm text-fg-subtle">{t('errors.generic')}</span>;
  }

  if (isImage(type)) {
    return (
      <a href={url.data} target="_blank" rel="noopener noreferrer" className="block w-fit overflow-hidden rounded-xl border border-line">
        {/* A signed, expiring link to a private picture: next/image would cache it under a URL that dies. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url.data} alt="" loading="lazy" className="max-h-72 max-w-full object-contain sm:max-w-sm" />
      </a>
    );
  }

  if (isVoice(type)) {
    const seconds = durationMs ? Math.round(durationMs / 1000) : null;
    return (
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Icon name="mic" size={14} />
          {t('console.support.voice')}
          {seconds !== null ? ` · ${fmt.number(Math.floor(seconds / 60))}:${fmt.number(String(seconds % 60).padStart(2, '0'))}` : ''}
        </span>
        <audio controls preload="none" src={url.data} className="h-10 w-64 max-w-full" />
      </div>
    );
  }

  return (
    <a href={url.data} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-sunken">
      <Icon name="download" size={16} />
      {t('console.support.openFile')}
    </a>
  );
}
