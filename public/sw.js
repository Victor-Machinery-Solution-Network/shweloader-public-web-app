/**
 * ShweLoader Service Worker — Phase 4 Web Push
 *
 * INTENTIONALLY MINIMAL: does NOT cache any resources or intercept any fetch
 * requests. Its sole purpose is to handle push notifications and
 * notificationclick events for the chat feature.
 *
 * This file is served from the root scope (/sw.js) so the SW controls
 * all pages on the origin, but since no fetch handler is registered it has
 * zero impact on page loads, Next.js ISR, or asset caching.
 */

/* --------------------------------------------------------------------------
 * push — show a notification when the server sends a push message.
 * -------------------------------------------------------------------------- */
self.addEventListener("push", function (event) {
  /** @type {{ title?: string; body?: string; url?: string; tag?: string }} */
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    // Malformed payload — silently ignore, but we still show a generic notification
    // so the user knows something arrived.
  }

  var title = data.title || "ShweLoader";
  var options = {
    body: data.body || "",
    icon: "/brand/icon-192.png",
    badge: "/brand/icon-192.png",
    data: { url: data.url || "/chat" },
    tag: data.tag || "shweloader-chat",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* --------------------------------------------------------------------------
 * notificationclick — focus an existing tab or open a new one.
 * -------------------------------------------------------------------------- */
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      // Focus the first tab whose URL ends with the target path.
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        try {
          var clientUrl = new URL(client.url);
          var targetPath = targetUrl.startsWith("http")
            ? new URL(targetUrl).pathname
            : targetUrl;
          if (clientUrl.pathname === targetPath && "focus" in client) {
            return client.focus();
          }
        } catch (_) {
          // URL parse error — skip this client
        }
      }
      // No matching tab found — open a new one.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
