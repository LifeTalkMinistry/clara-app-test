import { saveClaraConversationMemory } from "@/lib/clara-conversation-memory-summarizer";

let installed = false;
let wasActive = false;
let saveInProgress = false;

function readLiveMessages() {
  if (typeof window === "undefined") return [];
  return window.CLARA_BEHAVIORAL_MEMORY?.readLiveUserMessageHistory?.() || [];
}

async function saveLiveSessionMemory() {
  if (saveInProgress) return;

  const messages = readLiveMessages();
  if (!messages.length) return;

  saveInProgress = true;

  try {
    const result = await saveClaraConversationMemory({ messages, clearLiveSession: true });
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
