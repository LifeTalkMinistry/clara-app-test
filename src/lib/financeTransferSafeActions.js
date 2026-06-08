import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "./localFinanceStore.js";

const STORE = {
  wallets: LOCAL_FINANCE_STORES?.wallets || "wallets",
  walletTransactions:
    LOCAL_FINANCE_STORES?.walletTransactions || "wallet_transactions",
  transfers: LOCAL_FINANCE_STORES?.transfers || "transfers",
};

const TRANSFER_PAIR_MISSING_MESSAGE =
  "This transfer cannot be changed because its linked wallet movement could not be found.";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, "_");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const number = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeAmountOrThrow(value, label = "Transfer amount") {
  const amount = Math.abs(toNumber(value));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return amount;
}

function isDeletedRecord(record) {
  return Boolean(
    record?.deletedAt ||
      record?.deleted_at ||
      record?.isDeleted ||
      record?.is_deleted ||
      normalizeLower(record?.status) === "deleted"
  );
}

function getWalletBalance(wallet) {
  return toNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0
  );
}

function makeWalletBalancePatch(wallet, nextBalance, operationTime) {
  return {
    ...wallet,
    balance: nextBalance,
    updatedAt: operationTime,
    updated_at: operationTime,
    syncStatus: "local_only",
    source: "local",
  };
}

function getTransferGroupId(record) {
  return normalizeString(
    record?.transfer_group_id ??
      record?.transferGroupId ??
      record?.transfer_id ??
      record?.transferId ??
      record?.group_id ??
      record?.groupId ??
      record?.reference_id ??
      record?.referenceId ??
      record?.id
  );
}

function getTransferSourceWalletId(record) {
  return normalizeString(
    record?.from_wallet_id ??
      record?.fromWalletId ??
      record?.source_wallet_id ??
      record?.sourceWalletId ??
      record?.wallet_id ??
      record?.walletId
  );
}

function getTransferDestinationWalletId(record) {
  return normalizeString(
    record?.to_wallet_id ??
      record?.toWalletId ??
      record?.destination_wallet_id ??
      record?.destinationWalletId ??
      record?.related_wallet_id ??
      record?.relatedWalletId
  );
}

function getWalletTransactionWalletId(record) {
  return normalizeString(record?.wallet_id ?? record?.walletId);
}

function getWalletTransactionRelatedWalletId(record) {
  return normalizeString(record?.related_wallet_id ?? record?.relatedWalletId);
}

function getTransferNotes(record) {
  return normalizeString(record?.notes ?? record?.note ?? record?.description ?? record?.memo);
}

function getTransferDateValue(record, fallbackDate) {
  return normalizeString(
    record?.date ??
      record?.created_at ??
      record?.createdAt ??
      record?.transaction_date ??
      record?.transactionDate ??
      fallbackDate
  );
}

function assertValidDateValue(dateValue) {
  const parsed = new Date(dateValue);

  if (!dateValue || Number.isNaN(parsed.getTime())) {
    throw new Error("Transfer date must be valid.");
  }
}

function addDelta(deltas, walletId, amount) {
  const safeWalletId = normalizeString(walletId);
  if (!safeWalletId || !amount) return;
  deltas.set(safeWalletId, (deltas.get(safeWalletId) || 0) + amount);
}

async function applyWalletDeltas(tx, deltas, operationTime) {
  const walletUpdates = [];

  for (const [walletId, delta] of deltas.entries()) {
    if (!delta) continue;

    const wallet = await tx.get(STORE.wallets, walletId);

    if (!wallet) {
      throw new Error("Wallet not found for this local user.");
    }

    const walletUpdate = makeWalletBalancePatch(
      wallet,
      getWalletBalance(wallet) + delta,
      operationTime
    );

    await tx.putRaw(STORE.wallets, walletUpdate);
    walletUpdates.push(walletUpdate);
  }

  return walletUpdates;
}

