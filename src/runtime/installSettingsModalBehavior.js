const SETTINGS_MODAL_HISTORY_KEY = "__claraSettingsModal";
const AI_PRIVACY_MODAL_KEY = "ai-privacy";
const AI_PRIVACY_TITLE_ID = "ai-privacy-title";
const AI_PRIVACY_CLOSE_LABEL = "Close AI privacy information";

let handlingPopState = false;
let openerElement = null;
let savedBodyOverflow = null;
let scheduledFrame = null;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getAiPrivacyModal() {
  if (typeof document === "undefined") return null;
  return document.querySelector(
    `[role="dialog"][aria-labelledby="${AI_PRIVACY_TITLE_ID}"]`
  );
}

function getAiPrivacyOpener() {
  if (typeof document === "undefined") return null;
  return [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find(
    (button) => normalizeText(button.textContent).includes("AI privacy")
  ) || null;
}

function getAiPrivacyCloseButton(modal = getAiPrivacyModal()) {
  return modal?.querySelector(`button[aria-label="${AI_PRIVACY_CLOSE_LABEL}"]`) || null;
}

function restoreBodyScroll() {
  if (typeof document === "undefined" || savedBodyOverflow === null) return;
  document.body.style.overflow = savedBodyOverflow;
  savedBodyOverflow = null;
}

function syncModalEffects({ restoreFocus = false } = {}) {
  scheduledFrame = null;
  const modal = getAiPrivacyModal();

  if (modal) {
    if (savedBodyOverflow === null) {
      savedBodyOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
    }

    const activeElement = document.activeElement;
    if (!activeElement || !modal.contains(activeElement)) {
      getAiPrivacyCloseButton(modal)?.focus({ preventScroll: true });
    }
    return;
  }

  restoreBodyScroll();
  if (restoreFocus) {
    const target = openerElement?.isConnected ? openerElement : getAiPrivacyOpener();
    target?.focus?.({ preventScroll: true });
  }
}

function scheduleModalSync(options) {
  if (typeof window === "undefined") return;
  if (scheduledFrame !== null) window.cancelAnimationFrame(scheduledFrame);
  scheduledFrame = window.requestAnimationFrame(() => syncModalEffects(options));
}

function pushModalHistory() {
  if (typeof window === "undefined") return;
  const currentState = window.history.state || {};
  if (currentState?.[SETTINGS_MODAL_HISTORY_KEY] === AI_PRIVACY_MODAL_KEY) return;

  window.history.pushState(
    {
      ...currentState,
      [SETTINGS_MODAL_HISTORY_KEY]: AI_PRIVACY_MODAL_KEY,
    },
    "",
    window.location.href
  );
}

function unwindModalHistory() {
  if (typeof window === "undefined" || handlingPopState) return;
  if (window.history.state?.[SETTINGS_MODAL_HISTORY_KEY] !== AI_PRIVACY_MODAL_KEY) {
    scheduleModalSync({ restoreFocus: true });
    return;
  }

  window.setTimeout(() => {
    window.history.back();
  }, 0);
}

function handleClick(event) {
  const button = event.target?.closest?.("button");
  const modal = getAiPrivacyModal();

  if (button?.getAttribute("aria-haspopup") === "dialog" && normalizeText(button.textContent).includes("AI privacy")) {
    openerElement = button;
    if (!handlingPopState) pushModalHistory();
    scheduleModalSync();
    return;
  }

  if (button?.getAttribute("aria-label") === AI_PRIVACY_CLOSE_LABEL) {
    unwindModalHistory();
    scheduleModalSync({ restoreFocus: true });
    return;
  }

  const presentationLayer = event.target?.closest?.('[role="presentation"]');
  if (
    modal &&
    presentationLayer &&
    event.target === presentationLayer &&
    presentationLayer.contains(modal)
  ) {
    unwindModalHistory();
    scheduleModalSync({ restoreFocus: true });
  }
}

function handlePopState(event) {
  if (typeof window === "undefined") return;
  const targetModal = event?.state?.[SETTINGS_MODAL_HISTORY_KEY] || "";
  handlingPopState = true;

  window.requestAnimationFrame(() => {
    const modal = getAiPrivacyModal();

    if (targetModal === AI_PRIVACY_MODAL_KEY && !modal) {
      const opener = getAiPrivacyOpener();
      openerElement = opener || openerElement;
      opener?.click();
      scheduleModalSync();
    } else if (!targetModal && modal) {
      getAiPrivacyCloseButton(modal)?.click();
      scheduleModalSync({ restoreFocus: true });
    } else {
      scheduleModalSync({ restoreFocus: !targetModal });
    }

    window.requestAnimationFrame(() => {
      handlingPopState = false;
    });
  });
}

function handleKeyDown(event) {
  const modal = getAiPrivacyModal();
  if (!modal) return;

  if (event.key === "Escape") {
    event.preventDefault();
    getAiPrivacyCloseButton(modal)?.click();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = [
    ...modal.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ),
  ].filter((element) => !element.hasAttribute("aria-hidden"));

  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function installSettingsModalBehavior() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSettingsModalBehaviorInstalled) return;
  window.__claraSettingsModalBehaviorInstalled = true;

  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("popstate", handlePopState);
  window.addEventListener("pagehide", restoreBodyScroll);
}

installSettingsModalBehavior();
