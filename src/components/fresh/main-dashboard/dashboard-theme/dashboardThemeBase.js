import { DEFAULT_THEME_KEY } from "@/theme/themes";

export const DEFAULT_DASHBOARD_THEME_KEY = DEFAULT_THEME_KEY || "obsidian";

export const dashboardTheme = {
  key: DEFAULT_DASHBOARD_THEME_KEY,
  category: "classic",
  label: "CLARA Premium Dark",
  chip: "Default",
  pageSurface: "bg-[#05070a]",
  pageGlow:
    "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[260px] before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[220px] after:bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.03),transparent_58%)]",
  heroShell:
    "border-white/15 bg-[#0a0d12] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_34px_rgba(0,0,0,0.35)]",
  heroGlow:
    "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_36%)]",
  moneyTone: "emerald",
  moneyOverlay: "border-white/15 bg-[#0c1016]",
  monthTone: "emerald",
  monthOverlay: "border-white/15 bg-[#0d1118]",
  tipTone: "emerald",
  tipOverlay: "border-white/15 bg-[#0d1118]",
  indicatorActive: "bg-emerald-400",
  modalAccent: "from-emerald-400/20 via-emerald-500/16 to-green-600/18",
  preview: "bg-[#05070a]",
  isLight: false,
};

export const getDashboardGlowCardClass = (tone = "emerald") => {
  const toneMap = {
    emerald:
      "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_42%),linear-gradient(135deg,rgba(7,25,24,0.94),rgba(7,31,40,0.92)_52%,rgba(5,18,29,0.95))] shadow-[0_22px_65px_rgba(16,185,129,0.14)]",
    blue:
      "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_42%),linear-gradient(135deg,rgba(10,20,54,0.95),rgba(18,44,112,0.9)_54%,rgba(10,18,40,0.95))] shadow-[0_22px_65px_rgba(59,130,246,0.16)]",
    teal:
      "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_42%),linear-gradient(135deg,rgba(7,24,44,0.95),rgba(7,39,53,0.92)_54%,rgba(8,21,31,0.96))] shadow-[0_22px_65px_rgba(20,184,166,0.15)]",
    gold:
      "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_42%),linear-gradient(135deg,rgba(31,19,9,0.95),rgba(46,26,17,0.92)_54%,rgba(16,11,26,0.96))] shadow-[0_22px_65px_rgba(245,158,11,0.15)]",
  };

  return `relative isolate overflow-hidden rounded-[28px] border border-white/15 backdrop-blur-sm before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-16 before:rounded-full before:bg-white/8 before:blur-3xl after:pointer-events-none after:absolute after:inset-0 after:rounded-[28px] after:ring-1 after:ring-inset after:ring-white/6 ${toneMap[tone] || toneMap.emerald}`;
};
