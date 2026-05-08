export const NORMAL_SLIDE_HEIGHT = "clamp(286px, 45dvh, 430px)";
export const EXPANDED_SLIDE_HEIGHT = "clamp(438px, 62dvh, 516px)";

const getFinanceSlideShellClass = (cardKey, theme = null, isExpanded = false) => {
  const toneClassMap = {
    wallet:
      theme?.tokens?.financeWalletShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(3,14,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.15)]",
    budget:
      theme?.tokens?.financeBudgetShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),linear-gradient(135deg,rgba(4,25,24,0.96),rgba(3,19,18,0.98))] shadow-[0_28px_85px_rgba(16,185,129,0.16)]",
    emergencyFund:
      theme?.tokens?.financeEmergencyShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(4,17,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.16)]",
    savingsGoals:
      theme?.tokens?.financeSavingsShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_34%),linear-gradient(135deg,rgba(8,18,52,0.96),rgba(7,15,38,0.98))] shadow-[0_28px_85px_rgba(59,130,246,0.16)]",
    investmentFund:
      theme?.tokens?.financeInvestmentShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_34%),linear-gradient(135deg,rgba(29,18,8,0.96),rgba(18,11,8,0.98))] shadow-[0_28px_85px_rgba(245,158,11,0.16)]",
    debtObligations:
      theme?.tokens?.financeDebtShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.16),transparent_34%),linear-gradient(135deg,rgba(40,12,18,0.96),rgba(18,8,14,0.98))] shadow-[0_28px_85px_rgba(244,63,94,0.13)]",
  };

  return [
    "clara-finance-slide-surface absolute inset-x-0 top-0 w-full overflow-hidden rounded-[28px] border backdrop-blur-2xl transition-[height,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [&>*]:min-h-[inherit] [&>*]:rounded-[27px]",
    isExpanded ? "ring-1 ring-cyan-200/10" : "",
    toneClassMap[cardKey] || toneClassMap.budget,
  ].join(" ");
};

export default function CarouselSlideShell({
  item,
  selectedDashboardTheme,
  isExpanded = false,
  children,
}) {
  const slideHeight = isExpanded ? EXPANDED_SLIDE_HEIGHT : NORMAL_SLIDE_HEIGHT;

  return (
    <div
      className="clara-finance-slide-shell relative flex w-full min-w-full shrink-0 snap-center overflow-visible transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ height: slideHeight, minHeight: slideHeight }}
    >
      <div
        className={getFinanceSlideShellClass(
          item.key,
          selectedDashboardTheme,
          isExpanded
        )}
        style={{ height: slideHeight, minHeight: slideHeight }}
      >
        {children}
      </div>
    </div>
  );
}
