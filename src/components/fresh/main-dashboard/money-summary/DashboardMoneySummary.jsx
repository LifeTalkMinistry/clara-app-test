import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Plus, Send, X } from "lucide-react";

const SINGLE_TAP_DELAY = 240;
const DOUBLE_TAP_WINDOW = 280;
const CLARA_LONG_PRESS_DELAY = 560;
const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

function makeClaraMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function buildClaraInlineReply(text, { walletMoney = 0, thisMonthSpent = 0, fmt }) {
  const cleanText = String(text || "").trim();
  const hasAmount = /(?:₱|php\s*)?\d/i.test(cleanText);
  const moneyLeftText = fmt(walletMoney || 0);
  const spentText = fmt(thisMonthSpent || 0);

  if (!cleanText) {
    return "Tell me what you want to buy and the price, then I’ll help you pause before spending.";
  }

  if (!hasAmount) {
    return "Good. Add the price too, so I can help you compare it against your money left before you decide.";
  }

  return `Pause first. You have ${moneyLeftText} left and ${spentText} already spent this month. Ask yourself: is this planned, needed, and still worth it tomorrow?`;
}

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
  const tapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const lastTapAtRef = useRef(0);
  const claraTriggeredRef = useRef(false);
  const claraInputRef = useRef(null);

  const [claraMode, setClaraMode] = useState(false);
  const [claraDraft, setClaraDraft] = useState("");
  const [claraMessages, setClaraMessages] = useState(() => [
    makeClaraMessage("clara", "What are you thinking of buying?"),
  ]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_EVENT, {
        detail: {
          active: claraMode,
          messages: claraMessages,
        },
      })
    );
  }, [claraMode, claraMessages]);

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

      if (typeof moneyLeftSummaryHandlers?.openManualExpenseFromMoneyLeft === "function") {
        moneyLeftSummaryHandlers.openManualExpenseFromMoneyLeft(event);
      }
    },
    [handleMoneyLeftOrbClick, moneyLeftSummaryHandlers]
  );

  const openTransactionHub = useCallback(
    (event) => {
      moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
    },
    [moneyLeftSummaryHandlers]
  );

  const openClaraInline = useCallback(() => {
    clearTapTimer();
    claraTriggeredRef.current = true;
    endMoneyLeftOrbLongPress?.();
    setClaraMode(true);
    setClaraMessages([makeClaraMessage("clara", "What are you thinking of buying?")]);

    window.setTimeout(() => {
      claraInputRef.current?.focus?.();
    }, 120);
  }, [clearTapTimer, endMoneyLeftOrbLongPress]);

  const closeClaraInline = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearTapTimer();
      clearLongPressTimer();
      claraTriggeredRef.current = false;
      setClaraMode(false);
      setClaraDraft("");
      setClaraMessages([makeClaraMessage("clara", "What are you thinking of buying?")]);
    },
    [clearLongPressTimer, clearTapTimer, stopOrbEvent]
  );

  const handleOrbPointerDown = useCallback(
    (event) => {
      stopOrbEvent(event);
      claraTriggeredRef.current = false;
      clearLongPressTimer();

      longPressTimerRef.current = setTimeout(() => {
        openClaraInline();
      }, CLARA_LONG_PRESS_DELAY);
    },
    [clearLongPressTimer, openClaraInline, stopOrbEvent]
  );

  const handleOrbPointerUp = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();
      endMoneyLeftOrbLongPress?.(event);

      if (claraTriggeredRef.current || claraMode) {
        claraTriggeredRef.current = false;
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
    [claraMode, clearLongPressTimer, clearTapTimer, endMoneyLeftOrbLongPress, openManualLog, openTransactionHub, stopOrbEvent]
  );

  const handleOrbCancel = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();
      endMoneyLeftOrbLongPress?.(event);
      claraTriggeredRef.current = false;
    },
    [clearLongPressTimer, endMoneyLeftOrbLongPress, stopOrbEvent]
  );

  const handleOrbClick = useCallback(
    (event) => {
      stopOrbEvent(event);
    },
    [stopOrbEvent]
  );

  const handleClaraSubmit = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      const text = claraDraft.trim();
      if (!text) return;

      const reply = buildClaraInlineReply(text, { walletMoney, thisMonthSpent, fmt });

      setClaraMessages((current) => [
        ...current.slice(-3),
        makeClaraMessage("user", text),
        makeClaraMessage("clara", reply),
      ]);
      setClaraDraft("");
    },
    [claraDraft, fmt, thisMonthSpent, walletMoney]
  );

  useEffect(() => {
    return () => {
      clearTapTimer();
      clearLongPressTimer();
    };
  }, [clearLongPressTimer, clearTapTimer]);

  useEffect(() => {
    if (!claraMode) return undefined;

    const timer = window.setTimeout(() => claraInputRef.current?.focus?.(), 120);
    return () => window.clearTimeout(timer);
  }, [claraMode]);

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

  if (claraMode) {
    return (
      <div
        className={`relative mt-2 overflow-hidden border ${dashboardScale.summaryGrid || "rounded-[26px]"}`}
        style={{
          ...bubbleSurface,
          borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.24)",
          boxShadow: themeIsLight
            ? "0 18px 44px rgba(15,23,42,0.10)"
            : "0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-indigo-400/12 blur-3xl" />

        <button
          type="button"
          onClick={closeClaraInline}
          className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/70 transition hover:bg-white/[0.12] active:scale-95"
          aria-label="Close CLARA money chat"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className={`relative z-10 flex flex-col justify-center ${dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"}`}>
          <form
            onSubmit={handleClaraSubmit}
            className="flex items-center gap-2 rounded-[22px] border border-white/14 bg-slate-950/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <input
              ref={claraInputRef}
              value={claraDraft}
              onChange={(event) => setClaraDraft(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-[13px] font-medium text-white outline-none placeholder:text-slate-400/70"
              placeholder="Item + price, e.g. shoes ₱1,200"
              inputMode="text"
            />
            <button
              type="submit"
              disabled={!claraDraft.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_22px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95"
              aria-label="Send to CLARA"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative mt-2 grid cursor-default select-none grid-cols-2 overflow-hidden border ${
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
        onClick={toggleMoneySummaryVisibility}
        className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95"
        aria-label={moneySummaryVisible ? "Hide financial summary amounts" : "Show financial summary amounts"}
      >
        {moneySummaryVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>

      <div
        data-clara-summary-card="money-left"
        className={`relative isolate overflow-hidden ${dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"}`}
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
          <p className={`uppercase ${dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"} ${themeSoftTextClass}`}>
            Money Left
          </p>
          <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"} ${themePrimaryTextClass}`}>
            {moneySummaryVisible ? fmt(walletMoney) : "₱••••••"}
          </h2>
        </div>
      </div>

      <div
        data-clara-summary-card="total-expense"
        className={`relative isolate overflow-hidden border-l ${dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"}`}
        style={{
          ...expenseCellSurface,
          borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.16)",
        }}
      >
        <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center">
          <p className={`uppercase ${dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"} ${themeSoftTextClass}`}>
            Total Expense
          </p>
          <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"} ${themePrimaryTextClass}`}>
            {moneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
          </h2>
        </div>
      </div>
    </div>
  );
}
