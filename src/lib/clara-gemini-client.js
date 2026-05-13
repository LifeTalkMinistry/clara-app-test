import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const CLARA_SAFE_EMOJIS = ["🙂", "✅", "⚠", "💡", "📌", "⏳"];

function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY || import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || import.meta.env.VITE_CLARA_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || "";
}

function getGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : []).slice(0, 5).map(formatter).filter(Boolean).join("; ") || empty;
}

function buildPrompt({ message, context, mode }) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const decision = buildContextForGeminiPrompt({ message, financeContext: context || {} });
  const life = summarizeLifeProfileForClara(
    context?.lifeProfile || context?.profile?.lifeProfile || context?.profile || {}
  );

  const wallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const budgets = Array.isArray(finance.budgets) ? finance.budgets : [];
  const goals = Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [];

  return `You are CLARA, a private money buddy and behavioral spending coach.

IMPORTANT:
- The Life Profile below is REAL user profile context.
- If the user asks about their age, goals, values, identity, personality, responsibilities, fears, triggers, or future self, answer using the Life Profile below.
- Do not claim the profile is missing if information exists below.
- Speak naturally and conversationally.

User message: ${message}
Mode: ${mode || "normal_chat"}

Life Profile:
Age: ${life.age || "not set"}
Money personality: ${life.personality || "not set"}
Status: ${life.status || "not set"}
Dependents: ${life.dependents || "not set"}
Protect first: ${life.responsibility || "not set"}
Income rhythm: ${life.incomeRhythm || "not set"}
Guidance tone: ${life.coachingStyle || "not set"}
Current focus: ${life.currentFocus || "not set"}
Values: ${life.topValues || "not set"}
Protected goal: ${life.meaningfulGoal || "not set"}
Situation to avoid: ${life.financialFear || "not set"}
Spending trigger: ${life.spendingTrigger || "not set"}
Non-negotiable money: ${life.nonNegotiable || "not set"}
Future identity: ${life.identityStatement || "not set"}

Wallet truth:
Visible wallet money: ${money(finance.availableMoney)}
Wallets: ${list(wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`, finance.availableMoney !== null ? `Total visible money: ${money(finance.availableMoney)}` : "none loaded")}

Budget:
Allocated: ${money(finance.budgetAllocated)}
Spent: ${money(finance.budgetSpent)}
Left: ${money(finance.budgetRemaining)}
Rows: ${list(budgets, (budget) => `${budget.name || budget.category || "Budget"}: left ${money(budget.remaining)} of ${money(budget.allocated)}`)}

Savings:
${list(goals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`)}

Spending signal:
Monthly spent: ${money(finance.monthlySpent)}
Purchase amount: ${money(decision.purchaseAmount)}
Emotional signal: ${yesNo(decision.purchaseSignals?.emotional)}

Emoji policy:
Use ONLY these emojis if needed: 🙂 ✅ ⚠ 💡 📌 ⏳

Reply as CLARA:`;
}

function normalizeEmojiForClara(text) {
  let clean = String(text || "")
    .replace(/\uFFFD/g, "")
    .replace(/💚|❤️|❤|♥/gu, "🙂")
    .replace(/🫶|🤍|💕|💖|💙|💜/gu, "🙂")
    .replace(/✨|⭐|🌟/gu, "💡")
    .replace(/🧠/gu, "💡")
    .replace(/🛡️|🛡/gu, "✅")
    .replace(/🚨|❗|‼️|‼/gu, "⚠")
    .replace(/⏰|⌛|⌚/gu, "⏳")
    .replace(/👉|➡️|➡/gu, "📌");

  const placeholders = new Map();
  CLARA_SAFE_EMOJIS.forEach((emoji, index) => {
    const token = `__CLARA_SAFE_EMOJI_${index}__`;
    placeholders.set(token, emoji);
    clean = clean.split(emoji).join(token);
  });

  clean = clean
    .replace(/\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?)*?/gu, "")
    .replace(/[\u200D\uFE0E\uFE0F]/g, "");

  placeholders.forEach((emoji, token) => {
    clean = clean.split(token).join(emoji);
  });

  return clean;
}

function sanitizeClaraReply(text) {
  return normalizeEmojiForClara(text)
    .replace(/\s+([.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function looksIncompleteReply(text) {
  const clean = sanitizeClaraReply(text)
    .replace(/[🙂✅⚠💡📌⏳]/g, "")
    .trim();

  if (clean.length < 20) return true;

  return false;
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const model = getGeminiModel();

  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt({ message, context, mode }) }] }],
      generationConfig: {
        temperature: 0.62,
        topP: 0.9,
        maxOutputTokens: 520,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const data = await response.json();

  const text = sanitizeClaraReply(
    (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || "")
      .join(" ")
  );

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  if (looksIncompleteReply(text)) {
    throw new Error(`Gemini returned an incomplete response: ${text}`);
  }

  return text;
}
