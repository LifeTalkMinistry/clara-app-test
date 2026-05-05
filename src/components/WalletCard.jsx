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

const getWalletThemeClasses = (theme) => {
  const isLight = theme?.isLight === true;
  const tone = theme?.moneyTone || "teal";

  const surfaces = isLight
    ? {
        teal: "bg-[linear-gradient(135deg,rgba(240,253,250,0.98),rgba(236,254,255,0.95),rgba(207,250,254,0.92))]",
        emerald: "bg-[linear-gradient(135deg,rgba(240,253,244,0.98),rgba(236,253,245,0.95),rgba(220,252,231,0.92))]",
        blue: "bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(224,231,255,0.95),rgba(219,234,254,0.92))]",
        gold: "bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,247,237,0.95),rgba(254,249,195,0.92))]",
      }
    : {
        teal: "bg-[linear-gradient(135deg,rgba(7,20,45,0.98),rgba(8,24,42,0.95),rgba(12,42,28,0.98))]",
        emerald: "bg-[linear-gradient(135deg,rgba(7,25,24,0.98),rgba(7,31,40,0.95),rgba(5,18,29,0.98))]",
        blue: "bg-[linear-gradient(135deg,rgba(8,18,52,0.98),rgba(12,33,80,0.94),rgba(7,15,38,0.98))]",
        gold: "bg-[linear-gradient(135deg,rgba(29,18,8,0.98),rgba(43,28,13,0.93),rgba(18,11,8,0.98))]",
      };

  const overlays = isLight
    ? {
        teal: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        emerald: "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        gold: "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
      }
    : {
        teal: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        emerald: "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        gold: "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
      };

  const iconShells = isLight
    ? {
        teal: "border-teal-300/40 bg-teal-500/10 shadow-[0_0_18px_rgba(20,184,166,0.10)]",
        emerald: "border-emerald-300/40 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.10)]",
        blue: "border-blue-300/40 bg-blue-500/10 shadow-[0_0_18px_rgba(59,130,246,0.10)]",
        gold: "border-amber-300/40 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.10)]",
      }
    : {
        teal: "border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.12)]",
        emerald: "border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.12)]",
        blue: "border-blue-400/20 bg-blue-500/10 shadow-[0_0_18px_rgba(59,130,246,0.12)]",
        gold: "border-amber-400/20 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.12)]",
      };

  const iconColors = isLight
    ? { teal: "text-teal-700", emerald: "text-emerald-700", blue: "text-blue-700", gold: "text-amber-700" }
    : { teal: "text-emerald-300", emerald: "text-emerald-300", blue: "text-blue-300", gold: "text-amber-300" };

  const glass = isLight ? "border-slate-300/45 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]" : "border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
  const softGlass = isLight ? "border-slate-300/45 bg-white/70" : "border-white/10 bg-white/[0.03]";
  const border = isLight ? "border-slate-300/45" : "border-white/10";
  const title = isLight ? "text-slate-900" : "text-white";
  const body = isLight ? "text-slate-700" : "text-white/82";
  const muted = isLight ? "text-slate-500" : "text-white/60";
  const action = isLight ? "border-slate-300/45 bg-white/70 text-slate-800 hover:bg-white" : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white";

  return { surface: surfaces[tone] || surfaces.teal, overlay: overlays[tone] || overlays.teal, iconShell: iconShells[tone] || iconShells.teal, iconColor: iconColors[tone] || iconColors.teal, glass, softGlass, border, title, body, muted, action };
};

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
  theme = null,
}) {
  const topWallet = wallets[0] || null;
  const status = getWalletStatus(wallets.length, walletMoney);
  const message = getWalletMessage(topWallet, wallets.length);
  const themeClasses = getWalletThemeClasses(theme);

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
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${themeClasses.border} ${status.ring}`}
    >
      <div className={`absolute inset-0 ${themeClasses.surface}`} />
      <div className={`pointer-events-none absolute inset-0 ${themeClasses.overlay}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col justify-between">
          <div>
            <div className="mb-3 flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${themeClasses.iconShell}`}>
                <WalletCards className={`h-4 w-4 ${themeClasses.iconColor}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-base font-semibold tracking-tight ${themeClasses.title}`}>
                      Wallets
                    </p>
                    <p className={`mt-0.5 text-[11px] font-medium ${themeClasses.body}`}>
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

            <div className="mb-3">
              <p className={`text-[32px] font-bold leading-none ${status.text}`}>
                {fmt(walletMoney)}
              </p>

              <p className={`mt-2 line-clamp-1 min-h-[20px] max-w-[28rem] text-xs font-medium leading-relaxed ${themeClasses.body}`}>
                {message}
              </p>

              <p className={`mt-1 text-[11px] ${themeClasses.muted}`}>
                Total money spread across your wallet system.
              </p>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className={`rounded-2xl border px-2.5 py-2 text-center backdrop-blur-[2px] ${themeClasses.glass}`}>
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${themeClasses.muted}`}>
                  Wallets
                </p>
                <p className={`text-xs font-bold ${themeClasses.title}`}>{wallets.length}</p>
              </div>

              <div className={`rounded-2xl border px-2.5 py-2 text-center backdrop-blur-[2px] ${themeClasses.glass}`}>
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${themeClasses.muted}`}>
                  Top Wallet
                </p>
                <p className={`truncate text-xs font-bold ${themeClasses.title}`}>
                  {topWallet?.name || "None"}
                </p>
              </div>

              <div className={`rounded-2xl border px-2.5 py-2 text-center backdrop-blur-[2px] ${themeClasses.glass}`}>
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${themeClasses.muted}`}>
                  Activity
                </p>
                <p className={`text-xs font-bold ${themeClasses.title}`}>
                  {walletPreviewTransactions.length}
                </p>
              </div>
            </div>
          </div>

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
        </div>

        {expanded && (
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <div className={`rounded-2xl border border-dashed p-4 text-center ${themeClasses.softGlass}`}>
                <WalletCards className="mx-auto h-8 w-8 text-white/30" />
                <p className="mt-3 text-sm font-semibold text-white">
                  No wallets yet
                </p>
                <p className={`mt-2 text-sm leading-6 ${themeClasses.muted}`}>
                  Create your first wallet so your money is organized and easier
                  to track.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onCreateWallet}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${themeClasses.action}`}
              >
                <Plus className="h-4 w-4" />
                Create Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
