import { buildClaraFinanceSnapshot } from "../clara-local-brain";

const DEFAULT_MEMORY_REPLY = "That is worth noticing. I’ll treat this as a useful pattern for your money decisions: name the trigger, protect your budget, and use it as a guide before your next spend.";

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
  if (/\b(trigger|whenever|pag|kapag|every time|usually|always|pattern)\b/.test(text)) return "spending_trigger";
  if (/\b(i like|i prefer|i don't like|i hate|i want|preference|style)\b/.test(text)) return "preference";
  if (/\b(goal|dream|target|saving for|protect|important to me|priority)\b/.test(text)) return "goal_or_priority";
  if (/\b(i realized|i realise|i noticed|i learned|lesson|natutunan|napansin)\b/.test(text)) return "lesson_or_insight";
  if (/\b(stress|sad|lonely|bored|guilty|pressure|pagod|tempted)\b/.test(text)) return "emotional_pattern";
  if (/\b(payday|salary|income|allowance|weekly|monthly|bi-weekly|biweekly)\b/.test(text)) return "money_rhythm";
  return "general_memory";
}

function buildWalletRows(finance = {}) {
  return list(finance.wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`);
}

function buildGoalRows(finance = {}) {
  return list(finance.savingsGoals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`);
}

function trimSentences(text = "", maxSentences = 4) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  return parts.slice(0, maxSentences).join(" ").replace(/\s+/g, " ").trim();
}

function limitWords(text = "", maxWords = 100) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanText(text);
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "")}.`;
}

export function buildMemoryBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const memoryType = detectMemoryType(userMessage);

  return `You are CLARA's Memory Brain.

BRAIN TYPE:
Memory Brain

PURPOSE:
Recognize and respond to user-shared patterns, preferences, triggers, lessons, goals, and money-life observations.

Memory Brain handles messages like:
- I noticed I spend more when I am stressed.
- I realized I buy food after work when I am tired.
- I learned that I need to plan transport earlier.
- I usually overspend after payday.
- I prefer direct advice.
- My real goal is to save for my family.

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

RULES:
- Do not pretend you permanently saved memory unless the app explicitly confirms saving.
- Say that the insight is useful or worth noticing.
- Reflect the pattern in one clear sentence.
- Connect it to one practical money behavior.
- If appropriate, mention what category this belongs to: trigger, preference, goal, rhythm, or lesson.
- Do not turn this into a long coaching speech.
- Do not give a full finance summary unless the user asks.
- If the user asks to remember/save something, say it is a good memory to keep and summarize it cleanly.

ANSWER FORMAT:
1. Acknowledge the insight.
2. Name the memory/pattern.
3. Give one next action or money guardrail.

LENGTH RULES:
- 2-4 short sentences.
- Maximum around 100 words.
- No markdown headings.

Reply as CLARA:`;
}

export function generateLocalMemoryReply({ userMessage = "", context = {} } = {}) {
  const memoryType = detectMemoryType(userMessage);
  const finance = buildClaraFinanceSnapshot(context || {});
  const hasBudgetPressure = finance.budgetPlan?.hasDeclaredBudget && Number(finance.budgetPlan?.remainingSpendableBudget) <= 0;

  if (memoryType === "spending_trigger") {
    return "That is a useful spending trigger to notice. When that situation shows up again, pause before spending and check if the purchase is planned, necessary, and inside your budget.";
  }

  if (memoryType === "preference") {
    return "Got it — that preference matters for how CLARA should guide you. I’ll respond around that pattern here, and you can use it as a filter for better money decisions.";
  }

  if (memoryType === "goal_or_priority") {
    return "That sounds like a real priority, and it is worth protecting. Before future spending, compare the purchase against this goal so your money keeps moving in the right direction.";
  }

  if (memoryType === "lesson_or_insight") {
    return "That lesson is worth keeping close. Turn it into one simple rule for next time, so the insight becomes a money guardrail instead of just a thought.";
  }

  if (memoryType === "emotional_pattern") {
    return "That emotional pattern matters. When that feeling appears, pause first and choose a cheaper reset before spending, especially if the purchase was not planned.";
  }

  if (memoryType === "money_rhythm") {
    return "That money rhythm is important. Use it to plan your budget timing, especially around payday, bills, and the days when spending pressure usually rises.";
  }

  if (hasBudgetPressure) {
    return "That is worth noticing, especially because your budget looks pressured. Treat this as a signal to pause, protect essentials, and avoid unplanned spending today.";
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
  return limitWords(trimSentences(cleaned, 4), 100);
}
