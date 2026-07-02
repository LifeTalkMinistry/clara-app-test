import { useState } from "react";
import {
  setRecurringBillAutoInclude,
  skipRecurringBillOccurrence,
  updateRecurringBillOccurrence,
  upsertRecurringBill,
} from "@/lib/recurringCashFlowRepository";
import { recurringBudgetInputClass } from "./recurringBudgetDomEnhancer";

function cleanMoney(value) {
  const number = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export default function RecurringBillOccurrenceActions({ context, onClose }) {
  const [amount, setAmount] = useState(String(context?.occurrence?.expectedAmount || context?.bill?.expectedAmount || ""));
  if (!context) return null;

  const { ownerId, bill, occurrence } = context;
  const dueDate = occurrence.occurrenceDueDate || occurrence.occurrence_due_date;

  const saveOccurrence = () => {
    updateRecurringBillOccurrence(ownerId, bill.id, dueDate, {
      expectedAmount: cleanMoney(amount),
      title: occurrence.title,
    });
    onClose();
  };

  const updateFuture = () => {
    updateRecurringBillOccurrence(ownerId, bill.id, dueDate, {
      expectedAmount: occurrence.expectedAmount,
      title: occurrence.title,
    });
    upsertRecurringBill(ownerId, { ...bill, expectedAmount: cleanMoney(amount) });
    onClose();
  };

  const skipOccurrence = () => {
    skipRecurringBillOccurrence(ownerId, bill.id, dueDate);
    onClose();
  };

  const stopFuture = () => {
    setRecurringBillAutoInclude(ownerId, bill.id, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-end justify-center bg-[#020713]/82 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[32px] border border-white/15 bg-[#07111f] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:rounded-[32px]">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/70">Recurring bill</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight">{occurrence.title}</h3>
        <p className="mt-1 text-sm font-semibold text-white/48">Due {dueDate}</p>

        <label className="mt-5 block space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/48">Amount</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={recurringBudgetInputClass} />
        </label>

        <div className="mt-5 space-y-2">
          <button type="button" onClick={saveOccurrence} className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white">Edit this budget occurrence only</button>
          <button type="button" onClick={updateFuture} className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-50">Update future recurring bills</button>
          <button type="button" onClick={skipOccurrence} className="w-full rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-50">Skip this occurrence</button>
          <button type="button" onClick={stopFuture} className="w-full rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-50">Stop including in future budgets</button>
          <button type="button" onClick={onClose} className="w-full rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/70">Cancel</button>
        </div>
      </div>
    </div>
  );
}
