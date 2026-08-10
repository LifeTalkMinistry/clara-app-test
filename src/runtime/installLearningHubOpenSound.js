import learningHubSoundUrl from "../../learning-hub.mp3.wav";
import { triggerClaraHaptic } from "@/lib/claraHaptics";

const CLARA_SOUND_STORAGE_KEY = "clara:sound-enabled";
const CLARA_SOUND_VOLUME_KEY = "clara:sound-volume";
const LEARNING_HUB_TOGGLE_SELECTOR = [
  'button[data-clara-learning-hub-toggle="true"]',
  "button[data-clara-pressure-signal]",
  'button[aria-label="Open CLARA Guide Mode"]',
  'button[data-clara-guided-onboarding-button="true"]',
  "button.clara-guide-next-button",
  "button.clara-guide-carousel-next-button",
  "button.clara-guide-orb-next",
  "button.clara-guide-orb-feature-next",
  "button.clara-guide-learning-hub-next",
  'button[data-clara-guide-action="next"]',
  'button[data-clara-guide-orb-preview-next="true"]',
  'button[data-clara-guide-orb-ui-next="true"]',
  'button[data-clara-guide-learning-hub-next="true"]',
].join(", ");
const LEARNING_TOPNAV_SELECTOR = '[data-clara-topnav-tool="learning"]';
const COMMUNITY_ROOT_SELECTOR = ".clara-community-root";
const HOME_LINK_SELECTOR = '.clara-community-shell-nav a[aria-label="Open Home"]';
const NOTIFICATIONS_LINK_SELECTOR = '.clara-community-shell-nav a[aria-label="Community notifications"]';
const LEARNING_HUB_HOME_SELECTOR = ".clara-community-home-learning-hub";
const LEARNING_PAGE_HERO_CLASS = "clara-community-learning-page-hero";
const LEARNING_PAGE_STYLE_ID = "clara-community-learning-dedicated-page";
const LEADING_SILENCE_SECONDS = 0.04;

let installed = false;
let learningHubAudio = null;
let learningPageObserver = null;
let learningPageSyncFrame = null;
let learningPageOpenAttempted = false;
let lastLearningHubElement = null;

