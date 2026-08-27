import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import SupportPaymentSheet from "@/components/support/SupportPaymentSheet";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";
import { getSupportTier } from "@/lib/clara-support";

const TIER_NAMES = Object.freeze({
  supporter: "Take Control",
  builder: "Stay Consistent",
  champion: "Don't Do It Alone",
});

const PENDING_STATUSES = new Set(["pending_review", "disputed"]);

function membershipName(tierKey) {
  return TIER_NAMES[String(tierKey || "").trim().toLowerCase()] || "CLARA Membership";
}

function paymentStatusView(payment, membership) {
  if (!payment) return null;

  const status = String(payment.status || "").trim().toLowerCase();
  const name = membershipName(payment.tierKey);
  const amount = Number(payment.amountPhp || 0);
  const amountLabel = Number.isFinite(amount) && amount > 0 ? `₱${amount.toLocaleString("en-PH")}` : "Your";

  if (status === "pending_review") {
    return {
      eyebrow: "PAYMENT UNDER VERIFICATION",
      title: "Payment received",
      badge: "PENDING",
      message: `${amountLabel} payment for ${name} is now being verified. Your membership will activate once it is confirmed.`,
      note: "No need to send another payment while this is pending.",
      active: false,
      icon: Clock3,
      shell: "border-amber-300/25 bg-[linear-gradient(145deg,rgba(86,62,10,.94),rgba(16,19,42,.98)_72%)] shadow-[0_18px_50px_rgba(0,0,0,.38),0_0_28px_rgba(250,204,21,.08)]",
      iconShell: "border-amber-300/25 bg-amber-300/10 text-amber-200",
      badgeClass: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    };
  }

  if (status === "needs_info") {
    return {
      eyebrow: "PAYMENT REVIEW",
      title: "Action needed",
      badge: "NEEDS INFO",
      message: payment.reviewNote || `We need a little more information to verify your ${name} payment.`,
      note: "Open the same membership tier to submit updated payment proof or reference details.",
      active: false,
      icon: AlertTriangle,
      shell: "border-orange-300/25 bg-[linear-gradient(145deg,rgba(91,45,11,.94),rgba(16,18,42,.98)_72%)] shadow-[0_18px_50px_rgba(0,0,0,.38),0_0_28px_rgba(251,146,60,.08)]",
      iconShell: "border-orange-300/25 bg-orange-300/10 text-orange-200",
      badgeClass: "border-orange-300/25 bg-orange-300/10 text-orange-100",
    };
  }

  if (status === "disputed") {
    return {
      eyebrow: "PAYMENT UNDER REVIEW",
      title: "Verification reopened",
      badge: "REVIEWING",
      message: payment.reviewNote || `Your ${name} payment is being reviewed again.`,
      note: "Your membership status will update automatically when the review is resolved.",
      active: false,
      icon: ShieldCheck,
      shell: "border-blue-300/25 bg-[linear-gradient(145deg,rgba(18,54,100,.94),rgba(12,17,43,.98)_72%)] shadow-[0_18px_50px_rgba(0,0,0,.38),0_0_28px_rgba(77,140,255,.08)]",
      iconShell: "border-blue-300/25 bg-blue-300/10 text-blue-100",
      badgeClass: "border-blue-300/25 bg-blue-300/10 text-blue-100",
    };
  }

  if (status === "approved" || membership?.active) {
    return {
      eyebrow: "CLARA MEMBERSHIP CONFIRMED",
      title: `${name} is active`,
      badge: "ACTIVE",
      message: "Your payment has been confirmed and your CLARA membership is now active.",
      note: "You're ready. Continue directly to CLARA ORB.",
      active: true,
      icon: CheckCircle2,
      shell: "border-emerald-300/30 bg-[linear-gradient(145deg,rgba(9,70,55,.96),rgba(12,18,40,.99)_72%)] shadow-[0_18px_50px_rgba(0,0,0,.38),0_0_30px_rgba(52,211,153,.11)]",
      iconShell: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
      badgeClass: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
    };
  }

  if (status === "rejected") {
    return {
      eyebrow: "PAYMENT STATUS",
      title: "Payment could not be verified",
      badge: "NOT VERIFIED",
      message: payment.reviewNote || `We could not verify the submitted payment for ${name}.`,
      note: "You can reopen the membership tier and submit a new payment proof when ready.",
      active: false,
      icon: AlertTriangle,
      shell: "border-rose-300/25 bg-[linear-gradient(145deg,rgba(83,18,40,.94),rgba(17,16,39,.98)_72%)] shadow-[0_18px_50px_rgba(0,0,0,.38),0_0_28px_rgba(251,113,133,.08)]",
      iconShell: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      badgeClass: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    };
  }

  return null;
}

