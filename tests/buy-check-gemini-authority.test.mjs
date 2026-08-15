import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Ask Before You Spend is one continuous Gemini-guided conversation", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(expert, /There is NO separate final BUY \/ WAIT \/ PAUSE verdict process/);
  assert.match(expert, /VERIFIED FINANCIAL CONTEXT is active context for EVERY turn/);
  assert.doesNotMatch(flow, /runClaraSpendingDecision/);
  assert.doesNotMatch(flow, /diagnosisFailureState/);
  assert.doesNotMatch(flow, /NO VERDICT ISSUED/);
});

test("Gemini receives live user money context throughout the purchase conversation", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /buildContextPackage\(purchase, assistantContext\)/);
  assert.match(expert, /purchaseAlreadyUnderstood/);
  assert.match(expert, /moneyAfterPurchase/);
  assert.match(expert, /relevantPurchaseBudget/);
  assert.match(expert, /safeToSpendAfterPurchase/);
  assert.match(expert, /conflictAfterPurchase/);
  assert.match(expert, /wouldBeAffected/);
  assert.match(expert, /RECENT CONVERSATION/);
  assert.match(expert, /PURCHASE EVIDENCE ALREADY UNDERSTOOD/);
  assert.match(expert, /LATEST USER MESSAGE/);
  assert.match(expert, /VERIFIED FINANCIAL CONTEXT/);
});

test("Gemini can guide buy or not-buy naturally without a ceremonial verdict", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /Do not be permanently anti-spending/);
  assert.match(expert, /If buying appears reasonable, say so naturally/);
  assert.match(expert, /If waiting or not buying appears wiser/);
  assert.match(expert, /The USER makes the final decision/);
  assert.doesNotMatch(expert, /run the final money verdict/);
});

test("ready means user choice, not another AI call", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(expert, /READY FOR THE USER'S YES \/ NO \/ ASK MORE CHOICE/);
  assert.match(expert, /Will you still buy it\?/);
  assert.match(flow, /const isReadyForChoice = turn\.action === "ready"/);
  assert.match(flow, /step: isReadyForChoice \? "confirm" : "conversation"/);
});

test("user has Yes, No, and Ask more options when CLARA is satisfied", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(overlay, />\s*Yes\s*</);
  assert.match(overlay, />\s*No\s*</);
  assert.match(overlay, />\s*Ask more\s*</);
  assert.match(overlay, /onAskMore/);
  assert.match(flow, /I want to ask more before deciding/);
});

test("CLARA suggested reason is created during conversation and becomes Transaction Hub reason", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");

  assert.match(expert, /Keep evidence\.purpose as a concise, transaction-ready suggested reason/);
  assert.match(expert, /Refine this suggested reason as the conversation becomes clearer/);
  assert.match(finalization, /const conversationReason = clean\(decision\.explanation\) \|\| preparedReason\(base\.state\)/);
  assert.match(finalization, /reason: conversationReason/);
  assert.match(finalization, /addBuyCheckExpense/);
  assert.match(overlay, /saving to Transaction Hub/);
});

test("user may edit CLARA's suggested transaction reason before saving", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.match(overlay, /Use it as-is or edit it before saving to Transaction Hub/);
  assert.match(overlay, /onExplanationChange/);
  assert.match(finalization, /setDecisionExplanation/);
  assert.match(finalization, /explanation_source: decision\.userEdited \? "user_edited" : "clara_conversation"/);
});

test("No does not create a transaction while still preserving the decision reason", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.match(finalization, /if \(decision\.choice === "buy"\)/);
  assert.match(finalization, /source: "buy_check_not_buy"/);
  assert.match(finalization, /suggested_reason: preparedReason\(base\.state\)/);
  assert.match(finalization, /reflection: purchase\.reason/);
});

test("post-choice saving does not spend another Gemini call", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.doesNotMatch(finalization, /requestClaraGemini/);
  assert.doesNotMatch(finalization, /requestGeminiJson/);
  assert.doesNotMatch(finalization, /runClaraSpendingDecision/);
});

test("duplicate requests remain guarded and conversation rate limit supports normal dialogue", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const core = await source("api/clara-gemini-core.js");

  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /if \(activeGeminiRequestRef\.current\) return false/);
  assert.match(core, /RATE_LIMIT_MAX_REQUESTS = 30/);
  assert.match(core, /DUPLICATE_WINDOW_MS = 2500/);
  assert.match(core, /CLARA_AI_DUPLICATE_REQUEST/);
});

