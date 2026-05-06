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
  getIcon,
  getToneClasses,
  peso,
  titleCase,
} from "../logic/transactionHubUtils";
import { StatusBadge } from "./TransactionHubPrimitives";

export default function TransactionCard({ item, onEdit }) {
  const Icon = getIcon(item.group);
  const tone = getToneClasses(item.group, item.signedAmount);
  const sign = item.signedAmount > 0 ? "+" : item.signedAmount < 0 ? "-" : "";

  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.068),rgba(255,255,255,0.028))] p-3 shadow-[0_14px_42px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition duration-300 active:scale-[0.985]">
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-32 w-32 rounded-full ${tone.glow} blur-3xl`}
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <div className={`absolute left-0 top-5 h-10 w-1 rounded-r-full ${tone.rail}`} />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.(item);
        }}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[13px] border border-white/10 bg-black/20 text-white/52 shadow-[0_10px_26px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition duration-200 hover:bg-white/[0.07] hover:text-white/82 active:scale-[0.94]"
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
              <h3 className="truncate text-[13px] font-black leading-tight text-white/92">
                {item.title}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-white/43">
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
              <p className="mt-1 text-[9px] font-bold text-white/30">
                {formatTime(item.date)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <StatusBadge icon={Tag}>{titleCase(item.group)}</StatusBadge>

            {item.group === "expense" && item.budgetStatus ? (
              <StatusBadge
                icon={CheckCircle2}
                tone={item.budgetStatus === "planned" ? "good" : "warn"}
              >
                {item.budgetStatus === "planned" ? "Planned" : "Unplanned"}
              </StatusBadge>
            ) : null}

            {item.isBudgetRisk ? (
              <StatusBadge icon={ShieldAlert} tone="bad">
                Budget Risk
              </StatusBadge>
            ) : null}

            {item.isGoodDecision ? (
              <StatusBadge icon={CheckCircle2} tone="good">
                Good Decision
              </StatusBadge>
            ) : null}

            {item.isFrequent ? (
              <StatusBadge icon={Flame} tone="warn">
                Frequent
              </StatusBadge>
            ) : null}

            {item.isHighSpend ? (
              <StatusBadge icon={TrendingUp} tone="bad">
                High Spend
              </StatusBadge>
            ) : null}
          </div>

          {item.note ? (
            <p className="mt-2.5 line-clamp-2 rounded-[16px] border border-white/10 bg-black/14 px-3 py-2 text-xs font-medium leading-5 text-white/50">
              {item.note}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
