import { PieChart } from "lucide-react";

export default function BudgetHeader({ monthKey, badgeLabel, status }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(0,255,220,0.10)] backdrop-blur-sm">
        <PieChart className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white">Budget</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/78">
              Monthly spending plan • {monthKey}
            </p>
          </div>

          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}>
            {badgeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
