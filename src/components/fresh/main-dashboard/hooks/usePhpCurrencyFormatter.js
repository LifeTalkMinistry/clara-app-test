import { useCallback } from "react";

export default function usePhpCurrencyFormatter() {
  return useCallback((value) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(value || 0));
  }, []);
}
