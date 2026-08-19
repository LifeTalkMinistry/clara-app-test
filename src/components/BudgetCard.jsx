import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ScanLine,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import {
  readWeeklyMoneyCheckState,
  startWeeklyMoneyCheckSession,
  WEEKLY_MONEY_CHECK_UPDATED_EVENT,
} from "@/lib/weeklyMoneyCheckState";

const MONEY_CHECK_GLOW_LAYERS = [];

function parseLocalDate(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const date = new Date(year || 0, (month || 1) - 1, day || 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCheckInDate(event) {
  const date = parseLocalDate(event?.date);
  if (!date) return "Scheduled in Calendar";
  return date.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

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

export default function BudgetCard() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const [checkState, setCheckState] = useState(() => readWeeklyMoneyCheckState(user));

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
  const scheduledEvent = checkState?.scheduledEvent || null;
  const session = checkState?.session || {};
  const result = useMemo(() => getResultNumbers(session), [session]);
  const checkInLabel = formatCheckInDate(scheduledEvent);

  const openSchedule = () => {
    const params = new URLSearchParams({
      view: "schedule",
      setup: "weekly-money-check",
    });
    if (scheduledEvent?.date) params.set("date", scheduledEvent.date);
    navigate(`/community?${params.toString()}`);
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

  let eyebrow = "Weekly Money Check";
  let headline = "Choose your weekly check-in";
  let body = "Pick one day each week to compare your real money with the life you planned.";
  let primaryLabel = "Choose check-in day";
  let primaryAction = openSchedule;
  let secondaryLabel = "";
  let secondaryAction = null;

  if (stateKey === "waiting") {
    eyebrow = "Next check-in";
    headline = checkInLabel;
    body = "Your week is still in progress. Live normally and use CLARA when a spending decision falls outside your routine.";
    primaryLabel = "View schedule";
    primaryAction = openSchedule;
  } else if (stateKey === "ready") {
    eyebrow = "Ready today";
    headline = "Ready to cross-check?";
    body = "Let’s compare your real wallet balances with what your week was expected to cost.";
    primaryLabel = "Start Weekly Check";
    primaryAction = () => openClaraCheck();
    secondaryLabel = "View schedule";
    secondaryAction = openSchedule;
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
    if (scheduledEvent?.date) {
      secondaryLabel = `Next: ${checkInLabel}`;
      secondaryAction = openSchedule;
    }
  }

  return (
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
  );
}
