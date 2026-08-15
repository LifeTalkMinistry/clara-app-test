import { getStoredBackendToken } from "./clara-backend-client.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_PROXY_ENDPOINT = "/api/clara-gemini";
const CLARA_GEMINI_PROXY_PRODUCTION_URL = "https://clara-app-test.vercel.app/api/clara-gemini";
export const ASK_BEFORE_YOU_SPEND_FEATURE = "ask-before-you-spend";
export const CLARA_AI_USAGE_UPDATED_EVENT = "clara:ai-usage-updated";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeModelName(model = "") {
  return cleanText(model).replace(/^models\//, "");
}

function normalizeFeature(value = "") {
  return cleanText(value).toLowerCase();
}

function normalizeUsage(value = {}) {
  if (!value || typeof value !== "object" || value.available !== true) {
    return { available: false };
  }
  const limit = Math.max(0, Number(value.limit || 0));
  const used = Math.max(0, Number(value.used || 0));
  const remaining = Math.max(0, Number(value.remaining ?? limit - used));
  return {
    available: true,
    tier: cleanText(value.tier || "free").toLowerCase() || "free",
    limit,
    used,
    remaining,
    usageDate: cleanText(value.usageDate || value.usage_date || ""),
    timeZone: cleanText(value.timeZone || value.time_zone || "Asia/Manila") || "Asia/Manila",
  };
}

function dispatchUsageUpdate(value) {
  const usage = normalizeUsage(value);
  if (!usage.available || typeof window === "undefined") return usage;
  window.dispatchEvent(new CustomEvent(CLARA_AI_USAGE_UPDATED_EVENT, { detail: usage }));
  return usage;
}

function resolveAllowedFeature({ feature = "" } = {}) {
  const requested = normalizeFeature(feature);
  if (requested === ASK_BEFORE_YOU_SPEND_FEATURE) return ASK_BEFORE_YOU_SPEND_FEATURE;
  return "";
}

function featureDisabledError() {
  const error = new Error("CLARA AI is intentionally disabled outside Ask Before You Spend.");
  error.code = "CLARA_AI_FEATURE_DISABLED";
  error.status = 403;
  return error;
}

function authRequiredError() {
  const error = new Error("Your CLARA session is required before Ask Before You Spend can use AI.");
  error.code = "CLARA_AI_AUTH_REQUIRED";
  error.status = 401;
  return error;
}

function getClaraGeminiProxyEndpoint() {
  const envUrl = import.meta.env.VITE_CLARA_GEMINI_PROXY_URL;
  if (envUrl) return envUrl;

  if (typeof window === "undefined") {
    return GEMINI_PROXY_ENDPOINT;
  }

  const protocol = window.location?.protocol || "";
  const hostname = window.location?.hostname || "";

  const isNativeLike =
    protocol === "capacitor:" ||
    protocol === "ionic:" ||
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    Boolean(window.Capacitor?.isNativePlatform?.());
  const isGitHubPages = hostname === "github.io" || hostname.endsWith(".github.io");

  return isNativeLike || isGitHubPages
    ? CLARA_GEMINI_PROXY_PRODUCTION_URL
    : GEMINI_PROXY_ENDPOINT;
}

async function parseProxyPayload(response) {
  return response.json().catch(() => ({}));
}

function proxyError(response, payload, model = "") {
  const error = new Error(payload?.error || "CLARA Gemini proxy request failed.");
  error.code = payload?.code || "CLARA_PROXY_FAILED";
  error.status = response.status;
  error.model = payload?.model || normalizeModelName(model);
  error.usage = normalizeUsage(payload?.usage);
  if (error.usage.available) dispatchUsageUpdate(error.usage);
  return error;
}

export function getClaraProxyModel(fallback = DEFAULT_GEMINI_MODEL) {
  return normalizeModelName(
    import.meta.env.VITE_GEMINI_MODEL ||
      fallback ||
      DEFAULT_GEMINI_MODEL
  );
}

export function hasClaraGeminiProxyConfig(feature = "") {
  return normalizeFeature(feature) === ASK_BEFORE_YOU_SPEND_FEATURE;
}

export async function getClaraGeminiDailyUsage({ signal } = {}) {
  const token = getStoredBackendToken();
  if (!token) throw authRequiredError();

  const response = await fetch(getClaraGeminiProxyEndpoint(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  });
  const payload = await parseProxyPayload(response);
  if (!response.ok || payload?.ok === false) throw proxyError(response, payload);
  const usage = normalizeUsage(payload?.usage);
  if (usage.available) dispatchUsageUpdate(usage);
  return usage;
}

export async function requestClaraGeminiProxyText({
  prompt,
  model = getClaraProxyModel(),
  generationConfig = {},
  signal,
  feature = "",
} = {}) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    const error = new Error("CLARA Gemini proxy prompt is empty.");
    error.code = "CLARA_PROXY_EMPTY_PROMPT";
    throw error;
  }

  const allowedFeature = resolveAllowedFeature({ feature });
  if (!allowedFeature) throw featureDisabledError();

  const token = getStoredBackendToken();
  if (!token) throw authRequiredError();

  const response = await fetch(getClaraGeminiProxyEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
    body: JSON.stringify({
      feature: allowedFeature,
      prompt: cleanPrompt,
      model: normalizeModelName(model),
      generationConfig,
    }),
  });

  const payload = await parseProxyPayload(response);

  if (!response.ok || payload?.ok === false) {
    throw proxyError(response, payload, model);
  }

  if (payload?.usage) dispatchUsageUpdate(payload.usage);

  const text = cleanText(payload?.text || "");
  if (!text) {
    const error = new Error("CLARA Gemini proxy returned an empty response.");
    error.code = "CLARA_PROXY_EMPTY_RESPONSE";
    error.model = payload?.model || normalizeModelName(model);
    error.usage = normalizeUsage(payload?.usage);
    throw error;
  }

  return text;
}

export async function requestClaraGeminiProxyJson(options = {}) {
  return requestClaraGeminiProxyText({
    ...options,
    generationConfig: {
      ...(options.generationConfig || {}),
      responseMimeType: "application/json",
    },
  });
}
