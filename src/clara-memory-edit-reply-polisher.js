const MEMORY_EDIT_PANEL_ID = "clara-assistant-memory-edit-panel";
const FOLLOW_UP = "Anything else you want to add, move, remove, or correct?";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function latestMessage(panel, role) {
  const messages = Array.from(panel?.querySelectorAll?.(`.clara-memory-edit-message.${role}`) || []);
  return messages[messages.length - 1] || null;
}

function looksLikeSuccessfulMemoryUpdate(text = "") {
  const value = clean(text).toLowerCase();
  return /\b(got it|done|updated|added|moved|removed|saved)\b/.test(value)
    && /\b(memory|category|board|under|added|moved|removed|saved)\b/.test(value)
    && !/\?\s*$/.test(value)
    && !/anything else/i.test(value);
}

function normalizeContinuationText(text = "") {
  const value = clean(text);
  if (!value) return value;

  if (/anything else you'?d like to add, change, or remove/i.test(value)) {
    return value.replace(/Anything else you'?d like to add, change, or remove\??/i, FOLLOW_UP);
  }

  if (/anything else you'?d like to adjust/i.test(value)) {
    return value.replace(/Is there anything else you'?d like to adjust\??/i, FOLLOW_UP);
  }

  if (looksLikeSuccessfulMemoryUpdate(value)) {
    return `${value}\n\n${FOLLOW_UP}`;
  }

  return value;
}

function enforceMemoryEditContinuation() {
  const panel = document.getElementById(MEMORY_EDIT_PANEL_ID);
  if (!panel) return;

  const assistant = latestMessage(panel, "assistant");
  if (!assistant) return;

  const original = clean(assistant.textContent || "");
  const normalized = normalizeContinuationText(original);

  if (normalized && normalized !== original) {
    assistant.textContent = normalized;
  }
}

function installMemoryEditContinuationGuard() {
  if (typeof window === "undefined" || window.__CLARA_MEMORY_EDIT_CONTINUATION_GUARD__) return;
  window.__CLARA_MEMORY_EDIT_CONTINUATION_GUARD__ = true;

  document.addEventListener("submit", (event) => {
    if (!event.target?.closest?.("[data-memory-edit-form]")) return;
    window.setTimeout(enforceMemoryEditContinuation, 140);
    window.setTimeout(enforceMemoryEditContinuation, 900);
    window.setTimeout(enforceMemoryEditContinuation, 1800);
  }, true);

  const observer = new MutationObserver(() => window.requestAnimationFrame(enforceMemoryEditContinuation));
  window.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  });
}

installMemoryEditContinuationGuard();
