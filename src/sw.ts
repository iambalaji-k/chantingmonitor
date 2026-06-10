/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Precache resources compiled by Vite
precacheAndRoute(self.__WB_MANIFEST);

// Handle notifications actions and clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus the open client window if it exists
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          break;
        }
      }

      // Dispatch the notification action to all tabs
      for (const client of clientList) {
        if ('postMessage' in client) {
          client.postMessage({
            type: 'notification-action',
            action: action || 'click'
          });
        }
      }
    })
  );
});
