export const FINANCE_CARD_SURFACE_CLASS =
  "relative flex h-full min-h-[inherit] flex-col overflow-hidden border border-cyan-300/[0.18] bg-[linear-gradient(135deg,#073449_0%,#08255a_42%,#211052_100%)] backdrop-blur-2xl transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_22px_55px_rgba(0,0,0,0.34),0_0_26px_rgba(0,232,255,0.08),0_0_42px_rgba(128,70,255,0.09)]";

export const FINANCE_CARD_GLOW_LAYERS = [
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(135deg,rgba(34,211,238,0.13)_0%,rgba(59,130,246,0.055)_34%,rgba(124,58,237,0.12)_100%)]",
  "pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.018)_38%,rgba(0,0,0,0.10)_100%)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-cyan-100/[0.065]",
];

export const FINANCE_CARD_EXPAND_BUTTON_CLASS =
  "relative z-30 flex w-full items-center justify-between rounded-2xl border border-cyan-200/18 bg-white/[0.065] px-3 py-2.5 text-sm text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm transition hover:border-cyan-200/28 hover:bg-white/[0.095]";

export const FINANCE_CARD_EXPANDED_PANEL_CLASS =
  "mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-cyan-200/18 bg-white/[0.065] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.055)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
