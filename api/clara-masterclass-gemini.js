const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_CLARA_BACKEND_API_URL = "https://api.clarapmc.com";
const MAX_PROMPT_CHARS = 16000;
const MAX_OUTPUT_TOKENS = 420;
const REQUEST_TIMEOUT_MS = 26000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const ALLOWED_MODES = new Set(["explain_another_way", "follow_up_question"]);
const MASTERCLASS_PROMPT_AUTHORITIES = new Map([
  ["budget", "CLARA BUDGETING MASTERCLASS"],
  ["emergency-fund", "CLARA EMERGENCY FUND MASTERCLASS"],
  ["savings-goals", "CLARA SAVINGS GOALS MASTERCLASS"],
]);
const rateBuckets = globalThis.__CLARA_MASTERCLASS_RATE_BUCKETS__ || new Map();
globalThis.__CLARA_MASTERCLASS_RATE_BUCKETS__ = rateBuckets;

function cleanText(value = "") { return String(value || "").replace(/\s+/g, " ").trim(); }
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Cache-Control", "no-store");
}
function sendJson(res, statusCode, payload) {
  setCorsHeaders(res); res.statusCode = statusCode; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(payload));
}
function getBackendUrl() { return cleanText(process.env.CLARA_BACKEND_API_URL || DEFAULT_CLARA_BACKEND_API_URL).replace(/\/+$/, ""); }
function getBearerToken(req) { const authorization = cleanText(req.headers?.authorization || ""); const match = authorization.match(/^Bearer\s+(.+)$/i); return cleanText(match?.[1] || ""); }
function clientKey(req) {
  const forwarded = cleanText(req.headers?.["x-forwarded-for"] || "");
  if (forwarded) return forwarded.split(",")[0].trim();
  return cleanText(req.headers?.["x-real-ip"] || req.headers?.["cf-connecting-ip"] || req.socket?.remoteAddress || "unknown");
}
function takeRateLimitSlot(req) {
  const key = clientKey(req); const now = Date.now(); const previous = rateBuckets.get(key);
  const bucket = previous && now - previous.startedAt < RATE_LIMIT_WINDOW_MS ? previous : { startedAt: now, count: 0 };
  bucket.count += 1; rateBuckets.set(key, bucket);
  if (rateBuckets.size > 1000) for (const [entryKey, entry] of rateBuckets.entries()) if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(entryKey);
  return { allowed: bucket.count <= RATE_LIMIT_MAX_REQUESTS, retryAfterSeconds: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.startedAt)) / 1000)) };
}
function createRequestId() { const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2); return `clara-masterclass-${Date.now()}-${random}`; }
function normalizeUsage(payload = {}) {
  const source = payload?.usage || payload?.details?.usage || payload;
  if (!source || typeof source !== "object" || source.available !== true) return null;
  const limit = Math.max(0, Number(source.limit || 0)); const used = Math.max(0, Number(source.used || 0));
  return { available: true, tier: cleanText(source.tier || "free").toLowerCase() || "free", limit, used, remaining: Math.max(0, Number(source.remaining ?? limit - used)), usageDate: cleanText(source.usageDate || source.usage_date || ""), timeZone: cleanText(source.timeZone || source.time_zone || "Asia/Manila") || "Asia/Manila" };
}
async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(url, { ...options, signal: controller.signal }); const payload = await response.json().catch(() => ({})); return { response, payload }; }
  finally { clearTimeout(timeoutId); }
}
async function authenticate(token) {
  try {
    const { response } = await fetchJsonWithTimeout(`${getBackendUrl()}/api/users/me`, { method: "GET", cache: "no-store", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }, 9000);
    if (response.status === 401 || response.status === 403) return { ok: false, status: 401, code: "CLARA_MASTERCLASS_AUTH_INVALID", error: "Your CLARA session is no longer valid. Please sign in again." };
    if (!response.ok) return { ok: false, status: 503, code: "CLARA_MASTERCLASS_AUTH_UNAVAILABLE", error: "CLARA could not verify your session right now." };
    return { ok: true };
  } catch { return { ok: false, status: 503, code: "CLARA_MASTERCLASS_AUTH_UNAVAILABLE", error: "CLARA could not verify your session right now." }; }
}
async function reserveUsage(token, requestId) {
  try {
    const { response, payload } = await fetchJsonWithTimeout(`${getBackendUrl()}/api/ai/usage/consume`, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ requestId }) }, 9000);
    if (response.status === 404) return { ok: true, reserved: false, usage: null };
    if (!response.ok) return { ok: false, status: response.status || 503, code: payload?.code || "CLARA_AI_USAGE_UNAVAILABLE", error: payload?.code === "CLARA_AI_DAILY_LIMIT_REACHED" ? "You've used today's CLARA replies for your current plan. Your allowance resets tomorrow." : payload?.message || "CLARA could not verify today's AI allowance.", usage: normalizeUsage(payload) };
    return { ok: true, reserved: true, usage: normalizeUsage(payload) };
  } catch { return { ok: false, status: 503, code: "CLARA_AI_USAGE_UNAVAILABLE", error: "CLARA could not verify today's AI allowance.", usage: null }; }
}
async function refundUsage(token, requestId) {
  try { await fetchJsonWithTimeout(`${getBackendUrl()}/api/ai/usage/refund`, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ requestId }) }, 6000); }
  catch { /* Best-effort cleanup only. The backend request id keeps the reservation idempotent. */ }
}
function extractGeminiText(payload = {}) { return (payload?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || "").filter(Boolean).join("\n").trim(); }
function validMasterclassPrompt(masterclassId, prompt, mode) {
  const expectedAuthority = MASTERCLASS_PROMPT_AUTHORITIES.get(masterclassId);
  if (!expectedAuthority) return false;
  const head = String(prompt || "").slice(0, 5000).toUpperCase();
  if (!head.includes(expectedAuthority)) return false;
  if (mode === "explain_another_way") return head.includes("MODE: EXPLAIN_ANOTHER_WAY");
  if (mode === "follow_up_question") return head.includes("MODE: FOLLOW_UP_QUESTION");
  return false;
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  if (req.method !== "POST") { sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed." }); return; }

  const rateLimit = takeRateLimitSlot(req);
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    sendJson(res, 429, { ok: false, code: "CLARA_MASTERCLASS_RATE_LIMITED", error: "Too many custom masterclass clarifications. Please continue the lesson or try again shortly." }); return;
  }

  const token = getBearerToken(req);
  if (!token) { sendJson(res, 401, { ok: false, code: "CLARA_MASTERCLASS_AUTH_REQUIRED", error: "Your CLARA session is required before I can generate a custom clarification." }); return; }
  const authentication = await authenticate(token);
  if (!authentication.ok) { sendJson(res, authentication.status, authentication); return; }

  const masterclassId = cleanText(req.body?.masterclassId || "").toLowerCase();
  const mode = cleanText(req.body?.mode || "").toLowerCase();
  const prompt = String(req.body?.prompt || "").trim();
  if (!MASTERCLASS_PROMPT_AUTHORITIES.has(masterclassId)) { sendJson(res, 400, { ok: false, code: "CLARA_MASTERCLASS_ID_INVALID", error: "Unsupported CLARA Masterclass." }); return; }
  if (!ALLOWED_MODES.has(mode)) { sendJson(res, 400, { ok: false, code: "CLARA_MASTERCLASS_MODE_INVALID", error: "Unsupported masterclass clarification mode." }); return; }
  if (!prompt) { sendJson(res, 400, { ok: false, code: "CLARA_MASTERCLASS_PROMPT_REQUIRED", error: "Prompt is required." }); return; }
  if (prompt.length > MAX_PROMPT_CHARS) { sendJson(res, 413, { ok: false, code: "CLARA_MASTERCLASS_PROMPT_TOO_LARGE", error: "That masterclass question is too large for one clarification." }); return; }
  if (!validMasterclassPrompt(masterclassId, prompt, mode)) { sendJson(res, 403, { ok: false, code: "CLARA_MASTERCLASS_PROMPT_BLOCKED", error: "The prompt authority does not match the requested CLARA Masterclass." }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { sendJson(res, 500, { ok: false, code: "CLARA_MASTERCLASS_AI_NOT_CONFIGURED", error: "CLARA clarification AI is not configured on the server." }); return; }

  const requestId = createRequestId();
  const reservation = await reserveUsage(token, requestId);
  if (!reservation.ok) { sendJson(res, reservation.status, { ok: false, code: reservation.code, error: reservation.error, ...(reservation.usage ? { usage: reservation.usage } : {}) }); return; }

  const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, signal: controller.signal, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS } }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (reservation.reserved) await refundUsage(token, requestId);
      sendJson(res, response.status || 502, { ok: false, code: response.status === 429 ? "CLARA_MASTERCLASS_AI_BUSY" : "CLARA_MASTERCLASS_AI_UPSTREAM_FAILED", error: response.status === 429 ? "CLARA is handling a lot of clarifications right now. Please try again shortly." : "CLARA could not generate that clarification right now.", model: GEMINI_MODEL }); return;
    }
    const text = extractGeminiText(payload);
    if (!text) { if (reservation.reserved) await refundUsage(token, requestId); sendJson(res, 502, { ok: false, code: "CLARA_MASTERCLASS_AI_EMPTY", error: "CLARA returned an empty clarification.", model: GEMINI_MODEL }); return; }
    sendJson(res, 200, { ok: true, text: text.slice(0, 5000), model: GEMINI_MODEL, masterclassId, mode, ...(reservation.usage ? { usage: reservation.usage } : {}) });
  } catch (error) {
    if (reservation.reserved) await refundUsage(token, requestId);
    sendJson(res, error?.name === "AbortError" ? 504 : 502, { ok: false, code: error?.name === "AbortError" ? "CLARA_MASTERCLASS_AI_TIMEOUT" : "CLARA_MASTERCLASS_AI_FAILED", error: error?.name === "AbortError" ? "That clarification took too long. You can try again or continue the masterclass." : "CLARA could not generate that clarification right now.", model: GEMINI_MODEL });
  } finally { clearTimeout(timeoutId); }
}
