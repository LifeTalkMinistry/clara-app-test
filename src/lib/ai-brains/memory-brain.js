import { buildClaraFinanceSnapshot } from "../clara-local-brain";

const DEFAULT_MEMORY_REPLY = "Pattern: a money pattern is showing up. Category: lesson. Guardrail: pause before the next similar spend and check if it is planned.";

const MEMORY_TEMPLATES = Object.freeze({
  money_rhythm: "Pattern: payday confidence can lower your spending guard. Category: money rhythm. Guardrail: wait 24 hours before non-essential purchases after payday.",
  spending_trigger: "Pattern: tiredness or repeated situations can trigger extra spending. Category: spending trigger. Guardrail: prepare a low-effort option before the trigger hits.",
  preference: "Pattern: direct guidance works better for you. Category: preference. Guardrail: keep future money advice short and action-focused.",
  goal_or_priority: "Pattern: protecting your budget matters more than convenience spending. Category: goal. Guardrail: compare convenience purchases against your budget goal first.",
  emotional_pattern: "Pattern: emotions may affect spending decisions. Category: emotional pattern. Guardrail: pause first and choose a cheaper reset before unplanned spending.",
  lesson_or_insight: "Pattern: this insight can become a money rule. Category: lesson. Guardrail: turn it into one simple check before the next similar spend.",
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

function hasCompleteMemoryStructure(text = "") {
  return /\bPattern:/i.test(text) && /\bCategory:/i.test(text) && /\bGuardrail:/i.test(text);
}

function trimSentences(text = "", maxSentences = 3) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
}

function limitWords(text = "", maxWords = 45) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanText(text);
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "")}.`;
}

export function buildMemoryBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const memoryType = detectMemoryType(userMessage);
  const requiredTemplate = getTemplateForMessage(userMessage);

  return `You are CLARA's Memory Brain.

STRICT PURPOSE:
Identify a memory pattern only. Do not coach. Do not ask questions.

LATEST USER MESSAGE:
${cleanText(userMessage)}

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

MEMORY SNAPSHOT:
Detected memory type: ${memoryType}
Required response template: ${requiredTemplate}
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
- Use the required response template unless the user gave a more specific pattern.
- Always include Pattern, Category, and Guardrail.
- Maximum 45 words.
- No follow-up questions.
- No coaching speech.
- Do not say memory was saved.

FORMAT:
Pattern: ... Category: ... Guardrail: ...

Reply as CLARA:`;
}

export function generateLocalMemoryReply({ userMessage = "", context = {} } = {}) {
  const memoryType = detectMemoryType(userMessage);
  const finance = buildClaraFinanceSnapshot(context || {});
  const hasBudgetPressure = finance.budgetPlan?.hasDeclaredBudget && Number(finance.budgetPlan?.remainingSpendableBudget) <= 0;

  if (hasBudgetPressure && memoryType === "general_memory") {
    return "Pattern: your budget looks pressured. Category: budget risk. Guardrail: protect essentials and avoid unplanned spending today.";
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
  if (!hasCompleteMemoryStructure(withoutQuestions)) return getTemplateForMessage(fallbackSource);

  return limitWords(trimSentences(withoutQuestions, 3), 45);
}
