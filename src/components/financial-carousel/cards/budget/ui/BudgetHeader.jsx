import { PieChart } from "lucide-react";

export default function BudgetHeader({ monthKey, badgeLabel, status, cycleLabel = "Monthly" }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-teal-100/15 bg-white/10 text-teal-100 shadow-md backdrop-blur-sm">
        <PieChart className="relative h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white">Budget</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">
              {cycleLabel} plan • {monthKey || "This month"}
            </p>
          </div>
          <div className={`relative shrink-0 select-none overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm shadow-md ${status.badge}`}>
            <span className="relative">{badgeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
