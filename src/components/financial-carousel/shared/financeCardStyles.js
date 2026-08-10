const FINANCE_CARD_TRANSITION_CLASS =
  "transition-[transform,opacity,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

// CLARA finance palette:
// midnight navy foundation + royal blue identity + restrained Philippine gold/red traces.
// The treatment is intentionally abstract — never a literal flag or three-color block.
// Green/amber/rose remain available inside cards only when they communicate money status.
export const FINANCE_CARD_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-100/[0.14] bg-[linear-gradient(138deg,rgba(9,52,120,0.985),rgba(6,31,76,0.992)_46%,rgba(4,18,46,0.996)_100%)] backdrop-blur-[26px] ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-100/[0.105] bg-[linear-gradient(138deg,rgba(8,43,101,0.965),rgba(5,27,66,0.982)_48%,rgba(4,17,41,0.992)_100%)] backdrop-blur-xl ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_LITE_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-blue-100/[0.075] bg-[linear-gradient(138deg,rgba(6,31,73,0.95),rgba(4,20,49,0.975)_58%,rgba(3,14,35,0.99)_100%)] backdrop-blur-none ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_FULL_SHADOW_CLASS =
  "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_34px_rgba(8,103,255,0.10),inset_0_1px_0_rgba(255,255,255,0.085)]";

export const FINANCE_CARD_MEDIUM_SHADOW_CLASS =
  "shadow-[0_18px_42px_rgba(0,0,0,0.30),0_0_24px_rgba(8,103,255,0.07),inset_0_1px_0_rgba(255,255,255,0.06)]";

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
  "relative z-30 flex min-h-[48px] w-full items-center justify-between rounded-[22px] border border-blue-100/[0.16] bg-blue-50/[0.055] px-4 py-3 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:border-blue-100/[0.25] hover:bg-blue-50/[0.09] active:scale-[0.992]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[24px] border border-blue-100/[0.11] bg-blue-50/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Central brand guard. Older finance-card internals still contain historical
// cyan/violet utility classes. Keep their behavior/layout, but prevent those
// utilities from restoring the retired teal/purple identity.
export const FINANCE_CARD_BRAND_OVERRIDES = `
.clara-finance-bubble-card {
  border-color: rgba(191, 219, 254, 0.15) !important;
  background:
    linear-gradient(138deg, rgba(9, 52, 120, 0.985) 0%, rgba(6, 31, 76, 0.992) 46%, rgba(4, 18, 46, 0.996) 100%) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.42),
    0 0 34px rgba(8, 103, 255, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.085) !important;
}

.clara-finance-bubble-card[data-performance-mode="medium"] {
  background: linear-gradient(138deg, rgba(8, 43, 101, 0.965), rgba(5, 27, 66, 0.982) 48%, rgba(4, 17, 41, 0.992)) !important;
}

.clara-finance-bubble-card[data-performance-mode="lite"] {
  background: linear-gradient(138deg, rgba(6, 31, 73, 0.95), rgba(4, 20, 49, 0.975) 58%, rgba(3, 14, 35, 0.99)) !important;
}

.clara-finance-brand-field {
  background:
    linear-gradient(118deg, transparent 0%, transparent 36%, rgba(21, 101, 255, 0.12) 48%, rgba(21, 101, 255, 0.035) 58%, transparent 68%),
    linear-gradient(146deg, transparent 0%, transparent 67%, rgba(255, 216, 74, 0.052) 71%, transparent 76%),
    linear-gradient(154deg, transparent 0%, transparent 76%, rgba(224, 36, 55, 0.050) 80%, transparent 86%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.026), transparent 31%, rgba(2, 8, 24, 0.14) 100%);
}

.clara-finance-brand-edge {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(80, 154, 255, 0.18) 14%,
    rgba(80, 154, 255, 0.58) 46%,
    rgba(255, 216, 74, 0.42) 68%,
    rgba(224, 36, 55, 0.34) 82%,
    transparent 100%
  );
}

.clara-finance-bubble-card [class*="bg-fuchsia-"],
.clara-finance-bubble-card [class*="bg-violet-"],
.clara-finance-bubble-card [class*="bg-purple-"],
.clara-finance-bubble-card [class*="bg-indigo-"][class*="blur-"] {
  background-color: rgba(21, 101, 255, 0.075) !important;
}

.clara-finance-bubble-card [class*="bg-cyan-"][class*="blur-"],
.clara-finance-bubble-card [class*="bg-teal-"][class*="blur-"],
.clara-finance-bubble-card [class*="bg-sky-"][class*="blur-"] {
  background-color: rgba(21, 101, 255, 0.08) !important;
}

.clara-finance-bubble-card [class*="radial-gradient"] {
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
  color: rgba(191, 219, 254, 0.92) !important;
}
`;

export const FINANCIAL_CAROUSEL_PREMIUM_GLASS_STYLES = `
.clara-finance-slide-surface {
  border-color: rgba(191, 219, 254, 0.13) !important;
  background: linear-gradient(142deg, rgba(7, 43, 102, 0.99), rgba(5, 27, 66, 0.995) 48%, rgba(3, 16, 40, 0.998)) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.38),
    0 0 32px rgba(8, 103, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
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
