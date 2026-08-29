import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test.skip("Dashboard schedule creation must reject brand-new past dates at the mutation boundary", async () => {
  const dashboard = await source("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx");
  assert.match(dashboard, /financialDateKey|today/);
  assert.match(dashboard, /date.*<.*today|targetDate.*<.*today/);
});
