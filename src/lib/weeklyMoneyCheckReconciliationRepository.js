import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "@/lib/localFinanceStore";

const WALLET_STORE = LOCAL_FINANCE_STORES.wallets;
const WALLET_TRANSACTION_STORE = LOCAL_FINANCE_STORES.walletTransactions;
const EPSILON = 0.009;

const clean = (value = "") => String(value ?? "").trim();

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function walletBalance(wallet = {}) {
  return toNumber(
    wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0
  );
}

function explanationText(snapshot = {}) {
  const explanation = snapshot?.explanation || {};
  const kind = clean(explanation.kind || "unknown");
  const note = clean(explanation.note || "");
  if (note) return `${kind}: ${note}`;
  return kind || "unknown";
}

function emitFinanceUpdates(localUserId, reconciliationId) {
  if (typeof window === "undefined") return;

  [
    "clara:finance-data-updated",
    "clara-finance-updated",
    "clara-wallets-updated",
    "clara-local-finance-updated",
  ].forEach((eventName) => {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          localUserId,
          source: "weekly-money-check:reconciliation",
          reconciliationId,
        },
      })
    );
  });
}

/**
 * Aligns CLARA wallet balances to the actual balances the user confirmed during
 * Weekly Money Check.
 *
 * One IndexedDB transaction owns every wallet adjustment and its matching audit
 * row. If any wallet changed after the check started, the whole reconciliation
 * aborts so a legitimate newer transaction can never be overwritten.
 *
 * Cross-Check owns wallet truth only. It must not create a second Means-side
 * deduction/reset layer and it never mutates the protected 100 baseline.
 */
export async function reconcileWeeklyMoneyCheckWallets(
  localUserId,
  snapshots = [],
  options = {}
) {
  const safeLocalUserId = clean(localUserId);
  if (!safeLocalUserId) {
    throw new Error("localUserId is required for Weekly Money Check reconciliation.");
  }

  const candidates = (Array.isArray(snapshots) ? snapshots : [])
    .map((snapshot) => ({
      ...snapshot,
      walletId: clean(snapshot?.walletId || snapshot?.wallet_id),
      walletName: clean(snapshot?.walletName || snapshot?.wallet_name || "Wallet"),
      recordedBalance: toNumber(snapshot?.recordedBalance ?? snapshot?.recorded_balance),
      actualBalance: Number(snapshot?.actualBalance ?? snapshot?.actual_balance),
    }))
    .filter(
      (snapshot) =>
        snapshot.walletId &&
        Number.isFinite(snapshot.actualBalance) &&
        snapshot.actualBalance >= 0 &&
        Math.abs(snapshot.actualBalance - snapshot.recordedBalance) > EPSILON
    );

  const reconciliationId =
    clean(options.reconciliationId || options.reconciliation_id) ||
    `weekly-money-check-${Date.now()}`;

  if (!candidates.length) {
    return {
      reconciliationId,
      adjustedWallets: 0,
      walletUpdates: [],
      transactions: [],
    };
  }

  const result = await runLocalFinanceTransaction(
    [WALLET_STORE, WALLET_TRANSACTION_STORE],
    safeLocalUserId,
    async (tx) => {
      const now = tx.nowIso();
      const walletUpdates = [];
      const transactions = [];

      // Validate the full set before mutating anything. This preserves atomicity
      // when one wallet received a legitimate transaction while the check was open.
      const resolved = [];
      for (const snapshot of candidates) {
        const wallet = await tx.get(WALLET_STORE, snapshot.walletId);
        if (!wallet) {
          throw new Error(`${snapshot.walletName} could not be found for reconciliation.`);
        }

        const currentBalance = walletBalance(wallet);
        const alreadyAligned = Math.abs(currentBalance - snapshot.actualBalance) <= EPSILON;
        if (alreadyAligned) {
          resolved.push({ snapshot, wallet, currentBalance, alreadyAligned: true });
          continue;
        }

        if (Math.abs(currentBalance - snapshot.recordedBalance) > EPSILON) {
          throw new Error(
            `${snapshot.walletName} changed while Weekly Cross-Check was open. I did not overwrite the newer balance.`
          );
        }

        resolved.push({ snapshot, wallet, currentBalance, alreadyAligned: false });
      }

      for (const entry of resolved) {
        if (entry.alreadyAligned) continue;

        const { snapshot, wallet, currentBalance } = entry;
        const adjustment = snapshot.actualBalance - currentBalance;
        const transactionId = tx.createId(WALLET_TRANSACTION_STORE);

        const walletRecord = {
          ...wallet,
          balance: snapshot.actualBalance,
          updatedAt: now,
          updated_at: now,
          syncStatus: "local_only",
          source: "local",
        };
        await tx.putRaw(WALLET_STORE, walletRecord);
        walletUpdates.push(walletRecord);

        const transactionRecord = tx.makeRecord(WALLET_TRANSACTION_STORE, {
          id: transactionId,
          wallet_id: snapshot.walletId,
          walletId: snapshot.walletId,
          amount: adjustment,
          signed_amount: adjustment,
          signedAmount: adjustment,
          type: "weekly_cross_check_adjustment",
          category: "Cross-Check Adjustment",
          source_type: "weekly_cross_check_reconciliation",
          sourceType: "weekly_cross_check_reconciliation",
          tag: "weekly_cross_check_adjustment",
          title: `Cross-Check Adjustment — ${snapshot.walletName}`,
          name: `Cross-Check Adjustment — ${snapshot.walletName}`,
          notes: `Balance reconciled from ${currentBalance} to ${snapshot.actualBalance}. Explanation: ${explanationText(snapshot)}.`,
          previous_balance: currentBalance,
          previousBalance: currentBalance,
          actual_balance: snapshot.actualBalance,
          actualBalance: snapshot.actualBalance,
          reconciliation_difference: adjustment,
          reconciliationDifference: adjustment,
          explanation_kind: clean(snapshot?.explanation?.kind || "unknown"),
          explanationKind: clean(snapshot?.explanation?.kind || "unknown"),
          explanation_note: clean(snapshot?.explanation?.note || ""),
          explanationNote: clean(snapshot?.explanation?.note || ""),
          weekly_money_check_id: reconciliationId,
          weeklyMoneyCheckId: reconciliationId,
          non_editable: true,
          nonEditable: true,
          created_at: now,
          updated_at: now,
          deletedAt: null,
          syncStatus: "local_only",
          source: "local",
        });
        await tx.putRaw(WALLET_TRANSACTION_STORE, transactionRecord);
        transactions.push(transactionRecord);
      }

      return {
        reconciliationId,
        adjustedWallets: walletUpdates.length,
        walletUpdates,
        transactions,
      };
    }
  );

  emitFinanceUpdates(safeLocalUserId, reconciliationId);
  return result;
}
