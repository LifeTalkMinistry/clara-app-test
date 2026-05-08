import { useMemo } from "react";

export default function useDashboardThemeClasses(selectedDashboardTheme) {
  return useMemo(() => {
    const themeIsLight = selectedDashboardTheme?.isLight === true;

    const themePrimaryTextClass = themeIsLight ? "text-slate-900" : "text-white";
    const themeSecondaryTextClass = themeIsLight ? "text-slate-700" : "text-white/82";
    const themeMutedTextClass = themeIsLight ? "text-slate-600" : "text-white/75";
    const themeSoftTextClass = themeIsLight ? "text-slate-500" : "text-white/55";

    const themeGlassButtonClass = themeIsLight
      ? "border-slate-300/60 bg-white/72 text-slate-800 shadow-[0_8px_22px_rgba(148,163,184,0.18)] hover:bg-white/90"
      : "border-white/15 bg-white/10 text-white hover:bg-white/15";

    const themeGlassIconButtonClass = themeIsLight
      ? "border-slate-300/60 bg-white/78 text-slate-800 shadow-[0_8px_22px_rgba(148,163,184,0.18)] hover:bg-white/92"
      : "border-white/15 bg-white/10 text-white hover:bg-white/15";

    const themeQuickActionBaseClass = themeIsLight
      ? "text-slate-700 hover:bg-slate-900/[0.04] hover:text-slate-900"
      : "text-white/82 hover:bg-white/[0.06] hover:text-white";

    const themeQuickActionIconShellClass = themeIsLight
      ? "clara-theme-nav-icon-shell clara-theme-nav-icon-shell-light border-slate-300/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.90))] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_18px_rgba(148,163,184,0.16)] group-hover:border-slate-400/60 group-hover:bg-white"
      : "clara-theme-nav-icon-shell border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,255,255,0.04)] group-hover:border-white/20 group-hover:bg-white/[0.10]";

    const themeDividerClass = themeIsLight ? "via-slate-300/50" : "via-white/10";
    const themeInactiveDotClass = themeIsLight
      ? "bg-slate-400/35 hover:bg-slate-500/55"
      : "bg-white/20 hover:bg-white/35";

    const themeQuickActionPanelStyle = {
      background: themeIsLight
        ? `radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--theme-glow) 18%, transparent), transparent 42%),
           radial-gradient(circle at 82% 100%, color-mix(in srgb, var(--theme-glow) 14%, transparent), transparent 46%),
           linear-gradient(135deg, color-mix(in srgb, var(--theme-glow) 10%, rgba(255,255,255,0.92)), rgba(248,250,252,0.88) 48%, color-mix(in srgb, var(--theme-glow) 8%, rgba(241,245,249,0.92)))`
        : `radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--theme-glow) 30%, transparent), transparent 44%),
           radial-gradient(circle at 82% 100%, color-mix(in srgb, var(--theme-glow) 24%, transparent), transparent 48%),
           linear-gradient(135deg, color-mix(in srgb, var(--theme-glow) 18%, rgba(7,18,35,0.96)), rgba(8,18,36,0.94) 46%, color-mix(in srgb, var(--theme-glow) 16%, rgba(13,9,30,0.95)))`,
      borderColor: selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
      boxShadow: themeIsLight
        ? "0 0 0 1px color-mix(in srgb, var(--theme-glow) 14%, rgba(148,163,184,0.18)), 0 18px 40px rgba(15,23,42,0.10), 0 0 28px color-mix(in srgb, var(--theme-glow) 10%, transparent)"
        : "0 0 0 1px rgba(255,255,255,0.03), 0 18px 46px rgba(0,0,0,0.32), 0 0 42px color-mix(in srgb, var(--theme-glow) 24%, transparent)",
    };

    const themeQuickActionGlowStyle = {
      background: `radial-gradient(circle at 20% 18%, color-mix(in srgb, var(--theme-glow) 22%, transparent), transparent 38%),
        radial-gradient(circle at 76% 78%, color-mix(in srgb, var(--theme-glow) 18%, transparent), transparent 42%),
        ${selectedDashboardTheme?.tokens?.gradientHero || "var(--theme-gradient-hero)"}`,
      opacity: themeIsLight ? 0.24 : 0.42,
    };

    return {
      themeIsLight,
      themePrimaryTextClass,
      themeSecondaryTextClass,
      themeMutedTextClass,
      themeSoftTextClass,
      themeGlassButtonClass,
      themeGlassIconButtonClass,
      themeQuickActionBaseClass,
      themeQuickActionIconShellClass,
      themeDividerClass,
      themeInactiveDotClass,
      themeQuickActionPanelStyle,
      themeQuickActionGlowStyle,
    };
  }, [selectedDashboardTheme]);
}
