import { useId } from "react";

/**
 * Juan is the single visual human anchor for the CLARA guided tour.
 * Keep his face, hair, shirt and proportions fixed. Pose may change, identity may not.
 */
export default function JuanCharacter({
  pose = "phone",
  className = "",
  compact = false,
  ariaLabel = "Juan",
}) {
  const rawId = useId().replace(/:/g, "");
  const skinId = `juan-skin-${rawId}`;
  const shirtId = `juan-shirt-${rawId}`;
  const glowId = `juan-glow-${rawId}`;
  const bgId = `juan-bg-${rawId}`;
  const phonePose = pose === "phone";
  const thinkingPose = pose === "thinking";

  return (
    <div
      className={`clara-juan-character ${compact ? "is-compact" : ""} ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
      data-juan-pose={pose}
    >
      <svg viewBox="0 0 280 340" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={bgId} cx="50%" cy="34%" r="62%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.22" />
            <stop offset="56%" stopColor="#0a1b3c" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={skinId} x1="28%" y1="8%" x2="74%" y2="92%">
            <stop offset="0%" stopColor="#d69a73" />
            <stop offset="50%" stopColor="#bd7653" />
            <stop offset="100%" stopColor="#98583e" />
          </linearGradient>
          <linearGradient id={shirtId} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#13264b" />
            <stop offset="100%" stopColor="#071326" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="140" cy="174" rx="126" ry="152" fill={`url(#${bgId})`} />
        <ellipse cx="140" cy="323" rx="91" ry="9" fill="#2563eb" opacity="0.09" />

        {/* shoulders / shirt */}
        <path
          d="M61 340c4-64 20-102 52-117 16-8 38-11 55-7 31 8 46 40 52 124Z"
          fill={`url(#${shirtId})`}
        />
        <path d="M106 226c11 9 22 14 34 14 13 0 25-5 36-15l10 14c-13 15-28 22-46 22-17 0-32-7-44-20Z" fill="#0b1a35" />

        {/* neck */}
        <path d="M117 191h47l3 42c-7 11-17 17-29 17-11 0-21-5-28-15Z" fill={`url(#${skinId})`} />
        <path d="M118 202c10 9 21 13 33 10 6-1 10-4 14-7l1 14c-8 7-18 11-28 11-8 0-15-2-21-6Z" fill="#824832" opacity="0.22" />

        {/* ears */}
        <ellipse cx="91" cy="140" rx="13" ry="22" fill={`url(#${skinId})`} />
        <ellipse cx="189" cy="140" rx="13" ry="22" fill={`url(#${skinId})`} />
        <path d="M88 137c6-5 11 0 8 8" fill="none" stroke="#7b4938" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
        <path d="M192 137c-6-5-11 0-8 8" fill="none" stroke="#7b4938" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />

        {/* head */}
        <path
          d="M94 126c0-46 18-73 48-73 32 0 52 26 52 72 0 52-23 89-52 89-28 0-48-37-48-88Z"
          fill={`url(#${skinId})`}
        />
        <path d="M104 167c8 22 22 36 38 36 18 0 32-14 42-37-4 28-20 49-42 49-21 0-35-19-38-48Z" fill="#8b4d38" opacity="0.12" />

        {/* hair - fixed identity */}
        <path
          d="M90 121c-3-19 0-38 10-51 13-17 31-25 55-24 25 1 42 12 51 30 5 10 7 23 5 38-7-9-13-19-18-31-14 10-31 13-52 11-18-2-34 1-51 27Z"
          fill="#0b1220"
        />
        <path d="M97 83c17-29 50-41 79-25 9 5 17 13 22 23-18-11-37-14-57-8-17 5-31 15-44 30Z" fill="#172033" opacity="0.9" />
        <path d="M111 72c17-14 39-18 59-10" fill="none" stroke="#2f4268" strokeWidth="5" strokeLinecap="round" opacity="0.46" />

        {/* brows */}
        <path d="M108 125c8-5 16-5 24-1" fill="none" stroke="#311f1b" strokeWidth="4" strokeLinecap="round" />
        <path d="M153 124c9-4 17-3 24 2" fill="none" stroke="#311f1b" strokeWidth="4" strokeLinecap="round" />

        {/* eyes */}
        <ellipse cx="121" cy="136" rx="4" ry="3.2" fill="#171313" />
        <ellipse cx="164" cy="136" rx="4" ry="3.2" fill="#171313" />
        <circle cx="122" cy="135" r="1" fill="#fff" opacity="0.58" />
        <circle cx="165" cy="135" r="1" fill="#fff" opacity="0.58" />

        {/* nose */}
        <path d="M143 137c-2 9-3 17-1 22 2 3 6 4 10 1" fill="none" stroke="#854e3b" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />

        {/* subtle friendly smile */}
        <path d="M125 176c11 8 24 8 35-1" fill="none" stroke="#6f372f" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M130 178c8 4 17 4 25 0" fill="none" stroke="#f3c9ba" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />

        {/* left arm */}
        <path d="M87 255c-16 17-26 43-31 85h39c2-28 8-51 21-66Z" fill={`url(#${skinId})`} />

        {phonePose ? (
          <>
            {/* forearm holding phone */}
            <path d="M98 278c4-19 14-32 27-41 6-4 12-2 16 3 4 6 2 12-4 16-9 6-15 16-18 29l-8 35-30-9Z" fill={`url(#${skinId})`} />
            <g transform="translate(82 244) rotate(-9 31 51)">
              <rect x="5" y="0" width="53" height="91" rx="10" fill="#111827" stroke="#506078" strokeWidth="2" />
              <rect x="10" y="6" width="43" height="78" rx="7" fill="#07111f" />
              <circle cx="17" cy="13" r="4" fill="#263449" />
              <circle cx="27" cy="13" r="4" fill="#263449" />
              <circle cx="17" cy="23" r="4" fill="#263449" />
              <path d="M18 72h27" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
            </g>
            <path d="M113 273c9-1 17 2 23 7" fill="none" stroke="#7d4535" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
          </>
        ) : thinkingPose ? (
          <>
            <path d="M189 260c24 7 36 20 37 42 1 14-4 25-15 32h-30c13-13 17-25 11-36-5-10-12-18-22-24Z" fill={`url(#${skinId})`} />
            <path d="M188 267c1-29 2-44 4-47 3-5 9-7 14-4 5 2 7 8 5 13l-10 31Z" fill={`url(#${skinId})`} />
          </>
        ) : (
          <path d="M186 253c19 18 30 47 34 87h-39c-3-29-10-53-22-70Z" fill={`url(#${skinId})`} />
        )}

        {/* small CLARA blue rim light */}
        <path d="M93 118c-1-23 5-41 18-53 13-12 28-18 46-18" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.48" filter={`url(#${glowId})`} />
        <path d="M66 337c7-55 23-89 48-105" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.28" />
      </svg>
    </div>
  );
}
