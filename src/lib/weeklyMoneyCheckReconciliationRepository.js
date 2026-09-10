import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "@/lib/localFinanceStore";

const INCOME_SOURCE_STORE = LOCAL_FINANCE_STORES.privatePreferences;
const WALLET_STORE = LOCAL_FINANCE_STORES.wallets;
const WALLET_TRANSACTION_STORE = LOCAL_FINANCE_STORES.walletTransactions;
const EPSILON = 0.009;
const INCOME_ACTIVITY_LIMIT = 60;

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

function incomeSourceMoneyIn(source = {}) {
  return toNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in);
}

function incomeSourceMoneyOut(source = {}) {
  return toNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out);
}

function incomeSourceBalance(source = {}) {
  return toNumber(
    source.currentBalance ??
      source.current_balance ??
      source.balance ??
      incomeSourceMoneyIn(source) - incomeSourceMoneyOut(source)
  );
}

function incomeSourceActivityLog(source = {}) {
  const log = source.incomeActivityLog ?? source.income_activity_log ?? [];
  return Array.isArray(log) ? log.filter(Boolean) : [];
}

function getIncomeHubTransferSourceId(snapshot = {}) {
  const explanation = snapshot?.explanation || {};
  if (clean(explanation.kind) !== "income_hub_transfer") return "";
  return clean(
    explanation.incomeSourceId ||
      explanation.income_source_id ||
      explanation.sourceId ||
      explanation.source_id
  );
}

function explanationText(snapshot = {}) {
  const explanation = snapshot?.explanation || {};
  const kind = clean(explanation.kind || "unknown");
  const note = clean(explanation.note || "");
  const incomeSourceName = clean(
    explanation.incomeSourceName ||
      explanation.income_source_name ||
      explanation.sourceName ||
      explanation.source_name
  );
  if (note) return `${kind}: ${note}`;
  if (kind === "income_hub_transfer" && incomeSourceName) {
    return `${kind}: ${incomeSourceName}`;
  }
  return kind || "unknown";
}

