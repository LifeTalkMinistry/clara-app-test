import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";

const INSTALL_FLAG = "__claraMessagesSearchCancelInstalled";
const OVERLAY_SELECTOR = "[data-clara-messages-search-overlay='true']";
const LEGACY_SELECTOR = "[data-clara-messages-search-cancel='true']";
const MESSAGE_INPUT_SELECTOR = 'input[placeholder="Type a message..."]';
const MESSAGE_BADGE_SELECTOR = "[data-clara-message-unread-badge='true']";
const NOTIFICATION_FETCH_FLAG = "__claraMessageNotificationSeparationFetchInstalled";

function setReactInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function createCloseIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const first = document.createElementNS("http://www.w3.org/2000/svg", "path");
  first.setAttribute("d", "M18 6 6 18");
  const second = document.createElementNS("http://www.w3.org/2000/svg", "path");
  second.setAttribute("d", "m6 6 12 12");
  svg.append(first, second);
  return svg;
}

function removeLegacyContainerMutation(input) {
  const container = input.parentElement;
  if (!container) return;

  // The previous implementation inserted a raw button directly into this
  // React-owned search row and also changed its inline layout. When the app
  // switched from a conversation back to the list, React could reconcile
  // against that foreign child and leave the search row partially collapsed.
  // Restore the row to React's exact DOM before installing the non-invasive
  // overlay control below.
  container.querySelectorAll(LEGACY_SELECTOR).forEach((node) => node.remove());
  container.style.removeProperty("position");
  container.style.removeProperty("padding-right");
}

function installCancelButton(input) {
  if (!(input instanceof HTMLInputElement)) return;
  if (input.dataset.claraMessagesSearchCancelBound === "true") return;

  removeLegacyContainerMutation(input);
  input.dataset.claraMessagesSearchCancelBound = "true";

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.claraMessagesSearchOverlay = "true";
  button.setAttribute("aria-label", "Close member search");
  button.setAttribute("title", "Close search");
  button.appendChild(createCloseIcon());
  button.__claraMessagesSearchInput = input;

  Object.assign(button.style, {
    position: "fixed",
    left: "0",
    top: "0",
    transform: "translateY(-50%)",
    width: "2rem",
    height: "2rem",
    border: "0",
    borderRadius: "0",
    background: "transparent",
    color: "rgba(255,255,255,0.46)",
    display: "none",
    opacity: "0",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: "140",
    padding: "0",
    boxShadow: "none",
    outline: "none",
    transition: "opacity 120ms ease, color 120ms ease",
    WebkitTapHighlightColor: "transparent",
  });

  document.body.appendChild(button);

  let frameId = null;

  const placeButton = () => {
    if (!input.isConnected) return false;
    const row = input.parentElement;
    if (!row) return false;
    const rect = row.getBoundingClientRect();
    button.style.left = `${Math.max(0, rect.right - 39)}px`;
    button.style.top = `${rect.top + rect.height / 2}px`;
    return true;
  };

  const stopTracking = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  const trackPosition = () => {
    if (button.style.display === "none" || !placeButton()) {
      stopTracking();
      button.style.display = "none";
      return;
    }
    frameId = window.requestAnimationFrame(trackPosition);
  };

  const hideButton = () => {
    stopTracking();
    button.style.opacity = "0";
    button.style.display = "none";
  };

  const showButton = () => {
    if (!input.isConnected) return hideButton();
    if (input.dataset.claraMessagesSearchCancelled === "true") return hideButton();
    if (!placeButton()) return hideButton();

    button.style.display = "inline-flex";
    window.requestAnimationFrame(() => {
      if (
        input.isConnected &&
        input.dataset.claraMessagesSearchCancelled !== "true" &&
        document.activeElement === input
      ) {
        button.style.opacity = "1";
      }
    });

    stopTracking();
    frameId = window.requestAnimationFrame(trackPosition);
  };

  const syncVisibility = () => {
    const cancelled = input.dataset.claraMessagesSearchCancelled === "true";
    const focused = document.activeElement === input;
    if (!cancelled && focused) showButton();
    else hideButton();
  };

  button.addEventListener("pointerenter", () => {
    button.style.color = "rgba(255,255,255,0.78)";
  });
  button.addEventListener("pointerleave", () => {
    button.style.color = "rgba(255,255,255,0.46)";
  });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    input.dataset.claraMessagesSearchCancelled = "true";
    hideButton();
    setReactInputValue(input, "");
    input.blur();
  });

  input.addEventListener("focus", () => {
    input.dataset.claraMessagesSearchCancelled = "false";
    showButton();
  });
  input.addEventListener("input", syncVisibility);
  input.addEventListener("blur", () => window.setTimeout(syncVisibility, 160));

  syncVisibility();
}

