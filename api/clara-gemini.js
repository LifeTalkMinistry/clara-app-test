const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const ALLOWED_FEATURE = "ask-before-you-spend";
const DEFAULT_CLARA_BACKEND_API_URL = "https://api.clarapmc.com";
const MAX_PROMPT_CHARS = 28000;
const MAX_OUTPUT_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 20000;
const AUTH_TIMEOUT_MS = 8000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const DUPLICATE_WINDOW_MS = 2500;
const BLOCKED_MODEL_KEYWORDS = [
  "image",
  "vision",
  "tts",
  "audio",
  "speech",
  "robotics",
  "embedding",
  "embed",
  "aqa",
  "deep-research",
  "computer-use",
  "imagen",
  "veo",
  "lyria",
  "native-audio",
  "thinking-exp",
];

const rateBuckets = globalThis.__CLARA_GEMINI_RATE_BUCKETS__ || new Map();
globalThis.__CLARA_GEMINI_RATE_BUCKETS__ = rateBuckets;
const recentRequests = globalThis.__CLARA_GEMINI_RECENT_REQUESTS__ || new Map();
globalThis.__CLARA_GEMINI_RECENT_REQUESTS__ = recentRequests;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeModelName(model = "") {
  return cleanText(model).replace(/^models\//, "");
}

function getClaraBackendApiUrl() {
  return cleanText(process.env.CLARA_BACKEND_API_URL || DEFAULT_CLARA_BACKEND_API_URL).replace(/\/+$/, "");
}

function getBearerToken(req) {
  const authorization = cleanText(req.headers?.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return cleanText(match?.[1] || "");
}

function extractAuthenticatedUser(payload = {}) {
  const candidates = [payload, payload?.user, payload?.data, payload?.profile, payload?.account];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const id = candidate.id ?? candidate.user_id ?? candidate.userId;
    if (id !== undefined && id !== null && String(id).trim()) {
      return { id: String(id).trim() };
    }
  }
  return null;
}

async function authenticateClaraUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "CLARA_AI_AUTH_REQUIRED",
      error: "Your CLARA session is required before Ask Before You Spend can use AI.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${getClaraBackendApiUrl()}/api/users/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: 401,
        code: "CLARA_AI_AUTH_INVALID",
        error: "Your CLARA session is no longer valid. Please sign in again.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 503,
        code: "CLARA_AI_AUTH_UNAVAILABLE",
        error: "CLARA couldn't verify your session right now, so no AI money check was run.",
      };
    }

    const user = extractAuthenticatedUser(payload);
    if (!user) {
      return {
        ok: false,
        status: 503,
        code: "CLARA_AI_AUTH_UNAVAILABLE",
        error: "CLARA couldn't verify your session right now, so no AI money check was run.",
      };
    }

    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      code: error?.name === "AbortError" ? "CLARA_AI_AUTH_TIMEOUT" : "CLARA_AI_AUTH_UNAVAILABLE",
      error: "CLARA couldn't verify your session right now, so no AI money check was run.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isSafeGeminiModel(model = "") {
  const value = normalizeModelName(model).toLowerCase();
  if (!value || !value.includes("gemini")) return false;
  if (!/^[a-z0-9._-]+$/.test(value)) return false;
  if (BLOCKED_MODEL_KEYWORDS.some((keyword) => value.includes(keyword))) return false;
  return value.includes("flash") || value.includes("pro");
}

function chooseModel(requestedModel = "") {
  const envModel = normalizeModelName(process.env.GEMINI_MODEL || "");
  if (isSafeGeminiModel(envModel)) return envModel;

  const requested = normalizeModelName(requestedModel);
  if (isSafeGeminiModel(requested)) return requested;

  return DEFAULT_MODEL;
}

function safeNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function buildGenerationConfig(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const config = {
    temperature: safeNumber(source.temperature, 0.55, 0, 2),
    topP: safeNumber(source.topP, 0.86, 0, 1),
    maxOutputTokens: Math.round(safeNumber(source.maxOutputTokens, 520, 1, MAX_OUTPUT_TOKENS)),
  };

  if (source.topK !== undefined) {
    config.topK = Math.round(safeNumber(source.topK, 40, 1, 100));
  }

  if (source.responseMimeType === "application/json" || source.responseMimeType === "text/plain") {
    config.responseMimeType = source.responseMimeType;
  }

  if (source.thinkingConfig && typeof source.thinkingConfig === "object") {
    const thinkingBudget = Number(source.thinkingConfig.thinkingBudget);
    if (Number.isFinite(thinkingBudget)) {
      config.thinkingConfig = {
        thinkingBudget: Math.round(safeNumber(thinkingBudget, 0, 0, 1024)),
      };
    }
  }

  return config;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function extractGeminiText(payload = {}) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

function safeErrorMessage(status) {
  if (status === 401 || status === 403) return "CLARA AI is not configured correctly on the server.";
  if (status === 429) return "CLARA AI is temporarily rate limited. Please try again shortly.";
  if (status >= 500) return "CLARA AI is temporarily unavailable. Please try again shortly.";
  return "CLARA AI could not complete the request.";
}

function isAllowedBuyCheckPrompt(prompt = "") {
  const head = String(prompt || "").trim().slice(0, 1800).toLowerCase();
  if (!head) return false;
  return head.includes("ask before you spend") ||
    head.includes("buy check") ||
    head.includes("spending decision expert") ||
    head.includes("pre-purchase money coach");
}

function getClientKey(req) {
  const forwarded = cleanText(req.headers?.["x-forwarded-for"] || "");
  if (forwarded) return forwarded.split(",")[0].trim();
  return cleanText(
    req.headers?.["x-real-ip"] ||
    req.headers?.["cf-connecting-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function takeRateLimitSlot(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const existing = rateBuckets.get(key);
  const bucket = existing && now - existing.startedAt < RATE_LIMIT_WINDOW_MS
    ? existing
    : { startedAt: now, count: 0 };

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 1000) {
    for (const [bucketKey, value] of rateBuckets.entries()) {
      if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.startedAt)) / 1000)),
  };
}

function promptFingerprint(prompt = "") {
  let hash = 2166136261;
  const source = String(prompt || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${source.length}:${(hash >>> 0).toString(36)}`;
}

function takeDuplicateSlot(req, prompt) {
  const now = Date.now();
  const key = `${getClientKey(req)}:${promptFingerprint(prompt)}`;
  const previous = Number(recentRequests.get(key) || 0);

  if (previous && now - previous < DUPLICATE_WINDOW_MS) {
    return false;
  }

  recentRequests.set(key, now);
  if (recentRequests.size > 1500) {
    for (const [requestKey, timestamp] of recentRequests.entries()) {
      if (now - timestamp >= DUPLICATE_WINDOW_MS) recentRequests.delete(requestKey);
    }
  }
  return true;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const feature = cleanText(body?.feature).toLowerCase();
  if (feature !== ALLOWED_FEATURE) {
    return sendJson(res, 403, {
      ok: false,
      code: "CLARA_AI_FEATURE_DISABLED",
      error: "CLARA AI is intentionally enabled only for Ask Before You Spend.",
    });
  }

  const prompt = String(body?.prompt || "").trim();
  if (!prompt) {
    return sendJson(res, 400, { ok: false, error: "Prompt is required." });
  }

  if (!isAllowedBuyCheckPrompt(prompt)) {
    return sendJson(res, 403, {
      ok: false,
      code: "CLARA_AI_PROMPT_BLOCKED",
      error: "Only Ask Before You Spend prompts are allowed through this endpoint.",
    });
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return sendJson(res, 413, { ok: false, error: "Prompt is too large for one CLARA AI request." });
  }

  const rateLimit = takeRateLimitSlot(req);
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    return sendJson(res, 429, {
      ok: false,
      code: "CLARA_AI_RATE_LIMITED",
      error: "Too many Ask Before You Spend AI requests. Please try again shortly.",
    });
  }

  const authentication = await authenticateClaraUser(req);
  if (!authentication.ok) {
    return sendJson(res, authentication.status, {
      ok: false,
      code: authentication.code,
      error: authentication.error,
    });
  }

  if (!takeDuplicateSlot(req, prompt)) {
    return sendJson(res, 409, {
      ok: false,
      code: "CLARA_AI_DUPLICATE_REQUEST",
      error: "That Ask Before You Spend request is already being processed.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { ok: false, error: "CLARA AI is not configured on the server." });
  }

  const model = chooseModel(body?.model);
  const generationConfig = buildGenerationConfig(body?.generationConfig);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return sendJson(res, response.status || 502, {
        ok: false,
        error: safeErrorMessage(response.status || 500),
        model,
      });
    }

    const text = extractGeminiText(payload);
    if (!text) {
      return sendJson(res, 502, { ok: false, error: "CLARA AI returned an empty response.", model });
    }

    return sendJson(res, 200, { ok: true, text, model, feature: ALLOWED_FEATURE });
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    return sendJson(res, isTimeout ? 504 : 502, {
      ok: false,
      error: isTimeout ? "CLARA AI request timed out." : "CLARA AI could not be reached.",
      model,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
