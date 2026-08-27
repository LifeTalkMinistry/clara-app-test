import "../community-top-nav-tools.css";

const TOP_NAV_SELECTOR = ".clara-community-shell-nav";
const PROFILE_SELECTOR = 'a[aria-label="Open Community profile"]';
const SETTINGS_SELECTOR = 'a[aria-label="Open Settings"]';
const PINNED_PROFILE_CLASS = "clara-community-profile-pinned";
const TOP_NAV_TOOL_ATTR = "data-clara-topnav-tool";

let pendingHomeTool = null;
let lastAutoScrollView = "";

const TOOL_ICONS = {
  learning: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  coaching: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" stroke-linecap="round"/>
      <path d="M4 13a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Zm16 0a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z" stroke="currentColor" stroke-linejoin="round"/>
      <path d="M17 18.5c-.8 1-2.2 1.5-4 1.5h-1" stroke="currentColor" stroke-linecap="round"/>
    </svg>`,
};

function isCommunityHome() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("/community?view=home");
}

function isCommunityRoute() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("/community");
}

function navigateHash(path) {
  if (typeof window === "undefined") return;
  const nextHash = `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === nextHash) return;
  window.location.hash = nextHash;
}

function findHomeLearningButton() {
  if (typeof document === "undefined") return null;
  return document.querySelector(
    '.clara-community-home-learning-hub [data-clara-learning-hub-bridge="true"] button[data-clara-learning-hub-toggle="true"]',
  );
}

function activateHomeLearning() {
  const target = findHomeLearningButton();
  if (isCommunityHome() && target) {
    pendingHomeTool = null;
    target.click();
    return;
  }

  pendingHomeTool = "learning";
  navigateHash("/community?view=home");
}

function createTopNavTool(tool) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "clara-community-nav-item clara-community-topnav-tool";
  button.setAttribute(TOP_NAV_TOOL_ATTR, tool);

  if (tool === "learning") {
    button.title = "Learning Hub";
    button.setAttribute("aria-label", "Open Learning Hub");
    button.setAttribute("data-clara-learning-hub-toggle", "true");
    button.innerHTML = TOOL_ICONS.learning;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateHomeLearning();
    });
    return button;
  }

  button.title = "Schedule Session";
  button.setAttribute("aria-label", "Schedule CLARA Session");
  button.innerHTML = `${TOOL_ICONS.coaching}<span class="clara-community-topnav-30m">30m</span>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigateHash("/welcome-session");
  });
  return button;
}

function ensureTopNavTools(nav) {
  if (!nav) return;
  const originalProfile = nav.querySelector(PROFILE_SELECTOR);
  if (!originalProfile) return;

  let learningButton = nav.querySelector(`[${TOP_NAV_TOOL_ATTR}="learning"]`);
  if (!learningButton) {
    learningButton = createTopNavTool("learning");
    nav.insertBefore(learningButton, originalProfile);
  }

  let coachingButton = nav.querySelector(`[${TOP_NAV_TOOL_ATTR}="coaching"]`);
  if (!coachingButton) coachingButton = createTopNavTool("coaching");

  // Schedule Session is a primary money-management destination. Keep it in the
  // first nav group immediately after Calendar and immediately before Settings:
  // ORB -> Home -> Calendar -> Schedule Session -> Settings.
  const settingsButton = nav.querySelector(SETTINGS_SELECTOR);
  const coachingAnchor = settingsButton || originalProfile;
  if (coachingButton.nextElementSibling !== coachingAnchor) {
    nav.insertBefore(coachingButton, coachingAnchor);
  }

  nav.querySelectorAll(`[${TOP_NAV_TOOL_ATTR}="guide"]`).forEach((node) => node.remove());

  if (!nav.dataset.claraHorizontalWheelBound) {
    nav.dataset.claraHorizontalWheelBound = "true";
    nav.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        if (nav.scrollWidth <= nav.clientWidth + 2) return;
        nav.scrollLeft += event.deltaY;
        event.preventDefault();
      },
      { passive: false },
    );
  }
}

function syncPinnedProfile(nav) {
  if (!nav) return;
  const header = nav.closest(".clara-community-shell-header");
  const original = nav.querySelector(PROFILE_SELECTOR);
  if (!header || !original) return;

  let pinned = header.querySelector(`.${PINNED_PROFILE_CLASS}`);
  if (!pinned) {
    pinned = original.cloneNode(true);
    pinned.classList.add(PINNED_PROFILE_CLASS);
    pinned.setAttribute("data-clara-pinned-profile", "true");
    header.appendChild(pinned);
  }

  const desiredClass = `${original.className} ${PINNED_PROFILE_CLASS}`.trim();
  if (pinned.className !== desiredClass) pinned.className = desiredClass;

  const desiredHref = original.getAttribute("href") || "#/community?view=profile";
  if (pinned.getAttribute("href") !== desiredHref) pinned.setAttribute("href", desiredHref);

  const desiredTitle = original.getAttribute("title") || "ME";
  if (pinned.getAttribute("title") !== desiredTitle) pinned.setAttribute("title", desiredTitle);

  if (pinned.getAttribute("aria-label") !== "Open Community profile") {
    pinned.setAttribute("aria-label", "Open Community profile");
  }

  if (pinned.innerHTML !== original.innerHTML) pinned.innerHTML = original.innerHTML;

  const active = original.getAttribute("aria-current");
  if (active) pinned.setAttribute("aria-current", active);
  else pinned.removeAttribute("aria-current");
}

function autoScrollActiveNav(nav) {
  if (!nav) return;
  const root = nav.closest(".clara-community-root");
  const activeView = root?.getAttribute?.("data-community-view") || "";
  if (!activeView || activeView === lastAutoScrollView) return;
  lastAutoScrollView = activeView;

  if (activeView === "profile") return;
  const active = nav.querySelector('[aria-current="page"]:not([aria-label="Open Community profile"])');
  if (!active) return;

  window.requestAnimationFrame(() => {
    const left = active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2;
    nav.scrollTo?.({ left: Math.max(0, left), behavior: "smooth" });
  });
}

function syncPendingHomeTool() {
  if (pendingHomeTool !== "learning" || !isCommunityHome()) return;
  const target = findHomeLearningButton();
  if (!target) return;

  pendingHomeTool = null;
  window.setTimeout(() => {
    findHomeLearningButton()?.click?.();
  }, 40);
}

function syncTopNavTools() {
  if (typeof document === "undefined" || !isCommunityRoute()) return;

  const nav = document.querySelector(TOP_NAV_SELECTOR);
  if (!nav) return;

  ensureTopNavTools(nav);
  syncPinnedProfile(nav);
  autoScrollActiveNav(nav);
  syncPendingHomeTool();
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_COMMUNITY_NAVIGATION_BRIDGE__) return;
  window.__CLARA_COMMUNITY_NAVIGATION_BRIDGE__ = true;

  let syncQueued = false;
  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(() => {
      syncQueued = false;
      syncTopNavTools();
    });
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-current", "data-community-view"],
  });

  window.addEventListener("hashchange", queueSync);
  window.addEventListener("resize", queueSync);
  window.setInterval(queueSync, 320);
  queueSync();
}

install();
