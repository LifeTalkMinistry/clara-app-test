import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";
import { buildClaraBehavioralContextForPrompt, getClaraBehavioralRiskLabel } from "./clara-behavioral-intelligence";
import { buildClaraLifeStagePromptBlock, withClaraLifeStageAiContext } from "./clara-life-stage-ai-context";
import {
  buildClaraContextDiagnostics,
  buildContextSelectorPrompt,
  collectClaraAvailableContext,
} from "./clara-central-context-brain";
import {
  buildClaraPurchaseCategoryGuide,
  formatClaraPurchaseCategoryGuideForPrompt,
} from "./clara-purchase-category-guide";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const KNOWN_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
];
const BLOCKED_MODEL_KEYWORDS = [
  "image",
  "vision",
  "tts",
  "audio",
  "speech",
  "robotics",
  "embedding",
  "embed",
  "aqa",
  "deep-research",
  "computer-use",
  "imagen",
  "veo",
  "lyria",
  "native-audio",
  "thinking-exp",
];
const DANGLING_REPLY_ENDINGS = [
  "and",
  "but",
  "because",
  "so",
  "while",
  "with",
  "for",
  "to",
  "if",
  "unless",
  "before",
  "after",
  "about",
  "around",
  "in",
  "on",
  "at",
  "of",
  "from",
  "into",
  "onto",
  "by",
  "as",
  "than",
  "through",
  "within",
  "without",
  "between",
  "under",
  "over",
  "the",
  "a",
  "an",
  "your",
  "my",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "any",
  "some",
  "right",
  "currently",
  "available",
  "visible",
];

function getLocalDebugFlag() {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage?.getItem("CLARA_DEBUG_AI") === "true" || window.localStorage?.getItem("CLARA_DEBUG_AI") === "1";
  } catch {
    return false;
  }
}

function shouldDebugClaraAi() {
  return import.meta.env.DEV || import.meta.env.VITE_CLARA_DEBUG_AI === "true" || import.meta.env.VITE_CLARA_DEBUG_AI === "1" || getLocalDebugFlag();
}

function normalizeModelName(model = "") {
  return String(model || "").trim().replace(/^models\//, "");
}

function uniqueModels(models = []) {
  return models.map(normalizeModelName).filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);
}

function isTextChatGeminiModel(model = "") {
  const value = normalizeModelName(model).toLowerCase();
  if (!value || !value.includes("gemini")) return false;
  if (BLOCKED_MODEL_KEYWORDS.some((keyword) => value.includes(keyword))) return false;
  return value.includes("flash") || value.includes("pro");
}

function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY || import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || import.meta.env.VITE_CLARA_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || "";
}

function getConfiguredGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || "";
}

function getFallbackGeminiModelCandidates() {
  return uniqueModels([getConfiguredGeminiModel(), DEFAULT_GEMINI_MODEL, ...KNOWN_GEMINI_MODELS]).filter(isTextChatGeminiModel);
}

function rankGeminiModel(model = "") {
  const value = normalizeModelName(model).toLowerCase();
  const configured = normalizeModelName(getConfiguredGeminiModel()).toLowerCase();
  if (configured && value === configured && isTextChatGeminiModel(value)) return 0;
  if (value.includes("2.5") && value.includes("flash") && !value.includes("lite")) return 1;
  if (value.includes("2.5") && value.includes("flash") && value.includes("lite")) return 2;
  if (value.includes("2.0") && value.includes("flash") && !value.includes("lite")) return 3;
  if (value.includes("1.5") && value.includes("flash")) return 4;
  if (value.includes("flash")) return 5;
  if (value.includes("pro")) return 6;
  return 9;
}