function isSoundEnabled() {
  try {
    return window.localStorage?.getItem(CLARA_SOUND_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getSoundVolume() {
  try {
    const raw = window.localStorage?.getItem(CLARA_SOUND_VOLUME_KEY);
    if (raw === null || raw === undefined || raw === "") return 1;

    const saved = Number(raw);
    if (Number.isFinite(saved)) return Math.max(0, Math.min(saved, 1));
  } catch {}

  return 1;
}

function getLearningHubAudio() {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  if (!learningHubAudio) {
    learningHubAudio = new window.Audio();
    learningHubAudio.preload = "auto";
    learningHubAudio.src = learningHubSoundUrl;
    learningHubAudio.muted = false;
    learningHubAudio.volume = getSoundVolume();
  }

  return learningHubAudio;
}

function findToggleButton(target) {
  return target?.closest?.(LEARNING_HUB_TOGGLE_SELECTOR) || null;
}

function markAsCustomSound(button) {
  button?.setAttribute?.("data-clara-no-sound", "true");
}

export function playLearningHubToggleSound(button) {
  if (!button) return;

  markAsCustomSound(button);
  triggerClaraHaptic("light");
  if (!isSoundEnabled()) return;

  // Create and load the sound only after a real user interaction.
  // This removes audio setup and network work from dashboard startup.
  const audio = getLearningHubAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = LEADING_SILENCE_SECONDS;
    audio.muted = false;
    audio.volume = getSoundVolume();

    const playback = audio.play();
    if (playback?.catch) {
      playback.catch((error) => {
        console.warn("Learning Hub toggle sound failed:", error?.message || error);
      });
    }
  } catch (error) {
    console.warn("Learning Hub toggle sound failed:", error?.message || error);
  }
}

function isDedicatedLearningPage() {
  if (typeof window === "undefined") return false;

  const rawHash = String(window.location.hash || "").replace(/^#/, "");
  const [pathname, query = ""] = rawHash.split("?");
  if (pathname !== "/community") return false;

  const params = new URLSearchParams(query);
  return params.get("view") === "home" && params.get("learning") === "hub";
}

function navigateToDedicatedLearningPage() {
  if (typeof window === "undefined") return;
  const nextHash = "#/community?view=home&learning=hub";
  if (window.location.hash !== nextHash) window.location.hash = nextHash;
  else queueLearningPageSync();
}

function installLearningPageStyles() {
  if (typeof document === "undefined" || document.getElementById(LEARNING_PAGE_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = LEARNING_PAGE_STYLE_ID;
  style.textContent = `
    /* Home owns the daily habit + financial snapshot only. Learning now has its own destination. */
    .clara-community-root[data-community-view="home"]:not([data-clara-learning-page="true"]):not([data-clara-learning-guide-visible="true"])
      .clara-community-home-learning-hub {
      display: none !important;
    }

    /* Learning is a first-class top-nav destination, placed before Notifications. */
    .clara-community-root .clara-community-shell-nav > [data-clara-topnav-tool="learning"] {
      order: 0 !important;
      margin-left: 0 !important;
    }

    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-shell-nav > [data-clara-topnav-tool="learning"]::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -13px;
      width: 30px;
      height: 4px;
      transform: translateX(-50%);
      border-radius: 999px;
      background: linear-gradient(90deg,#0867ff 0%,#19b5ff 27%,#ffd84a 50%,#f32645 76%,#cf2340 100%);
      box-shadow: 0 0 9px rgba(8,103,255,.30),0 0 7px rgba(255,216,74,.18),0 0 8px rgba(243,38,69,.20);
      pointer-events: none;
    }

    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-shell-nav > [data-clara-topnav-tool="learning"] {
      border-color: rgba(142,199,255,.50) !important;
      background: rgba(3,15,34,.70) !important;
      color: #fff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10),0 0 0 1px rgba(8,103,255,.10),0 0 20px rgba(8,103,255,.20) !important;
    }

    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-shell-nav a[aria-label="Open Home"] > span[class*="-bottom"] {
      display: none !important;
    }

    .clara-community-root[data-clara-learning-page="true"] .clara-community-home-view {
      padding-top: 0 !important;
      background:
        radial-gradient(circle at 4% 0%, rgba(8,103,255,.17), transparent 30%),
        radial-gradient(circle at 100% 8%, rgba(243,38,69,.08), transparent 28%),
        linear-gradient(180deg,#040b18 0%,#06101f 55%,#050b18 100%) !important;
    }

    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-home-view > div > [data-clara-community-guide="daily-tip"],
    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-home-legacy-selector-shield,
    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-home-financial-carousel,
    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-home-money-left {
      display: none !important;
    }

    .clara-community-root[data-clara-learning-page="true"] .clara-community-home-learning-hub {
      display: block !important;
      position: relative !important;
      z-index: 2 !important;
      padding: 2px 12px 34px !important;
      overflow: visible !important;
    }

    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-home-learning-hub [data-clara-guide-learning-hub-section="true"] > div {
      gap: 12px !important;
    }

    .clara-community-root[data-clara-learning-page="true"]
      .clara-community-home-learning-hub [data-clara-learning-hub-bridge="true"] {
      margin-top: 2px !important;
    }

    .${LEARNING_PAGE_HERO_CLASS} {
      position: relative;
      overflow: hidden;
      margin: 16px 12px 12px;
      padding: 22px 20px 20px;
      border: 1px solid rgba(76,139,218,.24);
      border-radius: 28px;
      background:
        radial-gradient(circle at 0% 0%, rgba(25,181,255,.18), transparent 39%),
        radial-gradient(circle at 100% 20%, rgba(243,38,69,.09), transparent 38%),
        linear-gradient(132deg,rgba(7,28,57,.99),rgba(5,18,41,.995) 58%,rgba(12,14,36,.995));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.055),0 18px 44px rgba(0,0,0,.22),0 0 30px rgba(8,103,255,.04);
    }

    .${LEARNING_PAGE_HERO_CLASS}::after {
      content: "";
      position: absolute;
      left: 20px;
      right: 20px;
      bottom: 0;
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg,#0867ff 0 43%,#ffd84a 43% 58%,#f32645 58% 100%);
      opacity: .84;
    }

    .${LEARNING_PAGE_HERO_CLASS} .clara-learning-page-eyebrow {
      color: rgba(255,216,74,.82);
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .22em;
      text-transform: uppercase;
    }

    .${LEARNING_PAGE_HERO_CLASS} h1 {
      margin: 7px 0 0;
      color: #f8fbff;
      font-size: clamp(28px,8vw,36px);
      font-weight: 950;
      line-height: 1;
      letter-spacing: -.045em;
    }

    .${LEARNING_PAGE_HERO_CLASS} .clara-learning-page-copy {
      max-width: 34ch;
      margin: 10px 0 0;
      color: rgba(211,226,246,.62);
      font-size: 13px;
      font-weight: 650;
      line-height: 1.55;
    }

    .${LEARNING_PAGE_HERO_CLASS} .clara-learning-page-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 16px;
    }

    .${LEARNING_PAGE_HERO_CLASS} .clara-learning-page-pills span {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border: 1px solid rgba(89,151,239,.18);
      border-radius: 999px;
      background: rgba(8,103,255,.07);
      color: rgba(218,234,255,.70);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .02em;
    }

    @media (min-width: 640px) {
      .${LEARNING_PAGE_HERO_CLASS} {
        margin-left: 20px;
        margin-right: 20px;
        padding: 28px 26px 24px;
      }

      .clara-community-root[data-clara-learning-page="true"] .clara-community-home-learning-hub {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function guideTourIsOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(document.getElementById("clara-community-guide-title"));
}

function ensureLearningPageHero(hub) {
  if (!(hub instanceof HTMLElement)) return;
  const parent = hub.parentElement;
  if (!parent) return;

  let hero = parent.querySelector(`:scope > .${LEARNING_PAGE_HERO_CLASS}`);
  if (!hero) {
    hero = document.createElement("section");
    hero.className = LEARNING_PAGE_HERO_CLASS;
    hero.setAttribute("aria-label", "Learning Hub introduction");
    hero.innerHTML = `
      <p class="clara-learning-page-eyebrow">LEARN WITH CLARA</p>
      <h1>Learning Hub</h1>
      <p class="clara-learning-page-copy">Build the knowledge behind better money decisions.</p>
      <div class="clara-learning-page-pills" aria-label="Learning Hub benefits">
        <span>Practical money lessons</span>
        <span>Learn at your pace</span>
      </div>
    `;
    parent.insertBefore(hero, hub);
  }
}

function removeLearningPageHero(root) {
  root?.querySelectorAll?.(`.${LEARNING_PAGE_HERO_CLASS}`)?.forEach?.((hero) => hero.remove());
}

function positionLearningTopNavTool(root) {
  const nav = root?.querySelector?.(".clara-community-shell-nav");
  const learningTool = nav?.querySelector?.(LEARNING_TOPNAV_SELECTOR);
  const notificationsLink = nav?.querySelector?.(NOTIFICATIONS_LINK_SELECTOR);
  if (!nav || !learningTool || !notificationsLink) return;

  if (learningTool.nextElementSibling !== notificationsLink) {
    nav.insertBefore(learningTool, notificationsLink);
  }
}

function syncLearningNavState(root, dedicated) {
  const learningTool = root?.querySelector?.(LEARNING_TOPNAV_SELECTOR);
  const homeLink = root?.querySelector?.(HOME_LINK_SELECTOR);

  if (learningTool) {
    if (dedicated) learningTool.setAttribute("aria-current", "page");
    else learningTool.removeAttribute("aria-current");
  }

  if (homeLink) {
    if (dedicated) {
      if (homeLink.getAttribute("aria-current") === "page") {
        homeLink.dataset.claraLearningSuppressedCurrent = "true";
        homeLink.removeAttribute("aria-current");
      }
    } else if (
      homeLink.dataset.claraLearningSuppressedCurrent === "true" &&
      root?.getAttribute?.("data-community-view") === "home"
    ) {
      homeLink.setAttribute("aria-current", "page");
      delete homeLink.dataset.claraLearningSuppressedCurrent;
    }
  }
}

function requestHubExpansion(hub) {
  if (!(hub instanceof HTMLElement)) return;

  if (hub !== lastLearningHubElement) {
    lastLearningHubElement = hub;
    learningPageOpenAttempted = false;
  }

  if (hub.querySelector('[data-learning-hub-expanded="true"]')) return;
  if (hub.querySelector('[data-clara-learning-hub-opening="true"]')) return;
  if (learningPageOpenAttempted) return;

  const toggle = hub.querySelector('button[data-clara-learning-hub-toggle="true"]');
  if (!(toggle instanceof HTMLElement)) return;

  learningPageOpenAttempted = true;
  window.setTimeout(() => {
    if (!isDedicatedLearningPage()) return;
    toggle.click();
  }, 60);
}

function syncLearningPage() {
  if (typeof document === "undefined") return;

  const root = document.querySelector(COMMUNITY_ROOT_SELECTOR);
  if (!(root instanceof HTMLElement)) return;

  const dedicated = isDedicatedLearningPage();
  const guideVisible = !dedicated && guideTourIsOpen();
  const hub = root.querySelector(LEARNING_HUB_HOME_SELECTOR);

  positionLearningTopNavTool(root);
  syncLearningNavState(root, dedicated);

  if (guideVisible) root.dataset.claraLearningGuideVisible = "true";
  else delete root.dataset.claraLearningGuideVisible;

  if (!dedicated) {
    delete root.dataset.claraLearningPage;
    removeLearningPageHero(root);
    learningPageOpenAttempted = false;
    lastLearningHubElement = null;
    return;
  }

  root.dataset.claraLearningPage = "true";
  if (hub instanceof HTMLElement) {
    ensureLearningPageHero(hub);
    requestHubExpansion(hub);
  }
}

function queueLearningPageSync() {
  if (typeof window === "undefined") return;
  if (learningPageSyncFrame) return;

  learningPageSyncFrame = window.requestAnimationFrame(() => {
    learningPageSyncFrame = null;
    syncLearningPage();
  });
}

function installDedicatedLearningPageRuntime() {
  installLearningPageStyles();

  if (typeof window === "undefined" || typeof document === "undefined") return;

  const handleLearningTopNavClick = (event) => {
    const learningTool = event.target?.closest?.(LEARNING_TOPNAV_SELECTOR);
    if (!learningTool || !document.contains(learningTool)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    navigateToDedicatedLearningPage();
  };

  document.addEventListener("click", handleLearningTopNavClick, true);
  window.addEventListener("hashchange", queueLearningPageSync);

  learningPageObserver = new MutationObserver(queueLearningPageSync);
  learningPageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-community-view", "aria-current"],
  });

  window.setInterval(queueLearningPageSync, 320);
  queueLearningPageSync();
}

export function installLearningHubOpenSound() {
  if (installed || typeof document === "undefined") return () => {};
  installed = true;

  installDedicatedLearningPageRuntime();

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;

    const button = findToggleButton(event.target);
    if (!button) return;

    playLearningHubToggleSound(button);
  };

  const handleClick = (event) => {
    const button = findToggleButton(event.target);
    if (!button) return;

    markAsCustomSound(button);
  };

  const handleKeyDown = (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;

    const button = findToggleButton(event.target);
    if (!button) return;

    playLearningHubToggleSound(button);
  };

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    learningPageObserver?.disconnect?.();
    learningPageObserver = null;
    if (learningPageSyncFrame && typeof window !== "undefined") {
      window.cancelAnimationFrame(learningPageSyncFrame);
      learningPageSyncFrame = null;
    }
    installed = false;
  };
}