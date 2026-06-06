import {
  getClaraGeminiProxyModelCandidates,
  requestClaraGeminiProxyJson,
} from "./clara-gemini-proxy-client";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

function normalizeModelName(model = "") {
  return String(model || "").trim().replace(/^models\//, "");
}

function getConfiguredGeminiModel() {
  return normalizeModelName(
    import.meta.env.VITE_GEMINI_MODEL ||
      import.meta.env.VITE_CLARA_GEMINI_MODEL ||
      DEFAULT_GEMINI_MODEL
  );
}

function unique(values = []) {
  return values.filter(Boolean).filter((value, index, list) => list.indexOf(value) === index);
}

function getModelCandidates() {
  return getClaraGeminiProxyModelCandidates(unique([getConfiguredGeminiModel(), ...FALLBACK_MODELS].map(normalizeModelName)));
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractGeminiJson(text = "") {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Gemini returned an empty JSON response.");

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = String(fenced?.[1] || raw).trim();
  const fencedParsed = safeJsonParse(candidate);
  if (fencedParsed) return fencedParsed;

  const firstObject = candidate.indexOf("{");
  const lastObject = candidate.lastIndexOf("}");
  const firstArray = candidate.indexOf("[");
  const lastArray = candidate.lastIndexOf("]");

  const objectSlice = firstObject >= 0 && lastObject > firstObject
    ? candidate.slice(firstObject, lastObject + 1)
    : "";
  const arraySlice = firstArray >= 0 && lastArray > firstArray
    ? candidate.slice(firstArray, lastArray + 1)
    : "";

  const parsedObject = objectSlice ? safeJsonParse(objectSlice) : null;
  if (parsedObject) return parsedObject;

  const parsedArray = arraySlice ? safeJsonParse(arraySlice) : null;
  if (parsedArray) return parsedArray;

  throw new Error("Gemini did not return valid JSON.");
}

function withTimeout(ms = 14000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

export function hasGeminiJsonConfig() {
  return true;
}

export async function requestGeminiJson({
  prompt,
  temperature = 0.18,
  maxOutputTokens = 900,
  timeoutMs = 14000,
  label = "CLARA Gemini JSON",
} = {}) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    throw new Error(`${label} prompt is empty.`);
  }

  let lastError = null;

  for (const model of getModelCandidates()) {
    const timeout = withTimeout(timeoutMs);

    try {
      const text = await requestClaraGeminiProxyJson({
        prompt: cleanPrompt,
        model,
        signal: timeout.signal,
        generationConfig: {
          temperature,
          topP: 0.86,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      });

      return {
        json: extractGeminiJson(text),
        model,
        rawText: text,
      };
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? Object.assign(new Error(`${label} timed out.`), {
            code: "GEMINI_JSON_TIMEOUT",
            model,
          })
        : error;
    } finally {
      timeout.clear();
    }
  }

  throw lastError || new Error(`${label} failed.`);
}
