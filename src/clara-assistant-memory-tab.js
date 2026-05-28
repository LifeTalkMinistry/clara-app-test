const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const MEMORY_PANEL_ID = "clara-assistant-memory-panel";

function safeParseStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatDate(value = "") {
  if (!value) return "Not updated yet";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return clean(value) || "Not updated yet";
  }
}

function normalizeSections(value) {
  if (!value || typeof value !== "object") return [];
  const sections = Array.isArray(value.sections) ? value.sections : [];

  return sections
    .map((section) => ({
      title: clean(section.title || section.name || section.category || "Memory"),
      bullets: (Array.isArray(section.bullets) ? section.bullets : section.items || section.memories || [])
        .map(clean)
        .filter(Boolean)
        .slice(0, 12),
    }))
    .filter((section) => section.title && section.bullets.length);
}

function createEmptyMemoryPanel() {
  return `
    <div class="clara-memory-empty">
      <p class="clara-memory-title">No saved memory yet.</p>
      <p class="clara-memory-note">Once CLARA summarizes your story or behavioral context, it will appear here as readable bullet sections.</p>
    </div>
  `;
}

function createSectionHtml(section) {
  return `
    <section class="clara-memory-section">
      <h4>${section.title}</h4>
      <ul>
        ${section.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
      </ul>
    </section>
  `;
}

function buildMemoryPanelHtml() {
  const userStory = safeParseStorage(USER_CONTEXT_STORY_KEY);
  const sections = normalizeSections(userStory);
  const updatedAt = userStory?.updatedAt || userStory?.createdAt || "";

  return `
    <div id="${MEMORY_PANEL_ID}" class="clara-memory-review-shell" role="dialog" aria-label="CLARA Memory Review">
      <div class="clara-memory-review-backdrop" data-close-clara-context-memory="true"></div>
      <section class="clara-memory-review-panel">
        <header class="clara-memory-review-header">
          <div>
            <p>CLARA Internal</p>
            <h2>Memory Review</h2>
            <span>Last updated: ${formatDate(updatedAt)}</span>
          </div>
          <button type="button" data-close-clara-context-memory="true" aria-label="Close memory review">×</button>
        </header>

        <main class="clara-memory-review-list">
          <div class="clara-memory-context-intro">
            <p>What CLARA understands so far</p>
            <span>This is the single readable context CLARA uses quietly to make future guidance feel personal.</span>
          </div>

          ${sections.length ? sections.map(createSectionHtml).join("") : createEmptyMemoryPanel()}
        </main>
      </section>
    </div>
  `;
}

