import { useCallback, useEffect, useMemo, useState } from "react";
import { addBuyCheckExpense } from "@/lib/clara-buy-check-expense-repository";
import { saveAvoidedSpendingDecision } from "@/lib/clara-buy-check-impact-ledger";
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

function preparedReason(state = {}) {
  return clean(
    state.reason ||
      state.evidence?.purpose ||
      state.evidence?.currentSituation ||
      state.evidence?.readinessSummary ||
      "",
  );
}

function decisionPanelState({ choice, snapshot, amount, walletOptions }) {
  const item = clean(snapshot?.item || "this purchase");
  const reason = preparedReason(snapshot) || (choice === "buy"
    ? `Buying ${item}`
    : `Decided not to buy ${item}`);
  const eligibleWallets = (walletOptions || []).filter((wallet) => wallet.enough);
  const defaultWallet = choice === "buy" && eligibleWallets.length === 1 ? eligibleWallets[0].id : "";

  return {
    ...createDecisionState(),
    phase: "explain",
    choice,
    explanation: reason,
    autoExplanation: reason,
    explanationSource: "clara_conversation",
    generatingExplanation: false,
    userEdited: false,
    walletId: defaultWallet,
    sessionId: clean(snapshot?.sessionId),
    item,
    amount,
  };
}

