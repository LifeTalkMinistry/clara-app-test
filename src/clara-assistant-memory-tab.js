const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const MEMORY_PANEL_ID = "clara-assistant-memory-panel";

const FIXED_MEMORY_SECTIONS = [
  "Identity",
  "Work",
  "Money",
  "Emotional",
  "Health",
  "Routine",
  "Relationships",
  "Home",
  "Food",
  "Lifestyle",
  "Growth",
  "Decision Style",
  "Support Style",
  "Triggers",
  "Protection",
];

const SECTION_ALIASES = new Map([
  ["spending", "Money"],
  ["budget", "Money"],
  ["wallet", "Money"],
  ["goals", "Money"],
  ["goal", "Money"],
  ["emergency", "Protection"],
  ["debt", "Money"],
  ["bills", "Money"],
  ["schedule", "Routine"],
  ["preference", "Support Style"],
  ["decision", "Decision Style"],
  ["learning", "Growth"],
  ["relationship", "Relationships"],
  ["sports", "Health"],
  ["sport", "Health"],
  ["fitness", "Health"],
]);

const EMPTY_CATEGORY_TEXT = "No strong pattern saved yet.";

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

function now() {
  return new Date().toISOString();
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

function normalizeTitleKey(value = "") {
  return clean(value)
    .replace(/memory$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fixedTitleFromSection(value = "") {
  const key = normalizeTitleKey(value);
  const direct = FIXED_MEMORY_SECTIONS.find((title) => title.toLowerCase() === key);
  return direct || SECTION_ALIASES.get(key) || "Lifestyle";
}

function cleanBullet(value = "") {
  return clean(value)
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function isTemporaryOrLiveFact(value = "") {
  const text = clean(value).toLowerCase();
  if (!text) return true;
  if (/[₱$€£]\s?\d|\b\d+[,.]?\d*\s?(php|peso|pesos)\b/i.test(text)) return true;
  if (/\b(available|current|total)\s+(balance|wallet balance|amount|money)\b/i.test(text)) return true;
  if (/\b(balance across all wallets|money left right now|remaining right now|currently has|currently have)\b/i.test(text)) return true;
  if (/\b(is asking|asked|checking their wallet|checking his wallet|checking her wallet|see if they can afford|recent improvement in spending habits)\b/i.test(text)) return true;
  if (/\b(today|right now|currently|this exact moment)\b.*\b(balance|wallet|amount|remaining|left)\b/i.test(text)) return true;
  return false;
}

function categoryForBullet(bullet = "", fallbackTitle = "Lifestyle") {
  const text = clean(bullet).toLowerCase();

  if (/\b(name|age|gender|life stage|role|location|student|professional|creator)\b/i.test(text)) return "Identity";
  if (/\b(work|job|shift|career|income pattern|payday|after work|bpo|office)\b/i.test(text)) return "Work";
  if (/\b(spend|spending|budget|wallet|save|saving|debt|bill|bills|gastos|ipon|afford|purchase|money|expense)\b/i.test(text)) return "Money";
  if (/\b(stress|exhaust|tired|anxiety|guilt|motivation|confidence|emotion|mental|reward-spending|drained)\b/i.test(text)) return "Emotional";
  if (/\b(sleep|energy|exercise|basketball|sport|sports|gym|jogging|fitness|sickness|medication|food discipline)\b/i.test(text)) return "Health";
  if (/\b(routine|commute|after-work|after work|weekend|nighttime|night|daily|payday rhythm|low energy periods)\b/i.test(text)) return "Routine";
  if (/\b(family|partner|friend|coworker|dependent|social pressure|relationship)\b/i.test(text)) return "Relationships";
  if (/\b(home|rent|household|living situation|shared expenses)\b/i.test(text)) return "Home";
  if (/\b(food|craving|delivery|convenience food|groceries|meal|takeout|order food)\b/i.test(text)) return "Food";
  if (/\b(hobby|entertainment|shopping|travel|social life|basketball)\b/i.test(text)) return "Lifestyle";
  if (/\b(learning|goals|discipline|faith|self-improvement|improve|growth)\b/i.test(text)) return "Growth";
  if (/\b(decide|decision|hesitation|impulsive|risk tolerance|pause-before-spending|pause before spending)\b/i.test(text)) return "Decision Style";
  if (/\b(guidance|reminder|tone|accountability|responds better|supportive|guilt)\b/i.test(text)) return "Support Style";
  if (/\b(trigger|cause|temptation|avoidance|reward behavior|risk window|lowers resistance)\b/i.test(text)) return "Triggers";
  if (/\b(emergency fund|boundary|boundaries|safety plan|protection|financial risk)\b/i.test(text)) return "Protection";

  return fallbackTitle;
}

function collectSectionMap(value) {
  const merged = new Map();
  if (!value || typeof value !== "object") return merged;

  const sections = Array.isArray(value.sections) ? value.sections : [];

  sections.forEach((section) => {
    const fallbackTitle = fixedTitleFromSection(section.title || section.name || section.category || "Lifestyle");
    const bullets = Array.isArray(section.bullets) ? section.bullets : section.items || section.memories || [];

    bullets.map(cleanBullet).filter(Boolean).forEach((bullet) => {
      if (isTemporaryOrLiveFact(bullet)) return;
      const title = categoryForBullet(bullet, fallbackTitle);
      const existing = merged.get(title) || { title, bullets: [] };

      if (!existing.bullets.some((item) => item.toLowerCase() === bullet.toLowerCase())) {
        existing.bullets.push(bullet);
      }

      existing.bullets = existing.bullets.slice(0, 12);
      merged.set(title, existing);
    });
  });

  return merged;
}

function normalizeSections(value, { includeEmpty = true } = {}) {
  const merged = collectSectionMap(value);

  return FIXED_MEMORY_SECTIONS
    .map((title) => {
      const existing = merged.get(title);
      return existing || (includeEmpty ? { title, bullets: [], isEmpty: true } : null);
    })
    .filter(Boolean);
}

function buildNormalizedStory(rawStory) {
  const sections = normalizeSections(rawStory, { includeEmpty: false });
  return {
    id: "clara-user-context-story",
    type: "user_context_story",
    schemaVersion: 4,
    sections: sections.map((section) => ({
      id: section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: section.title,
      type: "fixed",
      bullets: section.bullets,
      createdAt: rawStory?.createdAt || now(),
      updatedAt: now(),
    })),
    createdAt: rawStory?.createdAt || now(),
    updatedAt: now(),
    sectionCount: sections.length,
    bulletCount: sections.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_user_context_story",
  };
}

function migrateStoredStoryIfNeeded(rawStory) {
  if (!rawStory || typeof rawStory !== "object") return rawStory;

  const normalized = buildNormalizedStory(rawStory);
  const before = JSON.stringify(rawStory.sections || []);
  const after = JSON.stringify(normalized.sections || []);
  const usesOnlyFixed = normalized.sections.every((section) => FIXED_MEMORY_SECTIONS.includes(section.title));

  if (before !== after || Number(rawStory.schemaVersion || 0) < 4 || !usesOnlyFixed) {
    try {
      window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalized }));
    } catch {}
    return normalized;
  }

  return rawStory;
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
  const items = section.bullets.length
    ? section.bullets.map((bullet) => `<li>${bullet}</li>`).join("")
    : `<li class="clara-memory-section-empty-line">${EMPTY_CATEGORY_TEXT}</li>`;

  return `
    <section class="clara-memory-section ${section.bullets.length ? "" : "is-empty"}">
      <h4>${section.title}</h4>
      <ul>
        ${items}
      </ul>
    </section>
  `;
}

function buildMemoryPanelHtml() {
  const rawStory = safeParseStorage(USER_CONTEXT_STORY_KEY);
  const userStory = migrateStoredStoryIfNeeded(rawStory);
  const sections = normalizeSections(userStory, { includeEmpty: true });
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
            <span>This fixed life context board shows all master categories. Empty cards mean CLARA has no strong saved pattern there yet.</span>
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
    .clara-memory-section.is-empty {
      background: rgba(255,255,255,.032);
      border-style: dashed;
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
    .clara-memory-section-empty-line {
      color: rgba(203,213,225,.48) !important;
      font-style: italic !important;
      list-style-type: none;
      margin-left: -18px;
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