async function findTransferRecord(tx, transferIdOrGroupId) {
  const safeId = normalizeString(transferIdOrGroupId);
  if (!safeId) return null;

  const directRecord = await tx.get(STORE.transfers, safeId);
  if (directRecord && !isDeletedRecord(directRecord)) return directRecord;

  const transfers = await tx.getAllForUser(STORE.transfers, false);
  return (
    transfers.find(
      (transfer) =>
        !isDeletedRecord(transfer) &&
        (normalizeString(transfer?.id) === safeId || getTransferGroupId(transfer) === safeId)
    ) || null
  );
}

function getTransferPair(walletTransactions, transferGroupId, transfer) {
  const safeGroupId = normalizeString(transferGroupId);
  const sourceWalletId = getTransferSourceWalletId(transfer);
  const destinationWalletId = getTransferDestinationWalletId(transfer);
  const amount = normalizeAmountOrThrow(transfer?.amount, "Original transfer amount");

  const candidates = (Array.isArray(walletTransactions) ? walletTransactions : []).filter((txn) => {
    if (!txn || isDeletedRecord(txn)) return false;

    const txnGroupId = getTransferGroupId(txn);
    const type = normalizeLower(txn?.type || txn?.source_type || txn?.sourceType);

    return (
      (safeGroupId && txnGroupId === safeGroupId) ||
      (type.includes("transfer") && toNumber(txn.amount) === amount)
    );
  });

  const transferOut =
    candidates.find(
      (txn) =>
        normalizeLower(txn?.type).includes("transfer_out") &&
        getWalletTransactionWalletId(txn) === sourceWalletId &&
        getWalletTransactionRelatedWalletId(txn) === destinationWalletId
    ) ||
    candidates.find(
      (txn) =>
        normalizeLower(txn?.type).includes("out") &&
        getWalletTransactionWalletId(txn) === sourceWalletId
    );

  const transferIn =
    candidates.find(
      (txn) =>
        normalizeLower(txn?.type).includes("transfer_in") &&
        getWalletTransactionWalletId(txn) === destinationWalletId &&
        getWalletTransactionRelatedWalletId(txn) === sourceWalletId
    ) ||
    candidates.find(
      (txn) =>
        normalizeLower(txn?.type).includes("in") &&
        getWalletTransactionWalletId(txn) === destinationWalletId
    );

  if (!transferOut || !transferIn || transferOut.id === transferIn.id) return null;

  return {
    transferOut,
    transferIn,
  };
}

function buildValidatedTransferUpdate(existingTransfer, patch = {}, operationTime) {
  const amount =
    patch.amount !== undefined
      ? normalizeAmountOrThrow(patch.amount, "Transfer amount")
      : normalizeAmountOrThrow(existingTransfer?.amount, "Transfer amount");

  const sourceWalletId =
    patch.from_wallet_id !== undefined ||
    patch.fromWalletId !== undefined ||
    patch.source_wallet_id !== undefined ||
    patch.sourceWalletId !== undefined ||
    patch.wallet_id !== undefined ||
    patch.walletId !== undefined
      ? getTransferSourceWalletId(patch)
      : getTransferSourceWalletId(existingTransfer);

  const destinationWalletId =
    patch.to_wallet_id !== undefined ||
    patch.toWalletId !== undefined ||
    patch.destination_wallet_id !== undefined ||
    patch.destinationWalletId !== undefined ||
    patch.related_wallet_id !== undefined ||
    patch.relatedWalletId !== undefined
      ? getTransferDestinationWalletId(patch)
      : getTransferDestinationWalletId(existingTransfer);

  if (!sourceWalletId) {
    throw new Error("Source wallet id is required for transfer editing.");
  }

  if (!destinationWalletId) {
    throw new Error("Destination wallet id is required for transfer editing.");
  }

  if (sourceWalletId === destinationWalletId) {
    throw new Error("Source and destination wallets must be different.");
  }

  const dateValue = getTransferDateValue(patch, getTransferDateValue(existingTransfer, operationTime));
  assertValidDateValue(dateValue);

  return {
    amount,
    sourceWalletId,
    destinationWalletId,
    dateValue,
    notes: getTransferNotes(patch) || getTransferNotes(existingTransfer),
  };
}

