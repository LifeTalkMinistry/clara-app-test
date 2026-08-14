import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const manual = read("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleManualPanel.jsx");
const panelEntry = read("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.js");
const portalEntry = read("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardScheduleImpactPortalPanel.jsx");
const fullPageEntry = read("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanelFullPage.js");

test("all schedule entry points use the manual scheduler", () => {
  for (const source of [panelEntry, portalEntry, fullPageEntry]) {
    assert.match(source, /DashboardScheduleManualPanel\.jsx/);
    assert.doesNotMatch(source, /Gemini|schedule-impact-service|ai-command/i);
  }
});

test("manual scheduler contains no AI request path", () => {
  assert.doesNotMatch(manual, /askGemini|schedule-impact-service|gemini-service|requestClaraGemini/i);
  assert.doesNotMatch(manual, /Refine with CLARA|Calculate money impact|AI will calculate/i);
});

test("manual scheduler is explicitly user-controlled", () => {
  assert.match(manual, /Does this affect your money\?/);
  assert.match(manual, /Money out/);
  assert.match(manual, /Money in/);
  assert.match(manual, /Not sure yet/);
  assert.match(manual, /Amount pending/);
  assert.match(manual, /Save schedule/);
  assert.match(manual, /CLARA only records what you enter/);
});

test("manual scheduler reuses the existing schedule event channel", () => {
  assert.match(manual, /clara:schedule:create-event/);
  assert.match(manual, /new CustomEvent\(CLARA_SCHEDULE_CREATE_EVENT/);
  assert.match(manual, /impactBreakdown/);
  assert.match(manual, /source: "manual"/);
});

test("legacy add triggers are intercepted before the old assistant form opens", () => {
  assert.match(manual, /ariaLabel === "Add schedule"/);
  assert.match(manual, /DOUBLE_TAP_DELAY_MS/);
  assert.match(manual, /event\.stopImmediatePropagation/);
  assert.match(manual, /openManual\(date\)/);
});
