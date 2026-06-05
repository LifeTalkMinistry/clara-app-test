import { PieChart } from "lucide-react";

function parseDateOnly(value) {
  const raw = String(value || "").trim().slice(0, 10);
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBudgetMonth(monthKey) {
  const raw = String(monthKey || "").trim();
  const [year, month] = raw.split("-");
  if (!year || !month) return raw || "This month";
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCycleRange(cycleRange, monthKey) {
  const start = parseDateOnly(cycleRange?.start);
  const end = parseDateOnly(cycleRange?.end);
  if (!start || !end) return formatBudgetMonth(monthKey);
  if (start.getTime() === end.getTime()) return formatShortDate(start);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(start);
    return `${month} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
    return `${startLabel}-${formatShortDate(end)}`;
  }
  return `${formatShortDate(start)}-${formatShortDate(end)}`;
}

function formatCycleLabel(cycleLabel = "Monthly") {
  const safeLabel = String(cycleLabel || "Monthly").trim();
  return safeLabel || "Monthly";
}

function getPlanDateLabel({ cycleLabel, cycleRange, cycleDisplayLabel, monthKey }) {
  const displayCycleLabel = formatCycleLabel(cycleLabel);
  const safeDisplayLabel = String(cycleDisplayLabel || "").trim();
  if (safeDisplayLabel) return safeDisplayLabel;
  if (displayCycleLabel.toLowerCase() === "monthly") return formatBudgetMonth(monthKey);
  return formatCycleRange(cycleRange, monthKey);
}

export default function BudgetHeader({
  monthKey,
  badgeLabel,
  status,
  cycleLabel = "Monthly",
  cycleRange = null,
  cycleDisplayLabel = "",
}) {
  const displayCycleLabel = formatCycleLabel(cycleLabel);
  const planDateLabel = getPlanDateLabel({ cycleLabel: displayCycleLabel, cycleRange, cycleDisplayLabel, monthKey });

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
              {displayCycleLabel} plan • {planDateLabel}
            </p>
          </div>

          <div
            className={`relative shrink-0 select-none overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm shadow-md ${status.badge}`}
          >
            <span className="relative">{badgeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
