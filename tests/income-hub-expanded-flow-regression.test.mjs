import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  __recurringCashFlowTestUtils,
  getExpectedIncomeWindow,
  getIncomeTimingRecords,
  getRecurrenceOccurrences,
} from "../src/lib/recurringCashFlowRepository.js";
import {
  reconcileStableIncomeTimingCache,
  syncStableIncomeTimingSource,
} from "../src/lib/stableIncomeTimingAuthority.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const repository = readSource("src/lib/incomeHubRepository.js");
const timingAuthority = readSource("src/lib/stableIncomeTimingAuthority.js");
const card = readSource("src/components/financial-carousel/cards/investment/ui/InvestmentCardView.jsx");
const addMoneyModal = readSource("src/components/financial-carousel/cards/investment/ui/IncomeSourceAddMoneyModal.jsx");
const createModal = readSource("src/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModal.jsx");
const createModalBase = readSource("src/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModalBase.jsx");
const surfaces = readSource("src/components/financial-carousel/cards/investment/ui/IncomeHubExpandedSurfaces.jsx");
const surfacesEntry = readSource("src/components/financial-carousel/cards/investment/ui/IncomeHubExpandedSurfaces.js");
const cardLogic = readSource("src/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic.js");
const renderer = readSource("src/components/financial-carousel/ui/CarouselItemCard.jsx");
const financeActionModal = readSource("src/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal.jsx");
const recurringScheduleIntegration = readSource("src/components/fresh/main-dashboard/dashboard-panels/schedule/recurringScheduleIntegration.js");
const schedulePortal = readSource("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.js");
const schedulePanel = readSource("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx");
const scheduleProjection = readSource("src/lib/stableIncomeScheduleProjection.js");
const budgetTimingHook = readSource("src/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions.js");

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

function resetTiming(ownerId) {
  localStorage.removeItem(__recurringCashFlowTestUtils.storageKey(ownerId));
}

function stableSalary(overrides = {}) {
  return {
    id: "salary-1",
    name: "Salary",
    category: "Salary",
    stability: "Stable",
    minimumStableIncome: 25000,
    usualIncomeDateEnabled: true,
    useForBudgetTiming: true,
    incomeRecurrence: {
      type: "twice_monthly",
      startDate: "2026-08-15",
      days: [15, 30],
    },
    currentBalance: 4200,
    totalMoneyIn: 30000,
    totalMoneyOut: 25800,
    ...overrides,
  };
}

test("Income Hub transfer is one IndexedDB transaction across source, wallet, and wallet ledger", () => {
  assert.equal(repository.includes("transferIncomeSourceToWallet"), true);
  assert.equal(repository.includes("runLocalFinanceTransaction"), true);
  assert.equal(repository.includes("[STORE_NAME, WALLET_STORE, WALLET_TRANSACTION_STORE]"), true);
  assert.equal(repository.includes("income_source_id: source.id"), true);
});

test("Income Hub modals no longer create private finance controllers", () => {
  assert.equal(addMoneyModal.includes("useFinancialData"), false);
  assert.equal(createModalBase.includes("useFinancialData"), false);
  assert.equal(renderer.includes("financeCardController={financeCardController}"), true);
  assert.equal(addMoneyModal.includes("financeController = null"), true);
});

test("income timing is React-owned and saved with the source", () => {
  assert.equal(createModal.includes("MutationObserver"), false);
  assert.equal(createModalBase.includes("MutationObserver"), false);
  assert.equal(createModalBase.includes("document.createElement"), false);
  assert.equal(createModalBase.includes("incomeRecurrence: recurrence"), true);
  assert.equal(createModalBase.includes("syncStableIncomeTimingSource"), true);
});

test("stable income requires a conservative minimum and forces payday timing authority", () => {
  assert.equal(createModalBase.includes('label="Lowest stable income"'), true);
  assert.equal(createModalBase.includes("minimumStableIncome: stable ? minimumStableIncome : null"), true);
  assert.equal(createModalBase.includes("Enter the lowest amount you can reliably expect on each scheduled payday."), true);
  assert.equal(createModalBase.includes("usualIncomeDateEnabled: stable || form.usualIncomeDateEnabled"), true);
  assert.equal(createModalBase.includes("useForBudgetTiming: stable ||"), true);
});

