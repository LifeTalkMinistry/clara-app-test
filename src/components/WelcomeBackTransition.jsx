import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import ClaraLogo from "@/components/ClaraLogo";

export const POST_LOGIN_WELCOME_KEY = "clara_post_login_welcome";

function readPendingWelcome() {
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_WELCOME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read post-login welcome state:", error);
    return null;
  }
}

function clearPendingWelcome() {
  try {
    sessionStorage.removeItem(POST_LOGIN_WELCOME_KEY);
  } catch (error) {
    console.error("Failed to clear post-login welcome state:", error);
  }
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
  } catch (error) {
    console.error("Failed to queue post-login welcome state:", error);
  }
}

export default function WelcomeBackTransition({
  redirectTo = "/dashboard",
  userName = "",
}) {
  const navigate = useNavigate();
  const pendingWelcome = useMemo(() => readPendingWelcome(), []);
  const resolvedName = pendingWelcome?.userName || userName || "";

  useEffect(() => {
    const finalize = ({ showToast = false } = {}) => {
      clearPendingWelcome();

      if (showToast) {
        toast.success(
          resolvedName ? `Welcome back, ${resolvedName}` : "Welcome back"
        );
      }

      navigate(redirectTo, { replace: true });
    };

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!pendingWelcome || prefersReducedMotion) {
      finalize({ showToast: true });
      return undefined;
    }

    const timer = window.setTimeout(() => finalize(), 1600);
    return () => window.clearTimeout(timer);
  }, [navigate, pendingWelcome, redirectTo, resolvedName]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04070A] text-white">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_32%),linear-gradient(180deg,rgba(10,13,16,0.82)_0%,rgba(4,7,10,1)_100%)]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <div className="animate-[pulse_2.4s_ease-in-out_infinite] rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <ClaraLogo variant="full" theme="dark" className="gap-3" />
          </div>

          <div className="mt-8 animate-[fadeIn_.45s_ease]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-300/70">
              Welcome back
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">
              Let&apos;s build your financial stability today
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60">
              <Sparkles className="h-4 w-4 text-emerald-300/75" />
              CLARA is getting your space ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
