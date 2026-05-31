import {
  normalizeScheduleImpactSessionMemory,
  normalizeExpensePath,
  reconcileCombinedTotalIntoExpensePath,
} from "./schedule-impact-session-memory";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 18000;
const DEPRECATED_MODELS = new Set(["gemini-1.5-flash", "gemini-2.0-flash"]);
const VALID_CATEGORIES = new Set(["transport", "food", "fees", "shared", "buffer"]);
const VALID_COST_MODES = new Set(["single_sub_item", "combined_total", "category_total", "skip"]);
const VALID_STAGES = new Set([
  "confirm_intent",
  "clarify_intent",
  "ask_permission",
  "category_assessment",
  "category_summary",
  "complete",
  "transport",
  "food",
  "fees",
  "shared",
  "buffer",
]);

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
  if (start === -1 || end === -1 || end <= start) throw new Error("CLARA did not return valid schedule impact JSON.");
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
  return VALID_STAGES.has(stage) ? stage : fallback;
}

function normalizeCategory(value) {
  const category = cleanText(value).toLowerCase();
  if (category.includes("transport")) return "transport";
  if (category.includes("food") || category.includes("drink")) return "food";
  if (category.includes("fee") || category.includes("contribution") || category.includes("ticket") || category.includes("offering")) return "fees";
  if (category.includes("share") || category.includes("gift") || category.includes("group") || category.includes("extra") || category.includes("treat")) return "shared";
  if (category.includes("buffer") || category.includes("emergency")) return "buffer";
  return VALID_CATEGORIES.has(category) ? category : "";
}

function normalizeConfirmedCost(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

function normalizeCostMode(value) {
  const mode = cleanText(value).toLowerCase();
  return VALID_COST_MODES.has(mode) ? mode : "skip";
}

function normalizeScheduleUpdates(parsed = {}) {
  const source = parsed?.schedule_updates || {};
  return {
    title: cleanText(source.title || parsed?.suggested_title),
    description: cleanText(source.description || parsed?.suggested_description),
    confirmed: typeof source.confirmed === "boolean" ? source.confirmed : undefined,
  };
}

function normalizeConfirmedFactsUpdates(value = {}) {
  const source = value || {};
  return {
    eventType: cleanText(source.eventType),
    eventMeaningLocked: typeof source.eventMeaningLocked === "boolean" ? source.eventMeaningLocked : undefined,
    transportationExists: typeof source.transportationExists === "boolean" ? source.transportationExists : undefined,
  };
}

function normalizeAffectedSubItems(value = []) {
  return (Array.isArray(value) ? value : [])
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 12);
}

function buildPrompt({
  form = {},
  messages = [],
  stage = "confirm_intent",
  activeCategory = "",
  activeSubItem = "",
  expensePath = [],
  latestUserReply = "",
  sessionMemory = null,
} = {}) {
  const memory = normalizeScheduleImpactSessionMemory(sessionMemory || {}, {
    form,
    messages,
    stage,
    activeCategory,
    activeSubItem,
    expensePath,
  });

  return `You are CLARA, a warm personal money coach and schedule impact coach for a Philippine user named Max.

Return JSON only.

FULL SCHEDULE IMPACT SESSION MEMORY. This is the source of truth:
${JSON.stringify(memory, null, 2)}

Latest user reply: ${cleanText(latestUserReply) || "None yet."}

Priority rules:
- Use confirmedFacts as higher priority than the latest user message.
- If confirmedFacts.eventMeaningLocked is true, do not reinterpret the event unless the user clearly corrects the schedule meaning.
- Running estimate must come from sessionMemory.expensePath, not raw parsing.
- Conversation history contains previous assistant/user messages. Use it before deciding what a number means.
- Expense path contains confirmed sub-item states and amounts.

Tone and opening rules:
- Use a warm, clear, coach-like, and structured tone.
- Do not sound overly casual, playful, or robotic.
- Do not use “Just checking in”.
- Do not wrap the schedule title in awkward quotation marks.
- Do not over-explain the event in the first message.
- When stage is confirm_intent and schedule identity is not confirmed yet, assistant_message must confirm the schedule identity only.
- Opening confirmation must follow this format: “Hi Max, I’ll assess the money impact for this schedule: [schedule title]. Is that correct?”
- Use the best available schedule title from session memory or schedule_updates.title.
- After the user confirms the schedule identity, assistant_message must say exactly: “Great. Before saving, let’s estimate possible expenses one part at a time. Ready to start?”
- After that, continue the existing category/sub-item assessment flow.

Schedule meaning rules:
- Maintain schedule_updates.title, schedule_updates.description, and schedule_updates.confirmed.
- Once user confirms schedule identity, set confirmed_facts_updates.eventMeaningLocked true.
- If user corrects event meaning, pause spending flow, update title/description, ask final confirmation, then resume spending only after confirmation.

Money rules:
- Ask/process one sub-item at a time.
- Do not treat counts like "one jeep", "2 rides", or "3 friends" as peso amounts.
- Only confirm costs when the user clearly gives pesos.
- cost_mode must be one of: single_sub_item, combined_total, category_total, skip.
- If reply says "same" for a return trip, use the previous related sub-item amount only if known.

Category transition rule:
- Before moving from one spending category to another, ask the user for confirmation first.
- After finishing a category like Transportation, Food, Fees, Shared, or Buffer, do not immediately continue to the next category.
- Instead, summarize the completed category and ask: "Anything else for [category], or are we ready to move to [next category]?"
- Example: "Got it, Max. Transportation total is ₱60. Anything else for transportation, or are we ready to move to food and drinks?"
- Only proceed to the next category when the user says ready, next, none, nothing else, move on, go ahead, or yes.
- If the user adds another expense, keep it inside the current category first.

Critical round-trip / combined-total rule:
- Detect phrases like "going there and going back home", "round trip", "balikan", "total", "all in", "overall", "both ways".
- If latest reply gives a combined/round-trip/category total, do NOT add it blindly as the current sub-item cost.
- Reconcile the total against already completed sub-items.
- Example: existing transport_going_there = 30. User says "60 pesos going there and going back home".
- Correct: transport_going_there remains 30, transport_going_home becomes 30, transport total becomes 60.
- Wrong: transport_going_there 30 + transport_going_home 60 = 90.

Return this exact JSON shape:
{
  "assistant_message": "short conversational reply",
  "schedule_updates": { "title": "", "description": "", "confirmed": true },
  "confirmed_facts_updates": { "eventType": "", "eventMeaningLocked": true, "transportationExists": true },
  "stage": "confirm_intent | clarify_intent | ask_permission | category_assessment | category_summary | complete",
  "active_category": "transport | food | fees | shared | buffer |",
  "active_sub_item": "transport_going_there | transport_going_home | transport_extra_stop | transport_fees | food_personal | food_treat_someone | food_group_share | fees_church_group | fees_venue | buffer_emergency |",
  "expense_path": [],
  "should_add_cost": false,
  "confirmed_cost": 0,
  "cost_category": "transport | food | fees | shared | buffer |",
  "cost_sub_item": "",
  "cost_mode": "single_sub_item | combined_total | category_total | skip",
  "affected_sub_items": ["transport_going_there", "transport_going_home"],
  "should_skip_sub_item": false,
  "skipped_sub_item": ""
}`;
}

