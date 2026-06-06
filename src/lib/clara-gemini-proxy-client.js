const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_PROXY_ENDPOINT = "/api/clara-gemini";
const CLARA_GEMINI_PROXY_PRODUCTION_URL = "https://clara-app-test.vercel.app/api/clara-gemini";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeModelName(model = "") {
  return cleanText(model).replace(/^models\//, "");
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

  return isNativeLike ? CLARA_GEMINI_PROXY_PRODUCTION_URL : GEMINI_PROXY_ENDPOINT;
}

export function getClaraProxyModel(fallback = DEFAULT_GEMINI_MODEL) {
  return normalizeModelName(
    import.meta.env.VITE_GEMINI_MODEL ||
      import.meta.env.VITE_CLARA_GEMINI_MODEL ||
      fallback ||
      DEFAULT_GEMINI_MODEL
  );
}

export function hasClaraGeminiProxyConfig() {
  return true;
}

export function getClaraGeminiProxyModelCandidates(fallbacks = []) {
  const candidates = [
    getClaraProxyModel(),
    ...(Array.isArray(fallbacks) ? fallbacks : []),
    DEFAULT_GEMINI_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  return candidates
    .map(normalizeModelName)
    .filter(Boolean)
    .filter((model, index, list) => list.indexOf(model) === index);
}

export async function requestClaraGeminiProxyText({
  prompt,
  model = getClaraProxyModel(),
  generationConfig = {},
  signal,
} = {}) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    const error = new Error("CLARA Gemini proxy prompt is empty.");
    error.code = "CLARA_PROXY_EMPTY_PROMPT";
    throw error;
  }

  const response = await fetch(getClaraGeminiProxyEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      prompt: cleanPrompt,
      model: normalizeModelName(model),
      generationConfig,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.error || "CLARA Gemini proxy request failed.");
    error.code = "CLARA_PROXY_FAILED";
    error.status = response.status;
    error.model = payload?.model || normalizeModelName(model);
    throw error;
  }

  const text = cleanText(payload?.text || "");
  if (!text) {
    const error = new Error("CLARA Gemini proxy returned an empty response.");
    error.code = "CLARA_PROXY_EMPTY_RESPONSE";
    error.model = payload?.model || normalizeModelName(model);
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
