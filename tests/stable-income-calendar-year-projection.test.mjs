import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  __recurringCashFlowTestUtils,
  getIncomeTimingRecords,
  getRecurrenceOccurrences,
} from "../src/lib/recurringCashFlowRepository.js";
import { reconcileStableIncomeTimingCache } from "../src/lib/stableIncomeTimingAuthority.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
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

function resetTiming(ownerId) {
  localStorage.removeItem(__recurringCashFlowTestUtils.storageKey(ownerId));
}

function stableSalary(overrides = {}) {
  return {
    id: "salary-calendar-year",
    name: "Stable Income",
    category: "Salary",
    stability: "Stable",
    minimumStableIncome: 1500,
    usualIncomeDateEnabled: true,
    useForBudgetTiming: true,
    incomeRecurrence: {
      type: "twice_monthly",
      startDate: "2026-08-16",
      days: [10, 25],
    },
    ...overrides,
  };
}

test("twice-monthly Stable Income reconstructs every payday in its calendar year", () => {
  const ownerId = "stable-income-full-year";
  resetTiming(ownerId);
  reconcileStableIncomeTimingCache(ownerId, [stableSalary()]);

  const timings = getIncomeTimingRecords(ownerId);
  assert.equal(timings.length, 1);
  assert.equal(timings[0].recurrence.startDate, "2026-01-01");

  const occurrences = getRecurrenceOccurrences(
    timings[0].recurrence,
    "2026-01-01",
    "2026-12-31",
    { kind: "income" }
  );

  assert.equal(occurrences.length, 24);
  assert.deepEqual(occurrences.slice(0, 4), [
    "2026-01-10",
    "2026-01-25",
    "2026-02-10",
    "2026-02-25",
  ]);
  assert.equal(occurrences.includes("2026-08-25"), true);
  assert.deepEqual(occurrences.slice(-2), ["2026-12-10", "2026-12-25"]);
});

test("income projection uses the current calendar year without shrinking recurring bill lookahead", () => {
  const source = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/recurringScheduleIntegration.js",
      import.meta.url
    ),
    "utf8"
  );

  assert.equal(source.includes("function getRecurringBillProjectionRange()"), true);
  assert.equal(source.includes("end.setMonth(end.getMonth() + RECURRING_SCHEDULE_WINDOW_MONTHS)"), true);
  assert.equal(source.includes("function getIncomeScheduleProjectionRange()"), true);
  assert.equal(source.includes("new Date(currentYear, 0, 1)"), true);
  assert.equal(source.includes("new Date(currentYear, 11, 31)"), true);
  assert.match(
    source,
    /dispatchRecurringBillOccurrences[\s\S]*getRecurringBillProjectionRange\(\)/
  );
  assert.match(
    source,
    /dispatchIncomeTimingOccurrences[\s\S]*getIncomeScheduleProjectionRange\(\)/
  );
});

test("Stable Income Schedule projection is owned by returned Income Hub sources, not only the timing cache", () => {
  const source = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/recurringScheduleIntegration.js",
      import.meta.url
    ),
    "utf8"
  );

  assert.equal(source.includes("buildCanonicalStableIncomeTimingSource"), true);
  assert.equal(source.includes("stableTimingFromIncomeSource"), true);
  assert.equal(source.includes("canonicalStableTimings"), true);
  assert.equal(source.includes("compatibilityTimings"), true);
  assert.equal(source.includes("projectionTimings"), true);
  assert.match(
    source,
    /safeIncomeSources\s*\.map\(stableTimingFromIncomeSource\)\s*\.filter\(Boolean\)/
  );
  assert.match(
    source,
    /compatibilityTimings\s*=\s*getIncomeTimingRecords\(ownerId\)\.filter/
  );
  assert.match(
    source,
    /projectionTimings\s*=\s*\[\s*\.\.\.canonicalStableTimings,\s*\.\.\.compatibilityTimings/
  );
});

test("Schedule refreshes from the canonical Income Hub update signal", () => {
  const source = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.js",
      import.meta.url
    ),
    "utf8"
  );

  assert.equal(source.includes('INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated"'), true);
  assert.equal(source.includes("window.addEventListener(INCOME_HUB_UPDATED_EVENT, resyncSchedule)"), true);
  assert.equal(source.includes("window.removeEventListener(INCOME_HUB_UPDATED_EVENT, resyncSchedule)"), true);
  assert.equal(source.includes("syncRecurringBillsIntoSchedule(ownerId)"), true);
});

test("stale pre-demo current-state flags cannot redirect a real user's Income Hub owner", () => {
  const source = readFileSync(
    new URL(
      "../src/lib/clara-young-professional-current-state.js",
      import.meta.url
    ),
    "utf8"
  );

  assert.equal(source.includes("function isSupportedActiveDemoState"), true);
  assert.match(source, /state\?\.demoModeActive === true/);
  assert.match(source, /clean\(state\?\.activeDemoProfile\)/);
  assert.match(source, /clean\(state\?\.demoLocalUserId\)/);
  assert.equal(source.includes("export function sanitizeActiveCurrentStateFlag()"), true);
  assert.match(
    source,
    /window\.localStorage\.removeItem\(ACTIVE_CURRENT_STATE_KEY\)/
  );
  assert.match(
    source,
    /sanitizeActiveCurrentStateFlag\(\);/
  );
});