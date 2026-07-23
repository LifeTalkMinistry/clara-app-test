import { loadYoungProfessionalDemoProfile, isYoungProfessionalDemoProfileActive } from "./lib/demo/loadDemoProfile";

const PAGE_ID = "clara-current-state-learning-page";
const STYLE_ID = "clara-current-state-learning-static-styles";
const STATUS_ID = "clara-current-state-learning-static-status";
const OPEN_DEMO_PROFILE_EVENT = "clara:open-developer-demo-profile";
const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";
const ACCOUNT_TAP_WINDOW_MS = 450;

let lastAccountTapAt = 0;

function findSettingsRoot() {
  const activeSettingsNav = document.querySelector(
    '.theme-page-shell button[aria-label="Settings"][aria-current="page"]'
  );
  const shell = activeSettingsNav?.closest(".theme-page-shell");
  return shell?.querySelector(".clara-dashboard-content .space-y-5.pb-6") || null;
}

function backSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`;
}

function setStatus(message = "") {
  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = message;
}

async function loadDemo(button) {
  if (button?.disabled) return;

  try {
    button.disabled = true;
    button.textContent = "Loading demo profile...";
    setStatus("Preparing 12-month Young Professional demo profile...");
    const result = await loadYoungProfessionalDemoProfile();
    setStatus(`Demo Profile Loaded: ${result.summary?.months || 12} months, ${result.summary?.expenses || 0} expenses, ${result.summary?.walletTransactions || 0} wallet transactions, and ${result.summary?.budgets || 0} budgets are ready. Forecast and Dashboard can now read the sample history. Your real records were not touched.`);
  } catch (error) {
    console.warn("CLARA demo profile setup failed:", error);
    setStatus("CLARA could not load the 1-Year Demo Profile yet. Please try again.");
  } finally {
    button.disabled = false;
    button.textContent = isYoungProfessionalDemoProfileActive()
      ? "Reset Demo Profile"
      : "Load 1-Year Demo Profile";
  }
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${PAGE_ID} { min-height: 100%; }
    .clara-current-state-back { display: inline-flex; align-items: center; gap: 0.5rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); padding: 0.5rem 0.75rem; font-size: 11px; font-weight: 850; color: rgba(255,255,255,0.70); }
    .clara-current-state-back svg { height: 1rem; width: 1rem; }
    .clara-current-state-card, .clara-current-state-instruction { border: 1px solid rgba(165, 243, 252, 0.14); background: radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.085), transparent 38%), radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.065), transparent 42%), rgba(255, 255, 255, 0.04); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.058), 0 12px 30px rgba(0, 0, 0, 0.13), 0 0 20px rgba(34, 211, 238, 0.025); }
    .clara-current-state-instruction { position: relative; overflow: hidden; border-radius: 26px; border-color: rgba(52, 211, 153, 0.28); background: radial-gradient(circle at 0% 0%, rgba(52, 211, 153, 0.18), transparent 42%), radial-gradient(circle at 100% 0%, rgba(34, 211, 238, 0.12), transparent 45%), linear-gradient(135deg, rgba(6, 78, 59, 0.26), rgba(15, 23, 42, 0.44)); padding: 1.15rem 1.1rem; }
    .clara-current-state-kicker { display: inline-flex; margin-bottom: 0.6rem; border-radius: 999px; border: 1px solid rgba(52, 211, 153, 0.25); background: rgba(16, 185, 129, 0.12); padding: 0.32rem 0.7rem; color: rgba(209, 250, 229, 0.9); font-size: 0.62rem; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; }
    .clara-current-state-instruction h2 { margin: 0; font-size: 1rem; line-height: 1.25; font-weight: 950; letter-spacing: -0.025em; color: rgba(255,255,255,0.96); }
    .clara-current-state-instruction p { margin-top: 0.55rem; max-width: 34ch; color: rgba(209, 250, 229, 0.68); font-size: 0.8rem; font-weight: 750; line-height: 1.55; }
    .clara-current-state-card { width: 100%; border-radius: 24px; padding: 1rem; text-align: left; cursor: default; }
    .clara-current-state-card h3 { margin: 0; color: rgba(255,255,255,0.94); font-size: 0.95rem; font-weight: 950; letter-spacing: -0.015em; }
    .clara-current-state-card p { margin-top: 0.45rem; color: rgba(236,253,255,0.50); font-size: 0.74rem; font-weight: 650; line-height: 1.55; }
    .clara-current-state-card small { display: inline-flex; margin-top: 0.7rem; border-radius: 999px; border: 1px solid rgba(165,243,252,0.14); background: rgba(255,255,255,0.06); padding: 0.32rem 0.68rem; color: rgba(207,250,254,0.66); font-size: 0.64rem; font-weight: 900; }
    .clara-current-state-card button { margin-top: 0.85rem; width: 100%; border-radius: 18px; border: 1px solid rgba(45, 212, 191, 0.24); background: linear-gradient(135deg, rgba(45, 212, 191, 0.20), rgba(16, 185, 129, 0.15)); padding: 0.78rem 1rem; color: rgba(236, 253, 245, 0.96); font-size: 0.78rem; font-weight: 950; transition: 160ms ease; }
    .clara-current-state-card button:disabled { opacity: 0.68; cursor: default; }
    #${STATUS_ID} { border-radius: 22px; border: 1px solid rgba(165,243,252,0.14); background: rgba(255,255,255,0.055); padding: 0.9rem 1rem; color: rgba(236,253,255,0.68); font-size: 0.75rem; font-weight: 800; line-height: 1.5; }
  `;
  document.head.appendChild(style);
}