export async function askGeminiForScheduleImpact({
  form,
  messages,
  stage,
  activeCategory,
  activeSubItem,
  expensePath,
  total,
  latestUserReply,
  sessionMemory,
} = {}) {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw Object.assign(new Error("Gemini API key is not configured."), {
      code: "GEMINI_NOT_CONFIGURED",
    });
  }

  const normalizedMemory = normalizeScheduleImpactSessionMemory(sessionMemory || {}, {
    form,
    messages,
    stage,
    activeCategory,
    activeSubItem,
    expensePath,
  });
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = buildPrompt({ form, messages, stage, activeCategory, activeSubItem, expensePath, total, latestUserReply, sessionMemory: normalizedMemory });
  const timeout = withTimeout();

  try {
    console.info("[CLARA Schedule Impact] Gemini request started:", {
      model,
      stage: normalizedMemory.currentFlow.stage,
      activeCategory: normalizedMemory.currentFlow.activeCategory,
      activeSubItem: normalizedMemory.currentFlow.activeSubItem,
      hasNote: Boolean(cleanText(normalizedMemory.schedule.description || normalizedMemory.schedule.title)),
      messageCount: Array.isArray(normalizedMemory.conversationHistory) ? normalizedMemory.conversationHistory.length : 0,
      runningEstimate: normalizedMemory.runningEstimate,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.45,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1500,
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
    const costCategory = normalizeCategory(parsed?.cost_category || parsed?.active_category);
    const activeCategoryOut = normalizeCategory(parsed?.active_category);
    const costMode = normalizeCostMode(parsed?.cost_mode || (shouldAddCost ? "single_sub_item" : "skip"));
    const affectedSubItems = normalizeAffectedSubItems(parsed?.affected_sub_items);
    const costSubItem = cleanText(parsed?.cost_sub_item);
    const isTotalMode = costMode === "combined_total" || costMode === "category_total";
    const sourcePath = normalizeExpensePath(parsed?.expense_path).length ? normalizeExpensePath(parsed?.expense_path) : normalizedMemory.expensePath;
    const expensePathOut = shouldAddCost && confirmedCost > 0 && isTotalMode
      ? reconcileCombinedTotalIntoExpensePath({
          path: sourcePath,
          total: confirmedCost,
          affectedSubItems,
          activeSubItem: normalizedMemory.currentFlow.activeSubItem,
          costSubItem,
          costCategory,
        })
      : sourcePath;
    const scheduleUpdates = normalizeScheduleUpdates(parsed);
    const confirmedFactsUpdates = normalizeConfirmedFactsUpdates(parsed?.confirmed_facts_updates);
    const shouldLetFrontendAddCost = shouldAddCost && confirmedCost > 0 && costMode === "single_sub_item" && Boolean(costSubItem);

    return {
      assistant_message: cleanText(parsed?.assistant_message),
      stage: normalizeStage(parsed?.stage, normalizedMemory.currentFlow.stage),
      suggested_title: scheduleUpdates.title,
      suggested_description: scheduleUpdates.description,
      schedule_updates: scheduleUpdates,
      confirmed_facts_updates: confirmedFactsUpdates,
      active_category: activeCategoryOut,
      active_sub_item: cleanText(parsed?.active_sub_item),
      expense_path: expensePathOut,
      should_add_cost: shouldLetFrontendAddCost,
      confirmed_cost: shouldLetFrontendAddCost ? confirmedCost : 0,
      cost_category: shouldLetFrontendAddCost ? costCategory : "",
      cost_sub_item: shouldLetFrontendAddCost ? costSubItem : "",
      cost_mode: shouldAddCost ? costMode : "skip",
      affected_sub_items: shouldAddCost ? affectedSubItems : [],
      should_skip_sub_item: Boolean(parsed?.should_skip_sub_item) && Boolean(cleanText(parsed?.skipped_sub_item)),
      skipped_sub_item: Boolean(parsed?.should_skip_sub_item) ? cleanText(parsed?.skipped_sub_item) : "",
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
