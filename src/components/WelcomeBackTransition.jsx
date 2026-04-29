import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/icon.png";

export const POST_LOGIN_WELCOME_KEY = "clara_post_login_welcome";

const INTRO_DURATION_MS = 7200;

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

    if (prefersReducedMotion) {
      finalize();
      return;
    }

    const timer = setTimeout(finalize, INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [navigate, pendingWelcome, redirectTo]);

  return (
    <div className="fixed inset-0 z-[99999] flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12),transparent_45%)]" />

      <div className="relative flex flex-col items-center justify-center animate-[claraIntroStage_7.2s_cubic-bezier(0.22,1,0.36,1)_both]">
        <img
          src={logo}
          alt="CLARA Logo"
          className="h-64 w-64 object-contain sm:h-72 sm:w-72"
        />

        <p className="mt-6 font-heading text-5xl font-bold tracking-[0.24em] text-white sm:text-6xl">
          CLARA
        </p>
      </div>

      <style>{`
        @keyframes claraIntroStage {
          0% {
            opacity: 0;
            transform: scale(0.72);
            filter: blur(8px);
          }
          16% {
            opacity: 1;
            transform: scale(0.96);
            filter: blur(0);
          }
          38% {
            opacity: 1;
            transform: scale(1.06);
            filter: blur(0);
          }
          78% {
            opacity: 1;
            transform: scale(1.06);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: scale(1.02);
            filter: blur(2px);
          }
        }
      `}</style>
    </div>
  );
}
