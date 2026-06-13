import { useEffect, useMemo, useRef } from "react";

const REFRESH_EVENTS = ["clara-wallets-updated", "clara-finance-updated"];

const toAmount = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const firstText = (source, keys = []) => {
  for (const key of keys) {
    if (hasValue(source?.[key])) return String(source[key]).trim();
  }
  return "";
};

const getAllocationId = (record = {}) =>
  firstText(record, [
    "emergency_fund_transaction_id",
    "emergencyFundTransactionId",
    "emergency_fund_id",
    "emergencyFundId",
    "id",
  ]);

const getRecordText = (record = {}) =>
  [
    record?.title,
    record?.name,
    record?.category,
    record?.budget_category,
    record?.budgetCategory,
    record?.reason,
    record?.notes,
    record?.note,
    record?.description,
    record?.type,
    record?.source_type,
    record?.sourceType,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

const isEmergencyAllocationExpense = (expense = {}) => {
  if (expense?.deletedAt || expense?.deleted_at) return false;
  const body = getRecordText(expense);

  return Boolean(
    firstText(expense, [
      "emergency_fund_transaction_id",
      "emergencyFundTransactionId",
      "emergency_fund_id",
      "emergencyFundId",
    ]) ||
      body.includes("emergency fund allocation") ||
      body.includes("moved to emergency fund") ||
      cleanText(expense?.source_type || expense?.sourceType).includes("emergency fund allocation") ||
      cleanText(expense?.type).includes("emergency fund allocation")
  );
};

const isAllocationActivity = (activity = {}) => {
  const kind = cleanText(activity?.type);
  const body = getRecordText(activity);

  if (
    kind.includes("use") ||
    kind.includes("withdraw") ||
    kind.includes("expense") ||
    kind.includes("correction") ||
    body.includes("emergency fund used")
  ) {
    return false;
  }

  return Boolean(
    kind.includes("allocation") ||
      body.includes("emergency fund allocation") ||
      body.includes("moved to emergency fund") ||
      body.includes("stored in")
  );
};

const getActivityRows = (emergencyFund = {}) => {
  const sources = [
    emergencyFund?.emergencyActivityLog,
    emergencyFund?.emergency_activity_log,
    emergencyFund?.activityLog,
    emergencyFund?.activity_log,
    emergencyFund?.usageLog,
    emergencyFund?.usage_log,
  ];
  const seen = new Set();
  const rows = [];

  sources.forEach((source) => {
    if (!Array.isArray(source)) return;
    source.filter(Boolean).forEach((activity) => {
      const key =
        getAllocationId(activity) ||
        `${activity?.type || "activity"}-${activity?.createdAt || activity?.created_at || activity?.date || ""}-${activity?.amount || 0}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(activity);
    });
  });

  return rows;
};

const getEmergencyStorageWalletId = (emergencyFund = {}) =>
  firstText(emergencyFund, [
    "storageWalletId",
    "storage_wallet_id",
    "linkedWalletId",
    "linked_wallet_id",
    "reserveWalletId",
    "reserve_wallet_id",
    "walletId",
    "wallet_id",
  ]);

const findMatchingActivity = (expense = {}, activities = []) => {
  const id = getAllocationId(expense);
  const amount = Math.abs(toAmount(expense?.amount));

  if (id) {
    const exact = activities.find((activity) => getAllocationId(activity) === id);
    if (exact) return exact;
  }

  return (
    activities.find(
      (activity) =>
        isAllocationActivity(activity) &&
        Math.abs(toAmount(activity?.amount ?? activity?.value ?? activity?.total)) === amount
    ) || null
  );
};

const transferExists = (transfers = [], id = "") => {
  if (!id) return false;

  return transfers.some((transfer) => {
    if (transfer?.deletedAt || transfer?.deleted_at) return false;
    return [
      transfer?.emergency_fund_transaction_id,
      transfer?.emergencyFundTransactionId,
      transfer?.transfer_group_id,
      transfer?.transferGroupId,
      transfer?.id,
    ]
      .filter(hasValue)
      .map((value) => String(value).trim())
      .includes(id);
  });
};

const broadcastFinanceRefresh = () => {
  if (typeof window === "undefined") return;
  REFRESH_EVENTS.forEach((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { reason: "emergency-fund-allocation-sync" } }));
  });
};

// Data integrity rule:
// This hook reconciles legacy Emergency Fund Allocation expense records into protected wallet movement.
// It must be guarded to avoid duplicate transfers, repeated deletes, or refresh loops.
export function useEmergencyFundAllocationSync({
  user,
  expenses = [],
  transfers = [],
  emergencyFund,
  transferBetweenWallets,
  deleteExpense,
  refreshData,
  enabled = true,
}) {
  const syncingRef = useRef(false);
  const processedIdsRef = useRef(new Set());

  const emergencyAllocationExpenses = useMemo(
    () => (Array.isArray(expenses) ? expenses.filter(isEmergencyAllocationExpense) : []),
    [expenses]
  );

  const allocationActivities = useMemo(
    () => getActivityRows(emergencyFund).filter(isAllocationActivity),
    [emergencyFund]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    if (!user?.id && !user?.email) return undefined;
    if (!Array.isArray(expenses)) return undefined;
    if (!emergencyFund) return undefined;
    if (syncingRef.current) return undefined;
    if (!emergencyAllocationExpenses.length) return undefined;
    if (!allocationActivities.length) return undefined;
    if (typeof deleteExpense !== "function") return undefined;

    let cancelled = false;

    const syncProtectedMovement = async () => {
      syncingRef.current = true;
      let migrated = false;

      try {
        for (const expense of emergencyAllocationExpenses) {
          if (cancelled) return;

          const activity = findMatchingActivity(expense, allocationActivities);
          if (!activity) continue;

          const id = getAllocationId(activity) || getAllocationId(expense);
          const expenseId = firstText(expense, ["id", "expense_id", "expenseId", "local_id", "localId"]);
          const processingKey = id || expenseId;

          if (!processingKey || !expenseId || processedIdsRef.current.has(processingKey)) continue;

          const amount = Math.abs(toAmount(activity?.amount ?? activity?.value ?? activity?.total ?? expense?.amount));
          const fromWalletId =
            firstText(activity, ["sourceWalletId", "source_wallet_id", "fromWalletId", "from_wallet_id"]) ||
            firstText(expense, ["wallet_id", "walletId"]);
          const toWalletId =
            firstText(activity, [
              "storageWalletId",
              "storage_wallet_id",
              "reserveWalletId",
              "reserve_wallet_id",
              "linkedWalletId",
              "linked_wallet_id",
            ]) || getEmergencyStorageWalletId(emergencyFund);
          const fromWalletName = firstText(activity, ["sourceWalletName", "source_wallet_name"]) || "Source wallet";
          const toWalletName =
            firstText(activity, [
              "storageWalletName",
              "storage_wallet_name",
              "reserveWalletName",
              "reserve_wallet_name",
              "linkedWalletName",
              "linked_wallet_name",
            ]) || "Emergency Fund wallet";
          const createdAt = activity?.created_at || activity?.createdAt || expense?.created_at || expense?.date || new Date().toISOString();

          try {
            if (
              amount > 0 &&
              fromWalletId &&
              toWalletId &&
              fromWalletId !== toWalletId &&
              typeof transferBetweenWallets === "function" &&
              !transferExists(transfers, id)
            ) {
              await transferBetweenWallets({
                id: id || undefined,
                transfer_group_id: id || undefined,
                from_wallet_id: fromWalletId,
                to_wallet_id: toWalletId,
                amount,
                notes: `Emergency Fund Allocation. From ${fromWalletName}; stored in ${toWalletName}.`,
                date: createdAt,
                created_at: createdAt,
                updated_at: new Date().toISOString(),
                emergency_fund_transaction_id: id || undefined,
                emergencyFundTransactionId: id || undefined,
                source_type: "emergency_fund_allocation",
                category: "Emergency Fund Allocation",
                planning_status: "planned",
              });
            }

            await deleteExpense(expenseId);
            processedIdsRef.current.add(processingKey);
            migrated = true;
          } catch (error) {
            console.error("Unable to sync Emergency Fund protected movement:", error);
          }
        }

        if (!cancelled && migrated) {
          await refreshData?.();
          broadcastFinanceRefresh();
        }
      } finally {
        syncingRef.current = false;
      }
    };

    syncProtectedMovement();

    return () => {
      cancelled = true;
    };
  }, [
    allocationActivities,
    deleteExpense,
    emergencyAllocationExpenses,
    emergencyFund,
    enabled,
    expenses,
    refreshData,
    transferBetweenWallets,
    transfers,
    user?.email,
    user?.id,
  ]);
}

export default useEmergencyFundAllocationSync;
