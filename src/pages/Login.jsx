import { useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ClaraLogo from "@/components/ClaraLogo";

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

function friendlyError(error) {
  if (error?.code === "account_api_not_configured") return error.message;
  if (error?.code === "weak_password") return error.message;
  if (error?.code === "account_unavailable") {
    return "That account cannot be created. Try logging in instead.";
  }
  if (error?.code === "authentication_failed") {
    return "Invalid email or password.";
  }
  if (error?.code === "account_blocked") {
    return "This CLARA account is currently unavailable.";
  }

  const message = String(error?.message || "").toLowerCase();
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Login connection was interrupted. Please try again.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }

  return error?.message || "CLARA could not complete the request.";
}

export default function Login() {
  const location = useLocation();
  const {
    signIn,
    signUp,
    user,
    loading,
    authReady,
    configurationRequired,
  } = useAuth();

  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const copy = MODE_COPY[mode];
  const authLocked = configurationRequired;
  const passwordReady = useMemo(
    () =>
      password.length >= 10 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
    [password]
  );

  if (authReady && user) {
    const destination = location.state?.from?.pathname || "/dashboard";
    return (
      <Navigate
        to={user.must_change_password ? "/change-password" : destination}
        replace
      />
    );
  }

  const validate = () => {
    if (mode === "signup" && !displayName.trim()) {
      return "Display name is required.";
    }
    if (!email.trim()) return "Email is required.";
    if (!password) return "Password is required.";
    if (mode === "signup" && !passwordReady) {
      return "Use 10+ characters with uppercase, lowercase, a number, and a symbol.";
    }
    if (mode === "signup" && password !== confirmPassword) {
      return "The passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || authLocked) return;

    const validationError = validate();
    if (validationError) {
      setSuccess(false);
      setMessage(validationError);
      return;
    }

    setMessage("");
    setSuccess(false);

    try {
      if (mode === "signup") {
        await signUp({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (error) {
      setSuccess(false);
      setMessage(friendlyError(error));
    }
  };

  const switchMode = (nextMode) => {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setMessage("");
    setSuccess(false);
    setConfirmPassword("");
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

          <div className="relative p-5 sm:p-6">
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
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-200/80 shadow-[0_0_14px_rgba(253,230,138,0.3)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Account service setup required
                  </p>
                </div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-white/78">
                  Login will become available after the CLARA account API is deployed and connected.
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
              {mode === "signup" ? (
                <FieldShell label="Display name">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    disabled={authLocked || loading}
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
                  />
                </FieldShell>
              ) : null}

              <FieldShell label="Email address">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={authLocked || loading}
                  className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
                />
              </FieldShell>

              <FieldShell
                label="Password"
                hint={mode === "signup" ? "10+ characters" : null}
              >
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      mode === "signup" ? "Create a password" : "Enter your password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    disabled={authLocked || loading}
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 pr-14 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
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

              {mode === "signup" ? (
                <>
                  <FieldShell label="Confirm password">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      disabled={authLocked || loading}
                      className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] px-4 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:border-white/7 disabled:bg-white/[0.035] disabled:text-white/34 disabled:placeholder:text-white/18"
                    />
                  </FieldShell>
                  <p
                    className={`text-xs font-medium leading-relaxed ${
                      passwordReady ? "text-emerald-200" : "text-white/42"
                    }`}
                  >
                    Use uppercase, lowercase, a number, and a symbol.
                  </p>
                </>
              ) : null}

              {mode === "login" ? (
                <div className="-mt-1 flex justify-end">
                  <span className="px-1 py-1 text-[12px] text-white/28">
                    Password recovery is handled by CLARA support
                  </span>
                </div>
              ) : null}

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
                disabled={loading || authLocked}
                className="group mt-1 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none disabled:opacity-70"
              >
                <span>
                  {authLocked
                    ? "Login unavailable"
                    : loading
                      ? "Processing..."
                      : copy.button}
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
                disabled={loading}
                className="font-semibold text-cyan-300 transition hover:text-violet-200 disabled:cursor-not-allowed disabled:text-white/30"
              >
                {copy.secondaryAction}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