function ensureMemoryStyles() {
  if (document.getElementById("clara-assistant-memory-tab-style")) return;

  const style = document.createElement("style");
  style.id = "clara-assistant-memory-tab-style";
  style.textContent = `
    .clara-memory-review-shell {
      position: fixed;
      inset: 0;
      z-index: 520;
      display: flex;
      justify-content: center;
      align-items: stretch;
      color: white;
      padding: 0;
    }
    .clara-memory-review-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(2,6,23,.58);
      backdrop-filter: blur(5px);
    }
    .clara-memory-review-panel {
      position: relative;
      width: min(430px, 100vw);
      min-height: 100vh;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      border-radius: 0;
      border: 1px solid rgba(255,255,255,.12);
      background: radial-gradient(circle at 18% 0%, rgba(45,212,191,.22), transparent 34%), radial-gradient(circle at 84% 10%, rgba(124,58,237,.24), transparent 38%), linear-gradient(145deg, rgba(3,12,22,.97), rgba(24,28,72,.94));
      box-shadow: 0 -22px 90px rgba(0,0,0,.54), inset 0 1px 0 rgba(255,255,255,.10);
      backdrop-filter: blur(24px);
      display: flex;
      flex-direction: column;
      padding-top: max(env(safe-area-inset-top), 18px);
    }
    .clara-memory-review-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 20px 14px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      flex: 0 0 auto;
    }
    .clara-memory-review-header p {
      margin: 0 0 6px;
      color: rgba(125,211,252,.72);
      font: 900 10px/1 system-ui, sans-serif;
      letter-spacing: .22em;
      text-transform: uppercase;
    }
    .clara-memory-review-header h2 {
      margin: 0;
      font: 950 24px/1.05 system-ui, sans-serif;
      color: white;
    }
    .clara-memory-review-header span {
      display: block;
      margin-top: 7px;
      color: rgba(226,232,240,.68);
      font: 750 12px/1.4 system-ui, sans-serif;
    }
    .clara-memory-review-header button {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
      color: white;
      font-size: 24px;
      flex: 0 0 auto;
    }
    .clara-memory-review-list {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 14px 14px max(24px, env(safe-area-inset-bottom));
      scrollbar-width: none;
    }
    .clara-memory-review-list::-webkit-scrollbar { display: none; }
    .clara-memory-context-intro {
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 24px;
      background: rgba(255,255,255,.045);
      padding: 14px;
      margin-bottom: 12px;
    }
    .clara-memory-context-intro p {
      margin: 0;
      font: 950 15px/1.2 system-ui, sans-serif;
      color: rgba(255,255,255,.94);
    }
    .clara-memory-context-intro span {
      display: block;
      margin-top: 8px;
      color: rgba(203,213,225,.68);
      font: 650 12px/1.55 system-ui, sans-serif;
    }
    .clara-memory-section {
      margin-bottom: 10px;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 24px;
      background: rgba(255,255,255,.055);
      padding: 14px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.07);
    }
    .clara-memory-section h4 {
      margin: 0 0 10px;
      font: 950 14px/1 system-ui, sans-serif;
      color: rgba(110,231,183,.95);
    }
    .clara-memory-section ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
    }
    .clara-memory-section li {
      color: rgba(248,250,252,.90);
      font: 700 12.5px/1.55 system-ui, sans-serif;
    }
    .clara-memory-empty {
      border: 1px dashed rgba(255,255,255,.14);
      border-radius: 24px;
      padding: 28px 18px;
      background: rgba(255,255,255,0.05);
      text-align: center;
    }
    .clara-memory-title {
      margin: 0;
      font: 900 14px/1.4 system-ui, sans-serif;
      color: white;
    }
    .clara-memory-note {
      display: block;
      margin-top: 8px;
      font: 650 12px/1.55 system-ui, sans-serif;
      color: rgba(203,213,225,0.76);
    }
  `;
  document.head.appendChild(style);
}

function findAssistantTabButtons() {
  return Array.from(document.querySelectorAll("button")).filter((button) => {
    const text = clean(button.textContent);
    if (!["Talk to CLARA", "Memory", "Core Features", "Smart Actions"].includes(text)) return false;
    return Boolean(button.closest(".fixed"));
  });
}

function removeMemoryPanel() {
  document.getElementById(MEMORY_PANEL_ID)?.remove();
}

function showMemoryPanel() {
  removeMemoryPanel();
  document.body.insertAdjacentHTML("beforeend", buildMemoryPanelHtml());
}

function relabelTalkButton() {
  findAssistantTabButtons().forEach((button) => {
    if (clean(button.textContent) === "Talk to CLARA") {
      button.textContent = "Memory";
      button.dataset.claraMemoryTab = "true";
    }
  });
}

function installClickCapture() {
  document.addEventListener("click", (event) => {
    const close = event.target?.closest?.("[data-close-clara-context-memory]");
    if (close) {
      removeMemoryPanel();
      return;
    }

    const button = event.target?.closest?.("button");
    if (!button) return;

    const label = clean(button.textContent);
    if (label === "Memory") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      showMemoryPanel();
      return;
    }

    if (label === "Core Features" || label === "Smart Actions") {
      removeMemoryPanel();
    }
  }, true);
}

function installObserver() {
  const observer = new MutationObserver(() => relabelTalkButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  relabelTalkButton();
}

function installStoryRefresh() {
  window.addEventListener("clara-user-context-story-updated", () => {
    if (document.getElementById(MEMORY_PANEL_ID)) showMemoryPanel();
  });
}

function installClaraAssistantMemoryTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_MEMORY_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_MEMORY_TAB_INSTALLED__ = true;
  ensureMemoryStyles();
  installClickCapture();
  installObserver();
  installStoryRefresh();
}

installClaraAssistantMemoryTab();
