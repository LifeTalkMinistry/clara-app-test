self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function resolveTargetUrl(value) {
  const fallback = "#/dashboard";
  const raw = String(value || fallback).trim() || fallback;

  if (/^https?:\/\//i.test(raw)) return raw;

  const scope = self.registration.scope;
  const normalized = raw.startsWith("#")
    ? raw
    : raw.startsWith("/")
      ? `#${raw}`
      : raw;

  return new URL(normalized, scope).href;
}

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "CLARA", body: event.data?.text?.() || "Your reminder is ready." };
  }

  const title = payload.title || "CLARA";
  const options = {
    body: payload.body || "CLARA has an update for you.",
    icon: payload.icon || new URL("favicon.svg", self.registration.scope).href,
    badge: payload.badge || new URL("favicon.svg", self.registration.scope).href,
    tag: payload.dedupeKey || payload.tag || undefined,
    renotify: false,
    data: {
      url: resolveTargetUrl(payload.url || "#/dashboard"),
      eventType: payload.eventType || "",
      dedupeKey: payload.dedupeKey || "",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = resolveTargetUrl(event.notification.data?.url || "#/dashboard");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => {
        try {
          return new URL(client.url).origin === new URL(targetUrl).origin;
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        matchingClient.navigate(targetUrl);
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
