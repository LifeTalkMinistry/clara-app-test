export const CLARA_FINANCIAL_CONTEXT_MIGRATION_VERSION = 1;
export const CLARA_FINANCIAL_RECONCILIATION_EPSILON = 0.000001;

const text = (value) => String(value ?? "").trim();
const lower = (value) => text(value).toLowerCase();
const dateKey = (value) => text(value).slice(0, 10);
const signed = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (value) => Math.max(0, signed(value));

function explicitRequirementKey(record = {}) {
  return text(
    record?.meansRequirementKey ||
      record?.means_requirement_key ||
      record?.plannedRequirementKey ||
      record?.planned_requirement_key ||
      record?.requirementKey ||
      record?.requirement_key
  );
}

function financeDatabase(prepared) {
  return (prepared?.data?.indexedDB?.databases || []).find(
    (database) => database?.name === "clara_local_finance"
  );
}

function normalizeStoreRecords(store) {
  if (Array.isArray(store)) return store;
  if (Array.isArray(store?.records)) return store.records;
  return [];
}

function scheduleEventDates(prepared) {
  const byId = new Map();
  const conflicts = new Set();
  Object.entries(prepared?.data?.localStorage || {}).forEach(([key, value]) => {
    if (!key.startsWith("clara_schedule_events_v2")) return;
    const events = Array.isArray(value) ? value : [];
    events.forEach((event) => {
      const id = text(event?.id);
      const date = dateKey(event?.date);
      if (!id || !date) return;
      const current = byId.get(id);
      if (current && current !== date) conflicts.add(id);
      else byId.set(id, date);
    });
  });
  conflicts.forEach((id) => byId.delete(id));
  return { byId, conflicts };
}

function legacySourceSignal(record = {}) {
  return lower(
    record?.sourceType ||
      record?.source_type ||
      record?.source ||
      record?.kind ||
      record?.recordKind ||
      record?.record_kind
  );
}

function legacyIdentityEvidence(record = {}, scheduleDates = new Map()) {
  const debtId = text(record?.debtId || record?.debt_id || record?.obligationId || record?.obligation_id);
  const dueDate = dateKey(
    record?.dueDate ||
      record?.due_date ||
      record?.dueOccurrenceDate ||
      record?.due_occurrence_date
  );
  if (debtId && dueDate) {
    return { key: `debt:${debtId}:${dueDate}`, evidence: "debt_id_due_date" };
  }

  const eventId = text(
    record?.moneyScheduleEventId ||
      record?.money_schedule_event_id ||
      record?.scheduleEventId ||
      record?.schedule_event_id
  );
  const eventDate = dateKey(
    record?.occurrenceDate ||
      record?.occurrence_date ||
      record?.scheduledDate ||
      record?.scheduled_date ||
      scheduleDates.get(eventId)
  );
  if (eventId && eventDate) {
    return { key: `money-schedule:${eventId}:${eventDate}`, evidence: "schedule_event_id_occurrence" };
  }

  const routineId = text(record?.routineId || record?.routine_id || record?.moneyRoutineId || record?.money_routine_id);
  const routineDate = dateKey(
    record?.occurrenceDate ||
      record?.occurrence_date ||
      record?.scheduledDate ||
      record?.scheduled_date
  );
  if (routineId && routineDate) {
    return { key: `money-routine:${routineId}:${routineDate}`, evidence: "routine_id_occurrence" };
  }

  return null;
}

function hasLegacyPlanIdentitySignal(record = {}) {
  const source = legacySourceSignal(record);
  return Boolean(
    record?.moneyScheduleEventId ||
      record?.money_schedule_event_id ||
      record?.scheduleEventId ||
      record?.schedule_event_id ||
      record?.routineId ||
      record?.routine_id ||
      record?.moneyRoutineId ||
      record?.money_routine_id ||
      record?.debtId ||
      record?.debt_id ||
      record?.obligationId ||
      record?.obligation_id ||
      source.includes("money_schedule") ||
      source.includes("money schedule") ||
      source.includes("debt") ||
      source.includes("obligation")
  );
}

function withRequirementKey(record, key, evidence) {
  if (!key) return record;
  return {
    ...record,
    meansRequirementKey: key,
    requirementKey: key,
    migrationRequirementIdentityEvidence:
      record?.migrationRequirementIdentityEvidence || evidence || "explicit",
  };
}

