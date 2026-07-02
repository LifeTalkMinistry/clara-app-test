import {
  getRecurringBills,
  normalizeRecurrenceRule,
  toLocalDateKey,
  upsertRecurringBill,
} from "@/lib/recurringCashFlowRepository";
import { getPHMonthKey } from "@/utils/dashboard/dashboardHelpers";
import { recurringBillToDraft } from "./recurringBudgetDomEnhancer";
import {
  cleanRecurringBudgetMoney,
  cleanRecurringBudgetText,
} from "./recurringBudgetIntegration";

function findExistingBill(ownerId, title, billId = "") {
  const bills = getRecurringBills(ownerId);
  if (billId) {
    const linked = bills.find((bill) => String(bill.id) === String(billId));
    if (linked) return linked;
  }

  const normalizedTitle = cleanRecurringBudgetText(title).toLowerCase();
  return (
    bills.find(
      (bill) =>
        cleanRecurringBudgetText(
          bill.sourceBudgetTitle || bill.source_budget_title || bill.title
        ).toLowerCase() === normalizedTitle
    ) || null
  );
}

export function saveRecurringBillFromBudget({ ownerId, draft, financeForm }) {
  if (draft?.itemType !== "bill" || !draft?.makeRecurringBill) return null;

  const title = cleanRecurringBudgetText(
    financeForm?.budgetCategoryName || financeForm?.title
  );
  const expectedAmount = cleanRecurringBudgetMoney(financeForm?.totalBudget);
  const dueDate = draft.dueDate || toLocalDateKey(new Date());
  const due = new Date(`${dueDate}T12:00:00`);
  const existingBill = findExistingBill(ownerId, title, draft.billId);

  const bill = upsertRecurringBill(ownerId, {
    ...(existingBill || {}),
    id: existingBill?.id,
    title,
    expectedAmount,
    amountType: draft.amountType,
    dueDate,
    recurrence: normalizeRecurrenceRule(
      {
        type: draft.recurrence,
        startDate: dueDate,
        dayOfWeek: due.getDay(),
        dayOfMonth: due.getDate(),
      },
      { kind: "bill", fallbackDate: dueDate }
    ),
    autoIncludeInBudget: draft.autoIncludeInBudget,
    active: true,
    createdOrigin: "budget",
    sourceBudgetMonth: getPHMonthKey(),
    sourceBudgetTitle: title,
    categoryReference: "Bill",
  });

  return { bill, draft: recurringBillToDraft(bill) };
}
