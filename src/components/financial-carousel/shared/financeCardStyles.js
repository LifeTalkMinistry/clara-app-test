const FINANCE_CARD_TRANSITION_CLASS =
  "transition-[transform,opacity,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

export const FINANCE_CARD_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.095] bg-[linear-gradient(135deg,rgba(6,34,50,0.84),rgba(6,17,42,0.90)_46%,rgba(18,24,55,0.88))] backdrop-blur-[26px] ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.075] bg-[linear-gradient(135deg,rgba(5,28,42,0.78),rgba(5,15,36,0.84)_48%,rgba(13,22,50,0.80))] backdrop-blur-xl ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_LITE_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.052] bg-[linear-gradient(135deg,rgba(5,16,29,0.76),rgba(5,11,25,0.82))] backdrop-blur-none ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SHADOW_CLASS =
  "shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.055)]";

export const FINANCE_CARD_LITE_SHADOW_CLASS = "shadow-none";

/* Decorative circular glow layers are intentionally disabled app-wide. */
export const FINANCE_CARD_GLOW_LAYERS = [];
export const FINANCE_CARD_MEDIUM_GLOW_LAYERS = [];

export function normalizeFinanceCardPerformanceMode(performanceMode = "full") {
  if (performanceMode === "medium" || performanceMode === "lite") {
    return performanceMode;
  }

  return "full";
}

export function getFinanceCardShellClassName({
  performanceMode = "full",
  roundedClass = "rounded-[30px]",
  shadowClass = "shadow-[0_24px_70px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.075)]",
  ringClass = "",
  surfaceClassName = "",
} = {}) {
  const mode = normalizeFinanceCardPerformanceMode(performanceMode);

  if (mode === "lite") {
    return [
      FINANCE_CARD_LITE_SURFACE_CLASS,
      roundedClass,
      FINANCE_CARD_LITE_SHADOW_CLASS,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (mode === "medium") {
    return [
      FINANCE_CARD_MEDIUM_SURFACE_CLASS,
      roundedClass,
      FINANCE_CARD_MEDIUM_SHADOW_CLASS,
      ringClass,
      surfaceClassName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    FINANCE_CARD_SURFACE_CLASS,
    roundedClass,
    shadowClass,
    ringClass,
    surfaceClassName,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getFinanceCardGlowLayers() {
  return [];
}

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex min-h-[48px] w-full items-center justify-between rounded-[22px] border border-cyan-100/[0.16] bg-white/[0.065] px-4 py-3 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.085),0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:border-cyan-100/[0.26] hover:bg-white/[0.095] active:scale-[0.992]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[24px] border border-cyan-100/[0.12] bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_16px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const FINANCIAL_CAROUSEL_PREMIUM_GLASS_STYLES = `
.clara-finance-slide-surface {
  border-color: rgba(207, 250, 254, 0.105) !important;
  background: linear-gradient(135deg, rgba(3, 18, 32, 0.94), rgba(5, 14, 35, 0.975) 48%, rgba(13, 22, 50, 0.96)) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.065) !important;
}

.clara-finance-bubble-card[data-performance-mode="full"],
.clara-finance-bubble-card[data-expanded="true"] {
  border-color: rgba(207, 250, 254, 0.105) !important;
  background: linear-gradient(135deg, rgba(8, 33, 50, 0.82), rgba(8, 17, 42, 0.90) 46%, rgba(15, 23, 52, 0.86)) !important;
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.075) !important;
}

.clara-finance-bubble-card[data-performance-mode="medium"] {
  border-color: rgba(207, 250, 254, 0.075) !important;
  background: linear-gradient(135deg, rgba(7, 29, 45, 0.78), rgba(6, 14, 35, 0.84) 48%, rgba(13, 22, 48, 0.80)) !important;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.055) !important;
}

.clara-finance-bubble-card[data-performance-mode="lite"] {
  border-color: rgba(255, 255, 255, 0.052) !important;
  background: rgba(5, 13, 28, 0.80) !important;
}

.clara-finance-bubble-card button[aria-label^="View"],
.clara-finance-bubble-card button[aria-label^="Hide"] {
  min-height: 48px;
  border-radius: 22px !important;
}

.clara-finance-bubble-card [class*="divide-x"] > * {
  min-width: 0;
}
`;
