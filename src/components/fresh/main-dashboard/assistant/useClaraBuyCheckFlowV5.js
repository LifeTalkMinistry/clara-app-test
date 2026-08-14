import { useCallback, useEffect, useMemo, useState } from "react";
import { addBuyCheckExpense } from "@/lib/clara-buy-check-expense-repository";
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

function formatMoney(value = 0) {
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function buildFinalBuyExplanationFallback({ item, price, summarizedReason, recommendation, budget, budgetAssessment }) {
  const purchaseItem = clean(item || "this item");
  const reason = clean(summarizedReason || "I have decided that this purchase is still necessary")
    .replace(/^because\s+/i, "")
    .replace(/[?.!]+$/, "");
  const decision = clean(recommendation || "").toUpperCase();
  const status = clean(budgetAssessment?.status || "");
  const sentences = [`I’m proceeding with this ${formatMoney(price)} ${purchaseItem} purchase because ${reason}.`];

  if (status === "full" && budget) {
    sentences.push(`It is covered by my ${clean(budget.title || "available")} budget${Number.isFinite(Number(budget.remainingAfter)) ? `, with ${formatMoney(budget.remainingAfter)} remaining afterward` : ""}.`);
  } else if (status === "partial" && budget) {
    sentences.push(`I understand it is ${formatMoney(budgetAssessment?.shortfall)} over my ${clean(budget.title || "matched")} budget.`);
  } else if (status === "wallet_shortfall") {
    sentences.push(`I understand my selected spendable wallet is short by ${formatMoney(budgetAssessment?.walletShortfall)}.`);
  } else if (["exhausted", "no_match"].includes(status)) {
    sentences.push("I understand this purchase is not currently covered by an available budget.");
  }

  if (decision && decision !== "BUY") {
    sentences.push(`I understand CLARA recommended ${decision}, but I have decided to continue.`);
  }

  return sentences.join(" ");
}

function automaticDecisionNote({ choice, diagnosis, item, amount, budgetName }) {
  const verdict = clean(diagnosis?.userFacingDecision || diagnosis?.decision || "Buy Check result");
  const reasonCode = clean(diagnosis?.reasonCode || "UNSPECIFIED");
  if (choice === "not_buy") {
    return `I decided to wait based on CLARA's ${verdict} result. Reason: ${reasonCode}.`;
  }
  const budgetText = budgetName ? ` Covered by ${budgetName}.` : " No budget was linked.";
  return `${item} — User continued after CLARA's ${verdict} result for ₱${Number(amount || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}.${budgetText} Reason: ${reasonCode}.`;
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

  const chooseFinalDecision = useCallback((choice) => {
    if (base.state?.step !== "complete" || !["buy", "not_buy"].includes(choice)) return;
    const eligibleWallets = walletOptions.filter((wallet) => wallet.enough);
    const defaultWallet = choice === "buy" && eligibleWallets.length === 1 ? eligibleWallets[0].id : "";
    const sessionId = clean(base.state?.sessionId);
    const item = clean(base.state?.item);
    const pkg = base.state?.diagnosis?.contextPackage || {};
    const matchedBudget = pkg.finance?.matchingBudget || pkg.budget?.selectedBudget || null;
    const diagnosis = base.state?.diagnosis || {};
    const automaticNote = automaticDecisionNote({
      choice,
      diagnosis,
      item,
      amount,
      budgetName: matchedBudget?.title || "",
    });

    if (choice === "not_buy") {
      setDecision({
        ...createDecisionState(),
        phase: "explain",
        choice,
        sessionId,
        item,
        amount,
        explanation: automaticNote,
        autoExplanation: automaticNote,
        explanationSource: "local",
        userEdited: false,
      });
      return;
    }

    const budgetAssessment = pkg.finance?.budgetAssessment || pkg.budget || base.state?.budgetAssessment || {};
    const fallback = clean(buildFinalBuyExplanationFallback({
      item,
      price: amount,
      summarizedReason: clean(base.state?.reason),
      recommendation: clean(diagnosis?.decision || "PAUSE"),
      budget: matchedBudget,
      budgetAssessment,
    })) || automaticNote;

    setDecision({
      ...createDecisionState(),
      phase: "explain",
      choice,
      explanation: fallback,
      autoExplanation: fallback,
      explanationSource: "local",
      generatingExplanation: false,
      userEdited: false,
      walletId: defaultWallet,
      sessionId,
      item,
      amount,
    });
  }, [amount, base.state, walletOptions]);

  const cancelFinalDecision = useCallback(() => setDecision(createDecisionState()), []);
  const setDecisionExplanation = useCallback((explanation) => {
    setDecision((current) => ({ ...current, explanation, userEdited: true, generatingExplanation: false, error: "" }));
  }, []);
  const setDecisionWallet = useCallback((walletId) => {
    setDecision((current) => ({ ...current, walletId, error: "" }));
  }, []);

  const submitFinalDecision = useCallback(async () => {
    if (base.state?.step !== "complete" || decision.phase !== "explain" || decision.busy) return false;
    if (decision.sessionId !== clean(base.state?.sessionId) || decision.item !== clean(base.state?.item) || toNumber(decision.amount) !== amount) {
      setDecision((current) => ({ ...current, error: "This Buy Check changed before it was saved. Please return to the result and try again." }));
      return false;
    }

    const pkg = base.state?.diagnosis?.contextPackage || {};
    const matchedBudget = pkg.finance?.matchingBudget || pkg.budget?.selectedBudget || null;
    const purchase = {
      item: clean(base.state?.item),
      price: amount,
      reason: clean(base.state?.reason),
      planningStatus: pkg.purchase?.planningStatus || base.state?.planningStatus || "unplanned",
      category: pkg.purchase?.categoryKey || normalizeExpenseCategory(base.state?.item, base.state?.reason),
      budgetId: matchedBudget?.id || "",
      budgetName: matchedBudget?.title || "",
    };
    const recommendation = clean(base.state?.diagnosis?.decision || "PAUSE");
    const explanation = clean(decision.explanation) || automaticDecisionNote({
      choice: decision.choice,
      diagnosis: base.state?.diagnosis,
      item: purchase.item,
      amount,
      budgetName: purchase.budgetName,
    });
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
          notes: explanation,
          need_type: normalizeNeedType(`${purchase.reason} ${explanation}`, purchase.category),
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? `Buy Check decision — ${explanation}` : null,
          budget_id: purchase.budgetId || null,
          budget_name: purchase.budgetName || null,
          budget_category: purchase.category,
          source: "local",
          syncStatus: "local_only",
        }, {
          recommendation,
          budgetId: purchase.budgetId,
          budgetRemaining: matchedBudget?.remaining,
        });

        const memoryPayload = {
          source: "buy_check_buy",
          clara_recommendation: recommendation,
          user_action: "buy",
          override: recommendation !== "BUY",
          explanation,
          explanation_source: decision.explanationSource || "local",
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
        clara_recommendation: recommendation,
        user_action: "not_buy",
        reflection: explanation,
        purchase,
        created_at: createdAt,
      };
      saveLocalList("clara_buy_check_not_buy_reflections", memoryPayload);
      window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }));
      setDecision((current) => ({
        ...current,
        phase: "resolved",
        busy: false,
        error: "",
        result: {
          choice: "not_buy",
          title: "Decision saved",
          message: "Your decision to wait was saved so CLARA can remember this pattern.",
        },
      }));
      return true;
    } catch (error) {
      const message = error?.code === "BUY_CHECK_CONTEXT_CHANGED"
        ? clean(error?.message || "Your wallet or budget changed after this Buy Check. Run the check again before logging the expense.")
        : clean(error?.message || "Could not save your final decision.");
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
