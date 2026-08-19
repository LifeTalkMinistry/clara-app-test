import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getWeeklyMoneyCheckScheduleDates,
  getWeeklyMoneyCheckViewState,
  normalizeWeeklyMoneyCheck,
} from "../src/lib/weeklyMoneyCheckStore.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const weeklyCard = readSource("src/components/WeeklyMoneyCheckCard.jsx");
const budgetCardView = readSource("src/components/financial-carousel/cards/budget/ui/BudgetCardView.jsx");

function localDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

test("Weekly Money Check owns the old Budget carousel slot without reviving Budget UI", () => {
  assert.match(budgetCardView, /import WeeklyMoneyCheckCard from "@\/components\/WeeklyMoneyCheckCard"/);
  assert.doesNotMatch(budgetCardView, /import BudgetCard from/);
  assert.match(budgetCardView, /<WeeklyMoneyCheckCard/);
  assert.match(budgetCardView, /onCompleteBudget=\{onCompleteBudget\}/);
  assert.match(weeklyCard, /Weekly Money Check/);
  assert.doesNotMatch(weeklyCard, /Set up my budget|Reuse last budget|View budget details|Hide budget details/);
  assert.match(weeklyCard, /expanded=\{false\}/);
  assert.doesNotMatch(weeklyCard, /onToggleDetails|FinanceCardExpandButton/);
});

test("Weekly Money Check card exposes the five agreed lifecycle states", () => {
  for (const state of ["setup", "waiting", "ready", "in_progress", "completed"]) {
    assert.match(weeklyCard, new RegExp(`view\\.state === \\"${state}\\"`));
  }
  assert.match(weeklyCard, /data-weekly-money-check-state=\{view\.state\}/);
  assert.match(weeklyCard, /Choose check-in day/);
  assert.match(weeklyCard, /Start with CLARA/);
  assert.match(weeklyCard, /Continue with CLARA/);
  assert.match(weeklyCard, /clara:open-ai-chat/);
});

test("the card remains a passive viewer while the real CLARA flow owns cross-check progression", () => {
  assert.doesNotMatch(weeklyCard, /startWeeklyMoneyCheck/);
  assert.match(weeklyCard, /WEEKLY_MONEY_CHECK_PROGRESS_EVENT/);
  assert.match(weeklyCard, /WEEKLY_MONEY_CHECK_COMPLETED_EVENT/);
  assert.match(weeklyCard, /updateWeeklyMoneyCheckProgress/);
  assert.match(weeklyCard, /completeWeeklyMoneyCheck/);
  assert.doesNotMatch(weeklyCard, /View calendar|View schedule/);
});

test("a new Wednesday setup for Sunday waits until the first Sunday", () => {
  const record = normalizeWeeklyMoneyCheck({
    enabled: true,
    checkInDay: 0,
    scheduleStartedOn: "2026-08-19",
  });
  const schedule = getWeeklyMoneyCheckScheduleDates(record, localDate(2026, 7, 21));
  const view = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 21));
  assert.equal(schedule.firstDue, "2026-08-23");
  assert.equal(schedule.nextDue, "2026-08-23");
  assert.equal(view.state, "waiting");
});

test("scheduled day becomes ready and remains actionable if the user is late", () => {
  const record = normalizeWeeklyMoneyCheck({
    enabled: true,
    checkInDay: 0,
    scheduleStartedOn: "2026-08-19",
  });
  const sunday = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 23));
  const monday = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 24));
  assert.equal(sunday.state, "ready");
  assert.equal(sunday.overdueDays, 0);
  assert.equal(monday.state, "ready");
  assert.equal(monday.overdueDays, 1);
});

test("an active cross-check stays in progress until CLARA completes it", () => {
  const record = normalizeWeeklyMoneyCheck({
    enabled: true,
    checkInDay: 0,
    scheduleStartedOn: "2026-08-19",
    inProgressStartedAt: "2026-08-23T12:00:00.000Z",
    progress: { walletsChecked: 2, walletCount: 4 },
  });
  const view = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 24));
  assert.equal(view.state, "in_progress");
  assert.equal(view.progress.walletsChecked, 2);
  assert.equal(view.progress.walletCount, 4);
});

test("a completed check celebrates briefly, then returns to waiting before the next cycle", () => {
  const record = normalizeWeeklyMoneyCheck({
    enabled: true,
    checkInDay: 0,
    scheduleStartedOn: "2026-08-19",
    lastCompletedAt: "2026-08-23T12:00:00.000Z",
    lastResult: {
      expected: 3200,
      actual: 3050,
      status: "aligned",
      headline: "Spending aligned",
    },
  });
  const monday = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 24));
  const wednesday = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 26));
  const nextSunday = getWeeklyMoneyCheckViewState(record, localDate(2026, 7, 30));
  assert.equal(monday.state, "completed");
  assert.equal(monday.lastResult.difference, -150);
  assert.equal(wednesday.state, "waiting");
  assert.equal(wednesday.nextDue, "2026-08-30");
  assert.equal(nextSunday.state, "ready");
});
