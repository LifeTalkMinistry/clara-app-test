const MEMORY_EDIT_PANEL_ID = "clara-assistant-memory-edit-panel";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isExitText(value = "") {
  const text = clean(value).toLowerCase().replace(/[.!?]+$/g, "");
  return /^(no|no thanks|that'?s all|thats all|done|exit|exit edit mode|stop|okay na|tapos na|all set|all set for now|nothing else|good for now|i'm good|im good|we'?re good|were good)$/i.test(text);
}

function latestUserMessage(panel) {
  const messages = Array.from(panel?.querySelectorAll?.(".clara-memory-edit-message.user") || []);
  return clean(messages[messages.length - 1]?.textContent || "");
}

function latestAssistantMessage(panel) {
  const messages = Array.from(panel?.querySelectorAll?.(".clara-memory-edit-message.assistant") || []);
  return messages[messages.length - 1] || null;
}

function polishText(value = "", lastUserText = "") {
  const text = clean(value);

  if (isExitText(lastUserText)) {
    return "All set — I kept your memory board saved.";
  }

  if (/anything else you'?d like to add, change, or remove/i.test(text)) {
    return text.replace(/Anything else you'?d like to add, change, or remove\??/i, "Anything else you want to add, move, remove, or correct?");
  }

  if (/^Got it\. I'?ve updated your memory board to include/i.test(text)) {
    return `Got it — I updated your memory board. Anything else you want to add, move, remove, or correct?`;
  }

  if (/^Got it\. I updated your memory board\./i.test(text)) {
    return `Got it — I updated your memory board. Anything else you want to add, move, remove, or correct?`;
  }

  return text;
}

function polishMemoryEditPanel() {
  const panel = document.getElementById(MEMORY_EDIT_PANEL_ID);
  if (!panel) return;

  const assistant = latestAssistantMessage(panel);
  if (!assistant) return;

  const lastUser = latestUserMessage(panel);
  const original = clean(assistant.textContent || "");
  const polished = polishText(original, lastUser);

  if (polished && polished !== original) {
    assistant.textContent = polished;
  }
}

function installMemoryEditReplyPolisher() {
  if (typeof window === "undefined" || window.__CLARA_MEMORY_EDIT_REPLY_POLISHER__) return;
  window.__CLARA_MEMORY_EDIT_REPLY_POLISHER__ = true;

  document.addEventListener("submit", (event) => {
    if (!event.target?.closest?.("[data-memory-edit-form]")) return;
    window.setTimeout(polishMemoryEditPanel, 120);
    window.setTimeout(polishMemoryEditPanel, 900);
    window.setTimeout(polishMemoryEditPanel, 1800);
  }, true);

  const observer = new MutationObserver(() => window.requestAnimationFrame(polishMemoryEditPanel));
  window.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  });
}

installMemoryEditReplyPolisher();
