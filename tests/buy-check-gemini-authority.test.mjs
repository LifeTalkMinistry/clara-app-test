import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("active Buy Check flow delegates the final verdict to Gemini decision service", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const wrapper = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckBudgetFlow.js");

  assert.match(flow, /runClaraSpendingDecision/);
  assert.doesNotMatch(flow, /clara-buy-check-diagnosis-v5/);
  assert.doesNotMatch(flow, /diagnoseBuyCheck\(/);
  assert.match(wrapper, /useClaraBuyCheckExpertFlow/);
});

test("Gemini decision service keeps verified financial facts separate from judgment", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(decision, /CLARA local application data owns what is financially true/);
  assert.match(decision, /You own the economic interpretation and final spending recommendation/);
  assert.match(decision, /spendableWalletMoney/);
  assert.match(decision, /remainingAfter/);
  assert.match(decision, /daysUntilNextIncome/);
  assert.match(decision, /totalDueBeforeNextIncome/);
  assert.match(decision, /emergencyFund/);
  assert.match(decision, /savingsGoals/);
  assert.match(decision, /safeToSpendAfterPurchase/);
});

test("simple needs and discretionary purchases both have decision-relevant evidence available", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(decision, /purchase necessity/);
  assert.match(decision, /affordability/);
  assert.match(decision, /liquidity/);
  assert.match(decision, /budget impact/);
  assert.match(decision, /emergency resilience/);
  assert.match(decision, /savings goals/);
  assert.match(decision, /opportunity cost/);
  assert.match(decision, /reasonable alternatives/);
});

test("affordable-but-bad-timing evidence reaches Gemini instead of forcing a local BUY", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(decision, /Do not let raw affordability alone force BUY/);
  assert.match(decision, /days_until_next_income/);
  assert.match(decision, /obligations_before_next_income/);
  assert.match(decision, /money_after_purchase/);
});

test("strong financial position can still produce BUY", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(decision, /Do not be permanently anti-spending/);
  assert.match(decision, /BUY = the purchase appears financially reasonable now/);
  assert.match(decision, /VALID_DECISIONS = new Set\(\["BUY", "WAIT", "PAUSE"\]\)/);
});

test("missing information is surfaced instead of invented", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(decision, /missingImportantInformation/);
  assert.match(decision, /identify the gap instead of guessing/);
  assert.match(decision, /Never invent, alter, estimate, round, or replace financial facts/);
});

test("unverified peso values are rejected by structured-output validation", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(decision, /hasUnsupportedPesoAmount/);
  assert.match(decision, /referenced an unverified money amount/);
  assert.match(decision, /factsUsed/);
  assert.match(decision, /allowedFactIds/);
});

test("Gemini failure cannot silently become a financial recommendation", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /NO VERDICT ISSUED/);
  assert.match(flow, /Your financial data was not interpreted, so no purchase recommendation was issued/);
  assert.match(flow, /reasonCode: "SCAN_FAILED"/);
});

test("duplicate taps and duplicate paid requests are guarded", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const api = await source("api/clara-gemini.js");

  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /if \(activeGeminiRequestRef\.current\) return false/);
  assert.match(api, /DUPLICATE_WINDOW_MS = 2500/);
  assert.match(api, /CLARA_AI_DUPLICATE_REQUEST/);
});

test("Gemini cost controls use one model, bounded history, rate limit, timeout, and output caps", async () => {
  const api = await source("api/clara-gemini.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const json = await source("src/lib/clara-gemini-json-utils.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(api, /RATE_LIMIT_MAX_REQUESTS = 10/);
  assert.match(api, /REQUEST_TIMEOUT_MS = 20000/);
  assert.match(api, /MAX_OUTPUT_TOKENS = 700/);
  assert.match(api, /MAX_PROMPT_CHARS = 28000/);
  assert.doesNotMatch(proxy, /gemini-2\.5-flash-lite/);
  assert.doesNotMatch(proxy, /gemini-2\.0-flash/);
  assert.doesNotMatch(proxy, /gemini-1\.5-flash/);
  assert.doesNotMatch(json, /for \(const model of models\)/);
  assert.match(expert, /history\.slice\(-12\)/);
});

test("Gemini secret stays server-side and no browser API-key variable is introduced", async () => {
  const api = await source("api/clara-gemini.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const json = await source("src/lib/clara-gemini-json-utils.js");
  const decision = await source("src/lib/clara-spending-decision-ai.js");

  assert.match(api, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(proxy, /VITE_GEMINI_API_KEY/);
  assert.doesNotMatch(json, /VITE_GEMINI_API_KEY/);
  assert.doesNotMatch(decision, /VITE_GEMINI_API_KEY/);
});

test("Gemini gateway reuses canonical CLARA backend authentication", async () => {
  const api = await source("api/clara-gemini.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");

  assert.match(proxy, /getStoredBackendToken/);
  assert.match(proxy, /Authorization: `Bearer \$\{token\}`/);
  assert.match(api, /\/api\/users\/me/);
  assert.match(api, /CLARA_AI_AUTH_REQUIRED/);
  assert.match(api, /CLARA_AI_AUTH_INVALID/);
  assert.match(api, /AUTH_TIMEOUT_MS = 8000/);
  assert.match(api, /Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With/);
});

test("legacy deterministic diagnosis remains present for rollback but outside the active expert verdict path", async () => {
  const legacyDiagnosis = await source("src/lib/clara-buy-check-diagnosis-v5.js");
  const legacyCore = await source("src/lib/clara-buy-check-decision-core.js");
  const activeFlow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(legacyDiagnosis, /calculateBuyCheckDiagnosis/);
  assert.match(legacyCore, /function calculateBuyCheckDiagnosis/);
  assert.doesNotMatch(activeFlow, /calculateBuyCheckDiagnosis/);
  assert.doesNotMatch(activeFlow, /validateBuyCheckDiagnosis/);
});
