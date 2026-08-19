import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  RotateCcw,
  ScanLine,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import {
  getWeeklyMoneyCheckWeekdayLabel,
  readWeeklyMoneyCheckState,
  saveWeeklyMoneyCheckWeekday,
  startWeeklyMoneyCheckSession,
  WEEKLY_MONEY_CHECK_DAYS,
  WEEKLY_MONEY_CHECK_UPDATED_EVENT,
} from "@/lib/weeklyMoneyCheckState";

const MONEY_CHECK_GLOW_LAYERS = [];
const WEEKLY_MONEY_CHECK_SESSION_PREFIX = "clara_weekly_money_check_v1";

function cleanMoney(value) {
  const amount = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value) {
  return cleanMoney(value).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getResultNumbers(session = {}) {
  const expectedRaw =
    session.expected ??
    session.expectedAmount ??
    session.expected_amount ??
    session.expectedRoutineAmount ??
    session.expected_routine_amount;
  const actualRaw =
    session.actual ??
    session.actualAmount ??
    session.actual_amount ??
    session.actualConfirmedAmount ??
    session.actual_confirmed_amount;

  const hasExpected = expectedRaw !== undefined && expectedRaw !== null && expectedRaw !== "";
  const hasActual = actualRaw !== undefined && actualRaw !== null && actualRaw !== "";
  const expected = cleanMoney(expectedRaw);
  const actual = cleanMoney(actualRaw);

  return {
    hasResult: hasExpected || hasActual,
    expected,
    actual,
    difference: actual - expected,
  };
}

function PrimaryAction({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-center rounded-[18px] border border-cyan-100/[0.18] bg-[linear-gradient(135deg,rgba(10,66,132,0.78),rgba(14,74,126,0.74)_55%,rgba(24,104,104,0.62))] px-5 py-3 text-[12px] font-black text-white/94 shadow-[0_12px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:border-cyan-100/[0.28] hover:brightness-110 active:scale-[0.985]"
    >
      {children}
    </button>
  );
}

function QuietAction({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2.5 flex min-h-10 w-full items-center justify-center rounded-[16px] border border-white/[0.08] bg-black/20 px-4 py-2.5 text-[11px] font-black text-white/70 transition hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/88 active:scale-[0.985]"
    >
      {children}
    </button>
  );
}

function StateIcon({ stateKey }) {
  const Icon =
    stateKey === "completed"
      ? CheckCircle2
      : stateKey === "ready"
        ? ScanLine
        : stateKey === "in_progress"
          ? CircleDashed
          : CalendarClock;

  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[17px] border border-cyan-100/[0.15] bg-[linear-gradient(145deg,rgba(24,88,151,0.24),rgba(9,31,72,0.74))] text-cyan-100/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(34,211,238,0.06)]">
      <Icon className="h-[19px] w-[19px]" />
    </div>
  );
}

