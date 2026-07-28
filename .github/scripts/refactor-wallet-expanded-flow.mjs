import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resolvePath = (file) => path.join(root, file);
const read = (file) => fs.readFileSync(resolvePath(file), "utf8");
const write = (file, content) => fs.writeFileSync(resolvePath(file), content.replace(/^\n/, ""));

function replaceRequired(file, source, target, label) {
  const content = read(file);
  if (content.includes(target)) return;
  if (!content.includes(source)) {
    throw new Error(`Missing patch anchor (${label}) in ${file}`);
  }
  write(file, content.replace(source, target));
}

write(
  "src/components/financial-carousel/cards/wallet/ui/WalletCardContentSynced.jsx",
  `import { useMemo } from "react";
import WalletCardContent from "@/components/financial-carousel/cards/wallet/ui/WalletCardContent";

function toNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number = typeof value === "number" ? value : Number(String(value).replace(/[₱,\\s]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function firstValue(source, keys = [], fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function getEmergencyAmount(emergencyFund) {
  return toNumber(
    firstValue(
      emergencyFund,
      [
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
      ],
      0
    )
  );
}

function getEmergencyStorageWalletId(emergencyFund) {
  return String(
    firstValue(
      emergencyFund,
      [
        "storageWalletId",
        "storage_wallet_id",
        "linkedWalletId",
        "linked_wallet_id",
        "reserveWalletId",
        "reserve_wallet_id",
        "walletId",
        "wallet_id",
      ],
      ""
    ) || ""
  ).trim();
}

function getEmergencyStorageWalletName(emergencyFund) {
  return String(
    firstValue(
      emergencyFund,
      [
        "storageWalletName",
        "storage_wallet_name",
        "linkedWalletName",
        "linked_wallet_name",
        "reserveWalletName",
        "reserve_wallet_name",
        "walletName",
        "wallet_name",
      ],
      ""
    ) || ""
  ).trim();
}

function getWalletId(wallet) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || "").trim();
}

function getWalletName(wallet) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "").trim();
}

function getWalletBalance(wallet) {
  return toNumber(
    wallet?.walletBalance,
    wallet?.balance,
    wallet?.derived_balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.starting_balance
  );
}

function isActiveWallet(wallet) {
  return Boolean(
    wallet &&
      getWalletId(wallet) &&
      !wallet?.is_archived &&
      !wallet?.isArchived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

function isActiveGoal(goal) {
  return Boolean(goal && !goal?.deletedAt && !goal?.deleted_at && !goal?.is_archived && !goal?.isArchived);
}

function getGoalWalletId(goal) {
  return String(
    goal?.wallet_id ||
      goal?.walletId ||
      goal?.savedInWalletId ||
      goal?.saved_in_wallet_id ||
      goal?.storageWalletId ||
      goal?.storage_wallet_id ||
      goal?.linkedWalletId ||
      goal?.linked_wallet_id ||
      ""
  ).trim();
}

function getGoalSavedAmount(goal) {
  return toNumber(
    goal?.saved_amount,
    goal?.savedAmount,
    goal?.current_saved_amount,
    goal?.currentSavedAmount,
    goal?.current_amount,
    goal?.currentAmount,
    goal?.saved,
    goal?.amount_saved,
    goal?.amountSaved,
    goal?.amount,
    goal?.balance
  );
}

function getSavingsGoalStatsForWallet(wallet, savingsGoals = []) {
  const walletId = getWalletId(wallet);
  if (!walletId) return { amount: 0, count: 0 };

  const assignedGoals = (Array.isArray(savingsGoals) ? savingsGoals : [])
    .filter(isActiveGoal)
    .filter((goal) => getGoalWalletId(goal) === walletId);

  return {
    amount: assignedGoals.reduce((sum, goal) => sum + getGoalSavedAmount(goal), 0),
    count: assignedGoals.length,
  };
}

export function syncProtectedAllocations({ rows = [], allWallets = [], emergencyFund = null, savingsGoals = [] }) {
  const activeWallets = (Array.isArray(allWallets) ? allWallets : []).filter(isActiveWallet);
  const emergencyAmount = getEmergencyAmount(emergencyFund);
  const storageWalletId = getEmergencyStorageWalletId(emergencyFund);
  const storageWalletName = getEmergencyStorageWalletName(emergencyFund);
  const emergencyWallet =
    activeWallets.find((wallet) => getWalletId(wallet) === storageWalletId) ||
    (!storageWalletId && storageWalletName
      ? activeWallets.find((wallet) => getWalletName(wallet) === storageWalletName)
      : null);
  const emergencyWalletId = emergencyWallet ? getWalletId(emergencyWallet) : "";
  const emergencyWalletName = emergencyWallet ? getWalletName(emergencyWallet) : "";

  return (Array.isArray(rows) ? rows : []).map((wallet) => {
    const walletId = getWalletId(wallet);
    const walletName = getWalletName(wallet);
    const walletBalance = getWalletBalance(wallet);
    const isEmergencyStorageWallet =
      emergencyAmount > 0 &&
      Boolean(emergencyWallet) &&
      (walletId === emergencyWalletId || (!walletId && emergencyWalletName && walletName === emergencyWalletName));
    const emergencyProtectedAmount = isEmergencyStorageWallet
      ? Math.min(emergencyAmount, Math.max(walletBalance, 0))
      : 0;
    const savingsGoalStats = getSavingsGoalStatsForWallet(wallet, savingsGoals);
    const savingsProtectedAmount = Math.min(
      savingsGoalStats.amount,
      Math.max(walletBalance - emergencyProtectedAmount, 0)
    );
    const totalProtectedAmount = emergencyProtectedAmount + savingsProtectedAmount;
    const spendableBalance = Math.max(walletBalance - totalProtectedAmount, 0);

    return {
      ...wallet,
      emergencyProtectedAmount,
      emergency_protected_amount: emergencyProtectedAmount,
      protectedEmergencyAmount: emergencyProtectedAmount,
      protected_emergency_amount: emergencyProtectedAmount,
      savingsProtectedAmount,
      savings_protected_amount: savingsProtectedAmount,
      protectedSavingsAmount: savingsProtectedAmount,
      protected_savings_amount: savingsProtectedAmount,
      savingsGoalCount: savingsGoalStats.count,
      savings_goal_count: savingsGoalStats.count,
      totalProtectedAmount,
      total_protected_amount: totalProtectedAmount,
      spendableBalance,
      spendable_balance: spendableBalance,
      walletSpendableBalance: spendableBalance,
      wallet_spendable_balance: spendableBalance,
      hasEmergencyFundAllocation: emergencyProtectedAmount > 0,
      has_emergency_fund_allocation: emergencyProtectedAmount > 0,
      hasSavingsGoalAllocation: savingsGoalStats.count > 0,
      has_savings_goal_allocation: savingsGoalStats.count > 0,
      emergencyFundLinkedWalletId: emergencyProtectedAmount > 0 ? emergencyWalletId : null,
      emergency_fund_linked_wallet_id: emergencyProtectedAmount > 0 ? emergencyWalletId : null,
      emergencyFundLabel: emergencyProtectedAmount > 0 ? "Includes Emergency Fund" : "",
      emergency_fund_label: emergencyProtectedAmount > 0 ? "Includes Emergency Fund" : "",
      savingsGoalLabel: savingsGoalStats.count > 0 ? "Includes Savings Goals" : "",
      savings_goal_label: savingsGoalStats.count > 0 ? "Includes Savings Goals" : "",
    };
  });
}

export default function WalletCardContentSynced({ emergencyFund = null, savingsGoals = [], ...props }) {
  const syncedVisibleWallets = useMemo(
    () =>
      syncProtectedAllocations({
        rows: props.visibleWallets,
        allWallets: props.wallets,
        emergencyFund,
        savingsGoals,
      }),
    [props.visibleWallets, props.wallets, emergencyFund, savingsGoals]
  );

  return <WalletCardContent {...props} visibleWallets={syncedVisibleWallets} />;
}
`
);

