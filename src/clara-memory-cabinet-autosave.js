import { saveClaraConversationMemory } from "@/lib/clara-conversation-memory-summarizer";

let installed = false;
let wasActive = false;
let saveInProgress = false;
let latestLiveMessages = [];

function normalizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => String(message?.text || message?.content || message?.message || "").trim())
    .slice(-30);
}

function readLiveMessages() {
  if (typeof window === "undefined") return latestLiveMessages;

  const bridgeMessages = normalizeMessages(
    window.CLARA_BEHAVIORAL_MEMORY?.readLiveUserMessageHistory?.() || []
  );

  if (bridgeMessages.length) {
    latestLiveMessages = bridgeMessages;
    return bridgeMessages;
  }

  return latestLiveMessages;
}

function rememberLiveMessages(event) {
  const messages = normalizeMessages(event?.detail || []);
  if (messages.length) latestLiveMessages = messages;
}

async function saveLiveSessionMemory(messagesOverride = null) {
  if (saveInProgress) return;

  const messages = normalizeMessages(messagesOverride || readLiveMessages());
  if (!messages.length) return;

  saveInProgress = true;

  try {
    const result = await saveClaraConversationMemory({ messages, clearLiveSession: true });
    latestLiveMessages = [];
    window.dispatchEvent(new CustomEvent("clara-memory-cabinet-session-saved", { detail: result }));
  } catch (error) {
    console.warn("CLARA memory cabinet autosave skipped:", error);
  } finally {
    saveInProgress = false;
  }
}

function checkOverlayState() {
  if (typeof document === "undefined") return;

  const isActive = document.body?.classList?.contains("clara-ai-environment-active") || false;

  if (wasActive && !isActive) {
    saveLiveSessionMemory();
  }

  wasActive = isActive;
}

export function installClaraMemoryCabinetAutosave() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  wasActive = document.body?.classList?.contains("clara-ai-environment-active") || false;

  window.addEventListener("clara-live-user-message-history-updated", rememberLiveMessages);

  const observer = new MutationObserver(checkOverlayState);

  window.addEventListener("DOMContentLoaded", () => {
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }
  });

  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
}

installClaraMemoryCabinetAutosave();
