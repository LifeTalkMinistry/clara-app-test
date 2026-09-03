const CLARA_APP_BUILD = "__CLARA_APP_BUILD__";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // The notification worker must never navigate an already-open CLARA window
  // just because a new worker activates. The page freshness runtime owns safe
  // release refreshes and defers them while a conversation overlay is active.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Keep the stamped build id observable for diagnostics without using worker
  // activation as a document-navigation authority.
  if (event.data?.type === "GET_CLARA_APP_BUILD") {
    event.source?.postMessage?.({ type: "CLARA_APP_BUILD", build: CLARA_APP_BUILD });
  }
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
    icon: payload.icon || new URL("icons/icon-192.png", self.registration.scope).href,
    badge: payload.badge || new URL("icons/maskable-icon-192.png", self.registration.scope).href,
    tag: payload.dedupeKey || payload.tag || undefined,
    renotify: false,
    silent: false,
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
