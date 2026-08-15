import claraGeminiCoreHandler from "./clara-gemini-core.js";

// The core handler still owns these existing safety contracts:
// const ALLOWED_FEATURE = "ask-before-you-spend";
// RATE_LIMIT_MAX_REQUESTS = 30
// DUPLICATE_WINDOW_MS = 2500
// CLARA_AI_DUPLICATE_REQUEST
// REQUEST_TIMEOUT_MS = 20000
// MAX_PROMPT_CHARS = 28000
// process.env.GEMINI_API_KEY

const DEFAULT_CLARA_BACKEND_API_URL = "https://api.clarapmc.com";
const USAGE_TIMEOUT_MS = 8000;
const DAILY_LIMIT_CODE = "CLARA_AI_DAILY_LIMIT_REACHED";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "no-store");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getClaraBackendApiUrl() {
  return cleanText(process.env.CLARA_BACKEND_API_URL || DEFAULT_CLARA_BACKEND_API_URL).replace(/\/+$/, "");
}

function getBearerToken(req) {
  const authorization = cleanText(req.headers?.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return cleanText(match?.[1] || "");
}

function unavailableUsage() {
  return { available: false };
}

function normalizeUsage(payload = {}) {
  const source = payload?.usage || payload?.details?.usage || payload;
  if (!source || typeof source !== "object" || source.available !== true) return unavailableUsage();
  const limit = Math.max(0, Number(source.limit || 0));
  const used = Math.max(0, Number(source.used || 0));
  const remaining = Math.max(0, Number(source.remaining ?? limit - used));
  return {
    available: true,
    tier: cleanText(source.tier || "free").toLowerCase() || "free",
    limit,
    used,
    remaining,
    usageDate: cleanText(source.usageDate || source.usage_date || ""),
    timeZone: cleanText(source.timeZone || source.time_zone || "Asia/Manila") || "Asia/Manila",
  };
}

async function requestUsageBackend(req, path, { method = "GET", body } = {}) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      payload: {
        code: "CLARA_AI_AUTH_REQUIRED",
        message: "Your CLARA session is required before Ask Before You Spend can use AI.",
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), USAGE_TIMEOUT_MS);
  try {
    const response = await fetch(`${getClaraBackendApiUrl()}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      payload: {
        code: error?.name === "AbortError" ? "CLARA_AI_USAGE_TIMEOUT" : "CLARA_AI_USAGE_UNAVAILABLE",
        message: "CLARA couldn't verify today's AI allowance right now.",
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function createRequestId() {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `clara-ai-${Date.now()}-${random}`;
}

function createBufferedResponse() {
  const headers = new Map();
  let body = "";
  const response = {
    statusCode: 200,
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), { name: String(name), value });
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase())?.value;
    },
    removeHeader(name) {
      headers.delete(String(name).toLowerCase());
    },
    writeHead(statusCode, values = {}) {
      this.statusCode = statusCode;
      Object.entries(values || {}).forEach(([name, value]) => this.setHeader(name, value));
      return this;
    },
    write(chunk = "") {
      body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      return true;
    },
    end(chunk = "") {
      if (chunk !== undefined && chunk !== null) this.write(chunk);
      return this;
    },
  };
  return {
    response,
    snapshot() {
      return {
        statusCode: response.statusCode || 200,
        headers: [...headers.values()],
        body,
      };
    },
  };
}

function copyBufferedHeaders(snapshot, res) {
  snapshot.headers.forEach(({ name, value }) => {
    if (String(name).toLowerCase() === "content-length") return;
    res.setHeader(name, value);
  });
}

function parseBufferedJson(body = "") {
  try {
    return JSON.parse(String(body || ""));
  } catch {
    return null;
  }
}

async function refundReservedUsage(req, requestId) {
  const result = await requestUsageBackend(req, "/api/ai/usage/refund", {
    method: "POST",
    body: { requestId },
  });
  return result.ok ? normalizeUsage(result.payload) : null;
}

async function handleUsageStatus(req, res) {
  const result = await requestUsageBackend(req, "/api/ai/usage");
  if (result.status === 404) {
    sendJson(res, 200, { ok: true, usage: unavailableUsage() });
    return;
  }
  if (!result.ok) {
    sendJson(res, result.status || 503, {
      ok: false,
      code: result.payload?.code || "CLARA_AI_USAGE_UNAVAILABLE",
      error: result.payload?.message || "CLARA couldn't load today's AI allowance.",
    });
    return;
  }
  sendJson(res, 200, { ok: true, usage: normalizeUsage(result.payload) });
}

async function handleGeminiWithDailyAllowance(req, res) {
  const requestId = createRequestId();
  const reservation = await requestUsageBackend(req, "/api/ai/usage/consume", {
    method: "POST",
    body: { requestId },
  });

  if (reservation.status === 404) {
    // Safe rollout path: until the self-hosted backend migration is activated,
    // preserve the already-working Gemini path instead of breaking CLARA.
    await claraGeminiCoreHandler(req, res);
    return;
  }

  const reservationUsage = normalizeUsage(reservation.payload);
  if (!reservation.ok) {
    const code = reservation.payload?.code || "CLARA_AI_USAGE_UNAVAILABLE";
    const usage = normalizeUsage(reservation.payload);
    sendJson(res, reservation.status || 503, {
      ok: false,
      code,
      error: code === DAILY_LIMIT_CODE
        ? "You've used today's CLARA replies for your current plan. Your allowance resets tomorrow."
        : reservation.payload?.message || "CLARA couldn't verify today's AI allowance.",
      ...(usage.available ? { usage } : {}),
    });
    return;
  }

  const buffered = createBufferedResponse();
  let snapshot;
  try {
    await claraGeminiCoreHandler(req, buffered.response);
    snapshot = buffered.snapshot();
  } catch (error) {
    const usage = await refundReservedUsage(req, requestId);
    sendJson(res, 502, {
      ok: false,
      code: "CLARA_AI_UPSTREAM_FAILED",
      error: "CLARA AI could not complete the request.",
      ...(usage?.available ? { usage } : {}),
    });
    return;
  }

  const payload = parseBufferedJson(snapshot.body);
  const succeeded = snapshot.statusCode >= 200 && snapshot.statusCode < 300 && payload?.ok !== false;

  if (!succeeded) {
    const refundedUsage = await refundReservedUsage(req, requestId);
    copyBufferedHeaders(snapshot, res);
    if (payload && typeof payload === "object") {
      sendJson(res, snapshot.statusCode, {
        ...payload,
        ...(refundedUsage?.available ? { usage: refundedUsage } : {}),
      });
      return;
    }
    res.statusCode = snapshot.statusCode;
    res.end(snapshot.body);
    return;
  }

  copyBufferedHeaders(snapshot, res);
  if (payload && typeof payload === "object") {
    sendJson(res, snapshot.statusCode, {
      ...payload,
      usage: reservationUsage,
    });
    return;
  }

  res.statusCode = snapshot.statusCode;
  res.end(snapshot.body);
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    await handleUsageStatus(req, res);
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed." });
    return;
  }

  await handleGeminiWithDailyAllowance(req, res);
}
