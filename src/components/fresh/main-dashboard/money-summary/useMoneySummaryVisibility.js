import { useCallback } from "react";
import useMoneyVisibilityPreference from "@/components/hooks/useMoneyVisibilityPreference";

export default function useMoneySummaryVisibility() {
  const {
    moneyAmountsVisible,
    isMoneyVisibilityLoaded,
    toggleMoneyVisibility,
  } = useMoneyVisibilityPreference();

  const toggleMoneySummaryVisibility = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();

      toggleMoneyVisibility();
    },
    [toggleMoneyVisibility]
  );

  return [
    moneyAmountsVisible,
    toggleMoneySummaryVisibility,
    isMoneyVisibilityLoaded,
  ];
}
