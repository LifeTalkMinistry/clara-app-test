const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const UNIVERSAL_MEMORY_KEY = "CLARA_UNIVERSAL_MEMORY_PROFILE_V1";
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

function normalizeSections(value) {
  if (!value || typeof value !== "object") return [];
  const sections = Array.isArray(value.sections) ? value.sections : [];

  return sections
    .map((section) => ({
      title: clean(section.title || section.name || section.category || "Memory"),
      bullets: (Array.isArray(section.bullets) ? section.bullets : section.items || section.memories || [])
        .map(clean)
        .filter(Boolean)
        .slice(0, 8),
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
  const universalProfile = safeParseStorage(UNIVERSAL_MEMORY_KEY);
  const storySections = normalizeSections(userStory);
  const universalSections = normalizeSections(universalProfile);

  return `
    <div id="${MEMORY_PANEL_ID}" class="clara-assistant-memory-panel">
      <div class="clara-memory-header">
        <p>CLARA MEMORY</p>
        <h3>What CLARA understands so far</h3>
        <span>This is the human context CLARA uses quietly for better guidance.</span>
      </div>

      ${storySections.length ? `
        <div class="clara-memory-group">
          <p class="clara-memory-group-label">User Context Story</p>
          ${storySections.map(createSectionHtml).join("")}
        </div>
      ` : ""}

      ${universalSections.length ? `
        <div class="clara-memory-group">
          <p class="clara-memory-group-label">Universal Memory Profile</p>
          ${universalSections.map(createSectionHtml).join("")}
        </div>
      ` : ""}

      ${!storySections.length && !universalSections.length ? createEmptyMemoryPanel() : ""}
    </div>
  `;
}

function ensureMemoryStyles() {
  if (document.getElementById("clara-assistant-memory-tab-style")) return;

  const style = document.createElement("style");
  style.id = "clara-assistant-memory-tab-style";
  style.textContent = `
    .clara-assistant-memory-panel {
      margin-top: 12px;
      max-height: min(360px, 48vh);
      overflow: auto;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      padding: 14px;
      background: linear-gradient(145deg, rgba(15,23,42,0.72), rgba(45,24,104,0.48));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 44px rgba(0,0,0,0.20);
      backdrop-filter: blur(18px);
      color: rgba(255,255,255,0.9);
      scrollbar-width: none;
    }
    .clara-assistant-memory-panel::-webkit-scrollbar { display: none; }
    .clara-memory-header { padding: 4px 2px 12px; text-align: left; }
    .clara-memory-header p,
    .clara-memory-group-label {
      margin: 0;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: rgba(153,246,228,0.66);
      text-transform: uppercase;
    }
    .clara-memory-header h3 {
      margin: 6px 0 0;
      font-size: 18px;
      line-height: 1.15;
      font-weight: 900;
      color: white;
    }
    .clara-memory-header span,
    .clara-memory-note {
      display: block;
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.55;
      color: rgba(203,213,225,0.76);
    }
    .clara-memory-group { display: grid; gap: 10px; margin-top: 10px; }
    .clara-memory-section {
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 18px;
      padding: 12px;
      background: rgba(255,255,255,0.055);
    }
    .clara-memory-section h4 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 900;
      color: rgba(209,250,229,0.95);
    }
    .clara-memory-section ul { margin: 0; padding-left: 18px; display: grid; gap: 7px; }
    .clara-memory-section li { font-size: 12px; line-height: 1.45; color: rgba(241,245,249,0.86); }
    .clara-memory-empty {
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 18px;
      padding: 14px;
      background: rgba(255,255,255,0.05);
      text-align: left;
    }
    .clara-memory-title { margin: 0; font-weight: 900; color: white; }
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

function getTabShell(button) {
  const row = button?.parentElement;
  const shell = row?.parentElement;
  return shell || null;
}

function removeMemoryPanel() {
  document.getElementById(MEMORY_PANEL_ID)?.remove();
}

function showMemoryPanel(button) {
  const shell = getTabShell(button);
  if (!shell) return;
  removeMemoryPanel();
  shell.insertAdjacentHTML("beforeend", buildMemoryPanelHtml());
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
    const button = event.target?.closest?.("button");
    if (!button) return;

    const label = clean(button.textContent);
    if (label === "Memory") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      showMemoryPanel(button);
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

function installClaraAssistantMemoryTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_MEMORY_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_MEMORY_TAB_INSTALLED__ = true;
  ensureMemoryStyles();
  installClickCapture();
  installObserver();
}

installClaraAssistantMemoryTab();
