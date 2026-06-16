import { SCHEDULE_BRAIN_EMERGENCY_FALLBACK, getScheduleContextForAI } from "../clara-schedule-ai-context";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";
import { CLARA_BRAINS } from "./brain-router";

const DEFAULT_SCHEDULE_REPLY = "";
const INCOMPLETE_MONEY_ENDING_PATTERN = /(?:estimated\s+(?:money\s+)?impact\s+of|estimated\s+cost\s+of|impact\s+of|cost\s+of|amount\s+of)\s*$/i;

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatFullConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = cleanText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n") || "No visible chatbox conversation history yet.";
}

function currentDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentMonthKey(date = new Date()) {
  return currentDateKey(date).slice(0, 7);
}

function formatScheduleRows(schedule) {
  const items = Array.isArray(schedule?.upcomingItems) ? schedule.upcomingItems : [];
  if (!items.length) return "No upcoming items are saved in the internal CLARA Schedule page yet.";

  return items
    .slice(0, 8)
    .map((event, index) => {
      const time = event.time ? ` • ${event.time}` : "";
      const impact = event.amountText
        ? ` • saved estimated impact ${event.amountText}`
        : event.hasMoneyImpact
          ? " • possible money impact, but no exact amount is saved"
          : "";
      const note = event.note ? ` • note: ${event.note}` : "";
      return `${index + 1}. ${event.title} — ${event.date} (${event.dateLabel}${time}) — ${event.type}${impact}${note}`;
    })
    .join("\n");
}

function trimSentences(text = "", maxSentences = 4) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
}

function limitWords(text = "", maxWords = 95) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanText(text);
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "")}.`;
}

function removeOpeningChatter(text = "") {
  const cleaned = cleanText(text)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

  if (/^[a-z ,'-]{2,32}!\s*(?=(looks like|your|you have|i found|there is))/i.test(cleaned)) {
    return cleaned.replace(/^[a-z ,'-]{2,32}!\s*/i, "").trim();
  }

  return cleaned;
}

function isIncompleteScheduleReply(text = "") {
  const cleaned = cleanText(text).replace(/[.!?]+$/, "").trim();
  if (!cleaned) return true;
  if (INCOMPLETE_MONEY_ENDING_PATTERN.test(cleaned)) return true;
  if (/\b(estimated|impact|cost|amount|of|with|for|to|because|and|but|so)\s*$/i.test(cleaned) && cleaned.length < 180) return true;
  return false;
}

export function buildScheduleBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const schedule = getScheduleContextForAI(context || {});
  const subContextBlock = buildClaraBrainSubContextPromptBlock({ brain: CLARA_BRAINS.SCHEDULE, message: userMessage, context });
  const now = new Date();

  return `You are CLARA's Schedule Brain.

BRAIN TYPE:
Schedule Brain

PURPOSE:
Answer pure schedule, appointment, calendar, reminder, event, shift, class, doctor, dentist, and upcoming commitment questions.

${subContextBlock}

CURRENT DATE:
${currentDateKey(now)}
Current month key: ${currentMonthKey(now)}

FULL VISIBLE CHATBOX CONVERSATION HISTORY:
${formatFullConversation(recentConversation)}

LATEST USER MESSAGE:
${cleanText(userMessage)}

SCHEDULE CONTEXT:
${formatScheduleRows(schedule)}

RULES:
- The schedule data is already provided in SCHEDULE CONTEXT.
- Answer based only on SCHEDULE CONTEXT and the visible conversation history.
- Treat “calendar” as the internal CLARA Schedule page, not Google Calendar or the phone calendar.
- Use the full visible chatbox conversation history to understand follow-ups like "ok", "sure", "what?", "how about tomorrow", "thanks", and short schedule references.
- If the user simply says thanks or acknowledges the answer, respond briefly and do not list the schedule again.
- Start directly with the schedule answer because the conversation may already be active.
- Use the CLARA Schedule data naturally. You may mention that you checked the Schedule page, but do not reuse one fixed opening line.
- Do not use canned wording, repeated template phrases, or robotic lines.
- If the user asks for all events, list, summary, overview, everything, or this month, summarize the matching CLARA Schedule items naturally.
- For “this month,” only include CLARA Schedule items whose date starts with the current month key.
- If only one item matches, do not over-format the answer.
- If there are multiple matching items, group them clearly.
- If there are more than 8 matching items, show the first 8 and mention how many more exist.
- If amount is ₱0, still show ₱0.
- If the user asks for the next item only, mention the nearest one first.
- Include date and time if available.
- If there are multiple items and the user only asked for the next item, briefly say how many more are coming up.
- If no schedule items are loaded, explain naturally that no upcoming items are saved in the CLARA Schedule page yet and suggest adding one.
- Do not talk like a finance decision unless the user asks about spending.
- If a money-impact amount exists, include the exact amount in the same sentence.
- If a money-impact amount is missing, say naturally that no exact amount is saved yet. Do not write “Estimated impact: not saved.”
- Never end with incomplete money-impact or amount phrases.
- Never invent amounts, dates, times, or events.
- Keep the reply conversational and useful.
- Ask at most one helpful follow-up question.
- Maximum 3-4 short sentences.

Reply as CLARA:`;
}

// Emergency-only local fallback. Normal Schedule Brain answers must come from Gemini.
export function generateLocalScheduleReply() {
  return SCHEDULE_BRAIN_EMERGENCY_FALLBACK;
}

export function sanitizeScheduleBrainReply(reply = "", fallbackReply = DEFAULT_SCHEDULE_REPLY) {
  const cleaned = removeOpeningChatter(reply);
  const fallback = removeOpeningChatter(fallbackReply || DEFAULT_SCHEDULE_REPLY) || DEFAULT_SCHEDULE_REPLY;

  if (!cleaned || isIncompleteScheduleReply(cleaned)) return fallback;

  const trimmed = limitWords(trimSentences(cleaned, 4), 95);
  if (isIncompleteScheduleReply(trimmed)) return fallback;

  return trimmed;
}
