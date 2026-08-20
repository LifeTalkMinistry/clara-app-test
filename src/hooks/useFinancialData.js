import { useMemo } from "react";
import useFinancialDataBase, {
  useFinancialData as useFinancialDataBaseNamed,
} from "./useFinancialDataBase.js";
import {
  getTotalWalletSpendableBalance,
  syncWalletProtectedAllocations,
} from "@/lib/clara-wallet-money-semantics";

const EMERGENCY_ACTIVITY_KEYS = [
  "emergencyActivityLog",
  "emergency_activity_log",
  "activityLog",
  "activity_log",
  "usageLog",
  "usage_log",
];

const toMoneyNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstText = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const getEmergencyProtectedAmount = (emergencyFund = {}) =>
  toMoneyNumber(
    emergencyFund?.protectedBalance ??
      emergencyFund?.protected_balance ??
      emergencyFund?.reserveBalance ??
      emergencyFund?.reserve_balance ??
      emergencyFund?.savedAmount ??
      emergencyFund?.saved_amount ??
      emergencyFund?.currentAmount ??
      emergencyFund?.current_amount ??
      emergencyFund?.amount ??
      emergencyFund?.balance ??
      emergencyFund?.moneyLeft ??
      0
  );

const getEmergencyActivityId = (transaction = {}) => {
  const raw = transaction?.raw || transaction || {};
  return firstText(raw, [
    "emergency_fund_transaction_id",
    "emergencyFundTransactionId",
    "emergency_fund_id",
    "emergencyFundId",
    "transfer_group_id",
    "transferGroupId",
    "group_id",
    "groupId",
  ]);
};

