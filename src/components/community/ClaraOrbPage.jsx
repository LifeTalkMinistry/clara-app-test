import { useEffect, useState } from "react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

export function ClaraOrbMark({ className = "", title = "CLARA Orb" }) {
  return (
    <svg
      viewBox="0 0 320 320"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M216 64C193 47 166 38 138 40C80 43 35 91 36 149C37 193 62 231 100 250L84 291L132 267C144 271 156 273 169 272C191 271 212 264 230 251"
        stroke="#168BFF"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M240 91C258 111 268 138 268 166C268 196 257 224 237 245"
        stroke="#F32645"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="127" y="119" width="23" height="84" rx="11.5" fill="#FFD84A" />
      <rect x="171" y="119" width="23" height="84" rx="11.5" fill="#FFD84A" />
    </svg>
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

        @keyframes clara-orb-breathe {
          0%, 100% { transform: scale(0.985); filter: drop-shadow(0 0 22px rgba(22,139,255,.30)) drop-shadow(0 0 13px rgba(243,38,69,.12)); }
          50% { transform: scale(1.018); filter: drop-shadow(0 0 38px rgba(22,139,255,.46)) drop-shadow(0 0 22px rgba(255,216,74,.13)) drop-shadow(0 0 20px rgba(243,38,69,.18)); }
        }

        @keyframes clara-orb-ring-breathe {
          0%, 100% { opacity: .22; transform: scale(.91); }
          50% { opacity: .48; transform: scale(1.04); }
        }

        @keyframes clara-orb-tap {
          0% { transform: scale(1); }
          45% { transform: scale(.94); }
          100% { transform: scale(1.04); }
        }

        .clara-orb-mark-idle {
          animation: clara-orb-breathe 4.2s ease-in-out infinite;
          transform-origin: center;
        }

        .clara-orb-mark-launching {
          animation: clara-orb-tap .52s cubic-bezier(.22,1,.36,1) both;
          transform-origin: center;
        }

        .clara-orb-halo {
          animation: clara-orb-ring-breathe 4.2s ease-in-out infinite;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-orb-mark-idle,
          .clara-orb-mark-launching,
          .clara-orb-halo {
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
        <div className="mb-2 select-none">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/42">CLARA ORB</p>
          <div className="mx-auto mt-3 h-px w-24 bg-[linear-gradient(90deg,transparent,#168bff,#ffd84a,#f32645,transparent)] opacity-70" />
        </div>

        <button
          type="button"
          onClick={openClara}
          disabled={launching}
          className="group relative mt-2 grid aspect-square w-[min(82vw,390px)] max-h-[54dvh] place-items-center rounded-full outline-none transition active:scale-[0.985] disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#ffd84a]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#020817]"
          aria-label="Tap CLARA to start Ask Before You Spend"
          data-clara-orb-launcher="true"
        >
          <span className="clara-orb-halo pointer-events-none absolute inset-[8%] rounded-full border border-[#168bff]/24 shadow-[0_0_80px_rgba(8,103,255,.22),0_0_120px_rgba(243,38,69,.08)]" />
          <span className="pointer-events-none absolute inset-[16%] rounded-full bg-[radial-gradient(circle,rgba(8,103,255,.12),rgba(2,8,23,.05)_58%,transparent_72%)] blur-sm" />
          <ClaraOrbMark
            className={`relative z-10 h-[82%] w-[82%] ${launching ? "clara-orb-mark-launching" : "clara-orb-mark-idle"}`}
          />
        </button>

        <div className="-mt-2 select-none">
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
