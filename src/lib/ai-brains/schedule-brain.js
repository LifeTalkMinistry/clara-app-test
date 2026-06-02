import { buildScheduleDirectReply, getScheduleContextForAI } from "../clara-schedule-ai-context";

const DEFAULT_SCHEDULE_REPLY = "I don’t see upcoming schedule items loaded from your Schedule page right now. Add an appointment or event there, then I can help you prepare for it.";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatRecentConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-6)
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = cleanText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n") || "No recent chatbox conversation yet.";
}

function formatScheduleRows(schedule) {
  const items = Array.isArray(schedule?.upcomingItems) ? schedule.upcomingItems : [];
  if (!items.length) return "No upcoming schedule items are loaded from the Schedule page.";

  return items
    .slice(0, 8)
    .map((event, index) => {
      const time = event.time ? ` • ${event.time}` : "";
      const impact = event.amountText ? ` • estimated impact ${event.amountText}` : "";
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

export function buildScheduleBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const schedule = getScheduleContextForAI(context || {});

  return `You are CLARA's Schedule Brain.

BRAIN TYPE:
Schedule Brain

PURPOSE:
Answer pure schedule, appointment, calendar, reminder, event, shift, class, doctor, dentist, and upcoming commitment questions.

LATEST USER MESSAGE:
${cleanText(userMessage)}

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

SCHEDULE CONTEXT:
${formatScheduleRows(schedule)}

RULES:
- If schedule items exist, mention the nearest one first.
- If there is a dentist appointment, mention it directly.
- Include date and time if available.
- If there are multiple items, briefly say how many more are coming up.
- End with one helpful CTA or follow-up question, such as preparing budget, reminder, transportation, or what to do next.
- If no schedule items are loaded, say that clearly and ask the user to add one in the Schedule page.
- Do not talk like a finance decision unless the user asks about spending.
- Keep the reply conversational and useful.
- Maximum 3-4 short sentences.

Reply as CLARA:`;
}

export function generateLocalScheduleReply({ userMessage = "", context = {} } = {}) {
  const directReply = buildScheduleDirectReply(userMessage, context || {});
  if (!directReply) return DEFAULT_SCHEDULE_REPLY;

  const schedule = getScheduleContextForAI(context || {});
  if (!schedule.hasUpcomingItems) return DEFAULT_SCHEDULE_REPLY;

  const cta = schedule.hasMoneyImpact
    ? "Do you want me to help you prepare a small budget for it?"
    : "Do you want me to help you prepare or set a reminder for it?";

  return `${directReply} ${cta}`;
}

export function sanitizeScheduleBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

  if (!cleaned) return DEFAULT_SCHEDULE_REPLY;
  return limitWords(trimSentences(cleaned, 4), 95);
}
