import { memo } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { compareDashboardSectionProps } from "./dashboardMemoUtils";

function DashboardMoneySummary({
  dashboardScale,
  selectedDashboardTheme,
  themeIsLight = false,
  themeSoftTextClass = "text-white/55",
  themePrimaryTextClass = "text-white",
  moneySummaryVisible = false,
  toggleMoneySummaryVisibility,
  financialSummaryParentHandlers = {},
  financialSummaryInertHandlers = {},
  moneyLeftSummaryHandlers = {},
  handleMoneyLeftOrbClick,
  startMoneyLeftOrbLongPress,
  endMoneyLeftOrbLongPress,
  stopMoneyLeftOrbEvent,
  walletMoney = 0,
  thisMonthSpent = 0,
  fmt = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`,
}) {
  return (
    <section
      {...financialSummaryParentHandlers}
      aria-label="Financial summary"
      data-clara-dashboard-section="money-summary"
      className={`relative grid cursor-default select-none grid-cols-2 overflow-hidden border backdrop-blur-sm ${dashboardScale?.summaryGrid || "rounded-[26px]"}`}
      style={{
        borderColor:
          selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
        boxShadow: themeIsLight
          ? "0 18px 44px rgba(15,23,42,0.10)"
          : "0 22px 65px rgba(0,0,0,0.26)",
        WebkitTapHighlightColor: "transparent",
        touchAction: "pan-y",
      }}
    >
      <button
        type="button"
        data-clara-summary-privacy-toggle="true"
        onClick={toggleMoneySummaryVisibility}
        onPointerUp={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/55 shadow-[0_0_14px_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.13] hover:text-white/85 active:scale-95"
        aria-label={moneySummaryVisible ? "Hide financial summary amounts" : "Show financial summary amounts"}
        title={moneySummaryVisible ? "Hide amounts" : "Show amounts"}
      >
        {moneySummaryVisible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      <div
        {...moneyLeftSummaryHandlers}
        aria-label="Double tap Total Money Left to open Transaction Hub"
        data-clara-summary-card="money-left"
        className={`pointer-events-auto relative isolate cursor-default overflow-hidden ${dashboardScale?.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"}`}
        style={{
          background:
            selectedDashboardTheme?.tokens?.gradientMoney ||
            "var(--theme-gradient-money)",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <div
          {...moneyLeftSummaryHandlers}
          aria-hidden="true"
          className="absolute inset-0 z-30 cursor-default bg-transparent"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-50 flex w-[88px] items-center justify-center pr-3">
          <button
            type="button"
            data-clara-manual-expense-orb="true"
            onClick={handleMoneyLeftOrbClick}
            onPointerDown={startMoneyLeftOrbLongPress}
            onPointerUp={endMoneyLeftOrbLongPress}
            onPointerCancel={endMoneyLeftOrbLongPress}
            onPointerLeave={endMoneyLeftOrbLongPress}
            onContextMenu={stopMoneyLeftOrbEvent}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.10] text-white shadow-[0_0_22px_rgba(147,197,253,0.18)] backdrop-blur-xl transition hover:bg-white/[0.15] active:scale-95"
            aria-label="Tap to log expense, long press to open CLARA AI"
            title="Tap to log expense, long press for CLARA AI"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="pointer-events-none relative flex min-h-full min-w-0 flex-col justify-center pr-24">
          <p className={`uppercase ${dashboardScale?.summaryLabel || "text-[11px] tracking-[0.22em]"} ${themeSoftTextClass}`}>
            Money Left
          </p>
          <h2
            className={`font-bold leading-none ${dashboardScale?.summaryAmount || "text-[clamp(32px,8.4vw,37px)]"} ${themePrimaryTextClass}`}
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
        className={`pointer-events-auto relative isolate cursor-default overflow-hidden border-l ${dashboardScale?.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"}`}
        style={{
          background:
            selectedDashboardTheme?.tokens?.gradientExpense ||
            "var(--theme-gradient-expense)",
          borderColor:
            selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="pointer-events-none relative flex min-h-full min-w-0 flex-col justify-center">
          <p className={`uppercase ${dashboardScale?.summaryLabel || "text-[11px] tracking-[0.22em]"} ${themeSoftTextClass}`}>
            Total Expense
          </p>
          <h2 className={`font-bold leading-none ${dashboardScale?.summaryAmount || "text-[clamp(32px,8.4vw,37px)]"} ${themePrimaryTextClass}`}>
            {moneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
          </h2>
        </div>
      </div>
    </section>
  );
}

export default memo(DashboardMoneySummary, compareDashboardSectionProps);