function buildDeletedRecord(record, operationTime) {
  return {
    ...record,
    deletedAt: operationTime,
    deleted_at: operationTime,
    updatedAt: operationTime,
    updated_at: operationTime,
    syncStatus: "local_deleted",
    source: "local",
  };
}

export async function updateTransferSafely(localUserId, transferId, patch = {}) {
  const safeLocalUserId = normalizeString(localUserId);
  const safeTransferId = normalizeString(transferId);

  if (!safeLocalUserId) {
    throw new Error("localUserId is required for transfer editing.");
  }

  if (!safeTransferId) {
    throw new Error("Transfer id is required.");
  }

  const operationTime = new Date().toISOString();

  return runLocalFinanceTransaction(
    [STORE.wallets, STORE.walletTransactions, STORE.transfers],
    safeLocalUserId,
    async (tx) => {
      const existingTransfer = await findTransferRecord(tx, safeTransferId);

      if (!existingTransfer) {
        throw new Error("Transfer record not found for this local user.");
      }

      const transferGroupId = getTransferGroupId(existingTransfer) || safeTransferId;
      const walletTransactions = await tx.getAllForUser(STORE.walletTransactions, true);
      const transferPair = getTransferPair(walletTransactions, transferGroupId, existingTransfer);

      if (!transferPair) {
        throw new Error(TRANSFER_PAIR_MISSING_MESSAGE);
      }

      const oldAmount = normalizeAmountOrThrow(existingTransfer.amount, "Original transfer amount");
      const oldSourceWalletId = getTransferSourceWalletId(existingTransfer);
      const oldDestinationWalletId = getTransferDestinationWalletId(existingTransfer);
      const nextTransfer = buildValidatedTransferUpdate(existingTransfer, patch, operationTime);

      if (!oldSourceWalletId || !oldDestinationWalletId) {
        throw new Error(TRANSFER_PAIR_MISSING_MESSAGE);
      }

      const deltas = new Map();
      addDelta(deltas, oldSourceWalletId, oldAmount);
      addDelta(deltas, oldDestinationWalletId, -oldAmount);
      addDelta(deltas, nextTransfer.sourceWalletId, -nextTransfer.amount);
      addDelta(deltas, nextTransfer.destinationWalletId, nextTransfer.amount);

      const walletUpdates = await applyWalletDeltas(tx, deltas, operationTime);

      const transferSummary = {
        ...existingTransfer,
        ...patch,
        id: existingTransfer.id,
        transfer_group_id: transferGroupId,
        transferGroupId: transferGroupId,
        from_wallet_id: nextTransfer.sourceWalletId,
        fromWalletId: nextTransfer.sourceWalletId,
        source_wallet_id: nextTransfer.sourceWalletId,
        sourceWalletId: nextTransfer.sourceWalletId,
        to_wallet_id: nextTransfer.destinationWalletId,
        toWalletId: nextTransfer.destinationWalletId,
        destination_wallet_id: nextTransfer.destinationWalletId,
        destinationWalletId: nextTransfer.destinationWalletId,
        amount: nextTransfer.amount,
        notes: nextTransfer.notes,
        note: nextTransfer.notes,
        description: nextTransfer.notes,
        date: nextTransfer.dateValue,
        created_at: nextTransfer.dateValue,
        transaction_date: nextTransfer.dateValue,
        updatedAt: operationTime,
        updated_at: operationTime,
        deletedAt: null,
        deleted_at: null,
        syncStatus: "local_only",
        source: "local",
      };

      const transferOutTransaction = {
        ...transferPair.transferOut,
        wallet_id: nextTransfer.sourceWalletId,
        walletId: nextTransfer.sourceWalletId,
        related_wallet_id: nextTransfer.destinationWalletId,
        relatedWalletId: nextTransfer.destinationWalletId,
        amount: nextTransfer.amount,
        type: "transfer_out",
        transfer_group_id: transferGroupId,
        transferGroupId: transferGroupId,
        notes: nextTransfer.notes,
        note: nextTransfer.notes,
        created_at: nextTransfer.dateValue,
        updatedAt: operationTime,
        updated_at: operationTime,
        deletedAt: null,
        deleted_at: null,
        syncStatus: "local_only",
        source: "local",
      };

      const transferInTransaction = {
        ...transferPair.transferIn,
        wallet_id: nextTransfer.destinationWalletId,
        walletId: nextTransfer.destinationWalletId,
        related_wallet_id: nextTransfer.sourceWalletId,
        relatedWalletId: nextTransfer.sourceWalletId,
        amount: nextTransfer.amount,
        type: "transfer_in",
        transfer_group_id: transferGroupId,
        transferGroupId: transferGroupId,
        notes: nextTransfer.notes,
        note: nextTransfer.notes,
        created_at: nextTransfer.dateValue,
        updatedAt: operationTime,
        updated_at: operationTime,
        deletedAt: null,
        deleted_at: null,
        syncStatus: "local_only",
        source: "local",
      };

      await tx.putRaw(STORE.walletTransactions, transferOutTransaction);
      await tx.putRaw(STORE.walletTransactions, transferInTransaction);
      await tx.putRaw(STORE.transfers, transferSummary);

      return {
        transfer: transferSummary,
        walletUpdates,
        walletTransactions: {
          transferOut: transferOutTransaction,
          transferIn: transferInTransaction,
        },
      };
    }
  );
}

