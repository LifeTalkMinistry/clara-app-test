import { CreditCard, Edit3 } from "lucide-react";

import { fmt, getDebtTypeLabel } from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import { getFinanceItemHierarchyTone } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import { getDebtTitle } from "@/lib/debtObligationStore";
import {
  estimateDebtPayoffMonths,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligationMode,
  getDebtStatus,
  getMonthlyDebtPayment,
  getNextDebtDueDate,
} from "@/lib/debtObligationMath";

export const getObligationBalance = (record) => getDebtBalance(record);
export const getObligationMonthly = (record) => getMonthlyDebtPayment(record);
export const getObligationInterest = (record) => getDebtInterestRate(record);

const ordinal = (day) => {
  const value = Number(day) || 0;
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
};

function getSafeDueMeta(record) {
  const dueDay = getDebtDueDay(record);
  if (!dueDay) return { label: "", state: "none" };
  const next = getNextDebtDueDate(record);
  if (!next) return { label: `Every ${ordinal(dueDay)}`, state: "invalid" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(next);
  due.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  const nextLabel = due.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return {
    label: `Every ${ordinal(dueDay)} · Next ${nextLabel}`,
    state: days <= 14 ? "due_soon" : "scheduled",
  };
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

export default function DebtObligationItem({ record, totalPositiveDebt, onEdit }) {
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
  const amountMeta = getDebtAmountMeta({
    mode,
    balance,
    monthly,
    interest,
    dueState: dueMeta.state,
    status,
  });

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
            valueClassName={dueMeta.state === "due_soon" ? "text-amber-200" : "text-white/78"}
            className="border-t border-white/[0.055]"
          />
        ) : null}
        <PremiumFinanceInfoRow
          label="Monthly payment"
          value={monthly > 0 ? fmt(monthly) : "Not set"}
          valueClassName={monthly > 0 ? "text-cyan-100" : "text-white/42"}
          className="border-t border-white/[0.055]"
        />
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
      </div>
    </PremiumFinanceItemSurface>
  );
}
