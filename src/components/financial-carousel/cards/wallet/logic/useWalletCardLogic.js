import { useMemo, useState } from "react";
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
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/[₱,\s]/g, ""));
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