write(
  "src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js",
  `import { useMemo, useState } from "react";
import { fmt, formatHistoryDate } from "./walletFormatting";
import {
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
  getWalletIcon,
  normalizeWalletType,
  toNumber,
  walletIcons,
  walletTypes,
} from "./walletHelpers";
import {
  getExpandedWalletMessage,
  getTopWallet,
  getWalletMessage,
  getWalletStatus,
} from "./walletCalculations";
import {
  buildWalletProviderPayload,
  getWalletProvider,
  getWalletProviderFromWallet,
} from "./walletProviderRegistry";

export {
  fmt,
  formatHistoryDate,
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
  getWalletIcon,
  normalizeWalletType,
  toNumber,
  walletIcons,
  walletTypes,
};

export const WALLET_BALANCE_TONES = {
  neutral: { name: "Neutral Slate", rgb: "148 163 184" },
  frost: { name: "Frost Blue", rgb: "125 211 252" },
  cyan: { name: "Cyan", rgb: "34 211 238" },
  teal: { name: "Aqua Teal", rgb: "45 212 191" },
  sapphire: { name: "Sapphire", rgb: "96 165 250" },
  violet: { name: "Royal Violet", rgb: "167 139 250" },
  gold: { name: "Premium Gold", rgb: "232 201 122" },
};

export function getWalletBalanceValue(wallet = {}) {
  const values = [
    wallet?.walletBalance,
    wallet?.balance,
    wallet?.derived_balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.starting_balance,
  ];

  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/[₱,\\s]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

export function getWalletBalanceTone({ balance, balanceShare, totalWalletBalance } = {}) {
  const safeBalance = Math.max(Number(balance) || 0, 0);
  const share =
    Number(balanceShare) > 0
      ? Number(balanceShare)
      : Number(totalWalletBalance) > 0
        ? safeBalance / Number(totalWalletBalance)
        : 0;

  if (safeBalance <= 0 || share <= 0) return { ...WALLET_BALANCE_TONES.neutral, share: 0 };
  if (share <= 0.05) return { ...WALLET_BALANCE_TONES.frost, share };
  if (share <= 0.10) return { ...WALLET_BALANCE_TONES.cyan, share };
  if (share <= 0.20) return { ...WALLET_BALANCE_TONES.teal, share };
  if (share <= 0.35) return { ...WALLET_BALANCE_TONES.sapphire, share };
  if (share <= 0.50) return { ...WALLET_BALANCE_TONES.violet, share };
  return { ...WALLET_BALANCE_TONES.gold, share };
}

function getWalletOrderValue(wallet = {}, fallbackIndex = 0) {
  const rawOrder = wallet?.sort_order ?? wallet?.position ?? wallet?.order;
  const parsedOrder = Number(rawOrder);
  return Number.isFinite(parsedOrder) ? parsedOrder : fallbackIndex;
}

function sortWalletsByDisplayOrder(wallets = []) {
  return wallets
    .map((wallet, index) => ({ wallet, index }))
    .filter(
      ({ wallet }) =>
        wallet &&
        !wallet?.is_archived &&
        !wallet?.isArchived &&
        !wallet?.deletedAt &&
        !wallet?.deleted_at
    )
    .sort((a, b) => {
      const orderDifference = getWalletOrderValue(a.wallet, a.index) - getWalletOrderValue(b.wallet, b.index);
      return orderDifference !== 0 ? orderDifference : a.index - b.index;
    })
    .map(({ wallet }) => wallet);
}

function attachWalletBalanceHierarchy(wallets = []) {
  const totalPositiveWalletBalance = wallets.reduce(
    (sum, wallet) => sum + Math.max(getWalletBalanceValue(wallet), 0),
    0
  );

  return wallets.map((wallet) => {
    const walletBalance = getWalletBalanceValue(wallet);
    const positiveBalance = Math.max(walletBalance, 0);
    const balanceShare = totalPositiveWalletBalance > 0 ? positiveBalance / totalPositiveWalletBalance : 0;
    return { ...wallet, walletBalance, totalWalletBalance: totalPositiveWalletBalance, balanceShare };
  });
}

export default function useWalletCardLogic({
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  expanded = false,
  onUpdateWallet,
} = {}) {
  const [editingWallet, setEditingWallet] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", providerKey: "cash" });
  const [editError, setEditError] = useState("");
  const [isSavingWalletEdit, setIsSavingWalletEdit] = useState(false);

  const activeWallets = useMemo(() => {
    const orderedWallets = Array.isArray(wallets) ? sortWalletsByDisplayOrder(wallets) : [];
    return attachWalletBalanceHierarchy(orderedWallets);
  }, [wallets]);

  const topWallet = useMemo(() => getTopWallet(activeWallets), [activeWallets]);
  const status = getWalletStatus(activeWallets.length, walletMoney);
  const message = getWalletMessage(activeWallets.length);
  const expandedMessage = getExpandedWalletMessage(topWallet, activeWallets.length);
  const visibleWallets = useMemo(
    () => (expanded ? activeWallets : activeWallets.slice(0, 2)),
    [activeWallets, expanded]
  );
  const visibleTransactions = useMemo(
    () => (expanded ? walletPreviewTransactions : walletPreviewTransactions.slice(0, 2)),
    [walletPreviewTransactions, expanded]
  );

  const openEditWallet = (wallet) => {
    if (!wallet) return;
    const provider = getWalletProviderFromWallet(wallet);
    setEditingWallet(wallet);
    setEditError("");
    setEditForm({
      name: wallet?.name || wallet?.wallet_name || "",
      providerKey: provider?.key || "cash",
    });
  };

  const closeEditWallet = () => {
    if (isSavingWalletEdit) return;
    setEditingWallet(null);
    setEditError("");
    setEditForm({ name: "", type: "cash" });
  };

  const handleSaveWalletEdit = async () => {
    if (!editingWallet?.id) return;
    const nextName = String(editForm.name || "").trim();
    if (!nextName) {
      setEditError("Wallet name is required.");
      return;
    }
    if (typeof onUpdateWallet !== "function") {
      setEditError("Wallet editing is temporarily unavailable.");
      return;
    }

    try {
      setIsSavingWalletEdit(true);
      setEditError("");
      const provider = getWalletProvider(editForm.providerKey, editingWallet?.type || "cash");
      await onUpdateWallet(editingWallet.id, {
        name: nextName,
        wallet_name: nextName,
        type: provider.walletType,
        ...buildWalletProviderPayload(provider.key),
        icon: provider.iconText || getWalletIcon(provider.walletType, editingWallet?.icon || "💰"),
        updated_at: new Date().toISOString(),
      });
      setEditingWallet(null);
      setEditForm({ name: "", type: "cash" });
    } catch (error) {
      setEditError(error?.message || "Failed to update wallet.");
    } finally {
      setIsSavingWalletEdit(false);
    }
  };

  return {
    editingWallet,
    editForm,
    setEditForm,
    editError,
    setEditError,
    isSavingWalletEdit,
    activeWallets,
    topWallet,
    status,
    message,
    expandedMessage,
    visibleWallets,
    visibleTransactions,
    openEditWallet,
    closeEditWallet,
    handleSaveWalletEdit,
  };
}
`
);