test("Income Hub repository is the synchronization boundary for every writer and reader", () => {
  assert.equal(repository.includes("reconcileStableIncomeTimingCache"), true);
  assert.equal(repository.includes("syncStableIncomeTimingSource(localUserId, savedSource)"), true);
  assert.equal(repository.includes("syncStableIncomeTimingSource(localUserId, archivedSource)"), true);
  assert.equal(repository.includes("removeStableIncomeTimingSource(localUserId, id)"), true);
  assert.equal(timingAuthority.includes("reconcileStableIncomeTimingCache"), true);
});

test("stable income minimum is projected as derived money-in from the canonical Income Hub source", () => {
  assert.equal(scheduleProjection.includes("buildCanonicalStableIncomeTimingSource"), true);
  assert.equal(scheduleProjection.includes('type: "Payday"'), true);
  assert.equal(scheduleProjection.includes('source: "stable_income_minimum"'), true);
  assert.equal(scheduleProjection.includes('direction: "in"'), true);
  assert.equal(schedulePanel.includes("getIncomeSources(ownerId)"), true);
  assert.equal(recurringScheduleIntegration.includes("getIncomeSources"), false);
});

test("payday projection is render-derived; duplicate storage and forced Calendar remount are gone", () => {
  assert.equal(recurringScheduleIntegration.includes("RECURRING_SCHEDULE_WINDOW_MONTHS = 12"), true);
  assert.equal(recurringScheduleIntegration.includes("persistIncomeScheduleProjection"), false);
  assert.equal(recurringScheduleIntegration.includes('SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2"'), false);
  assert.equal(recurringScheduleIntegration.includes("clara:schedule:sync-income-events"), false);
  assert.equal(schedulePortal.includes("clara:schedule:sync-income-events"), false);
  assert.equal(schedulePortal.includes("setScheduleRevision"), false);
  assert.equal(schedulePanel.includes("mergeScheduleEventsForRender"), true);
  assert.equal(schedulePanel.includes("isStableIncomeScheduleProjection"), true);
});

test("Income Hub card no longer injects redundant usual timing text", () => {
  assert.equal(surfacesEntry.includes("Usually received:"), false);
  assert.equal(surfacesEntry.includes("formatIncomeTimingLabel"), false);
  assert.equal(surfacesEntry.trim(), 'export * from "./IncomeHubExpandedSurfaces.jsx";');
});

test("Budget opens through the canonical Income Hub timing read before using the synchronous cache", () => {
  assert.equal(budgetTimingHook.includes('import { getIncomeSources } from "@/lib/incomeHubRepository"'), true);
  assert.equal(budgetTimingHook.includes("getIncomeSources(ownerId)"), true);
  assert.equal(budgetTimingHook.includes("resolveIncomeBasedBudgetPeriod"), true);
});

test("existing Stable Income backfills a missing timing cache and Buy Check window", () => {
  const ownerId = "stable-income-backfill";
  resetTiming(ownerId);

  reconcileStableIncomeTimingCache(ownerId, [stableSalary()]);

  const timings = getIncomeTimingRecords(ownerId);
  assert.equal(timings.length, 1);
  assert.equal(timings[0].incomeSourceId, "salary-1");

  const window = getExpectedIncomeWindow(ownerId, "2026-08-20");
  assert.equal(window.previousExpectedDate, "2026-08-15");
  assert.equal(window.nextExpectedDate, "2026-08-30");
  assert.equal(window.daysUntilNextIncome, 10);
  assert.equal(window.timing.sourceName, "Salary");
});

test("monthly stable income can project an earlier payday in the current visible month", () => {
  const ownerId = "stable-income-current-month";
  resetTiming(ownerId);

  reconcileStableIncomeTimingCache(ownerId, [
    stableSalary({
      incomeRecurrence: {
        type: "monthly",
        startDate: "2026-08-15",
        dayOfMonth: 10,
      },
    }),
  ]);

  const [timing] = getIncomeTimingRecords(ownerId);
  const occurrences = getRecurrenceOccurrences(
    timing.recurrence,
    "2026-08-01",
    "2026-08-31",
    { kind: "income" }
  );

  assert.deepEqual(occurrences, ["2026-08-10"]);
});

test("twice-monthly payday edits replace old recurrence without duplicate timing records", () => {
  const ownerId = "stable-income-edit";
  resetTiming(ownerId);

  reconcileStableIncomeTimingCache(ownerId, [stableSalary()]);
  reconcileStableIncomeTimingCache(ownerId, [
    stableSalary({
      incomeRecurrence: {
        type: "twice_monthly",
        startDate: "2026-08-15",
        days: [10, 25],
      },
    }),
  ]);

  const timings = getIncomeTimingRecords(ownerId);
  assert.equal(timings.length, 1);
  assert.deepEqual(
    getRecurrenceOccurrences(
      timings[0].recurrence,
      "2026-08-01",
      "2026-08-31",
      { kind: "income" }
    ),
    ["2026-08-10", "2026-08-25"]
  );
});