function showPage(show) {
  const root = findSettingsRoot();
  const page = document.getElementById(PAGE_ID);
  if (!root || !page) return;

  root.style.display = show ? "none" : "";
  page.style.display = show ? "block" : "none";
  if (show) page.scrollIntoView({ behavior: "auto", block: "start" });
}

function createPage() {
  const page = document.createElement("div");
  page.id = PAGE_ID;
  page.className = "space-y-4 pb-6";
  page.style.display = "none";
  page.innerHTML = `<button type="button" class="clara-current-state-back">${backSvg()} Settings</button><div class="clara-current-state-instruction"><span class="clara-current-state-kicker">Explore CLARA</span><h2>Try sample data</h2><p>Explore CLARA using realistic financial data and guided examples before using your own records.</p></div><div id="${STATUS_ID}">Sample data is for learning only. Your real financial records stay separate and protected.</div><div class="clara-current-state-card"><h3>Sample Data</h3><p>Explore CLARA using realistic 12-month financial history before using your own records.</p><p>This creates demo income, expenses, budgets, savings, emergency fund activity, wallets, and transactions for learning only.</p><small>Learning Mode</small><button type="button" data-clara-load-demo-profile="true">Load 1-Year Demo Profile</button></div>`;
  page.querySelector(".clara-current-state-back")?.addEventListener("click", () => showPage(false));
  page.querySelector("[data-clara-load-demo-profile]")?.addEventListener("click", (event) =>
    loadDemo(event.currentTarget)
  );
  return page;
}

function ensurePage() {
  const settingsRoot = findSettingsRoot();
  if (!settingsRoot) return false;

  if (!document.getElementById(PAGE_ID)) {
    settingsRoot.insertAdjacentElement("afterend", createPage());
  }

  return true;
}

function openDemoProfilePage() {
  install();
  if (ensurePage()) showPage(true);
}

function isAccountLabel(target) {
  const label = target?.closest?.("p");
  if (!label || (label.textContent || "").trim().toLowerCase() !== "account") return false;

  const settingsRoot = findSettingsRoot();
  if (!settingsRoot || !settingsRoot.contains(label)) return false;

  const section = label.closest("section");
  return Boolean(
    section &&
      settingsRoot.contains(section) &&
      section.textContent?.includes("Profile information") &&
      section.textContent?.includes("Security & privacy")
  );
}

function handleAccountLabelShortcut(event) {
  if (!isAccountLabel(event.target)) return;

  const now = Date.now();
  const isSecondTap = now - lastAccountTapAt <= ACCOUNT_TAP_WINDOW_MS;
  lastAccountTapAt = isSecondTap ? 0 : now;

  if (isSecondTap) window.dispatchEvent(new Event(OPEN_DEMO_PROFILE_EVENT));
}

function install() {
  if (typeof document === "undefined") return;
  installStyles();
  ensurePage();
}

function scheduleInstall() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(install);
}

if (typeof window !== "undefined") {
  window.addEventListener(OPEN_DEMO_PROFILE_EVENT, openDemoProfilePage);
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, scheduleInstall);
  window.addEventListener("pageshow", scheduleInstall);
  document.addEventListener("click", handleAccountLabelShortcut, true);

  scheduleInstall();
}
