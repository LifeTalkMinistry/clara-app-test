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

function normalizePaidAt(value, fallback) {
  const raw = clean(value);
  if (!raw) return fallback;

  // A date-only value comes from the historical-payment date picker. Anchor it
  // at Manila noon so the chosen calendar date cannot shift on devices in a
  // different timezone.
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00+08:00`)
    : new Date(raw);
  if (Number.isNaN(candidate.getTime())) {
    throw new Error("Choose a valid payment date.");
  }
  return candidate.toISOString();
}

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
 * Atomically records a Debt / Obligation payment.
 *
 * Normal payment:
 * - wallet balance decreases
 * - debt/obligation payment state updates
 * - Transaction Hub receives the linked audit record
 *
 * Historical "already paid" correction:
 * - debt/obligation payment state still updates
 * - Transaction Hub receives the payment on its real payment date
 * - when the user confirms the current wallet already reflects that payment,
 *   the wallet is deliberately NOT deducted again
 */
export async function payDebtObligationFromWallet(localUserId, debtId, options = {}) {
  const safeLocalUserId = clean(localUserId);
  const safeDebtId = clean(debtId);
  const walletId = clean(options.walletId || options.wallet_id);
  const paymentAmount = Math.max(toNumber(options.amount), 0);
  const maxSpendable = Math.max(toNumber(options.maxSpendable), 0);
  const meansRequirementKey = clean(
    options.meansRequirementKey || options.means_requirement_key
  );
  const meansMatchedPlannedAmount = Math.max(
    toNumber(options.meansMatchedPlannedAmount ?? options.means_matched_planned_amount),
    0
  );
  const meansUnmatchedAmount = Math.max(
    toNumber(options.meansUnmatchedAmount ?? options.means_unmatched_amount),
    0
  );
  const historical = Boolean(
    options.historical || options.isHistorical || options.historical_payment
  );
  const walletAlreadyReflectsPayment = Boolean(
    options.walletAlreadyReflectsPayment ||
      options.wallet_already_reflects_payment ||
      options.alreadyReflected
  );
  const deductWallet =
    typeof options.deductWallet === "boolean"
      ? options.deductWallet
      : !walletAlreadyReflectsPayment;

  if (!safeLocalUserId) throw new Error("localUserId is required for a debt payment.");
  if (!safeDebtId) throw new Error("Debt obligation id is required.");
  if (!walletId) throw new Error("Choose a wallet for this payment.");
  if (paymentAmount <= 0) throw new Error("Payment amount must be greater than zero.");
  if (deductWallet && maxSpendable > 0 && paymentAmount > maxSpendable) {
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
      if (deductWallet && currentWalletBalance < paymentAmount) {
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
      const actualPaidAt = normalizePaidAt(
        options.paidAt || options.paid_at || options.paymentDate || options.payment_date,
        now
      );
      const occurrence = getDebtOccurrenceState(debt, options.referenceDate || new Date(actualPaidAt));
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
        meansRequirementKey: meansRequirementKey || null,
        means_requirement_key: meansRequirementKey || null,
        meansMatchedPlannedAmount,
        means_matched_planned_amount: meansMatchedPlannedAmount,
        meansUnmatchedAmount,
        means_unmatched_amount: meansUnmatchedAmount,
        paidAt: actualPaidAt,
        paid_at: actualPaidAt,
        recordedAt: now,
        recorded_at: now,
        historical,
        historical_payment: historical,
        walletBalanceAlreadyReflected: historical && walletAlreadyReflectsPayment,
        wallet_balance_already_reflected: historical && walletAlreadyReflectsPayment,
        deductedFromWallet: deductWallet,
        deducted_from_wallet: deductWallet,
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
        lastPaidAt: actualPaidAt,
        last_paid_at: actualPaidAt,
        paidAt: completed ? actualPaidAt : debt.paidAt || debt.paid_at || null,
        paid_at: completed ? actualPaidAt : debt.paid_at || debt.paidAt || null,
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

      const walletRecord = deductWallet
        ? {
            ...wallet,
            balance: currentWalletBalance - paymentAmount,
            updatedAt: now,
            updated_at: now,
            syncStatus: "local_only",
            source: "local",
          }
        : wallet;

      if (deductWallet) {
        await tx.putRaw(WALLET_STORE, walletRecord);
      }

      const transactionNotes = historical
        ? deductWallet
          ? `Historical payment toward ${title}; wallet balance corrected when logged in CLARA.`
          : `Historical payment toward ${title}; current wallet balance already reflected this payment, so CLARA did not deduct it again.`
        : `Payment toward ${title}`;

      // This is an audit record. The Debt flow owns any wallet balance mutation,
      // so Transaction Hub must not independently reverse/edit this row like a normal expense.
      const transactionRecord = tx.makeRecord(WALLET_TRANSACTION_STORE, {
        id: paymentId,
        wallet_id: walletId,
        walletId,
        amount: paymentAmount,
        type: "debt_payment",
        category: "Debt / Obligations",
        planning_status: "planned",
        source_type: "expense_debt_payment",
        sourceType: "expense_debt_payment",
        tag: "debt_payment",
        title: historical ? `Debt payment logged — ${title}` : `Debt payment — ${title}`,
        name: historical ? `Debt payment logged — ${title}` : `Debt payment — ${title}`,
        notes: transactionNotes,
        debt_obligation_id: safeDebtId,
        debtObligationId: safeDebtId,
        debt_payment_id: paymentId,
        debtPaymentId: paymentId,
        meansRequirementKey: meansRequirementKey || null,
        means_requirement_key: meansRequirementKey || null,
        meansMatchedPlannedAmount,
        means_matched_planned_amount: meansMatchedPlannedAmount,
        meansUnmatchedAmount,
        means_unmatched_amount: meansUnmatchedAmount,
        non_editable: true,
        nonEditable: true,
        historical,
        historical_payment: historical,
        wallet_balance_already_reflected: historical && walletAlreadyReflectsPayment,
        walletBalanceAlreadyReflected: historical && walletAlreadyReflectsPayment,
        deducted_from_wallet: deductWallet,
        deductedFromWallet: deductWallet,
        wallet_balance_effect: deductWallet ? "deducted" : "already_reflected",
        walletBalanceEffect: deductWallet ? "deducted" : "already_reflected",
        due_date: dueDate || null,
        dueDate: dueDate || null,
        paid_at: actualPaidAt,
        paidAt: actualPaidAt,
        transaction_date: actualPaidAt.slice(0, 10),
        transactionDate: actualPaidAt.slice(0, 10),
        created_at: actualPaidAt,
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
        paidAt: actualPaidAt,
        historical,
        walletAlreadyReflectsPayment: historical && walletAlreadyReflectsPayment,
        deductedFromWallet: deductWallet,
        debt: debtRecord,
        wallet: walletRecord,
        transaction: transactionRecord,
      };
    }
  );

  emitPaymentUpdates(safeLocalUserId);
  return result;
}
