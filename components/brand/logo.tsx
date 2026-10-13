/**
 * The Manzel identity, "Taq" (طاق, the arch) — the same drawing as the app
 * and the website (components/brand there), from the designer's files.
 *
 *   LogoMark   the arch-m: on its lapis tile (the app icon), or alone
 *   Logo       the name: منزل, or "manzel منزل" on English pages
 *
 * Shapes: ./paths.ts, copied from the website (generated there from
 * assets/brand/*.svg in the app repository).
 */

import { BRAND, LOCKUP_HORIZONTAL, MARK, TILE, WORDMARK_DARI, type BrandShape } from './paths';

function Shape({ shape, ink }: { shape: BrandShape; ink: string }) {
  return (
    <>
      {shape.letters.map((d, index) => <path key={`l${index}`} d={d} fill={ink} fillRule="evenodd" />)}
      {shape.light.map((d, index) => <path key={`g${index}`} d={d} fill={BRAND.saffron} fillRule="evenodd" />)}
    </>
  );
}

/**
 * The arch-m. `tile` (default) is the app icon: the arches in paper on a
 * rounded lapis square. `mark` is the arches alone, in the page's lapis.
 */
export function LogoMark({
  size = 40, className, title, variant = 'tile',
}: {
  size?: number;
  className?: string;
  title?: string;
  variant?: 'tile' | 'mark';
}) {
  const a11y = title ? { role: 'img' as const } : { 'aria-hidden': true as const };

  if (variant === 'mark') {
    return (
      <svg width={size} height={(size * MARK.height) / MARK.width} viewBox={MARK.viewBox}
        className={`text-lapis-600 dark:text-lapis-300 ${className ?? ''}`} {...a11y}>
        {title ? <title>{title}</title> : null}
        <Shape shape={MARK} ink="currentColor" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${TILE.size} ${TILE.size}`} className={className} {...a11y}>
      {title ? <title>{title}</title> : null}
      <rect width={TILE.size} height={TILE.size} rx={TILE.radius} fill={BRAND.lapis} />
      <Shape shape={MARK} ink={BRAND.paper} />
    </svg>
  );
}

/**
 * The name. منزل on Dari and Pashto pages; "manzel منزل" on English ones.
 * `size` is the height of the Dari letters in pixels.
 */
export function Logo({ latin = false, size = 28, className }: { latin?: boolean; size?: number; className?: string }) {
  const shape = latin ? LOCKUP_HORIZONTAL : WORDMARK_DARI;
  const width = (size * shape.width) / shape.height;
  return (
    <svg width={Math.round(width)} height={size} viewBox={shape.viewBox}
      className={`inline-block shrink-0 text-lapis-600 dark:text-lapis-300 ${className ?? ''}`}
      role="img" aria-label="منزل Manzel">
      <Shape shape={shape} ink="currentColor" />
    </svg>
  );
}
