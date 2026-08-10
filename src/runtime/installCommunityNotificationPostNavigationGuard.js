import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const NOTIFICATION_SELECTOR = ".clara-community-notifications-card > button";
const STYLE_ID = "clara-community-notification-post-nav-guard";

let installed = false;

function installTopNavGuardStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-community-root[data-community-view="feed"] > .clara-community-shell-header {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 220 !important;
      flex: 0 0 auto !important;
      transform: none !important;
    }

    .clara-community-root[data-community-view="feed"] > .clara-community-feed-view {
      position: relative !important;
      z-index: 1 !important;
      min-height: 0 !important;
      flex: 1 1 0% !important;
    }
  `;
  document.head.appendChild(style);
}

function notificationRows() {
  return [...document.querySelectorAll(NOTIFICATION_SELECTOR)];
}

function looksLikePostNotification(row) {
  const type = String(row?.dataset?.claraNotificationType || "").toLowerCase();
  if (type === "reaction" || type === "comment") return true;

  const text = String(row?.textContent || "").toLowerCase();
  return text.includes("reacted to your post") || text.includes("commented on your post");
}

async function resolveNotification(row) {
  if (!row) return null;

  const type = String(row.dataset.claraNotificationType || "").toLowerCase();
  const postId = row.dataset.claraNotificationPostId || "";
  if ((type === "reaction" || type === "comment") && postId) {
    return {
      id: row.dataset.claraNotificationId || "",
      type,
      post_id: postId,
    };
  }

  const token = getStoredBackendToken();
  if (!token) return null;

  const index = notificationRows().indexOf(row);
  if (index < 0) return null;

  try {
    const data = await backendRequest("/api/community/notifications?limit=50", { token });
    const notifications = Array.isArray(data) ? data : [];
    const notification = notifications[index] || null;
    if (!notification) return null;

    row.dataset.claraNotificationId = notification.id ? String(notification.id) : "";
    row.dataset.claraNotificationType = String(notification.type || "activity");
    row.dataset.claraNotificationPostId = notification.post_id ? String(notification.post_id) : "";
    return notification;
  } catch (error) {
    console.warn("[CLARA Notifications] Could not resolve post notification:", error);
    return null;
  }
}

function openFeedThroughShell() {
  const feedLink = document.querySelector(
    '.clara-community-shell-header a[aria-label="Open Community feed"]'
  );

  if (feedLink instanceof HTMLElement) {
    feedLink.click();
    return;
  }

  // Fallback only. Do not add postId to the route because the Community shell
  // must remain the page owner while the post is focused inside its own scroller.
  window.location.hash = "#/community";
}

function keepShellHeaderVisible() {
  const header = document.querySelector(
    '.clara-community-root[data-community-view="feed"] > .clara-community-shell-header'
  );
  if (!(header instanceof HTMLElement)) return;

  header.style.removeProperty("display");
  header.style.removeProperty("visibility");
  header.style.removeProperty("opacity");
  header.style.removeProperty("transform");
}

function scrollPostInsideFeed(card) {
  const scroller = card?.closest?.(".clara-community-feed-scroll");
  if (!(scroller instanceof HTMLElement) || !(card instanceof HTMLElement)) {
    card?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const availableCenterOffset = Math.max(16, (scroller.clientHeight - Math.min(cardRect.height, scroller.clientHeight)) / 2);
  const nextTop = Math.max(
    0,
    scroller.scrollTop + (cardRect.top - scrollerRect.top) - availableCenterOffset
  );

  scroller.scrollTo({ top: nextTop, behavior: "smooth" });
}

async function focusPost(postId, notificationType) {
  const token = getStoredBackendToken();
  if (!token || !postId) return;

  let posts = [];
  try {
    const data = await backendRequest("/api/community/posts?limit=50", { token });
    posts = Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("[CLARA Notifications] Could not load target post:", error);
    return;
  }

  const targetIndex = posts.findIndex((post) => String(post?.id) === String(postId));
  if (targetIndex < 0) return;

  const startedAt = Date.now();
  const tryFocus = () => {
    keepShellHeaderVisible();

    const feedView = document.querySelector(".clara-community-feed-view");
    const cards = [...document.querySelectorAll(".clara-community-feed-view .clara-community-post-card")];
    const card = cards[targetIndex];

    if (!feedView || !card) {
      if (Date.now() - startedAt < 10000) {
        window.setTimeout(tryFocus, 160);
      }
      return;
    }

    scrollPostInsideFeed(card);
    card.classList.remove("clara-notification-target-flash");
    void card.offsetWidth;
    card.classList.add("clara-notification-target-flash");
    window.setTimeout(() => card.classList.remove("clara-notification-target-flash"), 2200);

    if (notificationType === "comment") {
      const commentButton = [...card.querySelectorAll("button")].find((button) =>
        String(button.textContent || "").trim().toLowerCase().startsWith("comment")
      );
      commentButton?.click();
    }

    // Re-assert after the smooth scroll finishes so no ancestor scrolling or
    // view transition can cover the Community shell header.
    window.setTimeout(keepShellHeaderVisible, 450);
  };

  tryFocus();
}

function handlePostNotificationClick(event) {
  const row = event.target?.closest?.(NOTIFICATION_SELECTOR);
  if (!row || !document.contains(row) || !looksLikePostNotification(row)) return;

  // React's button onClick has already fired at the root by the time this
  // document-level bubble listener runs, so read/unread state is preserved.
  // Stop only the older document router from replacing the Community route.
  event.preventDefault();
  event.stopImmediatePropagation();

  resolveNotification(row)
    .then((notification) => {
      const type = String(notification?.type || row.dataset.claraNotificationType || "").toLowerCase();
      const postId = notification?.post_id || row.dataset.claraNotificationPostId || "";
      if (!postId) return;

      openFeedThroughShell();
      window.setTimeout(() => focusPost(postId, type), 80);
    })
    .catch((error) => {
      console.warn("[CLARA Notifications] Post navigation guard failed:", error);
    });
}

export function installCommunityNotificationPostNavigationGuard() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  installTopNavGuardStyle();
  document.addEventListener("click", handlePostNotificationClick, false);
}

installCommunityNotificationPostNavigationGuard();
