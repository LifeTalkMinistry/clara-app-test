const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const FALLBACK_GEMINI_MODELS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-pro",
];
const DEFAULT_TIMEOUT_MS = 14000;
let discoveredModelCache = null;

function getGeminiApiKey() {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_AI_API_KEY ||
    import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
    import.meta.env.VITE_CLARA_GEMINI_API_KEY ||
    import.meta.env.VITE_AI_API_KEY ||
    ""
  );
}

function getExplicitGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || "";
}

function normalizeModelName(model) {
  const value = String(model || "").trim();
  if (!value) return "";
  return value.startsWith("models/") ? value.slice("models/".length) : value;
}

function uniqueModels(models = []) {
  return models
    .map(normalizeModelName)
    .filter(Boolean)
    .filter((model, index, list) => list.indexOf(model) === index);
}

function getConfiguredModelCandidates() {
  return uniqueModels([getExplicitGeminiModel(), ...FALLBACK_GEMINI_MODELS]);
}

function scoreDiscoveredModel(model) {
  const name = normalizeModelName(model?.name || model);
  if (name.includes("2.0-flash") && !name.includes("lite")) return 120;
  if (name.includes("2.5-flash") && !name.includes("lite")) return 110;
  if (name.includes("flash-lite")) return 95;
  if (name.includes("1.5-flash")) return 80;
  if (name.includes("flash")) return 70;
  if (name.includes("pro")) return 40;
  return 10;
}

async function discoverGeminiModels({ apiKey, signal }) {
  if (discoveredModelCache?.length) return discoveredModelCache;

  const response = await fetch(`${GEMINI_API_BASE}/models?key=${encodeURIComponent(apiKey)}`, {
    method: "GET",
    signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(new Error(data?.error?.message || "Could not list Gemini models."), {
      status: response.status,
      payload: data,
    });
  }

  const models = (Array.isArray(data?.models) ? data.models : [])
    .filter((model) => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes("generateContent"))
    .map((model) => normalizeModelName(model.name))
    .filter(Boolean)
    .sort((a, b) => scoreDiscoveredModel(b) - scoreDiscoveredModel(a));

  discoveredModelCache = uniqueModels(models);
  console.info("[CLARA Life Stage Gemini] Available generateContent models:", discoveredModelCache);
  return discoveredModelCache;
}

async function getGeminiModelCandidates({ apiKey, signal }) {
  const configured = getConfiguredModelCandidates();

  try {
    const discovered = await discoverGeminiModels({ apiKey, signal });

    if (discovered.length) {
      const explicit = normalizeModelName(getExplicitGeminiModel());
      const explicitIfAvailable = explicit && discovered.includes(explicit) ? [explicit] : [];
      const discoveredWithoutExplicit = discovered.filter((model) => model !== explicit);
      return uniqueModels([...explicitIfAvailable, ...discoveredWithoutExplicit]);
    }
  } catch (error) {
    console.warn("[CLARA Life Stage Gemini] Could not discover models, using configured fallback list:", error);
  }

  return configured;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Gemini returned an empty response.");

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = String(fenced?.[1] || raw).trim();
  const fencedParsed = safeJsonParse(candidate);
  if (fencedParsed) return fencedParsed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return valid JSON.");
  }

  const parsed = safeJsonParse(candidate.slice(start, end + 1));
  if (!parsed) throw new Error("Gemini returned malformed JSON.");
  return parsed;
}

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeoutId),
  };
}

function labelForQuestion(key) {
  const labels = {
    stage: "Life Stage",
    setup: "Current Setup",
    rhythm: "Money Rhythm",
    workload: "Weekly Load",
    pressure: "Pressure Right Now",
    coping: "When Pressure Hits",
    goal: "What To Protect",
  };
  return labels[key] || key || "Current Answer";
}

