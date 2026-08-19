import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEBT_OBLIGATION_SCHEDULE_SOURCE,
  SAVINGS_GOAL_SCHEDULE_SOURCE,
  buildDebtObligationScheduleProjection,
  buildSavingsGoalScheduleProjection,
  isFinancialCardScheduleProjection,
} from "../src/lib/financialCardScheduleProjection.js";
import {
  filterScheduleOwnedEvents,
  isDerivedScheduleProjection,
  mergeScheduleEventCollections,
} from "../src/lib/scheduleEventOwnership.js";
import {
  buildStableIncomeScheduleProjection,
  isStableIncomeScheduleProjection,
} from "../src/lib/stableIncomeScheduleProjection.js";
import { DEBT_OBLIGATION_RECORD_KIND } from "../src/lib/debtObligationMath.js";

const sampleGoal = (date = "2026-08-30", overrides = {}) => ({
  id: "sample-goal",
  title: "Sample",
  target_amount: 5000,
  saved_amount: 0,
  planned_use_date: date,
  deletedAt: null,
  deleted_at: null,
  ...overrides,
});

const sampleDebt = (overrides = {}) => ({
  id: "sample-debt",
  recordKind: DEBT_OBLIGATION_RECORD_KIND,
  title: "Home Credit",
  obligationMode: "balance",
  balance: 12000,
  monthlyPayment: 1500,
  dueDay: 20,
  status: "active",
  deletedAt: null,
  ...overrides,
});

const stableIncome = () => ({
  id: "salary-source",
  name: "Salary",
  stability: "Stable",
  minimumStableIncome: 20000,
  usualIncomeDateEnabled: true,
  useForBudgetTiming: true,
  incomeRecurrence: {
    type: "monthly",
    startDate: "2026-01-15",
    dayOfMonth: 15,
  },
});

const manualEvent = () => ({
  id: "manual-event",
  title: "Dentist",
  date: "2026-08-22",
  type: "Health",
});

const recurringBill = () => ({
  id: "recurring-schedule-electric-2026-08-28",
  title: "Electric bill",
  date: "2026-08-28",
  type: "Bill",
  amount: 2500,
  source: "recurring_schedule_bill",
});

const sortEvents = (events) =>
  [...events].sort((a, b) =>
    `${a.date} ${a.time || "99:99"}`.localeCompare(
      `${b.date} ${b.time || "99:99"}`
    )
  );

const groupByDate = (events) =>
  sortEvents(events).reduce((acc, event) => {
    acc[event.date] = [...(acc[event.date] || []), event];
    return acc;
  }, {});

const isMoneyEvent = (event) => {
  const type = String(event?.type || "").toLowerCase();
  return (
    Boolean(event?.amount) ||
    type === "bill" ||
    type === "payday" ||
    type === "money"
  );
};

test("A — Savings Goal planned_use_date projects the exact canonical date", () => {
  const [projection] = buildSavingsGoalScheduleProjection([sampleGoal()]);
  assert.equal(projection.date, "2026-08-30");
  assert.equal(projection.source, SAVINGS_GOAL_SCHEDULE_SOURCE);
  assert.equal(projection.type, "Money");
  assert.equal(projection.derived, true);
  assert.equal(projection.editable, false);
  assert.equal(
    projection.id,
    "savings-goal-schedule-sample-goal-2026-08-30"
  );
});

test("B — render merge contains manual, Savings, Debt, and Stable Income without duplicate ids", () => {
  const savings = buildSavingsGoalScheduleProjection([sampleGoal()]);
  const debt = buildDebtObligationScheduleProjection([sampleDebt()], {
    referenceDate: new Date("2026-08-19T00:00:00"),
  });
  const income = buildStableIncomeScheduleProjection([stableIncome()], {
    year: 2026,
  });
  const merged = mergeScheduleEventCollections(
    [manualEvent()],
    income,
    savings,
    debt,
    [savings[0]]
  );

  assert.equal(merged.some((event) => event.id === "manual-event"), true);
  assert.equal(
    merged.some((event) => event.source === SAVINGS_GOAL_SCHEDULE_SOURCE),
    true
  );
  assert.equal(
    merged.some((event) => event.source === DEBT_OBLIGATION_SCHEDULE_SOURCE),
    true
  );
  assert.equal(merged.some(isStableIncomeScheduleProjection), true);
  assert.equal(new Set(merged.map((event) => event.id)).size, merged.length);
});

