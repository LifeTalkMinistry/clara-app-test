import { requestClaraGeminiProxyJson, getClaraProxyModel } from "@/lib/clara-gemini-proxy-client";
import {
  normalizeScheduleImpactSessionMemory,
  normalizeExpensePath,
  reconcileCombinedTotalIntoExpensePath,
} from "./schedule-impact-session-memory";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 18000;
const DEPRECATED_MODELS = new Set(["gemini-1.5-flash", "gemini-2.0-flash"]);
const VALID_CATEGORIES = new Set(["transport", "food", "fees", "shared", "buffer", "medical", "dental", "coverage", "procedure", "medicine"]);
const VALID_COST_MODES = new Set(["single_sub_item", "combined_total", "category_total", "skip"]);
const VALID_STAGES = new Set([
  "confirm_intent",
  "clarify_intent",
  "spending_area_preview",
  "ask_permission",
  "category_assessment",
  "category_summary",
  "complete",
  "transport",
  "food",
  "fees",
  "shared",
  "buffer",
  "medical",
  "dental",
  "coverage",
  "procedure",
  "medicine",
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
    apiKey: 'server-proxy',
    model: getClaraProxyModel(DEFAULT_MODEL),
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

function wait(ms = 600) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRetryableGeminiStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function normalizeStage(value, fallback = "confirm_intent") {
  const stage = cleanText(value).toLowerCase();
  return VALID_STAGES.has(stage) ? stage : fallback;
}

function normalizeCategory(value) {
  const category = cleanText(value).toLowerCase();
  if (category.includes("dent")) return "dental";
  if (category.includes("medical") || category.includes("doctor") || category.includes("clinic") || category.includes("hospital")) return "medical";
  if (category.includes("coverage") || category.includes("insurance") || category.includes("hmo") || category.includes("out-of-pocket")) return "coverage";
  if (category.includes("procedure") || category.includes("consult")) return "procedure";
  if (category.includes("medicine") || category.includes("medication") || category.includes("prescription")) return "medicine";
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

function normalizeSpendingAreas(value = []) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map(cleanText)
    .filter((area) => {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
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

Return JSON only. No markdown fences. No prose outside JSON.

FULL SCHEDULE IMPACT SESSION MEMORY. This is the source of truth:
${JSON.stringify(memory, null, 2)}

Latest user reply: ${cleanText(latestUserReply) || "None yet."}

PRIMARY ROLE:
You are not a generic spending-category generator.
You are a financial reasoning engine.
Your job is to understand what kind of schedule this is, then identify realistic money-impact risks, including costs that may be covered, partially covered, delayed, hidden, or unexpected.

CORE REASONING RULES:
- Think about the actual event before listing costs.
- Do not default to Transportation + Food + Buffer for every schedule.
- For appointments, identify the appointment-specific financial risks first.
- Consider whether the cost might be covered by HMO, insurance, company benefit, family support, or already prepaid.
- Consider whether the user may still pay out-of-pocket if the limit is exceeded.
- Consider follow-up expenses after the appointment, such as medicine, after-care, lab tests, parking, companion costs, or return visit.
- Keep the list practical and not too long.
- Ask/process one question at a time once the user replies Ready.

DENTAL / MEDICAL EXAMPLES:
If the schedule is dentist, dental, tooth, teeth, oral, cleaning, extraction, root canal, braces, pasta, bunot, doctor, clinic, checkup, medical, hospital, lab, or consultation:
- The first possible areas should be procedure/consultation, HMO/insurance coverage, out-of-pocket balance if coverage is exceeded, medicine or after-care, transportation, and emergency buffer.
- Do not make Food or drinks a main area unless the schedule description suggests eating, long waiting time, companion, or meal timing.
- Do not ignore coverage just because the user did not mention insurance. Treat it as a possible question, not as a confirmed fact.

OTHER EVENT EXAMPLES:
- License renewal: government fee, photocopy/photo/requirements, transport, parking, extra processing, food only if timing suggests it.
- Birthday preparation: gift, food/cake, contribution, delivery/transport, emergency buffer.
- Church/fellowship: transport, food/drinks, shared contribution, offering/group share, extra stop, buffer.
- Work schedule: commute, meal before/after shift, emergency buffer, optional coworker/social spending.

OPENING RULES:
- If stage is confirm_intent, confirm schedule identity only.
- Opening confirmation format: “Hi Max, I’ll assess the money impact for this schedule: [schedule title]. Is that correct?”

SPENDING-AREA PREVIEW RULES:
- If stage is spending_area_preview, generate the possible spending areas/questions based on schedule title, note/description, type, date, and time.
- Do not ask for peso amounts in this stage.
- Do not start the one-question-at-a-time spending flow in this stage.
- assistant_message must show the list first, then end with: “Reply Ready when you want to start.”
- spending_areas must match the concise list shown in assistant_message.
- expense_path should also reflect the event-specific flow, not only the generic default. Use existing sub_item keys when possible, but you may add event-specific keys like dental_procedure, dental_coverage_gap, dental_medicine, medical_consultation, medical_coverage_gap, medical_medicine.

MONEY RULES:
- Running estimate must come from expense_path, not raw parsing.
- Do not treat counts like rides, people, or tickets as peso amounts unless the user clearly gives money.
- cost_mode must be one of: single_sub_item, combined_total, category_total, skip.
- If the user gives a combined total, reconcile it into the related sub-items instead of double-counting.
- When final estimate is confirmed, give a short saved confirmation only.

Return this JSON shape:
{
  "assistant_message": "short conversational reply",
  "schedule_updates": { "title": "", "description": "", "confirmed": true },
  "confirmed_facts_updates": { "eventType": "", "eventMeaningLocked": true, "transportationExists": true },
  "stage": "confirm_intent | clarify_intent | spending_area_preview | ask_permission | category_assessment | category_summary | complete",
  "spending_areas": ["Procedure or consultation", "HMO/insurance coverage", "Out-of-pocket balance", "Medicine or after-care", "Transportation", "Emergency buffer"],
  "active_category": "dental | medical | coverage | procedure | medicine | transport | food | fees | shared | buffer |",
  "active_sub_item": "dental_procedure | dental_coverage_gap | dental_medicine | medical_consultation | medical_coverage_gap | medical_medicine | transport_going_there | transport_going_home | transport_extra_stop | food_personal | food_treat_someone | food_group_share | fees_church_group | fees_venue | buffer_emergency |",
  "expense_path": [],
  "should_add_cost": false,
  "confirmed_cost": 0,
  "cost_category": "dental | medical | coverage | procedure | medicine | transport | food | fees | shared | buffer |",
  "cost_sub_item": "",
  "cost_mode": "single_sub_item | combined_total | category_total | skip",
  "affected_sub_items": [],
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

  const normalizedMemory = normalizeScheduleImpactSessionMemory(sessionMemory || {}, {
    form,
    messages,
    stage,
    activeCategory,
    activeSubItem,
    expensePath,
  });
  const prompt = buildPrompt({ form, messages, stage, activeCategory, activeSubItem, expensePath, total, latestUserReply, sessionMemory: normalizedMemory });

  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const timeout = withTimeout();

    try {
      console.info("[CLARA Schedule Impact] Gemini request started:", {
        model,
        attempt: attempt + 1,
        stage: normalizedMemory.currentFlow.stage,
        activeCategory: normalizedMemory.currentFlow.activeCategory,
        activeSubItem: normalizedMemory.currentFlow.activeSubItem,
        hasNote: Boolean(cleanText(normalizedMemory.schedule.description || normalizedMemory.schedule.title)),
        messageCount: Array.isArray(normalizedMemory.conversationHistory) ? normalizedMemory.conversationHistory.length : 0,
        runningEstimate: normalizedMemory.runningEstimate,
      });

      const textPayload = await requestClaraGeminiProxyJson({
        prompt,
        model,
        signal: timeout.signal,
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1800,
          responseMimeType: "application/json",
        },
      });
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
        spending_areas: normalizeSpendingAreas(parsed?.spending_areas),
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
        meta: { source: "gemini", model, attempt: attempt + 1 },
      };
    } catch (error) {
      lastError =
        error?.name === "AbortError"
          ? Object.assign(new Error("Gemini schedule impact request timed out."), { code: "GEMINI_TIMEOUT" })
          : error;
      if (attempt < 2 && (lastError?.code === "GEMINI_TIMEOUT" || isRetryableGeminiStatus(lastError?.status))) {
        await wait(650 * (attempt + 1));
        continue;
      }
      console.warn("[CLARA Schedule Impact] Gemini unavailable:", lastError);
      throw lastError;
    } finally {
      timeout.clear();
    }
  }

  console.warn("[CLARA Schedule Impact] Gemini unavailable:", lastError);
  throw lastError;
}
