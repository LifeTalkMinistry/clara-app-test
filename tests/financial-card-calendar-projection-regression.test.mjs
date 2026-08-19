import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const integrationSource = readFileSync(
  new URL(
    "../src/components/fresh/main-dashboard/dashboard-panels/schedule/financialCardScheduleIntegration.js",
    import.meta.url
  ),
  "utf8"
);

const portalSource = readFileSync(
  new URL(
    "../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.js",
    import.meta.url
  ),
  "utf8"
);

test("Savings Goal planned-use dates are projected into Schedule", () => {
  assert.match(integrationSource, /planned_use_date/);
  assert.match(integrationSource, /buildSavingsGoalScheduleProjection/);
  assert.match(integrationSource, /savings_goal_card_projection/);
  assert.match(integrationSource, /type:\s*"Money"/);
});

test("Debt and obligation due dates are projected into Schedule", () => {
  assert.match(integrationSource, /getDebtDueDay/);
  assert.match(integrationSource, /buildDebtObligationScheduleProjection/);
  assert.match(integrationSource, /debt_obligation_card_projection/);
  assert.match(integrationSource, /type:\s*"Bill"/);
});

test("Schedule refreshes when financial-card records change", () => {
  assert.match(portalSource, /syncFinancialCardSchedulesIntoCalendar/);
  assert.match(portalSource, /clara:debt-obligations-updated/);
  assert.match(portalSource, /clara-finance-updated/);
  assert.match(portalSource, /financialProjectionEpoch/);
});
