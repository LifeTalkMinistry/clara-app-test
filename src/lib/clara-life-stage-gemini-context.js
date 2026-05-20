const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_GEMINI_MODELS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash",
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

function isTextBoardModel(model) {
  const name = normalizeModelName(model).toLowerCase();
  if (!name.includes("gemini")) return false;
  if (name.includes("embedding")) return false;
  if (name.includes("imagen")) return false;
  if (name.includes("image")) return false;
  if (name.includes("tts")) return false;
  if (name.includes("audio")) return false;
  if (name.includes("live")) return false;
  if (name.includes("veo")) return false;
  if (name.includes("aqa")) return false;
  if (name.includes("learnlm")) return false;
  if (name.includes("thinking")) return false;
  if (name.includes("preview") && !name.includes("flash")) return false;
  return name.includes("flash") || name.includes("pro");
}

function isDeprecatedForNewUsers(model) {
  const name = normalizeModelName(model).toLowerCase();
  return (
    name === "gemini-2.0-flash" ||
    name === "gemini-2.0-flash-001" ||
    name === "gemini-1.5-flash" ||
    name === "gemini-1.5-flash-latest" ||
    name === "gemini-pro"
  );
}

function scoreDiscoveredModel(model) {
  const name = normalizeModelName(model?.name || model).toLowerCase();
  let score = 0;

  if (name.includes("2.5-flash") && !name.includes("lite") && !name.includes("preview")) score += 140;
  else if (name.includes("2.5-flash-lite") && !name.includes("preview")) score += 125;
  else if (name.includes("2.5-flash")) score += 110;
  else if (name.includes("2.0-flash-lite")) score += 70;
  else if (name.includes("2.0-flash")) score += 50;
  else if (name.includes("1.5-flash")) score += 35;
  else if (name.includes("pro")) score += 25;
  else score += 5;

  if (name.includes("preview")) score -= 20;
  if (name.includes("exp")) score -= 25;
  if (isDeprecatedForNewUsers(name)) score -= 100;

  return score;
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
    .filter(isTextBoardModel)
    .sort((a, b) => scoreDiscoveredModel(b) - scoreDiscoveredModel(a));

  discoveredModelCache = uniqueModels(models);
  console.info("[CLARA Life Stage Gemini] Available text board models:", discoveredModelCache);
  return discoveredModelCache;
}

async function getGeminiModelCandidates({ apiKey, signal }) {
  const configured = getConfiguredModelCandidates().filter(isTextBoardModel);

  try {
    const discovered = await discoverGeminiModels({ apiKey, signal });

    if (discovered.length) {
      const explicit = normalizeModelName(getExplicitGeminiModel());
      const explicitIfAvailable = explicit && discovered.includes(explicit) ? [explicit] : [];
      const discoveredWithoutExplicit = discovered.filter((model) => model !== explicit && !isDeprecatedForNewUsers(model));
      const deprecatedDiscovered = discovered.filter((model) => model !== explicit && isDeprecatedForNewUsers(model));
      return uniqueModels([...explicitIfAvailable, ...discoveredWithoutExplicit, ...deprecatedDiscovered]);
    }
  } catch (error) {
    console.warn("[CLARA Life Stage Gemini] Could not discover models, using configured fallback list:", error);
  }

  return configured.filter((model) => !isDeprecatedForNewUsers(model)).concat(configured.filter(isDeprecatedForNewUsers));
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

Write the Life Stage Context Board text after the user selects an option.

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

Return valid JSON only:
{"title":"short board title","summary":"1-2 concise human sentences"}`;
}

function deriveTitleFromSummary(summary, fallbackTitle = "Life Pattern") {
  const cleaned = cleanText(summary)
    .replace(/^CLARA\s+(sees|reads|understands)\s+/i, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 4);
  const title = words.join(" ");
  return title || fallbackTitle || "Life Pattern";
}

function parsePlainTextBoardContext(text, fallback = {}) {
  const raw = cleanText(text)
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^assistant\s*:/i, "")
    .trim();

  if (!raw) throw new Error("Gemini returned empty plain text.");

  const titleMatch = raw.match(/title\s*:\s*([^\n.]+)(?:\n|summary\s*:|$)/i);
  const summaryMatch = raw.match(/summary\s*:\s*([\s\S]+)$/i);

  if (titleMatch && summaryMatch) {
    return sanitizeBoardContext({ title: titleMatch[1], summary: summaryMatch[1] });
  }

  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);
  const summary = (sentences.slice(0, 2).join(" ") || raw).slice(0, 420);
  const title = deriveTitleFromSummary(summary, fallback?.title);

  return sanitizeBoardContext({ title, summary });
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

function parseGeminiBoardContext(textPayload, fallback) {
  try {
    return sanitizeBoardContext(extractJson(textPayload));
  } catch (jsonError) {
    console.warn("[CLARA Life Stage Gemini] JSON parse failed, using plain text Gemini response:", jsonError?.message || jsonError);
    return parsePlainTextBoardContext(textPayload, fallback);
  }
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

        return parseGeminiBoardContext(textPayload, localBoardContext);
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
