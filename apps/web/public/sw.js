/* No fetch handler: authenticated pages, photos and API responses are never cached. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let accountEpoch = 0;
const pendingDisplays = new Set();
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WOORI_PUSH_CLEAR') return;
  accountEpoch++;
  event.waitUntil(
    (async () => {
      await Promise.allSettled([...pendingDisplays]);
      (await self.registration.getNotifications()).forEach((notification) =>
        notification.close()
      );
    })()
  );
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim())
);
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const epoch = accountEpoch;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const payload = event.data?.json();
        if (
          !payload ||
          ![
            'deliveryId',
            'installationId',
            'recipientId',
            'notificationId',
          ].every(
            (key) => typeof payload[key] === 'string' && uuid.test(payload[key])
          )
        )
          return;
        const api = new URL(
          new URL(self.location.href).searchParams.get('apiOrigin')
        );
        if (
          api.protocol !== 'https:' &&
          !(
            api.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
          )
        )
          return;
        const response = await fetch(
          new URL(
            `/v1/push/deliveries/${payload.deliveryId}/display`,
            api.origin
          ),
          {
            signal: controller.signal,
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }
        );
        if (!response.ok) return;
        const display = await response.json();
        if (
          !['recipientId', 'installationId', 'notificationId'].every(
            (key) => display[key] === payload[key]
          ) ||
          typeof display.body !== 'string'
        )
          return;
        if (epoch !== accountEpoch) return;
        const displayPromise = self.registration.showNotification('우리', {
          body: display.body.slice(0, 240),
          tag: `woori-${payload.notificationId}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-96.png',
          data: { notificationId: payload.notificationId },
        });
        pendingDisplays.add(displayPromise);
        try {
          await displayPromise;
        } finally {
          pendingDisplays.delete(displayPromise);
        }
      } catch {
        /* Fail closed when the active account or authorization cannot be checked. */
      } finally {
        clearTimeout(timeout);
      }
    })()
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const id = event.notification.data?.notificationId;
  if (typeof id !== 'string' || !uuid.test(id)) return;
  const url = new URL(
    `/notifications?notificationId=${encodeURIComponent(id)}`,
    self.location.origin
  ).href;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const client = clients.find(
        (item) => new URL(item.url).origin === self.location.origin
      );
      if (client) {
        const navigated = await client.navigate(url);
        if (navigated) await navigated.focus();
      } else await self.clients.openWindow(url);
    })()
  );
});
