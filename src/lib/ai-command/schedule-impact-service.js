const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 18000;
const DEPRECATED_MODELS = new Set(["gemini-1.5-flash", "gemini-2.0-flash"]);

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeModelName(value) {
  const model = cleanText(value);
  if (!model || DEPRECATED_MODELS.has(model)) return DEFAULT_MODEL;
  return model;
}

function getGeminiConfig() {
  return {
    apiKey:
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
      "",
    model: normalizeModelName(import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL),
  };
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
  if (!raw) throw new Error("CLARA returned an empty schedule impact response.");

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = String(fenced?.[1] || raw).trim();
  const fencedParsed = safeJsonParse(candidate);
  if (fencedParsed) return fencedParsed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("CLARA did not return valid schedule impact JSON.");
  }

  const parsed = safeJsonParse(candidate.slice(start, end + 1));
  if (!parsed) throw new Error("CLARA returned malformed schedule impact JSON.");
  return parsed;
}

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => window.clearTimeout(timeoutId) };
}

function normalizeStage(value, fallback = "confirm_intent") {
  const stage = cleanText(value).toLowerCase();
  const allowed = new Set([
    "confirm_intent",
    "clarify_intent",
    "ask_permission",
    "transport",
    "food",
    "fees",
    "shared",
    "buffer",
    "complete",
  ]);
  return allowed.has(stage) ? stage : fallback;
}

function buildPrompt({ form = {}, messages = [], stage = "confirm_intent", total = 0, breakdown = {}, latestUserReply = "" } = {}) {
  const conversation = (Array.isArray(messages) ? messages : [])
    .slice(-12)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      text: cleanText(message?.text || message?.content).slice(0, 1200),
    }))
    .filter((message) => message.text);

  return `You are CLARA, a warm personal money coach and schedule impact coach for a Philippine user named Max.

You are inside the Schedule feature. The user typed a rough schedule note, then tapped Calculate money impact.

Your job is to guide the user conversationally and estimate possible spending.

Return JSON only.

Event context:
${JSON.stringify(
  {
    title: cleanText(form.title),
    description: cleanText(form.note),
    category: cleanText(form.type),
    date: cleanText(form.date),
    time: cleanText(form.time),
  },
  null,
  2
)}

Current stage: ${cleanText(stage)}
Running estimate: PHP ${Number(total || 0)}
Breakdown: ${JSON.stringify(breakdown || {}, null, 2)}
Latest user reply: ${cleanText(latestUserReply) || "None yet."}
Recent conversation:
${JSON.stringify(conversation, null, 2)}

Stage rules:
- confirm_intent: Validate what the user meant. Do NOT ask for money yet.
- ask_permission: Ask if the user is ready to start assessing spending. Do NOT ask for money yet.
- transport: Ask for possible transportation cost.
- food: Ask for food/drinks cost.
- fees: Ask for contribution, entrance, ticket, offering, or shared payment.
- shared: Ask for gift, group share, or extra group-related cost.
- buffer: Ask for optional emergency buffer.
- complete: Summarize total and ask if it looks right.

Money interpretation rules:
- Do NOT treat counts, quantities, or number of rides/people/items as peso amounts.
- Examples that are NOT money amounts: "2 rides", "two rides", "one jeep", "3 friends", "2 tickets maybe", "tricycle and one jeep".
- If the user gives a count but no price, ask a follow-up question for the estimated peso cost.
- Only acknowledge/add a peso amount when the user clearly gives a cost, such as "₱120", "120 pesos", "php 120", "around 100", "maybe 150 fare", or "budget is 300".
- If the user says "tricycle and one jeep, so 2 rides", reply by asking: "How much do you think those two rides might cost in total?"
- Never say "adding ₱2" for "2 rides".

Conversation rules:
- Ask only one question at a time.
- Be natural, warm, and short.
- Do not sound like a static checklist.
- Use the event description/title/context.
- If the event note is "gala after church", first validate like: "Hi Max, so you want to go somewhere after church. Am I understanding that correctly?"
- If the user confirms intent, ask permission to start spending assessment.
- If the user is ready, start with transportation.
- Do not claim anything was saved.
- Use Philippine peso context, but do not invent amounts.

Return this JSON shape:
{
  "assistant_message": "short conversational reply",
  "stage": "confirm_intent | clarify_intent | ask_permission | transport | food | fees | shared | buffer | complete"
}`;
}

export async function askGeminiForScheduleImpact({ form, messages, stage, total, breakdown, latestUserReply } = {}) {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw Object.assign(new Error("Gemini API key is not configured."), {
      code: "GEMINI_NOT_CONFIGURED",
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = buildPrompt({ form, messages, stage, total, breakdown, latestUserReply });
  const timeout = withTimeout();

  try {
    console.info("[CLARA Schedule Impact] Gemini request started:", {
      model,
      stage,
      hasNote: Boolean(cleanText(form?.note || form?.title)),
      messageCount: Array.isArray(messages) ? messages.length : 0,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.78,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
        },
      }),
      signal: timeout.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload?.error?.message || "Gemini schedule impact request failed."), {
        code: "GEMINI_FAILED",
        status: response.status,
        payload,
      });
    }

    const textPayload =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .filter(Boolean)
        .join("\n") || "";
    const parsed = extractJson(textPayload);

    return {
      assistant_message: cleanText(parsed?.assistant_message),
      stage: normalizeStage(parsed?.stage, stage),
      meta: { source: "gemini", model },
    };
  } catch (error) {
    const finalError =
      error?.name === "AbortError"
        ? Object.assign(new Error("Gemini schedule impact request timed out."), { code: "GEMINI_TIMEOUT" })
        : error;
    console.warn("[CLARA Schedule Impact] Gemini unavailable:", finalError);
    throw finalError;
  } finally {
    timeout.clear();
  }
}
