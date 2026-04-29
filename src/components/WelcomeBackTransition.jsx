import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ClaraLogo from "@/components/ClaraLogo";

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

    const timer = setTimeout(finalize, 1200);
    return () => clearTimeout(timer);
  }, [navigate, pendingWelcome, redirectTo]);

  return (
    <div className="relative min-h-screen bg-[#04070A] flex items-center justify-center">
      {/* Glow background */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_40%)]" />
      </div>

      {/* Logo only */}
      <div className="relative animate-[claraFade_1.1s_ease-in-out_both]">
        <ClaraLogo variant="full" theme="dark" />
      </div>

      <style>{`
        @keyframes claraFade {
          0% { opacity: 0; transform: scale(0.95); filter: blur(8px); }
          40% { opacity: 1; transform: scale(1); filter: blur(0); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.98); filter: blur(4px); }
        }
      `}</style>
    </div>
  );
}