export async function deleteTransferSafely(localUserId, transferId) {
  const safeLocalUserId = normalizeString(localUserId);
  const safeTransferId = normalizeString(transferId);

  if (!safeLocalUserId) {
    throw new Error("localUserId is required for transfer deletion.");
  }

  if (!safeTransferId) {
    throw new Error("Transfer id is required.");
  }

  const operationTime = new Date().toISOString();

  return runLocalFinanceTransaction(
    [STORE.wallets, STORE.walletTransactions, STORE.transfers],
    safeLocalUserId,
    async (tx) => {
      const existingTransfer = await findTransferRecord(tx, safeTransferId);

      if (!existingTransfer) {
        throw new Error("Transfer record not found for this local user.");
      }

      const transferGroupId = getTransferGroupId(existingTransfer) || safeTransferId;
      const walletTransactions = await tx.getAllForUser(STORE.walletTransactions, true);
      const transferPair = getTransferPair(walletTransactions, transferGroupId, existingTransfer);

      if (!transferPair) {
        throw new Error(
          "This transfer cannot be deleted because its linked wallet movement could not be found."
        );
      }

      const amount = normalizeAmountOrThrow(existingTransfer.amount, "Transfer amount");
      const sourceWalletId = getTransferSourceWalletId(existingTransfer);
      const destinationWalletId = getTransferDestinationWalletId(existingTransfer);

      if (!sourceWalletId || !destinationWalletId) {
        throw new Error(
          "This transfer cannot be deleted because its linked wallet movement could not be found."
        );
      }

      const deltas = new Map();
      addDelta(deltas, sourceWalletId, amount);
      addDelta(deltas, destinationWalletId, -amount);

      const walletUpdates = await applyWalletDeltas(tx, deltas, operationTime);
      const deletedTransfer = buildDeletedRecord(existingTransfer, operationTime);
      const deletedTransferOut = buildDeletedRecord(transferPair.transferOut, operationTime);
      const deletedTransferIn = buildDeletedRecord(transferPair.transferIn, operationTime);

      await tx.putRaw(STORE.transfers, deletedTransfer);
      await tx.putRaw(STORE.walletTransactions, deletedTransferOut);
      await tx.putRaw(STORE.walletTransactions, deletedTransferIn);

      return {
        deletedTransferId: existingTransfer.id,
        transferGroupId,
        transfer: deletedTransfer,
        walletUpdates,
        walletTransactions: {
          transferOut: deletedTransferOut,
          transferIn: deletedTransferIn,
        },
      };
    }
  );
}
