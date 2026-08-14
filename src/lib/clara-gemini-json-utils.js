import {
  getClaraProxyModel,
  requestClaraGeminiProxyJson,
} from "./clara-gemini-proxy-client";

const ASK_BEFORE_YOU_SPEND_FEATURE = "ask-before-you-spend";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isBuyCheckLabel(label = "") {
  return /\bbuy check\b/i.test(String(label || ""));
}

function featureDisabledError(label = "CLARA Gemini JSON") {
  const error = new Error(`${label} is disabled because Gemini is reserved for Ask Before You Spend.`);
  error.code = "CLARA_AI_FEATURE_DISABLED";
  error.status = 403;
  return error;
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

export function hasGeminiJsonConfig(label = "") {
  return isBuyCheckLabel(label);
}

export async function requestGeminiJson({
  prompt,
  temperature = 0.18,
  maxOutputTokens = 650,
  timeoutMs = 14000,
  label = "CLARA Gemini JSON",
} = {}) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    throw new Error(`${label} prompt is empty.`);
  }

  if (!isBuyCheckLabel(label)) {
    throw featureDisabledError(label);
  }

  const model = getClaraProxyModel();
  const timeout = withTimeout(timeoutMs);

  try {
    const text = await requestClaraGeminiProxyJson({
      feature: ASK_BEFORE_YOU_SPEND_FEATURE,
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
    if (error?.name === "AbortError") {
      throw Object.assign(new Error(`${label} timed out.`), {
        code: "GEMINI_JSON_TIMEOUT",
        model,
      });
    }
    throw error;
  } finally {
    timeout.clear();
  }
}
