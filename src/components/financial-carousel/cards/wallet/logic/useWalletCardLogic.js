import { useMemo, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";

export const walletTypes = ["cash", "gcash", "bank", "maya", "credit_card", "other"];

export const walletIcons = {
  cash: "💵",
  gcash: "📱",
  bank: "🏦",
  maya: "💜",
  credit_card: "💳",
  other: "💰",
};

export const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const getHistoryTypeLabel = (type) => {
  switch (String(type || "").toLowerCase()) {
    case "add":
      return "Added Money";
    case "income":
      return "Income";
    case "transfer_in":
      return "Transfer In";
    case "transfer_out":
      return "Transfer Out";
    case "expense":
      return "Expense";
    case "reset":
      return "Reset";
    case "savings_goal":
      return "Savings Goal";
    default:
      return String(type || "Transaction")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export const getHistoryAmountPrefix = (type) => {
  const normalized = String(type || "").toLowerCase();
  return ["transfer_out", "expense", "reset", "savings_goal"].includes(normalized)
    ? "-"
    : "+";
};

export const formatHistoryDate = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function getWalletStatus(walletCount, walletMoney) {
  if (walletCount === 0) {
    return {
      label: "Empty",
      text: "text-white/95",
      badge: "bg-white/8 text-white/75 border border-white/10",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.08)]",
    };
  }

  if (walletMoney > 0) {
    return {
      label: "Active",
      text: "text-emerald-200",
      badge: "bg-emerald-400/15 text-emerald-100 border border-emerald-300/25",
      ring: "shadow-[0_0_34px_rgba(0,255,220,0.14)]",
    };
  }

  return {
    label: "Ready",
    text: "text-cyan-200",
    badge: "bg-cyan-400/15 text-cyan-100 border border-cyan-300/25",
    ring: "shadow-[0_0_34px_rgba(34,211,238,0.13)]",
  };
}

export function getWalletMessage(topWallet, walletCount) {
  if (!walletCount) return "Create your first wallet to organize your money.";
  if (topWallet) {
    return `${topWallet.name || "Top wallet"} currently holds ${fmt(topWallet.balance || 0)}.`;
  }
  return "Your wallets are ready for tracking and movement.";
}

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

  const topWallet = wallets[0] || null;
  const status = getWalletStatus(wallets.length, walletMoney);
  const message = getWalletMessage(topWallet, wallets.length);

  const visibleWallets = useMemo(
    () => (expanded ? wallets : wallets.slice(0, 2)),
    [wallets, expanded]
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
      type: wallet?.type || "cash",
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
      const nextType = editForm.type || editingWallet?.type || "other";

      await updateWallet(editingWallet.id, {
        name: nextName,
        wallet_name: nextName,
        type: nextType,
        icon: walletIcons[nextType] || editingWallet?.icon || "💰",
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
    topWallet,
    status,
    message,
    visibleWallets,
    visibleTransactions,
    openEditWallet,
    closeEditWallet,
    handleSaveWalletEdit,
  };
}
