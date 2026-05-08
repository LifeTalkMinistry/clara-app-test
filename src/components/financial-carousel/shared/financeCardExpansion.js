const DEFAULT_EXPAND_OPTIONS = {
  autoExpand: true,
  forceOpen: true,
};

export const toggleExpandedFinanceCard = ({
  detailKey,
  isExpanded,
  toggleFinanceDetails,
  expandOptions = DEFAULT_EXPAND_OPTIONS,
}) => {
  if (typeof toggleFinanceDetails !== "function" || !detailKey) return;

  if (isExpanded) {
    toggleFinanceDetails(detailKey);
    return;
  }

  toggleFinanceDetails(detailKey, expandOptions);
};