write(
  "src/components/financial-carousel/cards/wallet/modal/EditWalletModal.jsx",
  `import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import WalletProviderPicker from "@/components/financial-carousel/cards/wallet/ui/WalletProviderPicker";
import {
  fmt,
  getWalletBalanceValue,
} from "@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic";
import { getWalletProvider } from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";

export default function EditWalletModal({
  editingWallet,
  editForm,
  setEditForm,
  editError = "",
  setEditError,
  isSavingWalletEdit,
  closeEditWallet,
  handleSaveWalletEdit,
}) {
  if (!editingWallet) return null;

  const currentProvider = getWalletProvider(editForm.providerKey, editingWallet?.type || "cash");
  const currentName = editForm.name.trim() || editingWallet?.name || "Untitled wallet";
  const currentBalance = fmt(getWalletBalanceValue(editingWallet));
  const saveDisabled = isSavingWalletEdit || !editForm.name.trim();

  const modalContent = (
    <div className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen justify-center overflow-hidden bg-black/82 text-white backdrop-blur-xl">
      <div className="relative flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 border-cyan-100/[0.14] bg-[linear-gradient(145deg,rgba(4,14,34,0.99),rgba(5,32,47,0.985)_42%,rgba(24,18,58,0.98)_100%)] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_50px_rgba(34,211,238,0.11),0_0_70px_rgba(16,185,129,0.08)] sm:my-5 sm:h-[calc(100dvh-40px)] sm:max-w-md sm:rounded-[32px] sm:border">
        <div className="pointer-events-none absolute -left-24 -top-28 h-60 w-60 rounded-full bg-cyan-300/[0.12] blur-[74px]" />
        <div className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-emerald-300/[0.09] blur-[82px]" />

        <div className="relative shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+24px)] sm:pt-6">
          <button
            type="button"
            onClick={closeEditWallet}
            disabled={isSavingWalletEdit}
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-50 sm:top-5"
            aria-label="Close edit wallet"
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="pr-12 text-[24px] font-black tracking-[-0.04em] text-white">Edit wallet</h3>
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 py-5 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-5">
            <div
              className="relative overflow-hidden rounded-[28px] border border-cyan-100/[0.14] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.055)_42%,rgba(16,185,129,0.10))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_38px_rgba(0,0,0,0.22)]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.22), 0 0 34px " + currentProvider.accent + "2b" }}
            >
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div
                    className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] border border-white/15 text-[12px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(0,0,0,0.20)]"
                    style={{ background: currentProvider.iconBg, color: currentProvider.iconTextColor }}
                  >
                    {currentProvider.iconText}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/55">Current wallet</p>
                    <p className="mt-1.5 truncate text-lg font-black tracking-[-0.03em] text-white">{currentName}</p>
                    <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70">
                      {currentProvider.label}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Balance</p>
                  <p className="mt-1 text-[15px] font-black tracking-[-0.025em] text-emerald-100">{currentBalance}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Wallet name</p>
              <input
                value={editForm.name}
                onChange={(event) => {
                  setEditForm((prev) => ({ ...prev, name: event.target.value }));
                  if (editError) setEditError?.("");
                }}
                placeholder="e.g. BDO Wallet, GCash, Cash"
                className="h-[52px] w-full rounded-[22px] border border-white/[0.12] bg-white/[0.065] px-4 text-[15px] font-bold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] outline-none placeholder:text-white/32 focus:border-cyan-200/45 focus:bg-white/[0.085] focus:ring-2 focus:ring-cyan-300/15"
              />
              {editError ? (
                <p className="rounded-2xl border border-rose-300/15 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">{editError}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Wallet identity</p>
              <WalletProviderPicker
                compact
                selectedProviderKey={editForm.providerKey}
                disabled={isSavingWalletEdit}
                onSelect={(provider) => {
                  setEditForm((prev) => ({ ...prev, providerKey: provider.key }));
                  if (editError) setEditError?.("");
                }}
              />
            </div>

            <div className="rounded-[24px] border border-emerald-100/[0.13] bg-emerald-300/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-100/15 bg-emerald-300/10 text-emerald-100">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black tracking-[-0.01em] text-white/88">Balance stays unchanged</p>
                    <p className="mt-1 text-[11.5px] leading-5 text-white/48">Use Add Money, Transfer, or transactions to change this wallet’s balance.</p>
                  </div>
                </div>
                <p className="shrink-0 text-right text-[14px] font-black tracking-[-0.025em] text-emerald-100">{currentBalance}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative shrink-0 border-t border-white/[0.08] bg-slate-950/30 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={handleSaveWalletEdit}
              disabled={saveDisabled}
              className="min-h-[54px] w-full rounded-[22px] bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-400 text-sm font-black tracking-[-0.01em] text-slate-950 shadow-[0_16px_36px_rgba(45,212,191,0.22)] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingWalletEdit ? "Saving..." : editForm.name.trim() ? "Save wallet" : "Enter wallet name"}
            </button>
            <button
              type="button"
              onClick={closeEditWallet}
              disabled={isSavingWalletEdit}
              className="h-12 w-full rounded-[20px] border border-white/[0.10] bg-white/[0.045] text-sm font-bold text-white/68 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modalContent;
  return createPortal(modalContent, document.body);
}
`
);

