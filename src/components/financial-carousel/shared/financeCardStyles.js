const FINANCE_CARD_TRANSITION_CLASS =
  "transition-[transform,opacity,border-color,background-color] duration-200";

export const FINANCE_CARD_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.94)_48%,rgba(37,13,74,0.94))] backdrop-blur-2xl ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-cyan-100/16 bg-[linear-gradient(135deg,rgba(6,38,54,0.92),rgba(6,16,36,0.92)_48%,rgba(28,12,58,0.88))] backdrop-blur-sm ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_LITE_SURFACE_CLASS =
  `relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-white/[0.055] bg-[rgba(5,13,28,0.84)] backdrop-blur-none ${FINANCE_CARD_TRANSITION_CLASS}`;

export const FINANCE_CARD_MEDIUM_SHADOW_CLASS =
  "shadow-[0_16px_34px_rgba(0,0,0,0.30),0_0_18px_rgba(0,255,220,0.035)]";

export const FINANCE_CARD_LITE_SHADOW_CLASS = "shadow-none";

export const FINANCE_CARD_GLOW_LAYERS = [
  "pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-cyan-300/25 blur-[86px]",
  "pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-purple-500/25 blur-[92px]",
  "pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/12 blur-[84px]",
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,220,0.30),transparent_34%),radial-gradient(circle_at_top_right,rgba(126,34,206,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.04)_100%)]",
  "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/12 via-black/8 to-black/26",
  "pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_35%,transparent_100%)]",
  "pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10",
];

export const FINANCE_CARD_MEDIUM_GLOW_LAYERS = [
  "pointer-events-none absolute -left-20 -top-24 z-[1] h-44 w-44 rounded-full bg-cyan-300/[0.10] blur-[48px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.008)_38%,rgba(0,0,0,0.16)_100%)]",
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
  shadowClass = "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_42px_rgba(0,255,220,0.10),0_0_62px_rgba(126,34,206,0.12)]",
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
  "relative z-30 flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
