import { buildClaraFinanceSnapshot } from "../clara-local-brain";

const DEFAULT_MEMORY_REPLY = "That is worth noticing. Pattern: this can affect your money decisions. Guardrail: pause before the next similar spend and check if it is planned.";

const COACH_STYLE_PATTERNS = [
  /it's completely understandable/i,
  /that feeling is your inner compass/i,
  /enjoy the fruits of your labor/i,
  /the good news is/i,
  /which is fantastic/i,
  /you'?re already working on/i,
  /many people experience/i,
  /would you like/i,
  /what are you thinking/i,
  /how can we make/i,
  /let'?s explore/i,
];

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
  return (Array.isArray(items) ? items : [])
    .slice(0, 5)
    .map(formatter)
    .filter(Boolean)
    .join("; ") || empty;
}

function formatRecentConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-8)
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

  // Order matters: specific memory signals should win before generic phrases like "I realized".
  if (/\b(payday|salary|income|allowance|weekly|monthly|bi-weekly|biweekly|after i get paid|after getting paid|after pay day)\b/.test(text)) return "money_rhythm";
  if (/\b(trigger|whenever|pag|kapag|every time|usually|always|pattern)\b/.test(text)) return "spending_trigger";
  if (/\b(i like|i prefer|i don't like|i hate|preference|style)\b/.test(text)) return "preference";
  if (/\b(goal|dream|target|saving for|protect|important to me|priority)\b/.test(text)) return "goal_or_priority";
  if (/\b(stress|sad|lonely|bored|guilty|pressure|pagod|tempted|regret|nagsisi)\b/.test(text)) return "emotional_pattern";
  if (/\b(i realized|i realise|i noticed|i learned|lesson|natutunan|napansin)\b/.test(text)) return "lesson_or_insight";
  return "general_memory";
}

function buildWalletRows(finance = {}) {
  return list(finance.wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`);
}

function buildGoalRows(finance = {}) {
  return list(finance.savingsGoals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`);
}

function trimSentences(text = "", maxSentences = 3) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
}

function limitWords(text = "", maxWords = 55) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanText(text);
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "")}.`;
}

function removeCoachStyleSentences(text = "") {
  const sentences = cleanText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const filtered = sentences
    .map((sentence) => cleanText(sentence))
    .filter(Boolean)
    .filter((sentence) => !sentence.includes("?"))
    .filter((sentence) => !COACH_STYLE_PATTERNS.some((pattern) => pattern.test(sentence)))
    .join(" ");

  return filtered || cleanText(text).replace(/\?+$/g, ".");
}

export function buildMemoryBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const memoryType = detectMemoryType(userMessage);

  return `You are CLARA's Memory Brain.

BRAIN TYPE:
Memory Brain

STRICT PURPOSE:
Identify a memory pattern only. Do not coach emotionally. Do not motivate. Do not ask questions.

LATEST USER MESSAGE:
${cleanText(userMessage)}

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

MEMORY SNAPSHOT:
Detected memory type: ${memoryType}
Finance data status: ${finance.hasAnyData ? "ready" : "not enough data loaded"}
Visible wallet money: ${money(finance.availableMoney)}
Remaining spendable budget: ${money(plan.remainingSpendableBudget)}
Monthly spent: ${money(finance.monthlySpent)}
Unplanned spent: ${money(finance.unplannedSpent)}
Wallets: ${buildWalletRows(finance)}
Savings goals: ${buildGoalRows(finance)}

CURRENT PROFILE HINTS:
Income rhythm: ${getProfileValue(context, ["incomeRhythm", "income_rhythm"])}
Guidance tone: ${getProfileValue(context, ["coachingStyle", "coaching_style", "guidanceTone", "guidance_tone"])}
Known spending trigger: ${getProfileValue(context, ["spendingTrigger", "spending_trigger", "trigger"])}
Protected goal: ${getProfileValue(context, ["meaningfulGoal", "meaningful_goal", "protectedGoal", "protected_goal"])}

CRITICAL RESPONSE RULES:
- Maximum 3 sentences.
- Maximum 55 words.
- Never ask a follow-up question.
- Never say: "It's completely understandable", "fantastic", "the good news", "would you like", or "what are you thinking of purchasing".
- Do not provide emotional coaching.
- Do not praise.
- Do not explain deeply.
- Do not pretend permanent memory was saved.

ONLY OUTPUT THIS STRUCTURE:
Pattern: one clear pattern.
Category: trigger, preference, goal, rhythm, lesson, or emotional pattern.
Guardrail: one practical rule for next time.

Reply as CLARA:`;
}

export function generateLocalMemoryReply({ userMessage = "", context = {} } = {}) {
  const memoryType = detectMemoryType(userMessage);
  const finance = buildClaraFinanceSnapshot(context || {});
  const hasBudgetPressure = finance.budgetPlan?.hasDeclaredBudget && Number(finance.budgetPlan?.remainingSpendableBudget) <= 0;

  if (memoryType === "money_rhythm") {
    return "Pattern: payday confidence can make spending feel safer now but create regret later. Category: money rhythm. Guardrail: wait 24 hours before non-essential purchases after payday.";
  }

  if (memoryType === "spending_trigger") {
    return "Pattern: this situation may trigger extra spending. Category: spending trigger. Guardrail: pause first and check if the purchase is planned, necessary, and inside budget.";
  }

  if (memoryType === "preference") {
    return "Pattern: your guidance preference matters. Category: preference. Guardrail: use this preference to shape clearer money advice before decisions.";
  }

  if (memoryType === "goal_or_priority") {
    return "Pattern: this goal is a priority worth protecting. Category: goal. Guardrail: compare future purchases against this goal before spending.";
  }

  if (memoryType === "emotional_pattern") {
    return "Pattern: emotions may be affecting spending decisions. Category: emotional pattern. Guardrail: pause first and choose a cheaper reset before unplanned spending.";
  }

  if (memoryType === "lesson_or_insight") {
    return "Pattern: this insight can become a money rule. Category: lesson. Guardrail: turn it into one simple check before the next similar spend.";
  }

  if (hasBudgetPressure) {
    return "Pattern: this matters more because your budget looks pressured. Category: budget risk. Guardrail: protect essentials and avoid unplanned spending today.";
  }

  return DEFAULT_MEMORY_REPLY;
}

export function sanitizeMemoryBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

  if (!cleaned) return DEFAULT_MEMORY_REPLY;

  const withoutCoachStyle = removeCoachStyleSentences(cleaned);
  return limitWords(trimSentences(withoutCoachStyle, 3), 55);
}
