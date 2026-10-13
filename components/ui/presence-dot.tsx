import { cn } from '@/lib/cn';

/** The green dot: in the app right now. */
export function PresenceDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', online ? 'bg-success' : 'bg-line-strong', className)} />
  );
}
