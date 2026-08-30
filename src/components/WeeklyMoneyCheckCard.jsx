import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Sparkles,
  WalletCards,
} from "lucide-react";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import {
  WEEKLY_MONEY_CHECK_COMPLETED_EVENT,
  WEEKLY_MONEY_CHECK_DAY_OPTIONS,
  WEEKLY_MONEY_CHECK_PROGRESS_EVENT,
  WEEKLY_MONEY_CHECK_UPDATED_EVENT,
  completeWeeklyMoneyCheck,
  getWeeklyMoneyCheckDayLabel,
  getWeeklyMoneyCheckViewState,
  readWeeklyMoneyCheck,
  setWeeklyMoneyCheckDay,
  updateWeeklyMoneyCheckProgress,
} from "@/lib/weeklyMoneyCheckStore";

const glowLayers = [
  "pointer-events-none absolute -left-[118px] -top-[136px] z-[1] h-[250px] w-[250px] rounded-full bg-cyan-400/[0.08] blur-[80px]",
  "pointer-events-none absolute -right-[128px] bottom-[-150px] z-[1] h-[270px] w-[270px] rounded-full bg-violet-500/[0.10] blur-[88px]",
];

const primaryButtonClass =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(13,103,167,0.80),rgba(18,119,125,0.76)_55%,rgba(76,64,174,0.72))] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:brightness-110 active:scale-[0.99]";

