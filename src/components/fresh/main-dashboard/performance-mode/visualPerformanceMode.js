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
