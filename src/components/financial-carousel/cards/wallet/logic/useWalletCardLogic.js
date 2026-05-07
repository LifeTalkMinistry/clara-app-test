import { useMemo, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
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

export default function useWalletCardLogic({
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  expanded = false,
  onEditWallet,
} = {}) {
  const { user } = useUserRole();
  const { updateWallet, refreshData } = useFinancialData(user);
  const [editingWallet, setEditingWallet] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", type: "cash" });
  const [isSavingWalletEdit, setIsSavingWalletEdit] = useState(false);

  const activeWallets = useMemo(
    () => (Array.isArray(wallets) ? wallets.filter((wallet) => !wallet?.is_archived) : []),
    [wallets]
  );

  const topWallet = useMemo(() => getTopWallet(activeWallets), [activeWallets]);
  const status = getWalletStatus(activeWallets.length, walletMoney);
  const message = getWalletMessage(activeWallets.length);
  const expandedMessage = getExpandedWalletMessage(topWallet, activeWallets.length);

  const visibleWallets = useMemo(
    () => (expanded ? activeWallets : activeWallets.slice(0, 2)),
    [activeWallets, expanded]
  );

  const visibleTransactions = useMemo(
    () =>
      expanded
        ? walletPreviewTransactions
        : walletPreviewTransactions.slice(0, 2),
    [walletPreviewTransactions, expanded]
  );

  const openEditWallet = (wallet) => {
    if (!wallet) return;
    onEditWallet?.(wallet);
    setEditingWallet(wallet);
    setEditForm({
      name: wallet?.name || wallet?.wallet_name || "",
      type: normalizeWalletType(wallet?.type || "cash"),
    });
  };

  const closeEditWallet = () => {
    if (isSavingWalletEdit) return;
    setEditingWallet(null);
    setEditForm({ name: "", type: "cash" });
  };

  const handleSaveWalletEdit = async () => {
    if (!editingWallet?.id) return;

    const nextName = String(editForm.name || "").trim();
    if (!nextName) {
      alert("Please enter a wallet name.");
      return;
    }

    if (typeof updateWallet !== "function") {
      alert("Wallet editing is not available yet.");
      return;
    }

    try {
      setIsSavingWalletEdit(true);
      const nextType = normalizeWalletType(editForm.type || editingWallet?.type || "custom");

      await updateWallet(editingWallet.id, {
        name: nextName,
        wallet_name: nextName,
        type: nextType,
        icon: getWalletIcon(nextType, editingWallet?.icon || "💰"),
        updated_at: new Date().toISOString(),
      });

      await refreshData?.();
      closeEditWallet();
    } catch (error) {
      alert(error?.message || "Failed to update wallet.");
    } finally {
      setIsSavingWalletEdit(false);
    }
  };

  return {
    editingWallet,
    editForm,
    setEditForm,
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