export default function useClaraBuyCheckFlowV5({ assistantContext = {} } = {}) {
  const base = useClaraBuyCheckBudgetFlow({ assistantContext });
  const [decision, setDecision] = useState(createDecisionState);
  const amount = toNumber(base.state?.price);
  const walletOptions = useMemo(() => getWalletOptions(assistantContext, amount), [assistantContext, amount]);

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

  const confirm = useCallback(async () => {
    if (base.state?.step !== "confirm" || base.state?.busy) return false;
    const snapshot = base.state;
    const ok = await base.confirm("buy");
    if (!ok) return false;
    setDecision(decisionPanelState({ choice: "buy", snapshot, amount, walletOptions }));
    return true;
  }, [amount, base, walletOptions]);

  const decline = useCallback(async () => {
    if (base.state?.step !== "confirm" || base.state?.busy) return false;
    const snapshot = base.state;
    const ok = await base.confirm("not_buy");
    if (!ok) return false;
    setDecision(decisionPanelState({ choice: "not_buy", snapshot, amount, walletOptions }));
    return true;
  }, [amount, base, walletOptions]);

  const askMore = useCallback(() => {
    setDecision(createDecisionState());
    return base.askMore?.() || false;
  }, [base]);

  const chooseFinalDecision = useCallback((choice) => {
    if (choice === "buy") return confirm();
    if (choice === "not_buy") return decline();
    return false;
  }, [confirm, decline]);

  const cancelFinalDecision = useCallback(() => {
    setDecision(createDecisionState());
    base.returnToChoice?.();
  }, [base]);

  const setDecisionExplanation = useCallback((explanation) => {
    setDecision((current) => ({ ...current, explanation, userEdited: true, generatingExplanation: false, error: "" }));
  }, []);

  const setDecisionWallet = useCallback((walletId) => {
    setDecision((current) => ({ ...current, walletId, error: "" }));
  }, []);

  const submitFinalDecision = useCallback(async () => {
    if (base.state?.step !== "complete" || decision.phase !== "explain" || decision.busy) return false;
    if (
      decision.sessionId !== clean(base.state?.sessionId) ||
      decision.item !== clean(base.state?.item) ||
      toNumber(decision.amount) !== amount
    ) {
      setDecision((current) => ({
        ...current,
        error: "This conversation changed before it was saved. Please go back and confirm your choice again.",
      }));
      return false;
    }

    const selectedBudget = base.state?.budgetAssessment?.selectedBudget || null;
    const conversationReason = clean(decision.explanation) || preparedReason(base.state);
    const purchase = {
      item: clean(base.state?.item),
      price: amount,
      reason: conversationReason,
      planningStatus: base.state?.planningStatus || "unplanned",
      category: normalizeExpenseCategory(`${base.state?.item || ""} ${conversationReason}`),
      budgetId: selectedBudget?.id || "",
      budgetName: selectedBudget?.title || "",
    };
    const createdAt = new Date().toISOString();

    setDecision((current) => ({ ...current, busy: true, error: "" }));

    try {
      if (decision.choice === "buy") {
        const wallet = walletOptions.find((option) => option.id === decision.walletId);
        if (!wallet) throw new Error("Choose a wallet before logging this expense.");
        if (!wallet.enough) throw new Error("The selected wallet does not have enough spendable balance.");

        const localUserId = clean(assistantContext?.user?.id || assistantContext?.user?.email || "local-user");
        const planningStatus = purchase.planningStatus === "planned" ? "planned" : "unplanned";
        await addBuyCheckExpense(localUserId, {
          item: purchase.item,
          reason: purchase.reason,
          amount,
          category: purchase.category,
          wallet_id: wallet.id,
          date: getPHDateString(),
          notes: purchase.reason,
          need_type: normalizeNeedType(purchase.reason, purchase.category),
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? `Ask Before You Spend — ${purchase.reason}` : null,
          budget_id: purchase.budgetId || null,
          budget_name: purchase.budgetName || null,
          budget_category: purchase.category,
          source: "local",
          syncStatus: "local_only",
        }, {
          budgetId: purchase.budgetId,
          budgetRemaining: selectedBudget?.remaining,
        });

        const memoryPayload = {
          source: "buy_check_buy",
          user_action: "buy",
          suggested_reason: preparedReason(base.state),
          saved_reason: purchase.reason,
          explanation_source: decision.userEdited ? "user_edited" : "clara_conversation",
          wallet_id: wallet.id,
          wallet_name: wallet.name,
          purchase,
          created_at: createdAt,
        };
        saveLocalList("clara_buy_check_buy_explanations", memoryPayload);
        window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }));
        dispatchFinanceUpdates();

        setDecision((current) => ({
          ...current,
          phase: "resolved",
          busy: false,
          error: "",
          result: {
            choice: "buy",
            title: "Expense logged",
            message: purchase.budgetName
              ? `${purchase.item} was added to your transactions, linked to ${purchase.budgetName}, and deducted from ${wallet.name}.`
              : `${purchase.item} was added to your transactions and deducted from ${wallet.name}. No budget was linked.`,
          },
        }));
        return true;
      }

      const memoryPayload = {
        source: "buy_check_not_buy",
        user_action: "not_buy",
        suggested_reason: preparedReason(base.state),
        reflection: purchase.reason,
        purchase,
        created_at: createdAt,
      };
      saveLocalList("clara_buy_check_not_buy_reflections", memoryPayload);
      saveAvoidedSpendingDecision(memoryPayload);
      window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }));
      setDecision((current) => ({
        ...current,
        phase: "resolved",
        busy: false,
        error: "",
        result: {
          choice: "not_buy",
          title: "Decision saved",
          message: amount > 0
            ? `${money(amount)} protected. This decision now counts toward your CLARA Impact for the month.`
            : "Your decision not to buy was saved so CLARA can remember the reason and the pattern.",
        },
      }));
      return true;
    } catch (error) {
      const message = error?.code === "BUY_CHECK_CONTEXT_CHANGED"
        ? clean(error?.message || "Your wallet or budget changed. Talk with CLARA again before logging the expense.")
        : clean(error?.message || "Could not save your decision.");
      setDecision((current) => ({ ...current, busy: false, error: message }));
      return false;
    }
  }, [amount, assistantContext, base.state, decision, walletOptions]);

  return useMemo(() => ({
    ...base,
    state: { ...base.state, finalDecision: decision, walletOptions },
    startSession,
    clearSession,
    checkAnother,
    confirm,
    decline,
    askMore,
    chooseFinalDecision,
    cancelFinalDecision,
    setDecisionExplanation,
    setDecisionWallet,
    submitFinalDecision,
  }), [
    askMore,
    base,
    cancelFinalDecision,
    checkAnother,
    chooseFinalDecision,
    clearSession,
    confirm,
    decision,
    decline,
    setDecisionExplanation,
    setDecisionWallet,
    startSession,
    submitFinalDecision,
    walletOptions,
  ]);
}
