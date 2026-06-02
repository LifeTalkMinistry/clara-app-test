import { buildClaraFinanceSnapshot } from "../clara-local-brain";

const DEFAULT_MEMORY_REPLY = "That’s useful to notice. I’ll treat it as a money pattern, so next time, pause before a similar spend and check if it was planned.";

const MEMORY_TEMPLATES = Object.freeze({
  money_rhythm: "That’s a useful payday pattern to notice. It looks like payday confidence can lower your spending guard, so a good rule is to wait 24 hours before non-essential purchases after payday.",
  spending_trigger: "That’s a useful trigger to notice. Tiredness or repeated situations may push you toward extra spending, so prepare a low-effort option before that trigger hits.",
  preference: "Got it — direct guidance works better for you. I’ll keep money advice short, clear, and action-focused when you’re making decisions.",
  goal_or_priority: "That goal is worth protecting. When convenience spending shows up, compare it against your budget goal first before you decide.",
  emotional_pattern: "That emotional pattern matters. When that feeling shows up, pause first and choose a cheaper reset before making an unplanned spend.",
  lesson_or_insight: "That’s a useful lesson. Turn it into one simple money rule you can check before the next similar spend.",
  general_memory: DEFAULT_MEMORY_REPLY,
});

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value = "") {
  return cleanText(value).toLowerCase();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : []).slice(0, 5).map(formatter).filter(Boolean).join("; ") || empty;
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

function getProfileValue(context = {}, keys = []) {
  const sources = [context?.lifeProfile, context?.profile?.lifeProfile, context?.profile, context?.meProfile, context?.userProfile, context];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== "") return String(value).trim();
    }
  }
  return "not set";
}

function detectMemoryType(message = "") {
  const text = normalizeText(message);
  if (/\b(payday|salary|income|allowance|weekly|monthly|bi-weekly|biweekly|after i get paid|after getting paid|after pay day)\b/.test(text)) return "money_rhythm";
  if (/\b(tired|exhausted|after work|trigger|whenever|kapag|every time|usually|always|pattern)\b/.test(text)) return "spending_trigger";
  if (/\b(i prefer|preference|style|direct advice|short advice)\b/.test(text)) return "preference";
  if (/\b(goal|dream|target|saving for|protect|important to me|priority|protect my budget|convenience food)\b/.test(text)) return "goal_or_priority";
  if (/\b(stress|sad|lonely|bored|guilty|pressure|pagod|tempted|regret)\b/.test(text)) return "emotional_pattern";
  if (/\b(i realized|i realise|i noticed|i learned|lesson|natutunan|napansin)\b/.test(text)) return "lesson_or_insight";
  return "general_memory";
}

export function getTemplateForMessage(message = "") {
  return MEMORY_TEMPLATES[detectMemoryType(message)] || DEFAULT_MEMORY_REPLY;
}

function buildWalletRows(finance = {}) {
  return list(finance.wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`);
}

function buildGoalRows(finance = {}) {
  return list(finance.savingsGoals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`);
}

function stripQuestions(text = "") {
  const sentences = cleanText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return sentences.map(cleanText).filter(Boolean).filter((sentence) => !sentence.includes("?")).join(" ") || cleanText(text).replace(/\?+$/g, ".");
}

function hasLabelFormat(text = "") {
  return /\bPattern:/i.test(text) || /\bCategory:/i.test(text) || /\bGuardrail:/i.test(text);
}

function isLikelyIncomplete(text = "") {
  const cleaned = cleanText(text);
  if (!cleaned) return true;
  if (/[,:;\-–—]$/.test(cleaned)) return true;
  if (!/[.!)]$/.test(cleaned)) return true;
  const finalWord = (cleaned.toLowerCase().match(/[a-z]+(?:'[a-z]+)?$/) || [""])[0];
  return ["over", "because", "and", "but", "so", "to", "for", "with", "after", "before", "when", "while"].includes(finalWord);
}

function trimSentences(text = "", maxSentences = 2) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
}

function limitWords(text = "", maxWords = 50) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanText(text);
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "")}.`;
}

export function buildMemoryBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const memoryType = detectMemoryType(userMessage);
  const suggestedReply = getTemplateForMessage(userMessage);

  return `You are CLARA's Memory Brain.

STRICT PURPOSE:
Notice user money patterns and respond naturally. Do not use labels. Do not ask questions.

LATEST USER MESSAGE:
${cleanText(userMessage)}

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

MEMORY SNAPSHOT:
Detected memory type: ${memoryType}
Suggested natural reply: ${suggestedReply}
Visible wallet money: ${money(finance.availableMoney)}
Remaining spendable budget: ${money(plan.remainingSpendableBudget)}
Monthly spent: ${money(finance.monthlySpent)}
Unplanned spent: ${money(finance.unplannedSpent)}
Wallets: ${buildWalletRows(finance)}
Savings goals: ${buildGoalRows(finance)}

PROFILE HINTS:
Income rhythm: ${getProfileValue(context, ["incomeRhythm", "income_rhythm"])}
Guidance tone: ${getProfileValue(context, ["coachingStyle", "coaching_style", "guidanceTone", "guidance_tone"])}
Known spending trigger: ${getProfileValue(context, ["spendingTrigger", "spending_trigger", "trigger"])}
Protected goal: ${getProfileValue(context, ["meaningfulGoal", "meaningful_goal", "protectedGoal", "protected_goal"])}

RULES:
- Reply like a normal CLARA conversation.
- Do not output Pattern, Category, or Guardrail labels.
- Maximum 2 short sentences.
- Maximum 50 words.
- No follow-up questions.
- No long coaching speech.
- Do not say memory was permanently saved.
- Mention the pattern and one useful next-time rule.

Reply as CLARA:`;
}

export function generateLocalMemoryReply({ userMessage = "", context = {} } = {}) {
  const memoryType = detectMemoryType(userMessage);
  const finance = buildClaraFinanceSnapshot(context || {});
  const hasBudgetPressure = finance.budgetPlan?.hasDeclaredBudget && Number(finance.budgetPlan?.remainingSpendableBudget) <= 0;

  if (hasBudgetPressure && memoryType === "general_memory") {
    return "That matters more because your budget looks pressured. For today, protect essentials first and avoid unplanned spending.";
  }

  return getTemplateForMessage(userMessage);
}

export function sanitizeMemoryBrainReply(reply = "", userMessage = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

  if (!cleaned) return getTemplateForMessage(userMessage);

  const withoutQuestions = stripQuestions(cleaned);
  const fallbackSource = userMessage || withoutQuestions || cleaned;

  if (hasLabelFormat(withoutQuestions)) return getTemplateForMessage(fallbackSource);
  if (isLikelyIncomplete(withoutQuestions)) return getTemplateForMessage(fallbackSource);

  return limitWords(trimSentences(withoutQuestions, 2), 50);
}
