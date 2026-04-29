import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/icon.png";

export const POST_LOGIN_WELCOME_KEY = "clara_post_login_welcome";

const INTRO_DURATION_MS = 7000;

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

    const timer = setTimeout(finalize, INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [navigate, pendingWelcome, redirectTo]);

  return (
    <div className="fixed inset-0 z-[99999] flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_42%,rgba(0,0,0,0.42))]" />

      <div className="relative flex flex-col items-center justify-center animate-[claraIntroStage_7s_cubic-bezier(0.16,1,0.3,1)_both]">
        <img
          src={logo}
          alt="CLARA Logo"
          className="h-56 w-56 object-contain sm:h-64 sm:w-64"
        />

        <p className="mt-6 font-heading text-5xl font-bold tracking-[0.24em] text-white sm:text-6xl">
          CLARA
        </p>
      </div>

      <style>{`
        @keyframes claraIntroStage {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          25% {
            opacity: 1;
            transform: scale(1.2);
          }
          75% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
