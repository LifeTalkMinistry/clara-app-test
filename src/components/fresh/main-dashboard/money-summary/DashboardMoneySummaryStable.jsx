import { useCallback, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";

const SINGLE_TAP_DELAY = 240;
const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_DELAY = 550;
const MOVE_CANCEL_DISTANCE = 12;

const resolveOrbAssetSrc = (assetPath = "") => {
  const trimmedPath = String(assetPath || "").trim();
  if (!trimmedPath) return "";

  if (
    trimmedPath.startsWith("http://") ||
    trimmedPath.startsWith("https://") ||
    trimmedPath.startsWith("data:") ||
    trimmedPath.startsWith("blob:")
  ) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith("/")) {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBaseUrl}${trimmedPath.replace(/^\/+/, "")}`;
  }

  return trimmedPath;
};

const CLARA_ORB_LOGO_SRC = resolveOrbAssetSrc("/images/clara/clara-orb-logo.png");

export default function DashboardMoneySummaryStable({
  dashboardScale = {},
  selectedDashboardTheme = {},
  themeIsLight = false,
  themeSoftTextClass = "text-white/55",
  themePrimaryTextClass = "text-white",
  flushSpacing = false,
  moneySummaryVisible = true,
  toggleMoneySummaryVisibility,
  isGuideMode = false,
  isGuidePrivacyStepActive = false,
  guideMoneySummaryVisible = true,
  onGuidePrivacyToggle,
  moneyLeftSummaryHandlers = {},
  handleMoneyLeftOrbClick,
  startMoneyLeftOrbLongPress,
  moveMoneyLeftOrbLongPress,
  endMoneyLeftOrbLongPress,
  stopMoneyLeftOrbEvent,
  walletMoney = 0,
  thisMonthSpent = 0,
  fmt = (value) => String(value ?? 0),
}) {
  const tapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const pointerStateRef = useRef({ startX: 0, startY: 0, moved: false });
  const spacingClass = flushSpacing ? "mt-0" : "mt-2";
  const effectiveMoneySummaryVisible = isGuidePrivacyStepActive
    ? guideMoneySummaryVisible
    : moneySummaryVisible;

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

  const resetOrbGestureState = useCallback(() => {
    clearTapTimer();
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    lastTapAtRef.current = 0;
    pointerStateRef.current = { startX: 0, startY: 0, moved: false };
  }, [clearLongPressTimer, clearTapTimer]);

  useEffect(() => {
    return resetOrbGestureState;
  }, [resetOrbGestureState]);

  useEffect(() => {
    resetOrbGestureState();
  }, [isGuideMode, resetOrbGestureState]);

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
      if (isGuideMode) return;

      if (typeof handleMoneyLeftOrbClick === "function") {
        handleMoneyLeftOrbClick(event);
        return;
      }

      moneyLeftSummaryHandlers?.openManualExpenseFromMoneyLeft?.(event);
    },
    [handleMoneyLeftOrbClick, isGuideMode, moneyLeftSummaryHandlers]
  );

  const openTransactionHub = useCallback(
    (event) => {
      if (isGuideMode) return;
      moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
    },
    [isGuideMode, moneyLeftSummaryHandlers]
  );

  const handleOrbPointerDown = useCallback(
    (event) => {
      stopOrbEvent(event);
      const point = event?.touches?.[0] || event;
      pointerStateRef.current = {
        startX: Number(point?.clientX || 0),
        startY: Number(point?.clientY || 0),
        moved: false,
      };
      longPressTriggeredRef.current = false;
      clearLongPressTimer();

      const now = Date.now();
      const previousTapAt = lastTapAtRef.current || 0;
      if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
        clearTapTimer();
      }

      if (!isGuideMode) {
        startMoneyLeftOrbLongPress?.(event);
      }

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        clearTapTimer();
        lastTapAtRef.current = 0;
      }, LONG_PRESS_DELAY);
    },
    [
      clearLongPressTimer,
      clearTapTimer,
      isGuideMode,
      startMoneyLeftOrbLongPress,
      stopOrbEvent,
    ]
  );

  const handleOrbPointerMove = useCallback(
    (event) => {
      stopOrbEvent(event);
      const point = event?.touches?.[0] || event;
      const dx = Math.abs(
        Number(point?.clientX || 0) - pointerStateRef.current.startX
      );
      const dy = Math.abs(
        Number(point?.clientY || 0) - pointerStateRef.current.startY
      );

      if (dx <= MOVE_CANCEL_DISTANCE && dy <= MOVE_CANCEL_DISTANCE) return;

      pointerStateRef.current.moved = true;
      clearLongPressTimer();

      if (!isGuideMode) {
        if (typeof moveMoneyLeftOrbLongPress === "function") {
          moveMoneyLeftOrbLongPress(event);
        } else {
          endMoneyLeftOrbLongPress?.(event);
        }
      }
    },
    [
      clearLongPressTimer,
      endMoneyLeftOrbLongPress,
      isGuideMode,
      moveMoneyLeftOrbLongPress,
      stopOrbEvent,
    ]
  );

  const handleOrbPointerUp = useCallback(
    (event) => {
      stopOrbEvent(event);

      if (!isGuideMode) {
        endMoneyLeftOrbLongPress?.(event);
      }

      clearLongPressTimer();

      if (pointerStateRef.current.moved || longPressTriggeredRef.current) {
        pointerStateRef.current.moved = false;
        longPressTriggeredRef.current = false;
        lastTapAtRef.current = 0;
        clearTapTimer();
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
      }, Math.max(SINGLE_TAP_DELAY, DOUBLE_TAP_WINDOW));
    },
    [
      clearLongPressTimer,
      clearTapTimer,
      endMoneyLeftOrbLongPress,
      isGuideMode,
      openManualLog,
      openTransactionHub,
      stopOrbEvent,
    ]
  );

  const handleOrbCancel = useCallback(
    (event) => {
      stopOrbEvent(event);

      if (!isGuideMode) {
        endMoneyLeftOrbLongPress?.(event);
      }

      clearLongPressTimer();
      clearTapTimer();
      longPressTriggeredRef.current = false;
      lastTapAtRef.current = 0;
      pointerStateRef.current.moved = false;
    },
    [
      clearLongPressTimer,
      clearTapTimer,
      endMoneyLeftOrbLongPress,
      isGuideMode,
      stopOrbEvent,
    ]
  );

  const handleOrbClick = useCallback(
    (event) => {
      stopOrbEvent(event);
    },
    [stopOrbEvent]
  );

  const handleOrbKeyDown = useCallback(
    (event) => {
      const key = event?.key;
      if (key !== "Enter" && key !== " " && key !== "Spacebar") return;

      stopOrbEvent(event);
      if (event?.repeat) return;

      openManualLog(event);
    },
    [openManualLog, stopOrbEvent]
  );

  const handlePrivacyToggle = useCallback(
    (event) => {
      if (isGuidePrivacyStepActive) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        event?.nativeEvent?.stopImmediatePropagation?.();
        onGuidePrivacyToggle?.(event);
        return;
      }

      if (!isGuideMode) {
        toggleMoneySummaryVisibility?.(event);
      }
    },
    [isGuideMode, isGuidePrivacyStepActive, onGuidePrivacyToggle, toggleMoneySummaryVisibility]
  );

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

  return (
    <section
      aria-label="Financial summary"
      data-clara-dashboard-section="money-summary"
      className={`relative ${spacingClass} grid cursor-default select-none grid-cols-2 overflow-hidden border ${
        dashboardScale.summaryGrid || "rounded-[26px]"
      }`}
      style={{
        ...bubbleSurface,
        borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.22)",
        boxShadow: themeIsLight
          ? "0 18px 44px rgba(15,23,42,0.10)"
          : "0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <button
        type="button"
        data-clara-summary-privacy-toggle="true"
        onClick={handlePrivacyToggle}
        className="absolute left-[39%] top-8 z-50 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95 max-[380px]:left-[42%] max-[380px]:top-7"
        aria-label={
          effectiveMoneySummaryVisible
            ? "Hide financial summary amounts"
            : "Show financial summary amounts"
        }
      >
        {effectiveMoneySummaryVisible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="pointer-events-auto absolute right-5 top-1/2 z-50 isolate flex h-[76px] w-[76px] -translate-y-1/2 items-center justify-center max-[380px]:right-4 max-[380px]:h-[68px] max-[380px]:w-[68px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-90 blur-[1px]"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.28) 0%, rgba(59,130,246,0.22) 34%, rgba(124,58,237,0.30) 58%, rgba(15,23,42,0.00) 76%)",
            boxShadow:
              "0 0 18px rgba(34,211,238,0.42), 0 0 34px rgba(124,58,237,0.36)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[10px] rounded-full border border-cyan-100/20 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] max-[380px]:inset-[8px]"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 18px rgba(34,211,238,0.32), 0 0 28px rgba(124,58,237,0.28)",
          }}
        />

        <button
          type="button"
          data-clara-manual-expense-orb="true"
          onClick={handleOrbClick}
          onDoubleClick={handleOrbClick}
          onKeyDown={handleOrbKeyDown}
          onPointerDown={handleOrbPointerDown}
          onPointerMove={handleOrbPointerMove}
          onPointerUp={handleOrbPointerUp}
          onPointerCancel={handleOrbCancel}
          onPointerLeave={handleOrbCancel}
          onContextMenu={handleOrbClick}
          className="relative z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-cyan-100/20 bg-white/[0.09] text-white shadow-[0_0_18px_rgba(34,211,238,0.38)] transition hover:bg-white/[0.14] active:scale-95"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          aria-label="Tap to log expense, double tap for Transaction Hub, long press to ask CLARA"
        >
          <img
            src={CLARA_ORB_LOGO_SRC}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-11 w-11 scale-[1.12] select-none rounded-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.42)]"
          />
        </button>
      </div>

      <div
        data-clara-summary-card="money-left"
        className={`relative isolate overflow-hidden ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={moneyCellSurface}
      >
        <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center pr-[128px] max-[380px]:pr-[112px]">
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
            {effectiveMoneySummaryVisible ? fmt(walletMoney) : "₱••••••"}
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
            {effectiveMoneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
          </h2>
        </div>
      </div>
    </section>
  );
}
