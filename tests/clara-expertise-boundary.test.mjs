import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildClaraExpertiseBoundaryResponse,
  detectClaraExpertiseBoundary,
} from "../src/lib/clara-expertise-boundary.js";

function meansSnapshot(score) {
  const cycle100Anchor = 10000;
  const remainingPlannedSpending = 10000;
  const availableWalletMoney = (score / 100) * cycle100Anchor;
  const wallBill = availableWalletMoney - remainingPlannedSpending;
  return {
    score,
    cycle100Anchor,
    requiredRunway: cycle100Anchor,
    availableNow: availableWalletMoney,
    availableWalletMoney,
    remainingPlannedSpending,
    upcoming: remainingPlannedSpending,
    wallBill,
    scoreRoom: wallBill,
    projectedRoom: wallBill,
    cycleStartDate: "2026-08-15",
    cycleEndDate: "2026-08-30",
  };
}

test("detects crypto and business advice as expertise-boundary requests", () => {
  assert.deepEqual(
    detectClaraExpertiseBoundary("Can I invest on crypto?"),
    { domain: "investment", subject: "investment", amount: 0 },
  );

  assert.deepEqual(
    detectClaraExpertiseBoundary("Can you give me advice how to build a business?"),
    { domain: "business", subject: "business idea", amount: 0 },
  );
});

test("stock-selection advice is caught instead of being treated as a purchase command", () => {
  const result = detectClaraExpertiseBoundary("Which stock should I buy?");
  assert.equal(result?.domain, "investment");
});

test("normal spending and explicit transaction logging are not intercepted", () => {
  assert.equal(detectClaraExpertiseBoundary("Can I buy a ₱3,000 jacket?"), null);
  assert.equal(detectClaraExpertiseBoundary("Log ₱5,000 crypto transaction"), null);
});

test("without an amount CLARA states its scope and redirects to living-means readiness", () => {
  const result = buildClaraExpertiseBoundaryResponse({
    text: "Can I invest on crypto?",
  });

  assert.equal(result?.kind, "expertise_boundary");
  assert.match(result.message, /can’t judge whether a specific investment/i);
  assert.match(result.message, /protecting your living means/i);
  assert.match(result.message, /separate investment fund/i);
  assert.match(result.message, /How much are you thinking of committing\?/i);
});

test("business advice remains helpful without pretending to be a business consultant", () => {
  const result = buildClaraExpertiseBoundaryResponse({
    text: "Can you give me advice how to build a business?",
  });

  assert.match(result.message, /can’t judge whether the business itself will succeed/i);
  assert.match(result.message, /separate business fund/i);
  assert.match(result.message, /everyday runway/i);
});

test("capital that crosses the Means protection line is called risky to living means", () => {
  const result = buildClaraExpertiseBoundaryResponse({
    text: "Should I invest ₱3,000 in crypto?",
    meansSnapshot: meansSnapshot(120),
  });

  assert.equal(result.metricImpact.currentScore, 120);
  assert.equal(result.metricImpact.projectedScoreAfterPurchase, 90);
  assert.match(result.message, /Means Score from 120 to 90/i);
  assert.match(result.message, /cross the 100 protection line/i);
  assert.match(result.message, /too risky right now/i);
  assert.match(result.message, /separate investment fund/i);
});

test("remaining above 100 is described as runway protection, never investment approval", () => {
  const result = buildClaraExpertiseBoundaryResponse({
    text: "Should I put ₱2,000 into a startup business?",
    meansSnapshot: meansSnapshot(165),
  });

  assert.equal(result.metricImpact.currentScore, 165);
  assert.equal(result.metricImpact.projectedScoreAfterPurchase, 145);
  assert.match(result.message, /remain above the 100 protection line/i);
  assert.match(result.message, /does not mean the business idea itself is safe, good, or likely to succeed/i);
  assert.match(result.message, /separate from protected living money/i);
});

test("exactly 100 remains a protection line rather than permission", () => {
  const result = buildClaraExpertiseBoundaryResponse({
    text: "Should I invest ₱2,000 in stocks?",
    meansSnapshot: meansSnapshot(120),
  });

  assert.equal(result.metricImpact.projectedScoreAfterPurchase, 100);
  assert.match(result.message, /exactly at the 100 protection line/i);
  assert.match(result.message, /protection, not permission/i);
});

test("when canonical Means data is unavailable CLARA does not call the commitment safe", () => {
  const result = buildClaraExpertiseBoundaryResponse({
    text: "Should I invest ₱10,000 in bitcoin?",
    meansSnapshot: null,
  });

  assert.match(result.message, /can’t verify the Means impact/i);
  assert.doesNotMatch(result.message, /safe to invest|good investment|recommend buying/i);
});

test("the main assistant applies the boundary before normal command understanding", async () => {
  const source = await readFile(new URL("../src/lib/ai-command/ai-engine.js", import.meta.url), "utf8");
  const boundaryIndex = source.indexOf("const expertiseBoundary = buildClaraExpertiseBoundaryResponse");
  const understandIndex = source.indexOf("const command = await understandInput");

  assert.ok(boundaryIndex >= 0, "expertise boundary guard must be wired into the assistant engine");
  assert.ok(understandIndex >= 0, "assistant command understanding must still exist");
  assert.ok(boundaryIndex < understandIndex, "expertise boundary must run before command parsing/understanding");
  assert.match(source, /AI_INTENTS\.GENERAL_GUIDANCE/);
});