/**
 * Converts only deterministic legacy requirement representations into the current
 * stable requirement-key contract. It never uses titles, amounts, or planning status
 * as identity. Ambiguous relationships are returned as unresolved and must block
 * transfer activation.
 */
export function normalizePreparedFinancialContext(prepared) {
  const database = financeDatabase(prepared);
  if (!database) {
    return { prepared, normalized: [], unresolved: [] };
  }

  const { byId: scheduleDates, conflicts: scheduleDateConflicts } = scheduleEventDates(prepared);
  const normalized = [];
  const unresolved = [];
  const stores = {};

  for (const [storeName, store] of Object.entries(database.stores || {})) {
    const rows = normalizeStoreRecords(store).map((record) => ({ ...record }));
    stores[storeName] = { ...store, records: rows, count: rows.length };
  }

  const expenseRows = normalizeStoreRecords(stores.expenses);
  const transactionRows = normalizeStoreRecords(stores.wallet_transactions);

  const normalizeRow = (record, storeName) => {
    const existingKey = explicitRequirementKey(record);
    const derived = existingKey ? null : legacyIdentityEvidence(record, scheduleDates);
    if (existingKey) return withRequirementKey(record, existingKey, "explicit_requirement_key");
    if (derived?.key) {
      normalized.push({
        storeName,
        recordId: text(record?.id),
        requirementKey: derived.key,
        evidence: derived.evidence,
      });
      return withRequirementKey(record, derived.key, derived.evidence);
    }

    const eventId = text(
      record?.moneyScheduleEventId ||
        record?.money_schedule_event_id ||
        record?.scheduleEventId ||
        record?.schedule_event_id
    );
    if (eventId && scheduleDateConflicts.has(eventId)) {
      unresolved.push({
        code: "ambiguous_schedule_occurrence",
        storeName,
        recordId: text(record?.id),
        sourceId: eventId,
      });
    } else if (hasLegacyPlanIdentitySignal(record)) {
      unresolved.push({
        code: "legacy_requirement_identity_unresolved",
        storeName,
        recordId: text(record?.id),
      });
    }
    return record;
  };

  stores.expenses = {
    ...stores.expenses,
    records: expenseRows.map((record) => normalizeRow(record, "expenses")),
  };
  stores.wallet_transactions = {
    ...stores.wallet_transactions,
    records: transactionRows.map((record) => normalizeRow(record, "wallet_transactions")),
  };

  const expensesById = new Map(
    normalizeStoreRecords(stores.expenses)
      .map((record) => [text(record?.id), record])
      .filter(([id]) => Boolean(id))
  );
  const nextTransactions = normalizeStoreRecords(stores.wallet_transactions).map((transaction) => {
    const expenseId = text(transaction?.expense_id || transaction?.expenseId);
    if (!expenseId) return transaction;
    const expense = expensesById.get(expenseId);
    if (!expense) return transaction;

    const expenseKey = explicitRequirementKey(expense);
    const transactionKey = explicitRequirementKey(transaction);
    if (expenseKey && transactionKey && expenseKey !== transactionKey) {
      unresolved.push({
        code: "conflicting_linked_requirement_identity",
        storeName: "wallet_transactions",
        recordId: text(transaction?.id),
        expenseId,
        expenseRequirementKey: expenseKey,
        transactionRequirementKey: transactionKey,
      });
      return transaction;
    }
    if (!transactionKey && expenseKey) {
      normalized.push({
        storeName: "wallet_transactions",
        recordId: text(transaction?.id),
        requirementKey: expenseKey,
        evidence: "linked_expense_requirement_key",
      });
      return withRequirementKey(transaction, expenseKey, "linked_expense_requirement_key");
    }
    if (!expenseKey && transactionKey) {
      const patchedExpense = withRequirementKey(expense, transactionKey, "linked_transaction_requirement_key");
      expensesById.set(expenseId, patchedExpense);
      normalized.push({
        storeName: "expenses",
        recordId: expenseId,
        requirementKey: transactionKey,
        evidence: "linked_transaction_requirement_key",
      });
    }
    return transaction;
  });

  stores.expenses = {
    ...stores.expenses,
    records: normalizeStoreRecords(stores.expenses).map((record) =>
      expensesById.get(text(record?.id)) || record
    ),
  };
  stores.wallet_transactions = {
    ...stores.wallet_transactions,
    records: nextTransactions,
  };
  Object.keys(stores).forEach((storeName) => {
    stores[storeName] = {
      ...stores[storeName],
      count: normalizeStoreRecords(stores[storeName]).length,
    };
  });

  return {
    prepared: {
      ...prepared,
      data: {
        ...prepared.data,
        indexedDB: {
          ...prepared.data.indexedDB,
          databases: (prepared.data.indexedDB.databases || []).map((entry) =>
            entry.name === "clara_local_finance" ? { ...entry, stores } : entry
          ),
        },
      },
    },
    normalized,
    unresolved,
  };
}

