import { activateYoungProfessionalCurrentState } from "./lib/clara-young-professional-current-state";

const SECTION_ID = "clara-current-state-learning-section";
const PAGE_ID = "clara-current-state-learning-page";
const STYLE_ID = "clara-current-state-learning-styles";
const STATUS_ID = "clara-current-state-learning-status";

function findSettingsRoot() {
  return document.querySelector("#root .space-y-5.pb-6");
}

function findProgramSection(settingsRoot) {
  if (!settingsRoot) return null;
  return Array.from(settingsRoot.querySelectorAll("section")).find((section) =>
    section.textContent?.includes("Program") && section.textContent?.includes("About CLARA")
  );
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function createUserCandidate(id, email = null) {
  const safeId = String(id || "").trim();
  if (!safeId) return null;
  return { id: safeId, email: email || null };
}

function uniqueUsers(users = []) {
  const seen = new Set();
  return users.filter((user) => {
    const key = String(user?.id || user?.email || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSettingsDemoUsers() {
  const lastAccessSnapshot = safeJsonParse(window.localStorage?.getItem("clara_access_snapshot_v2:last"));
  const profile = lastAccessSnapshot?.profileBasic || lastAccessSnapshot?.profile || {};
  const cachedId = lastAccessSnapshot?.userId || profile?.id || lastAccessSnapshot?.email || profile?.email;
  const cachedEmail = lastAccessSnapshot?.email || profile?.email || null;

  return uniqueUsers([
    createUserCandidate(cachedId, cachedEmail),
    createUserCandidate("local-dev-user", "local@clara.app"),
    createUserCandidate("local-user", "local@clara.app"),
  ]);
}

function iconSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/></svg>`;
}

function backSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`;
}

function chevronSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${SECTION_ID} > p { color: rgba(207, 250, 254, 0.38) !important; letter-spacing: 0.21em !important; }
    .clara-current-state-row, .clara-current-state-card, .clara-current-state-instruction { border: 1px solid rgba(165, 243, 252, 0.14); background: radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.085), transparent 38%), radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.065), transparent 42%), rgba(255, 255, 255, 0.04); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.058), 0 12px 30px rgba(0, 0, 0, 0.13), 0 0 20px rgba(34, 211, 238, 0.025); }
    .clara-current-state-row { display: flex; width: 100%; min-height: 4.2rem; align-items: center; gap: 0.75rem; border-radius: 24px; padding: 1rem; text-align: left; transition: 160ms ease; }
    .clara-current-state-icon { display: flex; height: 2.75rem; width: 2.75rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 1rem; border: 1px solid rgba(165, 243, 252, 0.16); background: rgba(255, 255, 255, 0.075); color: rgba(236, 253, 255, 0.72); }
    .clara-current-state-icon svg, .clara-current-state-row > svg, .clara-current-state-back svg { height: 1rem; width: 1rem; }
    .clara-current-state-icon svg { height: 1.25rem; width: 1.25rem; }
    .clara-current-state-text { min-width: 0; flex: 1; }
    .clara-current-state-text p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; font-weight: 850; color: rgba(255, 255, 255, 0.92); }
    .clara-current-state-text span { margin-top: 0.25rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: rgba(236, 253, 255, 0.46); }
    .clara-current-state-badge { border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); padding: 0.25rem 0.62rem; font-size: 10px; font-weight: 850; color: rgba(255,255,255,0.58); }
    #${PAGE_ID} { min-height: 100%; }
    .clara-current-state-back { display: inline-flex; align-items: center; gap: 0.5rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); padding: 0.5rem 0.75rem; font-size: 11px; font-weight: 850; color: rgba(255,255,255,0.70); }
    .clara-current-state-instruction { position: relative; overflow: hidden; border-radius: 26px; border-color: rgba(52, 211, 153, 0.28); background: radial-gradient(circle at 0% 0%, rgba(52, 211, 153, 0.18), transparent 42%), radial-gradient(circle at 100% 0%, rgba(34, 211, 238, 0.12), transparent 45%), linear-gradient(135deg, rgba(6, 78, 59, 0.26), rgba(15, 23, 42, 0.44)); padding: 1.15rem 1.1rem; }
    .clara-current-state-kicker { display: inline-flex; margin-bottom: 0.6rem; border-radius: 999px; border: 1px solid rgba(52, 211, 153, 0.25); background: rgba(16, 185, 129, 0.12); padding: 0.32rem 0.7rem; color: rgba(209, 250, 229, 0.9); font-size: 0.62rem; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; }
    .clara-current-state-instruction h2 { margin: 0; font-size: 1rem; line-height: 1.25; font-weight: 950; letter-spacing: -0.025em; color: rgba(255,255,255,0.96); }
    .clara-current-state-instruction p { margin-top: 0.55rem; max-width: 34ch; color: rgba(209, 250, 229, 0.68); font-size: 0.8rem; font-weight: 750; line-height: 1.55; }
    .clara-current-state-card { width: 100%; border-radius: 24px; padding: 1rem; text-align: left; transition: 160ms ease; }
    .clara-current-state-card h3 { margin: 0; color: rgba(255,255,255,0.94); font-size: 0.95rem; font-weight: 950; letter-spacing: -0.015em; }
    .clara-current-state-card p { margin-top: 0.45rem; color: rgba(236,253,255,0.50); font-size: 0.74rem; font-weight: 650; line-height: 1.55; }
    .clara-current-state-card small { display: inline-flex; margin-top: 0.7rem; border-radius: 999px; border: 1px solid rgba(165,243,252,0.14); background: rgba(255,255,255,0.06); padding: 0.32rem 0.68rem; color: rgba(207,250,254,0.66); font-size: 0.64rem; font-weight: 900; }
    #${STATUS_ID} { display: none; border-radius: 22px; border: 1px solid rgba(52, 211, 153, 0.22); background: rgba(16, 185, 129, 0.11); padding: 0.9rem 1rem; color: rgba(209, 250, 229, 0.9); font-size: 0.75rem; font-weight: 800; line-height: 1.5; }
    #${STATUS_ID}[data-type="error"] { border-color: rgba(251,113,133,0.24); background: rgba(244,63,94,0.12); color: rgba(255,228,230,0.92); }
  `;

  document.head.appendChild(style);
}

function setStatus(message, type = "success") {
  const status = document.getElementById(STATUS_ID);
  if (!status) return;
  status.textContent = message || "";
  status.dataset.type = type;
  status.style.display = message ? "block" : "none";
}

function assertLoaded(result) {
  if (!result || Number(result.incomeSources || 0) < 3 || Number(result.wallets || 0) < 3 || Number(result.expenses || 0) < 1) {
    throw new Error("CLARA could not confirm the demo records. Please try again after refreshing the app.");
  }
}

async function loadYoungProfessional(button) {
  const previousText = button?.querySelector("small")?.textContent || "Activate demo data";

  try {
    if (button) {
      button.disabled = true;
      const small = button.querySelector("small");
      if (small) small.textContent = "Loading full demo data...";
    }

    const users = getSettingsDemoUsers();
    setStatus("Preparing Young Professional demo records for the active dashboard session...", "success");

    let primaryResult = null;
    for (const user of users) {
      const result = await activateYoungProfessionalCurrentState({ user });
      assertLoaded(result);
      primaryResult = primaryResult || result;
    }

    setStatus(`Demo loaded: ${primaryResult.incomeSources} sources, ${primaryResult.wallets} wallets, ${primaryResult.expenses} expenses, ${primaryResult.savingsGoals} goals.`, "success");

    window.setTimeout(() => {
      window.dispatchEvent(new Event("clara-finance-updated"));
      window.location.hash = "#/dashboard";
      window.location.reload();
    }, 650);

    return primaryResult;
  } catch (error) {
    console.error("Young Professional current-state activation failed:", error);
    setStatus(error?.message || "Unable to activate Young Professional right now.", "error");

    if (button) {
      button.disabled = false;
      const small = button.querySelector("small");
      if (small) small.textContent = previousText;
    }
  }
}

function showPage(show) {
  const root = findSettingsRoot();
  const page = document.getElementById(PAGE_ID);
  if (!root || !page) return;
  root.style.display = show ? "none" : "";
  page.style.display = show ? "block" : "none";
  if (show) page.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createSection() {
  const section = document.createElement("section");
  section.id = SECTION_ID;
  section.className = "space-y-2";
  section.innerHTML = `
    <p class="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Learning</p>
    <div class="space-y-2.5">
      <button type="button" class="clara-current-state-row">
        <div class="clara-current-state-icon">${iconSvg()}</div>
        <div class="clara-current-state-text">
          <p>Explore CLARA</p>
          <span>Try a full demo setup for learning</span>
        </div>
        <span class="clara-current-state-badge">Start</span>
        ${chevronSvg()}
      </button>
    </div>
  `;
  section.querySelector("button")?.addEventListener("click", () => showPage(true));
  return section;
}

function createPage() {
  const page = document.createElement("div");
  page.id = PAGE_ID;
  page.className = "space-y-4 pb-6";
  page.style.display = "none";
  page.innerHTML = `
    <button type="button" class="clara-current-state-back">${backSvg()} Settings</button>
    <div class="clara-current-state-instruction">
      <span class="clara-current-state-kicker">Instruction</span>
      <h2>Choose demo financial setup</h2>
      <p>This loads a temporary learning setup. You can test CLARA freely, exit anytime, and return to a fresh default demo.</p>
    </div>
    <div id="${STATUS_ID}"></div>
    <button type="button" class="clara-current-state-card">
      <h3>Young Professional</h3>
      <p>Work salary, side hustle, family support, BDO, GCash, Cash, budgets, expenses, savings, emergency fund, and PH money seasons.</p>
      <small>3 sources · 3 wallets · Jan-May demo data</small>
    </button>
  `;
  page.querySelector(".clara-current-state-back")?.addEventListener("click", () => showPage(false));
  page.querySelector(".clara-current-state-card")?.addEventListener("click", (event) => loadYoungProfessional(event.currentTarget));
  return page;
}

function install() {
  if (typeof document === "undefined") return;
  installStyles();
  const settingsRoot = findSettingsRoot();
  if (!settingsRoot) return;
  const programSection = findProgramSection(settingsRoot);
  if (!programSection) return;
  if (!document.getElementById(SECTION_ID)) programSection.insertAdjacentElement("afterend", createSection());
  if (!document.getElementById(PAGE_ID)) settingsRoot.insertAdjacentElement("afterend", createPage());
}

if (typeof window !== "undefined") {
  window.requestAnimationFrame(install);
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
