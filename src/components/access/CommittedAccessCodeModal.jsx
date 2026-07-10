import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  OPEN_COMMITTED_ACCESS_CODE_EVENT,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import {
  redeemIosAccessCode,
  verifyHiddenAdminPassword,
} from "@/lib/ios-access-client";
import {
  COMMITTED_ACCESS_PLAN_KEY,
  grantDeveloperCommittedAccess,
} from "@/lib/committed-access-code";

function getFriendlyError(error) {
  const code = error?.code;

  if (code === "free_code") return "That code is currently set to Free access only.";
  if (code === "code_not_found") return "That access code was not found.";
  if (code === "code_disabled") return "That access code is currently turned off.";
  if (code === "code_expired") return "That access code has expired.";
  if (code === "code_revoked") return "That access code has been revoked.";
  if (code === "code_assigned") return "That access code is already assigned to another device.";
  if (code === "invalid_code") return "Enter a valid CLARA access code.";
  if (code === "network_error") return "CLARA could not reach the access service. Check your connection and try again.";
  return error?.message || "CLARA could not verify that code right now.";
}

function findLockedCommittedPreview(target) {
  let node = target instanceof Element ? target : null;

  while (node && node !== document.body) {
    const isLockedPanelWrapper =
      node.classList?.contains("relative") &&
      node.classList?.contains("min-h-full") &&
      node.classList?.contains("overflow-hidden") &&
      node.classList?.contains("rounded-[30px]");

    if (isLockedPanelWrapper) {
      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (
        text.includes("COMMITTED VERSION") &&
        text.includes("Ready to Commit?") &&
        text.includes("Tap to see more.")
      ) {
        return node;
      }
    }

    node = node.parentElement;
  }

  return null;
}

export default function CommittedAccessCodeModal() {
  const { user, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayName = useMemo(
    () =>
      profile?.full_name ||
      profile?.display_name ||
      user?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "CLARA User",
    [profile?.display_name, profile?.full_name, user]
  );

  const openModal = () => {
    setCredential("");
    setShowCredential(false);
    setError("");
    setSuccess("");
    setSubmitting(false);
    setOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setOpen(false);
    setCredential("");
    setError("");
    setSuccess("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOpenEvent = () => openModal();
    window.addEventListener(OPEN_COMMITTED_ACCESS_CODE_EVENT, handleOpenEvent);

    return () => window.removeEventListener(OPEN_COMMITTED_ACCESS_CODE_EVENT, handleOpenEvent);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const interceptLockedFeature = (event) => {
      if (open || !findLockedCommittedPreview(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openModal();
    };

    document.addEventListener("click", interceptLockedFeature, true);
    return () => document.removeEventListener("click", interceptLockedFeature, true);
  }, [open]);

  useEffect(() => {
    if (location.pathname !== "/enroll") return;

    openModal();
    navigate("/dashboard", {
      replace: true,
      state: {
        committedAccessRequested: true,
        from: location.state?.from || null,
      },
    });
  }, [location.pathname, location.state?.from, navigate]);

  const submitCredential = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const rawCredential = credential.trim();
    if (!rawCredential) {
      setError("Enter your CLARA access code.");
      return;
    }

    if (!user?.id) {
      setError("CLARA could not identify this device. Reopen the app and try again.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      let result;

      try {
        result = await redeemIosAccessCode({
          code: rawCredential,
          userId: user.id,
          name: displayName,
          email: user?.email || "",
        });

        if (String(result?.planKey || "").trim() !== COMMITTED_ACCESS_PLAN_KEY) {
          const freeCodeError = new Error("This code is not configured for Committed access.");
          freeCodeError.code = "free_code";
          throw freeCodeError;
        }
      } catch (redeemError) {
        if (redeemError?.code === "network_error" || redeemError?.code === "free_code") {
          throw redeemError;
        }

        try {
          await verifyHiddenAdminPassword(rawCredential);
          result = grantDeveloperCommittedAccess(user.id);
        } catch (adminError) {
          if (adminError?.code === "network_error") throw adminError;
          throw redeemError;
        }
      }

      await refreshProfile?.();
      setSuccess("Committed access activated.");
      setCredential("");

      window.setTimeout(() => {
        setOpen(false);
        setSuccess("");
      }, 550);

      return result;
    } catch (accessError) {
      setError(getFriendlyError(accessError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#020817]/88 px-5 py-[max(20px,env(safe-area-inset-top))] backdrop-blur-md"
      onClick={closeModal}
    >
      <section
        className="relative w-full max-w-[390px] overflow-hidden rounded-[32px] border border-cyan-100/16 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_42%),#081122] px-5 py-6 text-white shadow-[0_28px_80px_rgba(0,0,0,0.64),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeModal}
          disabled={submitting}
          className="absolute right-4 top-4 rounded-full border border-white/14 bg-white/[0.06] p-2 text-white/58 transition hover:bg-white/[0.1] hover:text-white/88 disabled:opacity-40"
          aria-label="Close access-code prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
          <KeyRound className="h-5 w-5" />
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
          Committed feature
        </p>
        <h2 className="mt-2 pr-10 text-[1.75rem] font-black leading-tight tracking-[-0.045em] text-white">
          Unlock with your code
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
          Free access stays available. Enter a Committed code only when you want to unlock this feature.
        </p>

        <form onSubmit={submitCredential} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold text-white/72">Committed access code</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/55" />
              <input
                type={showCredential ? "text" : "password"}
                value={credential}
                onChange={(event) => {
                  setCredential(event.target.value);
                  setError("");
                }}
                placeholder="Enter your CLARA code"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={submitting}
                className="h-14 w-full rounded-2xl border border-white/12 bg-black/25 pl-11 pr-14 text-sm font-semibold text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/55 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.11)] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowCredential((current) => !current)}
                disabled={submitting}
                className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white"
                aria-label={showCredential ? "Hide access code" : "Show access code"}
              >
                {showCredential ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold leading-5 text-rose-100">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold leading-5 text-emerald-100">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !credential.trim()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 px-4 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(59,130,246,0.28)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            {submitting ? "Checking code..." : "Unlock Committed access"}
          </button>

          <button
            type="button"
            onClick={closeModal}
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-white/42 transition hover:text-white/68 disabled:opacity-40"
          >
            Continue with Free
          </button>
        </form>
      </section>
    </div>
  );
}
