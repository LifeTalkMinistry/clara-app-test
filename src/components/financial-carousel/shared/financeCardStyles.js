const FINANCE_CARD_TRANSITION_CLASS =
  "transition-[transform,opacity,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

// CLARA finance palette:
// midnight navy foundation + royal blue identity + restrained Philippine gold/red accents.
// Green/amber/rose remain available inside cards for financial meaning and status only.
export const FINANCE_CARD_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-100/[0.11] bg-[linear-gradient(145deg,rgba(4,18,44,0.965),rgba(5,20,48,0.978)_48%,rgba(9,20,47,0.97))] backdrop-blur-[26px] ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-100/[0.085] bg-[linear-gradient(145deg,rgba(4,17,40,0.94),rgba(5,18,44,0.955)_50%,rgba(8,19,44,0.945))] backdrop-blur-xl ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_LITE_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-100/[0.06] bg-[linear-gradient(145deg,rgba(4,14,32,0.92),rgba(5,16,37,0.94))] backdrop-blur-none ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_FULL_SHADOW_CLASS =
  "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_34px_rgba(37,99,235,0.085),0_0_48px_rgba(220,38,38,0.025),inset_0_1px_0_rgba(255,255,255,0.075)]";

export const FINANCE_CARD_MEDIUM_SHADOW_CLASS =
  "shadow-[0_18px_42px_rgba(0,0,0,0.30),0_0_24px_rgba(37,99,235,0.055),inset_0_1px_0_rgba(255,255,255,0.055)]";

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
  ringClass = "",
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
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    FINANCE_CARD_SURFACE_CLASS,
    roundedClass,
    FINANCE_CARD_FULL_SHADOW_CLASS,
    ringClass,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getFinanceCardGlowLayers() {
  return [];
}

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex min-h-[48px] w-full items-center justify-between rounded-[22px] border border-blue-100/[0.14] bg-blue-50/[0.055] px-4 py-3 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:border-blue-100/[0.23] hover:bg-blue-50/[0.085] active:scale-[0.992]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[24px] border border-blue-100/[0.10] bg-blue-50/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Rendered by FinanceCardShell so legacy decorative colors inside older financial-card
// internals cannot re-introduce the previous purple/teal visual identity.
export const FINANCE_CARD_BRAND_OVERRIDES = `
.clara-finance-bubble-card [class*="bg-fuchsia-"],
.clara-finance-bubble-card [class*="bg-violet-"],
.clara-finance-bubble-card [class*="bg-purple-"] {
  background-color: rgba(37, 99, 235, 0.085) !important;
}

.clara-finance-bubble-card [class*="bg-cyan-"][class*="blur-"],
.clara-finance-bubble-card [class*="bg-teal-"][class*="blur-"] {
  background-color: rgba(29, 111, 242, 0.09) !important;
}

.clara-finance-bubble-card [class*="ring-cyan-"],
.clara-finance-bubble-card [class*="ring-teal-"] {
  --tw-ring-color: rgba(96, 165, 250, 0.16) !important;
}
`;

export const FINANCIAL_CAROUSEL_PREMIUM_GLASS_STYLES = `
.clara-finance-slide-surface {
  border-color: rgba(191, 219, 254, 0.105) !important;
  background: linear-gradient(145deg, rgba(3, 15, 35, 0.96), rgba(4, 17, 42, 0.98) 50%, rgba(8, 18, 42, 0.97)) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.38),
    0 0 32px rgba(37, 99, 235, 0.055),
    inset 0 1px 0 rgba(255, 255, 255, 0.065) !important;
}

.clara-finance-bubble-card[data-performance-mode="full"],
.clara-finance-bubble-card[data-expanded="true"] {
  border-color: rgba(191, 219, 254, 0.11) !important;
  background: linear-gradient(145deg, rgba(4, 18, 44, 0.965), rgba(5, 20, 48, 0.978) 48%, rgba(9, 20, 47, 0.97)) !important;
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.38),
    0 0 30px rgba(37, 99, 235, 0.075),
    inset 0 1px 0 rgba(255, 255, 255, 0.075) !important;
}

.clara-finance-bubble-card[data-performance-mode="medium"] {
  border-color: rgba(191, 219, 254, 0.08) !important;
  background: linear-gradient(145deg, rgba(4, 17, 40, 0.94), rgba(5, 18, 44, 0.955) 50%, rgba(8, 19, 44, 0.945)) !important;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.30), 0 0 24px rgba(37, 99, 235, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.055) !important;
}

.clara-finance-bubble-card[data-performance-mode="lite"] {
  border-color: rgba(191, 219, 254, 0.06) !important;
  background: rgba(4, 14, 32, 0.92) !important;
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
