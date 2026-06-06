const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_PROMPT_CHARS = 90000;
const REQUEST_TIMEOUT_MS = 30000;
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

function sendJson(res, statusCode, payload) {
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

function isSafeGeminiModel(model = "") {
  const value = normalizeModelName(model).toLowerCase();
  if (!value || !value.includes("gemini")) return false;
  if (!/^[a-z0-9._-]+$/.test(value)) return false;
  if (BLOCKED_MODEL_KEYWORDS.some((keyword) => value.includes(keyword))) return false;
  return value.includes("flash") || value.includes("pro");
}

function chooseModel(requestedModel = "") {
  const requested = normalizeModelName(requestedModel);
  if (isSafeGeminiModel(requested)) return requested;

  const envModel = normalizeModelName(process.env.GEMINI_MODEL || "");
  if (isSafeGeminiModel(envModel)) return envModel;

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
    maxOutputTokens: Math.round(safeNumber(source.maxOutputTokens, 520, 1, 4096)),
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
        thinkingBudget: Math.round(safeNumber(thinkingBudget, 0, 0, 4096)),
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { ok: false, error: "CLARA AI is not configured on the server." });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const prompt = String(body?.prompt || "").trim();
  if (!prompt) {
    return sendJson(res, 400, { ok: false, error: "Prompt is required." });
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return sendJson(res, 413, { ok: false, error: "Prompt is too large for one CLARA AI request." });
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

    return sendJson(res, 200, { ok: true, text, model });
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
