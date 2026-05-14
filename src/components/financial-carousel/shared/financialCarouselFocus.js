export const EXPANDED_TOP_PULL = -22;
export const FINANCIAL_CAROUSEL_FOCUS_CLASS = "clara-budget-focus-mode";
export const CLARA_AI_KEYBOARD_FOCUS_CLASS = "clara-ai-keyboard-focus-mode";

export const FINANCIAL_CAROUSEL_FOCUS_STYLES = `
  .clara-budget-focus-shift,
  .clara-ai-focus-top-nav {
    transform: translate3d(0, 0, 0);
    transition:
      max-height 520ms cubic-bezier(0.22, 1, 0.36, 1),
      margin 520ms cubic-bezier(0.22, 1, 0.36, 1),
      padding 520ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 320ms ease,
      visibility 320ms ease,
      transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: max-height, margin, padding, opacity, transform;
  }

  .clara-budget-focus-mode .clara-budget-focus-tip,
  .clara-budget-focus-mode .clara-budget-focus-hub {
    max-height: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    opacity: 0;
    visibility: hidden;
    overflow: hidden;
    pointer-events: none;
  }

  .clara-ai-keyboard-focus-mode .clara-ai-focus-top-nav {
    max-height: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    opacity: 0;
    visibility: hidden;
    overflow: hidden;
    pointer-events: none;
    transform: translate3d(0, -36px, 0);
  }
`;

export const getExpandedCarouselCardIndex = (items = [], expandedFinanceCard = null) => {
  if (!expandedFinanceCard) return -1;

  return items.findIndex(
    (item) =>
      item?.detailKey === expandedFinanceCard ||
      item?.key === expandedFinanceCard ||
      item?.type === expandedFinanceCard
  );
};