replaceRequired(
  "src/components/WalletCard.jsx",
  `  onEditWallet,\n  onUpdateWallet,\n}) {`,
  `  onEditWallet,\n  onUpdateWallet,\n  emergencyFund = null,\n  savingsGoals = [],\n}) {`,
  "WalletCard finance context props"
);
replaceRequired(
  "src/components/WalletCard.jsx",
  `    editForm,\n    setEditForm,\n    isSavingWalletEdit,`,
  `    editForm,\n    setEditForm,\n    editError,\n    setEditError,\n    isSavingWalletEdit,`,
  "WalletCard edit error state"
);
replaceRequired(
  "src/components/WalletCard.jsx",
  `    onEditWallet,\n    onUpdateWallet,`,
  `    onUpdateWallet,`,
  "remove duplicate edit owner"
);
replaceRequired(
  "src/components/WalletCard.jsx",
  `        openEditWallet={openEditWallet}\n      />`,
  `        openEditWallet={openEditWallet}\n        emergencyFund={emergencyFund}\n        savingsGoals={savingsGoals}\n      />`,
  "WalletCard protected allocation props"
);
replaceRequired(
  "src/components/WalletCard.jsx",
  `        setEditForm={setEditForm}\n        isSavingWalletEdit={isSavingWalletEdit}`,
  `        setEditForm={setEditForm}\n        editError={editError}\n        setEditError={setEditError}\n        isSavingWalletEdit={isSavingWalletEdit}`,
  "WalletCard edit error modal props"
);

replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx",
  `  onUpdateWallet,\n}) {`,
  `  onUpdateWallet,\n  financeCardController = null,\n}) {`,
  "WalletCardView finance controller"
);
replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx",
  `        onEditWallet={onEditWallet}\n        onUpdateWallet={onUpdateWallet}\n      />`,
  `        onEditWallet={onEditWallet}\n        onUpdateWallet={onUpdateWallet}\n        emergencyFund={financeCardController?.emergencyFund || null}\n        savingsGoals={financeCardController?.savingsGoals || []}\n      />`,
  "WalletCardView shared finance data"
);

replaceRequired(
  "src/components/financial-carousel/ui/CarouselItemCard.jsx",
  `        onEditWallet={onEditWallet}\n        onUpdateWallet={financeCardController?.updateWallet}\n      />`,
  `        onEditWallet={onEditWallet}\n        onUpdateWallet={financeCardController?.updateWallet}\n        financeCardController={financeCardController}\n      />`,
  "wallet existing controller handoff"
);

replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletCardContent.jsx",
  `                      index={index}\n                      financeActionLoading={financeActionLoading}`,
  `                      index={index}\n                      walletCount={visibleWallets.length}\n                      financeActionLoading={financeActionLoading}`,
  "wallet list boundary count"
);

replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx",
  `  index,\n  financeActionLoading = false,`,
  `  index,\n  walletCount = 0,\n  financeActionLoading = false,`,
  "WalletListItem count prop"
);
replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx",
  `          <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, -1))} className={actionButton} role='menuitem'>`,
  `          <button type='button' disabled={!walletId || index <= 0} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, -1))} className={actionButton} role='menuitem'>`,
  "disable first wallet move up"
);
replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx",
  `          <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, 1))} className={actionButton} role='menuitem'>`,
  `          <button type='button' disabled={!walletId || index >= walletCount - 1} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, 1))} className={actionButton} role='menuitem'>`,
  "disable last wallet move down"
);
replaceRequired(
  "src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx",
  `          <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onDeleteWallet?.(walletId))}`,
  `          <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onDeleteWallet?.(wallet))}`,
  "delete enriched wallet"
);

replaceRequired(
  "src/components/fresh/main-dashboard/finance-content/useDashboardFinancePreviewState.js",
  `    () => safeWalletTransactions.slice(0, 2),`,
  `    () => safeWalletTransactions.slice(0, 8),`,
  "expanded recent wallet activity"
);

replaceRequired(
  "src/components/financial-carousel/cards/wallet/logic/walletCalculations.js",
  `  return \`${"${topWallet.name || \"Primary wallet\"}"} is your primary wallet and currently holds \${fmt(topWallet.balance || 0)}.\`;`,
  `  const balance = topWallet.walletBalance ?? topWallet.balance ?? topWallet.derived_balance ?? topWallet.current_balance ?? topWallet.wallet_balance ?? 0;\n  return \`${"${topWallet.name || \"Primary wallet\"}"} is your primary wallet and currently holds \${fmt(balance)}.\`;`,
  "primary wallet balance fields"
);

replaceRequired(
  "src/utils/dashboard/dashboardHelpers.js",
  `export const getWalletDisplayBalance = (\n  wallet = {}\n) =>\n  safeNumber(\n    wallet?.balance ??\n      wallet?.amount ??\n      wallet?.wallet_balance ??\n      0\n  );`,
  `export const getWalletDisplayBalance = (\n  wallet = {}\n) =>\n  safeNumber(\n    wallet?.walletBalance ??\n      wallet?.balance ??\n      wallet?.derived_balance ??\n      wallet?.current_balance ??\n      wallet?.wallet_balance ??\n      wallet?.available_balance ??\n      wallet?.amount ??\n      wallet?.starting_balance ??\n      0\n  );\n\nexport const getWalletSpendableBalance = (wallet = {}) => {\n  const protectedAmount = firstValidNumber(\n    wallet?.totalProtectedAmount,\n    wallet?.total_protected_amount,\n    0\n  );\n  const explicitSpendable = [\n    wallet?.spendableBalance,\n    wallet?.spendable_balance,\n    wallet?.walletSpendableBalance,\n    wallet?.wallet_spendable_balance,\n  ].find((value) => value !== undefined && value !== null && value !== \"\");\n\n  if (explicitSpendable !== undefined) return Math.max(safeNumber(explicitSpendable), 0);\n  return Math.max(getWalletDisplayBalance(wallet) - Math.max(protectedAmount, 0), 0);\n};`,
  "wallet spendable helper"
);

