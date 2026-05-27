export const FINANCE_CARD_SURFACE_CLASS =
  "relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-cyan-300/[0.14] bg-[linear-gradient(135deg,#062638_0%,#071430_48%,#171342_100%)] backdrop-blur-2xl transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_55px_rgba(0,0,0,0.36),0_0_22px_rgba(0,232,255,0.05),0_0_34px_rgba(128,70,255,0.06)]";

export const FINANCE_CARD_GLOW_LAYERS = [
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_45%,rgba(0,0,0,0.14)_100%)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-cyan-100/[0.045]",
];

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
