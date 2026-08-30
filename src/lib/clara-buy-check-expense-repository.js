import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "@/lib/localFinanceStore";
import { analyzeBuyCheckBudgetCoverage } from "@/lib/clara-buy-check-budget-engine";
import {
  isProtectedWallet,
  walletSpendableBalance,
} from "@/lib/clara-buy-check-wallet-engine";
import { clean, toNumber } from "@/lib/clara-buy-check-budget-core";

function generateId(prefix = "buy_check") {
  if (globalThis?.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function contextChanged(message) {
  const error = new Error(message || "Your wallet or budget changed after this Buy Check. CLARA refreshed the result before logging the expense.");
  error.code = "BUY_CHECK_CONTEXT_CHANGED";
  return error;
}

function normalizeWalletBalance(wallet) {
  return toNumber(wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance ?? wallet?.available_balance ?? wallet?.starting_balance ?? 0);
}

export async function addBuyCheckExpense(localUserId, payload, expected = {}) {
  const safeUserId = clean(localUserId);
  const amount = toNumber(payload?.amount);
  const walletId = clean(payload?.wallet_id ?? payload?.walletId);
  if (!safeUserId) throw new Error("A local user is required before logging this expense.");
  if (!amount || amount <= 0) throw new Error("Expense amount must be greater than zero.");
  if (!walletId) throw new Error("Choose a wallet before logging this expense.");

  const stores = [
    LOCAL_FINANCE_STORES.expenses,
    LOCAL_FINANCE_STORES.wallets,
    LOCAL_FINANCE_STORES.walletTransactions,
    LOCAL_FINANCE_STORES.budgets,
  ];

  return runLocalFinanceTransaction(stores, safeUserId, async (tx) => {
    const wallet = await tx.get(LOCAL_FINANCE_STORES.wallets, walletId);
    if (!wallet) throw contextChanged("The selected wallet is no longer available. Run Buy Check again.");
    if (isProtectedWallet(wallet)) throw contextChanged("The selected wallet is now protected and cannot fund this purchase.");
    const liveSpendable = walletSpendableBalance(wallet);
    if (liveSpendable < amount) throw contextChanged("The selected wallet no longer has enough spendable money. Run Buy Check again.");

    const [wallets, budgets, expenses] = await Promise.all([
      tx.getAllForUser(LOCAL_FINANCE_STORES.wallets),
      tx.getAllForUser(LOCAL_FINANCE_STORES.budgets),
      tx.getAllForUser(LOCAL_FINANCE_STORES.expenses),
    ]);
    const liveAssessment = analyzeBuyCheckBudgetCoverage(
      payload.item || payload.notes || payload.category,
      amount,
      { wallets, budgets, expenses },
      payload.reason || payload.unplanned_reason || "",
    );

    const expectedBudgetId = clean(expected.budgetId);
    const liveBudgetId = clean(liveAssessment.selectedBudget?.id);
    if (expectedBudgetId && expectedBudgetId !== liveBudgetId) {
      throw contextChanged("The matched budget changed after this Buy Check. CLARA needs to refresh the result.");
    }
    if (expectedBudgetId) {
      const expectedRemaining = toNumber(expected.budgetRemaining);
      const liveRemaining = toNumber(liveAssessment.selectedBudget?.remaining);
      if (Math.abs(expectedRemaining - liveRemaining) > 0.009) {
        throw contextChanged("The budget balance changed after this Buy Check. CLARA needs to refresh the result.");
      }
    }

    const priorDecision = clean(expected.recommendation).toUpperCase();
    if (["BUY", "BUY WITH CAP"].includes(priorDecision) && liveAssessment.status !== "full") {
      throw contextChanged("This purchase is no longer fully funded by the previous wallet and budget result.");
    }

    const operationTime = new Date().toISOString();
    const expenseId = payload.id || generateId("expense");
    const transactionId = payload.wallet_transaction_id || generateId("wallet_transaction");
    const nextBalance = normalizeWalletBalance(wallet) - amount;
    if (nextBalance < 0) throw contextChanged("The wallet balance changed and would become negative.");

    const walletUpdate = {
      ...wallet,
      balance: nextBalance,
      updatedAt: operationTime,
      updated_at: operationTime,
      syncStatus: "local_only",
      source: "local",
    };
    await tx.putRaw(LOCAL_FINANCE_STORES.wallets, walletUpdate);

    const expenseRecord = await tx.put(LOCAL_FINANCE_STORES.expenses, {
      ...payload,
      id: expenseId,
      wallet_id: walletId,
      amount,
      date: payload.date || operationTime,
      created_at: payload.created_at || payload.date || operationTime,
      updated_at: operationTime,
      deletedAt: null,
      syncStatus: "local_only",
      source: "local",
    });

    const walletTransaction = await tx.put(LOCAL_FINANCE_STORES.walletTransactions, {
      id: transactionId,
      wallet_id: walletId,
      amount,
      type: "expense",
      category: payload.category || null,
      need_type: payload.need_type || null,
      planning_status: payload.planning_status || "unplanned",
      unplanned_reason: payload.unplanned_reason || null,
      expense_id: expenseId,
      notes: payload.notes || "",
      means_requirement_key: payload.means_requirement_key || null,
      means_matched_planned_amount: Number(payload.means_matched_planned_amount || 0),
      means_unmatched_amount: Number(payload.means_unmatched_amount || 0),
      created_at: payload.date || operationTime,
      updated_at: operationTime,
      deletedAt: null,
      syncStatus: "local_only",
      source: "local",
    });

    return { expense: expenseRecord, walletUpdate, walletTransaction, liveAssessment };
  });
}

export { contextChanged as createBuyCheckContextChangedError };
