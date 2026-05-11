import { useCallback, useEffect, useRef } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";

const ORB_SINGLE_TAP_DELAY = 240;
const ORB_DOUBLE_TAP_WINDOW = 260;
const ORB_MOVE_CANCEL_DISTANCE = 12;

const isMoneyLeftSummaryEvent = (event) =>
  Boolean(event?.target?.closest?.('[data-clara-summary-card="money-left"]'));

const isMoneyLeftOrbEvent = (event) =>
  Boolean(event?.target?.closest?.('[data-clara-manual-expense-orb="true"]'));

const stopFinancialSummaryInteraction = (event) => {
  if (isMoneyLeftOrbEvent(event)) {
    return undefined;
  }

  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
  return false;
};

const isMoneySummaryPrivacyToggleEvent = (event) =>
  Boolean(event?.target?.closest?.('[data-clara-summary-privacy-toggle="true"]'));

const stopFinancialSummaryInteractionUnlessMoneyLeft = (event) => {
  if (
    isMoneyLeftSummaryEvent(event) ||
    isMoneyLeftOrbEvent(event) ||
    isMoneySummaryPrivacyToggleEvent(event)
  ) {
    return undefined;
  }

  return stopFinancialSummaryInteraction(event);
};

const financialSummaryParentHandlers = {
  onClickCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onClick: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onDoubleClickCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onDoubleClick: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onPointerUpCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onPointerUp: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onMouseUpCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onMouseUp: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onTouchEndCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onTouchEnd: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onKeyDownCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onKeyDown: stopFinancialSummaryInteractionUnlessMoneyLeft,
};

const financialSummaryInertHandlers = {
  onClickCapture: stopFinancialSummaryInteraction,
  onClick: stopFinancialSummaryInteraction,
  onDoubleClickCapture: stopFinancialSummaryInteraction,
  onDoubleClick: stopFinancialSummaryInteraction,
  onPointerUpCapture: stopFinancialSummaryInteraction,
  onPointerUp: stopFinancialSummaryInteraction,
  onMouseUpCapture: stopFinancialSummaryInteraction,
  onMouseUp: stopFinancialSummaryInteraction,
  onTouchEndCapture: stopFinancialSummaryInteraction,
  onTouchEnd: stopFinancialSummaryInteraction,
  onKeyDownCapture: stopFinancialSummaryInteraction,
  onKeyDown: stopFinancialSummaryInteraction,
};

const bubbleSurface = {
  background:
    "radial-gradient(circle at -18% -30%, rgba(20,184,166,0.30) 0%, rgba(20,184,166,0.14) 25%, rgba(20,184,166,0.04) 42%, transparent 58%), radial-gradient(circle at 77% 118%, rgba(99,102,241,0.22), rgba(79,70,229,0.14) 34%, rgba(88,28,135,0.08) 50%, transparent 68%), linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96))",
};

const moneyCellSurface = {
  background:
    "radial-gradient(circle at -34% -55%, rgba(45,212,191,0.20), transparent 58%), linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
};

const expenseCellSurface = {
  background:
    "radial-gradient(circle at 105% 122%, rgba(99,102,241,0.18), transparent 56%), linear-gradient(135deg, rgba(255,255,255,0.026), rgba(255,255,255,0.012))",
};

