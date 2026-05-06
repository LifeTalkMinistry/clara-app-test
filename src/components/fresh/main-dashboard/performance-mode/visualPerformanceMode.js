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

    .clara-performance-mode .clara-preserve-flip-face {
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
    }

    .clara-performance-mode .clara-finance-bubble-card,
    .clara-performance-mode [data-emergency-card="true"],
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child {
      position: relative !important;
      isolation: isolate !important;
      border-color: rgba(103,232,249,0.22) !important;
      background:
        radial-gradient(circle at -16% -22%, rgba(20,184,166,0.32) 0%, rgba(20,184,166,0.16) 24%, rgba(20,184,166,0.05) 40%, transparent 55%),
        radial-gradient(circle at 68% 118%, rgba(99,102,241,0.26) 0%, rgba(79,70,229,0.18) 32%, rgba(88,28,135,0.12) 48%, transparent 66%),
        linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96)) !important;
      box-shadow: 0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.04) !important;
    }

    .clara-performance-mode .clara-finance-bubble-card > .pointer-events-none.absolute,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child > .pointer-events-none.absolute,
    .clara-performance-mode [data-emergency-card="true"] > .absolute.inset-0,
    .clara-performance-mode [data-emergency-card="true"] > .pointer-events-none.absolute.inset-0 {
      opacity: 0 !important;
      background: transparent !important;
    }

    .clara-performance-mode .clara-finance-bubble-card::before,
    .clara-performance-mode [data-emergency-card="true"]::before,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child::before {
      content: "" !important;
      position: absolute !important;
      left: -130px !important;
      top: -150px !important;
      width: 230px !important;
      height: 230px !important;
      border-radius: 999px !important;
      background: rgba(45,212,191,0.14) !important;
      box-shadow: inset -18px -24px 60px rgba(1,10,24,0.18) !important;
      pointer-events: none !important;
      z-index: 1 !important;
    }

    .clara-performance-mode .clara-finance-bubble-card::after,
    .clara-performance-mode [data-emergency-card="true"]::after,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child::after {
      content: "" !important;
      position: absolute !important;
      left: 38% !important;
      bottom: -166px !important;
      width: 248px !important;
      height: 248px !important;
      border-radius: 999px !important;
      background: rgba(99,102,241,0.17) !important;
      box-shadow: inset 24px 28px 76px rgba(255,255,255,0.04) !important;
      pointer-events: none !important;
      z-index: 1 !important;
    }

    .clara-performance-mode .clara-finance-bubble-wallet::before {
      left: -152px !important;
      top: -162px !important;
      width: 236px !important;
      height: 236px !important;
      background: rgba(45,212,191,0.12) !important;
    }
    .clara-performance-mode .clara-finance-bubble-wallet::after {
      left: 39% !important;
      bottom: -170px !important;
      width: 250px !important;
      height: 250px !important;
      background: rgba(59,130,246,0.16) !important;
    }
    .clara-performance-mode [data-emergency-card="true"]::before { background: rgba(16,185,129,0.14) !important; }
    .clara-performance-mode [data-emergency-card="true"]::after { background: rgba(20,184,166,0.14) !important; }
    .clara-performance-mode .clara-finance-bubble-savings-shell > div:first-child::before { background: rgba(52,211,153,0.13) !important; }
    .clara-performance-mode .clara-finance-bubble-savings-shell > div:first-child::after { background: rgba(34,211,238,0.13) !important; }
    .clara-performance-mode .clara-finance-bubble-investment::before { background: rgba(251,191,36,0.13) !important; }
    .clara-performance-mode .clara-finance-bubble-investment::after { background: rgba(124,58,237,0.14) !important; }
    .clara-performance-mode .clara-finance-bubble-debt::before { background: rgba(34,211,238,0.14) !important; }
    .clara-performance-mode .clara-finance-bubble-debt::after { background: rgba(124,58,237,0.14) !important; }
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
