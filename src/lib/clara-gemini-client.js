import {
  getClaraGeminiProxyModelCandidates,
  requestClaraGeminiProxyText,
} from "./clara-gemini-proxy-client";
import { generateScheduleBrainReply, isScheduleBrainRoute } from "./ai-brains/schedule-brain-entry";
import { routeClaraBrain } from "./ai-brains/brain-router";
import { getScheduleContextForAI } from "./clara-schedule-ai-context";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const KNOWN_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
const DIRECT_PROMPT_MODES = new Set(["normal_chat", "normal_chat_clarification", "deep_decision", "deep_decision_clarification"]);
const DEEP_AI_MODES = new Set(["afford", "forecast", "forecast_phase_one", "checkup", "feature_review", "money_context_check"]);
const NORMAL_BUCKET_MODES = new Set(["ai_environment", "savings-plan", "budget-fixer", "next-move", "wallets", "budgets", "emergency", "savings-goals", "investment", "debt-obligations"]);
const UNAVAILABLE_REPLY = "CLARA AI is unavailable right now. Please try again in a moment.";

const PRESENTATION_RULES = `Reply like a natural premium mobile chat message.
Plain text only.
Start with the direct answer in 1 short sentence.
For advice, tips, steps, plans, lists, or breakdowns, use short bullet points.
Never write numbered advice inline inside one paragraph.
Use a blank line before every bullet or numbered section.
Never write a paragraph longer than 2 short lines.
Keep each bullet practical and specific.
Do not over-explain.
Do not use Markdown bold, Markdown headings, HTML, or code formatting.
Ask only one question at the end when needed.`;

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

function getConfiguredGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function discoverGeminiModelCandidates() {
  return getClaraGeminiProxyModelCandidates(uniqueModels([getConfiguredGeminiModel(), DEFAULT_GEMINI_MODEL, ...KNOWN_GEMINI_MODELS]));
}

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeChoice(value = "") {
  return String(value || "").toLowerCase().replace(/[“”"'`]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function stripInstructionText(text = "") {
  return String(text || "").replace(PRESENTATION_RULES, "").replace(/CLARA REPLY FORMAT RULES:[\s\S]*$/i, "").trim();
}

function extractPromptSection(prompt = "", label = "") {
  const source = String(prompt || "");
  const marker = `${label}:`;
  const index = source.toLowerCase().indexOf(marker.toLowerCase());
  if (index < 0) return "";
  const rest = source.slice(index + marker.length).trim();
  const nextHeading = rest.search(/\n\n[A-Z][^:\n]{0,80}:/);
  return stripInstructionText(nextHeading >= 0 ? rest.slice(0, nextHeading) : rest);
}

function extractVisibleUserMessage(message = "") {
  return extractPromptSection(message, "Current visible user message") || extractPromptSection(message, "User message") || extractPromptSection(message, "Raw app prompt without formatting rules") || stripInstructionText(message);
}

function readPath(source = {}, path = "") {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstArray(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstValue(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function safeStringifyForPrompt(value, fallback = "{}") {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function getRecentConversationText(messages = [], limit = 6) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-limit)
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = stripInstructionText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildNormalChatDataMap(context = {}) {
  const internalScheduleContext = getScheduleContextForAI(context);
  const schedule = internalScheduleContext?.hasUpcomingItems
    ? internalScheduleContext
    : firstValue(context, ["schedule", "calendar", "paydayInfo", "paydayCycle", "profileAnswers.scheduleRoutine", "profileAnswers.sleepPattern", "profileAnswers.workExhaustion", "lifeProfile.scheduleRoutine", "lifeProfile.sleepPattern", "lifeProfile.workExhaustion", "lifeProfile.paydayCycle"]);

  const incomeSources = firstArray(context, ["incomeSources", "income_sources", "incomeRecords", "finance.incomeSources", "incomeHub.sources", "incomeHub.records"]);
  const wallets = firstArray(context, ["wallets", "finance.wallets", "walletRecords", "walletHub.wallets"]);
  const budgets = firstArray(context, ["budgets", "budgetPlan.categories", "finance.budgets", "budgetHub.budgets", "budgetHub.categories"]);
  const savingsGoals = firstArray(context, ["savingsGoals", "savings_goals", "finance.savingsGoals"]);
  const transactions = firstArray(context, ["transactions", "recentTransactions", "finance.transactions", "transactionHubSnapshot.timeline"]);
  const debts = firstArray(context, ["debts", "debtObligations", "obligations", "finance.debts", "finance.obligations", "finance.debtObligations"]);
  const dashboardCards = firstValue(context, ["dashboardCards", "dashboardSnapshot", "cards", "mainDashboard.cards"]);
  const emergencyFund = firstValue(context, ["emergencyFund", "finance.emergencyFund", "emergency_fund"]);
  const memory = firstValue(context, ["memory", "aiFinancialMemory", "ai_financial_memory", "profileAnswers", "behaviorProfile", "lifeProfile"]);

  return {
    incomeHub: { label: "Income Hub", available: incomeSources.length > 0, data: incomeSources.slice(0, 8), purpose: "Income sources, records, and timing." },
    wallets: { label: "Wallets", available: wallets.length > 0, data: wallets.slice(0, 12), purpose: "Wallet names, balances, and visible money." },
    budgets: { label: "Budgets", available: budgets.length > 0, data: budgets.slice(0, 12), purpose: "Budget categories, allocation, spent amount, and remaining amount." },
    savingsGoals: { label: "Savings Goals", available: savingsGoals.length > 0, data: savingsGoals.slice(0, 10), purpose: "Savings goals, targets, saved amounts, and progress." },
    emergencyFund: { label: "Emergency Fund", available: Boolean(emergencyFund), data: emergencyFund || null, purpose: "Emergency fund setup, saved amount, target, and storage wallet." },
    debtObligations: { label: "Debt / Obligations", available: debts.length > 0, data: debts.slice(0, 10), purpose: "Debt, bills, recurring obligations, loans, payables, and monthly commitments." },
    schedule: { label: "CLARA Schedule", available: Boolean(schedule), data: schedule || null, purpose: "Internal CLARA Schedule page events, upcoming appointments, reminders, money-impact events, routine timing, payday cycle, and timing pressure." },
    memory: { label: "Memory", available: Boolean(memory), data: memory || null, purpose: "Saved user context, preferences, profile answers, and behavior notes." },
    transactions: { label: "Transactions", available: transactions.length > 0, data: transactions.slice(0, 15), purpose: "Recent money movement, income, expenses, transfers, and activity." },
    dashboardCards: { label: "Dashboard Cards", available: Boolean(dashboardCards), data: dashboardCards || null, purpose: "Current visible dashboard summaries and card-level app data." },
  };
}

function getClaraAiMode({ mode = "", userMessage = "" } = {}) {
  const normalizedMode = String(mode || "");
  const text = normalizeChoice(userMessage);
  if (DIRECT_PROMPT_MODES.has(normalizedMode)) return normalizedMode.startsWith("deep_decision") ? "deep_decision" : "normal_chat";
  if (DEEP_AI_MODES.has(normalizedMode)) return "deep_decision";
  if (/^talk_to_clara/.test(normalizedMode)) return "direct_prompt";
  if (/\b(forecast|future money|next payday forecast|analyze my spending|spending analysis|spending checkup|analytics|afford)\b/i.test(text)) return "deep_decision";
  if (NORMAL_BUCKET_MODES.has(normalizedMode) || !normalizedMode) return "normal_chat";
  return "deep_decision";
}

function buildNormalChatAiPrompt({ userMessage = "", recentConversation = [], dataMap = {} } = {}) {
  return `You are CLARA, a personal money coach inside the CLARA app.

This is NORMAL CHAT mode. Choose one CLARA data bucket and answer using only that bucket.
For schedule or calendar questions, use the CLARA Schedule bucket only. Treat calendar as the internal CLARA Schedule page.

Available CLARA data buckets:
${safeStringifyForPrompt(dataMap)}

Recent conversation:
${getRecentConversationText(recentConversation, 6) || "No recent conversation."}

User message:
${stripInstructionText(userMessage)}

${PRESENTATION_RULES}`;
}

function buildDeepDecisionAiPrompt({ userMessage = "", mode = "", fullContext = {}, recentConversation = [] } = {}) {
  return `You are CLARA, a personal money coach inside the CLARA app.

Use full CLARA context for a deeper money decision, forecast, or analysis. Do not invent missing data.

Selected mode:
${mode || "Typed deep decision request"}

User message:
${stripInstructionText(userMessage)}

Recent conversation:
${getRecentConversationText(recentConversation, 6) || "No recent conversation."}

Full CLARA context:
${safeStringifyForPrompt(fullContext)}

${PRESENTATION_RULES}`;
}

function buildDirectPrompt({ message = "", conversationHistory = [] } = {}) {
  return `${stripInstructionText(message)}

Recent conversation:
${getRecentConversationText(conversationHistory, 6) || "No recent conversation."}

${PRESENTATION_RULES}`;
}

function isIncompleteClaraReply(text = "") {
  const reply = cleanText(text);
  if (!reply || reply.length < 18) return true;
  if (/[,:;\-–—]$/.test(reply)) return true;
  if (/\b(and|but|because|so|while|with|for|to|if|unless|before|after|about|around)$/i.test(reply)) return true;
  return false;
}

function buildCompletionRetryPrompt({ originalPrompt = "", incompleteReply = "" } = {}) {
  return `${originalPrompt}

The previous response was incomplete and must not be shown:
"${cleanText(incompleteReply)}"

Write one complete CLARA reply from scratch. End with complete punctuation.`;
}

async function requestGeminiText({ model, prompt, signal, generationConfig } = {}) {
  return requestClaraGeminiProxyText({
    prompt,
    model,
    signal,
    generationConfig: { temperature: 0.55, topP: 0.86, maxOutputTokens: 520, ...(generationConfig || {}) },
  });
}

async function requestPromptWithRetry({ prompt, mode, signal } = {}) {
  const modelCandidates = await discoverGeminiModelCandidates();
  let lastError = null;
  for (const model of modelCandidates) {
    try {
      if (shouldDebugClaraAi()) console.log("[CLARA Gemini Routing] Trying proxy model", { mode, model });
      const text = await requestGeminiText({ model, prompt, signal });
      if (text && !isIncompleteClaraReply(text)) return text;
      const retryText = await requestGeminiText({ model, prompt: buildCompletionRetryPrompt({ originalPrompt: prompt, incompleteReply: text }), signal });
      if (retryText && !isIncompleteClaraReply(retryText)) return retryText;
      lastError = new Error(`Gemini returned incomplete CLARA reply using ${model}.`);
      lastError.model = model;
      lastError.partialReply = retryText || text;
    } catch (error) {
      if (shouldDebugClaraAi()) console.warn("[CLARA Gemini Routing] Proxy model failed", { mode, model, message: error?.message, status: error?.status });
      lastError = error;
    }
  }
  if (shouldDebugClaraAi() && lastError) console.warn("[CLARA Gemini Routing] Final fallback blocked", lastError);
  return UNAVAILABLE_REPLY;
}

export function hasGeminiConfig() {
  return true;
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, conversationHistory = [], signal } = {}) {
  const normalizedMode = String(mode || "");
  const visibleUserMessage = extractVisibleUserMessage(message);
  const route = routeClaraBrain({ userMessage: visibleUserMessage, recentConversation: conversationHistory });

  if (isScheduleBrainRoute(route?.brain)) {
    if (shouldDebugClaraAi()) console.log("[CLARA AI] Hard-routed to Schedule Brain", { visibleUserMessage, route });
    return generateScheduleBrainReply({ message: visibleUserMessage, context, conversationHistory, signal, discoverGeminiModelCandidates, requestGeminiText, shouldDebugClaraAi });
  }

  if (DIRECT_PROMPT_MODES.has(normalizedMode)) return requestPromptWithRetry({ prompt: message, mode: normalizedMode, signal });

  const aiMode = getClaraAiMode({ mode: normalizedMode, userMessage: visibleUserMessage });
  if (shouldDebugClaraAi()) console.log("[CLARA Gemini Routing] Selected mode", { mode: normalizedMode, aiMode, visibleUserMessage });

  if (aiMode === "direct_prompt") return requestPromptWithRetry({ prompt: buildDirectPrompt({ message, conversationHistory }), mode: normalizedMode, signal });
  if (aiMode === "deep_decision") {
    return requestPromptWithRetry({ prompt: buildDeepDecisionAiPrompt({ userMessage: visibleUserMessage, mode: normalizedMode, fullContext: context, recentConversation: conversationHistory }), mode: normalizedMode || "deep_decision", signal });
  }
  return requestPromptWithRetry({ prompt: buildNormalChatAiPrompt({ userMessage: visibleUserMessage, recentConversation: conversationHistory, dataMap: buildNormalChatDataMap(context) }), mode: normalizedMode || "normal_chat", signal });
}

export async function refineClaraSupportMessageWithGemini({ topic, message }) {
  return `Topic: ${topic || "General"}\n\n${cleanText(message)}`;
}
