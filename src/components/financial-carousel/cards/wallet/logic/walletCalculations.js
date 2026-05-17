import { fmt } from "./walletFormatting";

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

export function getTopWallet(wallets = []) {
  if (!Array.isArray(wallets) || wallets.length === 0) return null;

  // In CLARA, "Primary" means the first wallet in the user's displayed wallet order,
  // not the wallet with the highest balance. The list is already sorted by display
  // order before it reaches this calculation layer.
  return wallets.find((wallet) => wallet && !wallet?.is_archived && !wallet?.deletedAt && !wallet?.deleted_at) || null;
}

export function getWalletMessage(walletCount) {
  if (!walletCount) return "Create your first wallet to organize your money.";
  return "Available across all wallets.";
}

export function getExpandedWalletMessage(topWallet, walletCount) {
  if (!walletCount) return "Create a wallet to start tracking money movement.";
  if (!topWallet) return "Your wallets are ready for tracking and movement.";
  return `${topWallet.name || "Primary wallet"} is your primary wallet and currently holds ${fmt(topWallet.balance || 0)}.`;
}
