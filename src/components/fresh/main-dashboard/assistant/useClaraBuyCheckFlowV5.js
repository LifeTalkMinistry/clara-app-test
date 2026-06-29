import { useCallback, useEffect, useMemo, useState } from "react";
import { addExpense as repoAddExpense } from "@/lib/financeRepository";
import useClaraBuyCheckBudgetFlow from "./useClaraBuyCheckBudgetFlow.js";
import {
  clean,
  createDecisionState,
  dispatchFinanceUpdates,
  getPHDateString,
  getWalletOptions,
  normalizeExpenseCategory,
  normalizeNeedType,
  saveLocalList,
  toNumber,
} from "@/lib/clara-buy-check-budget-intelligence";

export default function useClaraBuyCheckFlowV5({ assistantContext = {} } = {}) {
  const base = useClaraBuyCheckBudgetFlow({ assistantContext });
  const [decision, setDecision] = useState(createDecisionState);
  const amount = toNumber(base.state?.price);
  const walletOptions = useMemo(
    () => getWalletOptions(assistantContext, amount),
    [assistantContext, amount],
  );

  useEffect(() => setDecision(createDecisionState()), [base.state?.sessionId]);

  const startSession = useCallback((sessionId = "") => {
    setDecision(createDecisionState());
    base.startSession(sessionId);
  }, [base.startSession]);

  const clearSession = useCallback(() => {
    setDecision(createDecisionState());
    base.clearSession();
  }, [base.clearSession]);

  const checkAnother = useCallback(() => {
    setDecision(createDecisionState());
    base.checkAnother();
  }, [base.checkAnother]);

  const chooseFinalDecision = useCallback((choice) => {
    if (base.state?.step !== "complete" || !["buy", "not_buy"].includes(choice)) return;
    const defaultWallet = choice === "buy" ? walletOptions.find((wallet) => wallet.enough)?.id || "" : "";
    setDecision({
      phase: "explain",
      choice,
      explanation: "",
      walletId: defaultWallet,
      busy: false,
      error: "",
      result: null,
    });
  }, [base.state?.step, walletOptions]);

  const cancelFinalDecision = useCallback(() => setDecision(createDecisionState()), []);
  const setDecisionExplanation = useCallback((explanation) => {
    setDecision((current) => ({ ...current, explanation, error: "" }));
  }, []);
  const setDecisionWallet = useCallback((walletId) => {
    setDecision((current) => ({ ...current, walletId, error: "" }));
  }, []);

  const submitFinalDecision = useCallback(async () => {
    if (base.state?.step !== "complete" || decision.phase !== "explain" || decision.busy) return false;
    const explanation = clean(decision.explanation);
    if (!explanation) {
      setDecision((current) => ({
        ...current,
        error: current.choice === "buy"
          ? "Please explain why you will buy it."
          : "Please explain why you decided not to buy it.",
      }));
      return false;
    }

    const pkg = base.state?.diagnosis?.contextPackage || {};
    const matchedBudget = pkg.finance?.matchingBudget || null;
    const purchase = {
      item: clean(base.state?.item),
      price: amount,
      reason: clean(base.state?.reason),
      planningStatus: pkg.purchase?.planningStatus || base.state?.planningStatus || "unplanned",
      category: pkg.purchase?.categoryKey || normalizeExpenseCategory(base.state?.item),
      budgetId: matchedBudget?.id || "",
      budgetName: matchedBudget?.title || "",
    };
    const recommendation = clean(base.state?.diagnosis?.decision || "PAUSE");
    const createdAt = new Date().toISOString();

    setDecision((current) => ({ ...current, busy: true, error: "" }));
    try {
      if (decision.choice === "buy") {
        const wallet = walletOptions.find((option) => option.id === decision.walletId);
        if (!wallet) throw new Error("Choose a wallet before logging this expense.");
        if (!wallet.enough) throw new Error("The selected wallet does not have enough balance.");

        const localUserId = clean(assistantContext?.user?.id || assistantContext?.user?.email || "local-user");
        const planningStatus = purchase.planningStatus === "planned" ? "planned" : "unplanned";
        await repoAddExpense(localUserId, {
          amount,
          category: purchase.category,
          wallet_id: wallet.id,
          date: getPHDateString(),
          notes: `${purchase.item} — ${explanation}`,
          need_type: normalizeNeedType(`${purchase.reason} ${explanation}`, purchase.category),
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? `Buy Check decision — ${explanation}` : null,
          budget_id: purchase.budgetId || null,
          budget_name: purchase.budgetName || null,
          budget_category: purchase.category,
          source: "local",
          syncStatus: "local_only",
        });

        const memoryPayload = {
          source: "buy_check_buy",
          clara_recommendation: recommendation,
          user_action: "buy",
          explanation,
          wallet_id: wallet.id,
          wallet_name: wallet.name,
          purchase,
          created_at: createdAt,
        };
        saveLocalList("clara_buy_check_buy_explanations", memoryPayload);
        window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }));
        dispatchFinanceUpdates();
        setDecision({
          ...decision,
          phase: "resolved",
          busy: false,
          error: "",
          result: {
            choice: "buy",
            title: "Expense logged",
            message: `${purchase.item} was added to your transactions, linked to ${purchase.budgetName || "its category budget"}, and deducted from ${wallet.name}.`,
          },
        });
        return true;
      }

      const memoryPayload = {
        source: "buy_check_not_buy",
        clara_recommendation: recommendation,
        user_action: "not_buy",
        reflection: explanation,
        purchase,
        created_at: createdAt,
      };
      saveLocalList("clara_buy_check_not_buy_reflections", memoryPayload);
      window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }));
      setDecision({
        ...decision,
        phase: "resolved",
        busy: false,
        error: "",
        result: {
          choice: "not_buy",
          title: "Reflection saved",
          message: "Your decision not to buy was saved so CLARA can remember this pattern.",
        },
      });
      return true;
    } catch (error) {
      setDecision((current) => ({
        ...current,
        busy: false,
        error: clean(error?.message || "Could not save your final decision."),
      }));
      return false;
    }
  }, [amount, assistantContext, base.state, decision, walletOptions]);

  return useMemo(() => ({
    ...base,
    state: { ...base.state, finalDecision: decision, walletOptions },
    startSession,
    clearSession,
    checkAnother,
    chooseFinalDecision,
    cancelFinalDecision,
    setDecisionExplanation,
    setDecisionWallet,
    submitFinalDecision,
  }), [
    base,
    cancelFinalDecision,
    checkAnother,
    chooseFinalDecision,
    clearSession,
    decision,
    setDecisionExplanation,
    setDecisionWallet,
    startSession,
    submitFinalDecision,
    walletOptions,
  ]);
}
