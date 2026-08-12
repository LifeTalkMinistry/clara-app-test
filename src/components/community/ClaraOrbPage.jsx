import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

function ClaraOrbVector({ className = "", compact = false }) {
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  const glassId = `clara-orb-glass-${id}`;
  const rimId = `clara-orb-rim-${id}`;
  const blueId = `clara-orb-blue-${id}`;
  const redId = `clara-orb-red-${id}`;
  const goldId = `clara-orb-gold-${id}`;
  const floorId = `clara-orb-floor-${id}`;
  const glowId = `clara-orb-glow-${id}`;
  const softGlowId = `clara-orb-soft-glow-${id}`;

  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
      className={`${className} clara-orb-vector block overflow-visible select-none`}
    >
      <defs>
        <radialGradient id={glassId} cx="36%" cy="27%" r="78%">
          <stop offset="0%" stopColor="#12316a" stopOpacity="0.52" />
          <stop offset="35%" stopColor="#071838" stopOpacity="0.86" />
          <stop offset="73%" stopColor="#020817" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#010217" />
        </radialGradient>

        <linearGradient id={rimId} x1="14%" y1="12%" x2="90%" y2="89%">
          <stop offset="0%" stopColor="#58c9ff" />
          <stop offset="22%" stopColor="#168bff" />
          <stop offset="54%" stopColor="#315fff" />
          <stop offset="76%" stopColor="#a938c7" />
          <stop offset="100%" stopColor="#f32645" />
        </linearGradient>

        <linearGradient id={blueId} x1="19%" y1="10%" x2="75%" y2="90%">
          <stop offset="0%" stopColor="#38d8ff" />
          <stop offset="30%" stopColor="#159cff" />
          <stop offset="72%" stopColor="#0b63ff" />
          <stop offset="100%" stopColor="#2147ff" />
        </linearGradient>

        <linearGradient id={redId} x1="20%" y1="8%" x2="86%" y2="92%">
          <stop offset="0%" stopColor="#ff4b4f" />
          <stop offset="50%" stopColor="#ff1d35" />
          <stop offset="100%" stopColor="#e80e35" />
        </linearGradient>

        <linearGradient id={goldId} x1="30%" y1="0%" x2="72%" y2="100%">
          <stop offset="0%" stopColor="#fff178" />
          <stop offset="26%" stopColor="#ffe13d" />
          <stop offset="100%" stopColor="#ffc400" />
        </linearGradient>

        <linearGradient id={floorId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#168bff" stopOpacity="0" />
          <stop offset="24%" stopColor="#168bff" stopOpacity="0.62" />
          <stop offset="53%" stopColor="#315fff" stopOpacity="0.50" />
          <stop offset="78%" stopColor="#f3267a" stopOpacity="0.44" />
          <stop offset="100%" stopColor="#f32645" stopOpacity="0" />
        </linearGradient>

        <filter id={glowId} x="-65%" y="-65%" width="230%" height="230%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={softGlowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>

      {!compact ? (
        <>
          <ellipse
            cx="160"
            cy="282"
            rx="92"
            ry="10"
            fill={`url(#${floorId})`}
            filter={`url(#${softGlowId})`}
            opacity="0.58"
          />
          <ellipse
            cx="160"
            cy="278"
            rx="62"
            ry="3.2"
            fill={`url(#${floorId})`}
            opacity="0.72"
          />
        </>
      ) : null}

      <circle
        cx="160"
        cy="154"
        r="110"
        fill="#0a2b66"
        opacity="0.26"
        filter={`url(#${softGlowId})`}
      />

      <circle
        cx="160"
        cy="154"
        r="108"
        fill={`url(#${glassId})`}
        stroke={`url(#${rimId})`}
        strokeWidth="3.4"
        filter={`url(#${glowId})`}
      />

      <circle
        cx="160"
        cy="154"
        r="103.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.13"
        strokeWidth="1.2"
      />

      <path
        d="M 88 83 A 104 104 0 0 1 228 72"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="4.4"
        strokeLinecap="round"
      />

      <path
        d="M 209 100 A 78 78 0 1 0 205 217"
        fill="none"
        stroke={`url(#${blueId})`}
        strokeWidth="31"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />

      <path
        d="M 104 207 L 87 244 L 127 227 Z"
        fill={`url(#${blueId})`}
        filter={`url(#${glowId})`}
      />

      <path
        d="M 209 100 A 78 78 0 0 0 190 88"
        fill="none"
        stroke="#7fe7ff"
        strokeOpacity="0.26"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <path
        d="M 235 119 A 76 76 0 0 1 235 195"
        fill="none"
        stroke={`url(#${redId})`}
        strokeWidth="26"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />

      <path
        d="M 231 119 A 76 76 0 0 1 239 137"
        fill="none"
        stroke="#ff8588"
        strokeOpacity="0.30"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <rect
        x="137"
        y="126"
        width="17"
        height="59"
        rx="8.5"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />
      <rect
        x="166"
        y="126"
        width="17"
        height="59"
        rx="8.5"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />

      <rect x="140" y="130" width="3" height="49" rx="1.5" fill="#fffbd2" opacity="0.32" />
      <rect x="169" y="130" width="3" height="49" rx="1.5" fill="#fffbd2" opacity="0.32" />
    </svg>
  );
}

