import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

function ClaraOrbVector({ className = "", compact = false }) {
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  const glassId = `clara-orb-glass-${id}`;
  const glassAmbientId = `clara-orb-glass-ambient-${id}`;
  const rimId = `clara-orb-rim-${id}`;
  const rimGlowId = `clara-orb-rim-glow-${id}`;
  const blueId = `clara-orb-blue-${id}`;
  const blueHighlightId = `clara-orb-blue-highlight-${id}`;
  const redId = `clara-orb-red-${id}`;
  const goldId = `clara-orb-gold-${id}`;
  const floorId = `clara-orb-floor-${id}`;
  const centerShadowId = `clara-orb-center-shadow-${id}`;
  const glowId = `clara-orb-glow-${id}`;
  const softGlowId = `clara-orb-soft-glow-${id}`;
  const tightGlowId = `clara-orb-tight-glow-${id}`;

  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
      className={`${className} clara-orb-vector block overflow-visible select-none`}
    >
      <defs>
        <radialGradient id={glassId} cx="42%" cy="30%" r="76%">
          <stop offset="0%" stopColor="#132e67" stopOpacity="0.88" />
          <stop offset="28%" stopColor="#071a40" stopOpacity="0.97" />
          <stop offset="68%" stopColor="#02071b" />
          <stop offset="100%" stopColor="#010217" />
        </radialGradient>

        <radialGradient id={glassAmbientId} cx="44%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#173d82" stopOpacity="0.24" />
          <stop offset="48%" stopColor="#07152f" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#010217" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={rimId} x1="9%" y1="17%" x2="92%" y2="83%">
          <stop offset="0%" stopColor="#8deaff" />
          <stop offset="15%" stopColor="#28c5ff" />
          <stop offset="38%" stopColor="#177cff" />
          <stop offset="58%" stopColor="#4a5bff" />
          <stop offset="78%" stopColor="#d02dbe" />
          <stop offset="100%" stopColor="#ff365d" />
        </linearGradient>

        <linearGradient id={rimGlowId} x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#1ec8ff" />
          <stop offset="48%" stopColor="#166dff" />
          <stop offset="75%" stopColor="#8b36ff" />
          <stop offset="100%" stopColor="#ff2859" />
        </linearGradient>

        <linearGradient id={blueId} x1="22%" y1="9%" x2="72%" y2="94%">
          <stop offset="0%" stopColor="#43e7ff" />
          <stop offset="24%" stopColor="#20c8ff" />
          <stop offset="53%" stopColor="#1595ff" />
          <stop offset="80%" stopColor="#1160ff" />
          <stop offset="100%" stopColor="#2347ff" />
        </linearGradient>

        <linearGradient id={blueHighlightId} x1="22%" y1="0%" x2="78%" y2="100%">
          <stop offset="0%" stopColor="#d8fbff" stopOpacity="0.88" />
          <stop offset="45%" stopColor="#68eaff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#2a69ff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={redId} x1="28%" y1="3%" x2="75%" y2="97%">
          <stop offset="0%" stopColor="#ff5a5e" />
          <stop offset="28%" stopColor="#ff253c" />
          <stop offset="68%" stopColor="#ff102c" />
          <stop offset="100%" stopColor="#e90b36" />
        </linearGradient>

        <linearGradient id={goldId} x1="28%" y1="0%" x2="72%" y2="100%">
          <stop offset="0%" stopColor="#fff78c" />
          <stop offset="23%" stopColor="#ffe651" />
          <stop offset="72%" stopColor="#ffd21f" />
          <stop offset="100%" stopColor="#ffbd00" />
        </linearGradient>

        <linearGradient id={floorId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#168bff" stopOpacity="0" />
          <stop offset="20%" stopColor="#168bff" stopOpacity="0.68" />
          <stop offset="48%" stopColor="#315fff" stopOpacity="0.60" />
          <stop offset="68%" stopColor="#a13ce8" stopOpacity="0.54" />
          <stop offset="84%" stopColor="#f32668" stopOpacity="0.50" />
          <stop offset="100%" stopColor="#f32645" stopOpacity="0" />
        </linearGradient>

        <radialGradient id={centerShadowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000714" stopOpacity="0.96" />
          <stop offset="58%" stopColor="#010617" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#02071b" stopOpacity="0" />
        </radialGradient>

        <filter id={glowId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="6.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={tightGlowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={softGlowId} x="-85%" y="-85%" width="270%" height="270%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {!compact ? (
        <>
          <ellipse
            cx="160"
            cy="282"
            rx="82"
            ry="9"
            fill={`url(#${floorId})`}
            filter={`url(#${softGlowId})`}
            opacity="0.62"
          />
          <ellipse
            cx="160"
            cy="278.5"
            rx="58"
            ry="2.7"
            fill={`url(#${floorId})`}
            opacity="0.86"
          />
        </>
      ) : null}

      <circle
        cx="160"
        cy="152"
        r="111"
        fill="#0b2a66"
        opacity="0.28"
        filter={`url(#${softGlowId})`}
      />

      <circle
        cx="160"
        cy="152"
        r="108.5"
        fill="none"
        stroke={`url(#${rimGlowId})`}
        strokeWidth="8"
        opacity="0.34"
        filter={`url(#${softGlowId})`}
      />

      <circle
        cx="160"
        cy="152"
        r="107"
        fill={`url(#${glassId})`}
        stroke={`url(#${rimId})`}
        strokeWidth="3.7"
      />

      <circle
        cx="160"
        cy="152"
        r="101.8"
        fill={`url(#${glassAmbientId})`}
        stroke="#b9edff"
        strokeOpacity="0.11"
        strokeWidth="1.1"
      />

      <path
        d="M 76 104 C 92 67 126 48 169 45 C 205 43 236 55 254 80"
        fill="none"
        stroke="#d9f6ff"
        strokeOpacity="0.24"
        strokeWidth="9"
        strokeLinecap="round"
        filter={`url(#${tightGlowId})`}
      />

      <path
        d="M 83 91 C 111 55 157 45 203 53 C 225 57 242 65 253 79"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.34"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <path
        d="M 215.5 91.1 A 83 83 0 1 1 214.4 214.6 L 196.1 193.5 A 55 55 0 1 0 196.8 111.1 Z"
        fill={`url(#${blueId})`}
        filter={`url(#${tightGlowId})`}
      />

      <path
        d="M 111 199 L 84 236 L 126 219 Z"
        fill={`url(#${blueId})`}
        filter={`url(#${tightGlowId})`}
      />

      <path
        d="M 105 90 C 132 69 172 65 201 78 C 208 81 214 84 219 89"
        fill="none"
        stroke={`url(#${blueHighlightId})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        opacity="0.78"
      />

      <path
        d="M 103 204 C 112 212 121 217 131 220"
        fill="none"
        stroke="#4f98ff"
        strokeOpacity="0.24"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <circle
        cx="160"
        cy="153"
        r="50"
        fill={`url(#${centerShadowId})`}
        opacity="0.92"
      />

      <path
        d="M 229.7 114.9 A 79 79 0 0 1 220.5 202.8 L 202.9 188 A 56 56 0 0 0 209.4 125.7 Z"
        fill={`url(#${redId})`}
        filter={`url(#${tightGlowId})`}
      />

      <path
        d="M 226 119 C 232 134 234 150 232 164"
        fill="none"
        stroke="#ffb0ad"
        strokeOpacity="0.30"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <rect
        x="137"
        y="121"
        width="18"
        height="65"
        rx="9"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />
      <rect
        x="165"
        y="121"
        width="18"
        height="65"
        rx="9"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />

      <rect x="140" y="126" width="3.4" height="52" rx="1.7" fill="#fffce0" opacity="0.38" />
      <rect x="168" y="126" width="3.4" height="52" rx="1.7" fill="#fffce0" opacity="0.38" />
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
          data-clara-orb-visual-source="native-vector-v2"
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
