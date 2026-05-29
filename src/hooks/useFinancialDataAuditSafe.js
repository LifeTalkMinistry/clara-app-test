import baseUseFinancialData, { CLARA_DEMO_LOCAL_USER_ID } from "./useFinancialData.js";

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstText = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return String(value).trim();
  }

  return "";
};

const firstAmount = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return toNumber(value);
  }

  return 0;
};

const getWalletId = (wallet = {}) =>
  String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || "").trim();

const getWalletName = (wallet = {}) =>
  String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "").trim();

const getEmergencyAmount = (emergencyFund = {}) =>
  firstAmount(emergencyFund, [
    "protectedBalance",
    "protected_balance",
    "reserveBalance",
    "reserve_balance",
    "savedAmount",
    "saved_amount",
    "currentAmount",
    "current_amount",
    "amount",
    "balance",
    "moneyLeft",
  ]);

const getEmergencyLinkedWalletId = (emergencyFund = {}) =>
  firstText(emergencyFund, [
    "linkedWalletId",
    "linked_wallet_id",
    "reserveWalletId",
    "reserve_wallet_id",
    "sourceWalletId",
    "source_wallet_id",
    "walletId",
    "wallet_id",
  ]);

const getEmergencyLinkedWalletName = (emergencyFund = {}) =>
  firstText(emergencyFund, [
    "linkedWalletName",
    "linked_wallet_name",
    "reserveWalletName",
    "reserve_wallet_name",
    "sourceWalletName",
    "source_wallet_name",
    "walletName",
    "wallet_name",
  ]);

const getEmergencyActivity = (emergencyFund = {}) => {
  const source =
    emergencyFund?.emergencyActivityLog ||
    emergencyFund?.emergency_activity_log ||
    emergencyFund?.activityLog ||
    emergencyFund?.activity_log ||
    emergencyFund?.usageLog ||
    emergencyFund?.usage_log ||
    [];

  return Array.isArray(source) ? source.filter(Boolean) : [];
};

const isEmergencySourceMissing = (emergencyFund, wallets = []) => {
  const storedAmount = getEmergencyAmount(emergencyFund);
  if (storedAmount <= 0) return false;

  const safeWallets = Array.isArray(wallets)
    ? wallets.filter((wallet) => !wallet?.deletedAt && !wallet?.deleted_at)
    : [];

  const linkedWalletId = getEmergencyLinkedWalletId(emergencyFund);
  const linkedWalletName = getEmergencyLinkedWalletName(emergencyFund);
  const hasLinkedWalletReference = Boolean(linkedWalletId || linkedWalletName);

  const linkedWallet = safeWallets.find((wallet) => {
    const walletId = getWalletId(wallet);
    const walletName = getWalletName(wallet);

    return (
      (linkedWalletId && walletId === linkedWalletId) ||
      (!linkedWalletId && linkedWalletName && walletName === linkedWalletName)
    );
  });

  return !safeWallets.length || !hasLinkedWalletReference || !linkedWallet;
};

const makeAuditSafeEmergencyFund = (emergencyFund, wallets = []) => {
  if (!emergencyFund || !isEmergencySourceMissing(emergencyFund, wallets)) {
    return emergencyFund || null;
  }

  const auditActivity = getEmergencyActivity(emergencyFund).map((item) => ({
    ...item,
    auditOnly: true,
    audit_only: true,
    inactive: true,
    inactive_reason: "source_wallet_removed",
  }));

  return {
    ...emergencyFund,
    effectiveEmergencyAmount: 0,
    effective_emergency_amount: 0,
    effectiveProtectedAmount: 0,
    effective_protected_amount: 0,
    effectiveMonthsCovered: 0,
    effective_months_covered: 0,
    sourceWalletMissing: true,
    source_wallet_missing: true,
    sourceWalletRemoved: true,
    source_wallet_removed: true,
    status: "Needs wallet",
    statusLabel: "Needs wallet",
    status_label: "Needs wallet",
    displayTitle: "Source wallet removed",
    display_title: "Source wallet removed",
    displayMessage: "Relink Emergency Fund to continue",
    display_message: "Relink Emergency Fund to continue",
    auditOnlyEmergencyActivityLog: auditActivity,
    audit_only_emergency_activity_log: auditActivity,

    // Hotfix: the current card UI renders activity amounts as active green deposits.
    // Until the activity row renderer has a dedicated audit-only layout, keep the
    // historical rows in audit-only fields and remove them from the active card log.
    emergencyActivityLog: [],
    emergency_activity_log: [],
    activityLog: [],
    activity_log: [],
    usageLog: [],
    usage_log: [],
  };
};

export default function useFinancialDataAuditSafe(user) {
  const data = baseUseFinancialData(user);
  const emergencyFund = makeAuditSafeEmergencyFund(data?.emergencyFund, data?.wallets);

  return {
    ...data,
    emergencyFund,
  };
}

export { CLARA_DEMO_LOCAL_USER_ID };
export { useFinancialDataAuditSafe as useFinancialData };
