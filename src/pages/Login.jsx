import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ClaraLogo from "@/components/ClaraLogo";
import { supabase } from "@/lib/supabaseClient";

const MODE_COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to continue your financial journey",
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

function FieldShell({ label, hint, children }) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/88">{label}</span>
        {hint ? <span className="text-xs text-white/40">{hint}</span> : null}
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,22,28,0.96)_0%,rgba(8,11,15,0.98)_100%)] shadow-[0_28px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/70">
                Reset access
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Reset your password</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Enter your email to receive a reset link
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!loading) onClose();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
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
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white placeholder:text-white/28 outline-none transition duration-200 focus:border-emerald-400/70 focus:bg-black/35 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
              />
            </FieldShell>

            {message ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                  success
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-red-400/20 bg-red-500/10 text-red-200"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-lime-300 px-4 text-base font-semibold text-[#04110C] shadow-[0_18px_40px_rgba(74,222,128,0.28)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_48px_rgba(74,222,128,0.35)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{loading ? "Sending..." : "Send reset link"}</span>
              {!loading ? (
                <ArrowRight className="h-[18px] w-[18px] transition group-hover:translate-x-0.5" />
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
  const [fullName, setFullName] = useState("");
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

    if (mode === "signup") {
      if (!fullName.trim()) return "Full name is required.";
      if (password.length < 6) {
        return "Password must be at least 6 characters.";
      }
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
          fullName,
        });

        if (!data?.session) {
          setSuccess(true);
          setMessage("Check your email to confirm your account.");
          setMode("login");
          return;
        }

        navigate("/onboarding");
      } else {
        await signIn({ email, password });
        navigate("/");
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
      <div className="relative min-h-screen overflow-hidden bg-[#05070A] text-white">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[-18%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-3xl" />
          <div className="absolute right-[-6rem] top-[20%] h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-[-4rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(10,13,16,0.88)_0%,rgba(5,7,10,1)_52%,rgba(3,5,7,1)_100%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <ClaraLogo variant="full" theme="dark" className="gap-3" />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.34em] text-emerald-300/75">
              Budget smarter. Build stability.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.06] shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      mode === "login"
                        ? "bg-gradient-to-r from-emerald-500 to-green-400 text-[#04110C] shadow-[0_8px_24px_rgba(52,211,153,0.3)]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      mode === "signup"
                        ? "bg-gradient-to-r from-emerald-500 to-green-400 text-[#04110C] shadow-[0_8px_24px_rgba(52,211,153,0.3)]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-medium text-emerald-200/90">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure access
                </div>
              </div>

              <div className="overflow-hidden">
                <div
                  key={mode}
                  className="animate-[fadeIn_.28s_ease] transition-all duration-300"
                >
                  <h1 className="text-[2rem] font-bold leading-tight text-white">
                    {copy.title}
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-white/62">
                    {copy.subtitle}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <FieldShell label="Full name">
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white placeholder:text-white/28 outline-none transition duration-200 focus:border-emerald-400/70 focus:bg-black/35 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
                    />
                  </FieldShell>
                )}

                <FieldShell label="Email address">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white placeholder:text-white/28 outline-none transition duration-200 focus:border-emerald-400/70 focus:bg-black/35 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
                  />
                </FieldShell>

                <FieldShell label="Password" hint={mode === "signup" ? "Minimum 6 characters" : null}>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 pr-14 text-base text-white placeholder:text-white/28 outline-none transition duration-200 focus:border-emerald-400/70 focus:bg-black/35 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.14)]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
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
                      className="rounded-md px-1 py-1 text-sm text-white/45 transition hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {message && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                      success
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                        : "border-red-400/20 bg-red-500/10 text-red-200"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-lime-300 px-4 text-base font-semibold text-[#04110C] shadow-[0_18px_40px_rgba(74,222,128,0.28)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_48px_rgba(74,222,128,0.35)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{loading ? "Processing..." : copy.button}</span>
                  {!loading ? (
                    <ArrowRight className="h-[18px] w-[18px] transition group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/58">
                <span>{copy.secondaryLead}</span>
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="rounded-md font-medium text-emerald-300 transition hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                >
                  {copy.secondaryAction}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/42">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300/70" />
                <span>Private by design. Clear by default.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        defaultEmail={email}
        friendlyError={friendlyError}
        onSent={(nextEmail) => setEmail(nextEmail)}
      />
    </>
  );
}
