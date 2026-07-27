import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Life Stage Setup is a route-level page outside Dashboard Layout", () => {
  const app = read("src/App.jsx");
  const setupRouteIndex = app.indexOf('path="/life-stage/setup"');
  const layoutRouteIndex = app.indexOf('path="/*"');
  const layoutIndex = app.indexOf("<Layout>");

  assert.notEqual(setupRouteIndex, -1, "missing /life-stage/setup route");
  assert.notEqual(layoutRouteIndex, -1, "missing authenticated Layout route");
  assert.notEqual(layoutIndex, -1, "missing Layout wrapper");
  assert.ok(
    setupRouteIndex < layoutRouteIndex && setupRouteIndex < layoutIndex,
    "Life Stage Setup must be declared before and outside the Layout/Dashboard route tree"
  );
  assert.match(app, /guard\(<LifeStageSetup\s*\/>\s*,\s*"\/life-stage\/setup"\)/);
});

test("Me navigates to setup instead of rendering an embedded overlay", () => {
  const me = read(
    "src/components/fresh/main-dashboard/dashboard-panels/me/FinancialClimateUniversalScreen.jsx"
  );

  assert.match(me, /navigate\("\/life-stage\/setup"\)/);
  assert.doesNotMatch(me, /showStageSetup/);
  assert.doesNotMatch(me, /LifeStageSetupScreen/);
  assert.doesNotMatch(me, /z-\[9999\]/);
  assert.doesNotMatch(me, /h-\[100svh\]/);
});

test("dedicated setup page owns the real viewport and only its middle content scrolls", () => {
  const setup = read("src/pages/LifeStageSetup.jsx");

  assert.match(setup, /h-\[100dvh\]/);
  assert.match(setup, /paddingTop:\s*"env\(safe-area-inset-top, 0px\)"/);
  assert.match(setup, /paddingBottom:\s*"env\(safe-area-inset-bottom, 0px\)"/);
  assert.match(setup, /<main className="[^"]*min-h-0 flex-1 overflow-y-auto/);
  assert.match(setup, /<footer className="[^"]*shrink-0/);
  assert.match(setup, /<header className="[^"]*rounded-\[28px\][^"]*border/);

  for (const forbidden of [
    "fixed inset-y-0",
    "left-1/2",
    "z-[9999]",
    "h-[100svh]",
    "pt-[max(18px,env(safe-area-inset-top))]",
  ]) {
    assert.equal(setup.includes(forbidden), false, `obsolete setup geometry remains: ${forbidden}`);
  }
});

test("setup returns explicitly to Dashboard Me after cancel or save", () => {
  const setup = read("src/pages/LifeStageSetup.jsx");
  const nav = read(
    "src/components/fresh/main-dashboard/shell/useDashboardPanelNavigation.js"
  );

  assert.match(
    setup,
    /navigate\("\/dashboard",\s*\{[\s\S]*state:\s*\{\s*dashboardPanel:\s*"me"/
  );
  assert.match(nav, /const ROUTE_RETURN_PANEL_KEY = "dashboardPanel"/);
  assert.match(nav, /routeState\?\.\[ROUTE_RETURN_PANEL_KEY\]/);
});

test("obsolete embedded Life Stage setup escape patches stay retired", () => {
  const runtime = read("src/runtime/installClaraRuntimePatches.js");
  const openingRefine = read("src/life-stage-opening-page-refine.js");

  for (const obsoleteImport of [
    "life-stage-setup-flow-polish",
    "life-stage-setup-scale.css",
    "life-stage-setup-flow-polish.css",
    "life-stage-question-compact-mobile.css",
    "life-stage-option-chips.css",
  ]) {
    assert.equal(
      runtime.includes(obsoleteImport),
      false,
      `runtime still imports obsolete setup patch: ${obsoleteImport}`
    );
  }

  assert.doesNotMatch(openingRefine, /findLifeStageSetupScreen/);
  assert.doesNotMatch(openingRefine, /clara-life-stage-setup-dedicated/);
  assert.doesNotMatch(openingRefine, /style\.setProperty\("transform",\s*"none"/);
  assert.doesNotMatch(openingRefine, /style\.setProperty\("contain",\s*"none"/);

  for (const deletedPath of [
    "src/life-stage-question-compact-mobile.css",
    "src/life-stage-setup-flow-polish.css",
    "src/life-stage-option-chips.css",
    "src/life-stage-setup-scale.css",
    "src/life-stage-setup-flow-polish.js",
  ]) {
    assert.equal(existsSync(new URL(`../${deletedPath}`, import.meta.url)), false);
  }
});
