const CLARA_APP_BUILD = "__CLARA_APP_BUILD__";
const CLARA_BUILD_QUERY = "__clara_build";
const CLARA_UNSTAMPED_BUILD_PREFIX = "__CLARA_";
const CLARA_APP_BUILD_READY =
  Boolean(CLARA_APP_BUILD) && !CLARA_APP_BUILD.startsWith(CLARA_UNSTAMPED_BUILD_PREFIX);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      // Never navigate a live CLARA session with an unresolved release marker.
      // Vercel previously served the raw placeholder, which could interrupt a
      // mounted conversation during browser/device-mode refresh and leave only
      // the Add Income header visible.
      if (!CLARA_APP_BUILD_READY) return;

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      await Promise.all(
        clients.map(async (client) => {
          try {
            const url = new URL(client.url);
            if (url.searchParams.get(CLARA_BUILD_QUERY) === CLARA_APP_BUILD) return;
            url.searchParams.set(CLARA_BUILD_QUERY, CLARA_APP_BUILD);
            await client.navigate(url.href);
          } catch {
            // A refresh failure must never block CLARA notification activation.
          }
        })
      );
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
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
