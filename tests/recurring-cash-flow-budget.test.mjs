import test from "node:test";
import assert from "node:assert/strict";

import {
  getBillOccurrencesForRange,
  getRecurringBudgetItems,
  getRecurringBills,
  setRecurringBillAutoInclude,
  skipRecurringBillOccurrence,
  updateRecurringBillOccurrence,
  upsertRecurringBill,
  __recurringCashFlowTestUtils,
} from "../src/lib/recurringCashFlowRepository.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  get length() {
    return this.values.size;
  }
  key(index) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

const localStorage = new MemoryStorage();
globalThis.window = { localStorage, dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

function reset(ownerId) {
  localStorage.removeItem(__recurringCashFlowTestUtils.storageKey(ownerId));
}

function createMonthlyBill(ownerId, patch = {}) {
  return upsertRecurringBill(ownerId, {
    id: patch.id || "electricity",
    title: patch.title || "Electricity",
    expectedAmount: patch.expectedAmount ?? 2500,
    amountType: patch.amountType || "fixed",
    dueDate: "2026-07-16",
    recurrence: {
      type: "monthly",
      startDate: "2026-07-16",
      dayOfMonth: 16,
    },
    autoIncludeInBudget: true,
    active: true,
    ...patch,
  });
}

test("auto-includes a bill only inside the applicable budget period", () => {
  const ownerId = "budget-cycle";
  reset(ownerId);
  createMonthlyBill(ownerId);

  const included = getRecurringBudgetItems({
    ownerId,
    budgets: [],
    periodStart: "2026-07-15",
    periodEnd: "2026-07-29",
    budgetId: "july-pay-cycle",
    monthKey: "2026-07",
  });
  assert.equal(included.length, 1);
  assert.equal(included[0].title, "Electricity");
  assert.equal(included[0].allocated, 2500);
  assert.equal(included[0].occurrence_due_date, "2026-07-16");

  const excluded = getRecurringBudgetItems({
    ownerId,
    budgets: [],
    periodStart: "2026-07-01",
    periodEnd: "2026-07-14",
    budgetId: "early-july",
    monthKey: "2026-07",
  });
  assert.equal(excluded.length, 0);
});

test("duplicate linked occurrences are not generated twice", () => {
  const ownerId = "duplicate-prevention";
  reset(ownerId);
  createMonthlyBill(ownerId);

  const budgets = [{
    id: "saved-occurrence",
    recurring_bill_id: "electricity",
    occurrence_due_date: "2026-07-16",
    generated_for_budget_id: "july-pay-cycle",
  }];
  const items = getRecurringBudgetItems({
    ownerId,
    budgets,
    periodStart: "2026-07-15",
    periodEnd: "2026-07-29",
    budgetId: "july-pay-cycle",
    monthKey: "2026-07",
  });
  assert.equal(items.length, 0);
});

test("variable bills use the expected amount and are marked estimated", () => {
  const ownerId = "variable-bill";
  reset(ownerId);
  createMonthlyBill(ownerId, {
    id: "water",
    title: "Water Bill",
    expectedAmount: 800,
    amountType: "variable",
  });

  const [item] = getRecurringBudgetItems({
    ownerId,
    budgets: [],
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    budgetId: "july",
    monthKey: "2026-07",
  });
  assert.equal(item.allocated, 800);
  assert.equal(item.estimated, true);
  assert.match(item.metadata, /Estimated/);
});

test("editing one occurrence does not change the recurring template", () => {
  const ownerId = "occurrence-edit";
  reset(ownerId);
  createMonthlyBill(ownerId, {
    id: "water",
    title: "Water Bill",
    expectedAmount: 800,
    amountType: "variable",
  });
  updateRecurringBillOccurrence(ownerId, "water", "2026-07-16", {
    expectedAmount: 920,
  });

  const july = getBillOccurrencesForRange(ownerId, "2026-07-01", "2026-07-31");
  const august = getBillOccurrencesForRange(ownerId, "2026-08-01", "2026-08-31");
  assert.equal(july[0].expectedAmount, 920);
  assert.equal(august[0].expectedAmount, 800);
  assert.equal(getRecurringBills(ownerId)[0].expectedAmount, 800);
});

test("updating the recurring template changes future occurrences", () => {
  const ownerId = "template-edit";
  reset(ownerId);
  const bill = createMonthlyBill(ownerId);
  upsertRecurringBill(ownerId, { ...bill, expectedAmount: 2750 });
  const august = getBillOccurrencesForRange(ownerId, "2026-08-01", "2026-08-31");
  assert.equal(august[0].expectedAmount, 2750);
});

test("skipped occurrences do not return after recalculation", () => {
  const ownerId = "skip-occurrence";
  reset(ownerId);
  createMonthlyBill(ownerId);
  skipRecurringBillOccurrence(ownerId, "electricity", "2026-07-16");
  assert.equal(
    getBillOccurrencesForRange(ownerId, "2026-07-01", "2026-07-31").length,
    0
  );
  assert.equal(
    getBillOccurrencesForRange(ownerId, "2026-08-01", "2026-08-31").length,
    1
  );
});

test("disabling future inclusion preserves the bill record", () => {
  const ownerId = "disable-inclusion";
  reset(ownerId);
  createMonthlyBill(ownerId);
  setRecurringBillAutoInclude(ownerId, "electricity", false);

  const items = getRecurringBudgetItems({
    ownerId,
    budgets: [],
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    budgetId: "july",
    monthKey: "2026-07",
  });
  assert.equal(items.length, 0);
  assert.equal(getRecurringBills(ownerId).length, 1);
});

test("existing Schedule records remain unchanged", () => {
  const ownerId = "backward-compatible";
  reset(ownerId);
  const oldScheduleKey = `clara_schedule_events_v2_${ownerId}`;
  const oldRecords = [{ id: "old-1", title: "Old Bill", date: "2026-07-10", type: "Bill" }];
  localStorage.setItem(oldScheduleKey, JSON.stringify(oldRecords));
  createMonthlyBill(ownerId);
  assert.deepEqual(JSON.parse(localStorage.getItem(oldScheduleKey)), oldRecords);
});
