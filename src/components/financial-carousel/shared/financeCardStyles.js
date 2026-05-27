export const FINANCE_CARD_SURFACE_CLASS =
  "relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.94)_48%,rgba(37,13,74,0.94))] backdrop-blur-2xl transition-all duration-200";

export const FINANCE_CARD_GLOW_LAYERS = [
  "pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,232,255,0.08),transparent_36%,rgba(128,70,255,0.08)_100%)]",
  "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/8 to-black/26",
  "pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.12),rgba(255,255,255,0.025)_38%,transparent_100%)]",
  "pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10",
];

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
