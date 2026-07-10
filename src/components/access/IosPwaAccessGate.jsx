import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  canUseTemporaryIosOfflineAccess,
  isIosStandalonePwa,
  redeemIosAccessCode,
  validateIosAccessSession,
} from "@/lib/ios-access-client";

function getFriendlyError(error) {
  const code = error?.code;

  if (code === "code_not_found") return "That access code was not found.";
  if (code === "code_disabled") return "That access code is currently turned off.";
  if (code === "code_expired") return "That access code has expired.";
  if (code === "code_revoked") return "That access code has been revoked.";
  if (code === "code_assigned") return "That access code is already assigned to another user.";
  if (code === "invalid_code") return "Enter a valid CLARA access code.";
  return "CLARA could not verify access right now. Check your connection and try again.";
}

export default function IosPwaAccessGate({ children }) {
  const { user, profile } = useAuth();
  const requiresAccessCode = useMemo(() => isIosStandalonePwa(), []);
  const [status, setStatus] = useState(requiresAccessCode ? "checking" : "allowed");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback(async () => {
    if (!requiresAccessCode) {
      setStatus("allowed");
      return;
    }

    setStatus("checking");
    setError("");

    try {
      const result = await validateIosAccessSession();
      setStatus(result.valid ? "allowed" : "locked");
    } catch (validationError) {
      if (!navigator.onLine && canUseTemporaryIosOfflineAccess()) {
        setStatus("allowed");
        return;
      }

      setStatus("locked");
      if (validationError?.code && validationError.code !== "missing_session") {
        setError(getFriendlyError(validationError));
      }
    }
  }, [requiresAccessCode]);

  useEffect(() => {
    validate();
  }, [validate]);

  const submitCode = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Enter your CLARA access code.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await redeemIosAccessCode({
        code: normalizedCode,
        userId: user?.id,
        name:
          profile?.full_name ||
          user?.full_name ||
          user?.user_metadata?.full_name ||
          user?.email?.split("@")?.[0] ||
          "iPhone user",
        email: user?.email || "",
      });
      setStatus("allowed");
    } catch (redeemError) {
      setError(getFriendlyError(redeemError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!requiresAccessCode || status === "allowed") return children;

  if (status === "checking") {
    return (
      <div className="theme-page-shell min-h-screen flex items-center justify-center px-5 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-cyan-300" />
          <p className="text-sm font-semibold text-white/70">Checking iPhone access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-page-shell min-h-screen flex items-center justify-center px-4 py-8 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-200/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_46%),rgba(5,16,35,0.96)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
          <Smartphone className="h-6 w-6" />
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
          iPhone Home Screen Access
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Enter your CLARA code</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
          This code activates the iPhone version of CLARA for your device.
        </p>

        <form onSubmit={submitCode} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
              Access code
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 focus-within:border-cyan-200/35">
              <KeyRound className="h-4 w-4 shrink-0 text-cyan-100/65" />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="CLARA-XXXXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={submitting}
                className="min-h-14 w-full bg-transparent text-base font-black tracking-[0.12em] text-white outline-none placeholder:text-white/25 disabled:opacity-60"
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200/18 bg-rose-400/10 px-4 py-3 text-sm font-semibold leading-5 text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-cyan-200 to-emerald-300 px-4 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? "Checking code..." : "Activate CLARA"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] font-semibold leading-5 text-white/38">
          Android app users are not required to enter an iPhone access code.
        </p>
      </div>
    </div>
  );
}
