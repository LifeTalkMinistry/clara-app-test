import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/icon.png";

export const POST_LOGIN_WELCOME_KEY = "clara_post_login_welcome";

function readPendingWelcome() {
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_WELCOME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingWelcome() {
  try {
    sessionStorage.removeItem(POST_LOGIN_WELCOME_KEY);
  } catch {}
}

export function queuePostLoginWelcome(payload = {}) {
  try {
    sessionStorage.setItem(
      POST_LOGIN_WELCOME_KEY,
      JSON.stringify({
        queuedAt: Date.now(),
        ...payload,
      })
    );
  } catch {}
}

export default function WelcomeBackTransition({ redirectTo = "/dashboard" }) {
  const navigate = useNavigate();
  const pendingWelcome = useMemo(() => readPendingWelcome(), []);

  useEffect(() => {
    const finalize = () => {
      clearPendingWelcome();
      navigate(redirectTo, { replace: true });
    };

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!pendingWelcome || prefersReducedMotion) {
      finalize();
      return;
    }

    const timer = setTimeout(finalize, 3800);
    return () => clearTimeout(timer);
  }, [navigate, pendingWelcome, redirectTo]);

  return (
    <div className="fixed inset-0 z-[99999] flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%,rgba(0,0,0,0.35))]" />
      <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl animate-[claraIntroGlow_3.8s_ease-in-out_both]" />
      <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl animate-[claraIntroGlow_3.8s_ease-in-out_both]" />

      <div className="relative flex flex-col items-center justify-center animate-[claraIntroStage_3.8s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
          <div className="absolute inset-[-28px] rounded-[3rem] bg-gradient-to-br from-emerald-300/35 via-cyan-300/20 to-transparent blur-3xl" />
          <div className="absolute inset-0 rounded-[2.2rem] bg-gradient-to-br from-white/16 via-white/5 to-transparent ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_90px_rgba(45,212,191,0.32)]" />
          <img
            src={logo}
            alt="CLARA Logo"
            className="relative h-36 w-36 object-contain drop-shadow-[0_0_32px_rgba(45,212,191,0.42)] sm:h-44 sm:w-44"
          />
        </div>

        <div className="mt-7 text-center animate-[claraIntroText_3.8s_ease-out_both]">
          <p className="font-heading text-4xl font-bold tracking-[0.22em] text-white drop-shadow-[0_0_24px_rgba(45,212,191,0.28)] sm:text-5xl">
            CLARA
          </p>
          <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-emerald-100/70">
            Life OS initializing
          </p>
        </div>
      </div>

      <style>{`
        @keyframes claraIntroStage {
          0% {
            opacity: 0;
            transform: scale(0.34);
            filter: blur(18px);
          }
          18% {
            opacity: 1;
            filter: blur(0);
          }
          58% {
            opacity: 1;
            transform: scale(1.22);
          }
          78% {
            opacity: 1;
            transform: scale(1.14);
          }
          100% {
            opacity: 0;
            transform: scale(1.08);
            filter: blur(8px);
          }
        }

        @keyframes claraIntroText {
          0%, 18% {
            opacity: 0;
            transform: translateY(12px);
          }
          34%, 82% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-6px);
          }
        }

        @keyframes claraIntroGlow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          35% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          82% { opacity: 0.95; transform: translate(-50%, -50%) scale(1.12); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
