import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  getBillOccurrencesForRange,
  getIncomeTimingRecords,
  getRecurrenceOccurrences,
  getRecurringBills,
  toLocalDateKey,
  upsertRecurringBill,
} from "@/lib/recurringCashFlowRepository";

export const RECURRING_SCHEDULE_WINDOW_MONTHS = 24;
const SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
const SCHEDULE_AGENDA_BREATHING_ROOM_STYLE_ID = "clara-schedule-agenda-breathing-room";

function installScheduleAgendaBreathingRoomStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCHEDULE_AGENDA_BREATHING_ROOM_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = SCHEDULE_AGENDA_BREATHING_ROOM_STYLE_ID;
  style.textContent = `
    button[class*="min-h-[clamp(106px"] > div.relative.flex.h-full.w-full.items-center {
      gap: 0 !important;
    }

    button[class*="min-h-[clamp(106px"] > div.relative.flex.h-full.w-full.items-center > div:first-child {
      display: none !important;
    }

    button[class*="min-h-[clamp(106px"] > div.relative.flex.h-full.w-full.items-center > div:last-child {
      width: 100% !important;
      min-width: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

installScheduleAgendaBreathingRoomStyles();

function getScheduleProjectionRange() {
  const now = new Date();
  return {
    start: toLocalDateKey(now),
    end: toLocalDateKey(new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())),
  };
}

export function dispatchRecurringBillOccurrences(ownerId, bill) {
  if (!bill?.id) return;
  const { start, end } = getScheduleProjectionRange();

  getBillOccurrencesForRange(ownerId, start, end)
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

export function dispatchIncomeTimingOccurrences(ownerId) {
  const { start, end } = getScheduleProjectionRange();

  getIncomeTimingRecords(ownerId).forEach((timing) => {
    const sourceId = String(timing.incomeSourceId || timing.income_source_id || timing.id || "income");
    const sourceName = String(timing.sourceName || timing.source_name || "Expected income").trim() || "Expected income";

    getRecurrenceOccurrences(
      timing.recurrence || timing.recurrence_rule,
      start,
      end,
      { kind: "income" }
    ).forEach((date) =>
      dispatchClaraEvent(SCHEDULE_CREATE_EVENT, {
        id: `income-schedule-${sourceId}-${date}`,
        title: sourceName,
        date,
        time: "",
        type: "Payday",
        amount: "",
        note: `Expected income from ${sourceName}. CLARA uses this schedule for payday timing; actual received money remains owned by Income Hub.`,
        impactBreakdown: [],
      })
    );
  });
}

export function syncRecurringBillsIntoSchedule(ownerId) {
  getRecurringBills(ownerId).forEach((bill) =>
    dispatchRecurringBillOccurrences(ownerId, bill)
  );
  dispatchIncomeTimingOccurrences(ownerId);
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
