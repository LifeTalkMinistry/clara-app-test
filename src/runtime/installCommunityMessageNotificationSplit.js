import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";

const INSTALL_KEY = "__claraCommunityMessageNotificationSplitInstalled";
const MESSAGE_BADGE_ATTR = "data-clara-message-unread-badge";
const MESSAGE_NOTIFICATION_PHRASE = "sent you a private message";

let lastUnreadMessageCount = 0;
let lastGeneralNotificationCount = 0;
let refreshInFlight = false;
let refreshQueued = false;

function formatBadgeCount(value) {
  return value > 9 ? "9+" : String(value);
}

function messageNavLink() {
  return document.querySelector(
    '.clara-community-root a[aria-label="Open private messages"]'
  );
}

function notificationNavLink() {
  return document.querySelector(
    '.clara-community-root a[aria-label="Community notifications"]'
  );
}

function renderMessageBadge(count = lastUnreadMessageCount) {
  const link = messageNavLink();
  if (!link) return;

  let badge = link.querySelector(`[${MESSAGE_BADGE_ATTR}]`);
  if (!count) {
    badge?.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement("span");
    badge.setAttribute(MESSAGE_BADGE_ATTR, "true");
    badge.className =
      "absolute -right-0.5 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#071329] bg-[#0867ff] px-1 text-[8px] font-black text-white shadow-[0_0_12px_rgba(8,103,255,0.42)] sm:h-[18px] sm:min-w-[18px]";
    link.appendChild(badge);
  }

  badge.textContent = formatBadgeCount(count);
  badge.setAttribute(
    "aria-label",
    `${count} unread private message${count === 1 ? "" : "s"}`
  );
}

function renderGeneralNotificationBadge(count = lastGeneralNotificationCount) {
  const link = notificationNavLink();
  if (!link) return;

  const existingBadges = Array.from(link.children).filter(
    (node) =>
      node instanceof HTMLElement &&
      !node.hasAttribute(MESSAGE_BADGE_ATTR) &&
      node.matches('span[class*="-top-1"]')
  );

  if (!count) {
    existingBadges.forEach((badge) => badge.remove());
    return;
  }

  const badge = existingBadges[0];
  if (!badge) return;

  badge.textContent = formatBadgeCount(count);
  badge.setAttribute(
    "aria-label",
    `${count} unread notification${count === 1 ? "" : "s"}`
  );
  existingBadges.slice(1).forEach((extra) => extra.remove());
}

function hideMessageRowsFromNotificationCenter() {
  const card = document.querySelector(".clara-community-notifications-card");
  if (!card) return;

  Array.from(card.querySelectorAll(":scope > button")).forEach((row) => {
    const text = String(row.textContent || "").toLowerCase();
    row.style.display = text.includes(MESSAGE_NOTIFICATION_PHRASE)
      ? "none"
      : "";
  });
}

function correctNotificationEmptyCopy() {
  const view = document.querySelector(".clara-community-notifications-view");
  if (!view) return;

  Array.from(view.querySelectorAll("p")).forEach((paragraph) => {
    if (
      String(paragraph.textContent || "") ===
      "Comments, reactions, and messages will appear here."
    ) {
      paragraph.textContent =
        "Comments, reactions, connections, and other activity will appear here.";
    }
  });
}

function renderAll() {
  renderMessageBadge();
  renderGeneralNotificationBadge();
  hideMessageRowsFromNotificationCenter();
  correctNotificationEmptyCopy();
}

async function refreshUnreadState() {
  if (refreshInFlight) {
    refreshQueued = true;
    return;
  }

  const token = getStoredBackendToken();
  const user = getStoredBackendUser();
  const currentUserId = user?.id;

  if (!token || !currentUserId) {
    lastUnreadMessageCount = 0;
    lastGeneralNotificationCount = 0;
    renderAll();
    return;
  }

  refreshInFlight = true;
  try {
    const [messages, notifications] = await Promise.all([
      backendRequest("/api/messages", { token }),
      backendRequest("/api/community/notifications?limit=50", { token }),
    ]);

    const messageList = Array.isArray(messages) ? messages : [];
    const notificationList = Array.isArray(notifications) ? notifications : [];

    lastUnreadMessageCount = messageList.filter(
      (message) =>
        String(message?.recipient_id || "") === String(currentUserId) &&
        !message?.is_read
    ).length;

    lastGeneralNotificationCount = notificationList.filter(
      (notification) =>
        String(notification?.type || "").toLowerCase() !== "message" &&
        !notification?.is_read
    ).length;

    renderAll();
  } catch (error) {
    console.warn("[CLARA notifications] unread split refresh failed:", error);
  } finally {
    refreshInFlight = false;
    if (refreshQueued) {
      refreshQueued = false;
      window.setTimeout(refreshUnreadState, 120);
    }
  }
}

function scheduleRefresh(delay = 0) {
  window.setTimeout(() => {
    refreshUnreadState();
    renderAll();
  }, delay);
}

export function installCommunityMessageNotificationSplit() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  const observer = new MutationObserver(() => {
    renderAll();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (
        target.closest('.clara-community-root a[aria-label="Open private messages"]') ||
        target.closest(".clara-community-messages-view")
      ) {
        scheduleRefresh(350);
        scheduleRefresh(1100);
      }

      if (
        target.closest(
          '.clara-community-root a[aria-label="Community notifications"]'
        ) ||
        target.closest(".clara-community-notifications-view")
      ) {
        scheduleRefresh(350);
      }
    },
    true
  );

  window.addEventListener("focus", () => scheduleRefresh(0));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") scheduleRefresh(0);
  });

  window.setInterval(() => {
    if (document.visibilityState !== "hidden") refreshUnreadState();
  }, 4000);

  scheduleRefresh(0);
  scheduleRefresh(800);
}

installCommunityMessageNotificationSplit();
