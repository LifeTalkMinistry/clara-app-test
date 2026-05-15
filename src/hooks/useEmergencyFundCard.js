import useBaseEmergencyFundCard, {
  clampOpacity,
  fmt,
  VALID_TARGET_MONTHS,
} from "../components/hooks/useEmergencyFundCard";

export { clampOpacity, fmt, VALID_TARGET_MONTHS };

function softenStatus(baseStatus = {}) {
  const label = String(baseStatus.label || "").toLowerCase();

  if (label.includes("secure") || label.includes("stable")) {
    return {
      ...baseStatus,
      text: "text-emerald-200/90",
      badge:
        "border border-emerald-300/16 bg-emerald-400/[0.075] text-emerald-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
      bar: "from-emerald-300/85 via-teal-300/80 to-cyan-200/78",
      ring: "shadow-[0_0_24px_rgba(16,185,129,0.08),0_0_46px_rgba(88,28,135,0.07)]",
    };
  }

  if (label.includes("building")) {
    return {
      ...baseStatus,
      text: "text-amber-200/90",
      badge:
        "border border-amber-300/16 bg-amber-400/[0.075] text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
      bar: "from-amber-300/85 via-yellow-200/78 to-orange-200/74",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.07),0_0_46px_rgba(88,28,135,0.07)]",
    };
  }

  return {
    ...baseStatus,
    text: "text-rose-200/90",
    badge:
      "border border-rose-300/16 bg-rose-400/[0.075] text-rose-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
    bar: "from-rose-300/82 via-pink-300/74 to-violet-200/70",
    ring: "shadow-[0_0_24px_rgba(244,63,94,0.065),0_0_46px_rgba(88,28,135,0.08)]",
  };
}

function softenThemeClasses(baseClasses = {}, theme = null) {
  const isLight = theme?.isLight === true;

  if (isLight) {
    return {
      ...baseClasses,
      glass:
        "border-slate-300/35 bg-white/65 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.50),0_10px_24px_rgba(15,23,42,0.08)]",
      iconShell:
        "border-cyan-300/28 bg-cyan-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_0_16px_rgba(14,165,233,0.07)]",
      iconColor: "text-cyan-700/90",
    };
  }

  return {
    ...baseClasses,
    border: "border-white/[0.075]",
    title: "text-white/94",
    body: "text-white/68",
    muted: "text-white/42",
    glass:
      "border-white/[0.045] bg-black/[0.105] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.026),0_10px_22px_rgba(0,0,0,0.14)]",
    iconShell:
      "border-white/[0.055] bg-black/[0.11] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_16px_rgba(34,211,238,0.055)]",
    iconColor: "text-cyan-100/82",
    background:
      theme?.tokens?.gradientEmergency ||
      "linear-gradient(135deg, rgba(4,28,43,0.92), rgba(5,12,36,0.965) 44%, rgba(22,9,57,0.94))",
    outline: theme?.tokens?.border || "rgba(255,255,255,0.075)",
  };
}

export default function useEmergencyFundCard(args = {}) {
  const result = useBaseEmergencyFundCard(args);

  return {
    ...result,
    computed: {
      ...result.computed,
      status: softenStatus(result.computed?.status),
      themeClasses: softenThemeClasses(result.computed?.themeClasses, args.theme),
    },
  };
}
