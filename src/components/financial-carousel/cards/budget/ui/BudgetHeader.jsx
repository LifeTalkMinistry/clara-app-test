import { PieChart } from "lucide-react";

function formatBudgetMonth(monthKey) {
  const raw = String(monthKey || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);

  if (!match) return raw || "This month";

  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCycleLabel(cycleLabel = "Monthly") {
  const safeLabel = String(cycleLabel || "Monthly").trim();
  return safeLabel || "Monthly";
}

export default function BudgetHeader({ monthKey, badgeLabel, status, cycleLabel = "Monthly" }) {
  const displayCycleLabel = formatCycleLabel(cycleLabel);

  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-teal-100/[0.15] bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(45,212,191,0.05)_42%,rgba(0,0,0,0.045))] text-teal-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(45,212,191,0.05),0_0_16px_rgba(45,212,191,0.085),0_8px_18px_rgba(0,0,0,0.16)] backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-teal-100/26 to-transparent" />
        <div className="pointer-events-none absolute -left-3 -top-3 h-8 w-8 rounded-full bg-teal-200/[0.09] blur-xl" />
        <PieChart className="relative h-4 w-4 drop-shadow-[0_0_8px_rgba(153,246,228,0.14)]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white">Budget</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">
              {displayCycleLabel} plan • {formatBudgetMonth(monthKey)}
            </p>
          </div>

          <span className={`relative shrink-0 overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_14px_rgba(45,212,191,0.05),0_8px_18px_rgba(0,0,0,0.13)] ${status.badge}`}>
            <span className="pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-teal-100/20 to-transparent" />
            <span className="relative">{badgeLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
