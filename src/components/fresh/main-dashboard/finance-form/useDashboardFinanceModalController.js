import { useCallback } from "react";
import createInitialFinanceForm from "@/components/fresh/main-dashboard/finance-form/financeFormInitialState";

export default function useDashboardFinanceModalController({
  setFinanceModal,
  setFinanceNotice,
  setFinanceForm,
  setBudgetExitConfirm,
  setBudgetListOpen,
} = {}) {
  const showFinanceNotice = useCallback(
    (message, type = "success") => {
      if (typeof setFinanceNotice !== "function") return;

      if (typeof message === "object" && message !== null) {
        setFinanceNotice(message);
        return;
      }

      setFinanceNotice({
        message,
        type,
      });
    },
    [setFinanceNotice]
  );

  const clearFinanceNotice = useCallback(() => {
    if (typeof setFinanceNotice === "function") {
      setFinanceNotice(null);
    }
  }, [setFinanceNotice]);

  const resetFinanceForm = useCallback(
    (nextValues = {}) => {
      if (typeof setFinanceForm !== "function") return;

      setFinanceForm({
        ...createInitialFinanceForm(),
        ...nextValues,
      });
    },
    [setFinanceForm]
  );

  const openFinanceModal = useCallback(
    (type, payload = null, formDefaults = {}) => {
      clearFinanceNotice();

      if (typeof setBudgetExitConfirm === "function") {
        setBudgetExitConfirm(false);
      }

      if (typeof setBudgetListOpen === "function") {
        setBudgetListOpen(false);
      }

      if (formDefaults && Object.keys(formDefaults).length > 0) {
        resetFinanceForm(formDefaults);
      }

      if (typeof setFinanceModal === "function") {
        setFinanceModal({ type, payload });
      }
    },
    [
      clearFinanceNotice,
      resetFinanceForm,
      setBudgetExitConfirm,
      setBudgetListOpen,
      setFinanceModal,
    ]
  );

  const closeFinanceModal = useCallback(() => {
    if (typeof setBudgetExitConfirm === "function") {
      setBudgetExitConfirm(false);
    }

    if (typeof setBudgetListOpen === "function") {
      setBudgetListOpen(false);
    }

    if (typeof setFinanceModal === "function") {
      setFinanceModal({ type: null, payload: null });
    }
  }, [setBudgetExitConfirm, setBudgetListOpen, setFinanceModal]);

  return {
    openFinanceModal,
    closeFinanceModal,
    showFinanceNotice,
    clearFinanceNotice,
    resetFinanceForm,
  };
}