replaceRequired(
  "src/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync.js",
  `            !wallet?.isEmergencyReserveWallet &&\n            !wallet?.protected_reserve`,
  `            !wallet?.isEmergencyReserveWallet &&\n            !wallet?.protected_reserve &&\n            !wallet?.is_archived &&\n            !wallet?.isArchived &&\n            !wallet?.deletedAt &&\n            !wallet?.deleted_at`,
  "hide archived wallets from dashboard totals"
);

const handlerFile = "src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js";
replaceRequired(
  handlerFile,
  `  getWalletDisplayBalance,\n  getWalletSortOrder,`,
  `  getWalletDisplayBalance,\n  getWalletSpendableBalance,\n  getWalletSortOrder,`,
  "spendable handler import"
);
replaceRequired(
  handlerFile,
  `} from "@/utils/dashboard/dashboardHelpers";`,
  `} from "@/utils/dashboard/dashboardHelpers";\nimport {\n  buildWalletProviderPayload,\n  getWalletProvider,\n} from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";`,
  "wallet provider handler imports"
);
replaceRequired(
  handlerFile,
  `  const openDeleteWalletModal = useCallback((walletId) => {\n    const wallet = wallets.find((item) => String(item.id) === String(walletId)) || null;\n    setFinanceModal({ type: "delete_wallet", payload: wallet });\n  }, [wallets]);`,
  `  const openDeleteWalletModal = useCallback((walletOrId) => {\n    const wallet =\n      walletOrId && typeof walletOrId === "object"\n        ? walletOrId\n        : wallets.find((item) => String(item.id) === String(walletOrId)) || null;\n    if (!wallet) {\n      showFinanceNotice("Wallet not found.");\n      return;\n    }\n    setFinanceModal({ type: "delete_wallet", payload: wallet });\n  }, [showFinanceNotice, wallets]);`,
  "safe wallet delete modal"
);
replaceRequired(
  handlerFile,
  `      [orderedWallets[fromIndex], orderedWallets[toIndex]] = [\n        orderedWallets[toIndex],\n        orderedWallets[fromIndex],\n      ];\n\n      try {\n        setFinanceActionLoading(true);\n\n        await Promise.all(\n          orderedWallets.map((wallet, index) =>\n            updateWalletData?.(String(wallet.id), { sort_order: index })\n          )\n        );\n\n        await refreshFinanceSection();`,
  `      const fromWallet = orderedWallets[fromIndex];\n      const toWallet = orderedWallets[toIndex];\n      const fromOrder = getWalletSortOrder(fromWallet, fromIndex);\n      const toOrder = getWalletSortOrder(toWallet, toIndex);\n\n      try {\n        setFinanceActionLoading(true);\n        const updatedAt = new Date().toISOString();\n        await Promise.all([\n          updateWalletData?.(String(fromWallet.id), { sort_order: toOrder, updated_at: updatedAt }),\n          updateWalletData?.(String(toWallet.id), { sort_order: fromOrder, updated_at: updatedAt }),\n        ]);\n\n        await refreshFinanceSection();`,
  "two-wallet reorder"
);
replaceRequired(
  handlerFile,
  `  const createWalletInline = useCallback(async () => {\n    const name = normalizeString(financeForm.name);\n    const selectedWalletType = normalizeString(financeForm.type) || "cash";\n    const customWalletType = normalizeString(financeForm.customWalletType);\n    const type =\n      selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;\n    const startingBalance = Number(financeForm.startingBalance);\n\n    if (!name) {\n      showFinanceNotice("Please enter a wallet name.");\n      return;\n    }\n\n    if (!type) {\n      showFinanceNotice("Please enter a wallet type.");\n      return;\n    }`,
  `  const createWalletInline = useCallback(async () => {\n    const selectedWalletType = normalizeString(financeForm.type) || "cash";\n    const provider = getWalletProvider(selectedWalletType, selectedWalletType);\n    const name =\n      normalizeString(financeForm.name) ||\n      (provider.key !== "custom" ? provider.defaultWalletName || provider.label : "");\n    const type = provider.walletType || "custom";\n    const startingBalance = Number(financeForm.startingBalance);\n\n    if (!name) {\n      showFinanceNotice("Please enter a wallet name.");\n      return;\n    }`,
  "provider-aware wallet create validation"
);
replaceRequired(
  handlerFile,
  `        type,\n        balance: startingBalance,`,
  `        type,\n        ...buildWalletProviderPayload(provider.key),\n        icon: provider.iconText || null,\n        balance: startingBalance,`,
  "provider-aware wallet payload"
);
replaceRequired(
  handlerFile,
  `  const deleteWalletInline = useCallback(async () => {\n    const walletId = financeModal?.payload?.id;\n    if (!walletId) return;\n\n    try {\n      setFinanceActionLoading(true);\n      await deleteWalletData?.(walletId);\n\n      await refreshFinanceSection();\n      closeFinanceModal();\n      showFinanceNotice("Wallet deleted.", "success");\n    } catch (error) {\n      showFinanceNotice(error?.message || "Failed to delete wallet.");\n    } finally {\n      setFinanceActionLoading(false);\n    }\n  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice, deleteWalletData]);`,
  `  const deleteWalletInline = useCallback(async () => {\n    const wallet = financeModal?.payload;\n    const walletId = wallet?.id;\n    if (!walletId) return;\n\n    const protectedAmount = firstValidNumber(\n      wallet?.totalProtectedAmount,\n      wallet?.total_protected_amount,\n      0\n    );\n    const balance = getWalletDisplayBalance(wallet);\n\n    if (protectedAmount > 0) {\n      showFinanceNotice("Move the Emergency Fund or Savings Goal allocation before removing this wallet.");\n      return;\n    }\n    if (Math.abs(balance) > 0.000001) {\n      showFinanceNotice("Transfer or clear the wallet balance before removing it.");\n      return;\n    }\n\n    const hasHistory = walletTransactions.some(\n      (transaction) => String(transaction?.wallet_id || transaction?.walletId || "") === String(walletId)\n    );\n\n    try {\n      setFinanceActionLoading(true);\n      if (hasHistory) {\n        await updateWalletData?.(walletId, {\n          is_archived: true,\n          isArchived: true,\n          archived_at: new Date().toISOString(),\n        });\n      } else {\n        await deleteWalletData?.(walletId);\n      }\n\n      await refreshFinanceSection();\n      closeFinanceModal();\n      showFinanceNotice(hasHistory ? "Wallet archived. Its transaction history was preserved." : "Wallet deleted.", "success");\n    } catch (error) {\n      showFinanceNotice(error?.message || "Failed to remove wallet.");\n    } finally {\n      setFinanceActionLoading(false);\n    }\n  }, [\n    closeFinanceModal,\n    deleteWalletData,\n    financeModal?.payload,\n    refreshFinanceSection,\n    showFinanceNotice,\n    updateWalletData,\n    walletTransactions,\n  ]);`,
  "safe wallet deletion"
);
replaceRequired(
  handlerFile,
  `    if (getWalletDisplayBalance(fromWallet) < amount) {\n      showFinanceNotice("Insufficient balance in the source wallet.");`,
  `    if (getWalletSpendableBalance(fromWallet) < amount) {\n      showFinanceNotice("This transfer is higher than the wallet’s spendable balance after protected funds.");`,
  "protect reserved wallet funds"
);

