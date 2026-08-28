import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUPPORT_TIERS,
  SUPPORT_TIER_KEYS,
  SUPPORT_ENGAGEMENT_METRICS,
  getChampionAvailability,
  getSupportDisplayState,
  isSupportRecordActive,
} from "../src/lib/clara-support.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("CLARA support tiers preserve free core access while carrying supporter benefits", () => {
  assert.deepEqual(SUPPORT_TIER_KEYS, ["supporter", "builder", "champion"]);
  assert.equal(SUPPORT_TIERS.supporter.price, 99);
  assert.equal(SUPPORT_TIERS.builder.price, 149);
  assert.equal(SUPPORT_TIERS.champion.price, 299);
  assert.equal(SUPPORT_TIERS.supporter.name, "Take Control");
  assert.equal(SUPPORT_TIERS.builder.name, "Stay Consistent");
  assert.equal(SUPPORT_TIERS.champion.name, "Don't Do It Alone");
  assert.equal(SUPPORT_TIERS.builder.recommended, true);
  assert.equal(SUPPORT_TIERS.supporter.membershipKey, "core");
  assert.equal(SUPPORT_TIERS.builder.membershipKey, "personal");
  assert.equal(SUPPORT_TIERS.champion.membershipKey, "partner");
});

test("support gratitude state lasts only through the active support cycle or a canonical admin plan", () => {
  const now = Date.parse("2026-08-09T00:00:00+08:00");
  const active = {
    tier: "builder",
    status: "active",
    support_expires_at: "2026-09-09T00:00:00+08:00",
  };
  const expired = { ...active, support_expires_at: "2026-08-08T00:00:00+08:00" };
  const inactive = { ...active, status: "inactive" };
  const adminAssigned = {
    tier: "champion",
    status: "active",
    active: true,
    source: "account_plan",
  };

  assert.equal(isSupportRecordActive(active, now), true);
  assert.equal(getSupportDisplayState(active, now).label, "Active");
  assert.equal(getSupportDisplayState(active, now).tier, "builder");
  assert.equal(isSupportRecordActive(expired, now), false);
  assert.equal(getSupportDisplayState(expired, now).label, "Membership");
  assert.equal(getSupportDisplayState(expired, now).tier, null);
  assert.equal(isSupportRecordActive(inactive, now), false);
  assert.equal(isSupportRecordActive(adminAssigned, now), true);
  assert.equal(getSupportDisplayState(adminAssigned, now).tier, "champion");
});

test("support hook takes the live backend account plan as its freshest authority", () => {
  const hook = read("src/hooks/useClaraSupport.js");
  assert.match(hook, /result\?\.accountPlan/);
  assert.match(hook, /setLiveAccount/);
  assert.match(hook, /const accountPlan = liveAccount\?\.plan \|\| snapshotPlan/);
  assert.match(hook, /source: "account_plan"/);
  assert.doesNotMatch(hook, /const accountPlan = String\(\s*user\?\.plan/);
});

test("Champion availability is displayed only when a real cap is configured", () => {
  assert.equal(getChampionAvailability({ champion_slot_cap: null, champion_slots_used: 0 }), null);
  assert.deepEqual(
    getChampionAvailability({ champion_slot_cap: 20, champion_slots_used: 2 }),
    { cap: 20, used: 2, available: 18 }
  );
});

test("support analytics vocabulary is prepared without making outcome claims", () => {
  assert.ok(SUPPORT_ENGAGEMENT_METRICS.includes("daily_streak_consistency"));
  assert.ok(SUPPORT_ENGAGEMENT_METRICS.includes("ask_before_you_spend_usage"));
  assert.ok(SUPPORT_ENGAGEMENT_METRICS.includes("support_retention"));
});

test("free plan source of truth gives full normal app access and keeps coaching separate", () => {
  const planConfig = read("src/lib/plan-config.js");
  for (const feature of [
    "analytics",
    "ai",
    "customization",
    "savings_goals",
    "tasks",
    "modules",
    "community",
    "messages",
    "referrals",
  ]) {
    assert.match(planConfig, new RegExp(`${feature}: \\"full\\"`));
  }
  assert.match(planConfig, /coaching: "teaser"/);
  assert.match(planConfig, /complete CLARA financial accountability app is free for everyone/i);
});

test("Settings identity surfaces resolve only from active supporter status", () => {
  const settings = read("src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx");
  const badge = read("src/components/support/SupportTierBadge.jsx");

  assert.match(settings, /useClaraSupport\(user\)/);
  assert.match(settings, /activeSupporterTier = supporterStatus\?\.active \? supporterStatus\.tier : null/);
  assert.match(settings, /badgeNode: activeSupporterTier \?/);
  assert.match(settings, /<SupportTierBadge tier=\{activeSupporterTier\} compact tone="settings" \/>/);
  assert.doesNotMatch(settings, /badge: currentPlan/);
  assert.match(badge, /getSupportTier/);
  assert.match(badge, /const label = canonicalTier\.name/);
});

test("legacy enrollment can no longer force or sell a core feature unlock", () => {
  const accessControl = read("src/lib/access-control.js");
  const enrollPage = read("src/pages/Enroll.jsx");
  const financialPlanAccess = read("src/components/financial-carousel/logic/financialPlanAccess.js");

  assert.match(accessControl, /export function shouldForceEnrollment\(\) \{\s*return false;/s);
  assert.match(enrollPage, /Navigate to="\/dashboard" replace/);
  assert.match(financialPlanAccess, /meetsFinancialPlanRequirement = \(\) => true/);
});

test("support verifier never mutates CLARA profile entitlements", () => {
  const hook = read("src/hooks/useClaraSupport.js");
  const support = read("src/lib/clara-support.js");

  assert.match(hook, /backendRequest\("\/api\/support\/status"/);
  assert.match(hook, /source: "account_plan"/);
  assert.doesNotMatch(hook, /\.from\("profiles"\)/);
  assert.doesNotMatch(hook, /process_google_play_purchase/);
  assert.doesNotMatch(support, /\.from\("profiles"\)/);
});

test("Support CLARA owns a persistent app-level overlay world and animation clock", () => {
  const bubble = read("src/components/support/SupportClaraBubble.jsx");

  assert.match(bubble, /createPortal/);
  assert.match(bubble, /clara-support-world/);
  assert.match(bubble, /document\.body\.appendChild\(world\)/);
  assert.match(bubble, /isolation: "isolate"/);
  assert.match(bubble, /pointerEvents: "none"/);
  assert.match(bubble, /localStorage\.getItem\(SUPPORT_BUBBLE_EPOCH_KEY\)/);
  assert.match(bubble, /ICON_FIRST_MS: 3000/);
  assert.match(bubble, /EXPANDED_MS: 3000/);
  assert.match(bubble, /ICON_SECOND_MS: 3000/);
  assert.match(bubble, /HIDDEN_MS: 10000/);
  assert.match(bubble, /if \(!user\?\.id \|\| !portalHost \|\| membershipState\.isActive\) return null;/);
  assert.doesNotMatch(bubble, /SESSION_EXPANSION_KEY/);
});