function walletId(wallet = {}) {
  return text(wallet?.id || wallet?.wallet_id || wallet?.walletId);
}

function isDeleted(record = {}) {
  return Boolean(record?.deletedAt || record?.deleted_at);
}

function migrationProfile(profile, vaultId) {
  const id = text(vaultId);
  return {
    ...(profile || {}),
    id,
    user_id: id,
    userId: id,
  };
}

/**
 * Captures financial truth using the normal CLARA runtime authorities. This object is
 * verification evidence only; it is never persisted as a second financial database.
 */
export async function buildFinancialContextMigrationSnapshot({
  profile = {},
  vaultId,
  now = new Date(),
} = {}) {
  const owner = text(vaultId);
  if (!owner) throw new Error("A vault id is required for financial migration reconciliation.");

  const [meansAuthority, financeRepository, financeStore, financialEngine] = await Promise.all([
    import("./clara-means-authority.js"),
    import("./financeRepository.js"),
    import("./localFinanceStore.js"),
    import("../utils/financialEngine.js"),
  ]);

  const scopedProfile = migrationProfile(profile, owner);
  const [canonical, wallets, walletTransactions, transfers, savingsGoals, emergencyFund] =
    await Promise.all([
      meansAuthority.buildCanonicalMeansSnapshot({ profile: scopedProfile, now }),
      financeRepository.getWallets(owner).catch(() => []),
      financeRepository.getWalletTransactions(owner).catch(() => []),
      financeRepository.getTransfers(owner).catch(() => []),
      financeRepository.getSavingsGoals(owner).catch(() => []),
      financeRepository.getEmergencyFund(owner).catch(() => null),
    ]);

  const walletState = meansAuthority.calculateMeansAvailableWalletState(
    wallets,
    walletTransactions,
    transfers,
    { emergencyFund, savingsGoals }
  );
  const activeWalletRows = (Array.isArray(wallets) ? wallets : [])
    .filter((wallet) => !isDeleted(wallet))
    .map((wallet) => ({
      walletId: walletId(wallet),
      resolvedBalance: financialEngine.getWalletBalance(
        wallet,
        (Array.isArray(walletTransactions) ? walletTransactions : []).filter((row) => !isDeleted(row)),
        (Array.isArray(transfers) ? transfers : []).filter((row) => !isDeleted(row))
      ),
    }))
    .filter((row) => row.walletId);

  const requirements = Array.isArray(canonical?.planRequirements)
    ? canonical.planRequirements.map((entry) => ({
        requirementKey: text(entry?.requirementKey || entry?.id),
        sourceType: text(entry?.sourceType || entry?.kind),
        sourceId: text(entry?.sourceId),
        date: dateKey(entry?.date),
        plannedAmount: money(entry?.plannedAmount),
        fulfilledAmount: money(entry?.fulfilledAmount),
        remainingAmount: money(entry?.remainingAmount),
      }))
    : [];

  const availableWalletMoney = signed(
    canonical?.availableWalletMoney ?? walletState.availableNow
  );
  const remainingPlannedSpending = money(canonical?.remainingPlannedSpending);
  const wallBill = canonical
    ? signed(canonical?.wallBill)
    : availableWalletMoney - remainingPlannedSpending;

  return {
    migrationVersion: CLARA_FINANCIAL_CONTEXT_MIGRATION_VERSION,
    localVaultId: owner,
    activeCycle: canonical
      ? {
          sourceId: canonical.masterPayCycleSourceId || null,
          cycleStart: dateKey(canonical.cycleStartDate),
          cycleEnd: dateKey(canonical.cycleEndDate),
        }
      : null,
    availableWalletMoney,
    cycle100Anchor: money(canonical?.cycle100Anchor),
    anchorState: canonical?.anchorState || "no_anchor",
    anchorVersion: canonical?.legacyMeansVersion || (canonical?.cycle100Anchor > 0 ? 7 : null),
    migrationUnresolved: Boolean(canonical?.migrationUnresolved),
    remainingPlannedSpending,
    wallBill,
    meansScore: canonical?.meansScore ?? null,
    requirements,
    walletContext: activeWalletRows,
    fulfillmentContext: requirements.map((entry) => ({
      requirementKey: entry.requirementKey,
      fulfilledAmount: entry.fulfilledAmount,
    })),
  };
}

