export const FINANCE_CARD_SURFACE_CLASS =
  "relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-cyan-200/[0.24] bg-[linear-gradient(135deg,#07506a_0%,#08326f_38%,#251064_100%)] backdrop-blur-2xl transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_22px_55px_rgba(0,0,0,0.32),0_0_30px_rgba(0,232,248,0.14),0_0_48px_rgba(128,70,255,0.12)]";

export const FINANCE_CARD_GLOW_LAYERS = [
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(135deg,rgba(0,232,248,0.24)_0%,rgba(0,173,255,0.12)_27%,rgba(59,130,246,0.055)_48%,rgba(124,58,237,0.14)_100%)]",
  "pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.022)_38%,rgba(0,0,0,0.08)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-20 bg-[linear-gradient(90deg,rgba(0,232,248,0.18),rgba(56,189,248,0.09)_42%,transparent_82%)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-cyan-100/[0.085]",
];

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex w-full items-center justify-between rounded-2xl border border-cyan-200/22 bg-white/[0.075] px-3 py-2.5 text-sm text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_22px_rgba(0,0,0,0.14),0_0_18px_rgba(0,232,248,0.045)] backdrop-blur-sm transition hover:border-cyan-200/32 hover:bg-white/[0.105]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-cyan-200/20 bg-white/[0.072] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_24px_rgba(0,232,248,0.07)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
