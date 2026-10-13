/**
 * What a page shows while its data is on the way: its own shape, in grey.
 * Server-safe, so it can be a Suspense fallback in a page file.
 */

import { Skeleton, SkeletonRows } from './feedback';

export function PageSkeleton({ rows = 6, tiles = false }: { rows?: number; tiles?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2 pb-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {tiles ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-card" />)}
        </div>
      ) : null}
      <SkeletonRows rows={rows} />
    </div>
  );
}
