import {
  CheckCircle2,
  Edit3,
  Flame,
  ShieldAlert,
  Tag,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  formatTime,
  getEditableRawId,
  getIcon,
  getToneClasses,
  isEmergencyFundAllocation,
  peso,
  titleCase,
  toInputDate,
} from "../logic/transactionHubUtils";
import { StatusBadge } from "./TransactionHubPrimitives";

if (typeof globalThis !== "undefined") {
  globalThis.getEditableRawId = globalThis.getEditableRawId || getEditableRawId;
  globalThis.toInputDate = globalThis.toInputDate || toInputDate;
}

function firstTextValue(...values) {
  const value = values.find((item) => String(item || "").trim());
  return String(value || "").trim();
}

function titleBehaviorLabel(value = "") {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getTransactionSurface(group = "wallet") {
  if (group === "expense") {
    return "border-rose-200/12 bg-[linear-gradient(135deg,rgba(244,63,94,0.105),rgba(15,23,42,0.52)_52%,rgba(15,23,42,0.38))]";
  }

  if (group === "income") {
    return "border-emerald-200/12 bg-[linear-gradient(135deg,rgba(16,185,129,0.105),rgba(15,23,42,0.52)_52%,rgba(15,23,42,0.38))]";
  }

  if (group === "transfer") {
    return "border-cyan-200/12 bg-[linear-gradient(135deg,rgba(34,211,238,0.095),rgba(15,23,42,0.52)_52%,rgba(15,23,42,0.38))]";
  }

  if (group === "savings") {
    return "border-violet-200/12 bg-[linear-gradient(135deg,rgba(139,92,246,0.095),rgba(15,23,42,0.52)_52%,rgba(15,23,42,0.38))]";
  }

  return "border-slate-200/10 bg-[linear-gradient(135deg,rgba(148,163,184,0.07),rgba(15,23,42,0.52)_52%,rgba(15,23,42,0.38))]";
}

export default function TransactionCard({ item, onEdit }) {
  const Icon = getIcon(item.group);
  const tone = getToneClasses(item.group, item.signedAmount);
  const sign = item.signedAmount > 0 ? "+" : item.signedAmount < 0 ? "-" : "";
  const raw = item.raw || {};
  const isEmergencyAllocation = isEmergencyFundAllocation(item);
  const rawPlanningStatus = isEmergencyAllocation
    ? "planned"
    : raw.planning_status || raw.planningStatus || item.planningStatus || item.budgetStatus;
  const behaviorReason = firstTextValue(
    item.unplannedReason,
    item.unexpectedReason,
    item.behaviorReason,
    raw.unplanned_reason,
    raw.unplannedReason,
    raw.unexpected_reason,
    raw.unexpectedReason,
    raw.behavior_reason,
    raw.behaviorReason
  );
  const behaviorTag = firstTextValue(
    item.behaviorTag,
    raw.behavior_tag,
    raw.behaviorTag,
    raw.ai_behavior_tag,
    raw.aiBehaviorTag
  );
  const emotionalTrigger = firstTextValue(
    item.emotionalTrigger,
    raw.emotional_trigger,
    raw.emotionalTrigger
  );
  const shouldShowBehaviorNote =
    !isEmergencyAllocation &&
    item.group === "expense" &&
    (behaviorReason || behaviorTag || emotionalTrigger) &&
    String(rawPlanningStatus || "").toLowerCase() !== "planned";

  return (
    <article className={`group relative overflow-hidden rounded-[22px] border p-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition duration-300 active:scale-[0.985] ${getTransactionSurface(item.group)}`}>
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className={`absolute left-0 top-5 h-10 w-1 rounded-r-full ${tone.rail}`} />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.(isEmergencyAllocation ? { ...item, group: "expense" } : item);
        }}
        className="absolute right-3 top-3 z-20 flex h-10 w-10 touch-manipulation items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-slate-300/62 shadow-[0_10px_22px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition duration-200 hover:bg-white/[0.075] hover:text-slate-50/84 active:scale-[0.94]"
        aria-label={`Edit ${item.title}`}
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex items-start gap-3 pr-8">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border ${tone.border} ${tone.icon}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-black leading-tight text-slate-50/92">
                {item.title}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-300/64">
                <span>
                  {item.category ? titleCase(item.category) : titleCase(item.group)}
                </span>

                {item.walletName ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <WalletCards className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.walletName}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className={`text-[13px] font-black leading-tight ${tone.amount}`}>
                {sign}
                {peso(Math.abs(item.signedAmount || item.amount))}
              </p>
              <p className="mt-1 text-[9px] font-bold text-slate-400/64">
                {formatTime(item.date)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <StatusBadge icon={Tag}>{titleCase(item.group)}</StatusBadge>

            {isEmergencyAllocation ? (
              <StatusBadge icon={CheckCircle2} tone="good">
                Protected Allocation
              </StatusBadge>
            ) : null}

            {!isEmergencyAllocation && item.group === "expense" && item.budgetStatus ? (
              <StatusBadge
                icon={CheckCircle2}
                tone={item.budgetStatus === "planned" ? "good" : "warn"}
              >
                {item.budgetStatus === "planned" ? "Planned" : "Unplanned"}
              </StatusBadge>
            ) : null}

            {!isEmergencyAllocation && item.isBudgetRisk ? (
              <StatusBadge icon={ShieldAlert} tone="bad">
                Budget Risk
              </StatusBadge>
            ) : null}

            {!isEmergencyAllocation && item.isGoodDecision ? (
              <StatusBadge icon={CheckCircle2} tone="good">
                Good Decision
              </StatusBadge>
            ) : null}

            {!isEmergencyAllocation && item.isFrequent ? (
              <StatusBadge icon={Flame} tone="warn">
                Frequent
              </StatusBadge>
            ) : null}

            {!isEmergencyAllocation && item.isHighSpend ? (
              <StatusBadge icon={TrendingUp} tone="bad">
                High Spend
              </StatusBadge>
            ) : null}
          </div>

          {shouldShowBehaviorNote ? (
            <div className="mt-2.5 rounded-[16px] border border-amber-200/14 bg-amber-300/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-100/66">
                <ShieldAlert className="h-3 w-3" />
                Spending Reason
              </div>

              {behaviorReason ? (
                <p className="mt-1.5 text-[11.5px] font-semibold leading-5 text-slate-100/72">
                  {behaviorReason}
                </p>
              ) : null}

              {behaviorTag || emotionalTrigger ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {behaviorTag ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-200/62">
                      {titleBehaviorLabel(behaviorTag)}
                    </span>
                  ) : null}

                  {emotionalTrigger ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-200/62">
                      {titleBehaviorLabel(emotionalTrigger)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {item.note ? (
            <p className="mt-2.5 line-clamp-2 rounded-[16px] border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium leading-5 text-slate-200/60">
              {item.note}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
