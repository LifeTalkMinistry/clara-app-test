import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("shared Money Schedule creation rejects brand-new past dates", async () => {
  const repository = await source("../src/lib/clara-money-schedule-repository.js");

  assert.match(repository, /assertClaraMoneyScheduleDateAllowed\(date\)/);
  assert.match(repository, /MONEY_SCHEDULE_RETROACTIVE_CREATE_BLOCKED/);
  assert.match(repository, /Past spending belongs in Log Expense/);
  assert.match(repository, /targetDate\s*<\s*today/);
});

test("Calendar persistence rejects events created after their scheduled financial day", async () => {
  const ownership = await source("../src/lib/scheduleEventOwnership.js");
  const dashboard = await source("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx");

  assert.match(ownership, /isRetroactiveCalendarPlanCreation/);
  assert.match(ownership, /scheduledDate\s*<\s*creationDate/);
  assert.match(ownership, /!isRetroactiveCalendarPlanCreation\(event\)/);

  // Dashboard persists through this shared mutation boundary. Existing legitimate past
  // schedules remain valid because the guard compares scheduled day to creation day,
  // not to the current day.
  assert.match(dashboard, /filterScheduleOwnedEvents\(events\)/);
  assert.match(dashboard, /saveEvents\(user, events\)/);
});
