import { requestClaraGeminiProxyJson, getClaraProxyModel } from "@/lib/clara-gemini-proxy-client";
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
  if (!raw) throw new Error("CLARA returned an empty schedule refinement response.");

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = String(fenced?.[1] || raw).trim();
  const fencedParsed = safeJsonParse(candidate);
  if (fencedParsed) return fencedParsed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("CLARA did not return valid schedule refinement JSON.");
  }

  const parsed = safeJsonParse(candidate.slice(start, end + 1));
  if (!parsed) throw new Error("CLARA returned malformed schedule refinement JSON.");
  return parsed;
}

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => window.clearTimeout(timeoutId) };
}

function normalizeCategory(value) {
  const raw = cleanText(value).toLowerCase();
  if (raw.includes("work")) return "Work";
  if (raw.includes("family")) return "Family";
  if (raw.includes("health") || raw.includes("doctor") || raw.includes("medical")) return "Health";
  if (raw.includes("ministry") || raw.includes("church")) return "Ministry";
  if (raw.includes("errand")) return "Errand";
  if (raw.includes("social") || raw.includes("friend") || raw.includes("outing")) return "Social";
  if (raw.includes("personal")) return "Personal";
  return "Other";
}

function normalizeConfidence(value) {
  const raw = cleanText(value).toLowerCase();
  if (["low", "medium", "high"].includes(raw)) return raw;
  return "medium";
}

function normalizeQuestions(value) {
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          key: `question_${index + 1}`,
          question: cleanText(item),
          reason: "Needed to make the schedule clearer.",
        };
      }

      return {
        key: cleanText(item?.key) || `question_${index + 1}`,
        question: cleanText(item?.question),
        reason: cleanText(item?.reason) || "Needed to make the schedule clearer.",
      };
    })
    .filter((item) => item.question)
    .slice(0, 3);
}

function normalizeRefinementResult(parsed = {}) {
  const questions = normalizeQuestions(parsed?.next_questions);
  const refinedIntention = cleanText(parsed?.refined_intention);
  const suggestedTitle = cleanText(parsed?.suggested_title);

  return {
    refined_intention:
      refinedIntention || suggestedTitle || "I want to add a schedule, but CLARA needs a little more detail.",
    suggested_title: suggestedTitle || refinedIntention.split(" ").slice(0, 5).join(" ") || "Schedule plan",
    suggested_category: normalizeCategory(parsed?.suggested_category),
    detected_money_relevance: Boolean(parsed?.detected_money_relevance),
    missing_details: (Array.isArray(parsed?.missing_details) ? parsed.missing_details : [])
      .map(cleanText)
      .filter(Boolean)
      .slice(0, 6),
    next_questions: questions,
    confidence: normalizeConfidence(parsed?.confidence),
    ready_to_save: Boolean(parsed?.ready_to_save) && questions.length === 0,
  };
}

function buildPrompt({ form = {}, conversation = [], latestAnswer = "" } = {}) {
  const recentConversation = (Array.isArray(conversation) ? conversation : [])
    .slice(-10)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: cleanText(message?.content || message?.text).slice(0, 1200),
    }))
    .filter((message) => message.content);

  return `You are CLARA, a personal money coach and schedule assistant.

Your job is NOT to save the schedule yet.

The user wrote a rough/vague schedule note.

First, convert the rough note into a clear schedule intention.
Then identify what important details are missing.
Then decide the most practical follow-up questions needed to complete the schedule.

Return JSON only.

User note:
${cleanText(form.note || form.userNote || form.title)}

Selected date:
${cleanText(form.date || form.selectedDate)}

Current form values:
Title: ${cleanText(form.title)}
Time: ${cleanText(form.time)}
Category: ${cleanText(form.type || form.category)}
Estimated money impact: ${cleanText(form.amount || form.moneyImpact || "AI will calculate")}

Latest user answer, if any:
${cleanText(latestAnswer) || "None yet."}

Recent refinement conversation:
${JSON.stringify(recentConversation, null, 2)}

Return this JSON shape:
{
  "refined_intention": "Clear sentence version of what the user probably means.",
  "suggested_title": "Short schedule title",
  "suggested_category": "Personal | Work | Family | Health | Ministry | Errand | Social | Other",
  "detected_money_relevance": true,
  "missing_details": ["time", "location", "cost", "people involved"],
  "next_questions": [
    {
      "key": "time",
      "question": "What time will this happen?",
      "reason": "Needed to place it properly on the schedule."
    }
  ],
  "confidence": "low | medium | high",
  "ready_to_save": false
}

Rules:
- Ask only practical questions.
- Maximum 3 questions at a time.
- If money may be affected, include one money-impact question.
- If the note is too vague, ask for clarification.
- Keep CLARA's tone warm, simple, and helpful.
- Do not invent exact time, place, or cost unless clearly stated.
- If enough information is already present, set ready_to_save true.
- Do not include markdown.
- Do not include explanations outside JSON.`;
}

export async function askGeminiForScheduleRefinement({ form, conversation, latestAnswer } = {}) {
  const { apiKey, model } = getGeminiConfig();
  const prompt = buildPrompt({ form, conversation, latestAnswer });
  const timeout = withTimeout();

  try {
    console.info("[CLARA Schedule] Refinement request started:", {
      model,
      hasNote: Boolean(cleanText(form?.note || form?.title)),
      hasConversation: Array.isArray(conversation) && conversation.length > 0,
    });

    const textPayload = await requestClaraGeminiProxyJson({
      prompt,
      model,
      signal: timeout.signal,
      generationConfig: {
        temperature: 0.55,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 900,
        responseMimeType: "application/json",
      },
    });

    return normalizeRefinementResult(extractJson(textPayload));
  } catch (error) {
    const finalError =
      error?.name === "AbortError"
        ? Object.assign(new Error("Gemini schedule refinement timed out."), { code: "GEMINI_TIMEOUT" })
        : error;
    console.warn("[CLARA Schedule] Refinement unavailable:", finalError);
    throw finalError;
  } finally {
    timeout.clear();
  }
}
