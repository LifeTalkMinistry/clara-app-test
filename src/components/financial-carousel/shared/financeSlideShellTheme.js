export const NORMAL_SLIDE_HEIGHT = "clamp(286px, 45dvh, 430px)";
export const EXPANDED_SLIDE_HEIGHT = "clamp(438px, 62dvh, 516px)";
export const WALLET_EXPANDED_SLIDE_HEIGHT = "clamp(515px, 73dvh, 647px)";

export const getFinanceSlideShellClass = (cardKey, theme = null, isExpanded = false) => {
  // Official CLARA finance chassis.
  // Keep the card foundation consistently midnight navy / royal blue.
  // Gold and red belong to restrained identity/status accents, never to the
  // full card background. This intentionally replaces the retired cyan/purple
  // radial treatment across every financial card.
  const baseShell =
    "border-blue-100/[0.14] bg-[linear-gradient(145deg,rgba(8,50,111,0.985)_0%,rgba(6,35,82,0.992)_38%,rgba(5,24,58,0.996)_70%,rgba(4,15,39,0.998)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.38),0_0_34px_rgba(8,103,255,0.075),inset_0_1px_0_rgba(255,255,255,0.07)]";

  // Financial cards now deliberately share one branded chassis. Card-specific
  // identity is handled inside FinanceCardShell/status accents rather than by
  // giving each carousel slide a different legacy-colored background.
  const toneClassMap = {
    wallet: baseShell,
    budget: baseShell,
    emergencyFund: baseShell,
    savingsGoals: baseShell,
    investmentFund: baseShell,
    debtObligations: baseShell,
  };

  return [
    "clara-finance-slide-surface absolute inset-x-0 top-0 w-full overflow-hidden rounded-[30px] border backdrop-blur-2xl transition-[height,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [&>*]:min-h-[inherit] [&>*]:rounded-[29px]",
    isExpanded ? "ring-1 ring-blue-100/[0.14]" : "",
    toneClassMap[cardKey] || baseShell,
  ].join(" ");
};