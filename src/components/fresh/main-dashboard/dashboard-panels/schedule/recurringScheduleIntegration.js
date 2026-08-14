import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import { getIncomeSources } from "@/lib/incomeHubRepository";
import {
  getBillOccurrencesForRange,
  getIncomeTimingRecords,
  getRecurrenceOccurrences,
  getRecurringBills,
  toLocalDateKey,
  upsertRecurringBill,
} from "@/lib/recurringCashFlowRepository";

export const RECURRING_SCHEDULE_WINDOW_MONTHS = 12;
const SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
const SCHEDULE_SYNC_INCOME_EVENT = "clara:schedule:sync-income-events";
const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const INCOME_SCHEDULE_ID_PREFIX = "income-schedule-";
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
  const end = new Date(now);
  end.setMonth(end.getMonth() + RECURRING_SCHEDULE_WINDOW_MONTHS);

  return {
    start: toLocalDateKey(now),
    end: toLocalDateKey(end),
  };
}

function stableMinimumAmount(source = {}) {
  if (String(source?.stability || "").trim().toLowerCase() !== "stable") return 0;
  const value =
    source?.minimumStableIncome ??
    source?.minimum_stable_income ??
    source?.minimumExpectedIncome ??
    source?.minimum_expected_income ??
    source?.expectedAmount ??
    source?.expected_amount;
  const amount = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function scheduleStorageKey(ownerId) {
  return `${SCHEDULE_STORAGE_PREFIX}_${String(ownerId || "guest").trim() || "guest"}`;
}

function readStoredSchedule(ownerId) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(scheduleStorageKey(ownerId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistIncomeScheduleProjection(ownerId, projectedEvents) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const retained = readStoredSchedule(ownerId).filter(
      (event) => !String(event?.id || "").startsWith(INCOME_SCHEDULE_ID_PREFIX)
    );
    window.localStorage.setItem(
      scheduleStorageKey(ownerId),
      JSON.stringify([...retained, ...projectedEvents])
    );
  } catch (error) {
    console.warn("CLARA income Schedule projection could not be persisted:", error);
  }
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

export async function dispatchIncomeTimingOccurrences(ownerId) {
  const { start, end } = getScheduleProjectionRange();
  let incomeSources = [];

  try {
    incomeSources = await getIncomeSources(ownerId);
  } catch (error) {
    console.warn("CLARA income source amounts could not be loaded for Schedule projection:", error);
  }

  const sourceById = new Map(
    (Array.isArray(incomeSources) ? incomeSources : [])
      .filter((source) => source?.id)
      .map((source) => [String(source.id), source])
  );

  const projectedEvents = getIncomeTimingRecords(ownerId).flatMap((timing) => {
    const sourceId = String(timing.incomeSourceId || timing.income_source_id || timing.id || "income");
    const sourceName = String(timing.sourceName || timing.source_name || "Expected income").trim() || "Expected income";
    const incomeSource = sourceById.get(sourceId) || null;
    const minimumAmount = stableMinimumAmount(incomeSource);

    return getRecurrenceOccurrences(
      timing.recurrence || timing.recurrence_rule,
      start,
      end,
      { kind: "income" }
    ).map((date) => ({
      id: `${INCOME_SCHEDULE_ID_PREFIX}${sourceId}-${date}`,
      title: sourceName,
      date,
      time: "",
      type: "Payday",
      amount: minimumAmount > 0 ? minimumAmount : "",
      note: minimumAmount > 0
        ? `At least ₱${minimumAmount.toLocaleString("en-PH", { maximumFractionDigits: 2 })} is expected from ${sourceName}. This is the conservative stable-income floor; actual received money remains owned by Income Hub.`
        : `Expected income from ${sourceName}. CLARA uses this schedule for payday timing; actual received money remains owned by Income Hub.`,
      impactBreakdown: minimumAmount > 0
        ? [{ direction: "in", amount: minimumAmount, source: "stable_income_minimum" }]
        : [{ direction: "in", pendingAmount: true, source: "income_timing" }],
      source: "income_timing_projection",
      incomeSourceId: sourceId,
      income_source_id: sourceId,
    }));
  });

  // Persist the exact rolling 12-month projection so Schedule remains correct
  // even when Income Hub and Schedule are not mounted at the same time.
  // Replacing all managed income projections also removes stale dates after an edit.
  persistIncomeScheduleProjection(ownerId, projectedEvents);

  // If Schedule is currently mounted, replace its managed payday rows immediately.
  dispatchClaraEvent(SCHEDULE_SYNC_INCOME_EVENT, { events: projectedEvents });

  return projectedEvents;
}

export async function syncRecurringBillsIntoSchedule(ownerId) {
  getRecurringBills(ownerId).forEach((bill) =>
    dispatchRecurringBillOccurrences(ownerId, bill)
  );
  await dispatchIncomeTimingOccurrences(ownerId);
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
