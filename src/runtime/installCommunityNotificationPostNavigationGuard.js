import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const NOTIFICATION_SELECTOR = ".clara-community-notifications-card > button";
const STYLE_ID = "clara-community-notification-post-nav-guard";

let installed = false;
let detailAttemptTimer = null;

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

    /* Notification post detail mode: keep the Community shell/top nav, but
       remove the surrounding feed so the notification opens the post itself. */
    .clara-community-root[data-clara-post-detail="true"] .clara-community-feed-scroll {
      padding-left: 0 !important;
      padding-right: 0 !important;
      padding-top: 14px !important;
      background:
        radial-gradient(circle at 8% 0%, rgba(8,103,255,.13), transparent 30%),
        radial-gradient(circle at 100% 8%, rgba(243,38,69,.05), transparent 28%),
        linear-gradient(180deg, #040b18 0%, #050d1d 100%) !important;
    }

    .clara-community-root[data-clara-post-detail="true"] .clara-community-feed-scroll > div {
      max-width: 768px !important;
    }

    .clara-community-root[data-clara-post-detail="true"] .clara-community-feed-scroll > div > * {
      display: none !important;
    }

    .clara-community-root[data-clara-post-detail="true"] .clara-post-detail-list {
      display: block !important;
      margin: 0 !important;
    }

    .clara-community-root[data-clara-post-detail="true"] .clara-post-detail-list::before {
      content: "POST";
      display: block;
      padding: 2px 18px 12px;
      color: rgba(255,216,74,.78);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .20em;
    }

    .clara-community-root[data-clara-post-detail="true"] .clara-post-detail-list > .clara-community-post-card {
      display: none !important;
    }

    .clara-community-root[data-clara-post-detail="true"]
      .clara-post-detail-list > .clara-community-post-card[data-clara-post-detail-target="true"] {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      border-left: 0 !important;
      border-right: 0 !important;
      border-radius: 0 !important;
      box-shadow:
        0 22px 58px rgba(0,0,0,.28),
        inset 0 1px 0 rgba(255,255,255,.045) !important;
    }

    .clara-community-root[data-clara-post-detail="true"]
      .clara-community-feed-view button[aria-label="Create a Community post"] {
      display: none !important;
    }

    .clara-notification-target-flash {
      animation: claraNotificationTargetFlash 1.8s ease-out 1;
      outline: 1px solid rgba(245,200,75,.62) !important;
      box-shadow: 0 0 0 4px rgba(23,105,255,.07), 0 22px 56px rgba(0,0,0,.28) !important;
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

function navigateHash(path) {
  const nextHash = `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === nextHash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = nextHash;
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

function clearPostDetailMode() {
  if (detailAttemptTimer) {
    window.clearTimeout(detailAttemptTimer);
    detailAttemptTimer = null;
  }

  document.querySelectorAll('[data-clara-post-detail="true"]').forEach((root) => {
    root.removeAttribute("data-clara-post-detail");
  });
  document.querySelectorAll('[data-clara-post-detail-target="true"]').forEach((card) => {
    card.removeAttribute("data-clara-post-detail-target");
  });
  document.querySelectorAll(".clara-post-detail-list").forEach((list) => {
    list.classList.remove("clara-post-detail-list");
  });
}

function currentPostDetailRequest() {
  const raw = String(window.location.hash || "").replace(/^#/, "");
  const [pathname, query = ""] = raw.split("?");
  if (pathname !== "/community") return null;

  const params = new URLSearchParams(query);
  const postId = params.get("postId") || "";
  const view = params.get("view") || "feed";
  const mode = params.get("mode") || "";
  if (view !== "feed" || !postId || mode !== "post") return null;

  return {
    postId,
    notificationType: params.get("notificationType") || "reaction",
  };
}

async function locateTargetIndex(postId) {
  const token = getStoredBackendToken();
  if (!token || !postId) return -1;

  try {
    const data = await backendRequest("/api/community/posts?limit=50", { token });
    const posts = Array.isArray(data) ? data : [];
    return posts.findIndex((post) => String(post?.id) === String(postId));
  } catch (error) {
    console.warn("[CLARA Notifications] Could not load target post:", error);
    return -1;
  }
}

async function openExpandedPost(postId, notificationType = "reaction") {
  const targetIndex = await locateTargetIndex(postId);
  if (targetIndex < 0) return;

  const startedAt = Date.now();
  clearPostDetailMode();

  const tryOpen = () => {
    const request = currentPostDetailRequest();
    if (!request || String(request.postId) !== String(postId)) return;

    keepShellHeaderVisible();

    const root = document.querySelector('.clara-community-root[data-community-view="feed"]');
    const feedScroll = root?.querySelector?.(".clara-community-feed-scroll");
    const cards = [...(root?.querySelectorAll?.(".clara-community-post-card") || [])];
    const card = cards[targetIndex];
    const list = card?.parentElement;

    if (!(root instanceof HTMLElement) || !(feedScroll instanceof HTMLElement) || !(card instanceof HTMLElement) || !(list instanceof HTMLElement)) {
      if (Date.now() - startedAt < 10000) {
        detailAttemptTimer = window.setTimeout(tryOpen, 140);
      }
      return;
    }

    root.dataset.claraPostDetail = "true";
    list.classList.add("clara-post-detail-list");
    card.dataset.claraPostDetailTarget = "true";
    feedScroll.scrollTo({ top: 0, behavior: "instant" });

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

    window.setTimeout(keepShellHeaderVisible, 350);
  };

  tryOpen();
}

function syncExpandedPostFromLocation() {
  const request = currentPostDetailRequest();
  if (!request) {
    clearPostDetailMode();
    return;
  }

  openExpandedPost(request.postId, request.notificationType);
}

function handlePostNotificationClick(event) {
  const row = event.target?.closest?.(NOTIFICATION_SELECTOR);
  if (!row || !document.contains(row) || !looksLikePostNotification(row)) return;

  // React's button onClick has already fired at the root by the time this
  // document-level bubble listener runs, so read/unread state is preserved.
  // Stop only the older notification router from opening the surrounding feed.
  event.preventDefault();
  event.stopImmediatePropagation();

  resolveNotification(row)
    .then((notification) => {
      const type = String(notification?.type || row.dataset.claraNotificationType || "reaction").toLowerCase();
      const postId = notification?.post_id || row.dataset.claraNotificationPostId || "";
      if (!postId) return;

      navigateHash(
        `/community?view=feed&mode=post&postId=${encodeURIComponent(postId)}&notificationType=${encodeURIComponent(type)}`
      );
      window.setTimeout(() => openExpandedPost(postId, type), 80);
    })
    .catch((error) => {
      console.warn("[CLARA Notifications] Expanded post navigation failed:", error);
    });
}

export function installCommunityNotificationPostNavigationGuard() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  installTopNavGuardStyle();
  document.addEventListener("click", handlePostNotificationClick, false);
  window.addEventListener("hashchange", () => window.setTimeout(syncExpandedPostFromLocation, 80));

  const observer = new MutationObserver(() => {
    const request = currentPostDetailRequest();
    if (!request) return;
    const root = document.querySelector('.clara-community-root[data-community-view="feed"]');
    if (root?.dataset?.claraPostDetail === "true") return;
    window.setTimeout(syncExpandedPostFromLocation, 60);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.setTimeout(syncExpandedPostFromLocation, 0);
}

installCommunityNotificationPostNavigationGuard();