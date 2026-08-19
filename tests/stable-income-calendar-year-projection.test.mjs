import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  __recurringCashFlowTestUtils,
  getIncomeTimingRecords,
  getRecurrenceOccurrences,
} from "../src/lib/recurringCashFlowRepository.js";
import { reconcileStableIncomeTimingCache } from "../src/lib/stableIncomeTimingAuthority.js";
import {
  buildStableIncomeScheduleProjection,
  isStableIncomeScheduleProjection,
  mergeScheduleEventsForRender,
} from "../src/lib/stableIncomeScheduleProjection.js";

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
    id: "salary-calendar-e2e",
    name: "UnifyCX",
    category: "Salary",
    stability: "Stable",
    minimumStableIncome: 450,
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

function project(sources, options = {}) {
  return buildStableIncomeScheduleProjection(sources, {
    year: 2026,
    ...options,
  });
}

function datesFor(events, sourceId = "salary-calendar-e2e") {
  return events
    .filter((event) => event.incomeSourceId === sourceId)
    .map((event) => event.date);
}

test("canonical twice-monthly Stable Income reconstructs every payday in its calendar year", () => {
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

test("Scenario A — Stable Income 10th + 25th projects the required Calendar dates", () => {
  const projected = project([stableSalary()]);
  const dates = datesFor(projected);

  for (const expectedDate of [
    "2026-08-10",
    "2026-08-25",
    "2026-09-10",
    "2026-09-25",
  ]) {
    assert.equal(dates.includes(expectedDate), true, expectedDate);
  }

  const aug25 = projected.find((event) => event.date === "2026-08-25");
  assert.equal(aug25.incomeSourceId, "salary-calendar-e2e");
  assert.equal(aug25.title, "UnifyCX");
  assert.equal(aug25.type, "Payday");
  assert.equal(aug25.amount, 450);
  assert.equal(aug25.direction, "in");
  assert.equal(isStableIncomeScheduleProjection(aug25), true);
  assert.match(aug25.note, /At least ₱450 is expected from UnifyCX/);
});

test("Scenario B — editing 10/25 to 15/30 replaces old derived dates without duplicates", () => {
  const manual = {
    id: "manual-calendar-event",
    title: "Dentist",
    date: "2026-08-25",
    type: "Health",
  };
  const oldProjection = project([stableSalary()]);
  const editedProjection = project([
    stableSalary({
      incomeRecurrence: {
        type: "twice_monthly",
        startDate: "2026-08-16",
        days: [15, 30],
      },
    }),
  ]);

  const renderModel = mergeScheduleEventsForRender(
    [manual, ...oldProjection],
    editedProjection
  );
  const salaryDates = datesFor(renderModel);

  assert.equal(salaryDates.includes("2026-08-10"), false);
  assert.equal(salaryDates.includes("2026-08-25"), false);
  assert.equal(salaryDates.includes("2026-08-15"), true);
  assert.equal(salaryDates.includes("2026-08-30"), true);
  assert.equal(renderModel.filter((event) => event.id === manual.id).length, 1);
});

test("Scenario C/D — archive, Stable to Irregular, and inactive timing remove projections", () => {
  assert.equal(project([stableSalary({ isArchived: true })]).length, 0);
  assert.equal(project([stableSalary({ stability: "Irregular" })]).length, 0);
  assert.equal(project([stableSalary({ usualIncomeDateEnabled: false })]).length, 0);
});

test("Scenario E — multiple Stable Income sources project independently", () => {
  const projected = project([
    stableSalary(),
    {
      id: "freelance-retainer",
      name: "Freelance Retainer",
      stability: "Stable",
      minimumStableIncome: 1000,
      usualIncomeDateEnabled: true,
      useForBudgetTiming: true,
      incomeRecurrence: {
        type: "monthly",
        startDate: "2026-01-15",
        dayOfMonth: 15,
      },
    },
  ]);

  const august = projected.filter((event) => event.date.startsWith("2026-08-"));
  assert.deepEqual(
    august.map((event) => [event.date, event.title]),
    [
      ["2026-08-10", "UnifyCX"],
      ["2026-08-25", "UnifyCX"],
      ["2026-08-15", "Freelance Retainer"],
    ]
  );
});

test("Scenario F/G — manual Calendar entries and recurring bills remain untouched by salary replacement", () => {
  const manual = {
    id: "manual-calendar-event",
    title: "Church outing",
    date: "2026-08-25",
    type: "Personal",
  };
  const bill = {
    id: "recurring-schedule-electric-2026-08-28",
    title: "Electric bill",
    date: "2026-08-28",
    type: "Bill",
    amount: 2500,
  };
  const staleSalary = {
    id: "income-schedule-salary-calendar-e2e-2026-08-10",
    title: "UnifyCX",
    date: "2026-08-10",
    type: "Payday",
    source: "income_hub_stable_source",
  };

  const renderModel = mergeScheduleEventsForRender(
    [manual, bill, staleSalary],
    project([stableSalary()])
  );

  assert.equal(renderModel.includes(manual), true);
  assert.equal(renderModel.includes(bill), true);
  assert.equal(renderModel.filter((event) => event.id === manual.id).length, 1);
  assert.equal(renderModel.filter((event) => event.id === bill.id).length, 1);
});

test("Scenario H — payday projection is pure expected-money data and creates zero actual financial transaction", () => {
  const source = stableSalary({
    currentBalance: 450,
    totalMoneyIn: 500,
    totalMoneyOut: 50,
  });
  const beforeSource = structuredClone(source);
  const beforeStorage = new Map(localStorage.values);

  const projected = project([source]);

  assert.deepEqual(source, beforeSource);
  assert.deepEqual(localStorage.values, beforeStorage);
  assert.equal(projected.every((event) => event.derived === true), true);
  assert.equal(projected.some((event) => "walletId" in event), false);
  assert.equal(projected.some((event) => "transactionId" in event), false);
  assert.equal(projected.some((event) => "walletTransaction" in event), false);
  assert.equal(source.currentBalance, 450);
  assert.equal(source.totalMoneyIn, 500);
  assert.equal(source.totalMoneyOut, 50);
});

test("canonical authority accepts all supported recurrence field aliases once at the boundary", () => {
  const recurrence = {
    type: "twice_monthly",
    startDate: "2026-08-16",
    days: [10, 25],
  };

  for (const field of [
    "incomeRecurrence",
    "income_recurrence",
    "recurrenceRule",
    "recurrence_rule",
  ]) {
    const source = stableSalary();
    delete source.incomeRecurrence;
    source[field] = recurrence;
    const projected = project([source]);
    assert.equal(
      projected.some((event) => event.date === "2026-08-25"),
      true,
      field
    );
  }
});

test("Calendar now derives salary from Income Hub and never persists a duplicate salary authority", () => {
  const recurringIntegration = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/recurringScheduleIntegration.js",
      import.meta.url
    ),
    "utf8"
  );
  const schedulePortal = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.js",
      import.meta.url
    ),
    "utf8"
  );
  const schedulePanel = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.equal(recurringIntegration.includes("getIncomeSources"), false);
  assert.equal(recurringIntegration.includes("persistIncomeScheduleProjection"), false);
  assert.equal(recurringIntegration.includes("clara:schedule:sync-income-events"), false);
  assert.equal(recurringIntegration.includes("income-schedule-"), false);
  assert.equal(
    recurringIntegration.includes(
      "end.setMonth(end.getMonth() + RECURRING_SCHEDULE_WINDOW_MONTHS)"
    ),
    true
  );

  assert.equal(schedulePortal.includes("scheduleRevision"), false);
  assert.equal(schedulePortal.includes("clara:schedule:sync-income-events"), false);
  assert.equal(schedulePanel.includes("getIncomeSources(ownerId)"), true);
  assert.equal(schedulePanel.includes("buildStableIncomeScheduleProjection"), true);
  assert.equal(schedulePanel.includes("mergeScheduleEventsForRender"), true);
  assert.equal(schedulePanel.includes("getRecurringCashFlowOwnerId(user)"), true);
  assert.equal(schedulePanel.includes("Payday timing is managed in Income Hub."), true);
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
  assert.match(source, /sanitizeActiveCurrentStateFlag\(\);/);
});
