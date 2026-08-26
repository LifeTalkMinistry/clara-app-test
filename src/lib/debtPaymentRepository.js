import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "@/lib/localFinanceStore";
import {
  DEBT_OBLIGATION_STORE,
  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtTitle,
} from "@/lib/debtObligationStore";
import { appendPaidDebtOccurrence, getDebtOccurrenceState } from "@/lib/debtOccurrenceState";
import {
  getDebtBalance,
  getDebtObligationMode,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationMath";

const WALLET_STORE = LOCAL_FINANCE_STORES.wallets;
const WALLET_TRANSACTION_STORE = LOCAL_FINANCE_STORES.walletTransactions;

const clean = (value = "") => String(value ?? "").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const walletBalance = (wallet = {}) =>
  toNumber(
    wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0
  );

function emitPaymentUpdates(localUserId) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(DEBT_OBLIGATIONS_UPDATED_EVENT, {
      detail: { localUserId, reason: "payment" },
    })
  );

  [
    "clara:finance-data-updated",
    "clara-finance-updated",
    "clara-wallets-updated",
    "clara-local-finance-updated",
  ].forEach((eventName) => {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { localUserId, source: "debt:payment" },
      })
    );
  });
}

function readPaymentHistory(record = {}) {
  const source = Array.isArray(record.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record.payment_history)
      ? record.payment_history
      : [];
  return source.filter(Boolean);
}

function sumOccurrencePayments(history, dueDate) {
  if (!dueDate) return 0;
  return history.reduce((sum, entry) => {
    const entryDate = clean(entry?.dueDate || entry?.due_date).slice(0, 10);
    return entryDate === dueDate ? sum + Math.max(toNumber(entry?.amount), 0) : sum;
  }, 0);
}

/**
 * Atomically pays a Debt / Obligation from a CLARA wallet.
 *
 * One IndexedDB transaction owns all three mutations:
 * - wallet balance decreases
 * - debt/obligation payment state updates
 * - wallet transaction history receives a linked debt-payment record
 */
