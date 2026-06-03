import { useRef } from "react";
import { PieChart } from "lucide-react";

const CLARA_SAMPLE_DATA_EVENT = "clara:activate-sample-user-data";
const CLICK_DELAY_MS = 260;

function parseDateOnly(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;

  const date = new Date(`${match[1]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

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

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCycleRange(cycleRange, monthKey) {
  const start = parseDateOnly(cycleRange?.start);
  const end = parseDateOnly(cycleRange?.end);

  if (!start || !end) return formatBudgetMonth(monthKey);
  if (start.getTime() === end.getTime()) return formatShortDate(start);

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(start);
    return `${month} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    const startLabel = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(start);
    const endLabel = formatShortDate(end);
    return `${startLabel}–${endLabel}`;
  }

  return `${formatShortDate(start)}–${formatShortDate(end)}`;
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

function dispatchSampleDataEvent(action) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLARA_SAMPLE_DATA_EVENT, { detail: { action } }));
}

export default function BudgetHeader({
  monthKey,
  badgeLabel,
  status,
  cycleLabel = "Monthly",
  cycleRange = null,
  cycleDisplayLabel = "",
  onBadgeDoubleClick,
}) {
  const clickTimerRef = useRef(null);
  const displayCycleLabel = formatCycleLabel(cycleLabel);
  const planDateLabel = getPlanDateLabel({
    cycleLabel: displayCycleLabel,
    cycleRange,
    cycleDisplayLabel,
    monthKey,
  });

  const clearClickTimer = () => {
    if (!clickTimerRef.current) return;
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
  };

  const handleBadgeClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.detail >= 2) return;

    clearClickTimer();
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      dispatchSampleDataEvent("activate");
    }, CLICK_DELAY_MS);
  };

  const handleBadgeDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearClickTimer();

    if (onBadgeDoubleClick) {
      onBadgeDoubleClick(event);
      return;
    }

    dispatchSampleDataEvent("restore");
  };

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
              {displayCycleLabel} plan • {planDateLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={handleBadgeClick}
            onDoubleClick={handleBadgeDoubleClick}
            onPointerDown={(event) => event.stopPropagation()}
            title="Click to load Max sample. Double click to switch back."
            className={`relative shrink-0 cursor-pointer overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_14px_rgba(45,212,191,0.05),0_8px_18px_rgba(0,0,0,0.13)] ${status.badge}`}
          >
            <span className="pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-teal-100/20 to-transparent" />
            <span className="relative">{badgeLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
