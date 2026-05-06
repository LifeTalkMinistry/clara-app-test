import { ChevronDown } from "lucide-react";

import {
  DEFAULT_THEME,
  getTimelineStats,
  peso,
} from "../logic/transactionHubUtils";
import TransactionCard from "./TransactionCard";

export default function TimelineDropdown({
  group,
  items,
  isOpen,
  onToggle,
  onEdit,
  theme = DEFAULT_THEME,
}) {
  const stats = getTimelineStats(items);
  const hasItems = items.length > 0;

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border bg-white/[0.045] shadow-[0_18px_52px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 ${
        isOpen ? `${theme.border} ${theme.glowSoft}` : "border-white/10"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full ${theme.orb} blur-3xl opacity-70`}
      />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-28 w-28 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.06))] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-center justify-between gap-3 p-3.5 text-left transition duration-200 active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[16px] font-black tracking-tight text-white/92">
              {group.label}
            </h2>
            <span className="shrink-0 rounded-full border border-white/10 bg-black/18 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/43">
              {stats.count}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 overflow-hidden">
            <span className="truncate text-xs font-black text-white/68">
              {stats.total >= 0 ? "+" : "-"}
              {peso(Math.abs(stats.total))}
            </span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-white/22" />
            <span className="truncate text-[11px] font-semibold text-white/36">
              Out {peso(stats.spent)} · In {peso(stats.income)}
            </span>
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border transition duration-300 ${
            isOpen
              ? `${theme.border} ${theme.orb} ${theme.primaryText}`
              : "border-white/10 bg-black/18 text-white/48"
          }`}
        >
          <ChevronDown
            className={`h-4.5 w-4.5 transition duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2.5 border-t border-white/10 p-3 pt-3.5">
            {hasItems ? (
              items.map((item) => (
                <TransactionCard key={item.id} item={item} onEdit={onEdit} />
              ))
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-black/14 px-4 py-4 text-center text-sm font-semibold text-white/42">
                Nothing here yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
