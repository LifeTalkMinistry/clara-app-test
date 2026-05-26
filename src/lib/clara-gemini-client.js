import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";
import { buildClaraBehavioralContextForPrompt, getClaraBehavioralRiskLabel } from "./clara-behavioral-intelligence";
import { buildClaraLifeStagePromptBlock, withClaraLifeStageAiContext } from "./clara-life-stage-ai-context";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_GEMINI_MODELS = [DEFAULT_GEMINI_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"];
const CLARA_SAFE_EMOJIS = ["🙂", "✅", "⚠", "💡", "📌", "⏳"];

function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY || import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || import.meta.env.VITE_CLARA_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || "";
}

function getGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function getGeminiModelCandidates() {
  return [getGeminiModel(), ...FALLBACK_GEMINI_MODELS]
    .map((model) => String(model || "").trim())
    .filter(Boolean)
    .filter((model, index, models) => models.indexOf(model) === index);
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : []).slice(0, 5).map(formatter).filter(Boolean).join("; ") || empty;
}

function sanitizeClaraReply(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildConversationHistory(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "CLARA"}: ${String(message.text || "").trim()}`)
    .join("\n");
}

function buildPrompt({ message, context, mode, conversationHistory = [] }) {
  const enrichedContext = withClaraLifeStageAiContext(context || {});
  const finance = buildClaraFinanceSnapshot(enrichedContext);
  const decision = buildContextForGeminiPrompt({ message, financeContext: enrichedContext });
  const life = summarizeLifeProfileForClara(enrichedContext?.lifeProfile || enrichedContext?.profile?.lifeProfile || enrichedContext?.profile || {});
  const lifeStageBlock = buildClaraLifeStagePromptBlock(enrichedContext.lifeStageContext);
  const behavioralMemory = buildClaraBehavioralContextForPrompt(message);
  const behavioralRisk = getClaraBehavioralRiskLabel(message);

  const wallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const budgets = Array.isArray(finance.budgets) ? finance.budgets : [];
  const goals = Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [];

  return `You are CLARA, an emotionally-aware behavioral money coach.

Spending is emotional, environmental, behavioral, and pressure-driven.

Behavioral risk level:
${behavioralRisk}

${behavioralMemory}

Recent conversation:
${buildConversationHistory(conversationHistory)}

Current user message:
${message}

${lifeStageBlock}

Life Profile:
Income rhythm: ${life.incomeRhythm || "not set"}
Guidance tone: ${life.coachingStyle || "not set"}
Protected goal: ${life.meaningfulGoal || "not set"}
Spending trigger: ${life.spendingTrigger || "not set"}

Wallet truth:
Visible wallet money: ${money(finance.availableMoney)}
Wallets: ${list(wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`)}

Budget:
Allocated: ${money(finance.budgetAllocated)}
Spent: ${money(finance.budgetSpent)}
Left: ${money(finance.budgetRemaining)}
Rows: ${list(budgets, (budget) => `${budget.name || budget.category || "Budget"}: left ${money(budget.remaining)} of ${money(budget.allocated)}`)}

Savings:
${list(goals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`)}

Spending signal:
Monthly spent: ${money(finance.monthlySpent)}
Purchase amount detected: ${money(decision.purchaseAmount)}
Emotional signal: ${yesNo(decision.purchaseSignals?.emotional)}

Use the Me/Life Stage context only when it makes money guidance more personal. Do not over-mention it. Reply naturally as CLARA in 2-5 conversational sentences.`;
}

async function requestGeminiContent({ apiKey, model, prompt, signal }) {
  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        topP: 0.88,
        maxOutputTokens: 220
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed.");
  }

  return data;
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, conversationHistory = [], signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const prompt = buildPrompt({ message, context, mode, conversationHistory });

  let lastError = null;

  for (const model of getGeminiModelCandidates()) {
    try {
      const data = await requestGeminiContent({ apiKey, model, prompt, signal });

      const text = sanitizeClaraReply(
        (data?.candidates?.[0]?.content?.parts || [])
          .map((part) => part?.text || "")
          .join(" ")
      );

      if (text) {
        return text;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Gemini request failed.");
}

export async function refineClaraSupportMessageWithGemini({ topic, message }) {
  return `Topic: ${topic || "General"}\n\n${sanitizeClaraReply(message)}`;
}
