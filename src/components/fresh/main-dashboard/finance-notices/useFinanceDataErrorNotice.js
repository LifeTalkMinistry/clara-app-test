import { useEffect } from "react";
import { isProtectedFinanceRefreshWarning } from "@/utils/dashboard/dashboardHelpers";

export default function useFinanceDataErrorNotice({
  financeDataError,
  hasVisibleFinanceData,
  setFinanceNotice,
}) {
  useEffect(() => {
    if (!financeDataError) return;

    const message =
      typeof financeDataError === "string"
        ? financeDataError
        : financeDataError?.message;

    if (!message) return;

    if (hasVisibleFinanceData || isProtectedFinanceRefreshWarning(message)) {
      console.warn("Background finance refresh warning:", message);
      return;
    }

    setFinanceNotice({ message, type: "error" });
  }, [financeDataError, hasVisibleFinanceData, setFinanceNotice]);
}
