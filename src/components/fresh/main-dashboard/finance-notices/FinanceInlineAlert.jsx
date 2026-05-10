import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

import { isProtectedFinanceRefreshWarning } from "@/utils/dashboard/dashboardHelpers";
import { shouldSilenceNormalOfflineNotice } from "./financeNoticeRules";

export default function FinanceInlineAlert({ notice, onClose }) {
  const message = String(notice?.message || "").trim();

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      onClose?.();
    }, notice?.type === "success" ? 3000 : 4500);

    return () => window.clearTimeout(timer);
  }, [message, notice?.type, onClose]);

  if (!message) return null;

  if (
    shouldSilenceNormalOfflineNotice(message) ||
    isProtectedFinanceRefreshWarning(message)
  ) {
    return null;
  }

  const isSuccess = notice.type === "success";
  const Icon = isSuccess ? CheckCircle2 : XCircle;
  const tone = isSuccess
    ? "border-emerald-300/20 bg-emerald-400/12 text-emerald-50 shadow-[0_18px_46px_rgba(16,185,129,0.18),0_0_26px_rgba(45,212,191,0.10)]"
    : "border-rose-300/20 bg-rose-400/12 text-rose-50 shadow-[0_18px_46px_rgba(244,63,94,0.18),0_0_26px_rgba(251,113,133,0.10)]";
  const iconTone = isSuccess ? "text-emerald-200" : "text-rose-200";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(0.85rem+env(safe-area-inset-top))] z-[260] flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex max-w-[min(92vw,360px)] items-center gap-3 rounded-full border px-3.5 py-2.5 text-sm font-semibold backdrop-blur-2xl ${tone}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08]">
          <Icon className={`h-4 w-4 ${iconTone}`} />
        </span>

        <p className="min-w-0 flex-1 truncate leading-5">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-white/10 bg-white/[0.065] p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