export default function DashboardMoneySummary({
  dashboardScale = {},
  selectedDashboardTheme = {},
  themeIsLight = false,
  themeSoftTextClass = "text-white/55",
  themePrimaryTextClass = "text-white",
  moneySummaryVisible = true,
  toggleMoneySummaryVisibility,
  moneyLeftSummaryHandlers = {},
  handleMoneyLeftOrbClick,
  startMoneyLeftOrbLongPress,
  endMoneyLeftOrbLongPress,
  stopMoneyLeftOrbEvent,
  walletMoney = 0,
  thisMonthSpent = 0,
  fmt = (value) => String(value ?? 0),
}) {
  const orbTapTimerRef = useRef(null);
  const orbStateRef = useRef({ lastTapAt: 0, startX: 0, startY: 0, moved: false });

  const clearOrbTapTimer = useCallback(() => {
    if (orbTapTimerRef.current) {
      clearTimeout(orbTapTimerRef.current);
      orbTapTimerRef.current = null;
    }
  }, []);

  const stopOrbEvent = useCallback(
    (event) => {
      if (typeof stopMoneyLeftOrbEvent === "function") {
        stopMoneyLeftOrbEvent(event);
        return;
      }

      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();
    },
    [stopMoneyLeftOrbEvent]
  );

  const handleOrbPointerDown = useCallback(
    (event) => {
      stopOrbEvent(event);
      const point = event?.touches?.[0] || event;
      orbStateRef.current = {
        ...orbStateRef.current,
        startX: Number(point?.clientX || 0),
        startY: Number(point?.clientY || 0),
        moved: false,
      };
      startMoneyLeftOrbLongPress?.(event);
    },
    [startMoneyLeftOrbLongPress, stopOrbEvent]
  );

  const handleOrbPointerMove = useCallback(
    (event) => {
      const point = event?.touches?.[0] || event;
      const dx = Math.abs(Number(point?.clientX || 0) - (orbStateRef.current.startX || 0));
      const dy = Math.abs(Number(point?.clientY || 0) - (orbStateRef.current.startY || 0));

      if (dx > ORB_MOVE_CANCEL_DISTANCE || dy > ORB_MOVE_CANCEL_DISTANCE) {
        orbStateRef.current.moved = true;
        endMoneyLeftOrbLongPress?.(event);
      }
    },
    [endMoneyLeftOrbLongPress]
  );

  const handleOrbPointerUp = useCallback(
    (event) => {
      stopOrbEvent(event);
      endMoneyLeftOrbLongPress?.(event);

      if (orbStateRef.current.moved) {
        orbStateRef.current.lastTapAt = 0;
        orbStateRef.current.moved = false;
        clearOrbTapTimer();
        return;
      }

      const now = Date.now();
      const previousTapAt = orbStateRef.current.lastTapAt || 0;

      if (previousTapAt && now - previousTapAt <= ORB_DOUBLE_TAP_WINDOW) {
        orbStateRef.current.lastTapAt = 0;
        clearOrbTapTimer();
        moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
        return;
      }

      orbStateRef.current.lastTapAt = now;
      clearOrbTapTimer();
      orbTapTimerRef.current = setTimeout(() => {
        orbStateRef.current.lastTapAt = 0;
        handleMoneyLeftOrbClick?.(event);
      }, ORB_SINGLE_TAP_DELAY);
    },
    [
      clearOrbTapTimer,
      endMoneyLeftOrbLongPress,
      handleMoneyLeftOrbClick,
      moneyLeftSummaryHandlers,
      stopOrbEvent,
    ]
  );

  const handleOrbCancel = useCallback(
    (event) => {
      stopOrbEvent(event);
      endMoneyLeftOrbLongPress?.(event);
      orbStateRef.current.moved = false;
      clearOrbTapTimer();
    },
    [clearOrbTapTimer, endMoneyLeftOrbLongPress, stopOrbEvent]
  );

  const handleOrbClick = useCallback(
    (event) => {
      stopOrbEvent(event);
    },
    [stopOrbEvent]
  );

  useEffect(() => {
    return () => {
      clearOrbTapTimer();
    };
  }, [clearOrbTapTimer]);

  return (
    <div
      {...financialSummaryParentHandlers}
      aria-label="Financial summary"
      className={`relative mt-2 grid cursor-default select-none grid-cols-2 overflow-hidden border ${
        dashboardScale.summaryGrid || "rounded-[26px]"
      }`}
      style={{
        ...bubbleSurface,
        borderColor:
          selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.22)",
        boxShadow: themeIsLight
          ? "0 18px 44px rgba(15,23,42,0.10)"
          : "0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)",
        WebkitTapHighlightColor: "transparent",
        touchAction: "pan-y",
      }}
    >
      <div className="pointer-events-none absolute -left-[112px] -top-[140px] z-[1] h-[220px] w-[220px] rounded-full bg-cyan-300/[0.10]" />
      <div className="pointer-events-none absolute bottom-[-160px] left-[36%] z-[1] h-[250px] w-[250px] rounded-full bg-blue-400/[0.12]" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.018)_36%,rgba(0,0,0,0.10))]" />
      <div className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/10" />

      <button
        type="button"
        data-clara-summary-privacy-toggle="true"
        onClick={toggleMoneySummaryVisibility}
        onPointerUp={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95"
        aria-label={
          moneySummaryVisible
            ? "Hide financial summary amounts"
            : "Show financial summary amounts"
        }
        title={moneySummaryVisible ? "Hide amounts" : "Show amounts"}
      >
        {moneySummaryVisible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      <div
        {...financialSummaryInertHandlers}
        aria-label="Total Money Left — non-clickable display only"
        data-clara-summary-card="money-left"
        className={`pointer-events-auto relative isolate z-10 cursor-default overflow-hidden ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={{
          ...moneyCellSurface,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <div
          {...financialSummaryInertHandlers}
          aria-hidden="true"
          className="absolute inset-0 z-30 cursor-default bg-transparent"
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        />

        <div className="pointer-events-none absolute -left-[88px] -top-[104px] z-[1] h-[174px] w-[174px] rounded-full bg-teal-300/[0.12]" />
        <div className="pointer-events-none absolute bottom-[-118px] right-[-80px] z-[1] h-[190px] w-[190px] rounded-full bg-cyan-400/[0.08]" />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-50 flex w-[88px] items-center justify-center pr-3">
          <button
            type="button"
            data-clara-manual-expense-orb="true"
            onClick={handleOrbClick}
            onDoubleClick={handleOrbClick}
            onPointerDown={handleOrbPointerDown}
            onPointerMove={handleOrbPointerMove}
            onPointerUp={handleOrbPointerUp}
            onPointerCancel={handleOrbCancel}
            onPointerLeave={handleOrbCancel}
            onContextMenu={handleOrbClick}
            className="pointer-events-auto flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-cyan-100/20 bg-white/[0.09] text-white transition hover:bg-white/[0.14] active:scale-95"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Tap to log expense, double tap for Transaction Hub, long press to open CLARA AI"
            title="Tap to log expense • Double tap for Transaction Hub • Long press for CLARA AI"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="pointer-events-none relative z-10 flex min-h-full min-w-0 flex-col justify-center pr-24">
          <p
            className={`uppercase ${
              dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"
            } ${themeSoftTextClass}`}
          >
            Money Left
          </p>
          <h2
            className={`font-bold leading-none ${
              dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"
            } ${themePrimaryTextClass}`}
            style={{ marginTop: "clamp(14px, 2.8vw, 20px)" }}
          >
            {moneySummaryVisible ? fmt(walletMoney) : "₱••••••"}
          </h2>
        </div>
      </div>

      <div
        {...financialSummaryInertHandlers}
        aria-hidden="true"
        data-clara-summary-card="total-expense"
        className={`pointer-events-auto relative isolate z-10 cursor-default overflow-hidden border-l ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={{
          ...expenseCellSurface,
          borderColor:
            selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.16)",
          WebkitTapHighlightColor: "transparent",
          touchAction: "pan-y",
        }}
      >
        <div
          {...financialSummaryInertHandlers}
          aria-hidden="true"
          className="absolute inset-0 z-30 cursor-default bg-transparent"
          style={{ touchAction: "pan-y", WebkitTapHighlightColor: "transparent" }}
        />

        <div className="pointer-events-none absolute -right-[94px] -bottom-[116px] z-[1] h-[198px] w-[198px] rounded-full bg-indigo-400/[0.12]" />
        <div className="pointer-events-none absolute -left-[84px] top-[-118px] z-[1] h-[176px] w-[176px] rounded-full bg-purple-400/[0.06]" />

        <div className="pointer-events-none relative z-10 flex min-h-full min-w-0 flex-col justify-center">
          <p
            className={`uppercase ${
              dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"
            } ${themeSoftTextClass}`}
          >
            Total Expense
          </p>
          <h2
            className={`font-bold leading-none ${
              dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"
            } ${themePrimaryTextClass}`}
          >
            {moneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
          </h2>
        </div>
      </div>
    </div>
  );
}
