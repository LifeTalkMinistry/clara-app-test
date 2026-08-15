import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("one logical Buy Check turn can make at most one Gemini call and fallback stays local", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const core = await source("api/clara-gemini-core.js");

  assert.equal((expert.match(/requestGeminiJson\s*\(/g) || []).length, 1);
  assert.equal((core.match(/:generateContent/g) || []).length, 1);
  assert.match(expert, /function fallbackTurn/);
  assert.match(expert, /Universal conversation fallback used/);
  assert.match(core, /DEFAULT_MODEL = "gemini-3\.6-flash"/);
});

test("server owns the deadline and browser watchdog expires later", async () => {
  const lifecycle = await source("api/clara-gemini-lifecycle.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  const server = Number(lifecycle.match(/CLARA_AI_SERVER_DEADLINE_MS = (\d+)/)?.[1] || 0);
  const usage = Number(lifecycle.match(/CLARA_AI_USAGE_TIMEOUT_MS = (\d+)/)?.[1] || 0);
  const gemini = Number(lifecycle.match(/CLARA_AI_GEMINI_TIMEOUT_MS = (\d+)/)?.[1] || 0);
  const client = Number(proxy.match(/CLARA_GEMINI_CLIENT_TIMEOUT_MS = (\d+)/)?.[1] || 0);

  assert.equal(server, 30000);
  assert.equal(usage, 8000);
  assert.equal(gemini, 20000);
  assert.ok(client > server);
  assert.doesNotMatch(expert, /timeoutMs:\s*12000/);
});

test("cancellation propagates from Buy Check through Gemini and usage cleanup is explicit", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const json = await source("src/lib/clara-gemini-json-utils.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const api = await source("api/clara-gemini.js");
  const core = await source("api/clara-gemini-core.js");

  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /activeGeminiAbortRef/);
  assert.match(flow, /new AbortController\(\)/);
  assert.match(flow, /signal: requestController\.signal/);
  assert.match(expert, /signal,/);
  assert.match(json, /signal: timeout\.signal/);
  assert.match(proxy, /signal,/);
  assert.match(api, /res\.once\?\.\("close", onResponseClose\)/);
  assert.match(core, /parentSignal: requestContext\.signal/);
  assert.match(api, /refundReservedUsage/);
  assert.match(api, /if \(!succeeded \|\| lifecycleCancelled\)/);
});

test("successful reservation is trusted auth, failure refunds, and timing is observable", async () => {
  const api = await source("api/clara-gemini.js");
  const core = await source("api/clara-gemini-core.js");

  assert.match(api, /authenticationVerified: true/);
  assert.match(core, /requestContext\.authenticationVerified === true/);
  assert.match(core, /\/api\/users\/me/);
  assert.match(api, /CLARA_AI_USAGE_CLEANUP_TIMEOUT/);
  assert.match(api, /\[CLARA Gemini Timing\]/);
  assert.match(api, /usageReservationMs/);
  assert.match(api, /authenticationMs/);
  assert.match(api, /geminiMs/);
  assert.match(api, /parseMs/);
  assert.match(api, /totalMs/);
  assert.doesNotMatch(api, /GEMINI_API_KEY/);
});
