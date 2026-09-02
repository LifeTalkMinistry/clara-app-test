import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Financial Context Setup state is versioned, account scoped, and stored in the private finance vault", async () => {
  const source = await read("../src/lib/financialContextSetupRepository.js");

  assert.match(source, /FINANCIAL_CONTEXT_SETUP_VERSION\s*=\s*1/);
  assert.match(source, /LOCAL_FINANCE_STORES\?\.privatePreferences/);
  assert.match(source, /financial-context-setup:v\$\{FINANCIAL_CONTEXT_SETUP_VERSION\}:\$\{owner\}/);
  assert.match(source, /status:\s*"not_started"/);
  assert.match(source, /currentStep:\s*"intro"/);
  assert.match(source, /incomeHub:\s*null/);
  assert.match(source, /wallet:\s*null/);
  assert.match(source, /moneySchedule:\s*null/);
  assert.match(source, /obligations:\s*null/);
  assert.doesNotMatch(source, /localStorage\.setItem\(/);
  assert.doesNotMatch(source, /indexedDB\.open\(/);
});

test("pre-feature migration is explicit, versioned, idempotent, and not inferred from missing finance rows", async () => {
  const source = await read("../src/lib/financialContextSetupRepository.js");

  assert.match(source, /FINANCIAL_CONTEXT_SETUP_ROLLOUT_AT/);
  assert.match(source, /accountCreatedAt/);
  assert.match(source, /pre_feature_migration/);
  assert.match(source, /if \(existing\) return existing/);
  assert.doesNotMatch(source, /getDebtObligations/);
  assert.doesNotMatch(source, /readClaraMoneyRoutine/);
  assert.doesNotMatch(source, /getWallets/);
});

test("Community keeps product access ahead of the Financial Context Setup gate", async () => {
  const source = await read("../src/pages/Community.jsx");

  assert.match(source, /ClaraTrialAccessGate/);
  assert.match(source, /ClaraFinancialContextSetupCoordinator/);
  assert.match(source, /ensureFinancialContextSetupState/);
  assert.match(source, /gateFinancialContextSetup/);

  const trialBranch = source.indexOf(") : gateCurrentView ? (");
  const setupBranch = source.indexOf(") : gateFinancialContextSetup ? (");
  const orbBranch = source.indexOf(") : activeView === "orb" ? (");
  assert.ok(trialBranch >= 0, "existing product gate branch must remain present");
  assert.ok(setupBranch > trialBranch, "Financial Context Setup must render after product access");
  assert.ok(orbBranch > setupBranch, "normal ORB must render only after Financial Context Setup");
});

test("the coordinator owns progression while existing financial features remain canonical", async () => {
  const source = await read("../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx");

  assert.match(source, /ClaraAddIncomeOverlayV2/);
  assert.match(source, /ClaraWalletOverlayV2/);
  assert.match(source, /ClaraMoneyScheduleOverlay/);
  assert.match(source, /ClaraDebtObligationOverlay/);
  assert.match(source, /completeFinancialContextSetupStep/);
  assert.match(source, /nextStep:\s*"wallet"/);
  assert.match(source, /nextStep:\s*"money_schedule"/);
  assert.match(source, /nextStep:\s*"obligations"/);
  assert.match(source, /nextStep:\s*"review"/);
  assert.match(source, /outcome:\s*"none_confirmed"/);
  assert.match(source, /onWalletReady=\{handleWalletReady\}/);
  assert.match(source, /isActiveWalletForMoneySemantics/);
});

test("plain child close does not directly persist successor completion", async () => {
  const source = await read("../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx");

  const incomeClose = source.slice(source.indexOf("const handleIncomeClose"), source.indexOf("const handleIncomeOpenWallet"));
  const scheduleClose = source.slice(source.indexOf("const handleMoneyScheduleClose"), source.indexOf("const handleObligationsClose"));
  const obligationsClose = source.slice(source.indexOf("const handleObligationsClose"), source.indexOf("const finishSetup"));

  assert.doesNotMatch(incomeClose, /completeStep\(/);
  assert.doesNotMatch(scheduleClose, /completeStep\(/);
  assert.doesNotMatch(obligationsClose, /completeStep\(/);
  assert.match(incomeClose, /setCloseConfirmation/);
  assert.match(scheduleClose, /setCloseConfirmation/);
  assert.match(obligationsClose, /setCloseConfirmation/);
});

test("Money Schedule and obligations require explicit none confirmation instead of empty-row inference", async () => {
  const source = await read("../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx");

  assert.match(source, /I have no routine spending yet/);
  assert.match(source, /step:\s*"money_schedule",\s*outcome:\s*"none_confirmed"/s);
  assert.match(source, /I have no debt or obligations/);
  assert.match(source, /step:\s*"obligations",\s*outcome:\s*"none_confirmed"/s);
});

test("Review reads canonical Means authority and never invents an initial 100", async () => {
  const source = await read("../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx");

  assert.match(source, /buildCanonicalMeansSnapshot/);
  assert.match(source, /meansScoreResolved/);
  assert.match(source, /Cycle 100 Anchor is not currently resolved/);
  assert.match(source, /CLARA will not invent a score/);
  assert.doesNotMatch(source, /calculateMeansScore/);
  assert.doesNotMatch(source, /meansScore\s*[:=]\s*100/);
});

test("dashboard remains routed through the Community authority so setup cannot be bypassed", async () => {
  const source = await read("../src/App.jsx");
  assert.match(source, /path="\/dashboard"/);
  assert.match(source, /<Navigate to=\{CLARA_HOME_PATH\} replace \/>/);
});
