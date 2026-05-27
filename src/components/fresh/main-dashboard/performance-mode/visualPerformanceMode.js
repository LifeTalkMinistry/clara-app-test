const CLARA_VISUAL_PERFORMANCE_STYLE_ID = "clara-visual-performance-mode-style";
const CLARA_STANDARD_VISUAL_PERFORMANCE_ENABLED = true;
const dashboardRuntimePerformanceMode = new Map();

const dispatchClaraVisualPerformanceEvent = (eventName, detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const getVisualPerformanceStorageKey = (userId) =>
  `clara_visual_performance_${userId || "guest"}`;

export const ensureClaraVisualPerformanceStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLARA_VISUAL_PERFORMANCE_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = CLARA_VISUAL_PERFORMANCE_STYLE_ID;
  style.textContent = `
    .clara-premium-mode { --clara-motion-duration: 220ms; --clara-glow-strength: 1; --clara-blur-strength: 1; }
    .clara-performance-mode { --clara-motion-duration: 0ms; --clara-glow-strength: 0; --clara-blur-strength: 0; }
    .clara-performance-mode *, .clara-performance-mode *::before, .clara-performance-mode *::after { animation: none !important; transition: none !important; transition-duration: 0ms !important; scroll-behavior: auto !important; text-shadow: none !important; }
    .clara-performance-mode .theme-shell-card, .clara-performance-mode .theme-panel-card, .clara-performance-mode .theme-soft-card, .clara-performance-mode .theme-modal-card, .clara-performance-mode .clara-card, .clara-performance-mode .clara-card-soft, .clara-performance-mode [class*="backdrop-blur"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .clara-performance-mode [class*="shadow-"], .clara-performance-mode [style*="box-shadow"] { box-shadow: none !important; }
    .clara-performance-mode [class*="blur-"], .clara-performance-mode [style*="filter"] { filter: none !important; }
    .clara-performance-mode [class*="before:blur"]::before, .clara-performance-mode [class*="after:blur"]::after, .clara-performance-mode [class*="before:bg-white"]::before, .clara-performance-mode [class*="after:bg-white"]::after { opacity: 0 !important; filter: none !important; }
    .clara-performance-mode [class*="animate-"], .clara-performance-mode [style*="animation"] { animation: none !important; animation-duration: 0ms !important; animation-iteration-count: 1 !important; }
    .clara-performance-mode [class*="hover:-translate"], .clara-performance-mode [class*="hover:scale"], .clara-performance-mode [class*="active:scale"], .clara-performance-mode [class*="group-hover:-translate"], .clara-performance-mode [class*="group-active:scale"] { transform: none !important; }
    .clara-performance-mode video, .clara-performance-mode img { filter: none !important; }
    .clara-performance-mode .theme-page-shell, .clara-performance-mode .theme-panel-card, .clara-performance-mode .theme-shell-card, .clara-performance-mode .theme-soft-card, .clara-performance-mode .theme-modal-card { isolation: auto !important; }

    .clara-performance-mode .clara-preserve-flip-motion {
      transition-property: transform, opacity !important;
      transition-duration: var(--clara-flip-duration, 700ms) !important;
      transition-timing-function: var(--clara-flip-easing, cubic-bezier(0.22, 1, 0.36, 1)) !important;
      transform-style: preserve-3d !important;
      will-change: transform !important;
    }

    .clara-performance-mode .clara-learning-motion,
    .clara-performance-mode .clara-learning-motion * {
      transition-property: transform, opacity, width, grid-template-rows, margin, background-color, border-color !important;
      transition-duration: 480ms !important;
      transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
      transform-style: preserve-3d !important;
      will-change: transform, opacity !important;
    }

    .clara-performance-mode [style*="perspective: 1300px"] {
      height: 226px !important;
      min-height: 226px !important;
      max-height: none !important;
    }

    .clara-performance-mode .clara-preserve-flip-face {
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
      isolation: isolate !important;
      border-color: rgba(103,232,249,0.18) !important;
      background: linear-gradient(135deg, #062638 0%, #071430 48%, #171342 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 46px rgba(0,0,0,0.30), 0 0 18px rgba(0,232,255,0.04), 0 0 28px rgba(128,70,255,0.05) !important;
    }

    .clara-performance-mode .clara-preserve-flip-face > .pointer-events-none.absolute {
      opacity: 1 !important;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent 45%, rgba(0,0,0,0.14)) !important;
    }

    .clara-performance-mode .clara-preserve-flip-face::before,
    .clara-performance-mode .clara-preserve-flip-face::after,
    .clara-performance-mode .clara-finance-bubble-card::before,
    .clara-performance-mode .clara-finance-bubble-card::after,
    .clara-performance-mode [data-emergency-card="true"]::before,
    .clara-performance-mode [data-emergency-card="true"]::after,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child::before,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child::after {
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      pointer-events: none !important;
    }

    .clara-performance-mode .clara-preserve-flip-face > *,
    .clara-performance-mode .clara-finance-bubble-card > *,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child > * {
      position: relative;
      z-index: 2;
    }

    .clara-performance-mode .clara-finance-bubble-card,
    .clara-performance-mode [data-emergency-card="true"],
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child {
      position: relative !important;
      isolation: isolate !important;
      border-color: rgba(103,232,249,0.14) !important;
      background: linear-gradient(135deg, #062638 0%, #071430 48%, #171342 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 55px rgba(0,0,0,0.36), 0 0 22px rgba(0,232,255,0.05), 0 0 34px rgba(128,70,255,0.06) !important;
    }

    .clara-performance-mode .clara-finance-bubble-card > .pointer-events-none.absolute,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child > .pointer-events-none.absolute,
    .clara-performance-mode [data-emergency-card="true"] > .absolute.inset-0,
    .clara-performance-mode [data-emergency-card="true"] > .pointer-events-none.absolute.inset-0 {
      opacity: 1 !important;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent 45%, rgba(0,0,0,0.14)) !important;
    }

    .clara-performance-mode nav:has(a[href*="/dashboard"]):has(a[href*="/feed"]),
    .clara-performance-mode nav:has(a[href*="/messages"]):has(a[href*="/settings"]),
    .clara-performance-mode header nav:has(a[href*="/dashboard"]),
    .clara-performance-mode header nav:has(a[href*="/settings"]) {
      position: sticky !important;
      top: calc(env(safe-area-inset-top) + 8px) !important;
      z-index: 80 !important;
      isolation: isolate !important;
      overflow: hidden !important;
      border: 1px solid rgba(103,232,249,0.16) !important;
      border-radius: 999px !important;
      background: linear-gradient(135deg, rgba(6,48,66,0.72), rgba(7,20,48,0.78) 48%, rgba(37,13,74,0.70)) !important;
      box-shadow: 0 12px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .clara-performance-mode nav:has(a[href*="/dashboard"]):has(a[href*="/feed"])::before,
    .clara-performance-mode nav:has(a[href*="/messages"]):has(a[href*="/settings"])::before,
    .clara-performance-mode header nav:has(a[href*="/dashboard"])::before,
    .clara-performance-mode header nav:has(a[href*="/settings"])::before {
      content: "" !important;
      position: absolute !important;
      inset: 1px !important;
      border-radius: inherit !important;
      background: linear-gradient(180deg, rgba(255,255,255,0.055), transparent 62%) !important;
      pointer-events: none !important;
      z-index: 0 !important;
    }

    .clara-performance-mode nav:has(a[href*="/dashboard"]):has(a[href*="/feed"]) > *,
    .clara-performance-mode nav:has(a[href*="/messages"]):has(a[href*="/settings"]) > *,
    .clara-performance-mode header nav:has(a[href*="/dashboard"]) > *,
    .clara-performance-mode header nav:has(a[href*="/settings"]) > * {
      position: relative !important;
      z-index: 2 !important;
    }

    .clara-performance-mode nav a[href*="/dashboard"],
    .clara-performance-mode nav a[href*="/feed"],
    .clara-performance-mode nav a[href*="/messages"],
    .clara-performance-mode nav a[href*="/settings"],
    .clara-performance-mode header nav a[href*="/dashboard"],
    .clara-performance-mode header nav a[href*="/feed"],
    .clara-performance-mode header nav a[href*="/messages"],
    .clara-performance-mode header nav a[href*="/settings"] {
      border-radius: 999px !important;
      color: rgba(255,255,255,0.66) !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .clara-performance-mode nav a[href*="/dashboard"][aria-current="page"],
    .clara-performance-mode nav a[href*="/feed"][aria-current="page"],
    .clara-performance-mode nav a[href*="/messages"][aria-current="page"],
    .clara-performance-mode nav a[href*="/settings"][aria-current="page"],
    .clara-performance-mode nav a[href*="/dashboard"].active,
    .clara-performance-mode nav a[href*="/feed"].active,
    .clara-performance-mode nav a[href*="/messages"].active,
    .clara-performance-mode nav a[href*="/settings"].active {
      color: rgba(255,255,255,0.96) !important;
      border: 1px solid rgba(103,232,249,0.20) !important;
      background: rgba(255,255,255,0.075) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
    }
  `;
  document.head.appendChild(style);
};

