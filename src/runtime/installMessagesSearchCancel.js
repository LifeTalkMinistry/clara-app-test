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

function installCancelButton(input) {
  if (!(input instanceof HTMLInputElement)) return;
  const container = input.parentElement;
  if (!container) return;

  container.style.position = "relative";
  container.style.paddingRight = "3rem";

  let button = container.querySelector("[data-clara-messages-search-cancel='true']");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.claraMessagesSearchCancel = "true";
    button.setAttribute("aria-label", "Cancel member search");
    button.setAttribute("title", "Cancel search");
    button.textContent = "×";
    Object.assign(button.style, {
      position: "absolute",
      right: "0.72rem",
      top: "50%",
      transform: "translateY(-50%)",
      width: "1.9rem",
      height: "1.9rem",
      borderRadius: "9999px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.055)",
      color: "rgba(255,255,255,0.72)",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.25rem",
      lineHeight: "1",
      fontWeight: "500",
      cursor: "pointer",
      zIndex: "4",
      padding: "0",
      WebkitTapHighlightColor: "transparent",
    });

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setReactInputValue(input, "");
      input.blur();
      button.style.display = "none";
    });

    container.appendChild(button);
  }

  const syncVisibility = () => {
    const isActive = document.activeElement === input || String(input.value || "").length > 0;
    button.style.display = isActive ? "inline-flex" : "none";
  };

  if (!input.dataset.claraMessagesSearchCancelBound) {
    input.dataset.claraMessagesSearchCancelBound = "true";
    input.addEventListener("focus", syncVisibility);
    input.addEventListener("input", syncVisibility);
    input.addEventListener("blur", () => window.setTimeout(syncVisibility, 180));
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
