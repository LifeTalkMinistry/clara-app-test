import test from "node:test";
import assert from "node:assert/strict";

import {
  clampMonthlyDate,
  getExpectedIncomeWindow,
  getRecurrenceOccurrences,
  resolveIncomeBasedBudgetPeriod,
  syncIncomeTimingFromSource,
  __recurringCashFlowTestUtils,
} from "../src/lib/recurringCashFlowRepository.js";
import { reconcileStableIncomeTimingCache } from "../src/lib/stableIncomeTimingAuthority.js";

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
  clear() {
    this.values.clear();
  }
}

const localStorage = new MemoryStorage();
globalThis.window = {
  localStorage,
  dispatchEvent() {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

function reset(ownerId = "date-test") {
  localStorage.removeItem(__recurringCashFlowTestUtils.storageKey(ownerId));
}

test("monthly recurrence resolves the requested calendar day", () => {
  const occurrences = getRecurrenceOccurrences(
    { type: "monthly", startDate: "2026-01-16", dayOfMonth: 16 },
    "2026-01-01",
    "2026-04-30"
  );
  assert.deepEqual(occurrences, [
    "2026-01-16",
    "2026-02-16",
    "2026-03-16",
    "2026-04-16",
  ]);
});

test("monthly dates clamp to the final valid day in short months", () => {
  assert.equal(clampMonthlyDate(2026, 1, 31), "2026-02-28");
  assert.equal(clampMonthlyDate(2028, 1, 31), "2028-02-29");

  const occurrences = getRecurrenceOccurrences(
    { type: "monthly", startDate: "2026-01-31", dayOfMonth: 31 },
    "2026-01-01",
    "2026-03-31"
  );
  assert.deepEqual(occurrences, [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
  ]);
});

test("twice-monthly income safely resolves February", () => {
  const occurrences = getRecurrenceOccurrences(
    { type: "twice_monthly", startDate: "2026-01-15", days: [15, 30] },
    "2026-02-01",
    "2026-03-31",
    { kind: "income" }
  );
  assert.deepEqual(occurrences, [
    "2026-02-15",
    "2026-02-28",
    "2026-03-15",
    "2026-03-30",
  ]);
});

test("biweekly recurrence respects its starting basis", () => {
  const occurrences = getRecurrenceOccurrences(
    { type: "biweekly", startDate: "2026-07-03" },
    "2026-07-01",
    "2026-08-15"
  );
  assert.deepEqual(occurrences, [
    "2026-07-03",
    "2026-07-17",
    "2026-07-31",
    "2026-08-14",
  ]);
});

test("income timing saves, reloads, and resolves the next expected income", () => {
  const ownerId = "income-window";
  reset(ownerId);
  syncIncomeTimingFromSource(ownerId, {
    id: "salary-1",
    name: "Salary",
    usualIncomeDateEnabled: true,
    useForBudgetTiming: true,
    incomeRecurrence: {
      type: "twice_monthly",
      startDate: "2026-01-15",
      days: [15, 30],
    },
  });

  const window = getExpectedIncomeWindow(ownerId, "2026-07-20");
  assert.equal(window.previousExpectedDate, "2026-07-15");
  assert.equal(window.nextExpectedDate, "2026-07-30");
  assert.equal(window.daysUntilNextIncome, 10);

  const period = resolveIncomeBasedBudgetPeriod(ownerId, "2026-07-20");
  assert.deepEqual(period, {
    start: "2026-07-15",
    end: "2026-07-29",
    nextExpectedIncomeDate: "2026-07-30",
    daysUntilNextIncome: 10,
    source: "income_timing",
  });
});

test("fresh monthly stable income immediately reconstructs the active payday window", () => {
  const ownerId = "fresh-monthly-income-window";
  reset(ownerId);

  syncIncomeTimingFromSource(ownerId, {
    id: "fresh-salary",
    name: "Fresh Salary",
    usualIncomeDateEnabled: true,
    useForBudgetTiming: true,
    incomeRecurrence: {
      type: "monthly",
      startDate: "2026-08-28",
      dayOfMonth: 15,
    },
  });

  const window = getExpectedIncomeWindow(ownerId, "2026-08-28");
  assert.equal(window.previousExpectedDate, "2026-08-15");
  assert.equal(window.nextExpectedDate, "2026-09-15");

  const period = resolveIncomeBasedBudgetPeriod(ownerId, "2026-08-28");
  assert.deepEqual(period, {
    start: "2026-08-15",
    end: "2026-09-14",
    nextExpectedIncomeDate: "2026-09-15",
    daysUntilNextIncome: 18,
    source: "income_timing",
  });
});

test("fresh twice-monthly stable income backfills the prior scheduled payday", () => {
  const occurrences = getRecurrenceOccurrences(
    { type: "twice_monthly", startDate: "2026-08-28", days: [15, 30] },
    "2026-06-28",
    "2026-10-29",
    { kind: "income" }
  );

  assert.ok(occurrences.includes("2026-08-15"));
  assert.ok(occurrences.includes("2026-08-30"));
});

test("legacy Stable Income without the budget-timing flag still backfills runway timing", () => {
  const ownerId = "legacy-stable-income-window";
  reset(ownerId);

  reconcileStableIncomeTimingCache(ownerId, [
    {
      id: "legacy-salary",
      name: "Salary",
      stability: "Stable",
      usualIncomeDateEnabled: true,
      incomeRecurrence: {
        type: "twice_monthly",
        startDate: "2026-08-15",
        days: [15, 30],
      },
    },
  ]);

  const window = getExpectedIncomeWindow(ownerId, "2026-08-20");
  assert.equal(window.previousExpectedDate, "2026-08-15");
  assert.equal(window.nextExpectedDate, "2026-08-30");
  assert.equal(window.daysUntilNextIncome, 10);
});

test("missing income timing safely returns no income-based period", () => {
  const ownerId = "no-income-window";
  reset(ownerId);
  assert.equal(resolveIncomeBasedBudgetPeriod(ownerId, "2026-07-20"), null);
});