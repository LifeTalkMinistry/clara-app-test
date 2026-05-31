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

function normalizeCostCategory(value) {
  const category = cleanText(value).toLowerCase();
  if (category.includes("transport")) return "transport";
  if (category.includes("food") || category.includes("drink")) return "food";
  if (category.includes("fee") || category.includes("contribution") || category.includes("ticket") || category.includes("offering")) return "fees";
  if (category.includes("share") || category.includes("gift") || category.includes("group") || category.includes("extra")) return "shared";
  if (category.includes("buffer") || category.includes("emergency")) return "buffer";
  return "";
}

function normalizeConfirmedCost(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
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

Schedule understanding contract:
- Always maintain a polished schedule title and description.
- suggested_title must be short and useful for the schedule title field.
- suggested_description must be a clear one-sentence description of the real schedule.
- Do NOT simply repeat vague user text like "gala after church".
- Translate vague notes into a more accurate schedule meaning.
- If the user corrects your understanding, pause the spending flow, update suggested_title and suggested_description, restate the corrected schedule, ask for confirmation, then resume the previous spending category after confirmation.
- Example: raw note "gala after church" can become title "After-church fellowship" and description "Simple fellowship with churchmates after the church service."
- If the user says it is not an outing but a simple fellowship, suggested_title should become "After-church fellowship" and suggested_description should mention simple fellowship, not gala or outing.

Stage rules:
- confirm_intent: Validate what the user meant. Do NOT ask for money yet.
- ask_permission: Ask if the user is ready to start assessing spending. Do NOT ask for money yet.
- transport: Ask for possible transportation cost.
- food: Ask for food/drinks cost.
- fees: Ask for contribution, entrance, ticket, offering, or shared payment.
- shared: Ask for gift, group share, or extra group-related cost.
- buffer: Ask for optional emergency buffer.
- complete: Summarize total and ask if it looks right.

Money confirmation contract:
- The frontend will update the running estimate ONLY when should_add_cost is true.
- Set should_add_cost true ONLY when the user clearly provides a peso cost for the current spending category.
- Set confirmed_cost to the exact peso amount only when should_add_cost is true.
- Set cost_category to one of: transport, food, fees, shared, buffer.
- If the user gives a quantity/count but not a peso cost, should_add_cost must be false, confirmed_cost must be 0, and the stage should stay on the same category.

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
- If the event note is "gala after church", first validate like: "Hi Max, so you mean a simple fellowship with churchmates after the church service. Am I understanding that correctly?"
- If the user confirms intent, ask permission to start spending assessment.
- If the user is ready, start with transportation.
- Do not claim anything was saved.
- Use Philippine peso context, but do not invent amounts.

Return this JSON shape:
{
  "assistant_message": "short conversational reply",
  "stage": "confirm_intent | clarify_intent | ask_permission | transport | food | fees | shared | buffer | complete",
  "suggested_title": "short polished title",
  "suggested_description": "clear one-sentence schedule description",
  "should_add_cost": false,
  "confirmed_cost": 0,
  "cost_category": "transport | food | fees | shared | buffer |"
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
          maxOutputTokens: 900,
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
    const shouldAddCost = Boolean(parsed?.should_add_cost);
    const confirmedCost = normalizeConfirmedCost(parsed?.confirmed_cost);
    const costCategory = normalizeCostCategory(parsed?.cost_category);

    return {
      assistant_message: cleanText(parsed?.assistant_message),
      stage: normalizeStage(parsed?.stage, stage),
      suggested_title: cleanText(parsed?.suggested_title),
      suggested_description: cleanText(parsed?.suggested_description),
      should_add_cost: shouldAddCost && Boolean(costCategory),
      confirmed_cost: shouldAddCost ? confirmedCost : 0,
      cost_category: shouldAddCost ? costCategory : "",
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