function PaymentStatusNotice({ payment, membership, refreshing, onRefresh, onProceed }) {
  const view = paymentStatusView(payment, membership);
  if (!view) return null;

  const Icon = view.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[2147483400] flex justify-center px-3 sm:top-5">
      <section
        role="status"
        aria-live="polite"
        className={`pointer-events-auto w-full max-w-[430px] rounded-[22px] border p-3.5 text-white backdrop-blur-2xl ${view.shell}`}
      >
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${view.iconShell}`}>
            <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/48">{view.eyebrow}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[6px] font-black uppercase tracking-[.12em] ${view.badgeClass}`}>
                {view.badge}
              </span>
            </div>
            <h3 className="mt-1 text-[14px] font-black tracking-[-0.025em] text-white">{view.title}</h3>
            <p className="mt-1 text-[9.5px] font-semibold leading-4 text-white/72">{view.message}</p>
            <p className="mt-1 text-[8px] font-medium leading-3.5 text-white/40">{view.note}</p>
          </div>
        </div>

        {view.active ? (
          <button
            type="button"
            onClick={onProceed}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/25 bg-[linear-gradient(135deg,rgba(16,185,129,.96),rgba(5,150,105,.96))] px-4 text-[9px] font-black text-white shadow-[0_10px_26px_rgba(16,185,129,.17)] transition hover:brightness-110 active:scale-[0.99]"
          >
            Proceed to CLARA ORB
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[8px] font-black uppercase tracking-[.08em] text-white/62 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking status…" : "Check payment status"}
          </button>
        )}
      </section>
    </div>
  );
}

export default function MembershipPaymentModal({ tierKey, onClose }) {
  const token = getStoredBackendToken();
  const [latestPayment, setLatestPayment] = useState(null);
  const [membership, setMembership] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = useCallback(async ({ visible = false } = {}) => {
    if (!token) {
      setLatestPayment(null);
      setMembership(null);
      return null;
    }

    if (visible) setRefreshing(true);
    try {
      const [paymentResult, statusResult] = await Promise.all([
        backendRequest("/api/support/payments", { token }),
        backendRequest("/api/support/status", { token }),
      ]);
      const payments = Array.isArray(paymentResult?.payments) ? paymentResult.payments : [];
      const nextPayment = payments[0] || null;
      const nextMembership = statusResult?.membership || null;
      setLatestPayment(nextPayment);
      setMembership(nextMembership);
      return { payment: nextPayment, membership: nextMembership };
    } catch {
      // Payment status is supplemental UI. Keep the last confirmed state when
      // the backend is temporarily unreachable instead of flashing an error.
      return null;
    } finally {
      if (visible) setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    refreshStatus();
    const intervalId = window.setInterval(() => refreshStatus(), 10_000);
    const handleFocus = () => refreshStatus();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshStatus();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshStatus, token]);

  useEffect(() => {
    if (tierKey) refreshStatus();
  }, [refreshStatus, tierKey]);

  const tier = useMemo(() => (tierKey ? getSupportTier(tierKey) : null), [tierKey]);
  const duplicatePending = Boolean(
    tier &&
    latestPayment &&
    latestPayment.tierKey === tier.key &&
    PENDING_STATUSES.has(String(latestPayment.status || "").toLowerCase())
  );

  const handleClose = useCallback(() => {
    refreshStatus();
    onClose?.();
  }, [onClose, refreshStatus]);

  const handleProceedToOrb = useCallback(() => {
    if (typeof window === "undefined") return;

    // A confirmed membership must rehydrate the backend-authoritative account
    // before the access gate is evaluated again. Reloading at the ORB route
    // gives AuthContext a clean active-membership snapshot and takes the member
    // straight into CLARA instead of leaving them on the pricing gate.
    const targetHash = "#/community?view=orb";
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.location.reload();
  }, []);

  if (typeof document === "undefined") return null;

  const statusNotice = !tierKey && latestPayment
    ? createPortal(
        <PaymentStatusNotice
          payment={latestPayment}
          membership={membership}
          refreshing={refreshing}
          onRefresh={() => refreshStatus({ visible: true })}
          onProceed={handleProceedToOrb}
        />,
        document.body
      )
    : null;

  if (!tier) return statusNotice;

  const paymentModal = createPortal(
    <div
      className="fixed inset-0 z-[2147483500] flex items-end justify-center bg-black/70 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-8 backdrop-blur-md sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${tier.name} membership payment`}
        className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-[28px] border border-[#4d8cff]/18 bg-[linear-gradient(180deg,rgba(7,18,43,.995),rgba(3,8,25,.998))] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.65),0_0_40px_rgba(77,140,255,.08)]"
      >
        {duplicatePending ? (
          <div className="py-2 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[8px] font-black uppercase tracking-[.18em] text-amber-200/70">PAYMENT UNDER VERIFICATION</p>
            <h2 className="mt-1.5 text-[20px] font-black tracking-[-0.035em] text-white">Payment already submitted</h2>
            <p className="mx-auto mt-2 max-w-[320px] text-[10px] font-semibold leading-5 text-white/58">
              We already received your payment for {tier.name}. No need to send another payment while verification is pending.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 min-h-11 w-full rounded-xl border border-amber-300/20 bg-[linear-gradient(135deg,rgba(245,158,11,.9),rgba(180,83,9,.92))] px-4 text-[10px] font-black text-white shadow-[0_12px_28px_rgba(245,158,11,.15)]"
            >
              View payment status
            </button>
          </div>
        ) : (
          <SupportPaymentSheet
            tier={tier}
            onBack={handleClose}
            onClose={handleClose}
          />
        )}
      </section>
    </div>,
    document.body
  );

  return (
    <>
      {statusNotice}
      {paymentModal}
    </>
  );
}
