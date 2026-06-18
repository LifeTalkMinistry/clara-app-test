const FINANCE_CARD_TRANSITION_CLASS =
  "transition-[transform,opacity,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

export const FINANCE_CARD_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.095] bg-[linear-gradient(135deg,rgba(6,34,50,0.84),rgba(6,17,42,0.90)_46%,rgba(39,18,82,0.84))] backdrop-blur-[26px] ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.075] bg-[linear-gradient(135deg,rgba(5,28,42,0.78),rgba(5,15,36,0.84)_48%,rgba(31,15,66,0.76))] backdrop-blur-xl ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_LITE_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.052] bg-[linear-gradient(135deg,rgba(5,16,29,0.76),rgba(5,11,25,0.82))] backdrop-blur-none ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SHADOW_CLASS =
  "shadow-[0_18px_42px_rgba(0,0,0,0.28),0_0_22px_rgba(0,255,220,0.035),inset_0_1px_0_rgba(255,255,255,0.055)]";

export const FINANCE_CARD_LITE_SHADOW_CLASS = "shadow-none";

export const FINANCE_CARD_GLOW_LAYERS = [
  "pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-cyan-300/[0.16] blur-[92px]",
  "pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-violet-500/[0.18] blur-[96px]",
  "pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/[0.10] blur-[88px]",
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.17),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.085)_0%,rgba(255,255,255,0.018)_38%,rgba(255,255,255,0.055)_100%)]",
  "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/8 to-black/24",
  "pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15),rgba(255,255,255,0.04)_38%,transparent_100%)]",
  "pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/[0.085]",
];

export const FINANCE_CARD_MEDIUM_GLOW_LAYERS = [
  "pointer-events-none absolute -left-20 -top-24 z-[1] h-44 w-44 rounded-full bg-cyan-300/[0.085] blur-[52px]",
  "pointer-events-none absolute -right-24 -top-20 z-[1] h-44 w-44 rounded-full bg-violet-400/[0.07] blur-[58px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012)_38%,rgba(0,0,0,0.15)_100%)]",
];

export function normalizeFinanceCardPerformanceMode(performanceMode = "full") {
  if (performanceMode === "medium" || performanceMode === "lite") {
    return performanceMode;
  }

  return "full";
}

export function getFinanceCardShellClassName({
  performanceMode = "full",
  roundedClass = "rounded-[30px]",
  shadowClass = "shadow-[0_24px_70px_rgba(0,0,0,0.36),0_0_36px_rgba(0,255,220,0.065),0_0_60px_rgba(126,34,206,0.09),inset_0_1px_0_rgba(255,255,255,0.075)]",
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

export function getFinanceCardGlowLayers(
  glowLayerClassNames = FINANCE_CARD_GLOW_LAYERS,
  performanceMode = "full"
) {
  const mode = normalizeFinanceCardPerformanceMode(performanceMode);

  if (mode === "lite") return [];
  if (mode === "medium") return FINANCE_CARD_MEDIUM_GLOW_LAYERS;

  return Array.isArray(glowLayerClassNames) ? glowLayerClassNames : [];
}

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex min-h-[48px] w-full items-center justify-between rounded-[22px] border border-cyan-100/[0.16] bg-white/[0.065] px-4 py-3 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.085),0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:border-cyan-100/[0.26] hover:bg-white/[0.095] active:scale-[0.992]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[24px] border border-cyan-100/[0.12] bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_16px_30px_rgba(0,0,0,0.14),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const FINANCIAL_CAROUSEL_PREMIUM_GLASS_STYLES = `
.clara-finance-slide-surface {
  border-color: rgba(207, 250, 254, 0.105) !important;
  background:
    radial-gradient(circle at 14% 0%, rgba(103, 232, 249, 0.16), transparent 34%),
    radial-gradient(circle at 88% 100%, rgba(168, 85, 247, 0.14), transparent 48%),
    linear-gradient(135deg, rgba(3, 18, 32, 0.94), rgba(5, 14, 35, 0.975) 48%, rgba(24, 12, 57, 0.94)) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.34),
    0 0 42px rgba(34, 211, 238, 0.055),
    0 0 58px rgba(124, 58, 237, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.065) !important;
}

.clara-finance-bubble-card[data-performance-mode="full"],
.clara-finance-bubble-card[data-expanded="true"] {
  border-color: rgba(207, 250, 254, 0.105) !important;
  background:
    radial-gradient(circle at 12% 0%, rgba(103, 232, 249, 0.13), transparent 33%),
    radial-gradient(circle at 92% 100%, rgba(168, 85, 247, 0.13), transparent 44%),
    linear-gradient(135deg, rgba(8, 33, 50, 0.82), rgba(8, 17, 42, 0.90) 46%, rgba(38, 18, 78, 0.82)) !important;
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.35),
    0 0 32px rgba(34, 211, 238, 0.055),
    0 0 50px rgba(139, 92, 246, 0.065),
    inset 0 1px 0 rgba(255, 255, 255, 0.075) !important;
}

.clara-finance-bubble-card[data-performance-mode="medium"] {
  border-color: rgba(207, 250, 254, 0.075) !important;
  background: linear-gradient(135deg, rgba(7, 29, 45, 0.78), rgba(6, 14, 35, 0.84) 48%, rgba(32, 15, 66, 0.76)) !important;
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
