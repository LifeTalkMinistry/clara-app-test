import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ClaraLogo from "@/components/ClaraLogo";
import { supabase } from "@/lib/supabaseClient";

const MODE_COPY = {
  login: {
    subtitle: "Access your CLARA account",
    button: "Log in",
    secondaryLead: "New to CLARA?",
    secondaryAction: "Create account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start your journey to financial clarity",
    button: "Create account",
    secondaryLead: "Already have an account?",
    secondaryAction: "Log in",
  },
};

const LOGIN_MAINTENANCE_MODE = true;
const LOGIN_MAINTENANCE_MESSAGE =
  "CLARA login is temporarily unavailable while account access is undergoing improvement.";
const LOGIN_TESTER_ACKNOWLEDGEMENT =
  "To our testers: thank you for downloading CLARA and helping us complete the 14-day testing period. Your participation is acknowledged and deeply appreciated.";

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isTransientAuthError = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("session") ||
    message.includes("disconnected") ||
    message.includes("message port")
  );
};

async function signInWithOneRetry(signIn, credentials) {
  try {
    return await signIn(credentials);
  } catch (error) {
    if (!isTransientAuthError(error)) throw error;

    console.warn("CLARA login transient auth error. Retrying once...", error);
    await sleep(450);
    return await signIn(credentials);
  }
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

function ForgotPasswordModal({
  open,
  onClose,
  defaultEmail,
  onSent,
  friendlyError,
}) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail || "");
    setMessage("");
    setSuccess(false);
    setLoading(false);
  }, [defaultEmail, open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [loading, onClose, open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || LOGIN_MAINTENANCE_MODE) return;

    if (!email.trim()) {
      setSuccess(false);
      setMessage("Email is required.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) throw error;

      setSuccess(true);
      setMessage("Check your email for the reset link");
      onSent?.(email.trim());
    } catch (error) {
      console.error(error);
      setSuccess(false);
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close reset password modal"
        onClick={() => {
          if (!loading) onClose();
        }}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,18,38,0.96)_0%,rgba(5,8,22,0.98)_100%)] shadow-[0_28px_100px_rgba(0,0,0,0.68),0_0_50px_rgba(59,130,246,0.10)] backdrop-blur-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                Reset access
              </p>
              <h2 className="mt-2 text-[1.75rem] font-bold leading-tight text-white">
                Reset your password
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/58">
                Enter your email to receive a reset link
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!loading) onClose();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/35"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldShell label="Email address">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={LOGIN_MAINTENANCE_MODE}
                className="h-13 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
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

            <button
              type="submit"
              disabled={loading || LOGIN_MAINTENANCE_MODE}
              className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none disabled:opacity-70"
            >
              <span>{loading ? "Sending..." : "Send reset link"}</span>
              {!loading && !LOGIN_MAINTENANCE_MODE ? (
                <ArrowRight className="h-[17px] w-[17px] transition group-hover:translate-x-0.5" />
              ) : null}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const copy = MODE_COPY[mode];
  const authLocked = LOGIN_MAINTENANCE_MODE;

  const validate = () => {
    if (!email.trim()) return "Email is required.";
    if (!password.trim()) return "Password is required.";

    if (mode === "signup" && password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return null;
  };

  const friendlyError = (error) => {
    const msg = error?.message?.toLowerCase() || "";

    if (msg.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (msg.includes("user already registered")) {
      return "This email is already registered.";
    }
    if (msg.includes("rate limit")) {
      return "Too many attempts. Please wait.";
    }
    if (msg.includes("auth request timed out") || msg.includes("failed to fetch") || msg.includes("network")) {
      return "Login connection was interrupted. Please try again.";
    }
    if (msg.includes("email")) {
      return "Please enter a valid email address.";
    }

    return error?.message || "Something went wrong.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || authLocked) return;

    const validationError = validate();
    if (validationError) {
      setSuccess(false);
      setMessage(validationError);
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      if (mode === "signup") {
        const data = await signUp({
          email,
          password,
          fullName: "",
        });

        if (!data?.session) {
          setSuccess(true);
          setMessage("Check your email to confirm your account.");
          setMode("login");
          return;
        }

        navigate("/onboarding");
      } else {
        await signInWithOneRetry(signIn, { email, password });
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error(error);
      setSuccess(false);
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    if (loading || authLocked || nextMode === mode) return;
    setMode(nextMode);
    setMessage("");
    setSuccess(false);
  };

  return (
    <>
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
              <div className="overflow-hidden">
                <div
                  key={mode}
                  className="animate-[fadeIn_.28s_ease] transition-all duration-300"
                >
                  {copy.title ? (
                    <h1 className="text-[1.9rem] font-bold leading-tight text-white">
                      {copy.title}
                    </h1>
                  ) : null}
                  <p
                    className={`text-sm leading-relaxed text-white/58 ${
                      copy.title ? "mt-1.5" : ""
                    }`}
                  >
                    {copy.subtitle}
                  </p>
                </div>
              </div>

              {authLocked ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-slate-300/70 shadow-[0_0_14px_rgba(203,213,225,0.35)]" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      Undergoing improvement
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-white/78">
                    {LOGIN_MAINTENANCE_MESSAGE}
                  </p>
                  <p className="mt-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs leading-relaxed text-white/58">
                    {LOGIN_TESTER_ACKNOWLEDGEMENT}
                  </p>
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className={`mt-5 space-y-3.5 transition duration-200 ${
                  authLocked ? "opacity-60 grayscale-[0.18]" : ""
                }`}
                aria-disabled={authLocked}
              >
                <FieldShell label="Email address">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={authLocked || loading}
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
                  />
                </FieldShell>

                <FieldShell
                  label="Password"
                  hint={mode === "signup" ? "Minimum 6 characters" : null}
                >
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "signup" ? "Create a password" : "Enter your password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      disabled={authLocked || loading}
                      className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 pr-14 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (!authLocked) setShowPassword((prev) => !prev);
                      }}
                      disabled={authLocked}
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

                {mode === "login" && (
                  <div className="-mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!authLocked) setForgotOpen(true);
                      }}
                      disabled={authLocked}
                      className="rounded-md px-1 py-1 text-[12px] text-white/42 transition hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:text-white/24 disabled:hover:text-white/24"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {message && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                      success
                        ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
                        : "border-red-400/20 bg-red-500/10 text-red-200"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || authLocked}
                  className="group mt-1 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none disabled:opacity-70"
                >
                  <span>
                    {authLocked ? "Login unavailable" : loading ? "Processing..." : copy.button}
                  </span>
                  {!loading && !authLocked ? (
                    <ArrowRight className="h-[17px] w-[17px] transition group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              </form>

              <div className="mt-4 text-center text-sm text-white/55">
                <span>{copy.secondaryLead}</span>{" "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  disabled={authLocked}
                  className="font-semibold text-cyan-300 transition hover:text-violet-200 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:text-white/30"
                >
                  {copy.secondaryAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        defaultEmail={email}
        onSent={(sentEmail) => setEmail(sentEmail)}
        friendlyError={friendlyError}
      />
    </>
  );
}
