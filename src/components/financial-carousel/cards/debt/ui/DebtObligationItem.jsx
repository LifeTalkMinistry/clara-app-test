import { CreditCard, Edit3 } from "lucide-react";

import { fmt, getDebtTypeLabel } from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import { getFinanceItemHierarchyTone } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import { getDebtTitle } from "@/lib/debtObligationStore";
import { getDebtOccurrenceState } from "@/lib/debtOccurrenceState";
import {
  estimateDebtPayoffMonths,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligationMode,
  getDebtStatus,
  getMonthlyDebtPayment,
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

export default function DebtObligationItem({ record, totalPositiveDebt, onEdit, onPay, paying = false }) {
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
  const canPay =
    !["paid", "completed", "closed"].includes(status) &&
    monthly > 0 &&
    Boolean(dueMeta.dueDate);

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
            disabled={paying}
            onClick={() => onPay?.(record, dueMeta.dueDate)}
            className="mt-3 flex min-h-[42px] w-full items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"
          >
            {paying ? "Processing payment..." : "Pay Obligation"}
          </button>
        ) : null}
      </div>
    </PremiumFinanceItemSurface>
  );
}
