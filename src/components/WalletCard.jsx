import { useMemo } from "react";
import {
  WalletCards,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const getHistoryTypeLabel = (type) => {
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

const getHistoryAmountPrefix = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (["transfer_out", "expense", "reset", "savings_goal"].includes(normalized)) {
    return "-";
  }
  return "+";
};

const formatHistoryDate = (value) => {
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

function getWalletStatus(walletCount, walletMoney) {
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
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    };
  }

  return {
    label: "Ready",
    text: "text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/25",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.14)]",
  };
}

function getWalletMessage(topWallet, walletCount) {
  if (!walletCount) return "Create your first wallet to organize your money.";
  if (topWallet) {
    return `${topWallet.name || "Top wallet"} currently holds ${fmt(
      topWallet.balance || 0
    )}.`;
  }
  return "Your wallets are ready for tracking and movement.";
}

export default function WalletCard({
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onCreateWallet,
  onMoveWallet,
  onDeleteWallet,
  onAddMoney,
  onTransferMoney,
}) {
  const topWallet = wallets[0] || null;
  const status = getWalletStatus(wallets.length, walletMoney);
  const message = getWalletMessage(topWallet, wallets.length);

  const visibleWallets = useMemo(() => {
    return expanded ? wallets : wallets.slice(0, 2);
  }, [wallets, expanded]);

  const visibleTransactions = useMemo(() => {
    return expanded
      ? walletPreviewTransactions
      : walletPreviewTransactions.slice(0, 2);
  }, [walletPreviewTransactions, expanded]);

  return (
    <div
        className={`relative mb-3 min-h-[280px] overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-200 ${status.ring}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#07142d] via-[#08182a] to-[#0c2a1c]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

        <div className="relative z-10 flex h-full flex-col p-4">
          <div className="mb-2 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.12)] backdrop-blur-sm">
              <WalletCards className="h-4 w-4 text-emerald-300" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold tracking-tight text-white">
                    Wallets
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/75">
                    Track your available money across accounts
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}
                >
                  {wallets.length} {wallets.length === 1 ? "Wallet" : "Wallets"}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-2">
            <p className={`text-[28px] font-bold leading-none ${status.text}`}>
              {fmt(walletMoney)}
            </p>

            <p className="mt-2 line-clamp-1 min-h-[20px] max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">
              {message}
            </p>

            <p className="mt-1 text-[11px] text-white/60">
              Total money spread across your wallet system.
            </p>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2 text-center backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Wallets
              </p>
              <p className="text-xs font-bold text-white">{wallets.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2 text-center backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Top Wallet
              </p>
              <p className="truncate text-xs font-bold text-white">
                {topWallet?.name || "None"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2 text-center backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Activity
              </p>
              <p className="text-xs font-bold text-white">
                {walletPreviewTransactions.length}
              </p>
            </div>
          </div>

          <div className="mt-auto">
            <button
              type="button"
              onClick={onToggleDetails}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
            >
              <span className="font-medium">
                {expanded ? "Hide details" : "Show details"}
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {wallets.length ? (
                  <div className="space-y-2">
                    {visibleWallets.map((wallet, index) => (
                      <div
                        key={wallet.id || `${wallet.name}-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {wallet.name || "Wallet"}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
                              {wallet.type || "wallet"}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-bold text-white">
                            {fmt(wallet.balance || 0)}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onAddMoney?.(wallet)}
                            disabled={financeActionLoading}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                          >
                            Add
                          </button>

                          <button
                            type="button"
                            onClick={() => onTransferMoney?.(wallet)}
                            disabled={financeActionLoading}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                          >
                            Transfer
                          </button>

                          <button
                            type="button"
                            onClick={() => onMoveWallet?.(wallet.id, -1)}
                            disabled={financeActionLoading}
                            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                            aria-label="Move wallet up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onMoveWallet?.(wallet.id, 1)}
                            disabled={financeActionLoading}
                            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                            aria-label="Move wallet down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteWallet?.(wallet.id)}
                            disabled={financeActionLoading}
                            className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                            aria-label="Delete wallet"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {!!visibleTransactions.length && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                          Recent activity
                        </p>

                        <div className="mt-3 space-y-2">
                          {visibleTransactions.map((item, index) => (
                            <div
                              key={item.id || `${item.type}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">
                                  {getHistoryTypeLabel(item.type)}
                                </p>
                                <p className="mt-1 text-xs text-white/45">
                                  {formatHistoryDate(
                                    item.transaction_date ||
                                      item.date ||
                                      item.created_at
                                  )}
                                </p>
                              </div>

                              <p className="shrink-0 text-sm font-bold text-white">
                                {getHistoryAmountPrefix(item.type)}
                                {fmt(item.amount || 0)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center">
                    <WalletCards className="mx-auto h-8 w-8 text-white/30" />
                    <p className="mt-3 text-sm font-semibold text-white">
                      No wallets yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Create your first wallet so your money is organized and easier
                      to track.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={onCreateWallet}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Create Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}