import {
  getBillOccurrencesForRange,
  getRecurringBills,
} from "@/lib/recurringCashFlowRepository";
import { getPHMonthRange } from "@/utils/dashboard/dashboardHelpers";
import {
  cleanRecurringBudgetMoney,
  cleanRecurringBudgetText,
} from "./recurringBudgetIntegration";

export function findRecurringBudgetOccurrence(ownerId, item) {
  const record = item?.budget || item || {};
  const linkedBillId = cleanRecurringBudgetText(record.recurringBillId || record.recurring_bill_id);
  const linkedDueDate = cleanRecurringBudgetText(record.occurrenceDueDate || record.occurrence_due_date);

  if (linkedBillId && linkedDueDate) {
    const bill = getRecurringBills(ownerId).find((entry) => String(entry.id) === linkedBillId) || null;
    return bill
      ? {
          bill,
          occurrence: {
            ...bill,
            title: record.title || bill.title,
            occurrenceDueDate: linkedDueDate,
            expectedAmount: cleanRecurringBudgetMoney(
              record.allocated_amount || record.amount || bill.expectedAmount
            ),
          },
        }
      : null;
  }

  const range = getPHMonthRange();
  const title = cleanRecurringBudgetText(record.title || record.name || record.category).toLowerCase();
  const amount = cleanRecurringBudgetMoney(record.allocated || record.allocated_amount || record.amount);
  const occurrence = getBillOccurrencesForRange(
    ownerId,
    range.start,
    range.end,
    { includeBudgetDisabled: false }
  ).find(
    (entry) =>
      cleanRecurringBudgetText(entry.title).toLowerCase() === title &&
      (!amount || cleanRecurringBudgetMoney(entry.expectedAmount) === amount)
  );

  if (!occurrence) return null;
  const bill =
    getRecurringBills(ownerId).find((entry) => String(entry.id) === String(occurrence.id)) ||
    occurrence;
  return { bill, occurrence };
}
