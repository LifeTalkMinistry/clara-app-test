export const NORMAL_SLIDE_HEIGHT = "clamp(286px, 45dvh, 430px)";
export const EXPANDED_SLIDE_HEIGHT = "clamp(438px, 62dvh, 516px)";
export const WALLET_EXPANDED_SLIDE_HEIGHT = "clamp(515px, 73dvh, 647px)";

export const getFinanceSlideShellClass = (cardKey, theme = null, isExpanded = false) => {
  const baseShell =
    "border-white/[0.105] bg-[radial-gradient(circle_at_14%_0%,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.14),transparent_48%),linear-gradient(135deg,rgba(3,18,32,0.94),rgba(5,14,35,0.975)_48%,rgba(24,12,57,0.94))] shadow-[0_24px_70px_rgba(0,0,0,0.34),0_0_42px_rgba(34,211,238,0.055),0_0_58px_rgba(124,58,237,0.07),inset_0_1px_0_rgba(255,255,255,0.065)]";

  const toneClassMap = {
    wallet:
      theme?.tokens?.financeWalletShell ||
      baseShell,
    budget:
      theme?.tokens?.financeBudgetShell ||
      baseShell,
    emergencyFund:
      theme?.tokens?.financeEmergencyShell ||
      baseShell,
    savingsGoals:
      theme?.tokens?.financeSavingsShell ||
      baseShell,
    investmentFund:
      theme?.tokens?.financeInvestmentShell ||
      baseShell,
    debtObligations:
      theme?.tokens?.financeDebtShell ||
      baseShell,
  };

  return [
    "clara-finance-slide-surface absolute inset-x-0 top-0 w-full overflow-hidden rounded-[30px] border backdrop-blur-2xl transition-[height,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [&>*]:min-h-[inherit] [&>*]:rounded-[29px]",
    isExpanded ? "ring-1 ring-cyan-100/[0.12]" : "",
    toneClassMap[cardKey] || toneClassMap.budget,
  ].join(" ");
};