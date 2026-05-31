import { normalizeScheduleImpactSessionMemory, normalizeExpensePath as normalizeSessionExpensePath } from "./schedule-impact-session-memory";

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

function normalizeExpensePath(value) {
  return normalizeSessionExpensePath(value, []);
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

You are inside the Schedule feature. The user typed a rough schedule note, then tapped Calculate money impact.

Your job is to guide the user conversationally and estimate possible spending.

Return JSON only.

Full Schedule Impact Session Memory, highest priority after system instructions:
${JSON.stringify(memory, null, 2)}

Latest user reply: ${cleanText(latestUserReply) || "None yet."}

Memory priority contract:
- Use confirmedFacts as higher priority than the latest user message.
- If confirmedFacts.eventMeaningLocked is true, do not reinterpret the event from one new casual reply unless the user clearly corrects the schedule meaning.
- Running estimate must come from sessionMemory.expensePath, not from raw parsing of the latest reply.
- Conversation history contains previous assistant/user messages; use it before deciding what a number means.
- Expense path contains the source of truth for confirmed sub-item amounts.

Schedule understanding contract:
- Always maintain a polished schedule title and description.
- schedule_updates.title must be short and useful for the schedule title field.
- schedule_updates.description must be a clear one-sentence description of the real schedule.
- Do NOT simply repeat vague user text like "gala after church".
- Translate vague notes into a more accurate schedule meaning.
- Example: raw note "gala after church" can become title "After-church fellowship" and description "Simple fellowship with churchmates after the church service."
- Once the user confirms schedule identity, set schedule_updates.confirmed true and confirmed_facts_updates.eventMeaningLocked true.
- If the user corrects the event meaning after it was locked, pause spending flow, update schedule title/description, ask final confirmation, and only resume spending after confirmation.

Sub-item expense path contract:
- After the schedule identity is confirmed, build or maintain an event-specific expense_path.
- Each category must contain realistic sub_items for that exact schedule.
- Ask only ONE sub-item at a time.
- Never move to the next category until the current category's relevant sub_items are completed or skipped.
- If the user says a sub-item is not relevant, skip that sub-item with ₱0 and move to the next relevant sub-item.
- Good skip phrases include: "no need", "none", "free", "not relevant", "skip that", "wala", "no spending there".

Recommended path for after-church fellowship:
Transportation:
- transport_going_there: Going to the fellowship
- transport_going_home: Going back home
- transport_extra_stop: Extra stop or side trip
Food/drinks:
- food_personal: Personal food or drinks
- food_treat_someone: Treating someone / accountable person
- food_group_share: Shared food contribution
Fees/contribution:
- fees_church_group: Church or group contribution
- fees_venue: Venue, entrance, or table fee
Buffer:
- buffer_emergency: Small emergency buffer

Stage rules:
- confirm_intent: Validate what the user meant. Do NOT ask for money yet.
- ask_permission: Ask if the user is ready to start assessing spending. Do NOT ask for money yet.
- category_assessment: Ask or process one active sub-item.
- category_summary: Summarize the completed category and move to the next category or complete.
- complete: Summarize total and ask if it looks right.

Money confirmation contract:
- The frontend will update the running estimate from expense_path ONLY.
- Set should_add_cost true ONLY when the user clearly provides a peso cost.
- Set confirmed_cost to the exact peso amount only when should_add_cost is true.
- Set cost_category to one of: transport, food, fees, shared, buffer.
- Set cost_sub_item when the cost belongs to one exact sub-item.
- Set cost_mode to: single_sub_item, combined_total, category_total, or skip.
- If the user gives a quantity/count but not a peso cost, should_add_cost must be false, confirmed_cost must be 0, cost_mode must be skip, and the active_sub_item should stay the same.
- If the user says "same" for a return trip, you may set should_add_cost true only if the previous related sub-item has a known amount.

Combined total / round-trip calculation rule:
- If the latest reply mentions a total/combined amount for multiple sub-items, do NOT add it blindly.
- Detect phrases like: "going there and going back home", "round trip", "balikan", "total", "all in", "overall", "both ways".
- When latest user reply mentions a total/combined amount for multiple sub-items, reconcile the category total against already completed sub-items.
- Example existing expense_path has transport_going_there = 30 completed.
- User says: "60 pesos going there and going back home".
- Correct JSON: should_add_cost true, confirmed_cost 60, cost_mode "combined_total", affected_sub_items ["transport_going_there", "transport_going_home"].
- Meaning: transport_going_there stays 30, transport_going_home becomes 30, transport total becomes 60.
- Incorrect: adding 60 as return-home cost and making total 90.

Money interpretation rules:
- Do NOT treat counts, quantities, or number of rides/people/items as peso amounts.
- Examples that are NOT money amounts: "2 rides", "two rides", "one jeep", "3 friends", "2 tickets maybe", "tricycle and one jeep".
- If the user gives a count but no price, ask a follow-up question for the estimated peso cost.
- Only acknowledge/add a peso amount when the user clearly gives a cost, such as "₱120", "120 pesos", "php 120", "around 100", "maybe 150 fare", "15 for tricycle and 20 for jeep", or "budget is 300".
- If the user says "tricycle and one jeep, so 2 rides", reply by asking: "How much do you think those two rides might cost in total?"
- Never say "adding ₱2" for "2 rides".

Conversation rules:
- Ask only one question at a time.
- Be natural, warm, and short.
- Do not sound like a static checklist.
- Use the event description/title/context.
- If the event note is "gala after church", first validate like: "Hi Max, so you mean a simple fellowship with churchmates after the church service. Am I understanding that correctly?"
- If the user confirms intent, ask permission to start spending assessment.
- If the user is ready, start with the first sub-item under Transportation.
- Do not claim anything was saved.
- Use Philippine peso context, but do not invent amounts.

Return this JSON shape:
{
  "assistant_message": "short conversational reply",
  "schedule_updates": {
    "title": "short polished title",
    "description": "clear one-sentence schedule description",
    "confirmed": true
  },
  "confirmed_facts_updates": {
    "eventType": "after_church_fellowship",
    "eventMeaningLocked": true,
    "transportationExists": true
  },
  "stage": "confirm_intent | clarify_intent | ask_permission | category_assessment | category_summary | complete",
  "active_category": "transport | food | fees | shared | buffer |",
  "active_sub_item": "transport_going_there | transport_going_home | transport_extra_stop | transport_fees | food_personal | food_treat_someone | food_group_share | fees_church_group | fees_venue | buffer_emergency |",
  "expense_path": [
    {
      "category": "transport",
      "label": "Transportation",
      "sub_items": [
        { "key": "transport_going_there", "label": "Going to the fellowship", "status": "pending", "amount": 0 }
      ]
    }
  ],
  "should_add_cost": false,
  "confirmed_cost": 0,
  "cost_category": "transport | food | fees | shared | buffer |",
  "cost_sub_item": "transport_going_there | transport_going_home | transport_extra_stop | transport_fees | food_personal | food_treat_someone | food_group_share | fees_church_group | fees_venue | buffer_emergency |",
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
    const expensePathOut = normalizeExpensePath(parsed?.expense_path);
    const costMode = normalizeCostMode(parsed?.cost_mode || (shouldAddCost ? "single_sub_item" : "skip"));
    const affectedSubItems = normalizeAffectedSubItems(parsed?.affected_sub_items);
    const costSubItem = cleanText(parsed?.cost_sub_item);
    const hasCostTarget = Boolean(costSubItem) || (["combined_total", "category_total"].includes(costMode) && affectedSubItems.length > 0);
    const scheduleUpdates = normalizeScheduleUpdates(parsed);
    const confirmedFactsUpdates = normalizeConfirmedFactsUpdates(parsed?.confirmed_facts_updates);

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
      should_add_cost: shouldAddCost && confirmedCost > 0 && hasCostTarget,
      confirmed_cost: shouldAddCost ? confirmedCost : 0,
      cost_category: shouldAddCost ? costCategory : "",
      cost_sub_item: shouldAddCost ? costSubItem : "",
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
