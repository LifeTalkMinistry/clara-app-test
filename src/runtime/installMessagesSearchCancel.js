const INSTALL_FLAG = "__claraMessagesSearchCancelInstalled";
const OVERLAY_SELECTOR = "[data-clara-messages-search-overlay='true']";
const LEGACY_SELECTOR = "[data-clara-messages-search-cancel='true']";

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
}

export function installMessagesSearchCancel() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

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
