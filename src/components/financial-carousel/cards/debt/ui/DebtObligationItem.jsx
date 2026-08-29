import { CheckCircle2, CreditCard, Edit3, Loader2, X } from "lucide-react";
import { useState } from "react";

import { fmt, getDebtTypeLabel } from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import { getFinanceItemHierarchyTone } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import {
  buildCanonicalWalletState,
  getWalletCurrentBalance,
  getWalletId,
  getWalletName,
  getWalletSpendableBalance,
  isActiveWalletForMoneySemantics,
  isMoneyLentWallet,
} from "@/lib/clara-wallet-money-semantics";
import { financialDateKey } from "@/lib/clara-financial-day";
import { payDebtObligationFromWallet } from "@/lib/debtPaymentRepository";
import { getDebtTitle } from "@/lib/debtObligationStore";
import { getDebtOccurrenceState, getPaidDebtOccurrenceDates } from "@/lib/debtOccurrenceState";
import {
  estimateDebtPayoffMonths,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligationMode,
  getDebtStatus,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationMath";
import { financeRepository } from "@/lib/financeRepository";

export const getObligationBalance = (record) => getDebtBalance(record);
export const getObligationMonthly = (record) => getMonthlyDebtPayment(record);
export const getObligationInterest = (record) => getDebtInterestRate(record);

const paymentFieldClass =
  "w-full rounded-xl border border-white/[0.08] bg-black/[0.20] px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-300/30 focus:ring-2 focus:ring-emerald-300/10 disabled:opacity-45";

const ordinal = (day) => {
  const value = Number(day) || 0;
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
};

const toMoneyNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function getSafeDueMeta(record) {
  const dueDay = getDebtDueDay(record);
  if (!dueDay) return { label: "", state: "none", dueDate: "" };

  const occurrence = getDebtOccurrenceState(record, new Date());
  if (!occurrence?.dueDate) return { label: `Every ${ordinal(dueDay)}`, state: "invalid", dueDate: "" };
  const due = new Date(`${occurrence.dueDate}T00:00:00`);
  const dueLabel = due.toLocaleDateString("en-PH", { month: "short", day: "numeric" });

  if (occurrence.state === "overdue") {
    return { label: `Every ${ordinal(dueDay)} · Overdue ${dueLabel}`, state: "overdue", dueDate: occurrence.dueDate };
  }
  if (occurrence.state === "due_today") {
    return { label: `Every ${ordinal(dueDay)} · Due today`, state: "due_today", dueDate: occurrence.dueDate };
  }
  return { label: `Every ${ordinal(dueDay)} · Next ${dueLabel}`, state: "scheduled", dueDate: occurrence.dueDate };
}

function getDebtAmountMeta({ mode, balance, monthly, interest, dueState, status }) {
  if (["paid", "completed", "closed"].includes(status)) {
    return { className: "text-emerald-200", label: "Paid", amount: 0 };
  }
  if (mode === "recurring") {
    return {
      className: dueState === "due_soon" ? "text-amber-200" : "text-cyan-100",
      label: "Recurring monthly obligation",
      amount: monthly,
    };
  }
  if (dueState === "due_soon" || interest >= 15) {
    return { className: "text-amber-200", label: "Outstanding balance", amount: balance };
  }
  return { className: "text-white/94", label: "Outstanding balance", amount: balance };
}

function getOccurrencePaidAmount(record, dueDate) {
  if (!dueDate) return 0;
  const history = Array.isArray(record?.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record?.payment_history)
      ? record.payment_history
      : [];

  return history.reduce((sum, entry) => {
    const entryDate = String(entry?.dueDate || entry?.due_date || "").slice(0, 10);
    if (entryDate !== dueDate) return sum;
    return sum + Math.max(toMoneyNumber(entry?.amount), 0);
  }, 0);
}

function getSuggestedPaymentAmount(record, dueDate) {
  const mode = getDebtObligationMode(record);
  const balance = Math.max(getObligationBalance(record), 0);
  const monthly = Math.max(getObligationMonthly(record), 0);
  const expected = mode === "balance" ? Math.min(monthly || balance, balance) : monthly;
  const paidForOccurrence = getOccurrencePaidAmount(record, dueDate);
  const remainingOccurrence = Math.max(expected - paidForOccurrence, 0);

  if (remainingOccurrence > 0) return remainingOccurrence;
  if (mode === "balance") return Math.min(monthly || balance, balance);
  return monthly;
}

function getLatestPaidOccurrenceMeta(record) {
  const explicitPaidDates = getPaidDebtOccurrenceDates(record);
  const monthly = Math.max(getObligationMonthly(record), 0);
  const history = Array.isArray(record?.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record?.payment_history)
      ? record.payment_history
      : [];
  const historyDates = [...new Set(
    history
      .map((entry) => String(entry?.dueDate || entry?.due_date || "").slice(0, 10))
      .filter(Boolean)
  )].filter((dueDate) => monthly > 0 && getOccurrencePaidAmount(record, dueDate) >= monthly);
  const dueDate = [...new Set([...explicitPaidDates, ...historyDates])].sort().at(-1) || "";
  if (!dueDate) return null;

  const date = new Date(`${dueDate}T00:00:00`);
  const label = Number.isNaN(date.getTime())
    ? dueDate
    : date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return {
    dueDate,
    label,
    paidAmount: getOccurrencePaidAmount(record, dueDate),
  };
}

export default function DebtObligationItem({ record, totalPositiveDebt, onEdit }) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentWallets, setPaymentWallets] = useState([]);
  const [paymentWalletId, setPaymentWalletId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("now");
  const [paymentDate, setPaymentDate] = useState("");
  const [walletAlreadyReflectsPayment, setWalletAlreadyReflectsPayment] = useState(true);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [paying, setPaying] = useState(false);

  const balance = getObligationBalance(record);
  const monthly = getObligationMonthly(record);
  const interest = getObligationInterest(record);
  const mode = getDebtObligationMode(record);
  const status = getDebtStatus(record);
  const payoffMonths =
    mode === "balance"
      ? estimateDebtPayoffMonths({
          balance,
          monthlyPayment: monthly,
          annualInterestRate: interest,
        })
      : 0;
  const tone = getFinanceItemHierarchyTone(
    mode === "balance" ? balance : monthly,
    totalPositiveDebt
  );
  const dueMeta = getSafeDueMeta(record);
  const latestPaidOccurrence = getLatestPaidOccurrenceMeta(record);
  const currentOccurrencePaidAmount = getOccurrencePaidAmount(record, dueMeta.dueDate);
  const currentOccurrenceExpected = Math.max(monthly, 0);
  const hasPartialCurrentOccurrence =
    Boolean(dueMeta.dueDate) &&
    currentOccurrencePaidAmount > 0 &&
    currentOccurrenceExpected > 0 &&
    currentOccurrencePaidAmount < currentOccurrenceExpected;
  const amountMeta = getDebtAmountMeta({
    mode,
    balance,
    monthly,
    interest,
    dueState: dueMeta.state,
    status,
  });
  const canPay =
    !["paid", "completed", "closed"].includes(status) &&
    (monthly > 0 || (mode === "balance" && balance > 0));
  const localUserId = String(record?.localUserId || record?.local_user_id || "").trim();
  const selectedWallet = paymentWallets.find(
    (wallet) => getWalletId(wallet) === paymentWalletId
  );
  const selectedSpendable = selectedWallet
    ? getWalletSpendableBalance(selectedWallet)
    : 0;
  const isHistoricalPayment = paymentMode === "already_paid";
  const requiresWalletDeduction = !isHistoricalPayment || !walletAlreadyReflectsPayment;
  const paymentDateMax = financialDateKey(new Date());

  const openPayment = async () => {
    if (!canPay || loadingWallets || paying) return;
    setPaymentOpen(true);
    setPaymentNotice("");
    setPaymentMode("now");
    setPaymentDate(paymentDateMax);
    setWalletAlreadyReflectsPayment(true);
    setPaymentAmount(String(getSuggestedPaymentAmount(record, dueMeta.dueDate) || ""));

    if (!localUserId) {
      setPaymentNotice("Unable to resolve the owner of this obligation.");
      return;
    }

    setLoadingWallets(true);
    try {
      const [wallets, savingsGoals, emergencyFund] = await Promise.all([
        financeRepository.getWallets(localUserId),
        financeRepository.getSavingsGoals(localUserId),
        financeRepository.getEmergencyFund(localUserId),
      ]);
      const { wallets: canonicalWallets } = buildCanonicalWalletState({
        wallets: Array.isArray(wallets) ? wallets : [],
        savingsGoals: Array.isArray(savingsGoals) ? savingsGoals : [],
        emergencyFund: emergencyFund || null,
      });
      const availableWallets = canonicalWallets.filter(
        (wallet) => isActiveWalletForMoneySemantics(wallet) && !isMoneyLentWallet(wallet)
      );
      setPaymentWallets(availableWallets);
      const preferred =
        availableWallets.find((wallet) => getWalletSpendableBalance(wallet) > 0) ||
        availableWallets[0] ||
        null;
      setPaymentWalletId(preferred ? getWalletId(preferred) : "");
      if (!availableWallets.length) {
        setPaymentNotice("Add a spendable wallet before paying this obligation.");
      }
    } catch (error) {
      setPaymentWallets([]);
      setPaymentWalletId("");
      setPaymentNotice(error?.message || "Unable to load your wallets.");
    } finally {
      setLoadingWallets(false);
    }
  };

  const submitPayment = async () => {
    const amount = Math.max(toMoneyNumber(paymentAmount), 0);
    if (!localUserId) return setPaymentNotice("Unable to resolve the owner of this obligation.");
    if (!paymentWalletId || !selectedWallet) return setPaymentNotice("Choose a wallet for this payment.");
    if (amount <= 0) return setPaymentNotice("Enter a payment amount greater than zero.");
    if (isHistoricalPayment && !paymentDate) return setPaymentNotice("Choose the date you actually paid it.");
    if (requiresWalletDeduction && amount > selectedSpendable) {
      return setPaymentNotice("That wallet does not have enough spendable money for this payment.");
    }

    setPaying(true);
    setPaymentNotice("");
    try {
      await payDebtObligationFromWallet(localUserId, record.id, {
        walletId: paymentWalletId,
        amount,
        maxSpendable: selectedSpendable,
        dueDate: dueMeta.dueDate || null,
        referenceDate: isHistoricalPayment
          ? new Date(`${paymentDate}T12:00:00+08:00`)
          : new Date(),
        paidAt: isHistoricalPayment ? paymentDate : null,
        historical: isHistoricalPayment,
        walletAlreadyReflectsPayment:
          isHistoricalPayment && walletAlreadyReflectsPayment,
        deductWallet: requiresWalletDeduction,
      });
      const walletLabel = getWalletName(selectedWallet) || "wallet";
      if (isHistoricalPayment && walletAlreadyReflectsPayment) {
        setPaymentNotice(`${fmt(amount)} recorded as already paid. ${walletLabel} was not deducted again.`);
      } else if (isHistoricalPayment) {
        setPaymentNotice(`${fmt(amount)} recorded and deducted from ${walletLabel} to correct the balance.`);
      } else {
        setPaymentNotice(`${fmt(amount)} paid from ${walletLabel}.`);
      }
      setPaymentOpen(false);
    } catch (error) {
      setPaymentNotice(error?.message || "Unable to complete this payment.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <PremiumFinanceItemSurface tone={tone} className="p-3.5">
      <div className="grid grid-cols-[48px_minmax(0,1fr)_32px] items-start gap-3">
        <PremiumFinanceIconTile tone={tone}>
          <CreditCard className="h-5 w-5" />
        </PremiumFinanceIconTile>

        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[14px] font-black tracking-[-0.02em] text-white/92">
            {getDebtTitle(record)}
          </p>
          <p className={`mt-1.5 truncate text-[20px] font-black leading-none tracking-[-0.04em] ${amountMeta.className}`}>
            {fmt(amountMeta.amount)}
          </p>
          <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
            {amountMeta.label}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEdit(record)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.055] text-white/78 transition hover:border-white/28 hover:bg-white/[0.10] hover:text-white"
          aria-label={`Edit ${getDebtTitle(record)}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-1">
        <PremiumFinanceInfoRow
          label="Setup"
          value={mode === "recurring" ? "Recurring monthly" : "Balance payoff"}
        />
        <PremiumFinanceInfoRow
          label="Debt type"
          value={getDebtTypeLabel(record.debtType || record.type)}
          className="border-t border-white/[0.055]"
        />
        {dueMeta.label ? (
          <PremiumFinanceInfoRow
            label="Due schedule"
            value={dueMeta.label}
            valueClassName={["overdue", "due_today"].includes(dueMeta.state) ? "text-rose-200" : "text-white/78"}
            className="border-t border-white/[0.055]"
          />
        ) : null}
        <PremiumFinanceInfoRow
          label="Monthly payment"
          value={monthly > 0 ? fmt(monthly) : "Not set"}
          valueClassName={monthly > 0 ? "text-cyan-100" : "text-white/42"}
          className="border-t border-white/[0.055]"
        />
        {latestPaidOccurrence ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.055] py-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Last paid period</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {latestPaidOccurrence.label} · Paid
            </span>
          </div>
        ) : null}
        {hasPartialCurrentOccurrence ? (
          <PremiumFinanceInfoRow
            label="This period"
            value={`${fmt(currentOccurrencePaidAmount)} of ${fmt(currentOccurrenceExpected)} paid`}
            valueClassName="text-amber-200"
            className="border-t border-white/[0.055]"
          />
        ) : null}
        {mode === "balance" && interest > 0 ? (
          <PremiumFinanceInfoRow
            label="Interest"
            value={`${interest}%`}
            valueClassName={interest >= 15 ? "text-amber-200" : "text-white/78"}
            className="border-t border-white/[0.055]"
          />
        ) : null}
        {mode === "balance" && payoffMonths === Number.POSITIVE_INFINITY ? (
          <PremiumFinanceInfoRow
            label="Estimated payoff"
            value="Payment does not cover interest"
            valueClassName="text-rose-200"
            className="border-t border-white/[0.055]"
          />
        ) : mode === "balance" && payoffMonths > 0 ? (
          <PremiumFinanceInfoRow
            label="Estimated payoff"
            value={`Around ${payoffMonths} month${payoffMonths === 1 ? "" : "s"}`}
            className="border-t border-white/[0.055]"
          />
        ) : null}

        {canPay ? (
          <button
            type="button"
            disabled={loadingWallets || paying}
            onClick={openPayment}
            className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"
          >
            {loadingWallets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loadingWallets ? "Loading wallets..." : "Pay Obligation"}
          </button>
        ) : null}

        {paymentOpen ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.045] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-white/90">Pay {getDebtTitle(record)}</p>
                <p className="mt-1 text-[10px] font-semibold leading-4 text-white/45">
                  {isHistoricalPayment
                    ? "Already paid it in real life? Log it here without paying twice."
                    : "Partial payments are allowed. CLARA will deduct only the amount you enter."}
                </p>
              </div>
              <button
                type="button"
                disabled={paying}
                onClick={() => setPaymentOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/[0.15] text-white/60 disabled:opacity-45"
                aria-label="Close payment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.07] bg-black/[0.16] p-1">
              <button
                type="button"
                disabled={paying}
                onClick={() => {
                  setPaymentMode("now");
                  setPaymentNotice("");
                }}
                className={`min-h-[36px] rounded-lg px-2 text-[10px] font-black transition ${
                  !isHistoricalPayment
                    ? "bg-emerald-400/[0.13] text-emerald-100 ring-1 ring-emerald-300/20"
                    : "text-white/45"
                }`}
              >
                Pay now
              </button>
              <button
                type="button"
                disabled={paying}
                onClick={() => {
                  setPaymentMode("already_paid");
                  setWalletAlreadyReflectsPayment(true);
                  setPaymentDate((value) => value || paymentDateMax);
                  setPaymentNotice("");
                }}
                className={`min-h-[36px] rounded-lg px-2 text-[10px] font-black transition ${
                  isHistoricalPayment
                    ? "bg-cyan-400/[0.13] text-cyan-100 ring-1 ring-cyan-300/20"
                    : "text-white/45"
                }`}
              >
                Already paid
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {isHistoricalPayment ? (
                <div>
                  <label htmlFor={`debt-payment-date-${record.id}`} className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
                    Date actually paid
                  </label>
                  <input
                    id={`debt-payment-date-${record.id}`}
                    type="date"
                    value={paymentDate}
                    max={paymentDateMax}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    disabled={paying}
                    className={paymentFieldClass}
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor={`debt-payment-wallet-${record.id}`} className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
                  {isHistoricalPayment ? "Wallet used" : "Pay from wallet"}
                </label>
                <select
                  id={`debt-payment-wallet-${record.id}`}
                  value={paymentWalletId}
                  onChange={(event) => setPaymentWalletId(event.target.value)}
                  disabled={paying || loadingWallets || !paymentWallets.length}
                  className={paymentFieldClass}
                >
                  {!paymentWallets.length ? <option value="">No spendable wallets</option> : null}
                  {paymentWallets.map((wallet) => {
                    const walletId = getWalletId(wallet);
                    const spendable = getWalletSpendableBalance(wallet);
                    const current = getWalletCurrentBalance(wallet);
                    return (
                      <option
                        key={walletId}
                        value={walletId}
                        disabled={requiresWalletDeduction && spendable <= 0}
                        className="bg-slate-950"
                      >
                        {getWalletName(wallet) || "Wallet"} — {fmt(spendable)} available{current !== spendable ? ` of ${fmt(current)}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {isHistoricalPayment ? (
                <div className="rounded-xl border border-cyan-300/12 bg-cyan-400/[0.035] p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/70">
                    Is this payment already reflected in your current wallet balance?
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={paying}
                      onClick={() => setWalletAlreadyReflectsPayment(true)}
                      className={`min-h-[42px] rounded-xl border px-2 text-[9px] font-black leading-4 transition ${
                        walletAlreadyReflectsPayment
                          ? "border-cyan-300/28 bg-cyan-400/[0.10] text-cyan-100"
                          : "border-white/[0.07] bg-black/[0.12] text-white/42"
                      }`}
                    >
                      Yes · don’t deduct again
                    </button>
                    <button
                      type="button"
                      disabled={paying}
                      onClick={() => setWalletAlreadyReflectsPayment(false)}
                      className={`min-h-[42px] rounded-xl border px-2 text-[9px] font-black leading-4 transition ${
                        !walletAlreadyReflectsPayment
                          ? "border-amber-300/28 bg-amber-400/[0.10] text-amber-100"
                          : "border-white/[0.07] bg-black/[0.12] text-white/42"
                      }`}
                    >
                      No · correct wallet now
                    </button>
                  </div>
                  <p className="mt-2 text-[9px] font-semibold leading-4 text-white/38">
                    Choose Yes when your current wallet amount already includes this old payment. CLARA will record it but leave Money Left unchanged.
                  </p>
                </div>
              ) : null}

              <div>
                <label htmlFor={`debt-payment-amount-${record.id}`} className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
                  Payment amount
                </label>
                <input
                  id={`debt-payment-amount-${record.id}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  disabled={paying}
                  className={paymentFieldClass}
                  placeholder="0"
                />
              </div>
            </div>

            {paymentNotice ? (
              <p className="mt-2.5 text-[10px] font-semibold leading-5 text-white/58">{paymentNotice}</p>
            ) : null}

            <button
              type="button"
              disabled={
                paying ||
                loadingWallets ||
                !paymentWalletId ||
                toMoneyNumber(paymentAmount) <= 0 ||
                (isHistoricalPayment && !paymentDate)
              }
              onClick={submitPayment}
              className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.11] px-3 text-[11px] font-black text-emerald-100 disabled:opacity-40"
            >
              {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {paying
                ? isHistoricalPayment
                  ? "Recording..."
                  : "Paying..."
                : isHistoricalPayment
                  ? "Record Payment"
                  : "Confirm Payment"}
            </button>
          </div>
        ) : null}

        {!paymentOpen && paymentNotice ? (
          <p className="mt-2.5 text-[10px] font-semibold leading-5 text-emerald-200/80">{paymentNotice}</p>
        ) : null}
      </div>
    </PremiumFinanceItemSurface>
  );
}
