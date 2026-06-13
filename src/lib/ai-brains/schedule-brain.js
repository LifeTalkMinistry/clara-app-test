import { buildScheduleDirectReply, getScheduleContextForAI } from "../clara-schedule-ai-context";
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

function formatScheduleRows(schedule) {
  const items = Array.isArray(schedule?.upcomingItems) ? schedule.upcomingItems : [];
  if (!items.length) return "No upcoming items are saved in the internal CLARA Schedule page yet.";

  return items
    .slice(0, 8)
    .map((event, index) => {
      const time = event.time ? ` • ${event.time}` : "";
      const impact = event.amountText
        ? ` • estimated impact ${event.amountText}`
        : event.hasMoneyImpact
          ? " • possible money impact, exact amount not saved"
          : "";
      const note = event.note ? ` • note: ${event.note}` : "";
      return `${index + 1}. ${event.title} — ${event.dateLabel}${time} — ${event.type}${impact}${note}`;
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

  return `You are CLARA's Schedule Brain.

BRAIN TYPE:
Schedule Brain

PURPOSE:
Answer pure schedule, appointment, calendar, reminder, event, shift, class, doctor, dentist, and upcoming commitment questions.

${subContextBlock}

FULL VISIBLE CHATBOX CONVERSATION HISTORY:
${formatFullConversation(recentConversation)}

LATEST USER MESSAGE:
${cleanText(userMessage)}

SCHEDULE CONTEXT:
${formatScheduleRows(schedule)}

RULES:
- Start directly with the schedule answer because the conversation may already be active.
- Treat “calendar” as the internal CLARA Schedule page, not Google Calendar or the phone calendar.
- Never say “I don’t have access to your calendar.”
- Use the full visible chatbox conversation history to understand follow-ups like "ok", "sure", "what?", "how about tomorrow", and short schedule references.
- Do not restart the conversation.
- If schedule items exist, start with: “I checked your CLARA Schedule page.”
- If the user asks for all events, list, summary, overview, everything, or this month, do not only mention the nearest event. Summarize the matching CLARA Schedule items.
- For “this month,” only include CLARA Schedule items whose date is in the current month.
- If there are more than 8 matching items, show the first 8 and mention how many more exist.
- If amount is ₱0, still show ₱0.
- If the user asks for the next item only, mention the nearest one first.
- If there is a dentist appointment, mention it directly.
- Include date and time if available.
- If there are multiple items and the user only asked for the next item, briefly say how many more are coming up.
- End with one helpful CTA or follow-up question, such as preparing budget, reminder, transportation, or what to do next.
- If no schedule items are loaded, say: “I don’t see upcoming items saved in your CLARA Schedule page yet. Add one in Schedule, then I can check it here.”
- Do not talk like a finance decision unless the user asks about spending.
- If a money-impact amount exists, include the exact amount in the same sentence.
- If a money-impact amount is missing, say that the appointment may have a cost but no exact amount is saved yet.
- Never end with incomplete money-impact or amount phrases.
- Do not use canned wording.
- Keep the reply conversational and useful.
- Maximum 3-4 short sentences.

Reply as CLARA:`;
}

export function generateLocalScheduleReply({ userMessage = "", context = {} } = {}) {
  const directReply = buildScheduleDirectReply(userMessage, context || {});
  if (!directReply) return DEFAULT_SCHEDULE_REPLY;

  return directReply;
}

export function sanitizeScheduleBrainReply(reply = "", fallbackReply = DEFAULT_SCHEDULE_REPLY) {
  const cleaned = removeOpeningChatter(reply);
  const fallback = removeOpeningChatter(fallbackReply || DEFAULT_SCHEDULE_REPLY) || DEFAULT_SCHEDULE_REPLY;

  if (!cleaned || isIncompleteScheduleReply(cleaned)) return fallback;

  const trimmed = limitWords(trimSentences(cleaned, 4), 95);
  if (isIncompleteScheduleReply(trimmed)) return fallback;

  return trimmed;
}