function emitFinanceUpdates(localUserId, reconciliationId, incomeHubTransfers = 0) {
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

  if (incomeHubTransfers > 0) {
    window.dispatchEvent(new Event("clara-income-hub-updated"));
  }
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
 *
 * When the user explicitly says a positive wallet difference came from money
 * already available in Income Hub, Cross-Check links that existing source to the
 * wallet atomically instead of creating a generic adjustment or counting the
 * same money twice.
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
      incomeSourceId: getIncomeHubTransferSourceId(snapshot),
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
      incomeHubTransfers: 0,
      walletUpdates: [],
      incomeSourceUpdates: [],
      transactions: [],
    };
  }

  const needsIncomeSourceStore = candidates.some((snapshot) => Boolean(snapshot.incomeSourceId));
  const transactionStores = needsIncomeSourceStore
    ? [INCOME_SOURCE_STORE, WALLET_STORE, WALLET_TRANSACTION_STORE]
    : [WALLET_STORE, WALLET_TRANSACTION_STORE];

  const result = await runLocalFinanceTransaction(
    transactionStores,
    safeLocalUserId,
    async (tx) => {
      const now = tx.nowIso();
      const walletUpdates = [];
      const incomeSourceUpdates = [];
      const transactions = [];
      let incomeHubTransfers = 0;

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
          resolved.push({ snapshot, wallet, currentBalance, alreadyAligned: true, incomeSource: null });
          continue;
        }

        if (Math.abs(currentBalance - snapshot.recordedBalance) > EPSILON) {
          throw new Error(
            `${snapshot.walletName} changed while Weekly Cross-Check was open. I did not overwrite the newer balance.`
          );
        }

        const adjustment = snapshot.actualBalance - currentBalance;
        let incomeSource = null;

        if (snapshot.incomeSourceId) {
          if (adjustment <= EPSILON) {
            throw new Error("Income Hub can only explain a positive wallet difference.");
          }

          incomeSource = await tx.get(INCOME_SOURCE_STORE, snapshot.incomeSourceId);
          const validIncomeSource =
            incomeSource &&
            (incomeSource.kind === "income_source" || incomeSource.recordType === "income_source") &&
            !incomeSource.isArchived &&
            !incomeSource.is_archived;

          if (!validIncomeSource) {
            throw new Error("The selected Income Hub source is no longer available.");
          }

          if (incomeSourceBalance(incomeSource) + EPSILON < adjustment) {
            throw new Error(
              `${incomeSource.name || "Income Hub"} no longer has enough available money to explain this wallet increase.`
            );
          }
        }

        resolved.push({ snapshot, wallet, currentBalance, alreadyAligned: false, incomeSource });
      }

      for (const entry of resolved) {
        if (entry.alreadyAligned) continue;

        const { snapshot, wallet, currentBalance, incomeSource } = entry;
        const adjustment = snapshot.actualBalance - currentBalance;
        const transactionId = tx.createId(WALLET_TRANSACTION_STORE);

        const walletRecord = {
          ...wallet,
          balance: snapshot.actualBalance,
          current_balance: snapshot.actualBalance,
          wallet_balance: snapshot.actualBalance,
          available_balance: snapshot.actualBalance,
          updatedAt: now,
          updated_at: now,
          syncStatus: "local_only",
          source: "local",
        };
        await tx.putRaw(WALLET_STORE, walletRecord);
        walletUpdates.push(walletRecord);

        if (incomeSource) {
          const currentIn = incomeSourceMoneyIn(incomeSource);
          const currentOut = incomeSourceMoneyOut(incomeSource);
          const nextOut = currentOut + adjustment;
          const nextSourceBalance = currentIn - nextOut;
          const sourceName = clean(incomeSource.name || incomeSource.title || "Income Source");
          const activityId = `income_transfer_${transactionId}`;
          const activityLog = [
            {
              id: activityId,
              type: "transfer_money",
              amount: adjustment,
              sourceId: incomeSource.id,
              source_id: incomeSource.id,
              sourceName,
              source_name: sourceName,
              destinationWalletId: snapshot.walletId,
              destination_wallet_id: snapshot.walletId,
              destinationWalletName: snapshot.walletName,
              destination_wallet_name: snapshot.walletName,
              walletTransactionId: transactionId,
              wallet_transaction_id: transactionId,
              balanceAfter: nextSourceBalance,
              balance_after: nextSourceBalance,
              weeklyMoneyCheckId: reconciliationId,
              weekly_money_check_id: reconciliationId,
              createdAt: now,
              created_at: now,
            },
            ...incomeSourceActivityLog(incomeSource),
          ]
            .filter((activity, index, items) =>
              items.findIndex((candidate) => candidate?.id === activity?.id) === index
            )
            .slice(0, INCOME_ACTIVITY_LIMIT);

          const incomeSourceRecord = await tx.put(
            INCOME_SOURCE_STORE,
            {
              ...incomeSource,
              totalMoneyIn: currentIn,
              total_money_in: currentIn,
              totalMoneyOut: nextOut,
              total_money_out: nextOut,
              currentBalance: nextSourceBalance,
              current_balance: nextSourceBalance,
              lastActivityAt: now,
              last_activity_at: now,
              incomeActivityLog: activityLog,
              income_activity_log: activityLog,
              updatedAt: now,
              updated_at: now,
              syncStatus: "local_only",
              source: "local",
            },
            incomeSource
          );
          incomeSourceUpdates.push(incomeSourceRecord);

          const transactionRecord = tx.makeRecord(WALLET_TRANSACTION_STORE, {
            id: transactionId,
            wallet_id: snapshot.walletId,
            walletId: snapshot.walletId,
            amount: adjustment,
            signed_amount: adjustment,
            signedAmount: adjustment,
            type: "income",
            group: "income",
            category: "Income Source Transfer",
            source_type: sourceName,
            sourceType: sourceName,
            title: `Income from ${sourceName}`,
            name: `Income from ${sourceName}`,
            notes: `Weekly Cross-Check linked ${adjustment} already available in ${sourceName} to ${snapshot.walletName}.`,
            income_source_id: incomeSource.id,
            incomeSourceId: incomeSource.id,
            income_flow_type: "income_source_transfer",
            incomeFlowType: "income_source_transfer",
            weekly_money_check_id: reconciliationId,
            weeklyMoneyCheckId: reconciliationId,
            reconciliation_difference: adjustment,
            reconciliationDifference: adjustment,
            explanation_kind: "income_hub_transfer",
            explanationKind: "income_hub_transfer",
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
          incomeHubTransfers += 1;
          continue;
        }

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
        incomeHubTransfers,
        walletUpdates,
        incomeSourceUpdates,
        transactions,
      };
    }
  );

  emitFinanceUpdates(safeLocalUserId, reconciliationId, result.incomeHubTransfers);
  return result;
}
