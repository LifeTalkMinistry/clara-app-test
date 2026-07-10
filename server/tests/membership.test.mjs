import test from "node:test";
import assert from "node:assert/strict";
import { resolveEffectiveMembership } from "../src/membership.js";

const activeUser = { account_status: "active" };
const now = new Date("2026-07-10T00:00:00.000Z");

function membership(overrides = {}) {
  return {
    plan: "free",
    subscription_status: "active",
    current_period_end: null,
    ...overrides,
  };
}

test("Free account resolves to Free access", () => {
  const result = resolveEffectiveMembership(activeUser, membership(), now);
  assert.equal(result.effectivePlan, "free");
  assert.equal(result.hasPaidAccess, false);
  assert.equal(result.blocked, false);
});

test("active Committed membership resolves to paid access", () => {
  const result = resolveEffectiveMembership(
    activeUser,
    membership({ plan: "committed", current_period_end: "2026-08-10T00:00:00.000Z" }),
    now
  );
  assert.equal(result.effectivePlan, "committed");
  assert.equal(result.hasPaidAccess, true);
});

test("cancelled membership remains paid through current period", () => {
  const result = resolveEffectiveMembership(
    activeUser,
    membership({
      plan: "committed",
      subscription_status: "cancelled",
      current_period_end: "2026-07-20T00:00:00.000Z",
    }),
    now
  );
  assert.equal(result.effectivePlan, "committed");
  assert.equal(result.hasPaidAccess, true);
});

test("cancelled membership automatically downgrades after period end", () => {
  const result = resolveEffectiveMembership(
    activeUser,
    membership({
      plan: "committed",
      subscription_status: "cancelled",
      current_period_end: "2026-07-01T00:00:00.000Z",
    }),
    now
  );
  assert.equal(result.effectivePlan, "free");
  assert.equal(result.hasPaidAccess, false);
});

test("expired paid membership resolves to Free", () => {
  const result = resolveEffectiveMembership(
    activeUser,
    membership({ plan: "committed", subscription_status: "expired" }),
    now
  );
  assert.equal(result.effectivePlan, "free");
  assert.equal(result.effectiveSubscriptionStatus, "expired");
});

test("suspended account is blocked regardless of plan", () => {
  const result = resolveEffectiveMembership(
    { account_status: "suspended" },
    membership({ plan: "committed", current_period_end: "2026-08-10T00:00:00.000Z" }),
    now
  );
  assert.equal(result.blocked, true);
  assert.equal(result.hasPaidAccess, false);
  assert.equal(result.blockReason, "suspended");
});
