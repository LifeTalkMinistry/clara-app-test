import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ChangePassword() {
  const { user, changePassword, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const strong = useMemo(
    () =>
      password.length >= 10 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
    [password]
  );

  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!strong) {
      setError("Use at least 10 characters with uppercase, lowercase, a number, and a symbol.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    try {
      await changePassword(password);
    } catch (changeError) {
      setError(changeError?.message || "CLARA could not change the password.");
    }
  };

  return (
    <main className="theme-page-shell min-h-screen px-4 py-8 text-white sm:flex sm:items-center sm:justify-center">
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-md rounded-[30px] border border-cyan-100/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_38%),rgba(5,16,35,0.97)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.52)] sm:p-6"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
          <KeyRound className="h-6 w-6" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
          Protect your account
        </p>
        <h1 className="mt-2 text-2xl font-black">Choose your private password</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
          The administrator-issued password was temporary. Replace it before entering CLARA.
        </p>

        <label className="mt-6 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">New password</span>
          <div className="flex items-center rounded-2xl border border-white/15 bg-black/20 px-4 focus-within:border-cyan-200/35">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="min-h-14 w-full bg-transparent text-sm font-semibold text-white outline-none"
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

        <label className="mt-4 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="min-h-14 w-full rounded-2xl border border-white/15 bg-black/20 px-4 text-sm font-semibold text-white outline-none focus:border-cyan-200/35"
          />
        </label>

        <p className={`mt-3 text-xs font-semibold ${strong ? "text-emerald-200" : "text-white/42"}`}>
          10+ characters, uppercase, lowercase, number, and symbol.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200/18 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="mt-5 min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 text-sm font-black text-slate-950 disabled:opacity-55"
        >
          {loading ? "Updating password..." : "Save Private Password"}
        </button>
      </form>
    </main>
  );
}
