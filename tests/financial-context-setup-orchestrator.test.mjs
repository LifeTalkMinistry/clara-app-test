import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const repositoryPath = "../src/lib/financialContextSetupRepository.js";
const coordinatorPath = "../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx";
const communityPath = "../src/pages/Community.jsx";
const appPath = "../src/App.jsx";

test("dormant financial context setup state remains versioned, account scoped, and private", async () => {
  const setup = await source(repositoryPath);
  const financeStore = await source("../src/lib/localFinanceStore.js");

  assert.match(setup, /FINANCIAL_CONTEXT_SETUP_VERSION\s*=\s*1/);
  assert.match(setup, /LOCAL_FINANCE_STORES\.privatePreferences/);
  assert.match(
    setup,
    /financial-context-setup:v\$\{FINANCIAL_CONTEXT_SETUP_VERSION\}:\$\{encodeURIComponent\(owner\)\}/
  );
  assert.match(setup, /migration:\s*\{\s*reason:\s*"pre_feature_migration"/s);
  assert.match(setup, /shouldGrandfatherFinancialContextSetup/);
  assert.match(setup, /createdAtMs < rolloutAtMs/);
  assert.match(setup, /if \(!Number\.isFinite\(createdAtMs\).*return false/s);
  assert.match(
    financeStore,
    /LOCAL_FINANCE_PRIVATE_STORES[\s\S]*LOCAL_FINANCE_STORES\.privatePreferences/
  );
});

test("dormant setup repository still owns one deterministic resumable state machine", async () => {
  const setup = await source(repositoryPath);

  for (const step of [
    "intro",
    "income_hub",
    "wallet",
    "money_schedule",
    "obligations",
    "review",
    "complete",
  ]) {
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

test("Community deliberately does not force Financial Context Setup before normal CLARA use", async () => {
  const community = await source(communityPath);

  assert.doesNotMatch(community, /ClaraFinancialContextSetupCoordinator/);
  assert.doesNotMatch(community, /resolveFinancialContextSetupState/);
  assert.doesNotMatch(community, /financialSetupGateActive/);
  assert.doesNotMatch(community, /data-clara-financial-context-gated/);
  assert.doesNotMatch(community, /getResetFreshLocalVaultId|getActiveLocalVaultId/);
  assert.match(community, /<CommunityShellHeader activeView=\{activeView\} unreadCount=\{unreadCount\} \/>/);
  assert.match(community, /activeView === "orb"/);
  assert.match(community, /<ClaraOrbPage \/>/);
});

test("dashboard, home, orb, refresh, and manual community views converge on Community without reintroducing the removed setup gate", async () => {
  const app = await source(appPath);
  const community = await source(communityPath);

  assert.match(app, /path="\/dashboard"[\s\S]*Navigate to="\/community\?view=home"/);
  assert.match(app, /path="\/community"[\s\S]*<Community/);
  assert.match(community, /requestedView = searchParams\.get\("view"\) \|\| "orb"/);
  assert.doesNotMatch(community, /financialSetupGateActive/);
  assert.doesNotMatch(community, /localStorage\.setItem\([^\n]*financial/i);
});

test("the old setup coordinator remains isolated and reusable instead of being destructively deleted", async () => {
  const coordinator = await source(coordinatorPath);
  const community = await source(communityPath);

  assert.match(coordinator, /ClaraAddIncomeOverlay/);
  assert.match(coordinator, /ClaraWalletOverlay/);
  assert.match(coordinator, /ClaraMoneyScheduleOverlay/);
  assert.match(coordinator, /ClaraDebtObligationOverlay/);
  assert.match(coordinator, /startFinancialContextSetup/);
  assert.match(coordinator, /recordFinancialContextSetupOutcome/);
  assert.match(coordinator, /completeFinancialContextSetup/);
  assert.match(coordinator, /data-clara-financial-context-setup="true"/);
  assert.doesNotMatch(community, /ClaraFinancialContextSetupCoordinator/);
});

test("dormant setup migration remains account-age based and never infers confirmation from missing finance rows", async () => {
  const setup = await source(repositoryPath);

  assert.match(setup, /if \(existing\) return existing/);
  assert.match(setup, /shouldGrandfatherFinancialContextSetup\(accountCreatedAt\)/);
  assert.match(setup, /pre_feature_migration/);
  assert.match(setup, /Finance-row absence is never interpreted as confirmation/);
  assert.doesNotMatch(
    setup,
    /getDebtObligations|getIncomeSources|getWallets|readClaraMoneyRoutine/
  );
});

test("Clear Data stays device-scoped and does not silently reactivate the removed Community setup gate", async () => {
  const community = await source(communityPath);
  const reset = await source("../src/lib/clear-clara-device-data.js");
  const syncPolicy = await source("../src/lib/cloud-sync-policy.js");

  assert.match(reset, /pauseOnlineSyncAfterDeviceReset\(\{ freshVaultId \}\)/);
  assert.match(syncPolicy, /getResetFreshLocalVaultId/);
  assert.doesNotMatch(community, /getResetFreshLocalVaultId/);
  assert.doesNotMatch(community, /forceFresh/);
  assert.doesNotMatch(community, /financialSetupAppliesToUser/);
});

test("if the dormant setup is ever reactivated, its coordinator still uses the canonical finance owner", async () => {
  const coordinator = await source(coordinatorPath);
  const setup = await source(repositoryPath);
  const transfer = await source("../src/lib/device-transfer-vault.js");

  assert.match(coordinator, /getIncomeHubLocalUserId\(user\)/);
  assert.match(setup, /encodeURIComponent\(owner\)/);
  assert.match(setup, /LOCAL_FINANCE_STORES\.privatePreferences/);
  assert.match(transfer, /LOCAL_FINANCE_PRIVATE_STORES/);
  assert.match(transfer, /private_preferences/);
});
