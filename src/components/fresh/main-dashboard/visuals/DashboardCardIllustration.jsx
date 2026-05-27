import { useId } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function useSvgIds(prefix) {
  const rawId = useId().replace(/:/g, "");
  return {
    glow: `${prefix}-${rawId}-glow`,
    cool: `${prefix}-${rawId}-cool`,
    warm: `${prefix}-${rawId}-warm`,
    violet: `${prefix}-${rawId}-violet`,
  };
}

function FloatingCoins({ ids, warm = false }) {
  return (
    <g opacity="0.9">
      <circle cx="128" cy="44" r="11" fill={`url(#${warm ? ids.warm : ids.cool})`} opacity="0.95" />
      <circle cx="128" cy="44" r="8" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
      <path d="M125 44h6M128 39v10" stroke="rgba(255,255,255,0.70)" strokeWidth="1.2" strokeLinecap="round" />

      <circle cx="154" cy="77" r="8" fill={`url(#${ids.warm})`} opacity="0.8" />
      <circle cx="154" cy="77" r="5.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />

      <circle cx="101" cy="70" r="6" fill="rgba(103,232,249,0.45)" opacity="0.75" />
      <circle cx="174" cy="34" r="3" fill="rgba(253,224,71,0.9)" />
      <circle cx="89" cy="35" r="2.5" fill="rgba(255,255,255,0.75)" />
      <circle cx="180" cy="102" r="2" fill="rgba(103,232,249,0.75)" />
    </g>
  );
}

function MoneyTipIllustration({ className = "" }) {
  const ids = useSvgIds("money-tip");

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute -right-3 bottom-0 top-0 z-0 w-[48%] min-w-[138px] opacity-90 mix-blend-screen",
        className
      )}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(0,232,255,0.10),transparent_42%,rgba(168,85,247,0.10))] blur-[1px]" />
      <svg viewBox="0 0 220 160" className="absolute inset-y-0 right-0 h-full w-full" fill="none">
        <defs>
          <radialGradient id={ids.glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(132 67) rotate(90) scale(63 67)">
            <stop stopColor="#FDE68A" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#38BDF8" stopOpacity="0.48" />
            <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ids.cool} x1="80" y1="40" x2="152" y2="138" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67E8F9" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id={ids.warm} x1="102" y1="25" x2="170" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF7AD" />
            <stop offset="0.55" stopColor="#FBBF24" />
            <stop offset="1" stopColor="#FB7185" />
          </linearGradient>
          <linearGradient id={ids.violet} x1="116" y1="74" x2="198" y2="151" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A78BFA" />
            <stop offset="1" stopColor="#4C1D95" />
          </linearGradient>
        </defs>

        <ellipse cx="138" cy="78" rx="82" ry="70" fill={`url(#${ids.glow})`} opacity="0.75" />
        <path d="M59 129c20-16 42-23 72-21 20 1 43-5 60-18 2-2 6-1 7 2 2 4 0 8-4 11-20 16-47 25-75 24-23 0-38 8-52 19-6 4-15-11-8-17Z" fill={`url(#${ids.cool})`} opacity="0.62" />
        <path d="M72 124c19-8 38-9 60-8 17 1 38-2 54-13" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" opacity="0.55" />

        <circle cx="135" cy="58" r="34" fill={`url(#${ids.warm})`} opacity="0.96" />
        <circle cx="135" cy="58" r="43" fill="#FDE68A" opacity="0.12" />
        <path d="M122 57c0-8 6-14 14-14s14 6 14 14c0 7-4 11-8 15-3 3-5 7-5 12h-4c0-5-2-9-5-12-4-4-6-8-6-15Z" fill="rgba(255,255,255,0.34)" />
        <path d="M126 88h20M128 97h16M131 105h10" stroke="#BFFAFE" strokeWidth="4" strokeLinecap="round" />
        <path d="M127 58c3 4 5 6 8 6s5-2 8-6M135 64v20" stroke="rgba(255,255,255,0.72)" strokeWidth="2.6" strokeLinecap="round" />

        <FloatingCoins ids={ids} warm />
        <path d="M31 122c10-16 19-23 32-27-4 13-12 24-32 27ZM193 119c9-18 14-25 27-31-1 17-7 28-27 31Z" fill={`url(#${ids.violet})`} opacity="0.34" />
      </svg>
    </div>
  );
}

