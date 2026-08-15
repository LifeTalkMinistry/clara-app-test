import {
  ASK_BEFORE_YOU_SPEND_FEATURE,
  CLARA_GEMINI_CLIENT_TIMEOUT_MS,
  getClaraProxyModel,
  requestClaraGeminiProxyJson,
} from "./clara-gemini-proxy-client";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeFeature(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
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

function withTimeout(ms = CLARA_GEMINI_CLIENT_TIMEOUT_MS, parentSignal) {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromParent = () => {
    if (!controller.signal.aborted) controller.abort(parentSignal?.reason);
  };

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener?.("abort", abortFromParent, { once: true });
  }

  const timeoutId = setTimeout(() => {
    if (controller.signal.aborted) return;
    timedOut = true;
    controller.abort();
  }, ms);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    clear: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener?.("abort", abortFromParent);
    },
  };
}

export function hasGeminiJsonConfig(feature = "") {
  return normalizeFeature(feature) === ASK_BEFORE_YOU_SPEND_FEATURE;
}

export async function requestGeminiJson({
  feature = "",
  prompt,
  maxOutputTokens = 650,
  timeoutMs = CLARA_GEMINI_CLIENT_TIMEOUT_MS,
  label = "CLARA Gemini JSON",
  signal,
} = {}) {
  const cleanPrompt = String(prompt || "").trim();
  const normalizedFeature = normalizeFeature(feature);

  if (!cleanPrompt) {
    throw new Error(`${label} prompt is empty.`);
  }

  if (!hasGeminiJsonConfig(normalizedFeature)) {
    throw featureDisabledError(label);
  }

  const model = getClaraProxyModel();
  const timeout = withTimeout(timeoutMs, signal);

  try {
    const text = await requestClaraGeminiProxyJson({
      feature: normalizedFeature,
      prompt: cleanPrompt,
      model,
      signal: timeout.signal,
      generationConfig: {
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
    if (timeout.didTimeout()) {
      throw Object.assign(new Error(`${label} timed out.`), {
        code: "GEMINI_JSON_TIMEOUT",
        model,
      });
    }

    if (signal?.aborted || error?.name === "AbortError") {
      throw Object.assign(new Error(`${label} cancelled.`), {
        name: "AbortError",
        code: "CLARA_AI_CANCELLED",
        model,
      });
    }

    throw error;
  } finally {
    timeout.clear();
  }
}
