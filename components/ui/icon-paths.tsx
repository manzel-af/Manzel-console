// Copied from the Manzel app (src/components/ui/icon.tsx) by scripts/sync-from-app.mjs.
// Do not edit here: change it in the app and run `npm run sync`.

import type { ReactNode } from 'react';

export type AppIconName =
  | 'home' | 'invoice' | 'receipt' | 'wrench' | 'megaphone' | 'settings'
  | 'building' | 'wallet' | 'chart' | 'users' | 'gate' | 'key'
  | 'chevron' | 'back' | 'arrow' | 'plus' | 'check' | 'close' | 'search'
  | 'alert' | 'info' | 'clock' | 'calendar' | 'phone' | 'share'
  | 'lock' | 'sun' | 'moon' | 'globe' | 'offline' | 'sync'
  | 'trash' | 'edit' | 'copy' | 'logout' | 'water' | 'bolt' | 'lift'
  | 'generator' | 'broom' | 'shield' | 'dots' | 'printer' | 'user' | 'undo'
  | 'mail' | 'chat' | 'download'
  | 'cloud' | 'cloudSun' | 'rain' | 'snow' | 'storm' | 'fog' | 'pin'
  | 'bell' | 'send' | 'image' | 'camera' | 'reply' | 'smile'
  | 'mic' | 'play' | 'pause'
  | 'video' | 'videoOff' | 'micOff' | 'speaker' | 'flip' | 'hangup'
  | 'callIn' | 'callOut' | 'callMissed' | 'flag' | 'block'
  | 'pushpin' | 'unpin';

/** Icons whose meaning depends on which way they point: mirrored in Dari and Pashto. */
export const APP_DIRECTIONAL: ReadonlySet<string> = new Set([
  'chevron', 'back', 'arrow', 'share', 'logout', 'undo', 'send', 'callIn', 'callOut', 'reply',
]);

