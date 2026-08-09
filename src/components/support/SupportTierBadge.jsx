import { Crown, Gem, Heart } from "lucide-react";
import { normalizeSupportTier } from "@/lib/clara-support";
import "@/community-badge-premium.css";

const BADGES = Object.freeze({
  supporter: {
    label: "Supporter",
    Icon: Heart,
    shellClass:
      "border-cyan-300/35 bg-gradient-to-r from-cyan-400/[0.16] via-sky-400/[0.10] to-blue-500/[0.14] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.14)]",
    iconClass:
      "border-cyan-200/30 bg-cyan-300/[0.14] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
    shineClass: "from-cyan-100/0 via-cyan-100/[0.10] to-cyan-100/0",
  },
  builder: {
    label: "Builder",
    Icon: Gem,
    shellClass:
      "border-teal-300/40 bg-gradient-to-r from-teal-400/[0.18] via-cyan-400/[0.10] to-violet-500/[0.14] text-teal-50 shadow-[0_0_18px_rgba(45,212,191,0.16)]",
    iconClass:
      "border-teal-200/35 bg-teal-300/[0.16] text-teal-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
    shineClass: "from-teal-100/0 via-teal-100/[0.12] to-violet-100/0",
  },
  champion: {
    label: "Champion",
    Icon: Crown,
    shellClass:
      "border-amber-300/45 bg-gradient-to-r from-amber-400/[0.20] via-yellow-300/[0.12] to-orange-500/[0.16] text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.18)]",
    iconClass:
      "border-amber-200/40 bg-amber-300/[0.18] text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]",
    shineClass: "from-amber-100/0 via-yellow-100/[0.14] to-amber-100/0",
  },
});

export default function SupportTierBadge({ tier, compact = false, className = "" }) {
  const normalized = normalizeSupportTier(tier);
  const badge = normalized ? BADGES[normalized] : null;
  if (!badge) return null;

  const { Icon, label } = badge;
  const description = `CLARA ${label} — helping keep CLARA free for everyone.`;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center overflow-hidden rounded-full border font-black leading-none backdrop-blur-md ${badge.shellClass} ${compact ? "h-6 gap-1.5 px-2 pr-2.5 text-[9px]" : "h-7 gap-1.5 px-2.5 pr-3 text-[10px]"} ${className}`}
      title={description}
      aria-label={description}
      data-clara-support-tier={normalized}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r ${badge.shineClass}`}
      />
      <span
        className={`relative z-[1] inline-flex shrink-0 items-center justify-center rounded-full border ${badge.iconClass} ${compact ? "h-4 w-4" : "h-[18px] w-[18px]"}`}
      >
        <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={2.25} />
      </span>
      <span className="relative z-[1] whitespace-nowrap tracking-[0.02em]">{label}</span>
    </span>
  );
}
