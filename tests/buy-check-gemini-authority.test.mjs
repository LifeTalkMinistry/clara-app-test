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
  assert.doesNotMatch(proxy, /getClaraGeminiProxyModelCandidates/);
  assert.doesNotMatch(proxy, /gemini-2\.5-flash-lite/);
  assert.doesNotMatch(proxy, /gemini-2\.0-flash/);
  assert.doesNotMatch(proxy, /gemini-1\.5-flash/);
  assert.doesNotMatch(json, /for \(const model of models\)/);
  assert.match(expert, /history\.slice\(-12\)/);
});

test("Gemini JSON authorization is explicit feature ownership, not a human-readable label", async () => {
  const json = await source("src/lib/clara-gemini-json-utils.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");

  assert.match(json, /feature = ""/);
  assert.match(json, /hasGeminiJsonConfig\(normalizedFeature\)/);
  assert.match(json, /feature: normalizedFeature/);
  assert.match(json, /normalizeFeature\(feature\)/);
  assert.doesNotMatch(json, /isBuyCheckLabel/);
  assert.doesNotMatch(json, /\\bbuy check\\b/);

  assert.match(proxy, /resolveAllowedFeature\(\{ feature = "" \} = \{\}\)/);
  assert.match(proxy, /requested === ASK_BEFORE_YOU_SPEND_FEATURE/);
  assert.doesNotMatch(proxy, /isDedicatedBuyCheckPrompt/);
  assert.doesNotMatch(proxy, /ASK_BEFORE_YOU_SPEND_PROMPT_PREFIX/);
});

test("universal CLARA conversation explicitly belongs to Ask Before You Spend without renaming its label", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /feature: "ask-before-you-spend"/);
  assert.match(expert, /label: "CLARA universal spending conversation"/);
  assert.doesNotMatch(expert, /label: "CLARA Buy Check universal spending conversation"/);
});

test("final verdict and natural purchase conversation use the same explicit feature authority", async () => {
  const decision = await source("src/lib/clara-spending-decision-ai.js");
  const natural = await source("src/lib/clara-buy-check-conversation-ai-natural.js");

  assert.match(decision, /feature: "ask-before-you-spend"/);
  assert.match(decision, /label: "CLARA Buy Check spending decision"/);
  assert.match(natural, /async function askJson/);
  assert.match(natural, /feature: "ask-before-you-spend"/);
  assert.match(natural, /CLARA Buy Check natural reason/);
  assert.match(natural, /CLARA Buy Check natural confirmation/);
  assert.match(natural, /CLARA Buy Check live/);
});

test("unapproved and missing feature identities stay blocked while legacy memory AI stays disabled", async () => {
  const json = await source("src/lib/clara-gemini-json-utils.js");
  const memoryTab = await source("src/clara-assistant-memory-tab.js");
  const memorySummary = await source("src/lib/clara-conversation-memory-summarizer.js");

  assert.match(json, /return normalizeFeature\(feature\) === ASK_BEFORE_YOU_SPEND_FEATURE/);
  assert.match(json, /if \(!hasGeminiJsonConfig\(normalizedFeature\)\)/);
  assert.match(json, /CLARA_AI_FEATURE_DISABLED/);
  assert.match(memoryTab, /if \(!hasGeminiJsonConfig\(\)\) return fallbackMemoryEditResult/);
  assert.match(memorySummary, /if \(!hasGeminiJsonConfig\(\)\)/);
});

test("server remains the authoritative Ask Before You Spend gate", async () => {
  const api = await source("api/clara-gemini.js");

  assert.match(api, /const ALLOWED_FEATURE = "ask-before-you-spend"/);
  assert.match(api, /if \(feature !== ALLOWED_FEATURE\)/);
  assert.match(api, /CLARA_AI_FEATURE_DISABLED/);
  assert.match(api, /isAllowedBuyCheckPrompt\(prompt\)/);
  assert.match(api, /CLARA_AI_PROMPT_BLOCKED/);
});

test("conversation Gemini receives recent flow, latest message, user identity, and compact verified finance", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /You are CLARA, an economist-informed personal spending decision expert/);
  assert.match(expert, /You are speaking with \$\{userName\}/);
  assert.match(expert, /RECENT CONVERSATION/);
  assert.match(expert, /LATEST USER MESSAGE/);
  assert.match(expert, /VERIFIED FINANCIAL CONTEXT/);
  assert.match(expert, /spendableMoney/);
  assert.match(expert, /budgets: compactBudgetSnapshot/);
  assert.match(expert, /emergencyFund/);
  assert.match(expert, /savingsGoals/);
  assert.match(expert, /debtsAndObligations/);
  assert.match(expert, /nearestUpcomingSchedule/);
});

test("conversation Gemini infers the purchase from conversation instead of app-side purchase classification", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /The application does NOT need to classify the item, payment method, reason, installment plan, motive, or purchase intent for you/);
  assert.match(expert, /Return the purchase evidence that YOU inferred from the conversation/);
  assert.doesNotMatch(expert, /Purchase evidence already understood/);
  assert.doesNotMatch(expert, /inferEvidenceFromTurn/);
});

test("universal CLARA prompt enforces gentle scope, harm, and anti-lecture behavior", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /STRICT SCOPE BOUNDARY/);
  assert.match(expert, /HARM BOUNDARY/);
  assert.match(expert, /CLARA is not a general-purpose assistant/);
  assert.match(expert, /Do not assist with planning, encouraging, facilitating, or carrying out violence/);
  assert.match(expert, /Do not interrogate, shame, moralize, or automatically discourage spending/);
  assert.match(expert, /When a later BUY verdict is justified, do not add unnecessary financial education/);
  assert.match(expert, /A helpful follow-up can be: asking whether the user wants help finding a better move for now/);
});

test("material user details such as installment terms survive into Gemini-generated readiness summary", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /readinessSummary should be a concise but complete natural-language summary of all decision-relevant user-provided facts/);
  assert.match(expert, /down payment, installment amount, installment duration, interest\/fees/);
});

test("user can continue talking after a verdict and Gemini sees the prior verdict", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");

  assert.match(flow, /followUpAfterVerdict/);
  assert.match(flow, /Previous CLARA verdict/);
  assert.match(flow, /turn\.action === "reassess"/);
  assert.doesNotMatch(flow, /snapshot\.done \|\| \["diagnosis", "complete", "confirm"\]/);
  assert.match(overlay, /Ask CLARA about this result/);
  assert.match(overlay, /finalDecisionLocksConversation/);
  assert.match(overlay, /const showComposer = !\["confirm", "diagnosis"\]\.includes\(step\)/);
});

test("post-decision saving does not spend another Gemini call", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.doesNotMatch(finalization, /requestClaraGemini/);
  assert.doesNotMatch(finalization, /interpretFinalBuyExplanation/);
  assert.match(finalization, /explanationSource: "local"/);
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

test("legacy deterministic verdict engine and obsolete interpreter layer are removed", async () => {
  await assert.rejects(() => source("src/lib/clara-buy-check-diagnosis-v5.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/lib/clara-buy-check-decision-core.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckBudgetFlowDeterministic.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/components/fresh/main-dashboard/assistant/buyCheckReasonInterpreterV2.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckReasonSummary.js"), { code: "ENOENT" });
});
