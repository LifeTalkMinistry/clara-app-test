import { useCallback, useEffect, useRef } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";

const SINGLE_TAP_DELAY = 240;
const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_DELAY = 520;

export default function DashboardMoneySummaryStable({
  dashboardScale = {},
  selectedDashboardTheme = {},
  themeIsLight = false,
  themeSoftTextClass = "text-white/55",
  themePrimaryTextClass = "text-white",
  moneySummaryVisible = true,
  toggleMoneySummaryVisibility,
  moneyLeftSummaryHandlers = {},
  handleMoneyLeftOrbClick,
  stopMoneyLeftOrbEvent,
  walletMoney = 0,
  thisMonthSpent = 0,
  fmt = (value) => String(value ?? 0),
}) {
  const tapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapAtRef = useRef(0);

  const clearTapTimer = useCallback(() => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTapTimer();
      clearLongPressTimer();
    };
  }, [clearLongPressTimer, clearTapTimer]);

  const stopOrbEvent = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();
      stopMoneyLeftOrbEvent?.(event);
    },
    [stopMoneyLeftOrbEvent]
  );

  const openManualLog = useCallback(
    (event) => {
      if (typeof handleMoneyLeftOrbClick === "function") {
        handleMoneyLeftOrbClick(event);
        return;
      }

      moneyLeftSummaryHandlers?.openManualExpenseFromMoneyLeft?.(event);
    },
    [handleMoneyLeftOrbClick, moneyLeftSummaryHandlers]
  );

  const openTransactionHub = useCallback(
    (event) => {
      moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
    },
    [moneyLeftSummaryHandlers]
  );

  const handleOrbPointerDown = useCallback(
    (event) => {
      stopOrbEvent(event);
      longPressTriggeredRef.current = false;
      clearLongPressTimer();

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        clearTapTimer();
      }, LONG_PRESS_DELAY);
    },
    [clearLongPressTimer, clearTapTimer, stopOrbEvent]
  );

  const handleOrbPointerUp = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      const now = Date.now();
      const previousTapAt = lastTapAtRef.current || 0;

      if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
        lastTapAtRef.current = 0;
        clearTapTimer();
        openTransactionHub(event);
        return;
      }

      lastTapAtRef.current = now;
      clearTapTimer();
      tapTimerRef.current = setTimeout(() => {
        lastTapAtRef.current = 0;
        openManualLog(event);
      }, SINGLE_TAP_DELAY);
    },
    [
      clearLongPressTimer,
      clearTapTimer,
      openManualLog,
      openTransactionHub,
      stopOrbEvent,
    ]
  );

  const handleOrbCancel = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
    },
    [clearLongPressTimer, stopOrbEvent]
  );

  const handleOrbClick = useCallback(
    (event) => {
      stopOrbEvent(event);
    },
    [stopOrbEvent]
  );

  const summarySurface = {
    background:
      "linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.97) 48%, rgba(37,13,74,0.97))",
  };

  const moneyCellSurface = {
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.042), rgba(255,255,255,0.014))",
  };

  const expenseCellSurface = {
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.024), rgba(255,255,255,0.012))",
  };

  return (
    <div
      className={`relative mt-2 grid cursor-default select-none grid-cols-2 overflow-hidden border ${
        dashboardScale.summaryGrid || "rounded-[26px]"
      }`}
      style={{
        ...summarySurface,
        borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.22)",
        boxShadow: themeIsLight
          ? "0 18px 44px rgba(15,23,42,0.10)"
          : "0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <button
        type="button"
        data-clara-summary-privacy-toggle="true"
        onClick={toggleMoneySummaryVisibility}
        className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95"
        aria-label={
          moneySummaryVisible
            ? "Hide financial summary amounts"
            : "Show financial summary amounts"
        }
      >
        {moneySummaryVisible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      <div
        data-clara-summary-card="money-left"
        className={`relative isolate overflow-hidden ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={moneyCellSurface}
      >
        <div className="absolute inset-y-0 right-0 z-50 flex w-[88px] items-center justify-center pr-3">
          <button
            type="button"
            data-clara-manual-expense-orb="true"
            onClick={handleOrbClick}
            onDoubleClick={handleOrbClick}
            onPointerDown={handleOrbPointerDown}
            onPointerUp={handleOrbPointerUp}
            onPointerCancel={handleOrbCancel}
            onPointerLeave={handleOrbCancel}
            onContextMenu={handleOrbClick}
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-cyan-100/20 bg-white/[0.09] text-white transition hover:bg-white/[0.14] active:scale-95"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Tap to log expense, double tap for Transaction Hub, long press to ask CLARA"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center pr-24">
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
          >
            {moneySummaryVisible ? fmt(walletMoney) : "₱••••••"}
          </h2>
        </div>
      </div>

      <div
        data-clara-summary-card="total-expense"
        className={`relative isolate overflow-hidden border-l ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={{
          ...expenseCellSurface,
          borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.16)",
        }}
      >
        <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center">
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