async function discoverGeminiModelCandidates({ apiKey, signal } = {}) {
  const fallbackModels = getFallbackGeminiModelCandidates();
  try {
    const response = await fetch(`${GEMINI_ENDPOINT_BASE}?key=${encodeURIComponent(apiKey)}`, { signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (shouldDebugClaraAi()) console.warn("[CLARA Gemini] Model discovery failed", { status: response.status, message: data?.error?.message, payload: data });
      return fallbackModels;
    }
    const allGenerateContentModels = (Array.isArray(data?.models) ? data.models : []).filter((model) => (model?.supportedGenerationMethods || []).includes("generateContent")).map((model) => normalizeModelName(model?.name)).filter(Boolean);
    const discoveredModels = allGenerateContentModels.filter(isTextChatGeminiModel);
    const blockedModels = allGenerateContentModels.filter((model) => !isTextChatGeminiModel(model));
    const configuredModel = normalizeModelName(getConfiguredGeminiModel());
    const configuredModelCandidate = isTextChatGeminiModel(configuredModel) ? configuredModel : "";
    const orderedDiscoveredModels = uniqueModels(discoveredModels).sort((a, b) => rankGeminiModel(a) - rankGeminiModel(b));
    const candidates = uniqueModels([configuredModelCandidate, ...orderedDiscoveredModels, ...fallbackModels]).filter(isTextChatGeminiModel);
    if (shouldDebugClaraAi()) {
      console.log("[CLARA Gemini] Available text generateContent models", orderedDiscoveredModels);
      console.log("[CLARA Gemini] Blocked non-chat models", blockedModels);
      console.log("[CLARA Gemini] Final text model candidates", candidates);
    }
    return candidates;
  } catch (error) {
    if (shouldDebugClaraAi()) console.warn("[CLARA Gemini] Model discovery crashed", error);
    return fallbackModels;
  }
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
  return String(text || "").replace(/\s+/g, " ").trim();
}

function lastWord(text = "") {
  const words = sanitizeClaraReply(text).toLowerCase().match(/[a-z]+(?:'[a-z]+)?|₱?\d[\d,]*/g) || [];
  return words[words.length - 1] || "";
}

function hasSentenceEnding(text = "") {
  return /[.!?)]$/.test(sanitizeClaraReply(text));
}

function isIncompleteClaraReply(text = "") {
  const reply = sanitizeClaraReply(text);
  if (!reply) return true;
  if (reply.length < 35) return true;
  if (/[,:;\-–—]$/.test(reply)) return true;
  if (DANGLING_REPLY_ENDINGS.includes(lastWord(reply))) return true;
  if (/₱\s*\d[\d,]*\s+(in|on|at|of|for|with|from|to)$/i.test(reply)) return true;
  if (/\b(CLARA sees|you have|you currently have|right now,|right now)\s*₱?\d*[\d,]*\s*(in|on|at|of|for|with|from|to)?$/i.test(reply)) return true;
  if (!hasSentenceEnding(reply) && reply.length < 170) return true;
  return false;
}

function buildCompletionRetryPrompt({ originalPrompt = "", incompleteReply = "" } = {}) {
  return `${originalPrompt}

IMPORTANT COMPLETION REPAIR:
The previous response was incomplete and must not be shown to the user:
"${sanitizeClaraReply(incompleteReply)}"

Write a new complete CLARA reply from scratch.
Rules:
- Do not continue the broken sentence.
- Do not stop mid-sentence.
- Use 2-4 complete conversational sentences.
- For money decisions, include a clear recommendation, one short reason, and one next step.
- If wallet or budget data is missing, say that clearly and ask one helpful next question.
- End with a complete sentence and punctuation.`;
}

function buildConversationHistory(messages = []) {
  return (Array.isArray(messages) ? messages : []).slice(-8).map((message) => `${message.role === "user" ? "User" : "CLARA"}: ${String(message.text || "").trim()}`).join("\n");
}

function logCentralContextDiagnostics({ message, enrichedContext, conversationHistory }) {
  if (!shouldDebugClaraAi()) return;
  try {
    const centralContextInput = { ...(enrichedContext || {}), userMessageHistory: conversationHistory, conversationHistory };
    console.log("[CLARA Central Context] Available Context", collectClaraAvailableContext(centralContextInput));
    console.log("[CLARA Central Context] Diagnostics", buildClaraContextDiagnostics(centralContextInput));
    console.log("[CLARA Central Context] Selector Prompt", buildContextSelectorPrompt(message, centralContextInput));
  } catch (error) {
    console.warn("[CLARA Central Context] Diagnostics failed", error);
  }
}

function budgetName(budget = {}) {
  return String(budget?.name || budget?.category || budget?.title || budget?.label || "Budget").trim();
}

function buildBudgetRowsForPrompt(budgetPlan = {}) {
  const categories = Array.isArray(budgetPlan.categories) ? budgetPlan.categories : [];
  if (!categories.length) return "No budget categories created yet.";
  return list(categories, (budget) => `${budgetName(budget)}: allocated ${money(budget.allocated)}, spent ${money(budget.spent)}, left ${money(budget.remaining)}`);
}

async function buildPrompt({ message, context, mode, conversationHistory = [] }) {
  const enrichedContext = withClaraLifeStageAiContext(context || {});
  const finance = buildClaraFinanceSnapshot(enrichedContext);
  const decision = buildContextForGeminiPrompt({ message, financeContext: enrichedContext });
  const life = summarizeLifeProfileForClara(enrichedContext?.lifeProfile || enrichedContext?.profile?.lifeProfile || enrichedContext?.profile || {});
  const lifeStageBlock = buildClaraLifeStagePromptBlock(enrichedContext.lifeStageContext);
  const behavioralMemory = await buildClaraBehavioralContextForPrompt(message);
  const behavioralRisk = await getClaraBehavioralRiskLabel(message);

  logCentralContextDiagnostics({ message, enrichedContext, conversationHistory });

  const wallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const budgets = Array.isArray(finance.budgets) ? finance.budgets : [];
  const budgetPlan = finance.budgetPlan || {};
  const goals = Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [];
  const purchaseCategoryGuide = buildClaraPurchaseCategoryGuide(message, budgets);

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
Declared monthly budget: ${money(budgetPlan.declaredBudget)}
Allocated into categories: ${money(budgetPlan.allocatedBudget)}
Unallocated: ${money(budgetPlan.unallocatedBudget)}
Spent so far: ${money(budgetPlan.spentTotal)}
Planned spent: ${money(budgetPlan.plannedSpent)}
Unplanned spent: ${money(budgetPlan.unplannedSpent)}
Undocumented spent: ${money(budgetPlan.undocumentedSpent)}
Remaining spendable budget: ${money(budgetPlan.remainingSpendableBudget)}
Category count: ${Number.isFinite(Number(budgetPlan.categoryCount)) ? budgetPlan.categoryCount : 0}
Budget status: ${budgetPlan.budgetStatus || "unknown"}
Explanation: ${budgetPlan.budgetExplanation || "Budget state is unclear."}
Rows: ${buildBudgetRowsForPrompt(budgetPlan)}

Purchase category guide:
${formatClaraPurchaseCategoryGuideForPrompt(purchaseCategoryGuide)}

Savings:
${list(goals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`)}

Spending signal:
Monthly spent: ${money(finance.monthlySpent)}
Purchase amount detected: ${money(decision.purchaseAmount)}
Emotional signal: ${yesNo(decision.purchaseSignals?.emotional)}

Rules for budget answers:
- For budget questions, answer from the Budget section, not the Wallet truth section.
- If the user asks about category budget but no category exists, say no category exists yet.
- Do not answer budget questions with wallet balance.
- Distinguish wallet money from monthly budget remaining.
- Remaining spendable budget means declared monthly budget minus spent so far.
- Unallocated means declared monthly budget minus category allocations; it is not the same as spendable remaining.

Use the Me/Life Stage context only when it makes money guidance more personal. Do not over-mention it.
For purchase, budget, savings, debt, payday, or emergency questions: give a complete recommendation, one short reason, and one next step.
Never stop mid-sentence. End with a complete sentence.
Reply naturally as CLARA in 3-5 conversational sentences.`;
}

async function requestGeminiContent({ apiKey, model, prompt, signal }) {
  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.55, topP: 0.86, maxOutputTokens: 520 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gemini request failed for ${model}.`);
    error.status = response.status;
    error.model = model;
    error.payload = data;
    throw error;
  }
  return data;
}

function extractGeminiText(data = {}) {
  return sanitizeClaraReply((data?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || "").join(" "));
}

async function requestGeminiText({ apiKey, model, prompt, signal }) {
  const data = await requestGeminiContent({ apiKey, model, prompt, signal });
  return extractGeminiText(data);
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, conversationHistory = [], signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const prompt = await buildPrompt({ message, context, mode, conversationHistory });
  const modelCandidates = await discoverGeminiModelCandidates({ apiKey, signal });
  let lastError = null;
  for (const model of modelCandidates) {
    try {
      if (shouldDebugClaraAi()) console.log("[CLARA Gemini] Trying model", model);
      const text = await requestGeminiText({ apiKey, model, prompt, signal });
      if (text && !isIncompleteClaraReply(text)) {
        if (shouldDebugClaraAi()) console.log("[CLARA Gemini] Model succeeded", model);
        return text;
      }
      if (shouldDebugClaraAi()) console.warn("[CLARA Gemini] Incomplete reply detected, retrying", { model, text });
      const retryPrompt = buildCompletionRetryPrompt({ originalPrompt: prompt, incompleteReply: text });
      const retryText = await requestGeminiText({ apiKey, model, prompt: retryPrompt, signal });
      if (retryText && !isIncompleteClaraReply(retryText)) {
        if (shouldDebugClaraAi()) console.log("[CLARA Gemini] Model succeeded after completion retry", model);
        return retryText;
      }
      lastError = new Error(`Gemini returned incomplete CLARA replies using ${model}.`);
      lastError.model = model;
      lastError.partialReply = retryText || text;
    } catch (error) {
      if (shouldDebugClaraAi()) console.warn("[CLARA Gemini] Model failed", { model, message: error?.message, status: error?.status, payload: error?.payload });
      lastError = error;
    }
  }
  throw lastError || new Error("Gemini request failed.");
}

export async function refineClaraSupportMessageWithGemini({ topic, message }) {
  return `Topic: ${topic || "General"}\n\n${sanitizeClaraReply(message)}`;
}