test("Gemini cost and secret controls remain server-owned", async () => {
  const core = await source("api/clara-gemini-core.js");
  const lifecycle = await source("api/clara-gemini-lifecycle.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const json = await source("src/lib/clara-gemini-json-utils.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(core, /process\.env\.GEMINI_API_KEY/);
  assert.match(lifecycle, /CLARA_AI_GEMINI_TIMEOUT_MS = 20000/);
  assert.match(core, /MAX_PROMPT_CHARS = 28000/);
  assert.doesNotMatch(proxy, /VITE_GEMINI_API_KEY/);
  assert.doesNotMatch(json, /VITE_GEMINI_API_KEY/);
  assert.match(expert, /history\.slice\(-12\)/);
});

test("Ask Before You Spend feature authority remains explicit", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const core = await source("api/clara-gemini-core.js");
  const json = await source("src/lib/clara-gemini-json-utils.js");

  assert.match(expert, /feature: "ask-before-you-spend"/);
  assert.match(expert, /label: "CLARA universal spending conversation"/);
  assert.match(core, /const ALLOWED_FEATURE = "ask-before-you-spend"/);
  assert.match(core, /CLARA_AI_FEATURE_DISABLED/);
  assert.match(json, /ASK_BEFORE_YOU_SPEND_FEATURE/);
});

test("old separate spending verdict service and verdict card are removed", async () => {
  await assert.rejects(() => source("src/lib/clara-spending-decision-ai.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/components/fresh/main-dashboard/assistant/buy-check/BuyCheckDecisionCard.jsx"), { code: "ENOENT" });
});

test("legacy deterministic verdict engine remains removed", async () => {
  await assert.rejects(() => source("src/lib/clara-buy-check-diagnosis-v5.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/lib/clara-buy-check-decision-core.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckBudgetFlowDeterministic.js"), { code: "ENOENT" });
});

test("Life Profile stays a compact user-declared context layer inside the same Gemini turn", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx");

  assert.match(expert, /buildClaraLifeContextStatement/);
  assert.match(expert, /USER-PROVIDED LIFE CONTEXT/);
  assert.match(expert, /Use it only when it materially improves the spending decision/);
  assert.match(overlay, /lifeProfileSupportTier/);
  assert.equal((expert.match(/requestGeminiJson\s*\(/g) || []).length, 1);
});

test("Life Profile fields are tier-gated and only explicit user fields enter the compact statement", async () => {
  const life = await import(new URL("../src/lib/clara-life-context.js", import.meta.url));
  let profile = {};
  profile = life.updateClaraLifeProfileField(profile, "breadwinnerStatus", "Primary breadwinner");
  profile = life.updateClaraLifeProfileField(profile, "businessPlan", "Planning to start");
  profile = life.updateClaraLifeProfileField(profile, "businessType", "Online food business");

  const coreStatement = life.buildClaraLifeContextStatement(profile, {
    supportTier: null,
    message: "Should I buy equipment for a small business?",
  });
  const builderStatement = life.buildClaraLifeContextStatement(profile, {
    supportTier: "builder",
    message: "Should I buy equipment for a small business?",
  });

  assert.match(coreStatement, /breadwinner role: primary breadwinner/);
  assert.doesNotMatch(coreStatement, /business status:/);
  assert.match(builderStatement, /business status: Planning to start/);
  assert.match(builderStatement, /business idea: Online food business/);
});

test("Buy Check firmness is automatic and the manual tone selector is retired", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");

  assert.match(expert, /ADAPTIVE FIRMNESS/);
  assert.match(expert, /not from a manual user-selected tone/);
  assert.match(expert, /Low financial risk: calm and conversational/);
  assert.match(expert, /High risk: firm recommendation/);
  assert.doesNotMatch(expert, /clara_buy_check_attitude_v1/);
  assert.doesNotMatch(expert, /selectedCommunicationAttitude/);
  assert.doesNotMatch(expert, /COMMUNICATION ATTITUDE/);
  assert.doesNotMatch(overlay, /BuyCheckAttitudeSelector/);
  assert.doesNotMatch(overlay, /SlidersHorizontal/);
  assert.doesNotMatch(overlay, /clara_buy_check_attitude_v1/);
  assert.doesNotMatch(overlay, /data-clara-attitude-trigger/);
  assert.match(overlay, /disabled=\{composerLocked \|\| !hasDraft\}/);
});

test("retired Buy Check attitude patch machinery stays removed", async () => {
  await assert.rejects(() => source("scripts/patch_clara_attitude_popover.py"), { code: "ENOENT" });
  await assert.rejects(() => source(".github/workflows/patch-clara-attitude-popover.yml"), { code: "ENOENT" });
});
