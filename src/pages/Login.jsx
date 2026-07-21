import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ClaraLogo from "@/components/ClaraLogo";

const MODE_COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to your CLARA account",
    button: "Log in",
  },
  signup: {
    title: "Create your account",
    subtitle: "Your account works on Android, iPhone, and the web",
    button: "Create account",
  },
};

function friendlyError(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (error?.code === "VAULT_ACCOUNT_CONFLICT") {
    return "This device already contains financial records linked to another CLARA account.";
  }
  if (error?.code === "NETWORK_ERROR" || normalized.includes("account server")) {
    return "CLARA could not reach the account server. Check your connection and try again.";
  }
  if (error?.status === 401 || normalized.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  if (error?.status === 409 || normalized.includes("already registered")) {
    return "This email is already registered. Try logging in instead.";
  }
  if (normalized.includes("at least 8 characters")) {
    return "Password must contain at least 8 characters.";
  }
  if (normalized.includes("origin is not allowed")) {
    return "This CLARA installation is not yet approved by the account server.";
  }

  return message || "CLARA could not complete the request.";
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/12 bg-black/25 px-4 transition focus-within:border-cyan-300/45 focus-within:bg-black/35 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.08)]">
        <Icon className="h-4 w-4 shrink-0 text-cyan-100/60" />
        {children}
      </div>
    </label>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, loading: authLoading } = useAuth();
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const copy = MODE_COPY[mode];
  const busy = submitting || authLoading;
  const destination = location.state?.from?.pathname || "/";
  const passwordReady = useMemo(() => password.length >= 8, [password]);

  const switchMode = (nextMode) => {
    if (busy || nextMode === mode) return;
    setMode(nextMode);
    setMessage("");
    setConfirmPassword("");
  };

  const validate = () => {
    if (mode === "signup" && !fullName.trim()) return "Your name is required.";
    if (!email.trim()) return "Email is required.";
    if (!password) return "Password is required.";
    if (mode === "signup" && !passwordReady) {
      return "Password must contain at least 8 characters.";
    }
    if (mode === "signup" && password !== confirmPassword) {
      return "The passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const validationError = validate();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "signup") {
        await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        });
        navigate("/onboarding", { replace: true });
      } else {
        await signIn({ email: email.trim(), password });
        navigate(destination, { replace: true });
      }
    } catch (error) {
      console.error("[CLARA Login] authentication failed", error);
      setMessage(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050716] px-4 py-8 text-white sm:flex sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_44%),linear-gradient(180deg,#050716_0%,#02030b_100%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,17,38,0.96),rgba(4,7,20,0.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-2xl sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />

        <div className="flex items-center justify-between gap-4">
          <ClaraLogo variant="icon" theme="dark" />
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-100">
            <LockKeyhole className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
          CLARA Account
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-white/55">{copy.subtitle}</p>
        <p className="mt-2 text-xs leading-5 text-white/38">
          Your financial records remain stored on this device. The server stores only your account identity.
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          {[
            ["login", "Log In"],
            ["signup", "Create Account"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              disabled={busy}
              className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${
                mode === value
                  ? "bg-cyan-200 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.18)]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "signup" ? (
            <Field label="Name" icon={UserRound}>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                disabled={busy}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                placeholder="Your name"
              />
            </Field>
          ) : null}

          <Field label="Email" icon={Mail}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password" icon={LockKeyhole}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={busy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/8 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>

          {mode === "signup" ? (
            <Field label="Confirm password" icon={LockKeyhole}>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                disabled={busy}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                placeholder="Type the password again"
              />
            </Field>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-medium leading-5 text-red-100">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 px-4 text-sm font-black text-slate-950 shadow-[0_18px_42px_rgba(59,130,246,0.28)] transition hover:scale-[0.995] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span>{busy ? "Connecting..." : copy.button}</span>
            {!busy ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
          </button>
        </form>
      </section>
    </main>
  );
}