function WeekdayPickerModal({ open, selectedWeekday, onSelect, onClose, onSave }) {
  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const selectedLabel = getWeeklyMoneyCheckWeekdayLabel(selectedWeekday);

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/65 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-money-check-day-title"
        className="relative w-full max-w-[390px] overflow-hidden rounded-[30px] border border-cyan-100/[0.15] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_38%),linear-gradient(155deg,rgba(6,25,56,0.99),rgba(5,14,35,0.995)_58%,rgba(13,31,58,0.99))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_44px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.07)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-blue-500/[0.08] blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.035] text-white/52 transition hover:bg-white/[0.07] hover:text-white/82"
          aria-label="Close weekday picker"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-[17px] border border-cyan-100/[0.16] bg-cyan-300/[0.07] text-cyan-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <CalendarClock className="h-[19px] w-[19px]" />
          </div>

          <p className="mt-4 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/52">
            Weekly Money Check
          </p>
          <h2 id="weekly-money-check-day-title" className="mt-1.5 pr-10 text-[22px] font-black leading-tight text-white/96">
            Choose your check-in day
          </h2>
          <p className="mt-2 max-w-[320px] text-[12px] font-semibold leading-[1.6] text-white/50">
            Pick the weekday that normally works best for you. CLARA will treat it as your recurring weekly reflection day — not a one-time date.
          </p>

          <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Choose a weekday">
            {WEEKLY_MONEY_CHECK_DAYS.map((day) => {
              const selected = day.value === selectedWeekday;
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => onSelect(day.value)}
                  aria-pressed={selected}
                  aria-label={`Choose ${day.label}`}
                  className={`relative flex min-h-[52px] min-w-0 flex-col items-center justify-center rounded-[15px] border px-1 transition active:scale-[0.96] ${
                    selected
                      ? "border-cyan-100/40 bg-cyan-300/[0.13] text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_0_20px_rgba(34,211,238,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]"
                      : "border-white/[0.08] bg-white/[0.025] text-white/48 hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-white/72"
                  }`}
                >
                  {selected ? (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-cyan-50/30 bg-cyan-300 text-[#052a39] shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  ) : null}
                  <span className="text-[10px] font-black tracking-[-0.01em]">{day.short}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-h-[54px] rounded-[18px] border border-white/[0.07] bg-black/20 px-4 py-3 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">Your weekly rhythm</p>
            <p className="mt-1 text-[13px] font-black text-white/82">
              {selectedLabel ? `Every ${selectedLabel}` : "Select one day above"}
            </p>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!selectedLabel}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[18px] border border-cyan-100/[0.20] bg-[linear-gradient(135deg,rgba(8,86,164,0.92),rgba(16,91,146,0.90)_52%,rgba(23,119,112,0.80))] px-5 py-3 text-[12px] font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.30),0_0_24px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.13)] transition hover:border-cyan-100/[0.30] hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Save weekly check-in
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default function BudgetCard() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const [checkState, setCheckState] = useState(() => readWeeklyMoneyCheckState(user));
  const [weekdayPickerOpen, setWeekdayPickerOpen] = useState(false);
  const [draftWeekday, setDraftWeekday] = useState(null);

  const refreshState = useCallback(() => {
    setCheckState(readWeeklyMoneyCheckState(user));
  }, [user]);

  useEffect(() => {
    refreshState();
    if (typeof window === "undefined") return undefined;

    const onStorage = () => refreshState();
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") refreshState();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshState);
    window.addEventListener(WEEKLY_MONEY_CHECK_UPDATED_EVENT, refreshState);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshState);
      window.removeEventListener(WEEKLY_MONEY_CHECK_UPDATED_EVENT, refreshState);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshState]);

  const stateKey = checkState?.key || "setup";
  const session = checkState?.session || {};
  const result = useMemo(() => getResultNumbers(session), [session]);
  const configuredWeekday = Number.isInteger(checkState?.weekday) ? checkState.weekday : null;
  const weekdayLabel = getWeeklyMoneyCheckWeekdayLabel(configuredWeekday);

  const openWeekdayPicker = () => {
    setDraftWeekday(configuredWeekday);
    setWeekdayPickerOpen(true);
  };

  const saveWeekday = () => {
    if (!Number.isInteger(draftWeekday)) return;
    saveWeeklyMoneyCheckWeekday(user, draftWeekday);
    setWeekdayPickerOpen(false);
    refreshState();
  };

  const openClaraCheck = ({ insights = false } = {}) => {
    if (!insights) startWeeklyMoneyCheckSession(user);
    const params = new URLSearchParams({
      view: "orb",
      mode: "weekly-money-check",
      source: "dashboard-card",
    });
    if (insights) params.set("screen", "insights");
    navigate(`/community?${params.toString()}`);
  };

  const restartWeeklyCheckForDevelopment = () => {
    if (typeof window === "undefined" || !window.localStorage) return;
    const ownerId = getRecurringCashFlowOwnerId(user);
    window.localStorage.removeItem(`${WEEKLY_MONEY_CHECK_SESSION_PREFIX}_${ownerId}`);
    window.dispatchEvent(
      new CustomEvent(WEEKLY_MONEY_CHECK_UPDATED_EVENT, {
        detail: { type: "development_restart" },
      })
    );
    openClaraCheck();
  };

  let eyebrow = "Weekly Money Check";
  let headline = "Choose your weekly check-in";
  let body = "Pick one day each week to compare your real money with the life you planned.";
  let primaryLabel = "Choose check-in day";
  let primaryAction = openWeekdayPicker;
  let secondaryLabel = "";
  let secondaryAction = null;

  if (stateKey === "waiting") {
    eyebrow = "Weekly check-in";
    headline = weekdayLabel ? `Every ${weekdayLabel}` : "Your weekly rhythm is set";
    body = "Your week is still in progress. Live normally and use CLARA when a spending decision falls outside your routine.";
    primaryLabel = "Start Weekly Check";
    primaryAction = () => openClaraCheck();
    secondaryLabel = "Change check-in day";
    secondaryAction = openWeekdayPicker;
  } else if (stateKey === "ready") {
    eyebrow = weekdayLabel ? `${weekdayLabel} · Ready today` : "Ready today";
    headline = "Ready to cross-check?";
    body = "Let’s compare your real wallet balances with what your week was expected to cost.";
    primaryLabel = "Start Weekly Check";
    primaryAction = () => openClaraCheck();
    secondaryLabel = "Change check-in day";
    secondaryAction = openWeekdayPicker;
  } else if (stateKey === "in_progress") {
    eyebrow = "Cross-check in progress";
    const checked = checkState?.checkedWallets || 0;
    const total = checkState?.totalWallets || 0;
    headline = total > 0 ? `Wallets checked ${checked} of ${total}` : "Continue your weekly check";
    body = "Your progress is saved. Continue the reflection with CLARA when you’re ready.";
    primaryLabel = "Continue with CLARA";
    primaryAction = () => openClaraCheck();
  } else if (stateKey === "completed") {
    eyebrow = "This week";
    headline = result.hasResult
      ? result.difference <= 0
        ? "Spending stayed aligned"
        : "Something changed this week"
      : "Weekly check complete";
    body = result.hasResult
      ? result.difference <= 0
        ? `You finished ₱${formatMoney(Math.abs(result.difference))} below your usual pattern.`
        : `You finished ₱${formatMoney(result.difference)} above your usual pattern. Your reflection is ready to review.`
      : "Your reflection is saved. CLARA can use it to help you understand your money patterns over time.";
    primaryLabel = "View weekly insights";
    primaryAction = () => openClaraCheck({ insights: true });
    if (weekdayLabel) {
      secondaryLabel = `Change ${weekdayLabel} check-in`;
      secondaryAction = openWeekdayPicker;
    }
  }

  const canRestartDevelopmentFlow = stateKey === "in_progress" || stateKey === "completed";

  return (
    <>
      <div className="flex h-full min-h-[inherit] flex-col rounded-[inherit]" data-weekly-money-check-state={stateKey}>
        <FinanceCardShell
          cardKey="budget"
          expanded={false}
          roundedClass="rounded-3xl"
          glowLayerClassNames={MONEY_CHECK_GLOW_LAYERS}
          surfaceClassName="!border-cyan-100/[0.10] !bg-[linear-gradient(145deg,rgba(5,30,67,0.96),rgba(5,22,50,0.97)_54%,rgba(9,34,69,0.94))]"
          shadowClass="shadow-[0_24px_64px_rgba(0,0,0,0.38),0_0_30px_rgba(34,211,238,0.045),inset_0_1px_0_rgba(255,255,255,0.055)]"
        >
          <div className="relative flex h-full min-h-[inherit] flex-col justify-center overflow-hidden px-5 py-6 text-center sm:px-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-cyan-300/[0.045] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-blue-500/[0.055] blur-3xl" />

            {canRestartDevelopmentFlow ? (
              <button
                type="button"
                onClick={restartWeeklyCheckForDevelopment}
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-100/[0.16] bg-[#07172f]/72 text-cyan-100/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:border-cyan-100/[0.28] hover:bg-cyan-300/[0.08] hover:text-cyan-50 active:scale-95"
                aria-label="Restart Weekly Money Check from the beginning"
                title="Restart Weekly Money Check"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}

            <div className="relative z-10 mx-auto w-full max-w-[286px]">
              <StateIcon stateKey={stateKey} />

              <p className="mt-3 text-[9px] font-black uppercase tracking-[0.20em] text-cyan-100/52">
                {eyebrow}
              </p>
              <h2 className="mt-1.5 text-[18px] font-black leading-tight text-white/96">
                {headline}
              </h2>
              <p className="mx-auto mt-2 max-w-[260px] text-[11px] font-semibold leading-[1.55] text-white/52">
                {body}
              </p>

              {stateKey === "completed" && result.hasResult ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/34">Expected</p>
                    <p className="mt-1 text-[13px] font-black text-white/84">₱{formatMoney(result.expected)}</p>
                  </div>
                  <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/34">Actual</p>
                    <p className="mt-1 text-[13px] font-black text-white/84">₱{formatMoney(result.actual)}</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <PrimaryAction onClick={primaryAction}>{primaryLabel}</PrimaryAction>
                {secondaryLabel && secondaryAction ? (
                  <QuietAction onClick={secondaryAction}>{secondaryLabel}</QuietAction>
                ) : null}
              </div>
            </div>
          </div>
        </FinanceCardShell>
      </div>

      <WeekdayPickerModal
        open={weekdayPickerOpen}
        selectedWeekday={draftWeekday}
        onSelect={setDraftWeekday}
        onClose={() => setWeekdayPickerOpen(false)}
        onSave={saveWeekday}
      />
    </>
  );
}
