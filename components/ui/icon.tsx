/**
 * Icons: the app's hand-drawn set (icon-paths.tsx, copied by `npm run sync`)
 * plus the few a desk console needs that a phone app did not. Same grid
 * (24×24), same 1.75 stroke, round caps — one family.
 *
 * Icons that point somewhere (chevrons, arrows, send, back…) are mirrored in
 * Dari and Pashto by CSS (`rtl:`), from the page's own direction; objects are
 * not mirrored, because a mirrored spanner is a wrong spanner.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { APP_DIRECTIONAL, APP_ICON_PATHS, type AppIconName } from './icon-paths';

type ConsoleIconName =
  | 'menu' | 'grid' | 'filter' | 'external' | 'smartphone' | 'shieldCheck' | 'eye' | 'sidebar'
  | 'help' | 'minus' | 'sort' | 'monitor' | 'link' | 'upload' | 'chevronDown' | 'activity';

export type IconName = AppIconName | ConsoleIconName;

const CONSOLE_PATHS: Record<ConsoleIconName, ReactNode> = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  grid: (
    <g>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </g>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.3v5.7l-3.6 1.8v-7.5Z" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10" />,
  smartphone: (
    <g>
      <rect x="7" y="2.75" width="10" height="18.5" rx="2.2" />
      <path d="M11 17.75h2" />
    </g>
  ),
  shieldCheck: (
    <g>
      <path d="M12 3.25 5 6v5.5c0 4.2 3 7.6 7 9.25 4-1.65 7-5.05 7-9.25V6Z" />
      <path d="m9 12.2 2.1 2.1 4.1-4.3" />
    </g>
  ),
  eye: (
    <g>
      <path d="M2.75 12S6.25 5.5 12 5.5 21.25 12 21.25 12 17.75 18.5 12 18.5 2.75 12 2.75 12Z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  ),
  sidebar: (
    <g>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
      <path d="M9.5 4.5v15" />
    </g>
  ),
  help: (
    <g>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6v.1" />
    </g>
  ),
  minus: <path d="M5 12h14" />,
  sort: <path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3" />,
  monitor: (
    <g>
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.8" />
      <path d="M9 20h6M12 16v4" />
    </g>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />,
  upload: <path d="M12 15.5v-11M7.5 9 12 4.5 16.5 9M5 15.5v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />,
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  activity: <path d="M3.5 12h3.5l2.5-6.5 5 13 2.5-6.5h3.5" />,
};

const CONSOLE_DIRECTIONAL = new Set<string>(['external']);

export function Icon({
  name, size = 20, className, filled = false, strokeWidth = 1.75, label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  /** Solid instead of outlined. */
  filled?: boolean;
  strokeWidth?: number;
  /** For an icon that carries meaning on its own; otherwise it is hidden from screen readers. */
  label?: string;
}) {
  const drawing = (APP_ICON_PATHS as Record<string, ReactNode>)[name] ?? CONSOLE_PATHS[name as ConsoleIconName];
  const directional = APP_DIRECTIONAL.has(name) || CONSOLE_DIRECTIONAL.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', directional && 'rtl:-scale-x-100', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {drawing}
    </svg>
  );
}
