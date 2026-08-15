import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import { getIncomeSources } from "@/lib/incomeHubRepository";
import { buildCanonicalStableIncomeTimingSource } from "@/lib/stableIncomeTimingAuthority";
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

function getRecurringBillProjectionRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now);
  end.setMonth(end.getMonth() + RECURRING_SCHEDULE_WINDOW_MONTHS);

  return {
    start: toLocalDateKey(start),
    end: toLocalDateKey(end),
  };
}

function getIncomeScheduleProjectionRange() {
  const currentYear = new Date().getFullYear();
  return {
    start: toLocalDateKey(new Date(currentYear, 0, 1)),
    end: toLocalDateKey(new Date(currentYear, 11, 31)),
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

function timingSourceId(timing = {}) {
  return String(
    timing?.incomeSourceId ||
      timing?.income_source_id ||
      timing?.id ||
      ""
  ).trim();
}

function stableTimingFromIncomeSource(source = {}) {
  const canonicalSource = buildCanonicalStableIncomeTimingSource(source);
  if (!canonicalSource) return null;

  const sourceId = String(canonicalSource.id || "").trim();
  if (!sourceId) return null;

  const sourceName =
    String(canonicalSource.name || canonicalSource.title || "Expected income").trim() ||
    "Expected income";
  const recurrence =
    canonicalSource.incomeRecurrence || canonicalSource.income_recurrence || null;

  if (!recurrence) return null;

  return {
    id: sourceId,
    incomeSourceId: sourceId,
    income_source_id: sourceId,
    sourceName,
    source_name: sourceName,
    recurrence,
    recurrence_rule: recurrence,
    useForBudgetTiming: canonicalSource.useForBudgetTiming !== false,
    use_for_budget_timing: canonicalSource.use_for_budget_timing !== false,
    projectionSource: "income_hub_stable_source",
  };
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
  const { start, end } = getRecurringBillProjectionRange();

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
  const { start, end } = getIncomeScheduleProjectionRange();
  let incomeSources = [];

  try {
    // Income Hub owns Stable Income recurrence. Its read may intentionally
    // resolve through a translated local data owner (for example sample/current
    // state), so Schedule must project from the returned source records rather
    // than assuming the derived timing cache uses the same ownerId.
    incomeSources = await getIncomeSources(ownerId);
  } catch (error) {
    console.warn("CLARA income sources could not be loaded for Schedule projection:", error);
  }

  const safeIncomeSources = Array.isArray(incomeSources) ? incomeSources : [];
  const sourceById = new Map(
    safeIncomeSources
      .filter((source) => source?.id)
      .map((source) => [String(source.id), source])
  );

  // Stable Income is projected directly from the canonical Income Hub records.
  // The local incomeTimings cache remains a compatibility source for any timing
  // that is not represented by a canonical Stable Income source.
  const canonicalStableTimings = safeIncomeSources
    .map(stableTimingFromIncomeSource)
    .filter(Boolean);
  const canonicalStableIds = new Set(
    canonicalStableTimings.map(timingSourceId).filter(Boolean)
  );
  const compatibilityTimings = getIncomeTimingRecords(ownerId).filter(
    (timing) => !canonicalStableIds.has(timingSourceId(timing))
  );
  const projectionTimings = [
    ...canonicalStableTimings,
    ...compatibilityTimings,
  ];

  const projectedEvents = projectionTimings.flatMap((timing) => {
    const sourceId = timingSourceId(timing) || "income";
    const sourceName =
      String(timing.sourceName || timing.source_name || "Expected income").trim() ||
      "Expected income";
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
      source: timing.projectionSource || "income_timing_projection",
      incomeSourceId: sourceId,
      income_source_id: sourceId,
    }));
  });

  // Replace only CLARA-managed income projections. User-created schedule items,
  // bills, holidays, and other event types remain untouched.
  persistIncomeScheduleProjection(ownerId, projectedEvents);

  // Income projection uses one replacement signal instead of appending through
  // create-event. This makes payday edits remove stale managed dates in-memory
  // as well as in localStorage.
  dispatchClaraEvent(SCHEDULE_SYNC_INCOME_EVENT, {
    ownerId,
    events: projectedEvents,
  });

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
