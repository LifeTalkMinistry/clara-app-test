import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  getBillOccurrencesForRange,
  getRecurringBills,
  toLocalDateKey,
  upsertRecurringBill,
} from "@/lib/recurringCashFlowRepository";

export const RECURRING_SCHEDULE_WINDOW_MONTHS = 24;
const SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";

export function dispatchRecurringBillOccurrences(ownerId, bill) {
  if (!bill?.id) return;
  const now = new Date();
  const rangeEnd = toLocalDateKey(
    new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())
  );

  getBillOccurrencesForRange(ownerId, toLocalDateKey(now), rangeEnd)
    .filter((occurrence) => String(occurrence.id) === String(bill.id))
    .filter(
      (occurrence) =>
        occurrence.occurrenceDueDate !==
        (bill.scheduleBaseDate || bill.schedule_base_date || "")
    )
    .forEach((occurrence) =>
      dispatchClaraEvent(SCHEDULE_CREATE_EVENT, {
        id: `recurring-schedule-${occurrence.id}-${occurrence.occurrenceDueDate}`,
        title: occurrence.title,
        date: occurrence.occurrenceDueDate,
        time: occurrence.time || "",
        type: "Bill",
        amount: occurrence.expectedAmount,
        note: occurrence.description || "Recurring bill.",
        impactBreakdown: [],
      })
    );
}

export function syncRecurringBillsIntoSchedule(ownerId) {
  getRecurringBills(ownerId).forEach((bill) =>
    dispatchRecurringBillOccurrences(ownerId, bill)
  );
}

export function saveRecurringScheduleBill(ownerId, draft, amountOverride = 0) {
  if (!draft?.title) return null;
  const bill = upsertRecurringBill(ownerId, {
    ...draft,
    expectedAmount: draft.expectedAmount || Number(amountOverride || 0),
  });
  dispatchRecurringBillOccurrences(ownerId, bill);
  return bill;
}
