import { useEffect, useState } from "react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const resolveOrbAssetSrc = (assetPath = "") => {
  const trimmedPath = String(assetPath || "").trim();
  if (!trimmedPath) return "";
  if (/^(https?:|data:|blob:)/.test(trimmedPath)) return trimmedPath;
  if (trimmedPath.startsWith("/")) {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBaseUrl}${trimmedPath.replace(/^\/+/, "")}`;
  }
  return trimmedPath;
};

const CLARA_ORB_LOGO_SRC = resolveOrbAssetSrc("/images/clara/clara-orb-logo.png");

export function ClaraOrbMark({ className = "", title = "CLARA Orb" }) {
  return (
    <img
      src={CLARA_ORB_LOGO_SRC}
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
      className={`clara-money-left-orb-scale relative isolate flex h-full w-full items-center justify-center ${
        launching ? "clara-money-left-orb-launching" : "clara-money-left-orb-idle"
      }`}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-90 blur-[1px]"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.28) 0%, rgba(59,130,246,0.22) 34%, rgba(124,58,237,0.30) 58%, rgba(15,23,42,0.00) 76%)",
          boxShadow:
            "0 0 18px rgba(34,211,238,0.42), 0 0 34px rgba(124,58,237,0.36)",
        }}
      />

      <span className="pointer-events-none absolute inset-[13.15%] rounded-full border border-cyan-100/20 bg-white/[0.055]" />

      <span className="relative z-10 flex h-[57.9%] w-[57.9%] items-center justify-center rounded-full border border-cyan-100/20 bg-white/[0.09] text-white shadow-[0_0_18px_rgba(34,211,238,0.38)]">
        <img
          src={CLARA_ORB_LOGO_SRC}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="h-full w-full scale-[1.12] select-none rounded-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.42)]"
        />
      </span>
    </span>
  );
}

export default function ClaraOrbPage() {
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("clara-orb-page-active");
    return () => document.body.classList.remove("clara-orb-page-active");
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

  return (
    <main
      className="clara-community-orb-view relative min-h-0 flex-1 overflow-hidden bg-[#020817]"
      aria-label="CLARA Orb"
      data-clara-orb-page="true"
    >
      <style>{`
        body.clara-orb-page-active #clara-support-world {
          display: none !important;
        }

        @keyframes clara-money-left-orb-breathe {
          0%, 100% { transform: scale(.985); }
          50% { transform: scale(1.018); }
        }

        @keyframes clara-money-left-orb-tap {
          0% { transform: scale(1); }
          45% { transform: scale(.94); }
          100% { transform: scale(1.035); }
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

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[8%] h-[46%] w-[72%] rounded-full bg-[#0867ff]/18 blur-[90px]" />
        <div className="absolute -right-24 top-[16%] h-[42%] w-[58%] rounded-full bg-[#f32645]/12 blur-[100px]" />
        <div className="absolute left-1/2 top-[45%] h-44 w-44 -translate-x-1/2 rounded-full bg-[#ffd84a]/[0.055] blur-[85px]" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[linear-gradient(180deg,rgba(2,8,23,0),rgba(2,6,18,.92))]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full min-h-full w-full max-w-3xl flex-col items-center justify-center px-5 pb-[max(34px,env(safe-area-inset-bottom))] pt-6 text-center text-white">
        <div className="mb-1 select-none">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/42">CLARA ORB</p>
          <div className="mx-auto mt-3 h-px w-24 bg-[linear-gradient(90deg,transparent,#168bff,#ffd84a,#f32645,transparent)] opacity-70" />
        </div>

        <button
          type="button"
          onClick={openClara}
          disabled={launching}
          className="group relative mt-1 grid aspect-square w-[min(80vw,330px)] max-h-[56dvh] place-items-center rounded-full outline-none transition active:scale-[0.985] disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#ffd84a]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#020817]"
          aria-label="Tap CLARA to start Ask Before You Spend"
          data-clara-orb-launcher="true"
          data-clara-orb-visual-source="money-left"
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
