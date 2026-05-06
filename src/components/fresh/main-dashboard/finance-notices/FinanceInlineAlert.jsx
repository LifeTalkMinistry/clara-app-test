import { X } from "lucide-react";

import { isProtectedFinanceRefreshWarning } from "@/utils/dashboard/dashboardHelpers";
import { shouldSilenceNormalOfflineNotice } from "./financeNoticeRules";

export default function FinanceInlineAlert({ notice, onClose }) {
  if (!notice?.message) return null;

  if (
    shouldSilenceNormalOfflineNotice(notice.message) ||
    isProtectedFinanceRefreshWarning(notice.message)
  ) {
    return null;
  }

  const tone =
    notice.type === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-rose-400/20 bg-rose-500/10 text-rose-100";

  return (
    <div className={`mb-3 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-sm leading-6">{notice.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-0.5 shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss message"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