const rendererFile = "src/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer.jsx";
replaceRequired(
  rendererFile,
  `  getWalletDisplayBalance,\n  getBudgetListTitle,`,
  `  getWalletDisplayBalance,\n  getWalletSpendableBalance,\n  getBudgetListTitle,`,
  "renderer spendable import"
);
replaceRequired(
  rendererFile,
  `  const protectedBudgetAmount = useMemo(\n    () => readProtectedBudgetAmount(monthlyBudgetPlan),\n    [monthlyBudgetPlan]\n  );`,
  `  const protectedBudgetAmount = useMemo(\n    () => readProtectedBudgetAmount(monthlyBudgetPlan),\n    [monthlyBudgetPlan]\n  );\n\n  const walletActionAmount = Number(financeForm.amount);\n  const validWalletActionAmount = Number.isFinite(walletActionAmount) && walletActionAmount > 0;\n  const transferSpendableBalance = getWalletSpendableBalance(financeModal.payload);\n  const transferDestinationValid = Boolean(financeForm.destinationWalletId);\n  const transferAmountValid =\n    validWalletActionAmount && walletActionAmount <= transferSpendableBalance;\n  const deleteWalletProtectedAmount = readBudgetMoney(\n    financeModal.payload?.totalProtectedAmount ??\n      financeModal.payload?.total_protected_amount ??\n      0\n  );\n  const deleteWalletBalance = getWalletDisplayBalance(financeModal.payload);\n  const deleteWalletBlocked =\n    deleteWalletProtectedAmount > 0 || Math.abs(deleteWalletBalance) > 0.000001;`,
  "wallet modal validation state"
);
replaceRequired(
  rendererFile,
  `        submitLabel="Delete wallet"\n        loading={financeActionLoading}\n        danger`,
  `        submitLabel="Remove wallet"\n        submitDisabled={deleteWalletBlocked}\n        submitDisabledLabel={deleteWalletProtectedAmount > 0 ? "Protected Funds" : "Clear Balance First"}\n        loading={financeActionLoading}\n        danger`,
  "delete wallet disabled state"
);
replaceRequired(
  rendererFile,
  `        <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">\n          This will remove the selected wallet from the dashboard. Use this only when you are sure.\n        </div>`,
  `        <div className={\`rounded-2xl border p-4 text-sm leading-6 \${deleteWalletBlocked ? "border-amber-300/15 bg-amber-500/10 text-amber-100" : "border-rose-400/15 bg-rose-500/10 text-rose-100"}\`}>\n          {deleteWalletProtectedAmount > 0\n            ? "This wallet contains protected Emergency Fund or Savings Goal money. Move that allocation first."\n            : Math.abs(deleteWalletBalance) > 0.000001\n              ? \`Transfer or clear the remaining \${fmt(deleteWalletBalance)} before removing this wallet.\`\n              : "A wallet with transaction history will be archived so past records remain accurate."}\n        </div>`,
  "delete wallet explanation"
);
replaceRequired(
  rendererFile,
  `        submitLabel="Add money"\n        loading={financeActionLoading}`,
  `        submitLabel="Add money"\n        submitDisabled={!validWalletActionAmount}\n        submitDisabledLabel="Enter Amount"\n        loading={financeActionLoading}`,
  "add money validation"
);
replaceRequired(
  rendererFile,
  `        submitLabel="Transfer"\n        loading={financeActionLoading}`,
  `        submitLabel="Transfer"\n        submitDisabled={!transferDestinationValid || !transferAmountValid}\n        submitDisabledLabel={\n          !transferDestinationValid\n            ? "Choose Wallet"\n            : validWalletActionAmount && walletActionAmount > transferSpendableBalance\n              ? "Protected Funds"\n              : "Enter Amount"\n        }\n        loading={financeActionLoading}`,
  "transfer validation"
);
replaceRequired(
  rendererFile,
  `          helper={\`Available: \${fmt(getWalletDisplayBalance(financeModal.payload))}\`}`,
  `          helper={\`Spendable after protected funds: \${fmt(transferSpendableBalance)}\`}`,
  "transfer spendable helper"
);