function equalNumber(left, right, epsilon) {
  return Math.abs(signed(left) - signed(right)) <= epsilon;
}

function equalNullableNumber(left, right, epsilon) {
  if (left == null || right == null) return left == null && right == null;
  return equalNumber(left, right, epsilon);
}

function sameCycle(left, right) {
  if (!left || !right) return !left && !right;
  return (
    dateKey(left.cycleStart) === dateKey(right.cycleStart) &&
    dateKey(left.cycleEnd) === dateKey(right.cycleEnd) &&
    text(left.sourceId) === text(right.sourceId)
  );
}

export function reconcileFinancialContextMigration({
  source,
  destination,
  unresolved = [],
  epsilon = CLARA_FINANCIAL_RECONCILIATION_EPSILON,
  sourceVaultId = source?.localVaultId || null,
  destinationVaultId = destination?.localVaultId || null,
} = {}) {
  if (!source || !destination) {
    return {
      status: "failed",
      migrationVersion: CLARA_FINANCIAL_CONTEXT_MIGRATION_VERSION,
      sourceVaultId,
      destinationVaultId,
      reconciliation: {
        cycleMatch: false,
        walletMatch: false,
        remainingPlanMatch: false,
        anchorMatch: false,
        wallBillMatch: false,
        meansScoreMatch: false,
      },
      unresolved: [{ code: "missing_financial_snapshot" }, ...(unresolved || [])],
    };
  }

  const reconciliation = {
    cycleMatch: sameCycle(source.activeCycle, destination.activeCycle),
    walletMatch: equalNumber(
      source.availableWalletMoney,
      destination.availableWalletMoney,
      epsilon
    ),
    remainingPlanMatch: equalNumber(
      source.remainingPlannedSpending,
      destination.remainingPlannedSpending,
      epsilon
    ),
    anchorMatch:
      equalNumber(source.cycle100Anchor, destination.cycle100Anchor, epsilon) &&
      text(source.anchorState) === text(destination.anchorState),
    wallBillMatch: equalNumber(source.wallBill, destination.wallBill, epsilon),
    meansScoreMatch: equalNullableNumber(source.meansScore, destination.meansScore, epsilon),
  };

  const unresolvedItems = [...(Array.isArray(unresolved) ? unresolved : [])];
  if (source.migrationUnresolved || destination.migrationUnresolved) {
    unresolvedItems.push({ code: "unresolved_anchor" });
  }

  const allMatch = Object.values(reconciliation).every(Boolean);
  const status = unresolvedItems.length > 0 ? "unresolved" : allMatch ? "success" : "failed";

  return {
    status,
    migrationVersion: CLARA_FINANCIAL_CONTEXT_MIGRATION_VERSION,
    sourceVaultId,
    destinationVaultId,
    reconciliation,
    unresolved: unresolvedItems,
  };
}

export function assertSuccessfulFinancialContextMigration(result) {
  if (result?.status === "success") return result;
  const error = new Error(
    result?.status === "unresolved"
      ? "Financial migration is unresolved and cannot activate this destination vault safely."
      : "Financial migration reconciliation failed. The destination vault was not activated."
  );
  error.code =
    result?.status === "unresolved"
      ? "CLARA_FINANCIAL_MIGRATION_UNRESOLVED"
      : "CLARA_FINANCIAL_MIGRATION_MISMATCH";
  error.migrationResult = result;
  throw error;
}