export async function payDebtObligationFromWallet(localUserId, debtId, options = {}) {
  const safeLocalUserId = clean(localUserId);
  const safeDebtId = clean(debtId);
  const walletId = clean(options.walletId || options.wallet_id);
  const paymentAmount = Math.max(toNumber(options.amount), 0);
  const maxSpendable = Math.max(toNumber(options.maxSpendable), 0);

  if (!safeLocalUserId) throw new Error("localUserId is required for a debt payment.");
  if (!safeDebtId) throw new Error("Debt obligation id is required.");
  if (!walletId) throw new Error("Choose a wallet for this payment.");
  if (paymentAmount <= 0) throw new Error("Payment amount must be greater than zero.");
  if (maxSpendable > 0 && paymentAmount > maxSpendable) {
    throw new Error("That wallet does not have enough spendable money for this payment.");
  }

  const result = await runLocalFinanceTransaction(
    [DEBT_OBLIGATION_STORE, WALLET_STORE, WALLET_TRANSACTION_STORE],
    safeLocalUserId,
    async (tx) => {
      const debt = await tx.get(DEBT_OBLIGATION_STORE, safeDebtId);
      if (!debt) throw new Error("Debt / Obligation could not be found.");

      const wallet = await tx.get(WALLET_STORE, walletId);
      if (!wallet) throw new Error("Wallet could not be found.");

      const currentWalletBalance = walletBalance(wallet);
      if (currentWalletBalance < paymentAmount) {
        throw new Error("That wallet no longer has enough balance for this payment.");
      }

      const mode = getDebtObligationMode(debt);
      const currentBalance = Math.max(getDebtBalance(debt), 0);
      const monthlyPayment = Math.max(getMonthlyDebtPayment(debt), 0);

      if (mode === "balance" && currentBalance <= 0) {
        throw new Error("This debt is already fully paid.");
      }
      if (mode === "balance" && paymentAmount > currentBalance) {
        throw new Error(`Payment cannot exceed the remaining balance of ₱${currentBalance.toLocaleString("en-PH")}.`);
      }

      const now = tx.nowIso();
      const occurrence = getDebtOccurrenceState(debt, options.referenceDate || new Date());
      const dueDate = clean(options.dueDate || occurrence?.dueDate).slice(0, 10);
      const paymentId = tx.createId(WALLET_TRANSACTION_STORE);
      const title = getDebtTitle(debt);
      const priorHistory = readPaymentHistory(debt);
      const paymentEntry = {
        id: paymentId,
        amount: paymentAmount,
        walletId,
        wallet_id: walletId,
        dueDate: dueDate || null,
        due_date: dueDate || null,
        paidAt: now,
        paid_at: now,
      };
      const paymentHistory = [...priorHistory, paymentEntry];

      const nextBalance =
        mode === "balance" ? Math.max(currentBalance - paymentAmount, 0) : currentBalance;
      const completed = mode === "balance" && nextBalance <= 0;

      const expectedOccurrenceAmount =
        mode === "balance"
          ? Math.min(monthlyPayment > 0 ? monthlyPayment : currentBalance, currentBalance)
          : monthlyPayment;
      const occurrencePaidAmount = dueDate
        ? sumOccurrencePayments(paymentHistory, dueDate)
        : 0;
      const occurrenceSatisfied =
        Boolean(dueDate) &&
        expectedOccurrenceAmount > 0 &&
        occurrencePaidAmount >= expectedOccurrenceAmount;
      const currentPaidOccurrences = Array.isArray(debt.paidOccurrences)
        ? debt.paidOccurrences
        : Array.isArray(debt.paid_occurrences)
          ? debt.paid_occurrences
          : [];
      const paidOccurrences = occurrenceSatisfied
        ? appendPaidDebtOccurrence(debt, dueDate)
        : currentPaidOccurrences;

      const debtRecord = {
        ...debt,
        id: safeDebtId,
        localUserId: safeLocalUserId,
        paymentHistory,
        payment_history: paymentHistory,
        paidOccurrences,
        paid_occurrences: paidOccurrences,
        lastPaidOccurrenceDate: occurrenceSatisfied
          ? dueDate
          : debt.lastPaidOccurrenceDate || debt.last_paid_occurrence_date || null,
        last_paid_occurrence_date: occurrenceSatisfied
          ? dueDate
          : debt.last_paid_occurrence_date || debt.lastPaidOccurrenceDate || null,
        lastPaymentAmount: paymentAmount,
        last_payment_amount: paymentAmount,
        lastPaymentWalletId: walletId,
        last_payment_wallet_id: walletId,
        lastPaidAt: now,
        last_paid_at: now,
        paidAt: completed ? now : debt.paidAt || debt.paid_at || null,
        paid_at: completed ? now : debt.paid_at || debt.paidAt || null,
        totalDebt: nextBalance,
        balance: nextBalance,
        amount: nextBalance,
        status: completed ? "completed" : "active",
        updatedAt: now,
        updated_at: now,
        syncStatus: "local_only",
        source: "local",
      };
      await tx.putRaw(DEBT_OBLIGATION_STORE, debtRecord);

      const walletRecord = {
        ...wallet,
        balance: currentWalletBalance - paymentAmount,
        updatedAt: now,
        updated_at: now,
        syncStatus: "local_only",
        source: "local",
      };
      await tx.putRaw(WALLET_STORE, walletRecord);

      const transactionRecord = tx.makeRecord(WALLET_TRANSACTION_STORE, {
        id: paymentId,
        wallet_id: walletId,
        walletId,
        amount: paymentAmount,
        type: "expense",
        category: "Debt / Obligations",
        planning_status: "planned",
        source_type: "debt_payment",
        sourceType: "debt_payment",
        tag: "debt_payment",
        title: `Debt payment — ${title}`,
        name: `Debt payment — ${title}`,
        notes: `Payment toward ${title}`,
        debt_obligation_id: safeDebtId,
        debtObligationId: safeDebtId,
        debt_payment_id: paymentId,
        debtPaymentId: paymentId,
        due_date: dueDate || null,
        dueDate: dueDate || null,
        created_at: now,
        updated_at: now,
        deletedAt: null,
        syncStatus: "local_only",
        source: "local",
      });
      await tx.putRaw(WALLET_TRANSACTION_STORE, transactionRecord);

      return {
        amount: paymentAmount,
        balance: nextBalance,
        completed,
        mode,
        dueDate: dueDate || null,
        debt: debtRecord,
        wallet: walletRecord,
        transaction: transactionRecord,
      };
    }
  );

  emitPaymentUpdates(safeLocalUserId);
  return result;
}
