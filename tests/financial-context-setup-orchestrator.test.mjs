import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const repositoryPath = "../src/lib/financialContextSetupRepository.js";
const coordinatorPath = "../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx";
const communityPath = "../src/pages/Community.jsx";
const appPath = "../src/App.jsx";
const addIncomePath = "../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx";
const moneySchedulePath = "../src/components/fresh/main-dashboard/assistant/ClaraMoneyScheduleOverlay.jsx";
const obligationsPath = "../src/components/fresh/main-dashboard/assistant/ClaraDebtObligationOverlay.jsx";

test("financial context setup state is versioned, account scoped, and stored with private finance preferences", async () => {
  const setup = await source(repositoryPath);
  const financeStore = await source("../src/lib/localFinanceStore.js");

  assert.match(setup, /FINANCIAL_CONTEXT_SETUP_VERSION\s*=\s*1/);
  assert.match(setup, /LOCAL_FINANCE_STORES\.privatePreferences/);
  assert.match(setup, /financial-context-setup:v\$\{FINANCIAL_CONTEXT_SETUP_VERSION\}:\$\{encodeURIComponent\(owner\)\}/);
  assert.match(setup, /migration:\s*\{\s*reason:\s*"pre_feature_migration"/s);
  assert.match(setup, /shouldGrandfatherFinancialContextSetup/);
  assert.match(setup, /createdAtMs < rolloutAtMs/);
  assert.match(setup, /if \(!Number\.isFinite\(createdAtMs\).*return false/s);
  assert.match(financeStore, /LOCAL_FINANCE_PRIVATE_STORES[\s\S]*LOCAL_FINANCE_STORES\.privatePreferences/);
});

test("setup repository owns one deterministic resumable state machine", async () => {
  const setup = await source(repositoryPath);

  for (const step of ["intro", "income_hub", "wallet", "money_schedule", "obligations", "review", "complete"]) {
    assert.match(setup, new RegExp(`"${step}"`));
  }

  assert.match(setup, /income_hub:\s*"wallet"/);
  assert.match(setup, /wallet:\s*"money_schedule"/);
  assert.match(setup, /money_schedule:\s*"obligations"/);
  assert.match(setup, /obligations:\s*"review"/);
  assert.match(setup, /applyFinancialContextSetupOutcome/);
  assert.match(setup, /current\.currentStep !== safeStep/);
  assert.match(setup, /currentStep:\s*successor/);
  assert.match(setup, /completeFinancialContextSetup/);
  assert.match(setup, /current\.currentStep !== "review"/);
});

test("Community preserves product access first, then gates all normal CLARA rendering on financial context completion", async () => {
  const community = await source(communityPath);
  const trialIndex = community.indexOf("gateCurrentView ?");
  const setupIndex = community.indexOf(": financialSetupGateActive ?", trialIndex);
  const orbIndex = community.indexOf(": activeView === \"orb\" ?", setupIndex);

  assert.ok(trialIndex >= 0, "existing trial/product access branch must remain present");
  assert.ok(setupIndex > trialIndex, "financial setup gate must run after product access gate");
  assert.ok(orbIndex > setupIndex, "normal ORB rendering must come after financial setup gate");
  assert.match(community, /resolveFinancialContextSetupState/);
  assert.match(community, /hasProductAccess\s*&&[\s\S]*!financialSetupComplete/);
  assert.match(community, /!financialSetupGateActive\s*\?\s*\([\s\S]*<CommunityShellHeader/);
  assert.match(community, /data-clara-financial-context-gated/);
});

test("dashboard, home, orb, refresh, and manual community views all converge on the Community-owned setup gate", async () => {
  const app = await source(appPath);
  const community = await source(communityPath);

  assert.match(app, /path="\/dashboard"[\s\S]*Navigate to="\/community\?view=home"/);
  assert.match(app, /path="\/community"[\s\S]*<Community/);
  assert.match(community, /requestedView = searchParams\.get\("view"\) \|\| "orb"/);
  assert.match(community, /financialSetupGateActive/);
  assert.doesNotMatch(community, /localStorage\.setItem\([^\n]*financial/i);
});

test("coordinator owns successor selection while existing financial children own their data", async () => {
  const coordinator = await source(coordinatorPath);

  assert.match(coordinator, /ClaraAddIncomeOverlay/);
  assert.match(coordinator, /ClaraWalletOverlay/);
  assert.match(coordinator, /ClaraMoneyScheduleOverlay/);
  assert.match(coordinator, /ClaraDebtObligationOverlay/);
  assert.match(coordinator, /recordFinancialContextSetupOutcome/);
  assert.match(coordinator, /advance\("income_hub"/);
  assert.match(coordinator, /advance\("wallet"/);
  assert.match(coordinator, /advance\("money_schedule"/);
  assert.match(coordinator, /advance\("obligations"/);
  assert.doesNotMatch(coordinator, /upsertIncomeSource|addWallet\(|saveClaraMoneyRoutine|upsertDebtObligation/);
});

test("plain child close interrupts setup and successful structured results are the only advancement boundary", async () => {
  const coordinator = await source(coordinatorPath);

  assert.match(coordinator, /const interrupt = \(\) => \{[\s\S]*setPaused\(true\)/);
  assert.ok((coordinator.match(/onClose=\{interrupt\}/g) || []).length >= 4);
  assert.match(coordinator, /result\?\.status !== "complete"/);
  assert.match(coordinator, /result\?\.status === "complete"/);
  assert.match(coordinator, /Your progress is saved\./);
  assert.match(coordinator, /Completed financial-context steps will not be repeated/);
});

test("Income Hub keeps normal ORB close behavior while setup Done reports configured", async () => {
  const income = await source(addIncomePath);

  assert.match(income, /onSetupResult/);
  assert.match(income, /onSetupResult\(\{ status: "complete", outcome: "configured" \}\)/);
  assert.match(income, /title="Add Income"[\s\S]*onClose=\{closeChat\}/);
  assert.match(income, /phase === "source-created-choice"[\s\S]*onClick=\{completeSetupStep\}[\s\S]*>Done</);
  assert.match(income, /phase === "income-home"[\s\S]*onClick=\{completeSetupStep\}[\s\S]*>Done</);
});

test("Wallet setup accepts an existing active wallet or a newly created zero-capable canonical wallet", async () => {
  const coordinator = await source(coordinatorPath);
  const wallet = await source("../src/components/fresh/main-dashboard/assistant/ClaraWalletOverlayV2.jsx");

  assert.match(coordinator, /getWallets\(localUserId\)/);
  assert.match(coordinator, /some\(isSetupWallet\)/);
  assert.match(coordinator, /advance\("wallet", "existing"\)/);
  assert.match(coordinator, /onWalletReady=\{\(\) => void advance\("wallet", "created"\)\}/);
  assert.match(wallet, /amount < 0/);
  assert.match(wallet, /or 0\./);
  assert.match(wallet, /onWalletReady\?\.\(\{ wallet: created, action: "created" \}\)/);
});

test("Money Schedule distinguishes configured, explicit none, and interruption without fake schedule data", async () => {
  const schedule = await source(moneySchedulePath);

  assert.match(schedule, /onSetupResult/);
  assert.match(schedule, /outcome: "configured"/);
  assert.match(schedule, /outcome: "none_confirmed"/);
  assert.match(schedule, /I don’t have routine spending/);
  assert.match(schedule, />Not now</);
  assert.match(schedule, /title="Money Schedule"[\s\S]*onClose=\{closeChat\}/);
  assert.doesNotMatch(schedule, /saveClaraMoneyRoutine\([^)]*none_confirmed/);
});

test("Debt and Obligations distinguishes configured, explicit none, and interruption without fake records", async () => {
  const debt = await source(obligationsPath);

  assert.match(debt, /onSetupResult/);
  assert.match(debt, /completeSetupStep\("configured"\)/);
  assert.match(debt, /completeSetupStep\("none_confirmed"\)/);
  assert.match(debt, /I have no debts or obligations/);
  assert.match(debt, /title="Debt \/ Obligations"[\s\S]*onClose=\{closeChat\}/);
  assert.doesNotMatch(debt, /upsertDebtObligation\([^)]*none_confirmed/);
});

test("review reads canonical truth and does not implement a parallel Means formula or fake 100", async () => {
  const coordinator = await source(coordinatorPath);

  assert.match(coordinator, /buildCanonicalMeansSnapshot/);
  assert.match(coordinator, /calculateMeansAvailableWalletState/);
  assert.match(coordinator, /getIncomeSources/);
  assert.match(coordinator, /getWallets/);
  assert.match(coordinator, /readClaraMoneyRoutine/);
  assert.match(coordinator, /getDebtObligations/);
  assert.match(coordinator, /Number\.isFinite\(Number\(means\?\.meansScore\)\)/);
  assert.match(coordinator, /CLARA will not invent a score/);
  assert.match(coordinator, /completeFinancialContextSetup/);
  assert.doesNotMatch(coordinator, /meansScore\s*=|meansScore:\s*100|cycle100Anchor:\s*100/);
});

test("existing-user migration is account-age based, idempotent by persisted record, and never inferred from missing finance rows", async () => {
  const setup = await source(repositoryPath);
  const community = await source(communityPath);

  assert.match(setup, /if \(existing\) return existing/);
  assert.match(setup, /shouldGrandfatherFinancialContextSetup\(accountCreatedAt\)/);
  assert.match(setup, /pre_feature_migration/);
  assert.match(setup, /Finance-row absence is never interpreted as confirmation/);
  assert.match(community, /backendUser\?\.created_at/);
  assert.match(community, /appUser\?\.created_at/);
  assert.doesNotMatch(setup, /getDebtObligations|getIncomeSources|getWallets|readClaraMoneyRoutine/);
});

test("multi-account and device-transfer safety follow the authenticated local vault private-preference authority", async () => {
  const community = await source(communityPath);
  const setup = await source(repositoryPath);
  const transfer = await source("../src/lib/device-transfer-vault.js");

  assert.match(community, /appUser\?\.local_vault_id \|\| appUser\?\.id/);
  assert.match(setup, /encodeURIComponent\(owner\)/);
  assert.match(setup, /LOCAL_FINANCE_STORES\.privatePreferences/);
  assert.match(transfer, /LOCAL_FINANCE_PRIVATE_STORES/);
  assert.match(transfer, /private_preferences/);
});
