import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ClaraLogo from "@/components/ClaraLogo";
import {
  canUseTemporaryIosOfflineAccess,
  hasHiddenAdminSession,
  isNativeAndroidApp,
  redeemIosAccessCode,
  validateIosAccessSession,
  verifyHiddenAdminPassword,
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
  const requiresAccessCode = useMemo(() => !isNativeAndroidApp(), []);
  const [status, setStatus] = useState(requiresAccessCode ? "checking" : "allowed");
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback(async () => {
    if (!requiresAccessCode) {
      setStatus("allowed");
      return;
    }

    if (hasHiddenAdminSession()) {
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

  const submitCredential = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const rawCredential = credential.trim();
    if (!rawCredential) {
      setError("Enter your CLARA access code.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      try {
        await redeemIosAccessCode({
          code: rawCredential.toUpperCase(),
          userId: user?.id,
          name:
            profile?.full_name ||
            user?.full_name ||
            user?.user_metadata?.full_name ||
            user?.email?.split("@")?.[0] ||
            "Web user",
          email: user?.email || "",
        });
      } catch (redeemError) {
        if (redeemError?.code === "network_error") throw redeemError;

        try {
          await verifyHiddenAdminPassword(rawCredential);
        } catch (adminError) {
          if (adminError?.code === "network_error") throw adminError;
          throw redeemError;
        }
      }

      setCredential("");
      setStatus("allowed");
    } catch (accessError) {
      setError(getFriendlyError(accessError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!requiresAccessCode || status === "allowed") return children;

  if (status === "checking") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050716] px-5 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#050716_0%,#070a1f_46%,#02030b_100%)]" />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-cyan-300" />
          <p className="text-sm font-semibold text-white/70">Checking CLARA access...</p>
        </div>
      </div>
    );
  }

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
            <p className="text-sm leading-relaxed text-white/72">Access CLARA</p>
            <h1 className="mt-1.5 text-[1.9rem] font-bold leading-tight text-white">
              Enter your access code
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/58">
              Use the CLARA access code provided to you.
            </p>

            <form onSubmit={submitCredential} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-[13px] font-medium text-white/88">Access code</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/65" />
                  <input
                    type={showCredential ? "text" : "password"}
                    value={credential}
                    onChange={(event) => setCredential(event.target.value)}
                    placeholder="Enter your CLARA code"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={submitting}
                    className="h-13 w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.36)_100%)] pl-11 pr-14 text-sm text-white placeholder:text-white/26 outline-none transition duration-200 focus:border-cyan-300/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.13)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredential((current) => !current)}
                    disabled={submitting}
                    className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/48 transition hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/35 disabled:cursor-not-allowed disabled:text-white/22"
                    aria-label={showCredential ? "Hide access code" : "Show access code"}
                  >
                    {showCredential ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || !credential.trim()}
                className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-semibold text-[#020617] shadow-[0_18px_42px_rgba(59,130,246,0.32)] transition duration-200 hover:scale-[0.995] hover:shadow-[0_22px_52px_rgba(139,92,246,0.34)] active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none disabled:opacity-70"
              >
                <ShieldCheck className="h-[17px] w-[17px]" />
                <span>{submitting ? "Checking access..." : "Continue to CLARA"}</span>
              </button>
            </form>

            <p className="mt-5 text-center text-[11px] font-semibold leading-5 text-white/38">
              Installed Android app access continues through Google Play.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
