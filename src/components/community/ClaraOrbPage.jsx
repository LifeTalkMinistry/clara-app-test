import { useEffect, useLayoutEffect, useRef, useState } from "react";
import claraOfficialHomeOrb from "@/assets/clara-official-home-orb.webp";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

export function ClaraOrbMark({ className = "", title = "CLARA Orb" }) {
  return (
    <img
      src={claraOfficialHomeOrb}
      alt={title}
      draggable={false}
      className={`${className} select-none rounded-full object-contain`}
    />
  );
}

function MoneyLeftOrbVisual({ launching = false }) {
  return (
    <span
      aria-hidden="true"
      className={`relative isolate flex h-full w-full items-center justify-center ${
        launching ? "clara-money-left-orb-launching" : "clara-money-left-orb-idle"
      }`}
    >
      <span
        className="pointer-events-none absolute inset-[8%] rounded-full opacity-55 blur-[1px]"
        style={{
          background:
            "radial-gradient(circle, rgba(25,181,255,0.18) 0%, rgba(8,103,255,0.12) 38%, rgba(243,38,69,0.045) 58%, rgba(15,23,42,0) 76%)",
          boxShadow:
            "0 0 14px rgba(8,103,255,0.18), 0 0 22px rgba(243,38,69,0.05)",
        }}
      />

      <span className="pointer-events-none absolute inset-[10%] rounded-full border border-[rgba(77,145,232,0.12)] bg-[rgba(5,18,38,0.30)]" />

      <span
        className="relative z-10 h-[78%] w-[78%] rounded-full border border-[rgba(100,165,247,0.20)] bg-[rgba(4,14,31,0.74)] shadow-[0_0_14px_rgba(8,103,255,0.18),inset_0_1px_0_rgba(255,255,255,0.045)]"
        style={{
          backgroundImage: `url(${claraOfficialHomeOrb})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "96% 96%",
        }}
      />
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
      className="clara-community-orb-view relative flex w-full items-center justify-center overflow-hidden bg-black px-5 text-center text-white"
      style={measuredViewportStyle}
      aria-label="CLARA Orb"
      data-clara-orb-page="true"
    >
      <style>{`
        body.clara-orb-page-active #clara-support-world {
          display: none !important;
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
          className="group relative mt-1 grid aspect-square shrink-0 place-items-center rounded-full outline-none transition active:scale-[0.99] disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#ffd84a]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
          style={{ width: "min(78vw, 38dvh, 315px)" }}
          aria-label="Tap CLARA to start Ask Before You Spend"
          data-clara-orb-launcher="true"
          data-clara-orb-visual-source="money-left-current"
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