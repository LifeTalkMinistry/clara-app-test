self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "CLARA", body: event.data?.text?.() || "Your task reminder is ready." };
  }

  const title = payload.title || "CLARA";
  const options = {
    body: payload.body || "Your guided task is ready.",
    icon: payload.icon || "/favicon.svg",
    badge: payload.badge || "/favicon.svg",
    data: {
      url: payload.url || "/#/tasks?open=today",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/#/tasks?open=today";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => {
        return "focus" in client;
      });

      if (matchingClient) {
        matchingClient.navigate(targetUrl);
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
