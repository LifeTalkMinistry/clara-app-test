import { useCallback, useEffect, useState } from "react";
import { Calculator, Eye, EyeOff } from "lucide-react";
import MoneyLeftCalculator from "./MoneyLeftCalculator";
import useMoneyLeftOrbGestures from "./useMoneyLeftOrbGestures";

const GUIDE_EXIT_EVENT = "clara:guide-exit";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_FEATURE_MONEY_CALCULATOR = "money-calculator";
const GUIDE_FEATURE_MONEY_LEFT_ORB = "money-left-orb";
const GUIDE_CALCULATOR_ROOT_CLASS = "clara-guide-money-calculator-active";

const resolveOrbAssetSrc = (assetPath = "") => {
  const trimmedPath = String(assetPath || "").trim();
  if (!trimmedPath) return "";
  if (/^(https?:|data:|blob:)/.test(trimmedPath)) return trimmedPath;
  if (trimmedPath.startsWith("/")) {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBaseUrl}${trimmedPath.replace(/^\/+/, "")}`;
  }
  return trimmedPath;
};

const CLARA_ORB_LOGO_SRC = resolveOrbAssetSrc("/images/clara/clara-orb-logo.png");

function CalculatorGuideBubble() {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-44px),360px)] -translate-x-1/2"
      style={{ top: "clamp(94px, 12dvh, 126px)" }}
      role="dialog"
      aria-live="polite"
      aria-labelledby="clara-guide-calculator-title"
    >
      <div className="relative rounded-[28px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-5 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl">
        <p
          id="clara-guide-calculator-title"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          QUICK CALCULATOR
        </p>
        <p className="mt-3 text-[14px] font-bold leading-relaxed text-white">
          Need to total, split, or check an amount before logging it? You can calculate it without leaving the dashboard.
        </p>
        <p className="mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          TAP THE CALCULATOR ICON NOW.
        </p>
      </div>
    </div>
  );
}

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
  isGuideOrbStepActive = false,
  isGuideOrbIntroActive = false,
  guideOrbPhase = null,
  guideOrbButtonRef,
  onGuideOrbSingleTap,
  onGuideOrbDoubleTap,
  onGuideOrbLongPress,
  guideMoneySummaryVisible = true,
  onGuidePrivacyToggle,
  moneyLeftSummaryHandlers = {},
  handleMoneyLeftOrbClick,
  walletMoney = 0,
  thisMonthSpent = 0,
  fmt = (value) => String(value ?? 0),
}) {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isGuideCalculatorActive, setIsGuideCalculatorActive] = useState(false);
  const spacingClass = flushSpacing ? "mt-0" : "mt-2";
  const isGuideOrbPreviewActive =
    isGuideMode &&
    isGuideOrbStepActive &&
    ["single-preview", "double-preview", "hold-preview"].includes(guideOrbPhase);
  const isGuideOrbComplete =
    isGuideMode && isGuideOrbStepActive && guideOrbPhase === "complete";
  const isGuideOrbButtonDisabled =
    (isGuideMode && !isGuideOrbStepActive) ||
    isGuideOrbIntroActive ||
    isGuideOrbPreviewActive ||
    isGuideOrbComplete;
  const effectiveMoneySummaryVisible = isGuidePrivacyStepActive
    ? guideMoneySummaryVisible
    : moneySummaryVisible;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const root = document.documentElement;

    const setCalculatorGuideActive = (active) => {
      const nextActive = Boolean(active);
      setIsGuideCalculatorActive(nextActive);
      root.classList.toggle(GUIDE_CALCULATOR_ROOT_CLASS, nextActive);
      if (!nextActive) setIsCalculatorOpen(false);

      if (nextActive) {
        window.setTimeout(() => {
          document
            .querySelector("[data-clara-money-calculator-toggle='true']")
            ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        }, 80);
      }
    };

    const handleTargetChange = (event) => {
      setCalculatorGuideActive(
        event?.detail?.feature === GUIDE_FEATURE_MONEY_CALCULATOR,
      );
    };
    const resetGuide = () => setCalculatorGuideActive(false);

    window.addEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);
    window.addEventListener(GUIDE_EXIT_EVENT, resetGuide);
    window.addEventListener(GUIDE_MODE_CHANGE_EVENT, resetGuide);

    return () => {
      root.classList.remove(GUIDE_CALCULATOR_ROOT_CLASS);
      window.removeEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);
      window.removeEventListener(GUIDE_EXIT_EVENT, resetGuide);
      window.removeEventListener(GUIDE_MODE_CHANGE_EVENT, resetGuide);
    };
  }, []);

  const openTransactionHub = useCallback(
    (event) => {
      if (!isGuideMode) {
        moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
      }
    },
    [isGuideMode, moneyLeftSummaryHandlers],
  );

  const orb = useMoneyLeftOrbGestures({
    isGuideMode,
    isGuideOrbStepActive,
    isGuideOrbButtonDisabled,
    guideOrbPhase,
    handleMoneyLeftOrbClick,
    openTransactionHub,
    onGuideOrbSingleTap,
    onGuideOrbDoubleTap,
    onGuideOrbLongPress,
  });

  const handlePrivacyToggle = useCallback(
    (event) => {
      if (isGuideCalculatorActive || isGuideOrbStepActive) {
        orb.stop(event);
        return;
      }
      if (isGuidePrivacyStepActive) {
        orb.stop(event);
        onGuidePrivacyToggle?.(event);
        return;
      }
      if (!isGuideMode) toggleMoneySummaryVisibility?.(event);
    },
    [
      isGuideCalculatorActive,
      isGuideMode,
      isGuideOrbStepActive,
      isGuidePrivacyStepActive,
      onGuidePrivacyToggle,
      orb,
      toggleMoneySummaryVisibility,
    ],
  );

  const handleCalculatorGuideComplete = useCallback(() => {
    if (!isGuideCalculatorActive || typeof window === "undefined") return;

    setIsCalculatorOpen(false);
    setIsGuideCalculatorActive(false);
    document.documentElement.classList.remove(GUIDE_CALCULATOR_ROOT_CLASS);
    window.dispatchEvent(
      new CustomEvent(GUIDE_TARGET_CHANGE_EVENT, {
        detail: { feature: GUIDE_FEATURE_MONEY_LEFT_ORB },
      }),
    );
  }, [isGuideCalculatorActive]);

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

  const moneyLeftCardHandlers = isGuideMode ? {} : { ...moneyLeftSummaryHandlers };
  delete moneyLeftCardHandlers.openTransactionHubFromMoneyLeft;

  return (
    <>
      {isGuideCalculatorActive ? (
        <style>{`
          html.${GUIDE_CALCULATOR_ROOT_CLASS} .clara-guide-carousel-bubble-shell {
            display: none !important;
          }
        `}</style>
      ) : null}

      {isGuideCalculatorActive && !isCalculatorOpen ? <CalculatorGuideBubble /> : null}

      <section
        aria-label="Financial summary"
        data-clara-dashboard-section="money-summary"
        data-clara-guide-orb-phase={isGuideOrbStepActive ? guideOrbPhase : undefined}
        className={`relative ${isGuideCalculatorActive ? "z-[150] isolate" : ""} ${spacingClass} grid cursor-default select-none grid-cols-2 overflow-hidden border ${
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
          disabled={isGuideCalculatorActive || isGuideOrbStepActive}
          aria-disabled={isGuideCalculatorActive || isGuideOrbStepActive}
          className="absolute left-[39%] top-8 z-50 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95 disabled:opacity-45 max-[380px]:left-[42%] max-[380px]:top-7"
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

        <button
          type="button"
          data-clara-money-calculator-toggle="true"
          disabled={isGuideMode && !isGuideCalculatorActive}
          aria-disabled={isGuideMode && !isGuideCalculatorActive}
          onClick={(event) => {
            event.stopPropagation();
            if (!isGuideMode || isGuideCalculatorActive) setIsCalculatorOpen(true);
          }}
          className={`absolute left-[calc(39%_+_38px)] top-8 z-50 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95 disabled:pointer-events-none disabled:opacity-35 max-[380px]:left-[calc(42%_+_38px)] max-[380px]:top-7 ${
            isGuideCalculatorActive
              ? "border-cyan-100/80 text-cyan-50 ring-2 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.48)]"
              : "border-cyan-100/15"
          }`}
          aria-label="Open calculator"
          title="Calculator"
        >
          <Calculator className="h-3.5 w-3.5" />
        </button>

        <div
          data-clara-orb-control="true"
          className="pointer-events-auto absolute right-5 top-1/2 z-50 isolate flex h-[76px] w-[76px] -translate-y-1/2 items-center justify-center max-[380px]:right-4 max-[380px]:h-[68px] max-[380px]:w-[68px]"
        >
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
            className="pointer-events-none absolute inset-[10px] rounded-full border border-cyan-100/20 bg-white/[0.055] max-[380px]:inset-[8px]"
          />
          <button
            ref={guideOrbButtonRef}
            type="button"
            data-clara-manual-expense-orb="true"
            data-clara-no-sound="true"
            data-clara-guide-orb-holding={orb.isHolding ? "true" : undefined}
            onClick={orb.stop}
            onDoubleClick={orb.stop}
            onKeyDown={orb.onKeyDown}
            onKeyUp={orb.onKeyUp}
            onBlur={orb.onBlur}
            disabled={isGuideOrbButtonDisabled}
            aria-disabled={isGuideOrbButtonDisabled}
            onPointerDown={orb.onPointerDown}
            onPointerMove={orb.onPointerMove}
            onPointerUp={orb.onPointerUp}
            onPointerCancel={orb.onPointerCancel}
            onPointerLeave={orb.onPointerLeave}
            onContextMenu={orb.stop}
            className="relative z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-cyan-100/20 bg-white/[0.09] text-white shadow-[0_0_18px_rgba(34,211,238,0.38)] transition hover:bg-white/[0.14] active:scale-95 disabled:opacity-45"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label={
              orb.awaitSingle
                ? "Tap once to practice logging an expense"
                : orb.awaitDouble
                  ? "Tap twice to practice opening Transaction Hub"
                  : orb.awaitHold
                    ? "Press and hold to practice Pause Before Buying"
                    : "Tap to log expense, double tap for Transaction Hub, long press to pause before buying"
            }
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
          {...moneyLeftCardHandlers}
          role={isGuideMode ? undefined : "button"}
          tabIndex={isGuideMode ? undefined : 0}
          aria-label={isGuideMode ? undefined : "Money Left. Double tap to open Transaction Hub."}
          className={`relative isolate overflow-hidden ${
            dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
          }`}
          style={moneyCellSurface}
        >
          <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center pr-[128px] max-[380px]:pr-[112px]">
            <p className={`uppercase ${dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"} ${themeSoftTextClass}`}>
              Money Left
            </p>
            <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"} ${themePrimaryTextClass}`}>
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
            <p className={`uppercase ${dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"} ${themeSoftTextClass}`}>
              Total Expense
            </p>
            <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"} ${themePrimaryTextClass}`}>
              {effectiveMoneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
            </h2>
          </div>
        </div>
      </section>

      <MoneyLeftCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        guideMode={isGuideCalculatorActive}
        onGuideComplete={handleCalculatorGuideComplete}
        onUseExpense={(amount) => {
          setIsCalculatorOpen(false);
          orb.openManualExpense(undefined, amount);
        }}
      />
    </>
  );
}
