import { CreditCard, Edit3 } from "lucide-react";

import { fmt, getDebtTypeLabel } from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import { getFinanceItemHierarchyTone } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import { getDebtTitle, toDebtNumber } from "@/lib/debtObligationStore";

export const getObligationBalance = (record) =>
  toDebtNumber(record?.totalDebt ?? record?.balance ?? record?.amount ?? 0);

export const getObligationMonthly = (record) =>
  toDebtNumber(record?.monthlyDebt ?? record?.monthlyPayment ?? record?.monthly_payment ?? 0);

export const getObligationInterest = (record) =>
  toDebtNumber(record?.interestRate ?? record?.interest_rate ?? record?.interest ?? 0);

function getSafeDueMeta(record) {
  const raw = record?.dueDate || record?.due_date || "";
  if (!raw) return { label: "", state: "none" };

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw))
    ? new Date(`${raw}T23:59:59`)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return { label: String(raw), state: "invalid" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(date);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.ceil((dueDay.getTime() - today.getTime()) / 86400000);

  if (days < 0) return { label: String(raw), state: "overdue" };
  if (days <= 14) return { label: String(raw), state: "due_soon" };
  return { label: String(raw), state: "scheduled" };
}

function getDebtAmountMeta({ balance, interest, dueState }) {
  if (balance <= 0) return { className: "text-emerald-200", label: "Paid" };
  if (dueState === "overdue") return { className: "text-rose-200", label: "Overdue balance" };
  if (dueState === "due_soon" || interest >= 15) return { className: "text-amber-200", label: "Outstanding balance" };
  return { className: "text-white/94", label: "Outstanding balance" };
}

export default function DebtObligationItem({ record, totalPositiveDebt, onEdit }) {
  const balance = getObligationBalance(record);
  const monthly = getObligationMonthly(record);
  const interest = getObligationInterest(record);
  const months = monthly > 0 && balance > 0 ? Math.ceil(balance / monthly) : 0;
  const tone = getFinanceItemHierarchyTone(balance, totalPositiveDebt);
  const dueMeta = getSafeDueMeta(record);
  const amountMeta = getDebtAmountMeta({ balance, interest, dueState: dueMeta.state });

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
            {fmt(balance)}
          </p>
          <p className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${dueMeta.state === "overdue" ? "text-rose-200/78" : "text-white/38"}`}>
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
          label="Debt type"
          value={getDebtTypeLabel(record.debtType || record.type)}
        />
        {dueMeta.label ? (
          <PremiumFinanceInfoRow
            label="Due date"
            value={dueMeta.label}
            valueClassName={
              dueMeta.state === "overdue"
                ? "text-rose-200"
                : dueMeta.state === "due_soon"
                  ? "text-amber-200"
                  : "text-white/78"
            }
            className="border-t border-white/[0.055]"
          />
        ) : null}
        <PremiumFinanceInfoRow
          label="Monthly payment"
          value={monthly > 0 ? fmt(monthly) : "Not set"}
          valueClassName={monthly > 0 ? "text-cyan-100" : "text-white/42"}
          className="border-t border-white/[0.055]"
        />
        {interest > 0 ? (
          <PremiumFinanceInfoRow
            label="Interest"
            value={`${interest}%`}
            valueClassName={interest >= 15 ? "text-amber-200" : "text-white/78"}
            className="border-t border-white/[0.055]"
          />
        ) : null}
        {months > 0 ? (
          <PremiumFinanceInfoRow
            label="Estimated payoff"
            value={`Around ${months} month${months === 1 ? "" : "s"}`}
            className="border-t border-white/[0.055]"
          />
        ) : null}
      </div>
    </PremiumFinanceItemSurface>
  );
}