test("weekly and biweekly Stable Income remain supported by the canonical authority", () => {
  const weeklyOwner = "stable-income-weekly";
  resetTiming(weeklyOwner);
  reconcileStableIncomeTimingCache(weeklyOwner, [
    stableSalary({
      incomeRecurrence: {
        type: "weekly",
        startDate: "2026-08-03",
        dayOfWeek: 1,
      },
    }),
  ]);
  const [weekly] = getIncomeTimingRecords(weeklyOwner);
  assert.deepEqual(
    getRecurrenceOccurrences(
      weekly.recurrence,
      "2026-08-01",
      "2026-08-31",
      { kind: "income" }
    ),
    ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"]
  );

  const biweeklyOwner = "stable-income-biweekly";
  resetTiming(biweeklyOwner);
  reconcileStableIncomeTimingCache(biweeklyOwner, [
    stableSalary({
      incomeRecurrence: {
        type: "biweekly",
        startDate: "2026-08-03",
      },
    }),
  ]);
  const [biweekly] = getIncomeTimingRecords(biweeklyOwner);
  assert.deepEqual(
    getRecurrenceOccurrences(
      biweekly.recurrence,
      "2026-08-01",
      "2026-08-31",
      { kind: "income" }
    ),
    ["2026-08-03", "2026-08-17", "2026-08-31"]
  );
});

test("Stable to Irregular, archive, and delete states remove only derived salary timing", () => {
  const ownerId = "stable-income-removal";
  resetTiming(ownerId);

  const source = stableSalary();
  reconcileStableIncomeTimingCache(ownerId, [source]);
  assert.equal(getIncomeTimingRecords(ownerId).length, 1);

  syncStableIncomeTimingSource(ownerId, {
    ...source,
    stability: "Irregular",
  });
  assert.equal(getIncomeTimingRecords(ownerId).length, 0);

  reconcileStableIncomeTimingCache(ownerId, [source]);
  syncStableIncomeTimingSource(ownerId, {
    ...source,
    isArchived: true,
  });
  assert.equal(getIncomeTimingRecords(ownerId).length, 0);

  reconcileStableIncomeTimingCache(ownerId, [source]);
  reconcileStableIncomeTimingCache(ownerId, []);
  assert.equal(getIncomeTimingRecords(ownerId).length, 0);
});

test("timing reconciliation never converts projected salary into actual money", () => {
  const ownerId = "stable-income-no-phantom-money";
  resetTiming(ownerId);
  const source = stableSalary();
  const before = structuredClone(source);

  reconcileStableIncomeTimingCache(ownerId, [source]);

  assert.deepEqual(source, before);
  assert.equal(source.currentBalance, 4200);
  assert.equal(source.totalMoneyIn, 30000);
  assert.equal(source.totalMoneyOut, 25800);
});

test("one Hide tap is not swallowed by an open source menu", () => {
  assert.equal(card.includes("data-clara-finance-expand-toggle"), true);
  assert.equal(card.includes("suppressRootClickUntilRef"), false);
  assert.match(card, /closeIncomeActionMenu\(\);\s*return;/);
});

test("Income Hub validation and local date are visible and deterministic", () => {
  assert.equal(addMoneyModal.includes("toLocalDateKey(new Date())"), true);
  assert.equal(addMoneyModal.includes("submitDisabledLabel"), true);
  assert.equal(addMoneyModal.includes("setError(saveError?.message"), true);
  assert.equal(financeActionModal.includes('submitDisabledLabel = "Unavailable"'), true);
});

test("recent activity is operation history rather than aggregate totals", () => {
  assert.equal(repository.includes("incomeActivityLog"), true);
  assert.equal(surfaces.includes("getActivityLog"), true);
  assert.equal(surfaces.includes('type === "transfer_money"'), true);
  assert.equal(surfaces.includes("if (moneyOut > 0)"), false);
});

test("Income Hub refresh listens to one source event", () => {
  assert.equal(cardLogic.includes('addEventListener("clara-income-hub-updated"'), true);
  assert.equal(cardLogic.includes('addEventListener("clara-finance-updated"'), false);
});

test("closed Income Hub modals are not mounted", () => {
  assert.equal(card.includes("{incomeSourceModal.type ? ("), true);
  assert.equal(card.includes("{sourceFormModal.open ? ("), true);
  assert.equal(card.includes("{removalSource ? ("), true);
});