function formatAnswerChain(draft = {}, currentKey = "stage") {
  const order = ["stage", "setup", "rhythm", "workload", "pressure", "coping", "goal"];
  return order
    .filter((key) => draft[key])
    .map((key) => `${key === currentKey ? "CURRENT" : "PREVIOUS"} - ${labelForQuestion(key)}: ${draft[key]}`)
    .join("\n");
}

function buildPrompt({ stage, currentKey, currentValue, draft, localBoardContext }) {
  return `You are CLARA's Contextual Behavioral Intelligence Engine.

Your task is to write the Life Stage Context Board text after the user selects an option.

CLARA's philosophy:
Understand the person first before analyzing the money.

User life stage:
${stage || draft?.stage || "Unknown"}

Selection chain:
${formatAnswerChain(draft, currentKey)}

Current question:
${labelForQuestion(currentKey)}

Current answer:
${currentValue || draft?.[currentKey] || stage || "Unknown"}

Existing local board context to improve, not copy:
Title: ${localBoardContext?.title || ""}
Summary: ${localBoardContext?.summary || ""}

Rules:
- Connect the current answer to the previous selections.
- Do not treat the answer independently.
- Sound calm, intelligent, human, and observant.
- Avoid therapy language.
- Avoid motivational coaching.
- Avoid generic budgeting advice.
- Avoid corporate tone.
- Avoid saying "as an AI".
- Stay concise.
- Write for a premium mobile app board.
- The title must be short, 2 to 5 words.
- The summary must be 1 to 2 sentences only.
- Summary should feel like CLARA is quietly understanding the user's real life.

Return ONLY valid JSON in this shape:
{
  "title": "short board title",
  "summary": "1-2 concise human sentences"
}`;
}

function sanitizeBoardContext(raw) {
  const title = cleanText(raw?.title).slice(0, 70);
  const summary = cleanText(raw?.summary).slice(0, 420);

  if (!title || !summary) {
    throw new Error("Gemini returned incomplete board context.");
  }

  return {
    title,
    summary,
    source: "gemini",
  };
}

async function requestGeminiContent({ apiKey, model, prompt, signal }) {
  const modelName = normalizeModelName(model);
  console.info("[CLARA Life Stage Gemini] Trying model:", modelName);

  const response = await fetch(`${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.62,
        topP: 0.9,
        maxOutputTokens: 220,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(new Error(data?.error?.message || "Gemini request failed."), {
      status: response.status,
      model: modelName,
      payload: data,
    });
  }

  return data;
}

export function hasLifeStageGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateLifeStageBoardContextWithGemini({
  stage,
  currentKey,
  currentValue,
  draft,
  localBoardContext,
  signal,
} = {}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const prompt = buildPrompt({ stage, currentKey, currentValue, draft, localBoardContext });
  const timeout = typeof window !== "undefined" ? withTimeout() : null;
  const requestSignal = signal || timeout?.signal;
  let lastError = null;

  try {
    const modelCandidates = await getGeminiModelCandidates({ apiKey, signal: requestSignal });
    console.info("[CLARA Life Stage Gemini] Model candidates:", modelCandidates);

    for (const model of modelCandidates) {
      try {
        const data = await requestGeminiContent({ apiKey, model, prompt, signal: requestSignal });
        const textPayload =
          data?.candidates?.[0]?.content?.parts
            ?.map((part) => part?.text || "")
            .filter(Boolean)
            .join("\n") || "";

        const parsed = extractJson(textPayload);
        return sanitizeBoardContext(parsed);
      } catch (error) {
        lastError = error;
        console.warn("[CLARA Life Stage Gemini] Model failed:", error?.model || model, error?.message || error);
      }
    }

    throw lastError || new Error("Gemini request failed.");
  } catch (error) {
    const finalError =
      error?.name === "AbortError"
        ? Object.assign(new Error("Gemini request timed out."), { code: "GEMINI_TIMEOUT" })
        : error;
    throw finalError;
  } finally {
    timeout?.clear?.();
  }
}
