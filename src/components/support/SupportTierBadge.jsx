import { Gem, Heart, Trophy } from "lucide-react";
import { normalizeSupportTier } from "@/lib/clara-support";

const BADGES = Object.freeze({
  supporter: {
    label: "Supporter",
    Icon: Heart,
    className: "border-sky-300/25 bg-sky-300/[0.09] text-sky-100",
  },
  builder: {
    label: "Builder",
    Icon: Gem,
    className: "border-[#5eead4]/30 bg-[#22c7b8]/[0.10] text-[#ccfbf1]",
  },
  champion: {
    label: "Champion",
    Icon: Trophy,
    className: "border-amber-300/30 bg-amber-300/[0.10] text-amber-100",
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
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-black leading-none ${badge.className} ${compact ? "px-1.5 py-1 text-[8px]" : "px-2 py-1 text-[9px]"} ${className}`}
      title={description}
      aria-label={description}
    >
      <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span>{label}</span>
    </span>
  );
}