export function ClaraOrbMark({ className = "", title = "CLARA Orb" }) {
  return (
    <span className={`${className} inline-flex items-center justify-center`} title={title}>
      <ClaraOrbVector className="h-full w-full" compact />
    </span>
  );
}

function MoneyLeftOrbVisual({ launching = false }) {
  return (
    <span
      aria-hidden="true"
      className={`clara-orb-asset-shell relative isolate flex h-full w-full items-center justify-center ${
        launching ? "clara-money-left-orb-launching" : "clara-money-left-orb-idle"
      }`}
    >
      <ClaraOrbVector className="h-full w-full" />
    </span>
  );
}

export default function ClaraOrbPage() {
  const [launching, setLaunching] = useState(false);
  const [viewportTop, setViewportTop] = useState(null);
  const pageRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("clara-orb-page-active");
    return () => document.body.classList.remove("clara-orb-page-active");
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;

    const measure = () => {
      const node = pageRef.current;
      if (!node) return;
      const top = Math.max(0, Math.round(node.getBoundingClientRect().top));
      setViewportTop((current) => (current === top ? current : top));
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (pageRef.current?.parentElement) observer?.observe(pageRef.current.parentElement);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  const openClara = () => {
    if (launching || typeof window === "undefined") return;

    setLaunching(true);
    const requestId = `clara-orb-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.dispatchEvent(
      new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
        detail: {
          requestId,
          source: "clara-orb-page",
        },
      })
    );

    window.setTimeout(() => setLaunching(false), 700);
  };

  const measuredViewportStyle =
    viewportTop === null
      ? undefined
      : {
          height: `calc(100dvh - ${viewportTop}px)`,
          minHeight: `calc(100dvh - ${viewportTop}px)`,
          flex: "0 0 auto",
        };

  return (
    <main
      ref={pageRef}
      className="clara-community-orb-view relative flex w-full items-center justify-center overflow-hidden px-5 text-center text-white"
      style={measuredViewportStyle}
      aria-label="CLARA Orb"
      data-clara-orb-page="true"
    >
      <style>{`
        body.clara-orb-page-active #clara-support-world {
          display: none !important;
        }

        .clara-community-root[data-community-view="orb"],
        .clara-community-orb-view {
          background: #010217 !important;
        }

        .clara-community-orb-view {
          isolation: isolate;
        }

        .clara-community-orb-view::before {
          content: none !important;
          display: none !important;
        }

        .clara-orb-asset-shell {
          border-radius: 999px;
        }

        .clara-orb-vector {
          transform: translateZ(0);
          shape-rendering: geometricPrecision;
          text-rendering: geometricPrecision;
        }

        @keyframes clara-money-left-orb-breathe {
          0%, 100% { transform: scale(.992); }
          50% { transform: scale(1.012); }
        }

        @keyframes clara-money-left-orb-tap {
          0% { transform: scale(1); }
          45% { transform: scale(.96); }
          100% { transform: scale(1.02); }
        }

        .clara-money-left-orb-idle {
          animation: clara-money-left-orb-breathe 4.2s ease-in-out infinite;
          transform-origin: center;
        }

        .clara-money-left-orb-launching {
          animation: clara-money-left-orb-tap .52s cubic-bezier(.22,1,.36,1) both;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-money-left-orb-idle,
          .clara-money-left-orb-launching {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="relative z-10 flex w-full max-w-3xl flex-col items-center justify-center"
        style={{ transform: "translateY(clamp(78px, 11dvh, 112px))" }}
        data-clara-orb-visual-offset="down-2"
      >
        <div className="mb-1 select-none">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/42">CLARA ORB</p>
          <div className="mx-auto mt-3 h-px w-24 bg-[linear-gradient(90deg,transparent,#168bff,#ffd84a,#f32645,transparent)] opacity-70" />
        </div>

        <button
          type="button"
          onClick={openClara}
          disabled={launching}
          className="group relative mt-1 grid aspect-square shrink-0 place-items-center outline-none transition active:scale-[0.99] disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#ffd84a]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#010217]"
          style={{ width: "min(78vw, 38dvh, 315px)" }}
          aria-label="Tap CLARA to start Ask Before You Spend"
          data-clara-orb-launcher="true"
          data-clara-orb-visual-source="native-vector"
        >
          <MoneyLeftOrbVisual launching={launching} />
        </button>

        <div className="-mt-1 select-none">
          <h1 className="text-[21px] font-black tracking-[-0.035em] text-white sm:text-[24px]">
            Ask before you spend.
          </h1>
          <p className="mt-2 text-[12px] font-semibold tracking-[0.01em] text-white/48 sm:text-[13px]">
            Tap CLARA to start
          </p>
        </div>
      </div>
    </main>
  );
}
