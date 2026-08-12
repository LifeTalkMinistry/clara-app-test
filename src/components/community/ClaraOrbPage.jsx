import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const CLARA_BLUE_PATH =
  "M 163.3 72.0 L 158.9 72.2 L 154.5 72.5 L 150.1 72.7 L 145.9 73.1 L 141.7 74.1 L 137.5 75.2 L 133.4 76.5 L 129.2 77.8 L 125.3 79.6 L 121.6 81.5 L 117.7 83.4 L 114.3 85.6 L 110.9 87.5 L 107.5 89.9 L 104.5 92.8 L 101.6 95.4 L 99.2 98.3 L 96.5 101.2 L 94.3 104.3 L 92.0 107.6 L 89.8 110.9 L 87.9 114.1 L 86.0 117.9 L 83.7 121.0 L 82.6 123.9 L 81.2 128.0 L 80.1 132.0 L 79.3 136.2 L 78.8 140.2 L 78.1 143.8 L 78.2 148.1 L 78.2 152.7 L 79.0 156.6 L 79.0 161.0 L 79.5 165.2 L 81.1 169.2 L 82.3 173.4 L 83.1 177.5 L 85.0 180.9 L 86.7 184.6 L 88.7 188.5 L 91.1 191.8 L 92.6 195.8 L 92.3 200.0 L 91.4 204.3 L 90.6 208.6 L 89.6 212.9 L 88.7 217.2 L 87.5 221.4 L 86.8 225.6 L 85.8 229.9 L 89.9 228.5 L 94.0 227.1 L 98.1 225.7 L 102.2 224.3 L 106.4 223.0 L 110.4 221.6 L 114.6 220.6 L 118.1 220.7 L 121.8 222.5 L 125.5 224.7 L 129.4 226.6 L 133.4 228.3 L 137.5 229.7 L 141.6 231.0 L 145.8 232.1 L 149.6 232.8 L 154.0 233.5 L 158.5 233.8 L 163.2 233.8 L 167.8 233.7 L 172.2 233.1 L 176.6 232.3 L 180.9 231.4 L 185.1 230.2 L 189.1 228.7 L 193.1 227.0 L 197.0 225.1 L 200.7 222.7 L 202.7 218.9 L 202.0 214.6 L 199.4 211.0 L 196.5 207.5 L 193.0 204.8 L 188.6 204.8 L 184.6 206.3 L 180.5 207.8 L 176.3 209.0 L 172.0 209.9 L 167.6 210.5 L 163.0 210.7 L 158.3 210.7 L 153.9 210.1 L 149.6 209.1 L 145.4 208.0 L 141.3 206.5 L 137.4 204.8 L 133.6 202.7 L 129.8 200.4 L 126.3 197.7 L 122.8 194.7 L 119.5 191.4 L 116.6 187.9 L 114.1 184.3 L 111.8 180.6 L 109.8 176.7 L 108.0 172.8 L 106.7 168.6 L 105.6 164.4 L 104.8 160.1 L 104.4 156.8 L 104.2 152.9 L 104.4 148.9 L 105.4 144.9 L 106.1 140.5 L 107.3 136.3 L 108.7 132.3 L 110.5 128.3 L 112.6 124.7 L 115.0 121.4 L 117.7 117.8 L 120.1 114.7 L 123.1 112.0 L 126.0 109.5 L 129.2 107.0 L 132.6 104.6 L 136.1 102.6 L 140.0 100.7 L 143.7 98.9 L 147.7 98.0 L 151.8 96.9 L 156.2 96.1 L 160.8 95.9 L 165.4 96.1 L 169.9 96.5 L 174.2 97.3 L 178.4 98.6 L 182.5 99.9 L 186.4 101.7 L 190.2 103.8 L 194.0 106.0 L 197.7 108.4 L 202.1 108.2 L 205.4 105.3 L 208.7 102.0 L 211.4 98.4 L 212.6 94.4 L 210.6 90.9 L 207.8 87.7 L 204.3 85.4 L 200.6 83.0 L 196.8 80.9 L 192.8 79.4 L 188.8 77.7 L 184.8 76.3 L 180.8 75.0 L 176.5 74.1 L 172.0 73.7 L 167.6 72.9 Z";

