/*
 * The console's service worker.
 *
 * It shows the alerts the platform sends to an operator's browser (Web Push,
 * sent by the operator-alerts edge function), and opens the right page when
 * one is clicked — focusing a console window that is already open.
 *
 * It caches nothing on purpose: an operator acts on what they see, and must
 * never see yesterday's copy of a page. Without a network the browser shows
 * its own offline page, and the console says it is offline.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Manzel', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Manzel';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    // One notification per thing: a newer alert about the same conversation
    // replaces the older one instead of stacking.
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    lang: data.lang || undefined,
    dir: data.dir || 'auto',
    timestamp: data.at ? Date.parse(data.at) : Date.now(),
    data: { url: data.url || '/' },
    requireInteraction: data.urgent === true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) {
          try {
            await client.navigate(target);
          } catch {
            // A page the worker does not control: it is focused, at least.
          }
        }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