test("C — derived finance and income projections are never Schedule-persisted", () => {
  const savings = buildSavingsGoalScheduleProjection([sampleGoal()])[0];
  const debt = buildDebtObligationScheduleProjection([sampleDebt()], {
    referenceDate: new Date("2026-08-19T00:00:00"),
  })[0];
  const income = buildStableIncomeScheduleProjection([stableIncome()], {
    year: 2026,
  })[0];
  const persisted = filterScheduleOwnedEvents([
    manualEvent(),
    income,
    savings,
    debt,
    recurringBill(),
  ]);

  assert.deepEqual(
    persisted.map((event) => event.id),
    ["manual-event", "recurring-schedule-electric-2026-08-28"]
  );
});

test("D — legacy persisted Savings/Debt projections are ignored without deleting Schedule-owned records", () => {
  const legacySavings = {
    id: "legacy-savings",
    title: "Old savings",
    date: "2026-08-30",
    source: SAVINGS_GOAL_SCHEDULE_SOURCE,
  };
  const legacyDebt = {
    id: "legacy-debt",
    title: "Old debt",
    date: "2026-08-20",
    source: DEBT_OBLIGATION_SCHEDULE_SOURCE,
  };
  const persisted = filterScheduleOwnedEvents([
    manualEvent(),
    recurringBill(),
    legacySavings,
    legacyDebt,
  ]);

  assert.deepEqual(
    persisted.map((event) => event.id),
    ["manual-event", "recurring-schedule-electric-2026-08-28"]
  );
});

test("E — Savings date edit replaces the old derived date with exactly one current projection", () => {
  const before = buildSavingsGoalScheduleProjection([sampleGoal("2026-08-30")]);
  const after = buildSavingsGoalScheduleProjection([sampleGoal("2026-09-10")]);
  const renderAfter = mergeScheduleEventCollections([manualEvent()], after);

  assert.equal(before[0].date, "2026-08-30");
  assert.equal(
    renderAfter.some(
      (event) =>
        event.date === "2026-08-30" &&
        isFinancialCardScheduleProjection(event)
    ),
    false
  );
  assert.equal(
    renderAfter.some(
      (event) => event.date === "2026-09-10" && event.title === "Sample"
    ),
    true
  );
  assert.equal(renderAfter.filter((event) => event.title === "Sample").length, 1);
  assert.equal(
    filterScheduleOwnedEvents(renderAfter).some((event) => event.title === "Sample"),
    false
  );
});

test("F — deleting the canonical Savings Goal removes only its projection", () => {
  const deleted = buildSavingsGoalScheduleProjection([
    sampleGoal("2026-08-30", {
      deletedAt: "2026-08-19T03:00:00.000Z",
    }),
  ]);
  const income = buildStableIncomeScheduleProjection([stableIncome()], {
    year: 2026,
  });
  const debt = buildDebtObligationScheduleProjection([sampleDebt()], {
    referenceDate: new Date("2026-08-19T00:00:00"),
  });
  const merged = mergeScheduleEventCollections(
    [manualEvent(), recurringBill()],
    income,
    deleted,
    debt
  );

  assert.equal(deleted.length, 0);
  assert.equal(merged.some((event) => event.id === "manual-event"), true);
  assert.equal(merged.some((event) => event.id === recurringBill().id), true);
  assert.equal(merged.some(isStableIncomeScheduleProjection), true);
  assert.equal(
    merged.some((event) => event.source === DEBT_OBLIGATION_SCHEDULE_SOURCE),
    true
  );
});

test("G — active Debt due dates remain derived and non-persisted", () => {
  const debtEvents = buildDebtObligationScheduleProjection([sampleDebt()], {
    referenceDate: new Date("2026-08-19T00:00:00"),
  });
  const aug20 = debtEvents.find((event) => event.date === "2026-08-20");

  assert.ok(aug20);
  assert.equal(aug20.source, DEBT_OBLIGATION_SCHEDULE_SOURCE);
  assert.equal(aug20.derived, true);
  assert.equal(aug20.editable, false);
  assert.equal(filterScheduleOwnedEvents([aug20]).length, 0);
});