const isEmergencyAllocationActivity = (item = {}) => {
  const type = String(item?.type || "").trim().toLowerCase();
  const text = [
    item?.title,
    item?.reason,
    item?.category,
    item?.notes,
    item?.note,
    item?.description,
    item?.source_type,
    item?.sourceType,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return (
    type.includes("allocation") ||
    text.includes("emergency fund allocation") ||
    text.includes("moved to emergency fund") ||
    text.includes("protected inside")
  );
};

const removeEmergencyAllocationActivity = (log = [], activityId, amount) => {
  const safeActivityId = String(activityId || "").trim();
  let removedFallback = false;

  return (Array.isArray(log) ? log : []).filter((item) => {
    if (!item) return false;

    const itemIds = [
      item?.id,
      item?.emergency_fund_transaction_id,
      item?.emergencyFundTransactionId,
      item?.transfer_group_id,
      item?.transferGroupId,
    ]
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
      .map((value) => String(value).trim());

    if (safeActivityId && itemIds.includes(safeActivityId)) return false;

    if (!safeActivityId && !removedFallback) {
      const itemAmount = Math.abs(
        toMoneyNumber(item?.amount ?? item?.value ?? item?.total ?? 0)
      );
      if (itemAmount === amount && isEmergencyAllocationActivity(item)) {
        removedFallback = true;
        return false;
      }
    }

    return true;
  });
};

function getEmergencyTransferBacking(transaction = {}) {
  const raw = transaction?.raw || transaction || {};
  const type = String(raw?.type || raw?.source_type || raw?.sourceType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const transferGroupId = firstText(raw, [
    "transfer_group_id",
    "transferGroupId",
    "transfer_id",
    "transferId",
    "group_id",
    "groupId",
    "reference_id",
    "referenceId",
  ]);

  const explicitFrom = firstText(raw, [
    "from_wallet_id",
    "fromWalletId",
    "source_wallet_id",
    "sourceWalletId",
  ]);
  const explicitTo = firstText(raw, [
    "to_wallet_id",
    "toWalletId",
    "destination_wallet_id",
    "destinationWalletId",
  ]);
  const walletId = firstText(raw, ["wallet_id", "walletId"]);
  const relatedWalletId = firstText(raw, ["related_wallet_id", "relatedWalletId"]);

  const isTransferIn = type.includes("transfer_in");
  const isTransferOut = type.includes("transfer_out");
  const fromWalletId =
    explicitFrom || (isTransferIn ? relatedWalletId : isTransferOut ? walletId : "");
  const toWalletId =
    explicitTo || (isTransferIn ? walletId : isTransferOut ? relatedWalletId : "");

  const looksTransferBacked = Boolean(
    transferGroupId &&
      (isTransferIn ||
        isTransferOut ||
        type.includes("transfer") ||
        explicitFrom ||
        explicitTo)
  );

  if (!looksTransferBacked) return null;

  return {
    transferGroupId,
    fromWalletId,
    toWalletId,
    notes: String(raw?.notes || raw?.note || raw?.description || "").trim(),
    createdAt:
      raw?.created_at ||
      raw?.createdAt ||
      raw?.date ||
      raw?.transaction_date ||
      raw?.transactionDate ||
      new Date().toISOString(),
  };
}

function buildEmergencyAllocationRemovalPayload(emergencyFund, transaction) {
  const raw = transaction?.raw || transaction || {};
  const amount = Math.abs(
    toMoneyNumber(raw?.amount ?? transaction?.amount ?? transaction?.signedAmount ?? 0)
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Emergency Fund allocation amount is invalid.");
  }

  const activityId = getEmergencyActivityId(transaction);
  const currentEmergencyAmount = getEmergencyProtectedAmount(emergencyFund);
  const nextSaved = Math.max(currentEmergencyAmount - amount, 0);
  const primaryActivity =
    EMERGENCY_ACTIVITY_KEYS.map((key) => emergencyFund?.[key]).find(Array.isArray) || [];
  const nextActivityLogs = EMERGENCY_ACTIVITY_KEYS.reduce((acc, key) => {
    const source = Array.isArray(emergencyFund?.[key]) ? emergencyFund[key] : primaryActivity;
    acc[key] = removeEmergencyAllocationActivity(source, activityId, amount);
    return acc;
  }, {});
  const currentLastTopUp = Math.abs(
    toMoneyNumber(emergencyFund?.lastTopUpAmount ?? emergencyFund?.last_top_up_amount ?? 0)
  );
  const deletedLastTopUp = currentLastTopUp === amount;
  const now = new Date().toISOString();

  return {
    amount,
    activityId,
    nextSaved,
    payload: {
      ...(emergencyFund || {}),
      savedAmount: nextSaved,
      saved_amount: nextSaved,
      currentAmount: nextSaved,
      current_amount: nextSaved,
      amount: nextSaved,
      balance: nextSaved,
      moneyLeft: nextSaved,
      protectedBalance: nextSaved,
      protected_balance: nextSaved,
      reserveBalance: nextSaved,
      reserve_balance: nextSaved,
      ...nextActivityLogs,
      lastTopUpAmount: deletedLastTopUp
        ? null
        : emergencyFund?.lastTopUpAmount ?? emergencyFund?.last_top_up_amount ?? null,
      last_top_up_amount: deletedLastTopUp
        ? null
        : emergencyFund?.last_top_up_amount ?? emergencyFund?.lastTopUpAmount ?? null,
      updatedAt: now,
      updated_at: now,
    },
  };
}

function withSharedWalletSemantics(financeData = {}) {
  const sourceWallets = Array.isArray(financeData?.wallets) ? financeData.wallets : [];
  const savingsGoals = Array.isArray(financeData?.savingsGoals) ? financeData.savingsGoals : [];
  const emergencyFund = financeData?.emergencyFund || null;

  const wallets = syncWalletProtectedAllocations({
    rows: sourceWallets,
    allWallets: sourceWallets,
    emergencyFund,
    savingsGoals,
  });

  const totalEmergencyProtected = wallets.reduce(
    (sum, wallet) => sum + Number(wallet?.emergencyProtectedAmount || 0),
    0
  );
  const totalSavingsProtected = wallets.reduce(
    (sum, wallet) => sum + Number(wallet?.savingsProtectedAmount || 0),
    0
  );
  const totalSpendableWalletBalance = getTotalWalletSpendableBalance({
    wallets: sourceWallets,
    emergencyFund,
    savingsGoals,
  });

  const baseDeleteEmergencyFundAllocation = financeData?.deleteEmergencyFundAllocation;
  const deleteEmergencyFundAllocation = async (transaction) => {
    const raw = transaction?.raw || transaction || {};
    const transferBacking = getEmergencyTransferBacking(transaction);
    const activitySource = String(raw?.__activitySource || "").trim().toLowerCase();
    const activityOnly = activitySource === "emergency_fund";

    if (!transferBacking && !activityOnly) {
      if (typeof baseDeleteEmergencyFundAllocation !== "function") {
        throw new Error("Emergency Fund allocation delete handler is not available.");
      }
      return baseDeleteEmergencyFundAllocation(transaction);
    }

    if (!emergencyFund) {
      throw new Error("Emergency Fund record is unavailable, so this allocation cannot be deleted safely.");
    }

    if (typeof financeData?.updateEmergencyFund !== "function") {
      throw new Error("Emergency Fund update handler is not available.");
    }

    const removal = buildEmergencyAllocationRemovalPayload(emergencyFund, transaction);

    if (activityOnly) {
      await financeData.updateEmergencyFund(removal.payload);
      return {
        deletedActivityId: removal.activityId || firstText(raw, ["id"]),
        reversedEmergencyAmount: removal.amount,
        nextEmergencySaved: removal.nextSaved,
        backing: "classification_only",
      };
    }

    if (!transferBacking?.fromWalletId || !transferBacking?.toWalletId) {
      throw new Error(
        "This Emergency Fund transfer cannot be deleted because its source or destination wallet could not be resolved."
      );
    }

    if (typeof financeData?.deleteTransfer !== "function") {
      throw new Error("Transfer deletion is not available.");
    }

    let transferDeleted = false;

    try {
      await financeData.deleteTransfer(transferBacking.transferGroupId);
      transferDeleted = true;
      await financeData.updateEmergencyFund(removal.payload);

      return {
        deletedTransferId: transferBacking.transferGroupId,
        reversedEmergencyAmount: removal.amount,
        nextEmergencySaved: removal.nextSaved,
        backing: "transfer",
      };
    } catch (error) {
      if (transferDeleted && typeof financeData?.transferBetweenWallets === "function") {
        try {
          await financeData.transferBetweenWallets({
            id: transferBacking.transferGroupId,
            transfer_group_id: transferBacking.transferGroupId,
            from_wallet_id: transferBacking.fromWalletId,
            to_wallet_id: transferBacking.toWalletId,
            amount: removal.amount,
            notes:
              transferBacking.notes ||
              "Emergency Fund Allocation restored after delete rollback.",
            date: transferBacking.createdAt,
            created_at: transferBacking.createdAt,
            source_type: "emergency_fund_allocation",
            category: "Emergency Fund Allocation",
            planning_status: "planned",
          });
        } catch (rollbackError) {
          console.error("Unable to roll back Emergency Fund transfer deletion:", rollbackError);
          throw new Error(
            "CLARA could not finish deleting this Emergency Fund allocation and could not restore its wallet transfer automatically. Refresh and review both wallets before making another change."
          );
        }
      }

      throw error;
    }
  };

  return {
    ...financeData,
    wallets,
    totalEmergencyProtected,
    totalSavingsProtected,
    totalSpendableWalletBalance,
    deleteEmergencyFundAllocation,
  };
}

export function useFinancialData(user) {
  const financeData = useFinancialDataBaseNamed(user);

  return useMemo(
    () => withSharedWalletSemantics(financeData),
    [financeData]
  );
}

export default function useFinancialDataDefault(user) {
  const financeData = useFinancialDataBase(user);

  return useMemo(
    () => withSharedWalletSemantics(financeData),
    [financeData]
  );
}