export const APP_ICON_PATHS: Record<AppIconName, ReactNode> = {
  home: <path d="M3.5 10.2 12 3.5l8.5 6.7V20a.8.8 0 0 1-.8.8h-4.4v-6h-6.6v6H4.3a.8.8 0 0 1-.8-.8Z" />,
  invoice: (
    <g>
      <path d="M5.5 3.5h13v17l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.1-1.5-2.2 1.5Z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </g>
  ),
  receipt: (
    <g>
      <path d="M5.5 3.5h13v17l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.1-1.5-2.2 1.5Z" />
      <path d="M9 9.5h6M9 13.5h3.5" />
    </g>
  ),
  wrench: <path d="M15.6 3.6a5 5 0 0 0-5.9 6.6L3.9 16a2 2 0 1 0 2.8 2.8l5.8-5.8a5 5 0 0 0 6.6-5.9l-3 3-2.5-2.5Z" />,
  bell: (
    <g>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2.1a.5.5 0 0 1-.4.8H4.8a.5.5 0 0 1-.4-.8Z" />
      <path d="M10 21a2.2 2.2 0 0 0 4 0" />
    </g>
  ),
  // A paper plane, for sending a notification.
  send: <path d="M3.5 11.3 20 4l-7.3 16.5-2.2-7Z M10.5 13.5 20 4" />,
  // A capsule microphone on its stand: what every messaging app uses, so
  // nobody has to work out what the button does.
  mic: (
    <g>
      <rect x={9} y={2.75} width={6} height={11} rx={3} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </g>
  ),
  play: <path d="M8 5.3v13.4a.6.6 0 0 0 .9.5l10.2-6.7a.6.6 0 0 0 0-1L8.9 4.8a.6.6 0 0 0-.9.5Z" />,
  // Calls (V029). A slash through an icon means "off", as on every phone.
  micOff: (
    <g>
      <rect x={9} y={2.75} width={6} height={11} rx={3} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
      <path d="M4 4l16 16" />
    </g>
  ),
  video: (
    <g>
      <rect x={3} y={6.5} width={12.5} height={11} rx={2.5} />
      <path d="m15.5 10.5 5-3v9l-5-3Z" />
    </g>
  ),
  videoOff: (
    <g>
      <rect x={3} y={6.5} width={12.5} height={11} rx={2.5} />
      <path d="m15.5 10.5 5-3v9l-5-3Z" />
      <path d="M3.5 3.5l17 17" />
    </g>
  ),
  speaker: (
    <g>
      <path d="M4 9.5h3.5l4.5-4v13l-4.5-4H4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </g>
  ),
  // Two arrows chasing each other: switch between the front and back camera.
  flip: (
    <g>
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1" />
      <path d="M17.8 3.5v3.6h-3.6M6.2 20.5v-3.6h3.6" />
    </g>
  ),
  // The handset put down: the red button.
  hangup: (
    <path d="M3.3 14.4c-.5-.6-.5-1.5.1-2a13 13 0 0 1 17.2 0c.6.5.6 1.4.1 2l-1.6 1.8-3.7-1.4.2-2.4a10.5 10.5 0 0 0-7.2 0l.2 2.4-3.7 1.4Z" />
  ),
  // Call history: the handset with an arrow in, out, or a cross for missed.
  callIn: (
    <g>
      <path d="M6.2 3.8h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 4.2 6a2 2 0 0 1 2-2.2Z" />
      <path d="M20.5 3.5 15 9M15 5v4h4" />
    </g>
  ),
  callOut: (
    <g>
      <path d="M6.2 3.8h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 4.2 6a2 2 0 0 1 2-2.2Z" />
      <path d="M15 9l5.5-5.5M16.5 3.5h4v4" />
    </g>
  ),
  callMissed: (
    <g>
      <path d="M6.2 3.8h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 4.2 6a2 2 0 0 1 2-2.2Z" />
      <path d="M15.5 3.5l4.5 4.5M20 3.5l-4.5 4.5" />
    </g>
  ),
  pause: (
    <g>
      <path d="M9.25 4.5v15" />
      <path d="M14.75 4.5v15" />
    </g>
  ),
  image: (
    <g>
      <rect x={3.5} y={4.5} width={17} height={15} rx={2} />
      <circle cx={9} cy={10} r={1.8} />
      <path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4" />
    </g>
  ),
  // Taking a photo for a message: the body, the bump, the lens.
  camera: (
    <g>
      <path d="M4.5 7.5h3l1.6-2.5h5.8l1.6 2.5h3a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx={12} cy={13} r={3.5} />
    </g>
  ),
  // Answering one message in particular: the arrow turns back to it.
  reply: <path d="M9.5 5.5 4 11l5.5 5.5M4 11h9.5a6 6 0 0 1 6 6v1.5" />,
  // Reacting to a message.
  smile: (
    <g>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M8.5 14a4.2 4.2 0 0 0 7 0M9.2 9.6h.01M14.8 9.6h.01" />
    </g>
  ),
  megaphone: (
    <g>
      <path d="M4 9.5v4a1.5 1.5 0 0 0 1.5 1.5H8l7 4V5.5l-7 4H5.5A1.5 1.5 0 0 0 4 11Z" />
      <path d="M18 9a3.5 3.5 0 0 1 0 6" />
    </g>
  ),
  // A toothed gear. The first version was a circle with six spokes, which at
  // 18 px read as a sun and sat next to the theme switch's sun.
  settings: (
    <g>
      <path d="M10.3 3.5h3.4l.5 2.4 1.6.9 2.3-.8 1.7 2.9-1.8 1.6v1.9l1.8 1.6-1.7 2.9-2.3-.8-1.6.9-.5 2.4h-3.4l-.5-2.4-1.6-.9-2.3.8-1.7-2.9 1.8-1.6v-1.9L4.2 8.9l1.7-2.9 2.3.8 1.6-.9Z" />
      <circle cx={12} cy={12} r={2.8} />
    </g>
  ),
  building: (
    <g>
      <rect x={4.5} y={3.5} width={15} height={17} rx={1.5} />
      <path d="M8.5 7.5h2M13.5 7.5h2M8.5 11.5h2M13.5 11.5h2M10 20.5v-4h4v4" />
    </g>
  ),
  wallet: (
    <g>
      <rect x={3.5} y={6.5} width={17} height={12} rx={2.5} />
      <path d="M3.5 10.5h17M16.5 14.5h1.5" />
    </g>
  ),
  chart: <path d="M4 20h16M7.5 20v-6M12 20V8M16.5 20v-9" />,
  users: (
    <g>
      <circle cx={9} cy={8.5} r={3.2} />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 6.2a3.2 3.2 0 0 1 0 6M17.5 19.5a5.5 5.5 0 0 0-2-4.2" />
    </g>
  ),
  gate: (
    <g>
      <path d="M3.5 20.5V8.2L12 3.5l8.5 4.7v12.3" />
      <path d="M8.5 20.5v-7h7v7M12 13.5v7" />
    </g>
  ),
  key: (
    <g>
      <circle cx={8} cy={8} r={4} />
      <path d="M10.9 10.9 20 20M17 17l-2 2M14.5 14.5l-1.7 1.7" />
    </g>
  ),
  chevron: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  arrow: <path d="M4.5 12h14M13 6.5 18.5 12 13 17.5" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="M5 12.8 9.8 17.5 19 7.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  search: (
    <g>
      <circle cx={10.5} cy={10.5} r={6} />
      <path d="M15 15l5 5" />
    </g>
  ),
  alert: (
    <g>
      <path d="M12 3.8 21 19.5H3Z" />
      <path d="M12 10v4M12 17h.01" />
    </g>
  ),
  info: (
    <g>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 11v5.5M12 7.8h.01" />
    </g>
  ),
  clock: (
    <g>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 7v5.2l3.2 2" />
    </g>
  ),
  calendar: (
    <g>
      <rect x={3.5} y={5.5} width={17} height={15} rx={2.5} />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </g>
  ),
  phone: <path d="M6.2 3.8h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 4.2 6a2 2 0 0 1 2-2.2Z" />,
  share: (
    <g>
      <path d="M12 3.5v12M8 7.2 12 3.4l4 3.8" />
      <path d="M5.5 13.5v5.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-5.5" />
    </g>
  ),
  lock: (
    <g>
      <rect x={4.5} y={10.5} width={15} height={10} rx={2.5} />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
    </g>
  ),
  printer: (
    <g>
      <path d="M7 8.5v-5h10v5" />
      <path d="M7 17H5a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 19 17h-2" />
      <path d="M7 13.5h10v7H7Z" />
    </g>
  ),
  user: (
    <g>
      <circle cx={12} cy={8} r={4} />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </g>
  ),
  undo: (
    <g>
      <path d="M8.5 13.5 4 9l4.5-4.5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </g>
  ),
  sun: (
    <g>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2.8v2M12 19.2v2M4.2 12h2M17.8 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M6.4 17.6l1.4-1.4M16.2 7.8l1.4-1.4" />
    </g>
  ),
  moon: <path d="M20 14.2A8.5 8.5 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />,
  // Weather (the home screen's forecast). One cloud shape throughout.
  cloud: <path d="M7.2 18.5h9.9a4 4 0 0 0 .5-7.96 5.6 5.6 0 0 0-10.6-.9 4.45 4.45 0 0 0 .2 8.86Z" />,
  cloudSun: (
    <g>
      <circle cx={8.2} cy={7.6} r={2.6} />
      <path d="M8.2 2.6v1.1M3.2 7.6h1.1M4.7 4.1l.8.8M11.7 4.1l-.8.8" />
      <path d="M9.4 20h8.1a3.6 3.6 0 0 0 .45-7.17 5 5 0 0 0-9.45-.8 4 4 0 0 0 .9 7.97Z" />
    </g>
  ),
  rain: (
    <g>
      <path d="M7.2 15h9.9a4 4 0 0 0 .5-7.96 5.6 5.6 0 0 0-10.6-.9A4.45 4.45 0 0 0 7.2 15Z" />
      <path d="M8.6 17.8l-.9 2.4M12.6 17.8l-.9 2.4M16.6 17.8l-.9 2.4" />
    </g>
  ),
  snow: (
    <g>
      <path d="M7.2 15h9.9a4 4 0 0 0 .5-7.96 5.6 5.6 0 0 0-10.6-.9A4.45 4.45 0 0 0 7.2 15Z" />
      <path d="M8.5 18.3h.01M12 18.3h.01M15.5 18.3h.01M10.2 21h.01M13.8 21h.01" />
    </g>
  ),
  storm: (
    <g>
      <path d="M7.2 15h9.9a4 4 0 0 0 .5-7.96 5.6 5.6 0 0 0-10.6-.9A4.45 4.45 0 0 0 7.2 15Z" />
      <path d="M12.8 15.8 10.9 19h2.7l-1.9 3" />
    </g>
  ),
  fog: <path d="M4 8.5h16M6.5 12.5h11M4 16.5h16M8 20.5h8" />,
  pin: (
    <g>
      <path d="M12 21s-6.5-5.8-6.5-10.8a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21Z" />
      <circle cx={12} cy={10.2} r={2.3} />
    </g>
  ),
  // A drawing pin, for a message pinned to the top of a room ('pin' is a place).
  pushpin: (
    <g>
      <path d="M8.5 3.5h7M9.7 3.5v5.4l-3.1 4.3h10.8l-3.1-4.3V3.5" />
      <path d="M12 13.2v7.3" />
    </g>
  ),
  unpin: (
    <g>
      <path d="M8.5 3.5h7M9.7 3.5v5.4l-3.1 4.3h10.8l-3.1-4.3V3.5" />
      <path d="M12 13.2v7.3M4 4l16 16" />
    </g>
  ),
  globe: (
    <g>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M3.5 12h17M12 3.5c4.5 5 4.5 12 0 17-4.5-5-4.5-12 0-17Z" />
    </g>
  ),
  offline: (
    <g>
      <path d="M5 12.5a9 9 0 0 1 4-2.3M15 10.2a9 9 0 0 1 4 2.3M8.3 16a5 5 0 0 1 7.4 0M12 19.8h.01" />
      <path d="M3.5 3.5l17 17" />
    </g>
  ),
  sync: <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6M17.5 3v3.8h-3.8M6.5 21v-3.8h3.8" />,
  trash: (
    <g>
      <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.6 19a1.5 1.5 0 0 0 1.5 1.4h5.8a1.5 1.5 0 0 0 1.5-1.4l1.1-12.5" />
    </g>
  ),
  edit: <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L4.5 17.5ZM14.5 7.5l2 2" />,
  mail: (
    <g>
      <rect x={3.5} y={5.5} width={17} height={13} rx={2} />
      <path d="m4 7 8 6 8-6" />
    </g>
  ),
  // A speech bubble: messaging in general, not any one app's logo.
  chat: <path d="M12 4c4.7 0 8.5 3.2 8.5 7.2s-3.8 7.2-8.5 7.2c-1 0-2-.1-2.9-.4L5 19.8l1.1-3.4C4.5 15 3.5 13.2 3.5 11.2 3.5 7.2 7.3 4 12 4Z" />,
  download: (
    <g>
      <path d="M12 3.5v11.5M8 11.2l4 3.8 4-3.8" />
      <path d="M5.5 15.5v3.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-3.5" />
    </g>
  ),
  copy: (
    <g>
      <rect x={8.5} y={3.5} width={12} height={12} rx={2.5} />
      <path d="M15.5 15.5v3a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3" />
    </g>
  ),
  logout: <path d="M14.5 3.5h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-3M10 8.5 13.5 12 10 15.5M13.5 12h-9" />,
  water: <path d="M12 3.5s6 7 6 10.5a6 6 0 1 1-12 0C6 10.5 12 3.5 12 3.5Z" />,
  bolt: <path d="M13.5 3.5 6 13.5h5l-.5 7 7.5-10h-5Z" />,
  lift: (
    <g>
      <rect x={5} y={3.5} width={14} height={17} rx={2} />
      <path d="M12 3.5v17M8.5 9l-.01-.01M9.8 11 8.5 9 7.2 11M14.2 13l1.3 2 1.3-2" />
    </g>
  ),
  generator: (
    <g>
      <rect x={3.5} y={8} width={17} height={9} rx={2} />
      <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7.5 17v2.5M16.5 17v2.5M11 11.5l-1.5 2.5h3L11 16.5" />
    </g>
  ),
  broom: <path d="M14 3.5 9 12M5 20.5l1.5-5.5 7-4 3.5 3.5-4 7ZM8.5 15.5l3.5 3.5" />,
  shield: <path d="M12 3.5 5 6v6c0 4 3 7.2 7 8.5 4-1.3 7-4.5 7-8.5V6Z" />,
  // Reporting a message (V033).
  flag: (
    <g>
      <path d="M6 21V4" />
      <path d="M6 4.5h11.5l-2.6 4 2.6 4H6" />
    </g>
  ),
  // Blocking a person (V033).
  block: (
    <g>
      <circle cx={12} cy={12} r={8.2} />
      <path d="M6.2 6.2l11.6 11.6" />
    </g>
  ),
  dots: (
    <g>
      <circle cx={6} cy={12} r={1.4} />
      <circle cx={12} cy={12} r={1.4} />
      <circle cx={18} cy={12} r={1.4} />
    </g>
  ),
};
