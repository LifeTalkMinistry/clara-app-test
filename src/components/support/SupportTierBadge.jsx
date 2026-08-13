import { getSupportTier, normalizeSupportTier } from "@/lib/clara-support";
import "@/community-badge-premium.css";

const BADGES = Object.freeze({
  supporter: {
    assetSrc: "/support-badges/supporter-tier-1.png",
    shellClass:
      "border-blue-400/35 bg-gradient-to-r from-blue-500/[0.15] via-sky-400/[0.08] to-blue-700/[0.12] text-blue-50 shadow-[0_0_18px_rgba(37,99,235,0.12)]",
    iconClass:
      "border-blue-300/28 bg-[#06142f]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
    shineClass: "from-blue-100/0 via-blue-100/[0.10] to-blue-100/0",
  },
  builder: {
    shellClass:
      "border-amber-300/40 bg-gradient-to-r from-amber-400/[0.16] via-yellow-300/[0.08] to-blue-600/[0.10] text-amber-50 shadow-[0_0_18px_rgba(245,196,72,0.13)]",
    iconClass:
      "border-amber-200/34 bg-[#09142b]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]",
    shineClass: "from-amber-100/0 via-yellow-100/[0.11] to-amber-100/0",
  },
  champion: {
    shellClass:
      "border-amber-300/48 bg-gradient-to-r from-amber-400/[0.18] via-yellow-300/[0.10] to-red-500/[0.10] text-amber-50 shadow-[0_0_20px_rgba(245,196,72,0.14)]",
    iconClass:
      "border-amber-200/42 bg-[#0b1429]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.13)]",
    shineClass: "from-amber-100/0 via-yellow-100/[0.13] to-red-100/0",
  },
});

const SETTINGS_TONE = {
  shellClass: "border-[#9a8130]/45 bg-[#ffd84a]/8 text-[#ffe477] shadow-none",
  iconClass: "border-[#a98c32]/45 bg-[#071127]/78 shadow-none",
  shineClass: "from-[#ffd84a]/0 via-[#ffd84a]/12 to-[#ffd84a]/0",
};

function ClaraStatusMark({ compact = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`clara-support-mark ${compact ? "h-[12px] w-[12px]" : "h-[13px] w-[13px]"}`}
    >
      <path
        className="clara-support-mark__blue"
        d="M17.55 5.35A8 8 0 1 0 17.55 18.65"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.9"
        strokeLinecap="round"
      />
      <path
        className="clara-support-mark__red"
        d="M19.25 7.4A8 8 0 0 1 19.25 16.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.9"
        strokeLinecap="round"
      />
      <rect className="clara-support-mark__gold" x="9.05" y="8.7" width="2.05" height="6.6" rx="1.025" />
      <rect className="clara-support-mark__gold" x="12.9" y="8.7" width="2.05" height="6.6" rx="1.025" />
    </svg>
  );
}

export default function SupportTierBadge({ tier, compact = false, className = "", tone = "default" }) {
  const normalized = normalizeSupportTier(tier);
  const badge = normalized ? BADGES[normalized] : null;
  const canonicalTier = normalized ? getSupportTier(normalized) : null;
  if (!badge || !canonicalTier) return null;

  const visual = tone === "settings" ? SETTINGS_TONE : badge;
  const label = canonicalTier.name;
  const description = `${label} — helping keep CLARA free for everyone.`;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center overflow-hidden rounded-full border font-black leading-none ${tone === "settings" ? "" : "backdrop-blur-md"} ${visual.shellClass} ${compact ? "h-6 gap-1.5 px-2 pr-2.5 text-[9px]" : "h-7 gap-1.5 px-2.5 pr-3 text-[10px]"} ${className}`}
      title={description}
      aria-label={description}
      data-clara-support-tier={normalized}
    >
      <span aria-hidden="true" className={`clara-support-badge__shine pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r ${visual.shineClass}`} />
      <span className={`clara-support-badge__mark relative z-[1] inline-flex shrink-0 items-center justify-center rounded-full border ${visual.iconClass} ${compact ? "h-4 w-4" : "h-[18px] w-[18px]"}`}>
        {badge.assetSrc ? (
          <img
            src={badge.assetSrc}
            alt=""
            aria-hidden="true"
            className="clara-support-badge__asset block h-full w-full object-contain"
          />
        ) : (
          <ClaraStatusMark compact={compact} />
        )}
      </span>
      <span className="clara-support-badge__label relative z-[1] whitespace-nowrap tracking-[0.02em]">{label}</span>
    </span>
  );
}
