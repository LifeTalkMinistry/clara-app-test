const STORAGE_PREFIX = "clara_recurring_cash_flow_v1";
export const RECURRING_CASH_FLOW_UPDATED_EVENT = "clara:recurring-cash-flow-updated";

const DAY_MS = 24 * 60 * 60 * 1000;
const INCOME_RECURRENCES = new Set(["weekly", "biweekly", "twice_monthly", "monthly", "custom"]);
const BILL_RECURRENCES = new Set(["one_time", "weekly", "biweekly", "monthly", "custom"]);

const nowIso = () => new Date().toISOString();
const safeArray = (value) => (Array.isArray(value) ? value : []);
const cleanText = (value) => String(value || "").trim();
const cleanMoney = (value) => {
  const number = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

export function getRecurringCashFlowOwnerId(userOrId) {
  if (typeof userOrId === "string" || typeof userOrId === "number") {
    return cleanText(userOrId) || "local-user";
  }

  return cleanText(userOrId?.id || userOrId?.email || "local-user") || "local-user";
}

function storageKey(ownerId) {
  return `${STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(ownerId)}`;
}

function createId(prefix) {
  if (globalThis?.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : fromLocalDateKey(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromLocalDateKey(value) {
  if (value instanceof Date) return new Date(value);
  const match = cleanText(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? new Date(NaN) : fallback;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addLocalDays(value, days) {
  const date = fromLocalDateKey(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return toLocalDateKey(date);
}

function compareDateKeys(a, b) {
  return cleanText(a).localeCompare(cleanText(b));
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function clampMonthlyDate(year, monthIndex, day) {
  const safeDay = Math.max(1, Math.min(Number(day) || 1, daysInMonth(year, monthIndex)));
  return toLocalDateKey(new Date(year, monthIndex, safeDay));
}

function dateRange(start, end) {
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);
  return {
    start: compareDateKeys(startKey, endKey) <= 0 ? startKey : endKey,
    end: compareDateKeys(startKey, endKey) <= 0 ? endKey : startKey,
  };
}

function normalizeDayList(value) {
  const result = safeArray(value)
    .map((day) => Math.max(1, Math.min(31, Number(day) || 0)))
    .filter(Boolean);
  return [...new Set(result)].sort((a, b) => a - b);
}

function normalizeDateList(value) {
  return [...new Set(safeArray(value).map(toLocalDateKey).filter(Boolean))].sort(compareDateKeys);
}

export function normalizeRecurrenceRule(rule = {}, { kind = "bill", fallbackDate = "" } = {}) {
  const allowed = kind === "income" ? INCOME_RECURRENCES : BILL_RECURRENCES;
  const requestedType = cleanText(rule.type || rule.recurrence || rule.frequency).toLowerCase();
  const type = allowed.has(requestedType)
    ? requestedType
    : kind === "income"
      ? "monthly"
      : "one_time";
  const startDate = toLocalDateKey(rule.startDate || rule.start_date || fallbackDate || new Date());
  const dayOfWeek = Math.max(0, Math.min(6, Number(rule.dayOfWeek ?? rule.day_of_week ?? fromLocalDateKey(startDate).getDay()) || 0));
  const monthlyDays = normalizeDayList(rule.days || rule.monthlyDays || rule.monthly_days);
  const dayOfMonth = Math.max(1, Math.min(31, Number(rule.dayOfMonth ?? rule.day_of_month ?? monthlyDays[0] ?? fromLocalDateKey(startDate).getDate()) || 1));
  const customDates = normalizeDateList(rule.customDates || rule.custom_dates || rule.dates);

  return {
    type,
    startDate,
    start_date: startDate,
    dayOfWeek,
    day_of_week: dayOfWeek,
    dayOfMonth,
    day_of_month: dayOfMonth,
    days: type === "twice_monthly" ? (monthlyDays.length >= 2 ? monthlyDays.slice(0, 2) : [15, 30]) : monthlyDays,
    customDates,
    custom_dates: customDates,
  };
}

function firstWeekdayOnOrAfter(startKey, weekday) {
  const start = fromLocalDateKey(startKey);
  if (Number.isNaN(start.getTime())) return "";
  const offset = (Number(weekday) - start.getDay() + 7) % 7;
  start.setDate(start.getDate() + offset);
  return toLocalDateKey(start);
}

export function getRecurrenceOccurrences(ruleInput, rangeStart, rangeEnd, { kind = "bill" } = {}) {
  const range = dateRange(rangeStart, rangeEnd);
  const rule = normalizeRecurrenceRule(ruleInput, { kind, fallbackDate: range.start });
  const incomePatternBackfill =
    kind === "income" && ["weekly", "monthly", "twice_monthly"].includes(rule.type);
  const occurrences = [];
  const push = (dateKey) => {
    if (!dateKey || compareDateKeys(dateKey, range.start) < 0 || compareDateKeys(dateKey, range.end) > 0) return;
    // Stable-income setup records when the schedule was configured, but for calendar-pattern
    // income (weekly/monthly/twice-monthly) that date is not the first-ever payday. Backfill
    // the pattern inside the requested range so a newly configured account immediately has
    // both the previous and next payday needed to establish its active pay cycle.
    if (!incomePatternBackfill && compareDateKeys(dateKey, rule.startDate) < 0) return;
    occurrences.push(dateKey);
  };

  if (rule.type === "one_time") {
    push(rule.startDate);
  } else if (rule.type === "custom") {
    rule.customDates.forEach(push);
  } else if (rule.type === "weekly" || rule.type === "biweekly") {
    const step = rule.type === "biweekly" ? 14 : 7;
    let cursor = rule.type === "weekly"
      ? firstWeekdayOnOrAfter(incomePatternBackfill ? range.start : rule.startDate, rule.dayOfWeek)
      : rule.startDate;

    while (cursor && compareDateKeys(cursor, range.start) < 0) cursor = addLocalDays(cursor, step);
    while (cursor && compareDateKeys(cursor, range.end) <= 0) {
      push(cursor);
      cursor = addLocalDays(cursor, step);
    }
  } else {
    const startDate = fromLocalDateKey(range.start);
    const endDate = fromLocalDateKey(range.end);
    const monthlyDays = rule.type === "twice_monthly" ? rule.days : [rule.dayOfMonth];

    let year = startDate.getFullYear();
    let month = startDate.getMonth();
    while (year < endDate.getFullYear() || (year === endDate.getFullYear() && month <= endDate.getMonth())) {
      monthlyDays.forEach((day) => push(clampMonthlyDate(year, month, day)));
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }

  return [...new Set(occurrences)].sort(compareDateKeys);
}

function emptyState() {
  return {
    version: 1,
    incomeTimings: [],
    bills: [],
    skippedOccurrences: [],
    occurrenceOverrides: [],
    updatedAt: null,
  };
}

function normalizeState(value = {}) {
  return {
    ...emptyState(),
    ...value,
    version: 1,
    incomeTimings: safeArray(value.incomeTimings),
    bills: safeArray(value.bills),
    skippedOccurrences: safeArray(value.skippedOccurrences),
    occurrenceOverrides: safeArray(value.occurrenceOverrides),
  };
}

export function readRecurringCashFlow(ownerId) {
  if (typeof window === "undefined" || !window.localStorage) return emptyState();
  try {
    const raw = window.localStorage.getItem(storageKey(ownerId));
    return raw ? normalizeState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function emitUpdated(ownerId, reason, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECURRING_CASH_FLOW_UPDATED_EVENT, {
    detail: { ownerId: getRecurringCashFlowOwnerId(ownerId), reason, ...detail },
  }));
}

function writeState(ownerId, nextState, reason, detail = {}) {
  const next = normalizeState({ ...nextState, updatedAt: nowIso() });
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(storageKey(ownerId), JSON.stringify(next));
    emitUpdated(ownerId, reason, detail);
  }
  return next;
}

export function normalizeIncomeTiming(source = {}) {
  const enabled = source.usualIncomeDateEnabled === true || source.usual_income_date_enabled === true;
  const recurrenceSource = source.incomeRecurrence || source.income_recurrence || source.recurrenceRule || source.recurrence_rule || {};
  const recurrence = normalizeRecurrenceRule(recurrenceSource, {
    kind: "income",
    fallbackDate: source.expectedStartDate || source.expected_start_date || new Date(),
  });
  const useForBudgetTiming = source.useForBudgetTiming === true || source.use_for_budget_timing === true;

  return {
    id: cleanText(source.incomeTimingId || source.income_timing_id || source.id) || createId("income_timing"),
    incomeSourceId: cleanText(source.id || source.incomeSourceId || source.income_source_id),
    income_source_id: cleanText(source.id || source.incomeSourceId || source.income_source_id),
    sourceName: cleanText(source.name || source.title || "Income source"),
    source_name: cleanText(source.name || source.title || "Income source"),
    enabled,
    active: enabled && source.isArchived !== true && source.is_archived !== true,
    recurrence,
    recurrence_rule: recurrence,
    useForBudgetTiming,
    use_for_budget_timing: useForBudgetTiming,
    updatedAt: nowIso(),
    updated_at: nowIso(),
  };
}

export function syncIncomeTimingFromSource(ownerId, source = {}) {
  const current = readRecurringCashFlow(ownerId);
  const timing = normalizeIncomeTiming(source);
  const sourceId = timing.incomeSourceId;
  const existingIndex = current.incomeTimings.findIndex((item) => String(item.incomeSourceId || item.income_source_id) === sourceId);
  const nextTimings = [...current.incomeTimings];

  if (!timing.enabled) {
    if (existingIndex >= 0) nextTimings.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    nextTimings[existingIndex] = { ...nextTimings[existingIndex], ...timing, id: nextTimings[existingIndex].id || timing.id };
  } else {
    nextTimings.push(timing);
  }

  writeState(ownerId, { ...current, incomeTimings: nextTimings }, "income-timing-saved", { incomeSourceId: sourceId });
  return timing.enabled ? timing : null;
}

export function getIncomeTimingRecords(ownerId) {
  return readRecurringCashFlow(ownerId).incomeTimings.filter((item) => item?.active !== false && item?.enabled !== false);
}

export function formatOrdinal(value) {
  const number = Number(value) || 0;
  const remainder100 = number % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
}

export function formatIncomeTimingLabel(source = {}) {
  const timing = source.recurrence ? source : normalizeIncomeTiming(source);
  if (!timing?.enabled && source.usualIncomeDateEnabled !== true && source.usual_income_date_enabled !== true) return "";
  const rule = normalizeRecurrenceRule(timing.recurrence || timing.incomeRecurrence || timing.income_recurrence, { kind: "income" });

  if (rule.type === "weekly") {
    return `Every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][rule.dayOfWeek]}`;
  }
  if (rule.type === "biweekly") return `Every two weeks from ${rule.startDate}`;
  if (rule.type === "twice_monthly") return rule.days.map(formatOrdinal).join(" and ");
  if (rule.type === "monthly") return `Every ${formatOrdinal(rule.dayOfMonth)}`;
  if (rule.type === "custom") return rule.customDates.join(", ");
  return "";
}

export function getExpectedIncomeWindow(ownerId, referenceDate = new Date()) {
  const referenceKey = toLocalDateKey(referenceDate);
  const timings = getIncomeTimingRecords(ownerId).filter((item) => item.useForBudgetTiming === true || item.use_for_budget_timing === true);
  if (!timings.length) return { previousExpectedDate: null, nextExpectedDate: null, daysUntilNextIncome: null, timing: null };

  const rangeStart = addLocalDays(referenceKey, -400);
  const rangeEnd = addLocalDays(referenceKey, 400);
  const candidates = timings.flatMap((timing) =>
    getRecurrenceOccurrences(timing.recurrence || timing.recurrence_rule, rangeStart, rangeEnd, { kind: "income" })
      .map((date) => ({ date, timing }))
  ).sort((a, b) => compareDateKeys(a.date, b.date));

  const previous = [...candidates].reverse().find((item) => compareDateKeys(item.date, referenceKey) <= 0) || null;
  const next = candidates.find((item) => compareDateKeys(item.date, referenceKey) > 0) || null;
  const nextDate = next?.date || null;
  const daysUntilNextIncome = nextDate
    ? Math.max(0, Math.round((fromLocalDateKey(nextDate).getTime() - fromLocalDateKey(referenceKey).getTime()) / DAY_MS))
    : null;

  return {
    previousExpectedDate: previous?.date || null,
    nextExpectedDate: nextDate,
    daysUntilNextIncome,
    timing: next?.timing || previous?.timing || timings[0],
  };
}

export function resolveIncomeBasedBudgetPeriod(ownerId, referenceDate = new Date()) {
  const window = getExpectedIncomeWindow(ownerId, referenceDate);
  if (!window.previousExpectedDate || !window.nextExpectedDate) return null;
  return {
    start: window.previousExpectedDate,
    end: addLocalDays(window.nextExpectedDate, -1),
    nextExpectedIncomeDate: window.nextExpectedDate,
    daysUntilNextIncome: window.daysUntilNextIncome,
    source: "income_timing",
  };
}

export function normalizeRecurringBill(bill = {}) {
  const expectedAmount = cleanMoney(bill.expectedAmount ?? bill.expected_amount ?? bill.amount);
  const amountType = ["fixed", "variable"].includes(cleanText(bill.amountType || bill.amount_type).toLowerCase())
    ? cleanText(bill.amountType || bill.amount_type).toLowerCase()
    : "fixed";
  const recurrence = normalizeRecurrenceRule(bill.recurrence || bill.recurrenceRule || bill.recurrence_rule || {}, {
    kind: "bill",
    fallbackDate: bill.dueDate || bill.due_date || bill.startDate || bill.start_date || new Date(),
  });
  const timestamp = nowIso();

  return {
    ...bill,
    id: cleanText(bill.id) || createId("recurring_bill"),
    title: cleanText(bill.title || bill.name || "Bill") || "Bill",
    type: "bill",
    expectedAmount,
    expected_amount: expectedAmount,
    amountType,
    amount_type: amountType,
    dueDate: toLocalDateKey(bill.dueDate || bill.due_date || recurrence.startDate),
    due_date: toLocalDateKey(bill.dueDate || bill.due_date || recurrence.startDate),
    recurrence,
    recurrence_rule: recurrence,
    startDate: recurrence.startDate,
    start_date: recurrence.startDate,
    endDate: bill.endDate || bill.end_date ? toLocalDateKey(bill.endDate || bill.end_date) : null,
    end_date: bill.endDate || bill.end_date ? toLocalDateKey(bill.endDate || bill.end_date) : null,
    autoIncludeInBudget: bill.autoIncludeInBudget === true || bill.auto_include_in_budget === true,
    auto_include_in_budget: bill.autoIncludeInBudget === true || bill.auto_include_in_budget === true,
    active: bill.active !== false,
    categoryReference: bill.categoryReference || bill.category_reference || null,
    category_reference: bill.categoryReference || bill.category_reference || null,
    fundingIncomeSourceReference: bill.fundingIncomeSourceReference || bill.funding_income_source_reference || null,
    funding_income_source_reference: bill.fundingIncomeSourceReference || bill.funding_income_source_reference || null,
    createdOrigin: cleanText(bill.createdOrigin || bill.created_origin || "schedule") || "schedule",
    created_origin: cleanText(bill.createdOrigin || bill.created_origin || "schedule") || "schedule",
    sourceBudgetMonth: cleanText(bill.sourceBudgetMonth || bill.source_budget_month),
    source_budget_month: cleanText(bill.sourceBudgetMonth || bill.source_budget_month),
    sourceBudgetTitle: cleanText(bill.sourceBudgetTitle || bill.source_budget_title),
    source_budget_title: cleanText(bill.sourceBudgetTitle || bill.source_budget_title),
    description: cleanText(bill.description || bill.note),
    createdAt: bill.createdAt || bill.created_at || timestamp,
    created_at: bill.created_at || bill.createdAt || timestamp,
    updatedAt: timestamp,
    updated_at: timestamp,
  };
}

export function upsertRecurringBill(ownerId, bill = {}) {
  const current = readRecurringCashFlow(ownerId);
  const normalized = normalizeRecurringBill(bill);
  const existingIndex = current.bills.findIndex((item) => String(item.id) === String(normalized.id));
  const nextBills = [...current.bills];
  if (existingIndex >= 0) {
    nextBills[existingIndex] = {
      ...nextBills[existingIndex],
      ...normalized,
      createdAt: nextBills[existingIndex].createdAt || normalized.createdAt,
      created_at: nextBills[existingIndex].created_at || normalized.created_at,
    };
  } else {
    nextBills.push(normalized);
  }

  const saved = existingIndex >= 0 ? nextBills[existingIndex] : normalized;
  writeState(ownerId, { ...current, bills: nextBills }, "recurring-bill-saved", { billId: saved.id });
  return saved;
}

export function getRecurringBills(ownerId) {
  return readRecurringCashFlow(ownerId).bills.filter((bill) => bill?.active !== false);
}

export function setRecurringBillAutoInclude(ownerId, billId, enabled) {
  const current = readRecurringCashFlow(ownerId);
  const nextBills = current.bills.map((bill) => String(bill.id) === String(billId)
    ? { ...bill, autoIncludeInBudget: Boolean(enabled), auto_include_in_budget: Boolean(enabled), updatedAt: nowIso(), updated_at: nowIso() }
    : bill);
  writeState(ownerId, { ...current, bills: nextBills }, "recurring-bill-auto-include-changed", { billId, enabled: Boolean(enabled) });
}

function occurrenceKey(billId, dueDate) {
  return `${billId}:${toLocalDateKey(dueDate)}`;
}

export function skipRecurringBillOccurrence(ownerId, billId, dueDate) {
  const current = readRecurringCashFlow(ownerId);
  const key = occurrenceKey(billId, dueDate);
  const skippedOccurrences = [...new Set([...current.skippedOccurrences, key])];
  writeState(ownerId, { ...current, skippedOccurrences }, "recurring-bill-occurrence-skipped", { billId, dueDate: toLocalDateKey(dueDate) });
}

export function updateRecurringBillOccurrence(ownerId, billId, dueDate, patch = {}) {
  const current = readRecurringCashFlow(ownerId);
  const key = occurrenceKey(billId, dueDate);
  const nextOverride = {
    key,
    billId,
    bill_id: billId,
    dueDate: toLocalDateKey(dueDate),
    due_date: toLocalDateKey(dueDate),
    expectedAmount: cleanMoney(patch.expectedAmount ?? patch.expected_amount ?? patch.amount),
    expected_amount: cleanMoney(patch.expectedAmount ?? patch.expected_amount ?? patch.amount),
    title: cleanText(patch.title),
    updatedAt: nowIso(),
  };
  const nextOverrides = current.occurrenceOverrides.filter((item) => item.key !== key);
  nextOverrides.push(nextOverride);
  writeState(ownerId, { ...current, occurrenceOverrides: nextOverrides }, "recurring-bill-occurrence-updated", { billId, dueDate: nextOverride.dueDate });
  return nextOverride;
}

export function getBillOccurrencesForRange(ownerId, rangeStart, rangeEnd, { includeBudgetDisabled = true } = {}) {
  const state = readRecurringCashFlow(ownerId);
  const skipped = new Set(state.skippedOccurrences);
  const overrides = new Map(state.occurrenceOverrides.map((item) => [item.key, item]));

  return state.bills
    .filter((bill) => bill?.active !== false)
    .filter((bill) => includeBudgetDisabled || bill.autoIncludeInBudget === true || bill.auto_include_in_budget === true)
    .flatMap((bill) => {
      const effectiveEnd = bill.endDate || bill.end_date;
      const end = effectiveEnd && compareDateKeys(effectiveEnd, rangeEnd) < 0 ? effectiveEnd : rangeEnd;
      return getRecurrenceOccurrences(bill.recurrence || bill.recurrence_rule, rangeStart, end, { kind: "bill" })
        .map((dueDate) => {
          const key = occurrenceKey(bill.id, dueDate);
          if (skipped.has(key)) return null;
          const override = overrides.get(key);
          return {
            ...bill,
            occurrenceKey: key,
            occurrence_key: key,
            occurrenceDueDate: dueDate,
            occurrence_due_date: dueDate,
            title: override?.title || bill.title,
            expectedAmount: override?.expectedAmount > 0 ? override.expectedAmount : bill.expectedAmount,
            expected_amount: override?.expected_amount > 0 ? override.expected_amount : bill.expected_amount,
            isOccurrenceOverride: Boolean(override),
          };
        })
        .filter(Boolean);
    })
    .sort((a, b) => compareDateKeys(a.occurrenceDueDate, b.occurrenceDueDate));
}

function getBudgetIdentity(budget = {}) {
  return cleanText(budget.id || budget.key || budget.budget_id || budget.month || budget.month_key || "current-budget");
}

function budgetTitle(budget = {}) {
  return cleanText(budget.title || budget.name || budget.category || budget.budget_category);
}

function hasGeneratedDuplicate(budgets, billId, dueDate, budgetId) {
  return safeArray(budgets).some((budget) => {
    const linkedBillId = cleanText(budget.recurring_bill_id || budget.recurringBillId);
    const linkedDueDate = toLocalDateKey(budget.occurrence_due_date || budget.occurrenceDueDate);
    const linkedBudgetId = cleanText(budget.generated_for_budget_id || budget.generatedForBudgetId || getBudgetIdentity(budget));
    return linkedBillId === String(billId) && linkedDueDate === dueDate && linkedBudgetId === String(budgetId);
  });
}

function suppressBudgetOriginDuplicate(budgets, bill, dueDate, monthKey) {
  if ((bill.createdOrigin || bill.created_origin) !== "budget") return false;
  const sourceMonth = cleanText(bill.sourceBudgetMonth || bill.source_budget_month);
  const sourceTitle = cleanText(bill.sourceBudgetTitle || bill.source_budget_title || bill.title).toLowerCase();
  if (sourceMonth && sourceMonth !== cleanText(monthKey)) return false;
  return safeArray(budgets).some((budget) => budgetTitle(budget).toLowerCase() === sourceTitle) && dueDate.startsWith(cleanText(monthKey));
}

export function getRecurringBudgetItems({
  ownerId,
  budgets = [],
  periodStart,
  periodEnd,
  budgetId = "current-budget",
  monthKey = "",
} = {}) {
  if (!periodStart || !periodEnd) return [];
  const safeBudgetId = cleanText(budgetId) || "current-budget";
  return getBillOccurrencesForRange(ownerId, periodStart, periodEnd, { includeBudgetDisabled: false })
    .filter((occurrence) => !hasGeneratedDuplicate(budgets, occurrence.id, occurrence.occurrenceDueDate, safeBudgetId))
    .filter((occurrence) => !suppressBudgetOriginDuplicate(budgets, occurrence, occurrence.occurrenceDueDate, monthKey))
    .map((occurrence) => {
      const amount = cleanMoney(occurrence.expectedAmount ?? occurrence.expected_amount);
      const variable = (occurrence.amountType || occurrence.amount_type) === "variable";
      const generatedId = `recurring_bill_occurrence_${occurrence.id}_${occurrence.occurrenceDueDate}`;
      const metadata = variable
        ? `Estimated · Due ${occurrence.occurrenceDueDate} · Auto-added`
        : `Bill · Due ${occurrence.occurrenceDueDate} · Auto-added`;
      const budgetRecord = {
        id: generatedId,
        key: generatedId,
        title: occurrence.title,
        name: occurrence.title,
        category: occurrence.categoryReference || occurrence.category_reference || "Bill",
        budget_category: occurrence.categoryReference || occurrence.category_reference || "Bill",
        allocated_amount: amount,
        budget_amount: amount,
        total_budget: amount,
        amount,
        need_type: "need",
        plan_type: "budget_category",
        is_active: true,
        active: true,
        isRecurringBillOccurrence: true,
        is_recurring_bill_occurrence: true,
        recurringBillId: occurrence.id,
        recurring_bill_id: occurrence.id,
        occurrenceDueDate: occurrence.occurrenceDueDate,
        occurrence_due_date: occurrence.occurrenceDueDate,
        generatedForBudgetId: safeBudgetId,
        generated_for_budget_id: safeBudgetId,
        autoAdded: true,
        auto_added: true,
        estimated: variable,
        metadata,
      };

      return {
        key: generatedId,
        id: generatedId,
        title: occurrence.title,
        needType: "need",
        allocated: amount,
        month: monthKey,
        sortOrder: -1000 + Number(occurrence.occurrenceDueDate.replaceAll("-", "")),
        budget: budgetRecord,
        ...budgetRecord,
      };
    });
}

export function getBillsDueBeforeNextIncome(ownerId, referenceDate = new Date()) {
  const window = getExpectedIncomeWindow(ownerId, referenceDate);
  if (!window.nextExpectedDate) return [];
  return getBillOccurrencesForRange(ownerId, toLocalDateKey(referenceDate), window.nextExpectedDate)
    .filter((bill) => compareDateKeys(bill.occurrenceDueDate, window.nextExpectedDate) < 0);
}

export const __recurringCashFlowTestUtils = {
  storageKey,
  occurrenceKey,
  normalizeDayList,
  cleanMoney,
};
