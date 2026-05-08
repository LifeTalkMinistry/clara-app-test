import { useState } from "react";

export default function useDashboardFinanceUiState() {
  const [financeActionLoading, setFinanceActionLoading] = useState(false);
  const [financeNotice, setFinanceNotice] = useState(null);
  const [financeModal, setFinanceModal] = useState({ type: null, payload: null });
  const [budgetExitConfirm, setBudgetExitConfirm] = useState(false);
  const [budgetListOpen, setBudgetListOpen] = useState(false);

  return {
    financeActionLoading,
    setFinanceActionLoading,
    financeNotice,
    setFinanceNotice,
    financeModal,
    setFinanceModal,
    budgetExitConfirm,
    setBudgetExitConfirm,
    budgetListOpen,
    setBudgetListOpen,
  };
}
