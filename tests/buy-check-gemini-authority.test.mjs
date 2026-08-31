import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("active Buy Check intake is deterministic before the final optional AI call", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /ITEM: "item"/);
  assert.match(flow, /CONFIRM_ITEM: "confirm_item"/);
  assert.match(flow, /REASON_PERMISSION: "reason_permission"/);
  assert.match(flow, /REASON: "reason"/);
  assert.match(flow, /PRICE: "price"/);
  assert.match(flow, /CONFIRM_PRICE: "confirm_price"/);
  assert.doesNotMatch(flow, /runClaraBuyCheckExpertTurn/);
});

test("bare item answers are captured directly without NLP or Gemini", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /mergeClaraPurchaseEvidence\(snapshot\.evidence, \{ item: answer \}\)/);
  assert.match(flow, /Got it — \$\{answer\}\. Is that the exact item\?/);
});

test("reason sharing explicitly controls whether Gemini may run", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /reasonPermission: true/);
  assert.match(flow, /reasonPermission: false/);
  assert.match(flow, /const shouldUseAi = Boolean\(snapshot\.reasonPermission === true && reason && !snapshot\.aiAdviceUsed\)/);
  assert.match(flow, /if \(!shouldUseAi\)/);
});

test("No reason path reaches the local financial result without a Gemini request", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  const noAiBranch = flow.indexOf("if (!shouldUseAi)");
  const aiRequest = flow.indexOf("requestClaraBuyCheckAlternative", noAiBranch);
  assert.ok(noAiBranch >= 0);
  assert.ok(aiRequest > noAiBranch);
  assert.match(flow.slice(noAiBranch, aiRequest), /formatClaraBuyCheckPaymentImpactLine|finalReply/);
});

test("Gemini is a single narrow alternative call and never owns Means calculation", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const alternative = await source("src/lib/clara-buy-check-alternative-ai.js");

  assert.match(flow, /buildClaraBuyCheckPaymentImpact/);
  assert.match(flow, /requestClaraBuyCheckAlternative/);
  assert.equal((flow.match(/requestClaraBuyCheckAlternative\(\{/g) || []).length, 1);
  assert.match(alternative, /PURCHASE PACKET/);
  assert.match(alternative, /item:/);
  assert.match(alternative, /reason:/);
  assert.match(alternative, /price:/);
  assert.match(alternative, /financialImpact:/);
  assert.match(alternative, /Do not calculate affordability, Means Score, Wall Bill, wallets, or planned spending/);
  assert.doesNotMatch(alternative, /transaction history/i);
  assert.doesNotMatch(alternative, /money schedule/i);
});

test("optional AI failure cannot block the final user decision", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /Optional alternative AI skipped safely/);
  assert.match(flow, /step: "confirm"/);
  assert.match(flow, /finalReply\(impact\)/);
});

test("final purchase choice remains application-owned", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.match(flow, /if \(!\["buy", "not_buy"\]\.includes\(choice\)\) return false/);
  assert.match(finalization, /if \(decision\.choice === "buy"\)/);
  assert.match(finalization, /source: "buy_check_not_buy"/);
  assert.doesNotMatch(finalization, /requestGeminiJson/);
});

test("hypothetical check still cannot mutate money before the user chooses to record", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.doesNotMatch(flow, /addBuyCheckExpense/);
  assert.doesNotMatch(flow, /payDebtObligationFromWallet/);
  assert.match(finalization, /await addBuyCheckExpense/);
  assert.match(finalization, /await payDebtObligationFromWallet/);
});

test("duplicate optional Gemini calls remain client-guarded and server rate-limited", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const core = await source("api/clara-gemini-core.js");

  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /if \(activeGeminiRequestRef\.current\) return false/);
  assert.match(core, /RATE_LIMIT_MAX_REQUESTS = 30/);
  assert.match(core, /DUPLICATE_WINDOW_MS = 2500/);
});

test("Gemini secret remains server-owned", async () => {
  const core = await source("api/clara-gemini-core.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const alternative = await source("src/lib/clara-buy-check-alternative-ai.js");

  assert.match(core, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(proxy, /VITE_GEMINI_API_KEY/);
  assert.match(alternative, /feature: "ask-before-you-spend"/);
});