const packageFile = "package.json";
replaceRequired(
  packageFile,
  `tests/income-hub-expanded-flow-regression.test.mjs\"`,
  `tests/income-hub-expanded-flow-regression.test.mjs tests/wallet-expanded-flow-regression.test.mjs\"`,
  "wallet regression in npm test"
);

write(
  "tests/wallet-expanded-flow-regression.test.mjs",
  `import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(\`../\${relativePath}\`, import.meta.url), "utf8");

const syncedContent = readSource("src/components/financial-carousel/cards/wallet/ui/WalletCardContentSynced.jsx");
const walletCard = readSource("src/components/WalletCard.jsx");
const walletView = readSource("src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx");
const carouselItem = readSource("src/components/financial-carousel/ui/CarouselItemCard.jsx");
const walletLogic = readSource("src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js");
const editModal = readSource("src/components/financial-carousel/cards/wallet/modal/EditWalletModal.jsx");
const walletListItem = readSource("src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx");
const handlers = readSource("src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js");
const renderer = readSource("src/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer.jsx");
const helpers = readSource("src/utils/dashboard/dashboardHelpers.js");
const stateSync = readSource("src/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync.js");
const previewState = readSource("src/components/fresh/main-dashboard/finance-content/useDashboardFinancePreviewState.js");

test("Wallet card does not create a second finance controller or poll every 900ms", () => {
  assert.equal(syncedContent.includes("useFinancialData"), false);
  assert.equal(syncedContent.includes("setInterval"), false);
  assert.equal(walletView.includes("financeCardController = null"), true);
  assert.equal(carouselItem.includes("financeCardController={financeCardController}"), true);
  assert.equal(walletCard.includes("emergencyFund={emergencyFund}"), true);
});

test("wallet editing preserves provider identity and shows inline errors", () => {
  assert.equal(walletLogic.includes("getWalletProviderFromWallet"), true);
  assert.equal(walletLogic.includes("buildWalletProviderPayload"), true);
  assert.equal(walletLogic.includes("alert("), false);
  assert.equal(editModal.includes("WalletProviderPicker"), true);
  assert.equal(editModal.includes("editError"), true);
});

test("wallet transfers respect spendable balance after protected funds", () => {
  assert.equal(helpers.includes("getWalletSpendableBalance"), true);
  assert.equal(handlers.includes("getWalletSpendableBalance(fromWallet) < amount"), true);
  assert.equal(renderer.includes("Spendable after protected funds"), true);
  assert.equal(renderer.includes("submitDisabled={!transferDestinationValid || !transferAmountValid}"), true);
});

test("wallet removal blocks money loss and preserves transaction history", () => {
  assert.equal(handlers.includes("Transfer or clear the wallet balance before removing it"), true);
  assert.equal(handlers.includes("is_archived: true"), true);
  assert.equal(renderer.includes("submitDisabled={deleteWalletBlocked}"), true);
  assert.equal(walletListItem.includes("onDeleteWallet?.(wallet)"), true);
  assert.equal(stateSync.includes("!wallet?.is_archived"), true);
});

test("wallet reorder touches only the two adjacent wallets", () => {
  assert.equal(handlers.includes("const fromWallet = orderedWallets[fromIndex]"), true);
  assert.equal(handlers.includes("const toWallet = orderedWallets[toIndex]"), true);
  assert.equal(handlers.includes("orderedWallets.map((wallet, index)"), false);
  assert.equal(walletListItem.includes("index <= 0"), true);
  assert.equal(walletListItem.includes("index >= walletCount - 1"), true);
});

test("expanded Wallet activity can show more than the collapsed two-row preview", () => {
  assert.equal(previewState.includes("safeWalletTransactions.slice(0, 8)"), true);
});
`
);
