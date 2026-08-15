import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";

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
  assert.match(core, /process\.env\.GEMINI_API_KEY/);
});

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = new Map();
    this.body = "";
    this.writableEnded = false;
    this.finished = false;
    this.destroyed = false;
  }

  setHeader(name, value) {
    this.headers.set(String(name).toLowerCase(), value);
  }

  getHeader(name) {
    return this.headers.get(String(name).toLowerCase());
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
    return this;
  }

  write(chunk = "") {
    this.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    return true;
  }

  end(chunk = "") {
    if (chunk !== undefined && chunk !== null) this.write(chunk);
    this.writableEnded = true;
    this.finished = true;
    return this;
  }
}

function mockRequest(label) {
  const request = new EventEmitter();
  request.method = "POST";
  request.headers = {
    authorization: "Bearer test-token",
    "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
  };
  request.socket = { remoteAddress: "127.0.0.1" };
  request.body = {
    feature: "ask-before-you-spend",
    prompt: `Ask Before You Spend spending decision expert. WHAT TO DO THIS TURN ${label}-${Date.now()}-${Math.random()}`,
    model: "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 520,
    },
  };
  return request;
}

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

function validConversationText(reply = "Hello") {
  return JSON.stringify({
    action: "reply",
    reply,
    evidence: {
      item: "",
      price: 0,
      purpose: "",
      currentSituation: "",
      urgency: "",
      alternatives: "",
      timing: "",
      constraints: "",
      readinessSummary: "",
    },
    readinessConfidence: 0,
  });
}

async function runWithMockedFetch(fetchImpl, callback) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalBackend = process.env.CLARA_BACKEND_API_URL;
  globalThis.fetch = fetchImpl;
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.CLARA_BACKEND_API_URL = "https://backend.test";

  try {
    const module = await import("../api/clara-gemini.js");
    await callback(module.default);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalBackend === undefined) delete process.env.CLARA_BACKEND_API_URL;
    else process.env.CLARA_BACKEND_API_URL = originalBackend;
  }
}

test("runtime success consumes once, skips redundant auth, calls Gemini once, and does not refund", { concurrency: false }, async () => {
  const counts = { consume: 0, refund: 0, me: 0, gemini: 0 };
  let geminiUrl = "";

  await runWithMockedFetch(async (url) => {
    const target = String(url);
    if (target.endsWith("/api/ai/usage/consume")) {
      counts.consume += 1;
      return jsonResponse(200, {
        usage: { available: true, tier: "free", limit: 12, used: 1, remaining: 11 },
      });
    }
    if (target.endsWith("/api/ai/usage/refund")) {
      counts.refund += 1;
      return jsonResponse(200, {
        usage: { available: true, tier: "free", limit: 12, used: 0, remaining: 12 },
        refunded: true,
      });
    }
    if (target.endsWith("/api/users/me")) {
      counts.me += 1;
      return jsonResponse(200, { user: { id: 1 } });
    }
    if (target.includes(":generateContent")) {
      counts.gemini += 1;
      geminiUrl = target;
      return jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: validConversationText("Hello") }] } }],
      });
    }
    throw new Error(`Unexpected fetch: ${target}`);
  }, async (handler) => {
    const req = mockRequest("success");
    const res = new MockResponse();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).ok, true);
  });

  assert.deepEqual(counts, { consume: 1, refund: 0, me: 0, gemini: 1 });
  assert.match(geminiUrl, /gemini-3\.6-flash:generateContent/);
});

test("runtime Gemini failure refunds once and never retries Gemini", { concurrency: false }, async () => {
  const counts = { consume: 0, refund: 0, me: 0, gemini: 0 };

  await runWithMockedFetch(async (url) => {
    const target = String(url);
    if (target.endsWith("/api/ai/usage/consume")) {
      counts.consume += 1;
      return jsonResponse(200, {
        usage: { available: true, tier: "free", limit: 12, used: 1, remaining: 11 },
      });
    }
    if (target.endsWith("/api/ai/usage/refund")) {
      counts.refund += 1;
      return jsonResponse(200, {
        usage: { available: true, tier: "free", limit: 12, used: 0, remaining: 12 },
        refunded: true,
      });
    }
    if (target.endsWith("/api/users/me")) {
      counts.me += 1;
      return jsonResponse(200, { user: { id: 1 } });
    }
    if (target.includes(":generateContent")) {
      counts.gemini += 1;
      return jsonResponse(503, { error: { code: 503, status: "UNAVAILABLE" } });
    }
    throw new Error(`Unexpected fetch: ${target}`);
  }, async (handler) => {
    const req = mockRequest("failure");
    const res = new MockResponse();
    await handler(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(JSON.parse(res.body).ok, false);
  });

  assert.deepEqual(counts, { consume: 1, refund: 1, me: 0, gemini: 1 });
});

test("runtime client disconnect aborts in-flight Gemini and refunds the reservation", { concurrency: false }, async () => {
  const counts = { consume: 0, refund: 0, me: 0, gemini: 0 };
  let signalObserved = null;
  let markGeminiStarted;
  const geminiStarted = new Promise((resolve) => {
    markGeminiStarted = resolve;
  });

  await runWithMockedFetch(async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith("/api/ai/usage/consume")) {
      counts.consume += 1;
      return jsonResponse(200, {
        usage: { available: true, tier: "free", limit: 12, used: 1, remaining: 11 },
      });
    }
    if (target.endsWith("/api/ai/usage/refund")) {
      counts.refund += 1;
      return jsonResponse(200, {
        usage: { available: true, tier: "free", limit: 12, used: 0, remaining: 12 },
        refunded: true,
      });
    }
    if (target.endsWith("/api/users/me")) {
      counts.me += 1;
      return jsonResponse(200, { user: { id: 1 } });
    }
    if (target.includes(":generateContent")) {
      counts.gemini += 1;
      signalObserved = options.signal;
      markGeminiStarted();
      return new Promise((resolve, reject) => {
        const rejectAbort = () => reject(
          signalObserved?.reason || Object.assign(new Error("aborted"), { name: "AbortError" }),
        );
        if (signalObserved?.aborted) rejectAbort();
        else signalObserved?.addEventListener?.("abort", rejectAbort, { once: true });
      });
    }
    throw new Error(`Unexpected fetch: ${target}`);
  }, async (handler) => {
    const req = mockRequest("cancel");
    const res = new MockResponse();
    const pending = handler(req, res);

    await geminiStarted;
    res.destroyed = true;
    res.emit("close");
    await pending;

    assert.equal(signalObserved?.aborted, true);
    assert.equal(res.body, "");
  });

  assert.deepEqual(counts, { consume: 1, refund: 1, me: 0, gemini: 1 });
});
