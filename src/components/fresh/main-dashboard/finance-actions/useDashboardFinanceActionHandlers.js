import { useCallback } from "react";
import useDashboardFinanceActionHandlersCore from "./useDashboardFinanceActionHandlersCore";

const EMPTY_OPTIONS = Object.freeze({});

export default function useDashboardFinanceActionHandlers(options = EMPTY_OPTIONS) {
  const handlers = useDashboardFinanceActionHandlersCore(options);
  const {
    setBudgetListOpen,
    setFinanceForm,
    setFinanceModal,
    setFinanceNotice,
    wallets,
  } = options || EMPTY_OPTIONS;
  const safeWallets = Array.isArray(wallets) ? wallets : [];

  const openManualExpenseWithAmount = useCallback(
    (request = EMPTY_OPTIONS) => {
      if (!safeWallets.length) {
        setFinanceNotice?.({
          message: "Create or fund a wallet first before logging an expense.",
          type: "error",
        });
        return false;
      }

      if (typeof setFinanceForm !== "function" || typeof setFinanceModal !== "function") {
        handlers.openManualExpenseModal?.();
        return false;
      }

      const requestedAmount = Number(
        request?.initialAmount ?? request?.detail?.initialAmount,
      );
      const initialAmount =
        Number.isFinite(requestedAmount) && requestedAmount > 0
          ? String(Number(requestedAmount.toFixed(2)))
          : "";

      setFinanceForm((previous) => ({
        ...previous,
        amount: initialAmount,
        budgetListKey: "",
        expenseWalletId: String(safeWallets[0]?.id || ""),
        unplannedReason: "",
        undocumentedReason: "",
        undocumentedNote: "",
        notes: "",
      }));
      setBudgetListOpen?.(false);
      setFinanceModal({ type: "manual_expense", payload: null });
      return true;
    },
    [
      handlers.openManualExpenseModal,
      safeWallets,
      setBudgetListOpen,
      setFinanceForm,
      setFinanceModal,
      setFinanceNotice,
    ],
  );

  const handleMoneyLeftOrbClick = useCallback(
    (event, request = EMPTY_OPTIONS) => {
      if (!request?.resolvedGesture) {
        return handlers.handleMoneyLeftOrbClick?.(event);
      }

      handlers.stopMoneyLeftOrbEvent?.(event);
      return openManualExpenseWithAmount(request);
    },
    [
      handlers.handleMoneyLeftOrbClick,
      handlers.stopMoneyLeftOrbEvent,
      openManualExpenseWithAmount,
    ],
  );

  return {
    ...handlers,
    handleMoneyLeftOrbClick,
  };
}
