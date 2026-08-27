import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Edit3,
  Flame,
  PiggyBank,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

import {
  FILTERS,
  DEFAULT_THEME,
  TIMELINE_GROUPS,
  buildEditFormFromTransaction,
  cleanNumber,
  formatDateOnly,
  formatTime,
  getBudgetAmount,
  getBudgetCategory,
  getBudgetMonthKey,
  getEditableRawId,
  getFirstValue,
  getGroup,
  getIcon,
  getLast12Months,
  getSignedAmountByGroup,
  getStableDedupeKey,
  getTimelineKey,
  getTimelineStats,
  getToneClasses,
  hasValue,
  isDeletedRecord,
  isEmergencyFundAllocation,
  isJsonLike,
  isLinkedExpenseWalletTransaction,
  monthKey,
  normalizeText,
  parseDate,
  peso,
  titleCase,
  toInputDate,
} from "@/components/fresh/transaction-hub/logic/transactionHubUtils";

import {
  GlassDropdown,
  InsightCard,
  StatusBadge,
  SummaryCard,
  useClickOutside,
} from "@/components/fresh/transaction-hub/ui/TransactionHubPrimitives";
import TransactionCard from "@/components/fresh/transaction-hub/ui/TransactionCard";

function TimelineDropdown({
  group,
  items,
  isOpen,
  onToggle,
  onEdit,
  theme = DEFAULT_THEME,
}) {
  const stats = getTimelineStats(items);
  const hasItems = items.length > 0;

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border bg-white/[0.045] shadow-[0_18px_52px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 ${
        isOpen ? `${theme.border} ${theme.glowSoft}` : "border-white/10"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full ${theme.orb} blur-3xl opacity-70`}
      />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-28 w-28 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.06))] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-center justify-between gap-3 p-3.5 text-left transition duration-200 active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[16px] font-black tracking-tight text-white/92">
              {group.label}
            </h2>
            <span className="shrink-0 rounded-full border border-white/10 bg-black/18 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/43">
              {stats.count}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 overflow-hidden">
            <span className="truncate text-xs font-black text-white/68">
              {stats.total >= 0 ? "+" : "-"}
              {peso(Math.abs(stats.total))}
            </span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-white/22" />
            <span className="truncate text-[11px] font-semibold text-white/36">
              Out {peso(stats.spent)} · In {peso(stats.income)}
            </span>
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border transition duration-300 ${
            isOpen
              ? `${theme.border} ${theme.orb} ${theme.primaryText}`
              : "border-white/10 bg-black/18 text-white/48"
          }`}
        >
          <ChevronDown
            className={`h-4.5 w-4.5 transition duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2.5 border-t border-white/10 p-3 pt-3.5">
            {hasItems ? (
              items.map((item) => (
                <TransactionCard key={item.id} item={item} onEdit={onEdit} />
              ))
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-black/14 px-4 py-4 text-center text-sm font-semibold text-white/42">
                Nothing here yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EditTransactionDialog({
  open,
  item,
  form,
  wallets,
  saving,
  deleting,
  error,
  onChange,
  onClose,
  onSubmit,
  onDelete,
  theme = DEFAULT_THEME,
}) {
  const dialogRef = useRef(null);
  const busy = saving || deleting;

  useClickOutside(dialogRef, () => {
    if (!busy) onClose?.();
  });

  if (!open || !item) return null;

  const canEditTransfer = item.group === "transfer";
  const getWalletOptionId = (wallet) =>
    String(
      wallet?.id ||
        wallet?.wallet_id ||
        wallet?.walletId ||
        wallet?.local_id ||
        wallet?.localId ||
        ""
    );
  const getWalletOptionLabel = (wallet) =>
    wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/58 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-md sm:items-center">
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[#07101d]/96 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
      >
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full ${theme.orb} blur-3xl opacity-70`}
        />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`text-[9px] font-black uppercase tracking-[0.18em] ${theme.primaryText} opacity-60`}
            >
              Edit Transaction
            </p>
            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-white/92">
              {item.title || "Transaction"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-white/42">
              {titleCase(item.group)} · {formatDateOnly(item.date)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border border-white/10 bg-black/22 text-white/58 transition duration-200 hover:bg-white/[0.06] hover:text-white/86 disabled:opacity-40 active:scale-[0.96]"
            aria-label="Close edit transaction"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="relative mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Title
              </span>
              <input
                value={form.title}
                onChange={(event) => onChange("title", event.target.value)}
                placeholder="Transaction title"
                disabled={busy}
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 disabled:opacity-55 ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Amount
              </span>
              <input
                value={form.amount}
                onChange={(event) => onChange("amount", event.target.value)}
                inputMode="decimal"
                placeholder="0"
                disabled={busy}
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 disabled:opacity-55 ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Date
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => onChange("date", event.target.value)}
                disabled={busy}
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none [color-scheme:dark] disabled:opacity-55 ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Category
              </span>
              <input
                value={form.category}
                onChange={(event) => onChange("category", event.target.value)}
                placeholder="Category"
                disabled={busy}
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 disabled:opacity-55 ${theme.focus}`}
              />
            </label>

            {canEditTransfer ? (
              <>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                    From Wallet
                  </span>
                  <select
                    value={form.fromWalletId || ""}
                    onChange={(event) => onChange("fromWalletId", event.target.value)}
                    disabled={busy}
                    className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none disabled:opacity-55 ${theme.focus}`}
                  >
                    <option value="">Select source wallet</option>
                    {wallets.map((wallet) => {
                      const id = getWalletOptionId(wallet);
                      if (!id) return null;

                      return (
                        <option key={`from-${id}`} value={id}>
                          {getWalletOptionLabel(wallet)}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                    To Wallet
                  </span>
                  <select
                    value={form.toWalletId || ""}
                    onChange={(event) => onChange("toWalletId", event.target.value)}
                    disabled={busy}
                    className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none disabled:opacity-55 ${theme.focus}`}
                  >
                    <option value="">Select destination wallet</option>
                    {wallets.map((wallet) => {
                      const id = getWalletOptionId(wallet);
                      if (!id) return null;

                      return (
                        <option key={`to-${id}`} value={id}>
                          {getWalletOptionLabel(wallet)}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </>
            ) : (
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  Wallet
                </span>
                <select
                  value={form.walletId || ""}
                  onChange={(event) => onChange("walletId", event.target.value)}
                  disabled={busy}
                  className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none disabled:opacity-55 ${theme.focus}`}
                >
                  <option value="">No wallet selected</option>
                  {wallets.map((wallet) => {
                    const id = getWalletOptionId(wallet);
                    if (!id) return null;

                    return (
                      <option key={id} value={id}>
                        {getWalletOptionLabel(wallet)}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
              Note
            </span>
            <textarea
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              placeholder="Optional note"
              rows={3}
              disabled={busy}
              className={`w-full resize-none rounded-[18px] border border-white/10 bg-black/[0.26] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/28 disabled:opacity-55 ${theme.focus}`}
            />
          </label>

          {error ? (
            <div className="rounded-[18px] border border-rose-200/14 bg-rose-300/8 px-3 py-2 text-xs font-semibold leading-5 text-rose-50/78">
              {error}
            </div>
          ) : null}

          <div className="rounded-[18px] border border-rose-200/12 bg-rose-300/[0.045] p-2.5">
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[16px] border border-rose-200/14 bg-black/18 text-xs font-black text-rose-50/78 transition duration-200 hover:bg-rose-300/[0.075] disabled:opacity-45 active:scale-[0.98]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting..." : "Delete Transaction"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-[48px] rounded-[19px] border border-white/10 bg-black/20 text-sm font-black text-white/64 transition duration-200 disabled:opacity-45 active:scale-[0.98]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              className={`min-h-[48px] rounded-[19px] border ${theme.border} ${theme.orb} text-sm font-black ${theme.primaryText} shadow-[0_0_22px_var(--clara-theme-glow,rgba(148,163,184,0.09))] transition duration-200 disabled:opacity-45 active:scale-[0.98]`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden border border-white/10 bg-white/[0.05] backdrop-blur-2xl ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#020713] px-4 pb-28 pt-6 text-white">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))] blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.08))] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl space-y-4">
        <SkeletonBlock className="h-16 rounded-[26px]" />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((x) => (
            <SkeletonBlock key={x} className="h-20 rounded-[22px]" />
          ))}
        </div>

        {[1, 2, 3, 4].map((x) => (
          <SkeletonBlock key={x} className="h-20 rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onBack, onRefresh }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#020713] px-4 py-6 text-white">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-rose-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-36 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />

      <div className="relative mx-auto flex min-h-[80dvh] max-w-lg items-center">
        <div className="relative w-full overflow-hidden rounded-[34px] border border-rose-200/14 bg-white/[0.05] p-6 text-center shadow-[0_24px_84px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-rose-200/16 bg-rose-300/8">
            <AlertTriangle className="h-7 w-7 text-rose-50/82" />
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-tight">
            Transaction history could not load
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-white/55">
            CLARA could not prepare your activity timeline right now. Your finance data
            was not changed.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[48px] rounded-[20px] border border-white/10 bg-black/18 text-sm font-black text-white/72 transition duration-200 active:scale-[0.98]"
            >
              Back
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="min-h-[48px] rounded-[20px] border border-[color:var(--clara-theme-border,rgba(148,163,184,0.22))] bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.1))] text-sm font-black text-[color:var(--clara-theme-text,rgba(241,245,249,0.9))] shadow-[0_0_20px_var(--clara-theme-glow,rgba(148,163,184,0.08))] transition duration-200 active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionHub() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUserRole();
  const financial = useFinancialData(user);

  const theme = DEFAULT_THEME;

  const months = useMemo(() => getLast12Months(), []);
  const [month, setMonth] = useState(() => months[0]?.key || monthKey(new Date()));
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [notice, setNotice] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => buildEditFormFromTransaction(null));
  const [editSaving, setEditSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const safeWallets = Array.isArray(financial.wallets) ? financial.wallets : [];
  const safeExpenses = Array.isArray(financial.expenses) ? financial.expenses : [];
  const safeWalletTransactions = Array.isArray(financial.walletTransactions)
    ? financial.walletTransactions
    : [];
  const safeTransfers = Array.isArray(financial.transfers) ? financial.transfers : [];
  const safeBudgets = Array.isArray(financial.budgets) ? financial.budgets : [];
  const safeSavingsTransactions = Array.isArray(financial.savingsTransactions)
    ? financial.savingsTransactions
    : [];
  const safeEmergencyTransactions = Array.isArray(financial.emergencyFundTransactions)
    ? financial.emergencyFundTransactions
    : [];

  const walletMap = useMemo(() => {
    const map = new Map();

    safeWallets.forEach((wallet) => {
      if (wallet?.id) map.set(String(wallet.id), wallet);
      if (wallet?.local_id) map.set(String(wallet.local_id), wallet);
      if (wallet?.localId) map.set(String(wallet.localId), wallet);
      if (wallet?.wallet_id) map.set(String(wallet.wallet_id), wallet);
      if (wallet?.walletId) map.set(String(wallet.walletId), wallet);
    });

    return map;
  }, [safeWallets]);

  const budgetMap = useMemo(() => {
    const map = new Map();

    safeBudgets
      .filter((item) => !isDeletedRecord(item))
      .forEach((budget) => {
        const category = getBudgetCategory(budget);
        if (!category) return;

        const key = `${getBudgetMonthKey(budget)}:${category}`;
        const current = map.get(key) || {
          category,
          monthKey: getBudgetMonthKey(budget),
          allocated: 0,
        };

        current.allocated += getBudgetAmount(budget);
        map.set(key, current);
      });

    return map;
  }, [safeBudgets]);

  const getWalletDisplayNameById = (walletId) => {
    const wallet = walletMap.get(String(walletId || ""));
    return wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "";
  };

  const getTransferFromWalletId = (item) =>
    getFirstValue(item?.raw || item || {}, [
      "from_wallet_id",
      "fromWalletId",
      "source_wallet_id",
      "sourceWalletId",
      "wallet_id",
      "walletId",
    ]);

  const getTransferToWalletId = (item) =>
    getFirstValue(item?.raw || item || {}, [
      "to_wallet_id",
      "toWalletId",
      "destination_wallet_id",
      "destinationWalletId",
      "related_wallet_id",
      "relatedWalletId",
    ]);

  const buildTransferDeleteConfirmation = (item) => {
    const raw = item?.raw || item || {};
    const amount = Math.abs(cleanNumber(raw.amount ?? item?.amount ?? item?.signedAmount ?? 0));
    const amountText = peso(amount);
    const sourceWalletName = getWalletDisplayNameById(getTransferFromWalletId(item));
    const destinationWalletName = getWalletDisplayNameById(getTransferToWalletId(item));

    const sourceLine = sourceWalletName
      ? `${sourceWalletName} will get ${amountText} back.`
      : "Source wallet will get the amount back.";
    const destinationLine = destinationWalletName
      ? `${destinationWalletName} will lose ${amountText}.`
      : "Destination wallet will lose the amount.";

    return [
      "Delete this transfer?",
      "",
      `This will reverse ${amountText}:`,
      sourceLine,
      destinationLine,
      "",
      "This action cannot be undone.",
    ].join("\n");
  };

  const activityBase = useMemo(() => {
    const visibleSources = [
      ...safeExpenses
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "expense",
          __activitySource: "expense",
        })),

      ...safeWalletTransactions
        .filter((item) => !isDeletedRecord(item))
        .filter((item) => !isLinkedExpenseWalletTransaction(item))
        .filter((item) => {
          const group = getGroup(item);
          const isDebtPayment = Boolean(
            item?.debt_payment_id ||
              item?.debtPaymentId ||
              item?.debt_obligation_id ||
              item?.debtObligationId ||
              normalizeText(item?.type) === "debt payment" ||
              normalizeText(item?.source_type || item?.sourceType).includes("debt payment")
          );

          return (
            group === "income" ||
            group === "savings" ||
            group === "wallet" ||
            (group === "expense" && isDebtPayment)
          );
        })
        .map((item) => ({
          ...item,
          __activityGroup: getGroup(item),
          __activitySource: "wallet_transaction",
        })),

      ...safeTransfers
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "transfer",
          __activitySource: "transfer",
        })),

      ...safeSavingsTransactions
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "savings",
          __activitySource: "savings",
        })),

      ...safeEmergencyTransactions
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "savings",
          __activitySource: "emergency_fund",
        })),
    ];

    const seen = new Set();

    return visibleSources
      .map((item, index) => {
        const date =
          item.created_at ||
          item.createdAt ||
          item.date ||
          item.transaction_date ||
          item.transactionDate ||
          item.paid_at ||
          item.paidAt ||
          item.logged_at ||
          item.loggedAt ||
          item.updated_at ||
          item.updatedAt ||
          new Date();

        const group = getGroup(item);
        const source = item.__activitySource || "source";

        const wallet =
          walletMap.get(String(item.wallet_id || "")) ||
          walletMap.get(String(item.walletId || "")) ||
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.fromWalletId || "")) ||
          walletMap.get(String(item.to_wallet_id || "")) ||
          walletMap.get(String(item.toWalletId || "")) ||
          walletMap.get(String(item.source_wallet_id || "")) ||
          walletMap.get(String(item.sourceWalletId || "")) ||
          walletMap.get(String(item.destination_wallet_id || "")) ||
          walletMap.get(String(item.destinationWalletId || ""));

        const fromWallet =
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.fromWalletId || "")) ||
          walletMap.get(String(item.source_wallet_id || "")) ||
          walletMap.get(String(item.sourceWalletId || ""));

        const toWallet =
          walletMap.get(String(item.to_wallet_id || "")) ||
          walletMap.get(String(item.toWalletId || "")) ||
          walletMap.get(String(item.destination_wallet_id || "")) ||
          walletMap.get(String(item.destinationWalletId || ""));

        const note = item.notes || item.note || item.description || item.memo || "";
        const amount = Math.abs(cleanNumber(item.amount || item.value || item.total));
        const signedAmount = getSignedAmountByGroup(group, amount);

        const fallbackKey = `${group}:${source}:${monthKey(date)}:${parseDate(
          date
        ).getTime()}:${amount}:${item.category || item.type || index}`;

        const dedupeKey = getStableDedupeKey(item, group, source, fallbackKey);

        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        const transferWalletLabel =
          group === "transfer" && (fromWallet || toWallet)
            ? `${fromWallet?.name || fromWallet?.wallet_name || "Wallet"} → ${
                toWallet?.name || toWallet?.wallet_name || "Wallet"
              }`
            : "";

        return {
          id: dedupeKey,
          raw: item,
          date,
          monthKey: monthKey(date),
          group,
          type: item.type || item.source_type || item.sourceType || group,
          title: titleCase(
            item.title ||
              item.name ||
              item.merchant ||
              item.payee ||
              item.category ||
              item.source_type ||
              item.sourceType ||
              item.type ||
              group
          ),
          category:
            item.category || item.budget_category || item.budgetCategory || item.tag || "",
          walletName:
            transferWalletLabel ||
            wallet?.name ||
            wallet?.wallet_name ||
            wallet?.title ||
            "",
          amount,
          signedAmount,
          note: isJsonLike(note) ? "" : String(note || "").trim(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [
    safeExpenses,
    safeWalletTransactions,
    safeTransfers,
    safeSavingsTransactions,
    safeEmergencyTransactions,
    walletMap,
  ]);

  const activity = useMemo(() => {
    const monthlyCategoryStats = new Map();

    activityBase
      .filter((item) => item.group === "expense")
      .forEach((item) => {
        const category = normalizeText(item.category || "uncategorized");
        const key = `${item.monthKey}:${category}`;
        const current = monthlyCategoryStats.get(key) || {
          count: 0,
          total: 0,
          amounts: [],
        };

        current.count += 1;
        current.total += Math.abs(item.amount);
        current.amounts.push(Math.abs(item.amount));
        monthlyCategoryStats.set(key, current);
      });

    const monthlyCategorySpend = new Map();

    return activityBase.map((item) => {
      const category = normalizeText(item.category || "uncategorized");
      const categoryKey = `${item.monthKey}:${category}`;
      const budget = budgetMap.get(categoryKey);
      const categoryStats = monthlyCategoryStats.get(categoryKey) || {
        count: 0,
        total: 0,
        amounts: [],
      };

      const previousSpend = monthlyCategorySpend.get(categoryKey) || 0;
      const nextSpend = previousSpend + Math.abs(item.amount);
      if (item.group === "expense") monthlyCategorySpend.set(categoryKey, nextSpend);

      const budgetStatus =
        item.group === "expense" && budget?.allocated > 0 ? "planned" : "unplanned";

      const averageAmount =
        categoryStats.count > 0 ? categoryStats.total / categoryStats.count : 0;

      const significantAmount = Math.max(
        500,
        cleanNumber(budget?.allocated) * 0.25,
        averageAmount * 1.5
      );

      const isBudgetRisk =
        item.group === "expense" &&
        budgetStatus === "unplanned" &&
        Math.abs(item.amount) >= significantAmount;

      const isGoodDecision =
        item.group === "expense" &&
        budgetStatus === "planned" &&
        budget?.allocated > 0 &&
        nextSpend <= budget.allocated;

      const isFrequent = item.group === "expense" && categoryStats.count >= 3;

      const isHighSpend =
        item.group === "expense" &&
        categoryStats.count >= 3 &&
        averageAmount > 0 &&
        Math.abs(item.amount) > averageAmount * 1.5;

      const enhanced = {
        ...item,
        budgetStatus,
        budgetLimit: budget?.allocated || 0,
        budgetCategorySpend: nextSpend,
        isBudgetRisk,
        isGoodDecision,
        isFrequent,
        isHighSpend,
      };

      return {
        ...enhanced,
        searchText: [
          enhanced.title,
          enhanced.category,
          enhanced.walletName,
          enhanced.note,
          enhanced.type,
          enhanced.group,
          enhanced.budgetStatus,
          enhanced.isBudgetRisk ? "budget risk" : "",
          enhanced.isGoodDecision ? "good decision" : "",
          enhanced.isFrequent ? "frequent" : "",
          enhanced.isHighSpend ? "high spend" : "",
          enhanced.amount,
          enhanced.signedAmount,
          peso(enhanced.amount),
          formatDateOnly(enhanced.date),
          formatTime(enhanced.date),
        ]
          .join(" ")
          .toLowerCase(),
      };
    });
  }, [activityBase, budgetMap]);

  const monthlyActivity = useMemo(
    () => activity.filter((item) => item.monthKey === month),
    [activity, month]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return monthlyActivity.filter((item) => {
      const matchesFilter = filter === "all" || item.group === filter;
      const matchesSearch = !q || item.searchText.includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [monthlyActivity, filter, search]);

  const timelineGroups = useMemo(() => {
    const map = new Map(TIMELINE_GROUPS.map((item) => [item.key, []]));

    filtered.forEach((item) => {
      const key = getTimelineKey(item.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return TIMELINE_GROUPS.map((group) => ({
      ...group,
      items: map.get(group.key) || [],
    }));
  }, [filtered]);

  const summary = useMemo(() => {
    const moneyOut = monthlyActivity
      .filter((item) => item.group === "expense")
      .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

    const moneyIn = monthlyActivity
      .filter((item) => item.group === "income")
      .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

    const plannedCount = monthlyActivity.filter(
      (item) => item.group === "expense" && item.budgetStatus === "planned"
    ).length;

    const unplannedCount = monthlyActivity.filter(
      (item) => item.group === "expense" && item.budgetStatus === "unplanned"
    ).length;

    const budgetRiskCount = monthlyActivity.filter((item) => item.isBudgetRisk).length;
    const frequentCount = monthlyActivity.filter((item) => item.isFrequent).length;
    const highSpendCount = monthlyActivity.filter((item) => item.isHighSpend).length;

    let insight = "Your timeline looks stable. Keep your spending connected to your plan.";

    if (budgetRiskCount > 0) {
      insight =
        "Some spending is outside your budget plan. Review it gently before it becomes a pattern.";
    } else if (frequentCount > 0 || highSpendCount > 0) {
      insight =
        "One category is appearing often. Check if your budget still matches your real behavior.";
    } else if (plannedCount > 0 && unplannedCount === 0) {
      insight = "Your planned expenses are staying aligned this month.";
    }

    return {
      moneyOut,
      moneyIn,
      netFlow: moneyIn - moneyOut,
      count: filtered.length,
      plannedCount,
      unplannedCount,
      budgetRiskCount,
      insight,
    };
  }, [monthlyActivity, filtered.length]);

  const hasOfflineReadyData =
    Boolean(activity.length) ||
    Boolean(safeWallets.length) ||
    Boolean(safeExpenses.length) ||
    Boolean(safeWalletTransactions.length) ||
    Boolean(safeTransfers.length) ||
    Boolean(safeBudgets.length) ||
    Boolean(safeSavingsTransactions.length) ||
    Boolean(safeEmergencyTransactions.length);

  const refresh = async () => {
    if (typeof financial.refreshData !== "function") return;

    try {
      setRefreshing(true);
      await financial.refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const closeEditDialog = () => {
    if (editSaving || deleteSaving) return;
    setIsEditOpen(false);
    setSelectedTransaction(null);
    setEditForm(buildEditFormFromTransaction(null));
    setEditError("");
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditTransaction = (item) => {
    if (!item) return;

    const rawId = getEditableRawId(item);

    if (!rawId) {
      setNotice("This transaction is missing a stable ID, so it cannot be edited safely yet.");
      return;
    }

    setSelectedTransaction(item);
    setEditForm(buildEditFormFromTransaction(item));
    setEditError("");
    setIsEditOpen(true);
  };

  const buildUpdatePayload = () => {
    const amount = Math.abs(cleanNumber(editForm.amount));
    const dateValue = editForm.date || toInputDate(new Date());

    const basePayload = {
      title: editForm.title.trim(),
      name: editForm.title.trim(),
      amount,
      category: editForm.category.trim(),
      note: editForm.note.trim(),
      notes: editForm.note.trim(),
      description: editForm.note.trim(),
      date: dateValue,
      transaction_date: dateValue,
    };

    if (selectedTransaction?.group === "transfer") {
      return {
        ...basePayload,
        from_wallet_id: editForm.fromWalletId || null,
        fromWalletId: editForm.fromWalletId || null,
        source_wallet_id: editForm.fromWalletId || null,
        sourceWalletId: editForm.fromWalletId || null,
        to_wallet_id: editForm.toWalletId || null,
        toWalletId: editForm.toWalletId || null,
        destination_wallet_id: editForm.toWalletId || null,
        destinationWalletId: editForm.toWalletId || null,
        related_wallet_id: editForm.toWalletId || null,
        relatedWalletId: editForm.toWalletId || null,
      };
    }

    return {
      ...basePayload,
      wallet_id: editForm.walletId || null,
      walletId: editForm.walletId || null,
    };
  };

  const handleSubmitEdit = async (event) => {
    event.preventDefault();

    if (!selectedTransaction) return;

    const rawId = getEditableRawId(selectedTransaction);
    const amount = Math.abs(cleanNumber(editForm.amount));
    const dateValue = String(editForm.date || "").trim();
    const parsedDate = dateValue ? new Date(`${dateValue}T12:00:00`) : null;

    if (!rawId) {
      setEditError("This transaction is missing its original ID.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setEditError("Enter a valid amount before saving.");
      return;
    }

    if (!dateValue || !parsedDate || Number.isNaN(parsedDate.getTime())) {
      setEditError("Select a valid date before saving.");
      return;
    }

    if (selectedTransaction.group === "transfer") {
      const fromWalletId = String(editForm.fromWalletId || "").trim();
      const toWalletId = String(editForm.toWalletId || "").trim();

      if (!fromWalletId) {
        setEditError("Select the source wallet for this transfer.");
        return;
      }

      if (!toWalletId) {
        setEditError("Select the destination wallet for this transfer.");
        return;
      }

      if (!walletMap.has(fromWalletId)) {
        setEditError("Select a valid source wallet for this transfer.");
        return;
      }

      if (!walletMap.has(toWalletId)) {
        setEditError("Select a valid destination wallet for this transfer.");
        return;
      }

      if (fromWalletId === toWalletId) {
        setEditError("Source and destination wallets must be different.");
        return;
      }
    }

    const payload = buildUpdatePayload();

    try {
      setEditSaving(true);
      setEditError("");

      if (selectedTransaction.group === "expense") {
        if (typeof financial.updateExpense !== "function") {
          throw new Error("Expense editing is not available in useFinancialData yet.");
        }

        await financial.updateExpense(rawId, payload);
      } else if (selectedTransaction.group === "income") {
        if (typeof financial.updateWalletTransaction !== "function") {
          throw new Error("Income editing is not available in useFinancialData yet.");
        }

        await financial.updateWalletTransaction(rawId, {
          ...payload,
          type: "income",
          amount,
        });
      } else if (selectedTransaction.group === "transfer") {
        if (typeof financial.updateTransfer !== "function") {
          throw new Error("Transfer editing is not available in useFinancialData yet.");
        }

        await financial.updateTransfer(rawId, payload);
      } else {
        throw new Error("Editing for this transaction type is not available yet.");
      }

      if (typeof financial.refreshData === "function") {
        await financial.refreshData();
      }

      setNotice("Transaction updated.");
      setIsEditOpen(false);
      setSelectedTransaction(null);
      setEditForm(buildEditFormFromTransaction(null));
    } catch (error) {
      setEditError(
        error?.message || "CLARA could not save this edit. Your data was not changed."
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    const rawId = getEditableRawId(selectedTransaction);

    if (!rawId) {
      setEditError("This transaction is missing its original ID and cannot be deleted safely.");
      return;
    }

    const isEmergencyAllocation = isEmergencyFundAllocation(selectedTransaction);

    const confirmCopy =
      isEmergencyAllocation
        ? "Delete this Emergency Fund allocation? This will remove the transaction, return the amount to the source wallet, and reduce your Emergency Fund balance."
        : selectedTransaction.group === "transfer"
        ? buildTransferDeleteConfirmation(selectedTransaction)
        : selectedTransaction.group === "expense"
        ? "Delete this transaction? This will remove the record and reverse its wallet effect. This will return the amount to the wallet."
        : "Delete this transaction? This will remove the record and reverse its wallet effect.";

    const confirmed =
      typeof window === "undefined" || typeof window.confirm !== "function"
        ? true
        : window.confirm(confirmCopy);

    if (!confirmed) return;

    try {
      setDeleteSaving(true);
      setEditError("");

      if (isEmergencyAllocation) {
        if (typeof financial.deleteEmergencyFundAllocation !== "function") {
          throw new Error("Emergency Fund allocation delete handler is not available.");
        }

        await financial.deleteEmergencyFundAllocation(selectedTransaction);
        setNotice(
          "Emergency Fund allocation deleted. Wallet and Emergency Fund balance were reversed."
        );
        setIsEditOpen(false);
        setSelectedTransaction(null);
        setEditForm(buildEditFormFromTransaction(null));
        setEditError("");
        return;
      }

      if (selectedTransaction.group === "expense") {
        if (typeof financial.deleteExpense !== "function") {
          throw new Error("Expense deletion is not available in useFinancialData yet.");
        }

        await financial.deleteExpense(rawId);
        setNotice("Transaction deleted. Wallet balance was restored.");
      } else if (
        selectedTransaction.group === "income" ||
        selectedTransaction.group === "wallet"
      ) {
        if (typeof financial.deleteWalletTransaction !== "function") {
          throw new Error("Wallet transaction deletion is not available in useFinancialData yet.");
        }

        await financial.deleteWalletTransaction(rawId);
        setNotice("Transaction deleted. Wallet balance was updated.");
      } else if (selectedTransaction.group === "transfer") {
        if (typeof financial.deleteTransfer !== "function") {
          throw new Error("Transfer deletion is not available in useFinancialData yet.");
        }

        await financial.deleteTransfer(rawId);
        setNotice("Transfer deleted. Both wallet movements were reversed safely.");
      } else if (selectedTransaction.group === "savings") {
        throw new Error("Savings deletion is not available from this transaction edit modal yet.");
      } else {
        throw new Error("Deletion for this transaction type is not available yet.");
      }

      if (typeof financial.refreshData === "function") {
        await financial.refreshData();
      }

      setIsEditOpen(false);
      setSelectedTransaction(null);
      setEditForm(buildEditFormFromTransaction(null));
      setEditError("");
    } catch (error) {
      setEditError(
        error?.message || "CLARA could not delete this transaction. Your data was not changed."
      );
    } finally {
      setDeleteSaving(false);
    }
  };

  useEffect(() => {
    if (!notice) return undefined;

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const monthOptions = useMemo(
    () => months.map((item) => ({ key: item.key, label: item.label })),
    [months]
  );

  const filterOptions = useMemo(
    () => FILTERS.map(([key, label]) => ({ key, label })),
    []
  );

  const selectedMonthLabel =
    months.find((item) => item.key === month)?.label || "This month";

  if ((userLoading || financial.loading) && !hasOfflineReadyData) {
    return <LoadingState />;
  }

  if (financial.error && !hasOfflineReadyData) {
    return <ErrorState onBack={() => navigate("/dashboard")} onRefresh={refresh} />;
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#020713] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white md:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))] blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.075))] blur-3xl" />
        <div className="absolute -bottom-20 -left-28 h-80 w-80 rounded-full bg-white/[0.035] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-3.5">
        <header className="flex items-center justify-between gap-3 px-1 pb-0.5 pt-1">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.border} ${theme.orb} text-white/82 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-200 active:scale-[0.96]`}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 px-2 text-center">
            <p className="truncate text-[13px] font-black tracking-tight text-white/86">
              Transaction Hub
            </p>
            <p className="mx-auto mt-0.5 max-w-[150px] truncate whitespace-nowrap text-[10px] font-semibold text-white/44">
              {selectedMonthLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || typeof financial.refreshData !== "function"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.border} ${theme.orb} text-white/82 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-200 disabled:opacity-45 active:scale-[0.96]`}
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </header>

        {notice ? (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-semibold leading-5 text-white/66 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            {notice}
          </div>
        ) : null}

        {financial.error && hasOfflineReadyData ? (
          <div className="rounded-[20px] border border-amber-200/14 bg-amber-300/7 px-4 py-3 text-xs font-semibold leading-5 text-amber-50/68">
            Offline data is visible. Live refresh could not complete.
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-2">
          <GlassDropdown
            label="Month"
            icon={CalendarDays}
            value={month}
            options={monthOptions}
            onChange={setMonth}
            onAfterChange={() => setOpenGroup(null)}
            theme={theme}
          />

          <GlassDropdown
            label="Filter"
            icon={Receipt}
            value={filter}
            options={filterOptions}
            onChange={setFilter}
            onAfterChange={() => setOpenGroup(null)}
            theme={theme}
          />
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <SummaryCard
            label="Money Out"
            value={`-${peso(summary.moneyOut)}`}
            helper="Monthly expenses"
            tone="rose"
          />
          <SummaryCard
            label="Money In"
            value={`+${peso(summary.moneyIn)}`}
            helper="Monthly income"
            tone="emerald"
          />
          <SummaryCard
            label="Net Flow"
            value={`${summary.netFlow >= 0 ? "+" : "-"}${peso(
              Math.abs(summary.netFlow)
            )}`}
            helper={summary.netFlow >= 0 ? "Positive month" : "Needs attention"}
            tone={summary.netFlow >= 0 ? "emerald" : "rose"}
          />
          <SummaryCard
            label="Shown"
            value={summary.count}
            helper="Current view"
            tone="cyan"
          />
        </section>

        <InsightCard insight={summary.insight} theme={theme} />

        <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-2.5 shadow-[0_18px_52px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-20 -top-20 h-36 w-36 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOpenGroup(null);
              }}
              placeholder="Search transactions"
              className={`min-h-[50px] w-full rounded-[20px] border border-white/10 bg-black/[0.26] pl-11 pr-4 text-sm font-medium text-white shadow-inner shadow-black/18 outline-none backdrop-blur-2xl transition duration-200 placeholder:text-white/32 focus:bg-black/[0.32] ${theme.focus}`}
            />
          </div>
        </section>

        <section className="space-y-2.5">
          {!filtered.length ? (
            <div
              className={`relative overflow-hidden rounded-[28px] border border-dashed ${theme.border} bg-white/[0.045] p-7 text-center shadow-[0_20px_62px_rgba(0,0,0,0.24)] backdrop-blur-2xl`}
            >
              <div
                className={`pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full ${theme.orb} blur-3xl opacity-70`}
              />
              <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />

              <div
                className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border ${theme.border} ${theme.orb}`}
              >
                <Receipt className={`h-6 w-6 ${theme.primaryText} opacity-75`} />
              </div>

              <h2 className="relative mt-4 text-lg font-black tracking-tight">
                No transactions yet
              </h2>

              <p className="relative mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-white/52">
                Start logging expenses and CLARA will organize your financial timeline here.
              </p>
            </div>
          ) : (
            timelineGroups.map((group) => (
              <TimelineDropdown
                key={group.key}
                group={group}
                items={group.items}
                isOpen={openGroup === group.key}
                onEdit={handleEditTransaction}
                theme={theme}
                onToggle={() =>
                  setOpenGroup((current) => (current === group.key ? null : group.key))
                }
              />
            ))
          )}
        </section>
      </div>

      <EditTransactionDialog
        open={isEditOpen}
        item={selectedTransaction}
        form={editForm}
        wallets={safeWallets}
        saving={editSaving}
        deleting={deleteSaving}
        error={editError}
        onChange={handleEditFormChange}
        onClose={closeEditDialog}
        onSubmit={handleSubmitEdit}
        onDelete={handleDeleteTransaction}
        theme={theme}
      />
    </div>
  );
}
