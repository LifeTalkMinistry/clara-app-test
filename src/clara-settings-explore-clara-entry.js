const EXPLORE_ENTRY_ID = "clara-settings-explore-clara-entry";
const EXPLORE_PAGE_ID = "clara-settings-explore-clara-page";
const STYLE_ID = "clara-explore-clara-styles";

function iconSvg(type = "spark") {
  const paths =
    type === "back"
      ? ["M19 12H5", "m12 19-7-7 7-7"]
      : type === "chevron"
        ? ["m9 18 6-6-6-6"]
        : [
            "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
            "M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z",
          ];

  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths
    .map((path) => `<path d="${path}"/>`)
    .join("")}</svg>`;
}

function findSettingsList() {
  const settingsRoot = document.querySelector("#root .space-y-5.pb-6");
  if (!settingsRoot) return null;
  const programSection = Array.from(settingsRoot.querySelectorAll("section")).find(
    (section) => section.textContent?.includes("Program") && section.textContent?.includes("About CLARA")
  );
  return { settingsRoot, programSection };
}

function showExploreList(show) {
  const { settingsRoot } = findSettingsList() || {};
  const page = document.getElementById(EXPLORE_PAGE_ID);
  if (!settingsRoot || !page) return;
  settingsRoot.style.display = show ? "none" : "";
  page.style.display = show ? "block" : "none";
  if (show) page.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createFeaturePage() {
  const page = document.createElement("div");
  page.id = EXPLORE_PAGE_ID;
  page.className = "clara-explore-page space-y-4 pb-6";
  page.style.display = "none";
  page.innerHTML = `
    <button type="button" class="clara-explore-back">${iconSvg("back")} Settings</button>
    <div class="clara-explore-hero">
      <p class="clara-explore-kicker">Learning</p>
      <h2>Explore CLARA</h2>
      <p>This area is a static learning preview. It does not load, delete, or write financial records.</p>
    </div>
    <div class="clara-explore-feature-list">
      <div class="clara-explore-feature-card"><div class="clara-explore-feature-icon">${iconSvg()}</div><div class="clara-explore-feature-content"><p>Young Professional</p><span>Stable salary, independence pressure, side-hustle possibility, savings discipline, and PH money seasons.</span><small>Static preview</small></div></div>
      <div class="clara-explore-feature-card"><div class="clara-explore-feature-icon">${iconSvg()}</div><div class="clara-explore-feature-content"><p>Guided App Tour</p><span>Walk through Dashboard, Wallets, Budget, Savings, Emergency Fund, Transactions, and CLARA chat.</span><small>Soon</small></div></div>
      <div class="clara-explore-feature-card"><div class="clara-explore-feature-icon">${iconSvg()}</div><div class="clara-explore-feature-content"><p>Mini Lessons</p><span>Short learning cards about budgeting, planned spending, emergency funds, and better money decisions.</span><small>Soon</small></div></div>
    </div>
    <div class="clara-explore-note">Learning previews are display-only until the clean guided learning system is rebuilt.</div>
  `;
  page.querySelector(".clara-explore-back")?.addEventListener("click", () => showExploreList(false));
  return page;
}

function createExploreSection() {
  const section = document.createElement("section");
  section.id = EXPLORE_ENTRY_ID;
  section.className = "space-y-2 clara-explore-section";
  section.innerHTML = `
    <p class="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Learning</p>
    <div class="space-y-2.5">
      <button type="button" class="group clara-explore-entry">
        <div class="clara-explore-entry-icon">${iconSvg()}</div>
        <div class="clara-explore-entry-text"><p>Explore CLARA</p><span>Static learning previews only</span></div>
        <span class="clara-explore-entry-badge">Open</span>
        ${iconSvg("chevron")}
      </button>
    </div>
  `;
  section.querySelector("button")?.addEventListener("click", () => showExploreList(true));
  return section;
}

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${EXPLORE_ENTRY_ID} > p { color: rgba(207,250,254,.38)!important; letter-spacing:.21em!important; }
    .clara-explore-entry,.clara-explore-hero,.clara-explore-note,.clara-explore-feature-card{border:1px solid rgba(165,243,252,.14);background:radial-gradient(circle at 0% 0%,rgba(34,211,238,.085),transparent 38%),radial-gradient(circle at 100% 100%,rgba(124,58,237,.065),transparent 42%),rgba(255,255,255,.04);border-radius:24px;padding:1rem;}
    .clara-explore-entry,.clara-explore-feature-card{display:flex;align-items:center;gap:.75rem;width:100%;text-align:left;}
    .clara-explore-entry-icon,.clara-explore-feature-icon{display:flex;height:2.75rem;width:2.75rem;flex-shrink:0;align-items:center;justify-content:center;border-radius:1rem;border:1px solid rgba(165,243,252,.16);background:rgba(255,255,255,.075);color:rgba(236,253,255,.72);}
    .clara-explore-entry svg,.clara-explore-feature-card svg,.clara-explore-back svg{height:1.15rem;width:1.15rem;}
    .clara-explore-entry-text,.clara-explore-feature-content{min-width:0;flex:1;}
    .clara-explore-entry-text p,.clara-explore-feature-content p{color:rgba(255,255,255,.92);font-size:.875rem;font-weight:850;}
    .clara-explore-entry-text span,.clara-explore-feature-content span,.clara-explore-note,.clara-explore-hero p:last-child{display:block;margin-top:.25rem;color:rgba(236,253,255,.52);font-size:.75rem;line-height:1.45;}
    .clara-explore-entry-badge,.clara-explore-feature-content small{border-radius:999px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);padding:.25rem .62rem;font-size:10px;font-weight:850;color:rgba(255,255,255,.58);}
    .clara-explore-page{min-height:100%;}.clara-explore-back{display:inline-flex;align-items:center;gap:.5rem;border-radius:999px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);padding:.5rem .75rem;font-size:11px;font-weight:850;color:rgba(255,255,255,.70);}.clara-explore-hero h2{margin-top:.35rem;color:white;font-size:1.15rem;font-weight:950}.clara-explore-kicker{color:rgba(125,211,252,.72);font-size:.62rem;font-weight:950;letter-spacing:.18em;text-transform:uppercase}.clara-explore-feature-list{display:grid;gap:.7rem;}
  `;
  document.head.appendChild(style);
}

function installExploreClaraEntry() {
  const match = findSettingsList();
  if (!match?.programSection) return;
  if (!document.getElementById(EXPLORE_ENTRY_ID)) match.programSection.insertAdjacentElement("afterend", createExploreSection());
  if (!document.getElementById(EXPLORE_PAGE_ID)) match.settingsRoot.insertAdjacentElement("afterend", createFeaturePage());
}

function install() {
  installStyles();
  installExploreClaraEntry();
}

if (typeof window !== "undefined") {
  install();
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