const secondaryButtonClass =
  "flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 text-[11px] font-black text-white/58 transition hover:bg-white/[0.055] hover:text-white/76 active:scale-[0.99]";

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function parseDateKey(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function formatCheckDate(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return "Not scheduled";
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function statusPill(viewState) {
  if (viewState === "ready") return { label: "Ready", className: "border-amber-200/20 bg-amber-300/10 text-amber-100" };
  if (viewState === "in_progress") return { label: "In progress", className: "border-cyan-200/20 bg-cyan-300/10 text-cyan-100" };
  if (viewState === "completed") return { label: "Checked", className: "border-emerald-200/20 bg-emerald-300/10 text-emerald-100" };
  if (viewState === "waiting") return { label: "Scheduled", className: "border-blue-200/18 bg-blue-300/10 text-blue-100" };
  return { label: "Set up", className: "border-white/10 bg-white/[0.04] text-white/52" };
}

function StateSurface({ children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center rounded-[26px] border border-white/[0.055] bg-black/[0.105] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      {children}
    </div>
  );
}

function ResultSummary({ result }) {
  const expected = result?.expected;
  const actual = result?.actual;
  const difference = result?.difference;
  const hasAmounts = Number.isFinite(expected) && Number.isFinite(actual);
  const status = String(result?.status || "").toLowerCase();
  const positive = status === "aligned" || status === "below" || (Number.isFinite(difference) && difference <= 0);

  if (!hasAmounts) {
    return (
      <div className="mt-3 rounded-[22px] border border-emerald-200/12 bg-emerald-400/[0.055] px-3.5 py-3">
        <p className="text-sm font-black text-emerald-100">Cross-check complete</p>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-white/46">
          {result?.message || "Your confirmed weekly result will appear here after CLARA finishes the check."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-3 py-3">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Expected</p>
        <p className="mt-1 text-base font-black text-white/88">{peso(expected)}</p>
      </div>
      <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-3 py-3">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Actual</p>
        <p className="mt-1 text-base font-black text-white/88">{peso(actual)}</p>
      </div>
      <div className={`col-span-2 rounded-[20px] border px-3 py-2.5 ${positive ? "border-emerald-200/12 bg-emerald-400/[0.055]" : "border-amber-200/14 bg-amber-400/[0.055]"}`}>
        <p className={`text-[11px] font-black ${positive ? "text-emerald-100" : "text-amber-100"}`}>
          {Number.isFinite(difference)
            ? `${difference > 0 ? "+" : ""}${peso(difference)} vs. your usual pattern`
            : "Weekly check confirmed"}
        </p>
      </div>
    </div>
  );
}

export default function WeeklyMoneyCheckCard({ financeCardController = null }) {
  const user = financeCardController?.user || null;
  const ownerId = getRecurringCashFlowOwnerId(user);
  const [record, setRecord] = useState(() => readWeeklyMoneyCheck(ownerId));
  const [clockTick, setClockTick] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => record.checkInDay ?? 0);

  useEffect(() => {
    const next = readWeeklyMoneyCheck(ownerId);
    setRecord(next);
    setSelectedDay(next.checkInDay ?? 0);
  }, [ownerId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refresh = (event) => {
      const eventOwnerId = String(event?.detail?.ownerId || "");
      if (eventOwnerId && eventOwnerId !== String(ownerId)) return;
      setRecord(readWeeklyMoneyCheck(ownerId));
    };
    const handleProgress = (event) => {
      const eventOwnerId = String(event?.detail?.ownerId || "");
      if (eventOwnerId && eventOwnerId !== String(ownerId)) return;
      const next = updateWeeklyMoneyCheckProgress(ownerId, event?.detail || {});
      setRecord(next);
    };
    const handleCompleted = (event) => {
      const eventOwnerId = String(event?.detail?.ownerId || "");
      if (eventOwnerId && eventOwnerId !== String(ownerId)) return;
      const next = completeWeeklyMoneyCheck(ownerId, event?.detail?.result || event?.detail || {});
      setRecord(next);
    };
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 60_000);

    window.addEventListener(WEEKLY_MONEY_CHECK_UPDATED_EVENT, refresh);
    window.addEventListener(WEEKLY_MONEY_CHECK_PROGRESS_EVENT, handleProgress);
    window.addEventListener(WEEKLY_MONEY_CHECK_COMPLETED_EVENT, handleCompleted);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(WEEKLY_MONEY_CHECK_UPDATED_EVENT, refresh);
      window.removeEventListener(WEEKLY_MONEY_CHECK_PROGRESS_EVENT, handleProgress);
      window.removeEventListener(WEEKLY_MONEY_CHECK_COMPLETED_EVENT, handleCompleted);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [ownerId]);

  const view = useMemo(
    () => getWeeklyMoneyCheckViewState(record, new Date()),
    [clockTick, record],
  );
  const pill = statusPill(view.state);
  const progress = view.progress || {};
  const walletCount = Number(progress.walletCount || 0);
  const walletsChecked = Math.min(Number(progress.walletsChecked || 0), walletCount || Number.MAX_SAFE_INTEGER);
  const progressPercent = walletCount > 0 ? Math.min((walletsChecked / walletCount) * 100, 100) : 0;

  // The card remains a passive viewer. The real CLARA cross-check flow will
  // publish progress/completion events when that AI flow is implemented.
  const openClara = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "weekly-money-check",
          weeklyMoneyCheck: {
            ownerId,
            checkInDay: record.checkInDay,
            dueDate: view.currentDue,
          },
        },
      }),
    );
  };

  const saveSchedule = (event) => {
    event.preventDefault();
    const next = setWeeklyMoneyCheckDay(ownerId, selectedDay, new Date());
    setRecord(next);
    setScheduleOpen(false);
  };

  return (
    <div className="flex h-full min-h-[inherit] flex-col rounded-[inherit]" data-weekly-money-check-state={view.state}>
      <FinanceCardShell
        cardKey="budget"
        expanded={false}
        roundedClass="rounded-3xl"
        glowLayerClassNames={glowLayers}
      >
        <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-4 pt-5">
          <div className="mb-3 flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.08] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <CalendarCheck2 className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-black tracking-[-0.025em] text-white">Weekly Money Check</p>
              <p className="mt-0.5 text-[10px] font-semibold text-white/38">Cross-check your week, not every transaction.</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${pill.className}`}>
              {pill.label}
            </span>
          </div>

          {view.state === "setup" ? (
            <StateSurface>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.035] text-white/52">
                <Clock3 className="h-[18px] w-[18px]" />
              </div>
              <p className="mt-3 text-center text-[17px] font-black tracking-[-0.03em] text-white">Choose your weekly check-in</p>
              <p className="mx-auto mt-1.5 max-w-[270px] text-center text-[11px] font-semibold leading-5 text-white/44">
                Pick one day each week to confirm how your money actually moved.
              </p>
              <button type="button" onClick={() => setScheduleOpen(true)} className={`${primaryButtonClass} mt-4`}>
                Choose check-in day <ArrowRight className="h-4 w-4" />
              </button>
            </StateSurface>
          ) : null}

          {view.state === "waiting" ? (
            <StateSurface>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">Next check-in</p>
              <p className="mt-1.5 text-[22px] font-black tracking-[-0.04em] text-white">{formatCheckDate(view.nextDue)}</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-white/42">
                Your week is still in progress. Live normally and ask CLARA when a spending decision falls outside your routine.
              </p>
              {record.lastResult ? (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Last check</span>
                  <span className="text-[11px] font-black text-emerald-100/78">{record.lastResult.headline || "Completed"}</span>
                </div>
              ) : null}
              <button type="button" onClick={() => setScheduleOpen(true)} className={`${secondaryButtonClass} mt-3 w-full`}>Change check-in day</button>
            </StateSurface>
          ) : null}

          {view.state === "ready" ? (
            <StateSurface>
              <div className="flex items-center gap-2 text-cyan-100">
                <Sparkles className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em]">{view.overdueDays > 0 ? `${view.overdueDays} day${view.overdueDays === 1 ? "" : "s"} overdue` : "It's check-in day"}</p>
              </div>
              <p className="mt-2 text-[21px] font-black tracking-[-0.04em] text-white">Ready to cross-check?</p>
              <p className="mt-1.5 text-[11px] font-semibold leading-5 text-white/44">
                CLARA will guide you through your real wallet balances and the routines that mattered this week.
              </p>
              <button type="button" onClick={openClara} className={`${primaryButtonClass} mt-4`}>
                Start with CLARA <ArrowRight className="h-4 w-4" />
              </button>
            </StateSurface>
          ) : null}

          {view.state === "in_progress" ? (
            <StateSurface>
              <div className="flex items-center gap-2 text-cyan-100">
                <RefreshCw className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em]">Cross-check in progress</p>
              </div>
              <p className="mt-2 text-[19px] font-black tracking-[-0.035em] text-white">
                {walletCount > 0 ? `${walletsChecked} of ${walletCount} wallets checked` : "Continue your weekly reflection"}
              </p>
              {walletCount > 0 ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.055]">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400 transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] font-semibold leading-5 text-white/44">Your check is waiting in CLARA.</p>
              )}
              <button type="button" onClick={openClara} className={`${primaryButtonClass} mt-4`}>
                Continue with CLARA <WalletCards className="h-4 w-4" />
              </button>
            </StateSurface>
          ) : null}

          {view.state === "completed" ? (
            <StateSurface>
              <div className="flex items-center gap-2 text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em]">This week is checked</p>
              </div>
              <p className="mt-2 text-[20px] font-black tracking-[-0.04em] text-white">
                {record.lastResult?.headline || "Nice work showing up."}
              </p>
              <ResultSummary result={record.lastResult} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold text-white/34">Next: {formatCheckDate(view.nextDue)}</p>
                <button type="button" onClick={() => setScheduleOpen(true)} className={secondaryButtonClass}>Change day</button>
              </div>
            </StateSurface>
          ) : null}
        </div>
      </FinanceCardShell>

      <FinanceActionModal
        open={scheduleOpen}
        title="Weekly check-in day"
        description="Choose one day each week for your money cross-check."
        onClose={() => setScheduleOpen(false)}
        onSubmit={saveSchedule}
        submitLabel="Save check-in day"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WEEKLY_MONEY_CHECK_DAY_OPTIONS.map((option) => {
            const active = Number(selectedDay) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedDay(option.value)}
                className={`rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                  active
                    ? "border-cyan-200/28 bg-cyan-300/[0.10] text-cyan-50"
                    : "border-white/[0.08] bg-white/[0.035] text-white/58 hover:bg-white/[0.055]"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-55">{option.short}</p>
                <p className="mt-1 text-sm font-black">{option.label}</p>
              </button>
            );
          })}
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-black/[0.10] px-3.5 py-3 text-[11px] font-semibold leading-5 text-white/44">
          Current choice: <span className="font-black text-white/74">{getWeeklyMoneyCheckDayLabel(selectedDay)}</span>. You can change it anytime.
        </div>
      </FinanceActionModal>
    </div>
  );
}
