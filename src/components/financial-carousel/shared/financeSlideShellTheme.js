export const NORMAL_SLIDE_HEIGHT = "clamp(286px, 45dvh, 430px)";
export const EXPANDED_SLIDE_HEIGHT = "clamp(438px, 62dvh, 516px)";
export const WALLET_EXPANDED_SLIDE_HEIGHT = "clamp(515px, 73dvh, 647px)";

export const getFinanceSlideShellClass = (cardKey, theme = null, isExpanded = false) => {
  // One defined CLARA blue, matching the direct visual language of the
  // Daily Money Tip and Money Left cards. No card-specific teal/violet shell.
  const baseShell =
    "border-blue-200/[0.17] bg-[#073b7a] shadow-[0_22px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]";

  const toneClassMap = {
    wallet: baseShell,
    budget: baseShell,
    emergencyFund: baseShell,
    savingsGoals: baseShell,
    investmentFund: baseShell,
    debtObligations: baseShell,
  };

  return [
    "clara-finance-slide-surface absolute inset-x-0 top-0 w-full overflow-hidden rounded-[30px] border transition-[height,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [&>*]:min-h-[inherit] [&>*]:rounded-[29px]",
    isExpanded ? "ring-1 ring-blue-100/[0.16]" : "",
    toneClassMap[cardKey] || baseShell,
  ].join(" ");
};