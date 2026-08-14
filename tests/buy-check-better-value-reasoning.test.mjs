import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("CLARA considers one meaningful better-value alternative before final choice", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /SPENDING JUDGMENT \+ BETTER VALUE/);
  assert.match(expert, /one realistic alternative could provide similar value/);
  assert.match(expert, /Cheaper is not automatically better/);
  assert.match(expert, /money-versus-time tradeoff/);
  assert.match(expert, /use "probe" to ask permission to explore it before "ready"/);
  assert.match(expert, /do not offer it again/);
});

test("repeated-spending awareness is compact and grounded in verified recent expenses", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /compactRecentSpendingSignal/);
  assert.match(expert, /recentExpenses/);
  assert.match(expert, /similarRecentCount/);
  assert.match(expert, /similarRecentTotal/);
  assert.match(expert, /recentSimilarSpending/);
  assert.match(expert, /Never invent a habit/);
  assert.match(expert, /slice\(0, 8\)/);
});

test("better-value reasoning stays inside the existing single Gemini turn", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.equal((expert.match(/requestGeminiJson\(/g) || []).length, 1);
  assert.match(expert, /feature: "ask-before-you-spend"/);
  assert.match(flow, /const isReadyForChoice = turn\.action === "ready"/);
  assert.doesNotMatch(flow, /alternativeEngine|habitEngine|timeValueEngine/);
});

test("prompt remains concise in principle while retaining financial authority", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /VERIFIED FINANCIAL CONTEXT is active context for EVERY turn/);
  assert.match(expert, /There is NO separate final BUY \/ WAIT \/ PAUSE verdict process/);
  assert.match(expert, /The USER makes the final decision/);
  assert.match(expert, /THINK DEEPLY\. SPEAK SIMPLY/);
});