test("H — Stable Income remains derived and excluded from Schedule persistence", () => {
  const income = buildStableIncomeScheduleProjection([stableIncome()], {
    year: 2026,
  });
  const aug15 = income.find((event) => event.date === "2026-08-15");

  assert.ok(aug15);
  assert.equal(isStableIncomeScheduleProjection(aug15), true);
  assert.equal(isDerivedScheduleProjection(aug15), true);
  assert.equal(filterScheduleOwnedEvents([aug15]).length, 0);
});

test("I — recurring bills remain legitimate Schedule-owned records", () => {
  const bill = recurringBill();
  assert.deepEqual(filterScheduleOwnedEvents([bill]), [bill]);
  const merged = mergeScheduleEventCollections([manualEvent(), bill]);
  assert.equal(merged.some((event) => event.id === bill.id), true);
});

test("J — manual Schedule persistence survives serialization and removal", () => {
  const manual = manualEvent();
  const persisted = filterScheduleOwnedEvents([manual]);
  const reloaded = JSON.parse(JSON.stringify(persisted));

  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].id, manual.id);
  const removed = reloaded.filter((event) => event.id !== manual.id);
  assert.equal(removed.length, 0);
});

test("K — real Sample case reaches byDate/agenda money state without Schedule-storage feedback", () => {
  const integrationSource = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/financialCardScheduleIntegration.js",
      import.meta.url
    ),
    "utf8"
  );
  const wrapperJs = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.js",
      import.meta.url
    ),
    "utf8"
  );
  const wrapperJsx = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.jsx",
      import.meta.url
    ),
    "utf8"
  );
  const dashboardSource = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx",
      import.meta.url
    ),
    "utf8"
  );

  const [projection] = buildSavingsGoalScheduleProjection([sampleGoal()]);
  const renderEvents = mergeScheduleEventCollections([manualEvent()], [projection]);
  const sorted = sortEvents(renderEvents);
  const byDate = groupByDate(sorted);
  const selectedEvents = byDate["2026-08-30"] || [];
  const selectedMoneyEvent = selectedEvents.find(isMoneyEvent);

  assert.equal(projection.title, "Sample");
  assert.equal(projection.amount, 5000);
  assert.equal(projection.date, "2026-08-30");
  assert.equal(selectedEvents.includes(projection), true);
  assert.equal(Boolean(selectedMoneyEvent), true);
  assert.equal(selectedMoneyEvent.title, "Sample");
  assert.equal(isMoneyEvent(projection), true);

  assert.equal(integrationSource.includes("localStorage"), false);
  assert.equal(
    integrationSource.includes("syncFinancialCardSchedulesIntoCalendar"),
    false
  );
  assert.equal(wrapperJs.includes("syncFinancialCardSchedulesIntoCalendar"), false);
  assert.equal(wrapperJs.includes("financialProjectionEpoch"), false);
  assert.equal(wrapperJsx.includes("syncFinancialCardSchedulesIntoCalendar"), false);
  assert.equal(wrapperJsx.includes("financialProjectionEpoch"), false);
  assert.equal(dashboardSource.includes("financialProjectedEvents"), true);
  assert.equal(
    dashboardSource.includes("loadFinancialCardScheduleProjections"),
    true
  );
  assert.equal(dashboardSource.includes("filterScheduleOwnedEvents(events)"), true);
  assert.equal(dashboardSource.includes("mergeScheduleEventsForRender"), true);
});

test("runtime import resolution keeps one Calendar financial projection owner", () => {
  const renderer = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx",
      import.meta.url
    ),
    "utf8"
  );
  const wrapperJs = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.js",
      import.meta.url
    ),
    "utf8"
  );
  const wrapperJsx = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.jsx",
      import.meta.url
    ),
    "utf8"
  );
  const manual = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleManualPanel.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(renderer, /schedule\/DashboardScheduleImpactPortalPanel"/);
  assert.match(wrapperJs, /DashboardScheduleImpactPortalPanel\.jsx/);
  assert.match(wrapperJsx, /DashboardScheduleManualPanel\.jsx/);
  assert.match(manual, /DashboardSchedulePanel\.jsx/);
  assert.equal(wrapperJs.includes("financialCardScheduleIntegration"), false);
  assert.equal(wrapperJsx.includes("financialCardScheduleIntegration"), false);
});
