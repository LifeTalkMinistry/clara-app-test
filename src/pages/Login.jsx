import { useMemo, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function friendlyError(error) {
  if (error?.code === "account_api_not_configured") return error.message;
  if (error?.code === "weak_password") return error.message;
  if (error?.code === "account_unavailable") return "That account cannot be created. Try logging in instead.";
  if (error?.code === "authentication_failed") return "The email or password was not accepted.";
  if (error?.code === "account_blocked") return "This CLARA account is currently unavailable.";
  return "CLARA could not complete the request. Check your connection and try again.";
}

export default function Login() {
  const location = useLocation();
  const { signIn, signUp, user, loading, authReady, configurationRequired } = useAuth();
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

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
    return <Navigate to={user.must_change_password ? "/change-password" : destination} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (loading || configurationRequired) return;
    setError("");

    try {
      if (mode === "signup") {
        if (!displayName.trim()) throw new Error("Enter your display name.");
        if (!passwordReady) throw new Error("Use a stronger password before creating your account.");
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        await signUp({ displayName: displayName.trim(), email: email.trim(), password });
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (submitError) {
      setError(submitError?.code ? friendlyError(submitError) : submitError.message);
    }
  };

  return (
    <main className="theme-page-shell min-h-screen px-4 py-8 text-white sm:flex sm:items-center sm:justify-center">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-100/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_46%),rgba(5,16,35,0.97)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
          Universal CLARA Account
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
          {mode === "login" ? "Welcome back" : "Create your CLARA account"}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
          One account works on iPhone, Android, and the web. Your budgets and financial records stay on this device.
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          {[
            ["login", "Log In"],
            ["signup", "Create Account"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError("");
              }}
              className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${
                mode === value ? "bg-cyan-200 text-slate-950" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "signup" ? (
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Display name</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 focus-within:border-cyan-200/35">
                <UserRound className="h-4 w-4 text-cyan-100/65" />
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  disabled={loading}
                  className="min-h-14 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                  placeholder="Your name"
                />
              </div>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 focus-within:border-cyan-200/35">
              <Mail className="h-4 w-4 text-cyan-100/65" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={loading}
                className="min-h-14 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 focus-within:border-cyan-200/35">
              <LockKeyhole className="h-4 w-4 text-cyan-100/65" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                disabled={loading}
                className="min-h-14 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/55 hover:bg-white/8 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {mode === "signup" ? (
            <>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Confirm password</span>
                <div className="rounded-2xl border border-white/15 bg-black/20 px-4 focus-within:border-cyan-200/35">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    className="min-h-14 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                    placeholder="Repeat your password"
                  />
                </div>
              </label>
              <p className={`text-xs font-semibold leading-5 ${passwordReady ? "text-emerald-200" : "text-white/42"}`}>
                Use 10+ characters with uppercase, lowercase, a number, and a symbol.
              </p>
            </>
          ) : null}

          {configurationRequired ? (
            <div className="rounded-2xl border border-amber-200/18 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-5 text-amber-100">
              Account login is safely disabled until the custom API is deployed and VITE_CLARA_ACCOUNT_API_URL is configured.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200/18 bg-rose-400/10 px-4 py-3 text-sm font-semibold leading-5 text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || configurationRequired || !email.trim() || !password}
            className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-cyan-200 to-emerald-300 px-4 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In to CLARA" : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] font-semibold leading-5 text-white/38">
          Signing in does not upload or restore your budgets, wallets, expenses, savings, or financial history.
        </p>
      </section>
    </main>
  );
}
