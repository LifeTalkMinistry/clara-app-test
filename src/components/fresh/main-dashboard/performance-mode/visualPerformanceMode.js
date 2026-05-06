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
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child {
      position: relative !important;
      isolation: isolate !important;
      border-color: rgba(103,232,249,0.22) !important;
      background:
        radial-gradient(circle at -7% -6%, rgba(20,184,166,0.52) 0%, rgba(20,184,166,0.30) 26%, rgba(20,184,166,0.08) 43%, transparent 54%),
        radial-gradient(circle at 64% 111%, rgba(99,102,241,0.38) 0%, rgba(79,70,229,0.28) 32%, rgba(88,28,135,0.20) 48%, transparent 64%),
        linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96)) !important;
      box-shadow: 0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.04) !important;
    }

    .clara-performance-mode .clara-finance-bubble-card::before,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child::before {
      content: "" !important;
      position: absolute !important;
      left: -92px !important;
      top: -116px !important;
      width: 252px !important;
      height: 252px !important;
      border-radius: 999px !important;
      background: rgba(45,212,191,0.24) !important;
      box-shadow: inset -18px -24px 60px rgba(1,10,24,0.18) !important;
      pointer-events: none !important;
      z-index: 1 !important;
    }

    .clara-performance-mode .clara-finance-bubble-card::after,
    .clara-performance-mode .clara-finance-bubble-card-shell > div:first-child::after {
      content: "" !important;
      position: absolute !important;
      left: 34% !important;
      bottom: -135px !important;
      width: 270px !important;
      height: 270px !important;
      border-radius: 999px !important;
      background: rgba(99,102,241,0.24) !important;
      box-shadow: inset 24px 28px 76px rgba(255,255,255,0.04) !important;
      pointer-events: none !important;
      z-index: 1 !important;
    }

    .clara-performance-mode .clara-finance-bubble-wallet::before { background: rgba(45,212,191,0.26) !important; }
    .clara-performance-mode .clara-finance-bubble-wallet::after { background: rgba(59,130,246,0.24) !important; }
    .clara-performance-mode [data-emergency-card="true"]::before { background: rgba(16,185,129,0.24) !important; }
    .clara-performance-mode [data-emergency-card="true"]::after { background: rgba(20,184,166,0.22) !important; }
    .clara-performance-mode .clara-finance-bubble-savings-shell > div:first-child::before { background: rgba(52,211,153,0.23) !important; }
    .clara-performance-mode .clara-finance-bubble-savings-shell > div:first-child::after { background: rgba(34,211,238,0.20) !important; }
    .clara-performance-mode .clara-finance-bubble-investment::before { background: rgba(251,191,36,0.22) !important; }
    .clara-performance-mode .clara-finance-bubble-investment::after { background: rgba(124,58,237,0.22) !important; }
    .clara-performance-mode .clara-finance-bubble-debt::before { background: rgba(34,211,238,0.24) !important; }
    .clara-performance-mode .clara-finance-bubble-debt::after { background: rgba(124,58,237,0.24) !important; }
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
