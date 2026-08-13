import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

const CORE_FEATURES = [
  "dashboard",
  "feed",
  "expenses",
  "wallets",
  "budgets",
  "analytics",
  "ai",
  "customization",
  "savings_goals",
  "tasks",
  "modules",
  "community",
  "messages",
  "news",
  "referrals",
];

test("P0-F14 has one immutable free-core product policy", async () => {
  const source = await read("../src/lib/plan-config.js");

  assert.match(source, /export const FREE_ACCESS_CONFIG = Object\.freeze\(\{/);
  for (const feature of CORE_FEATURES) {
    assert.match(source, new RegExp(`${feature}: \\\"full\\\"`));
  }
  assert.match(source, /coaching: "teaser"/);
  assert.match(source, /export function getFreeCoreFeatureModes\(\)/);
  assert.match(source, /export function isFreeCoreRoute\(pathname\)/);
});

test("normal access modes cannot be sourced from paid or admin-editable plan configuration", async () => {
  const source = await read("../src/hooks/useUserRole.js");

  assert.match(source, /getFreeCoreFeatureModes/);
  assert.match(source, /const featureModes = useMemo\(\(\) => getFreeCoreFeatureModes\(\), \[\]\)/);
  assert.doesNotMatch(source, /buildFreeCoreModes/);
  assert.doesNotMatch(source, /getPlanDefaults\(COMMITTED_PLAN_KEY\)/);
  assert.doesNotMatch(source, /featureModes\s*=\s*useMemo\([\s\S]*plansByKey/);
});

test("legacy Committed guards cannot deny a canonical free-core route", async () => {
  const source = await read(
    "../src/components/fresh/main-dashboard/program-access/committedFeatureAccess.js",
  );

  assert.match(source, /import \{ isFreeCoreRoute \} from "@\/lib\/plan-config"/);
  assert.match(source, /if \(isFreeCoreRoute\(getCurrentAppPath\(\)\)\) return true/);
  assert.match(source, /return hasCommittedAccess/);
});

test("Ask Before You Spend has no paid, subscription, beta, or daily-quota entitlement gate", async () => {
  const source = await read(
    "../src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlow.js",
  );

  assert.match(source, /return useClaraBuyCheckFlowV5\(\{ assistantContext \}\)/);
  assert.doesNotMatch(
    source,
    /hasCommittedAccess|openCommittedVersionModal|canUseFreeBuyCheckToday|recordFreeBuyCheckCompletion|subscription|beta|paid plan|Committed access code/,
  );
});

test("financial core cards cannot be plan-gated or profile-feature-flag-gated", async () => {
  const source = await read(
    "../src/components/financial-carousel/logic/FinancialCardRegistry.js",
  );

  for (const card of [
    "investmentFund",
    "wallet",
    "budget",
    "emergencyFund",
    "savingsGoals",
    "debtObligations",
  ]) {
    assert.match(
      source,
      new RegExp(`key: \\\"${card}\\\"[\\s\\S]*?minimumPlan: \\\"free\\\"`),
    );
  }

  assert.doesNotMatch(source, /COMMITTED_PLAN_KEY|lockedTier|meetsFinancialPlanRequirement/);
  assert.doesNotMatch(source, /profileData\?\.feature_flags|featureFlags\[/);
  assert.match(source, /locked: false/);
});

test("Daily Money Tip and Community navigation remain visibly free", async () => {
  const [dailyTipSource, panelUiSource] = await Promise.all([
    read("../src/components/fresh/main-dashboard/daily-tip/index.js"),
    read("../src/components/fresh/main-dashboard/shell/useDashboardPanelUiState.js"),
  ]);

  assert.match(dailyTipSource, /hasCommittedAccess: true/);
  assert.match(dailyTipSource, /onOpenCommitmentBooklet: undefined/);
  assert.match(
    panelUiSource,
    /\{ key: "community", label: "Community", icon: Users, badge: null \}/,
  );
});

test("paid and special services remain outside the free-core route policy", async () => {
  const source = await read("../src/lib/plan-config.js");

  assert.doesNotMatch(source, /"\/welcome-session"\s*:/);
  assert.doesNotMatch(source, /"\/activation"\s*:/);
  assert.doesNotMatch(source, /"\/admin"\s*:/);
  assert.match(source, /coaching: "teaser"/);
});