function BudgetWalletIllustration({ className = "" }) {
  const ids = useSvgIds("budget-wallet");

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute bottom-1 right-0 z-0 h-[116px] w-[150px] opacity-[0.72] mix-blend-screen",
        className
      )}
    >
      <svg viewBox="0 0 220 160" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id={ids.cool} x1="28" y1="36" x2="160" y2="151" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67E8F9" />
            <stop offset="0.52" stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#164E63" />
          </linearGradient>
          <linearGradient id={ids.warm} x1="8" y1="66" x2="88" y2="148" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF3C7" />
            <stop offset="0.55" stopColor="#FBBF24" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id={ids.violet} x1="88" y1="22" x2="174" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C4B5FD" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
          <radialGradient id={ids.glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(118 92) rotate(90) scale(84 96)">
            <stop stopColor="#67E8F9" stopOpacity="0.34" />
            <stop offset="0.65" stopColor="#7C3AED" stopOpacity="0.12" />
            <stop offset="1" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="119" cy="100" rx="96" ry="64" fill={`url(#${ids.glow})`} />
        <rect x="65" y="40" width="90" height="54" rx="9" fill={`url(#${ids.violet})`} transform="rotate(-10 65 40)" opacity="0.78" />
        <rect x="84" y="50" width="76" height="48" rx="8" fill="#FBBF24" transform="rotate(8 84 50)" opacity="0.82" />
        <path d="M42 73c0-12 10-22 22-22h92c14 0 26 12 26 26v43c0 14-12 26-26 26H64c-12 0-22-10-22-22V73Z" fill={`url(#${ids.cool})`} opacity="0.95" />
        <path d="M47 86h126M58 132h92" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <path d="M142 86h33c9 0 16 7 16 16v2c0 9-7 16-16 16h-33c-9 0-16-7-16-16v-2c0-9 7-16 16-16Z" fill="rgba(2,6,23,0.28)" stroke="rgba(255,255,255,0.30)" strokeWidth="2" />
        <circle cx="144" cy="103" r="9" fill="#BFFAFE" opacity="0.82" />

        <circle cx="31" cy="111" r="15" fill={`url(#${ids.warm})`} opacity="0.94" />
        <circle cx="32" cy="134" r="17" fill={`url(#${ids.warm})`} opacity="0.86" />
        <circle cx="58" cy="137" r="13" fill={`url(#${ids.warm})`} opacity="0.8" />
        <path d="M27 110h9M31 104v12M27 134h10M32 128v12" stroke="rgba(255,255,255,0.68)" strokeWidth="1.5" strokeLinecap="round" />

        <path d="M185 118c6-19 11-28 24-36-1 20-7 31-24 36ZM20 87c9-17 16-25 30-31-2 18-10 29-30 31Z" fill="#67E8F9" opacity="0.18" />
      </svg>
    </div>
  );
}

function BudgetDetailsIllustration({ className = "" }) {
  const ids = useSvgIds("budget-details");

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute right-5 top-1/2 z-0 h-16 w-24 -translate-y-1/2 opacity-35 mix-blend-screen",
        className
      )}
    >
      <svg viewBox="0 0 160 94" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id={ids.cool} x1="44" y1="12" x2="118" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67E8F9" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id={ids.violet} x1="76" y1="22" x2="145" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C4B5FD" />
            <stop offset="1" stopColor="#4C1D95" />
          </linearGradient>
        </defs>

        <path d="M45 9h55c8 0 14 6 14 14v58l-10-5-9 5-9-5-9 5-9-5-9 5-9-5-10 5V23c0-8 6-14 15-14Z" fill={`url(#${ids.violet})`} opacity="0.58" />
        <path d="M58 31h36M58 47h30M58 63h22" stroke="rgba(255,255,255,0.72)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="103" cy="61" r="22" fill="rgba(103,232,249,0.14)" stroke="rgba(191,250,254,0.82)" strokeWidth="6" />
        <path d="M119 77l21 21" stroke={`url(#${ids.cool})`} strokeWidth="9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function MoneyLeftIllustration({ className = "" }) {
  const ids = useSvgIds("money-left");

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute bottom-0 right-[52px] z-0 h-[92px] w-[126px] opacity-[0.78] mix-blend-screen",
        className
      )}
    >
      <svg viewBox="0 0 210 150" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id={ids.cool} x1="54" y1="38" x2="146" y2="142" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67E8F9" />
            <stop offset="0.62" stopColor="#2563EB" />
            <stop offset="1" stopColor="#312E81" />
          </linearGradient>
          <linearGradient id={ids.warm} x1="96" y1="4" x2="152" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF3C7" />
            <stop offset="0.6" stopColor="#FBBF24" />
            <stop offset="1" stopColor="#FB7185" />
          </linearGradient>
          <radialGradient id={ids.glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 94) rotate(90) scale(67 90)">
            <stop stopColor="#67E8F9" stopOpacity="0.35" />
            <stop offset="0.64" stopColor="#7C3AED" stopOpacity="0.14" />
            <stop offset="1" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="111" cy="101" rx="87" ry="50" fill={`url(#${ids.glow})`} />
        <circle cx="126" cy="29" r="21" fill={`url(#${ids.warm})`} opacity="0.94" />
        <circle cx="126" cy="29" r="15" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
        <path d="M121 29h10M126 21v16" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />

        <path d="M62 73c7-20 26-32 54-32 31 0 55 17 60 43h11c6 0 10 5 10 11s-4 11-10 11h-9c-4 17-18 29-38 34v11h-19v-9h-29v9H73v-12c-18-7-30-20-34-38H25V75h16c5-7 12-13 21-17v15Z" fill={`url(#${ids.cool})`} opacity="0.95" />
        <circle cx="77" cy="92" r="6" fill="#03182C" opacity="0.72" />
        <path d="M65 56c-9-12-20-16-32-12 6 14 17 22 32 24V56Z" fill="#67E8F9" opacity="0.32" />
        <path d="M155 43c6-12 16-15 27-14-3 13-10 21-23 25" stroke="rgba(103,232,249,0.46)" strokeWidth="5" strokeLinecap="round" />
        <path d="M94 72h36" stroke="rgba(255,255,255,0.38)" strokeWidth="4" strokeLinecap="round" />
        <path d="M143 66c8 2 14 7 17 15" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function DashboardCardIllustration({ variant, className = "" }) {
  if (variant === "money-tip") return <MoneyTipIllustration className={className} />;
  if (variant === "budget-wallet") return <BudgetWalletIllustration className={className} />;
  if (variant === "budget-details") return <BudgetDetailsIllustration className={className} />;
  if (variant === "money-left") return <MoneyLeftIllustration className={className} />;
  return null;
}
