import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Ask Before You Spend uses three progressive Gemini prompt phases", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /PHASE 1 — ESTABLISH/);
  assert.match(expert, /PHASE 2 — UNDERSTAND/);
  assert.match(expert, /PHASE 3 — METRIC DECISION/);
  assert.match(expert, /routeClaraBuyCheckPhase/);
  assert.match(expert, /CLARA_BUY_CHECK_PHASE\.ESTABLISH/);
  assert.match(expert, /CLARA_BUY_CHECK_PHASE\.DISCOVER/);
  assert.match(expert, /CLARA_BUY_CHECK_PHASE\.METRIC/);
});

test("connection and discovery prompts do not receive raw financial context", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.doesNotMatch(expert, /buildContextPackage/);
  assert.doesNotMatch(expert, /buildBudgetMetadata/);
  assert.doesNotMatch(expert, /buildClaraLifeContextStatement/);
  assert.doesNotMatch(expert, /VERIFIED FINANCIAL CONTEXT is active context for EVERY turn/);
  assert.match(expert, /Do not mention Means Score, affordability, wallets, schedules, debts, savings, or a verdict/);
  assert.match(expert, /Do not discuss the user's financial position yet/);
});

test("the app calculates Means locally and only the compact result enters metric Gemini", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /buildClaraPurchaseMetricImpact/);
  assert.match(expert, /metricPacket/);
  assert.match(expert, /CLARA CALCULATION — AUTHORITATIVE/);
  assert.match(expert, /The application has already calculated the financial effect\. Do NOT recalculate it/);
  assert.match(expert, /AUTHORITATIVE CONSEQUENCE SENTENCE/);
  assert.doesNotMatch(expert, /wallets\.spendableMoney/);
  assert.doesNotMatch(expert, /moneySchedule\.remainingAssumedRoutineSpending/);
});

test("Gemini supplies language evidence but the application owns phase transitions", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const router = await source("src/lib/clara-buy-check-intelligence-router.js");

  assert.match(expert, /normalizeModelEvidence/);
  assert.match(expert, /isClaraPurchaseContextMature\(mergedEvidence\)/);
  assert.match(expert, /return runMetricTurn/);
  assert.match(router, /routeClaraBuyCheckPhase/);
  assert.match(router, /if \(!connected\) return CLARA_BUY_CHECK_PHASE\.ESTABLISH/);
  assert.match(router, /if \(isClaraPurchaseContextMature\(evidence\)\) return CLARA_BUY_CHECK_PHASE\.METRIC/);
});

test("a purchase amount must be user-confirmed before Means calculation", async () => {
  const router = await source("src/lib/clara-buy-check-intelligence-router.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(router, /priceStatus === "confirmed"/);
  assert.match(router, /needs_confirmation/);
  assert.match(router, /user_direct/);
  assert.match(router, /user_confirmation/);
  assert.match(expert, /Gemini never confirms money by itself/);
  assert.match(expert, /if \(!hasConfirmedClaraPurchasePrice\(source\)\) return null/);
});

test("ready means user choice and does not introduce another verdict service", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(expert, /action: "ready"/);
  assert.match(expert, /Still buying it\?/);
  assert.match(flow, /const isReadyForChoice = Boolean/);
  assert.match(flow, /step: isReadyForChoice \? "confirm" : "conversation"/);
  assert.doesNotMatch(flow, /runClaraSpendingDecision/);
});

test("user still has Yes, No, and Ask more choices", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(overlay, />\s*Yes\s*</);
  assert.match(overlay, />\s*No\s*</);
  assert.match(overlay, />\s*Ask more\s*</);
  assert.match(flow, /I want to ask more before deciding/);
});

test("post-choice saving remains local and does not spend another Gemini call", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.doesNotMatch(finalization, /requestClaraGemini/);
  assert.doesNotMatch(finalization, /requestGeminiJson/);
  assert.doesNotMatch(finalization, /runClaraSpendingDecision/);
  assert.match(finalization, /buildClaraPurchaseMetricImpact/);
});

test("CLARA suggested reason still becomes Transaction Hub reason", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.match(finalization, /const conversationReason = clean\(decision\.explanation\) \|\| preparedReason\(base\.state\)/);
  assert.match(finalization, /reason: conversationReason/);
  assert.match(finalization, /addBuyCheckExpense/);
});

test("duplicate Gemini requests remain guarded", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const core = await source("api/clara-gemini-core.js");

  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /if \(activeGeminiRequestRef\.current\) return false/);
  assert.match(core, /RATE_LIMIT_MAX_REQUESTS = 30/);
  assert.match(core, /DUPLICATE_WINDOW_MS = 2500/);
});

test("Gemini secret and cost controls remain server-owned", async () => {
  const core = await source("api/clara-gemini-core.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(core, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(proxy, /VITE_GEMINI_API_KEY/);
  assert.match(expert, /feature: "ask-before-you-spend"/);
  assert.match(expert, /history\.slice\(-limit\)/);
});

test("old separate spending verdict service remains removed", async () => {
  await assert.rejects(() => source("src/lib/clara-spending-decision-ai.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/lib/clara-buy-check-diagnosis-v5.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/lib/clara-buy-check-decision-core.js"), { code: "ENOENT" });
});
