import { normalizeFinancialDateKey } from "./clara-financial-day.js";

const text = (value) => String(value ?? "").trim();

function exactDateKey(value) {
  const candidate = text(value).slice(0, 10);
  return candidate ? normalizeFinancialDateKey(candidate) : "";
}

export function getExplicitMeansRequirementKey(record = {}) {
  return text(
    record?.meansRequirementKey ||
      record?.means_requirement_key ||
      record?.plannedRequirementKey ||
      record?.planned_requirement_key ||
      record?.requirementKey ||
      record?.requirement_key
  );
}

export function buildDeterministicMeansScheduleEventDateIndex(events = []) {
  const byId = new Map();
  const conflicts = new Set();

  (Array.isArray(events) ? events : []).forEach((event) => {
    const id = text(event?.id);
    const date = exactDateKey(event?.date);
    if (!id || !date) return;

    const current = byId.get(id);
    if (current && current !== date) conflicts.add(id);
    else byId.set(id, date);
  });

  conflicts.forEach((id) => byId.delete(id));
  return { byId, conflicts };
}

export function deriveDeterministicLegacyMeansRequirementIdentity(
  record = {},
  { scheduleEventDates = new Map() } = {}
) {
  const debtId = text(
    record?.debtId ||
      record?.debt_id ||
      record?.obligationId ||
      record?.obligation_id
  );
  const dueDate = exactDateKey(
    record?.dueDate ||
      record?.due_date ||
      record?.dueOccurrenceDate ||
      record?.due_occurrence_date
  );
  if (debtId && dueDate) {
    return { key: `debt:${debtId}:${dueDate}`, evidence: "debt_id_due_date" };
  }

  const eventId = text(
    record?.moneyScheduleEventId ||
      record?.money_schedule_event_id ||
      record?.scheduleEventId ||
      record?.schedule_event_id
  );
  const eventDate = exactDateKey(
    record?.occurrenceDate ||
      record?.occurrence_date ||
      record?.scheduledDate ||
      record?.scheduled_date ||
      scheduleEventDates.get(eventId)
  );
  if (eventId && eventDate) {
    return {
      key: `money-schedule:${eventId}:${eventDate}`,
      evidence: "schedule_event_id_occurrence",
    };
  }

  const routineId = text(
    record?.routineId ||
      record?.routine_id ||
      record?.moneyRoutineId ||
      record?.money_routine_id
  );
  const routineDate = exactDateKey(
    record?.occurrenceDate ||
      record?.occurrence_date ||
      record?.scheduledDate ||
      record?.scheduled_date
  );
  if (routineId && routineDate) {
    return {
      key: `money-routine:${routineId}:${routineDate}`,
      evidence: "routine_id_occurrence",
    };
  }

  return null;
}

export function deriveDeterministicLegacyMeansRequirementKey(record = {}, options = {}) {
  return deriveDeterministicLegacyMeansRequirementIdentity(record, options)?.key || "";
}