export const applyVisualPerformanceMode = () => {
  if (typeof document === "undefined") return;

  ensureClaraVisualPerformanceStyles();

  document.documentElement.classList.add("clara-performance-mode");
  document.documentElement.classList.remove("clara-premium-mode");
  document.body?.classList?.add("clara-performance-mode");
  document.body?.classList?.remove("clara-premium-mode");
  document.documentElement.dataset.claraVisualMode = "performance";
  if (document.body) {
    document.body.dataset.claraVisualMode = "performance";
  }
};

export const readStoredPerformanceMode = (userId) => {
  const storageKey = getVisualPerformanceStorageKey(userId);
  dashboardRuntimePerformanceMode.set(storageKey, CLARA_STANDARD_VISUAL_PERFORMANCE_ENABLED);
  return CLARA_STANDARD_VISUAL_PERFORMANCE_ENABLED;
};

export const saveVisualPerformanceMode = (userId) => {
  const storageKey = getVisualPerformanceStorageKey(userId);
  dashboardRuntimePerformanceMode.set(storageKey, CLARA_STANDARD_VISUAL_PERFORMANCE_ENABLED);
  applyVisualPerformanceMode();
  dispatchClaraVisualPerformanceEvent("clara:visual-performance-mode-updated", {
    enabled: CLARA_STANDARD_VISUAL_PERFORMANCE_ENABLED,
    visualMode: "performance",
    userId: userId || null,
  });
  return CLARA_STANDARD_VISUAL_PERFORMANCE_ENABLED;
};
