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

test("CLARA support tiers are voluntary recognition tiers, not feature plans", () => {
  assert.deepEqual(SUPPORT_TIER_KEYS, ["supporter", "builder", "champion"]);
  assert.equal(SUPPORT_TIERS.supporter.price, 99);
  assert.equal(SUPPORT_TIERS.builder.price, 249);
  assert.equal(SUPPORT_TIERS.champion.price, 499);
  assert.equal(SUPPORT_TIERS.builder.recommended, true);
  assert.equal("popular" in SUPPORT_TIERS.builder, false);
  assert.match(SUPPORT_TIERS.champion.positioning, /personally work with Max/i);
});

test("support gratitude state lasts only through the active support cycle", () => {
  const now = Date.parse("2026-08-09T00:00:00+08:00");
  const active = {
    tier: "builder",
    status: "active",
    support_expires_at: "2026-09-09T00:00:00+08:00",
  };
  const expired = {
    ...active,
    support_expires_at: "2026-08-08T00:00:00+08:00",
  };

  assert.equal(isSupportRecordActive(active, now), true);
  assert.equal(getSupportDisplayState(active, now).label, "Thank you");
  assert.equal(isSupportRecordActive(expired, now), false);
  assert.equal(getSupportDisplayState(expired, now).label, "Support");
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

test("legacy enrollment can no longer force or sell a core feature unlock", () => {
  const accessControl = read("src/lib/access-control.js");
  const enrollPage = read("src/pages/Enroll.jsx");
  const financialPlanAccess = read("src/components/financial-carousel/logic/financialPlanAccess.js");

  assert.match(accessControl, /export function shouldForceEnrollment\(\) \{\s*return false;/s);
  assert.match(enrollPage, /Navigate to="\/dashboard" replace/);
  assert.match(financialPlanAccess, /meetsFinancialPlanRequirement = \(\) => true/);
});

test("support verifier never mutates CLARA profile entitlements", () => {
  const verifier = read("supabase/functions/verify-clara-support-purchase/index.ts");
  assert.match(verifier, /support_subscriptions/);
  assert.doesNotMatch(verifier, /process_google_play_purchase/);
  assert.doesNotMatch(verifier, /\.from\("profiles"\)/);
  assert.match(verifier, /app_access_changed: false/);
});