/*
 * PRIVATE CHAT COMPOSER FOCUS
 *
 * MessagesBackend temporarily marks the message input disabled while a send is
 * in flight. On mobile that immediately dismisses the keyboard, forcing the
 * user to tap the composer again after every message. For an already-focused
 * composer, ignore only that transient disabled=true assignment so the user can
 * keep typing the next message. A deliberate tap elsewhere still blurs normally.
 *
 * The send button also normally steals focus on pointer-down. Prevent that
 * default focus transfer while the composer is active; the click still reaches
 * React and sends the message.
 */
function installPersistentMessageComposer(input) {
  if (!(input instanceof HTMLInputElement)) return;
  if (input.dataset.claraMessageComposerFocusBound === "true") return;
  input.dataset.claraMessageComposerFocusBound = "true";

  const disabledDescriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "disabled"
  );

  if (disabledDescriptor?.get && disabledDescriptor?.set) {
    Object.defineProperty(input, "disabled", {
      configurable: true,
      enumerable: disabledDescriptor.enumerable,
      get() {
        return disabledDescriptor.get.call(input);
      },
      set(value) {
        if (value === true && document.activeElement === input) return;
        disabledDescriptor.set.call(input, value);
      },
    });
  }

  const footer = input.closest("footer");
  const sendButton = footer?.querySelector("button");
  if (!sendButton || sendButton.dataset.claraMessageSendFocusBound === "true") return;
  sendButton.dataset.claraMessageSendFocusBound = "true";

  const keepComposerFocused = (event) => {
    if (document.activeElement === input) event.preventDefault();
  };

  sendButton.addEventListener("pointerdown", keepComposerFocused);
  sendButton.addEventListener("mousedown", keepComposerFocused);
}

function cleanupDetachedOverlays() {
  document.querySelectorAll(OVERLAY_SELECTOR).forEach((button) => {
    const input = button.__claraMessagesSearchInput;
    if (!input || !input.isConnected) button.remove();
  });
}

function scanMessagesSearch() {
  cleanupDetachedOverlays();
  document
    .querySelectorAll('input[placeholder="Search members"]')
    .forEach(installCancelButton);
  document
    .querySelectorAll(MESSAGE_INPUT_SELECTOR)
    .forEach(installPersistentMessageComposer);
}

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return String(input?.url || "");
}

function isNotificationsListRequest(input, init = {}) {
  const url = requestUrl(input);
  const method = String(init?.method || input?.method || "GET").toUpperCase();
  if (method !== "GET" || !url.includes("/api/community/notifications")) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.endsWith("/api/community/notifications");
  } catch {
    return /\/api\/community\/notifications(?:\?|$)/.test(url);
  }
}

function isMessagesReadRequest(input, init = {}) {
  const url = requestUrl(input);
  const method = String(init?.method || input?.method || "GET").toUpperCase();
  return method === "PATCH" && url.includes("/api/messages/read");
}