const CLARA_RED_PATH =
  "M 223.0 108.6 L 220.5 110.0 L 218.2 112.0 L 216.1 114.2 L 213.8 116.3 L 211.9 118.6 L 211.0 121.3 L 211.6 124.1 L 212.9 126.6 L 214.2 129.1 L 215.3 131.8 L 216.3 134.4 L 217.1 137.2 L 217.9 140.0 L 218.5 142.8 L 219.0 145.6 L 219.4 148.6 L 219.6 151.6 L 219.6 154.6 L 219.4 157.6 L 219.0 160.6 L 218.6 163.5 L 218.0 166.3 L 217.3 169.1 L 216.5 171.8 L 215.6 174.5 L 214.4 177.1 L 213.3 179.7 L 211.9 182.2 L 210.4 184.7 L 208.9 187.1 L 207.1 189.5 L 205.5 191.9 L 204.6 194.6 L 205.1 197.4 L 206.7 199.9 L 208.6 202.1 L 210.4 204.4 L 212.4 206.7 L 214.6 208.5 L 217.5 209.0 L 220.2 208.0 L 222.3 206.0 L 224.2 203.7 L 225.9 201.5 L 227.6 199.2 L 229.3 197.0 L 231.0 195.0 L 231.9 192.3 L 233.2 190.0 L 234.4 187.4 L 235.6 184.8 L 236.5 182.3 L 237.6 179.7 L 238.4 177.0 L 239.3 174.2 L 239.9 171.4 L 240.5 168.6 L 241.0 165.7 L 241.4 162.8 L 241.8 159.9 L 242.0 156.9 L 242.0 153.8 L 242.0 150.7 L 241.8 147.7 L 241.5 144.8 L 241.0 141.9 L 240.7 139.0 L 240.1 136.1 L 239.3 133.4 L 238.6 130.6 L 237.7 127.9 L 236.7 125.2 L 235.6 122.6 L 234.4 120.0 L 233.2 117.5 L 231.7 115.0 L 230.2 112.5 L 228.5 110.2 L 226.0 108.8 Z";

