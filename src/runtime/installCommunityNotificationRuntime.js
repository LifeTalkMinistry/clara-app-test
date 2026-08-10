import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const STYLE_ID = "clara-official-notification-theme";
const PENDING_FOCUS_KEY = "clara_pending_notification_focus_v1";
const NOTIFICATION_SELECTOR = ".clara-community-notifications-card > button";

let installed = false;
let refreshTimer = null;
let cachedNotifications = [];
let cacheTimestamp = 0;

function installNotificationStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-community-notifications-view {
      background:
        radial-gradient(circle at -10% 10%, rgba(23,105,255,.18), transparent 34%),
        radial-gradient(circle at 108% 8%, rgba(229,57,69,.12), transparent 30%),
        linear-gradient(180deg, #050b18 0%, #06101f 52%, #050b18 100%) !important;
    }

    .clara-community-notifications-view > div > div:first-child {
      position: relative;
      padding-bottom: .35rem;
    }

    .clara-community-notifications-view > div > div:first-child::after {
      content: "";
      display: block;
      width: 74px;
      height: 2px;
      margin-top: 10px;
      border-radius: 999px;
      background: linear-gradient(90deg, #1769ff 0 43%, #f5c84b 43% 58%, #e53945 58% 100%);
      box-shadow: 0 0 14px rgba(23,105,255,.16);
      opacity: .9;
    }

    .clara-community-notifications-view > div > div:first-child > p {
      color: #f5c84b !important;
      letter-spacing: .22em !important;
      opacity: .82 !important;
    }

    .clara-community-notifications-view > div > div:first-child > h2 {
      color: rgba(248,250,255,.98) !important;
      letter-spacing: -.045em !important;
      text-shadow: 0 10px 30px rgba(0,0,0,.22);
    }

    .clara-community-notifications-card {
      position: relative;
      overflow: hidden !important;
      border-color: rgba(70,132,255,.20) !important;
      background:
        radial-gradient(circle at 0 0, rgba(23,105,255,.08), transparent 30%),
        linear-gradient(155deg, rgba(7,17,36,.98), rgba(6,13,29,.99)) !important;
      box-shadow:
        0 24px 60px rgba(0,0,0,.30),
        inset 0 1px 0 rgba(255,255,255,.045) !important;
    }

    .clara-community-notifications-card::before {
      content: "";
      position: absolute;
      z-index: 10;
      left: 18px;
      right: 18px;
      top: 0;
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, #1769ff 0 46%, #f5c84b 46% 56%, #e53945 56% 100%);
      opacity: .72;
      pointer-events: none;
    }

    .clara-community-notifications-card > button {
      position: relative;
      min-height: 72px;
      padding: 17px 42px 17px 17px !important;
      border-bottom-color: rgba(255,255,255,.065) !important;
      background: rgba(255,255,255,.008) !important;
      transition: background-color .18s ease, transform .18s ease, border-color .18s ease !important;
    }

    .clara-community-notifications-card > button[data-clara-notification-unread="true"] {
      background:
        linear-gradient(90deg, rgba(23,105,255,.105), rgba(23,105,255,.025) 38%, transparent 72%) !important;
    }

    .clara-community-notifications-card > button:hover {
      background: rgba(23,105,255,.07) !important;
    }

    .clara-community-notifications-card > button:active {
      transform: scale(.992);
    }

    .clara-community-notifications-card > button::after {
      content: "›";
      position: absolute;
      right: 17px;
      top: 50%;
      transform: translateY(-52%);
      color: rgba(165,194,255,.42);
      font-size: 25px;
      font-weight: 400;
      line-height: 1;
    }

    .clara-community-notifications-card > button[data-clara-notification-unread="true"]::after {
      color: rgba(245,200,75,.72);
    }

    .clara-community-notifications-card > button > div:first-child {
      width: 8px !important;
      height: 8px !important;
      margin-top: 6px !important;
      background: #73a9ff !important;
      box-shadow: 0 0 12px rgba(23,105,255,.28);
    }

    .clara-community-notifications-card > button[data-clara-notification-type="reaction"] > div:first-child,
    .clara-community-notifications-card > button[data-clara-notification-type="comment"] > div:first-child {
      background: #e53945 !important;
      box-shadow: 0 0 12px rgba(229,57,69,.24);
    }

    .clara-community-notifications-card > button[data-clara-notification-type="connection_request"] > div:first-child,
    .clara-community-notifications-card > button[data-clara-notification-type="connection_accepted"] > div:first-child {
      background: #f5c84b !important;
      box-shadow: 0 0 12px rgba(245,200,75,.22);
    }

    .clara-community-notifications-card > button[data-clara-notification-unread="false"] > div:first-child {
      opacity: .38;
      box-shadow: none !important;
    }

    .clara-community-notifications-card > button p:first-child {
      color: rgba(248,250,255,.94) !important;
      font-size: 13.5px !important;
      line-height: 1.45 !important;
      letter-spacing: -.012em;
    }

    .clara-community-notifications-card > button p:last-child {
      color: rgba(170,191,224,.42) !important;
      margin-top: 5px !important;
    }

    .clara-community-notifications-view > div > div[class*="rounded-[26px]"]:not(.clara-community-notifications-card) {
      border-color: rgba(77,141,255,.15) !important;
      background: rgba(7,17,36,.72) !important;
    }

    .clara-notification-target-flash {
      animation: claraNotificationTargetFlash 1.8s ease-out 1;
      outline: 1px solid rgba(245,200,75,.62) !important;
      box-shadow: 0 0 0 4px rgba(23,105,255,.07), 0 22px 56px rgba(0,0,0,.28) !important;
    }

    @keyframes claraNotificationTargetFlash {
      0% { outline-color: rgba(245,200,75,.95); box-shadow: 0 0 0 5px rgba(245,200,75,.12), 0 0 38px rgba(23,105,255,.18); }
      100% { outline-color: rgba(245,200,75,.18); box-shadow: 0 0 0 0 rgba(23,105,255,0), 0 18px 50px rgba(0,0,0,.20); }
    }
  `;
  document.head.appendChild(style);
}

function notificationLabel(notification) {
  const actor = String(notification?.actor_name || "CLARA").trim() || "CLARA";
  const body = String(notification?.body || notification?.type || "notification").trim();
  return `${actor} ${body}`.trim();
}

function rows() {
  return [...document.querySelectorAll(NOTIFICATION_SELECTOR)];
}

async function fetchNotifications({ force = false } = {}) {
  const token = getStoredBackendToken();
  if (!token) return [];
  if (!force && cachedNotifications.length && Date.now() - cacheTimestamp < 5000) {
    return cachedNotifications;
  }

  try {
    const data = await backendRequest("/api/community/notifications?limit=50", { token });
    cachedNotifications = Array.isArray(data) ? data : [];
    cacheTimestamp = Date.now();
    return cachedNotifications;
  } catch (error) {
    console.warn("[CLARA Notifications] Unable to refresh notification targets:", error);
    return cachedNotifications;
  }
}

function annotateRows(notifications) {
  const notificationRows = rows();
  if (!notificationRows.length || !Array.isArray(notifications)) return;

  notificationRows.forEach((row, index) => {
    const notification = notifications[index];
    if (!notification?.id) return;

    row.dataset.claraNotificationId = String(notification.id);
    row.dataset.claraNotificationType = String(notification.type || "activity");
    row.dataset.claraNotificationUnread = notification.is_read ? "false" : "true";
    row.dataset.claraNotificationPostId = notification.post_id ? String(notification.post_id) : "";
    row.dataset.claraNotificationMessageId = notification.message_id ? String(notification.message_id) : "";
    row.dataset.claraNotificationActorId = notification.actor_id ? String(notification.actor_id) : "";
    row.dataset.claraNotificationActorName = String(notification.actor_name || "CLARA");
    row.dataset.claraNotificationBody = String(notification.body || "");
    row.title = `Open: ${notificationLabel(notification)}`;
    row.setAttribute("aria-label", `Open notification: ${notificationLabel(notification)}`);
  });
}

async function enhanceNotificationRows() {
  if (!document.querySelector(".clara-community-notifications-view")) return;
  const notifications = await fetchNotifications();
  annotateRows(notifications);
}

function scheduleEnhance(delay = 40) {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    enhanceNotificationRows();
    resumePendingFocus();
  }, delay);
}

function setPendingFocus(payload) {
  try {
    window.sessionStorage.setItem(PENDING_FOCUS_KEY, JSON.stringify({
      ...payload,
      createdAt: Date.now(),
    }));
  } catch {
    // Session focus is a convenience only.
  }
}

function readPendingFocus() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_FOCUS_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value?.kind || Date.now() - Number(value.createdAt || 0) > 20000) {
      window.sessionStorage.removeItem(PENDING_FOCUS_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function clearPendingFocus() {
  try {
    window.sessionStorage.removeItem(PENDING_FOCUS_KEY);
  } catch {
    // Ignore storage failures.
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

function findButtonByText(root, text) {
  const expected = String(text || "").trim().toLowerCase();
  return [...(root?.querySelectorAll?.("button") || [])].find(
    (button) => String(button.textContent || "").trim().toLowerCase() === expected
  ) || null;
}

async function focusPostTarget(target) {
  if (!document.querySelector(".clara-community-feed-view")) return false;
  const token = getStoredBackendToken();
  if (!token || !target.postId) return false;

  let posts = [];
  try {
    const data = await backendRequest("/api/community/posts?limit=50", { token });
    posts = Array.isArray(data) ? data : [];
  } catch {
    return false;
  }

  const index = posts.findIndex((post) => String(post?.id) === String(target.postId));
  if (index < 0) return false;

  const cards = [...document.querySelectorAll(".clara-community-feed-view .clara-community-post-card")];
  const card = cards[index];
  if (!card) return false;

  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.remove("clara-notification-target-flash");
  void card.offsetWidth;
  card.classList.add("clara-notification-target-flash");
  window.setTimeout(() => card.classList.remove("clara-notification-target-flash"), 2200);

  if (target.notificationType === "comment") {
    const commentButton = [...card.querySelectorAll("button")].find((button) =>
      String(button.textContent || "").trim().toLowerCase().startsWith("comment")
    );
    commentButton?.click();
  }

  return true;
}

function focusPeopleTarget(target) {
  const circlesView = document.querySelector(".clara-community-circles-view");
  if (!circlesView) return false;

  const findPeople = findButtonByText(circlesView, "Find People");
  if (findPeople && !String(findPeople.className).includes("text-[#ccfbf1]")) {
    findPeople.click();
    return false;
  }

  const modeLabel = target.peopleMode === "connections" ? "Connections" : "Requests";
  const modeButton = [...circlesView.querySelectorAll("button")].find((button) => {
    const label = String(button.textContent || "").replace(/\d+/g, "").trim().toLowerCase();
    return label === modeLabel.toLowerCase();
  });
  if (modeButton) modeButton.click();

  if (!target.actorName) return Boolean(modeButton);
  const actor = String(target.actorName).trim().toLowerCase();
  const personCard = [...circlesView.querySelectorAll("article")].find((article) =>
    String(article.textContent || "").toLowerCase().includes(actor)
  );
  if (!personCard) return false;

  const openButton = personCard.querySelector("button");
  openButton?.click();
  personCard.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

function resumePendingFocus() {
  const target = readPendingFocus();
  if (!target) return;

  const attempt = async () => {
    let completed = false;
    if (target.kind === "post") completed = await focusPostTarget(target);
    else if (target.kind === "people") completed = focusPeopleTarget(target);
    else completed = true;

    if (completed) {
      clearPendingFocus();
      return;
    }

    const age = Date.now() - Number(target.createdAt || 0);
    if (age < 12000) window.setTimeout(resumePendingFocus, 350);
    else clearPendingFocus();
  };

  attempt();
}

function routeNotification(row) {
  const type = String(row.dataset.claraNotificationType || "").toLowerCase();
  const postId = row.dataset.claraNotificationPostId || "";
  const messageId = row.dataset.claraNotificationMessageId || "";
  const actorId = row.dataset.claraNotificationActorId || "";
  const actorName = row.dataset.claraNotificationActorName || "";

  if (postId || type === "reaction" || type === "comment") {
    if (!postId) return;
    setPendingFocus({
      kind: "post",
      postId,
      notificationType: type,
    });
    navigateHash(`/community?view=feed&postId=${encodeURIComponent(postId)}`);
    window.setTimeout(resumePendingFocus, 300);
    return;
  }

  if (messageId || type === "message") {
    if (actorId) {
      navigateHash(`/community?view=messages&userId=${encodeURIComponent(actorId)}${messageId ? `&messageId=${encodeURIComponent(messageId)}` : ""}`);
    } else {
      navigateHash("/community?view=messages");
    }
    return;
  }

  if (type === "connection_request" || type === "connection_accepted") {
    const peopleMode = type === "connection_accepted" ? "connections" : "requests";
    setPendingFocus({
      kind: "people",
      peopleMode,
      actorId,
      actorName,
    });
    navigateHash(`/community?view=circles&peopleMode=${peopleMode}${actorId ? `&userId=${encodeURIComponent(actorId)}` : ""}`);
    window.setTimeout(resumePendingFocus, 300);
    return;
  }

  if (actorId) {
    navigateHash(`/users/${encodeURIComponent(actorId)}`);
    return;
  }

  navigateHash("/community?view=notifications");
}

async function handleNotificationClick(event) {
  const clickedRow = event.target?.closest?.(NOTIFICATION_SELECTOR);
  if (!clickedRow || !document.contains(clickedRow)) return;

  let targetRow = clickedRow;
  if (!targetRow.dataset.claraNotificationId) {
    const index = rows().indexOf(clickedRow);
    if (index < 0) return;

    const notifications = await fetchNotifications({ force: true });
    annotateRows(notifications);
    targetRow = rows()[index] || clickedRow;
  }

  if (!targetRow.dataset.claraNotificationId) return;
  targetRow.dataset.claraNotificationUnread = "false";
  window.setTimeout(() => routeNotification(targetRow), 20);
}

export function installCommunityNotificationRuntime() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  installNotificationStyles();
  document.addEventListener("click", handleNotificationClick, false);

  const observer = new MutationObserver(() => scheduleEnhance(60));
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("hashchange", () => {
    scheduleEnhance(100);
    window.setTimeout(resumePendingFocus, 220);
  });

  window.addEventListener("focus", () => scheduleEnhance(80));
  window.setInterval(() => {
    if (document.visibilityState !== "hidden" && document.querySelector(".clara-community-notifications-view")) {
      fetchNotifications({ force: true }).then(annotateRows);
    }
  }, 8000);

  scheduleEnhance(0);
}
