import { buildClaraFinanceSnapshot } from "../clara-local-brain";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";
import { CLARA_BRAINS } from "./brain-router";

const DEFAULT_COACH_REPLY = "I’m here with you. Pause for a moment, name what you’re feeling, then choose one small action that protects your money and your peace today.";
const SAFETY_REPLY = "I’m really sorry you’re carrying that. Please reach out to someone you trust right now or contact local emergency support if your safety is at risk. Your safety matters more than any money decision.";

const SAFETY_TERM_CODES = [
  [107, 105, 108, 108, 32, 109, 121, 115, 101, 108, 102],
  [115, 117, 105, 99, 105, 100, 101],
  [101, 110, 100, 32, 109, 121, 32, 108, 105, 102, 101],
  [115, 101, 108, 102, 32, 104, 97, 114, 109],
  [104, 117, 114, 116, 32, 109, 121, 115, 101, 108, 102],
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

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const number = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim());
  return Number.isFinite(number) ? number : null;
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

function hasSafetySignal(text = "") {
  return SAFETY_TERM_CODES.some((codes) => text.includes(String.fromCharCode(...codes)));
}

function detectCoachTheme(message = "") {
  const text = normalizeText(message);
  if (hasSafetySignal(text)) return "safety";
  if (/\b(tempted|craving|impulse|impulsive|gusto ko bumili|budol|add to cart|checkout)\b/.test(text)) return "temptation";
  if (/\b(guilty|regret|sayang|nagsisi|bad decision|mistake)\b/.test(text)) return "guilt";
  if (/\b(stress|stressed|overwhelmed|anxious|pressure|pagod|burnout|burned out|heavy)\b/.test(text)) return "pressure";
  if (/\b(motivation|discipline|routine|habit|consistent|consistency|lazy|tamad)\b/.test(text)) return "discipline";
  if (/\b(sad|lonely|bored|empty|reward myself|deserve ko|deserve it)\b/.test(text)) return "emotional_spending";
  return "general";
}

function getCoachRisk(finance = {}) {
  const available = toNumber(finance.availableMoney);
  const remainingBudget = finance.budgetPlan?.hasDeclaredBudget ? toNumber(finance.budgetPlan?.remainingSpendableBudget) : null;
  const unplannedSpent = toNumber(finance.unplannedSpent);

  if (available !== null && available <= 0) return "high";
  if (remainingBudget !== null && remainingBudget <= 0) return "high";
  if (available !== null && available < 1000) return "medium";
  if (remainingBudget !== null && remainingBudget < 1000) return "medium";
  if (unplannedSpent !== null && unplannedSpent > 0) return "medium";
  return "low";
}

function buildWalletRows(finance = {}) {
  return list(finance.wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`);
}

function buildBehaviorRows(finance = {}) {
  const top = finance.topSpendingCategory;
  const topText = top?.category ? `${top.category}: ${money(top.amount)}` : "No top spending category yet.";
  return `Monthly spent: ${money(finance.monthlySpent)}. Planned: ${money(finance.plannedSpent)}. Unplanned: ${money(finance.unplannedSpent)}. Top category: ${topText}`;
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

export function buildCoachBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const plan = finance.budgetPlan || {};
  const theme = detectCoachTheme(userMessage);
  const risk = getCoachRisk(finance);
  const subContextBlock = buildClaraBrainSubContextPromptBlock({ brain: CLARA_BRAINS.COACH, message: userMessage, context });

  return `You are CLARA's Coach Brain.

BRAIN TYPE:
Coach Brain

PURPOSE:
Support the user's emotional and behavioral money journey without becoming a long life coach or generic therapist.

Coach Brain handles:
- emotional spending
- guilt after spending
- stress, pressure, anxiety, tiredness, burnout
- temptation and impulse buying
- discipline, routines, consistency, motivation
- encouragement after mistakes
- small protective next steps

${subContextBlock}

LATEST USER MESSAGE:
${cleanText(userMessage)}

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

COACH SNAPSHOT:
Detected coach theme: ${theme}
Behavioral money risk: ${risk}
Finance data status: ${finance.hasAnyData ? "ready" : "not enough data loaded"}
Visible wallet money: ${money(finance.availableMoney)}
Remaining spendable budget: ${money(plan.remainingSpendableBudget)}
Emergency fund protected amount: ${money(finance?.emergencyFund?.saved)}
Wallets: ${buildWalletRows(finance)}
Behavior rows: ${buildBehaviorRows(finance)}

LIGHT PERSONAL CONTEXT:
Income rhythm: ${getProfileValue(context, ["incomeRhythm", "income_rhythm"])}
Guidance tone: ${getProfileValue(context, ["coachingStyle", "coaching_style", "guidanceTone", "guidance_tone"])}
Known spending trigger: ${getProfileValue(context, ["spendingTrigger", "spending_trigger", "trigger"])}
Protected goal: ${getProfileValue(context, ["meaningfulGoal", "meaningful_goal", "protectedGoal", "protected_goal"])}

STYLE RULES:
- Use the selected sub-contexts first when grounding the coaching moment.
- Be warm, calm, grounding, and practical.
- Validate the emotion without excusing harmful spending.
- Do not shame the user.
- Do not preach.
- Do not diagnose mental health conditions.
- Do not turn this into a generic finance summary.
- Mention wallet/budget data only if it directly supports the coaching moment.
- Give one small next step the user can do now.
- If this sounds like a purchase decision, gently tell the user to ask with the item and amount.
- If the user signals immediate safety risk, prioritize safety and urge immediate human support.

ANSWER FORMAT:
1. One short validation.
2. One grounding truth.
3. One small next step.

LENGTH RULES:
- 2-4 short sentences.
- Maximum around 100 words.
- No markdown headings.

Reply as CLARA:`;
}

export function generateLocalCoachReply({ userMessage = "", context = {} } = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const theme = detectCoachTheme(userMessage);
  const risk = getCoachRisk(finance);

  if (theme === "safety") return SAFETY_REPLY;

  if (theme === "temptation") {
    return "That temptation is real, but you do not have to obey it immediately. Pause for 10 minutes, check if it is planned, then ask CLARA with the item and amount before you spend.";
  }

  if (theme === "guilt") {
    return "I hear the guilt, but one mistake does not define your money story. Log what happened honestly, learn the trigger, then make the next decision smaller and cleaner.";
  }

  if (theme === "pressure") {
    const riskLine = risk === "high" ? "Because your money looks pressured, protect essentials first." : "You do not need to fix everything today.";
    return `That sounds heavy, so slow down first. ${riskLine} Choose one small money action now, like checking your budget or delaying one non-essential spend.`;
  }

  if (theme === "discipline") {
    return "Discipline does not need to feel intense today. Make it small: track one expense, avoid one unplanned purchase, or review one budget category before the day ends.";
  }

  if (theme === "emotional_spending") {
    return "That feeling makes spending look comforting, but comfort and checkout are not always the same thing. Give yourself a pause first, then choose a cheaper way to rest before buying anything.";
  }

  return DEFAULT_COACH_REPLY;
}

export function sanitizeCoachBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

  if (!cleaned) return DEFAULT_COACH_REPLY;
  return limitWords(trimSentences(cleaned, 4), 100);
}
