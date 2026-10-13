import type { MetadataRoute } from 'next';

/**
 * The console as an installed app: its own window, the Manzel tile, and the
 * pages an operator opens most, a long-press away.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'کنسول منزل · Manzel Console',
    short_name: 'Manzel Console',
    description: 'Manzel Console — for the people who run Manzel.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    dir: 'rtl',
    lang: 'fa-AF',
    background_color: '#FBF8F3',
    theme_color: '#1E4E8C',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Support desk · میز پشتیبانی', url: '/support', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Building requests · درخواست‌های ساختمان', url: '/requests', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'New notification · اطلاع‌رسانی تازه', url: '/notifications/new', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
