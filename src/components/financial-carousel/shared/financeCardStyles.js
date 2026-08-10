const FINANCE_CARD_TRANSITION_CLASS =
  "transition-[transform,opacity,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

// Official CLARA finance surface.
// Keep the financial carousel visually as direct and recognizable as the
// Daily Money Tip and Money Left cards: one defined royal-blue family, not an
// abstract teal/purple composition. Financial status colors remain available
// only for small semantic values and actions inside the cards.
export const FINANCE_CARD_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-200/[0.18] bg-[#073b7a] backdrop-blur-[26px] ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-200/[0.15] bg-[#073b7a] backdrop-blur-xl ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_LITE_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-200/[0.12] bg-[#073b7a] backdrop-blur-none ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_FULL_SHADOW_CLASS =
  "shadow-[0_22px_58px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.09)]";

export const FINANCE_CARD_MEDIUM_SHADOW_CLASS =
  "shadow-[0_16px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.07)]";

export const FINANCE_CARD_LITE_SHADOW_CLASS = "shadow-none";

// No decorative color glows. This prevents old teal/violet identities from
// reappearing through individual card implementations.
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
  "relative z-30 flex min-h-[48px] w-full items-center justify-between rounded-[22px] border border-blue-100/[0.16] bg-[#062f65] px-4 py-3 text-sm text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-blue-100/[0.25] hover:bg-[#073a78] active:scale-[0.992]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[24px] border border-blue-100/[0.12] bg-[#062f65] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_28px_rgba(0,0,0,0.13)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Central hard guard against the historical finance palette. Older card
// internals may still contain cyan/teal/violet utility classes for layout or
// status. Background decoration is neutralized here so every finance card
// presents one unmistakable CLARA-blue chassis.
export const FINANCE_CARD_BRAND_OVERRIDES = `
.clara-finance-bubble-card,
.clara-finance-bubble-card[data-performance-mode="full"],
.clara-finance-bubble-card[data-performance-mode="medium"],
.clara-finance-bubble-card[data-performance-mode="lite"],
.clara-finance-bubble-card[data-expanded="true"] {
  border-color: rgba(191, 219, 254, 0.18) !important;
  background: #073b7a !important;
  background-image: none !important;
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.09) !important;
}

.clara-finance-bubble-card [class*="bg-fuchsia-"],
.clara-finance-bubble-card [class*="bg-violet-"],
.clara-finance-bubble-card [class*="bg-purple-"],
.clara-finance-bubble-card [class*="bg-indigo-"][class*="blur-"],
.clara-finance-bubble-card [class*="bg-cyan-"][class*="blur-"],
.clara-finance-bubble-card [class*="bg-teal-"][class*="blur-"],
.clara-finance-bubble-card [class*="bg-sky-"][class*="blur-"] {
  background: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}

.clara-finance-bubble-card [class*="radial-gradient"],
.clara-finance-bubble-card [class*="from-violet"],
.clara-finance-bubble-card [class*="to-violet"],
.clara-finance-bubble-card [class*="from-purple"],
.clara-finance-bubble-card [class*="to-purple"],
.clara-finance-bubble-card [class*="from-teal"],
.clara-finance-bubble-card [class*="to-teal"] {
  background-image: none !important;
}

.clara-finance-bubble-card [class*="border-cyan-"],
.clara-finance-bubble-card [class*="border-teal-"],
.clara-finance-bubble-card [class*="border-violet-"],
.clara-finance-bubble-card [class*="border-purple-"] {
  border-color: rgba(147, 197, 253, 0.18) !important;
}

.clara-finance-bubble-card [class*="ring-cyan-"],
.clara-finance-bubble-card [class*="ring-teal-"],
.clara-finance-bubble-card [class*="ring-violet-"],
.clara-finance-bubble-card [class*="ring-purple-"] {
  --tw-ring-color: rgba(96, 165, 250, 0.18) !important;
}

.clara-finance-bubble-card [class*="text-cyan-"],
.clara-finance-bubble-card [class*="text-teal-"],
.clara-finance-bubble-card [class*="text-violet-"],
.clara-finance-bubble-card [class*="text-purple-"] {
  color: rgba(219, 234, 254, 0.94) !important;
}
`;

export const FINANCIAL_CAROUSEL_PREMIUM_GLASS_STYLES = `
.clara-finance-slide-surface {
  border-color: rgba(191, 219, 254, 0.17) !important;
  background: #073b7a !important;
  background-image: none !important;
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
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