function installNotificationMessageSeparationFetch() {
  if (window[NOTIFICATION_FETCH_FLAG] || typeof window.fetch !== "function") return;
  window[NOTIFICATION_FETCH_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init);

    if (isMessagesReadRequest(input, init) && response.ok) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("clara:message-unread-refresh"));
      }, 0);
    }

    if (!isNotificationsListRequest(input, init) || !response.ok) return response;

    try {
      const payload = await response.clone().json();
      if (!Array.isArray(payload)) return response;
      const filtered = payload.filter(
        (notification) => String(notification?.type || "").toLowerCase() !== "message"
      );
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      headers.set("content-type", "application/json");
      return new Response(JSON.stringify(filtered), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };
}

function ensureMessageBadge(link, unreadCount) {
  if (!(link instanceof HTMLElement)) return;
  let badge = link.querySelector(MESSAGE_BADGE_SELECTOR);

  if (!unreadCount) {
    badge?.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement("span");
    badge.dataset.claraMessageUnreadBadge = "true";
    badge.setAttribute("aria-label", "Unread private messages");
    Object.assign(badge.style, {
      position: "absolute",
      right: "-2px",
      top: "-4px",
      minWidth: "17px",
      height: "17px",
      padding: "0 4px",
      border: "2px solid #071329",
      borderRadius: "9999px",
      background: "#ff3152",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "8px",
      fontWeight: "900",
      lineHeight: "1",
      boxSizing: "border-box",
      boxShadow: "0 0 12px rgba(243,38,69,0.40)",
      pointerEvents: "none",
      zIndex: "20",
    });
    link.appendChild(badge);
  }

  badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
}

function cleanNotificationEmptyCopy() {
  document.querySelectorAll(".clara-community-notifications-view p").forEach((node) => {
    if (node.textContent?.trim() === "Comments, reactions, and messages will appear here.") {
      node.textContent = "Comments, reactions, and connection activity will appear here.";
    }
  });
}

let unreadRefreshInFlight = false;
async function refreshMessageUnreadBadge() {
  if (unreadRefreshInFlight || document.visibilityState === "hidden") return;
  const link = document.querySelector('a[aria-label="Open private messages"]');
  if (!link) return;

  const token = getStoredBackendToken();
  const user = getStoredBackendUser();
  const currentUserId = user?.id;
  if (!token || !currentUserId) {
    ensureMessageBadge(link, 0);
    return;
  }

  unreadRefreshInFlight = true;
  try {
    const messages = await backendRequest("/api/messages", { token });
    const unreadCount = (Array.isArray(messages) ? messages : []).filter(
      (message) =>
        String(message?.recipient_id || "") === String(currentUserId) &&
        !message?.is_read
    ).length;
    ensureMessageBadge(link, unreadCount);
  } catch (error) {
    console.warn("[Messages] unread badge refresh failed:", error);
  } finally {
    unreadRefreshInFlight = false;
  }
}

function installMessageUnreadBadge() {
  let timerId = null;
  let refreshTimer = null;

  const scheduleRefresh = (delay = 80) => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      cleanNotificationEmptyCopy();
      refreshMessageUnreadBadge();
    }, delay);
  };

  const observer = new MutationObserver(() => scheduleRefresh(120));
  const start = () => {
    scheduleRefresh(0);
    observer.observe(document.body, { childList: true, subtree: true });
    timerId = window.setInterval(() => {
      if (document.visibilityState !== "hidden") scheduleRefresh(0);
    }, 4000);
    window.addEventListener("focus", () => scheduleRefresh(0));
    window.addEventListener("hashchange", () => scheduleRefresh(80));
    window.addEventListener("clara:message-unread-refresh", () => scheduleRefresh(40));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleRefresh(0);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  return () => {
    observer.disconnect();
    window.clearInterval(timerId);
    window.clearTimeout(refreshTimer);
  };
}

export function installMessagesSearchCancel() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  installNotificationMessageSeparationFetch();
  installMessageUnreadBadge();

  const observer = new MutationObserver(scanMessagesSearch);
  const start = () => {
    scanMessagesSearch();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

installMessagesSearchCancel();