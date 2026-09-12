import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Founding Access is one product-level flag and defaults on", () => {
  const source = read("src/config/claraFeatureFlags.js");
  assert.match(source, /CLARA_FOUNDING_ACCESS_ENABLED/);
  assert.match(source, /VITE_CLARA_FOUNDING_ACCESS_ENABLED/);
  assert.match(source, /VITE_CLARA_FOUNDING_ACCESS_ENABLED[\s\S]*true/);
});

test("product access bypasses trial and paid state before the pricing gate can render", () => {
  const source = read("src/hooks/useClaraProductAccess.js");
  assert.match(source, /useState\(\(\) => !CLARA_FOUNDING_ACCESS_ENABLED\)/);
  assert.match(source, /if \(CLARA_FOUNDING_ACCESS_ENABLED\)[\s\S]*setChecking\(false\)/);
  assert.match(source, /CLARA_FOUNDING_ACCESS_ENABLED \|\|[\s\S]*isAdmin[\s\S]*isPaid/);
  assert.match(source, /checking: CLARA_FOUNDING_ACCESS_ENABLED \? false/);
});

test("the existing pricing/trial component is preserved for future reactivation", () => {
  const community = read("src/pages/Community.jsx");
  const gate = read("src/components/community/ClaraTrialAccessGate.jsx");
  assert.match(community, /ClaraTrialAccessGate/);
  assert.match(gate, /15-Day Trial/);
  assert.match(gate, /Take Control/);
});

test("server-authoritative cohort survives authenticated client normalization", () => {
  const client = read("src/lib/clara-backend-client.js");
  const authority = read("src/lib/backend-membership-authority.js");
  assert.match(client, /VALID_ACCESS_COHORTS/);
  assert.match(client, /access_cohort: normalizeAccessCohort\(user\.access_cohort\)/);
  assert.match(client, /access_cohort_assigned_at/);
  assert.match(authority, /access_cohort: accessCohort/);
  assert.match(authority, /access_cohort_assigned_at/);
});

test("normal CLARA feature authority remains full and independent from membership plan", () => {
  const planConfig = read("src/lib/plan-config.js");
  const userRole = read("src/hooks/useUserRole.js");
  assert.match(planConfig, /export const FREE_ACCESS_CONFIG/);
  assert.match(planConfig, /dashboard: "full"/);
  assert.match(planConfig, /wallets: "full"/);
  assert.match(planConfig, /ai: "full"/);
  assert.match(planConfig, /savings_goals: "full"/);
  assert.match(userRole, /getFreeCoreFeatureModes\(\)/);
});