function ClaraOrbVector({ className = "", compact = false }) {
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  const glassId = `clara-orb-glass-${id}`;
  const ambientId = `clara-orb-ambient-${id}`;
  const rimId = `clara-orb-rim-${id}`;
  const blueId = `clara-orb-blue-${id}`;
  const redId = `clara-orb-red-${id}`;
  const goldId = `clara-orb-gold-${id}`;
  const floorId = `clara-orb-floor-${id}`;
  const glowId = `clara-orb-glow-${id}`;
  const softGlowId = `clara-orb-soft-glow-${id}`;
  const logoGlowId = `clara-orb-logo-glow-${id}`;

  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
      className={`${className} clara-orb-vector block overflow-visible select-none`}
    >
      <defs>
        <radialGradient id={glassId} cx="39%" cy="27%" r="78%">
          <stop offset="0%" stopColor="#173874" stopOpacity="0.78" />
          <stop offset="30%" stopColor="#081b42" stopOpacity="0.95" />
          <stop offset="67%" stopColor="#02081c" />
          <stop offset="100%" stopColor="#010217" />
        </radialGradient>

        <radialGradient id={ambientId} cx="42%" cy="34%" r="66%">
          <stop offset="0%" stopColor="#2e69c7" stopOpacity="0.15" />
          <stop offset="58%" stopColor="#0b1b3a" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#010217" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={rimId} x1="7%" y1="13%" x2="94%" y2="87%">
          <stop offset="0%" stopColor="#58c9ff" />
          <stop offset="18%" stopColor="#20bfff" />
          <stop offset="43%" stopColor="#1475ff" />
          <stop offset="65%" stopColor="#4c52ff" />
          <stop offset="82%" stopColor="#d62db5" />
          <stop offset="100%" stopColor="#ff3358" />
        </linearGradient>

        <linearGradient id={blueId} x1="18%" y1="8%" x2="79%" y2="94%">
          <stop offset="0%" stopColor="#3be4ff" />
          <stop offset="24%" stopColor="#1fc5ff" />
          <stop offset="55%" stopColor="#1591ff" />
          <stop offset="82%" stopColor="#0e5aff" />
          <stop offset="100%" stopColor="#2544ff" />
        </linearGradient>

        <linearGradient id={redId} x1="24%" y1="6%" x2="76%" y2="96%">
          <stop offset="0%" stopColor="#ff5558" />
          <stop offset="31%" stopColor="#ff2538" />
          <stop offset="73%" stopColor="#ff102d" />
          <stop offset="100%" stopColor="#e90c35" />
        </linearGradient>

        <linearGradient id={goldId} x1="28%" y1="0%" x2="72%" y2="100%">
          <stop offset="0%" stopColor="#fff58a" />
          <stop offset="26%" stopColor="#ffe548" />
          <stop offset="76%" stopColor="#ffd01c" />
          <stop offset="100%" stopColor="#ffbd00" />
        </linearGradient>

        <linearGradient id={floorId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#168bff" stopOpacity="0" />
          <stop offset="24%" stopColor="#168bff" stopOpacity="0.65" />
          <stop offset="52%" stopColor="#315fff" stopOpacity="0.58" />
          <stop offset="77%" stopColor="#e52b95" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#f32645" stopOpacity="0" />
        </linearGradient>

        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={logoGlowId} x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={softGlowId} x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {!compact ? (
        <>
          <ellipse
            cx="160"
            cy="281"
            rx="80"
            ry="8"
            fill={`url(#${floorId})`}
            filter={`url(#${softGlowId})`}
            opacity="0.58"
          />
          <ellipse
            cx="160"
            cy="278.5"
            rx="56"
            ry="2.5"
            fill={`url(#${floorId})`}
            opacity="0.76"
          />
        </>
      ) : null}

      <circle
        cx="160"
        cy="153"
        r="117"
        fill="#0b2a66"
        opacity="0.20"
        filter={`url(#${softGlowId})`}
      />

      <circle
        cx="160"
        cy="153"
        r="113"
        fill={`url(#${glassId})`}
        stroke={`url(#${rimId})`}
        strokeWidth="3.4"
        filter={`url(#${glowId})`}
      />

      <circle
        cx="160"
        cy="153"
        r="107"
        fill={`url(#${ambientId})`}
        stroke="#8bcfff"
        strokeOpacity="0.06"
        strokeWidth="1"
      />

      <path
        d={CLARA_BLUE_PATH}
        fill={`url(#${blueId})`}
        stroke="#78dcff"
        strokeOpacity="0.16"
        strokeWidth="1"
        strokeLinejoin="round"
        filter={`url(#${logoGlowId})`}
      />

      <path
        d={CLARA_RED_PATH}
        fill={`url(#${redId})`}
        stroke="#ff9a95"
        strokeOpacity="0.18"
        strokeWidth="0.9"
        strokeLinejoin="round"
        filter={`url(#${logoGlowId})`}
      />

      <rect
        x="142.6"
        y="126.5"
        width="14.6"
        height="55.3"
        rx="7.3"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />
      <rect
        x="167.3"
        y="126.5"
        width="14.6"
        height="55.3"
        rx="7.3"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />

      <rect x="145.0" y="131.3" width="2.2" height="44" rx="1.1" fill="#fffde6" opacity="0.34" />
      <rect x="169.7" y="131.3" width="2.2" height="44" rx="1.1" fill="#fffde6" opacity="0.34" />
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
          data-clara-orb-visual-source="native-vector-v3"
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
