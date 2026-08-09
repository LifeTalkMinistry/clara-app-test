import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import ClaraLogo from "@/components/ClaraLogo";
import { useAuth } from "@/context/AuthContext";
import { completeClaraPasswordReset } from "@/lib/password-reset-client";

function friendlyResetError(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (error?.status === 410 || normalized.includes("expired")) {
    return "This password reset link has expired. Return to login and request a new reset email.";
  }
  if (error?.status === 400 && normalized.includes("reset link")) {
    return message;
  }
  if (error?.status === 429) {
    return "Too many attempts. Please wait a little while and try again.";
  }
  if (error?.code === "NETWORK_ERROR" || normalized.includes("account server")) {
    return "CLARA could not reach the account server. Check your connection and try again.";
  }
  if (normalized.includes("at least 8 characters")) {
    return "Password must contain at least 8 characters.";
  }
  return message || "CLARA could not reset your password.";
}

function FieldShell({ label, hint, children }) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-white/88">{label}</span>
        {hint ? <span className="text-[11px] text-white/38">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const token = useMemo(
    () => new URLSearchParams(location.search).get("token")?.trim() || "",
    [location.search]
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [completed, setCompleted] = useState(false);

  const inputClass =
    "h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || completed) return;

    if (!token) {
      setSuccess(false);
      setMessage("This password reset link is incomplete. Return to login and request a new reset email.");
      return;
    }
    if (password.length < 8) {
      setSuccess(false);
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSuccess(false);
      setMessage("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setSuccess(false);

    try {
      const result = await completeClaraPasswordReset({
        token,
        newPassword: password,
      });

      setCompleted(true);
      setSuccess(true);
      setMessage("Password changed successfully. Signing you in...");

      try {
        await signIn({ email: result.email, password });
        navigate("/dashboard", { replace: true });
      } catch (signInError) {
        console.error("[CLARA Password Reset] sign-in after reset failed", signInError);
        setMessage(
          "Your password was changed successfully. Return to login and sign in with your new password."
        );
      }
    } catch (error) {
      console.error("[CLARA Password Reset] reset failed", error);
      setSuccess(false);
      setMessage(friendlyResetError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#050716_0%,#070a1f_46%,#02030b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.11)_0%,transparent_34%),linear-gradient(225deg,rgba(139,92,246,0.12)_0%,transparent_36%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(59,130,246,0.15)_0%,transparent_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(0deg,rgba(0,0,0,0.74)_0%,transparent_100%)]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
        <div className="mb-4 flex justify-center">
          <ClaraLogo variant="icon" theme="dark" />
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,18,38,0.72)_0%,rgba(5,8,22,0.62)_100%)] shadow-[0_25px_80px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.08)_0%,transparent_44%),linear-gradient(225deg,rgba(167,139,250,0.08)_0%,transparent_44%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />

          <div className="p-5 sm:p-6">
            <h1 className="text-[1.9rem] font-bold leading-tight text-white">
              Create a new password
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/58">
              Choose a new password for your CLARA account. This secure reset link can only be used once.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              <FieldShell label="New password" hint="Minimum 8 characters">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create your new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    disabled={submitting || completed}
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    disabled={submitting || completed}
                    className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/48 transition hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/35 disabled:cursor-not-allowed disabled:text-white/22 disabled:hover:bg-transparent"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </FieldShell>

              <FieldShell label="Confirm password">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter the password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={submitting || completed}
                  className={inputClass}
                />
              </FieldShell>

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    success
                      ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
                      : "border-red-400/20 bg-red-500/10 text-red-200"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              {!completed ? (
                <button
                  type="submit"
                  disabled={submitting || !token}
                  className="group mt-1 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none disabled:opacity-70"
                >
                  <span>{submitting ? "Updating..." : "Update password"}</span>
                  {!submitting ? (
                    <ArrowRight className="h-[17px] w-[17px] transition group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              ) : null}
            </form>

            <div className="mt-4 text-center text-sm text-white/55">
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="font-semibold text-cyan-300 transition hover:text-violet-200"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
