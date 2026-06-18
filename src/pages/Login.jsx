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
    if (loading) return;

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
                className="h-13 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)]"
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
              disabled={loading}
              className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{loading ? "Sending..." : "Send reset link"}</span>
              {!loading ? (
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
    if (loading) return;

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

        if (typeof window !== "undefined") {
          const basePath = `${window.location.origin}${window.location.pathname}${window.location.search}`;
          window.location.replace(`${basePath}#/`);
        } else {
          navigate("/", { replace: true });
        }
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
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setMessage("");
    setSuccess(false);
  };

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[#050716] text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(168,85,247,0.14),transparent_30%),linear-gradient(180deg,rgba(5,7,22,1)_0%,rgba(7,10,31,1)_42%,rgba(2,4,14,1)_100%)]" />
          <div className="absolute left-1/2 top-[-14%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/15 blur-[130px]" />
          <div className="absolute right-[-8rem] top-[10%] h-[24rem] w-[24rem] rounded-full bg-violet-500/12 blur-[130px]" />
          <div className="absolute left-[-8rem] top-[36%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-[130px]" />
          <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.28)_72%,rgba(0,0,0,0.62)_100%)]" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
          <div className="mb-4 flex justify-center">
            <ClaraLogo variant="icon" theme="dark" />
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,18,38,0.72)_0%,rgba(5,8,22,0.62)_100%)] shadow-[0_25px_80px_rgba(0,0,0,0.62),0_0_50px_rgba(59,130,246,0.08),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.13),transparent_38%),radial-gradient(circle_at_82%_0%,rgba(167,139,250,0.10),transparent_34%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
            <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-cyan-300/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-56 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl" />

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

              <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
                <FieldShell label="Email address">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)]"
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
                      className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 pr-14 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/48 transition hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/35"
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
                      onClick={() => setForgotOpen(true)}
                      className="rounded-md px-1 py-1 text-[12px] text-white/42 transition hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
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
                  disabled={loading}
                  className="group mt-1 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{loading ? "Processing..." : copy.button}</span>
                  {!loading ? (
                    <ArrowRight className="h-[17px] w-[17px] transition group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              </form>

              <div className="mt-4 text-center text-sm text-white/55">
                <span>{copy.secondaryLead}</span>{" "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="font-semibold text-cyan-300 transition hover:text-violet-200"
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
