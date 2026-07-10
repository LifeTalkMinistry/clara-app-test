import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  hasHiddenAdminSession,
  verifyHiddenAdminPassword,
} from "@/lib/account-api-client";
import ClaraUserManagement from "./ClaraUserManagement";

export default function ClaraUserManagementGate() {
  const [authorized, setAuthorized] = useState(() => hasHiddenAdminSession());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authorized) return <ClaraUserManagement />;

  const submit = async (event) => {
    event.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      await verifyHiddenAdminPassword(password);
      setPassword("");
      setAuthorized(true);
    } catch {
      setError("That administrator password was not accepted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-white sm:flex sm:items-center sm:justify-center">
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-sm rounded-[28px] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(5,21,42,0.98),rgba(14,20,58,0.98)_52%,rgba(45,24,83,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100/15 bg-cyan-300/10 text-cyan-100">
          <KeyRound className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
          Protected Developer UI
        </p>
        <h1 className="mt-1 text-xl font-black">CLARA User Management</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-white/48">
          Administrator verification is enforced by the custom CLARA backend, not by this hidden route.
        </p>

        <label className="mt-5 block space-y-2">
          <span className="text-xs font-bold text-white/48">Administrator password</span>
          <div className="flex items-center gap-2 rounded-2xl border border-white/14 bg-black/20 px-3 focus-within:border-cyan-200/30">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
              className="min-h-[52px] w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
              placeholder="Admin password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/55 hover:bg-white/8 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {error ? (
          <p className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-400/10 px-3 py-2.5 text-xs font-semibold text-rose-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
        >
          {loading ? "Verifying..." : "Open User Management"}
        </button>
      </form>
    </main>
  );
}
