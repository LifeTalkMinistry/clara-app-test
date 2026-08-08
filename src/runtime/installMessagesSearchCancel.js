const INSTALL_FLAG = "__claraMessagesSearchCancelInstalled";

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

function installCancelButton(input) {
  if (!(input instanceof HTMLInputElement)) return;
  const container = input.parentElement;
  if (!container) return;

  container.style.position = "relative";
  container.style.paddingRight = "2.65rem";

  let button = container.querySelector("[data-clara-messages-search-cancel='true']");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.claraMessagesSearchCancel = "true";
    button.setAttribute("aria-label", "Close member search");
    button.setAttribute("title", "Close search");
    button.appendChild(createCloseIcon());

    Object.assign(button.style, {
      position: "absolute",
      right: "0.7rem",
      top: "50%",
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
      zIndex: "4",
      padding: "0",
      boxShadow: "none",
      outline: "none",
      transition: "opacity 120ms ease, color 120ms ease",
      WebkitTapHighlightColor: "transparent",
    });

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

      // Keep the close control suppressed until the user explicitly taps the
      // search field again. This prevents a focus/input observer from bringing
      // the X back while the recent-chat list is already visible.
      input.dataset.claraMessagesSearchCancelled = "true";
      button.style.opacity = "0";
      button.style.display = "none";
      setReactInputValue(input, "");
      input.blur();
    });

    container.appendChild(button);
  }

  const showButton = () => {
    if (input.dataset.claraMessagesSearchCancelled === "true") return;
    button.style.display = "inline-flex";
    window.requestAnimationFrame(() => {
      if (input.dataset.claraMessagesSearchCancelled !== "true") {
        button.style.opacity = "1";
      }
    });
  };

  const hideButton = () => {
    button.style.opacity = "0";
    button.style.display = "none";
  };

  const syncVisibility = () => {
    const cancelled = input.dataset.claraMessagesSearchCancelled === "true";
    const focused = document.activeElement === input;
    if (!cancelled && focused) showButton();
    else hideButton();
  };

  if (!input.dataset.claraMessagesSearchCancelBound) {
    input.dataset.claraMessagesSearchCancelBound = "true";

    input.addEventListener("focus", () => {
      input.dataset.claraMessagesSearchCancelled = "false";
      showButton();
    });
    input.addEventListener("input", syncVisibility);
    input.addEventListener("blur", () => window.setTimeout(syncVisibility, 160));
  }

  syncVisibility();
}

function scanMessagesSearch() {
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
