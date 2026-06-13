import {
  getClaraGeminiProxyModelCandidates,
  requestClaraGeminiProxyText,
} from "./clara-gemini-proxy-client";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const KNOWN_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
];

const DIRECT_PROMPT_MODES = new Set([
  "normal_chat",
  "normal_chat_clarification",
  "deep_decision",
  "deep_decision_clarification",
]);

const DEEP_AI_MODES = new Set([
  "afford",
  "forecast",
  "forecast_phase_one",
  "checkup",
  "purchase_decision",
  "feature_review",
  "money_context_check",
]);

const NORMAL_BUCKET_MODES = new Set([
  "ai_environment",
  "savings-plan",
  "budget-fixer",
  "next-move",
  "wallets",
  "budgets",
  "emergency",
  "savings-goals",
  "investment",
  "debt-obligations",
]);

const UNAVAILABLE_REPLY = "CLARA AI is unavailable right now. Please try again in a moment.";

const PRESENTATION_RULES = `Reply like a natural mobile chat message. Plain text only. Use short readable paragraphs separated by blank lines. Keep it warm, practical, and easy to read. Ask only one question at the end when a question is needed.

CLARA REPLY FORMAT RULES:
- If the answer is longer than 3 sentences, break it into short sections.
- Use bullets for budgets, wallets, income sources, transactions, savings goals, emergency fund details, and money breakdowns.
- Never place 3 or more money values in one paragraph.
- Keep each paragraph short and mobile-chat friendly.
- Use plain text only.
- No markdown tables.
- Prefer this structure:
  Short answer
  Bullet breakdown
  Current result
  One practical next step if needed`;

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
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripInstructionText(text = "") {
  return String(text || "")
    .replace(PRESENTATION_RULES, "")
    .replace(/CLARA REPLY FORMAT RULES:[\s\S]*$/i, "")
    .trim();
}

function extractPromptSection(prompt = "", label = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?:\\n\\n[A-Z][^:\\n]{0,80}:|$)`, "i");
  const match = String(prompt || "").match(pattern);
  return stripInstructionText(match?.[1] || "");
}

function extractVisibleUserMessage(message = "") {
  return (
    extractPromptSection(message, "Current visible user message") ||
    extractPromptSection(message, "User message") ||
    extractPromptSection(message, "Raw app prompt without formatting rules") ||
    stripInstructionText(message)
  );
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
      const text = stripInstructionText(message?.text || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildNormalChatDataMap(context = {}) {
  const incomeSources = firstArray(context, [
    "incomeSources",
    "income_sources",
    "incomeRecords",
    "finance.incomeSources",
    "incomeHub.sources",
    "incomeHub.records",
  ]);

  const wallets = firstArray(context, [
    "wallets",
    "finance.wallets",
    "walletRecords",
    "walletHub.wallets",
  ]);

  const budgets = firstArray(context, [
    "budgets",
    "budgetPlan.categories",
    "finance.budgets",
    "budgetHub.budgets",
    "budgetHub.categories",
  ]);

  const savingsGoals = firstArray(context, [
    "savingsGoals",
    "savings_goals",
    "finance.savingsGoals",
  ]);

  const transactions = firstArray(context, [
    "transactions",
    "recentTransactions",
    "finance.transactions",
    "transactionHubSnapshot.timeline",
  ]);

  const debts = firstArray(context, [
    "debts",
    "debtObligations",
    "obligations",
    "finance.debts",
    "finance.obligations",
    "finance.debtObligations",
  ]);

  const dashboardCards = firstValue(context, [
    "dashboardCards",
    "dashboardSnapshot",
    "cards",
    "mainDashboard.cards",
  ]);

  const emergencyFund = firstValue(context, [
    "emergencyFund",
    "finance.emergencyFund",
    "emergency_fund",
  ]);

  const schedule = firstValue(context, [
    "schedule",
    "calendar",
    "paydayInfo",
    "paydayCycle",
    "profileAnswers.scheduleRoutine",
    "profileAnswers.sleepPattern",
    "profileAnswers.workExhaustion",
    "lifeProfile.scheduleRoutine",
    "lifeProfile.sleepPattern",
    "lifeProfile.workExhaustion",
    "lifeProfile.paydayCycle",
  ]);

  const memory = firstValue(context, [
    "memory",
    "aiFinancialMemory",
    "ai_financial_memory",
    "profileAnswers",
    "behaviorProfile",
    "lifeProfile",
  ]);

  return {
    incomeHub: {
      label: "Income Hub",
      available: incomeSources.length > 0,
      data: incomeSources.slice(0, 8),
      purpose: "Income sources, income records, expected income, and payday timing.",
    },
    wallets: {
      label: "Wallets",
      available: wallets.length > 0,
      data: wallets.slice(0, 12),
      purpose: "Wallet names, balances, and visible money.",
    },
    budgets: {
      label: "Budgets",
      available: budgets.length > 0,
      data: budgets.slice(0, 12),
      purpose: "Budget categories, allocation, spent amount, and remaining amount.",
    },
    savingsGoals: {
      label: "Savings Goals",
      available: savingsGoals.length > 0,
      data: savingsGoals.slice(0, 10),
      purpose: "Savings goals, targets, saved amounts, and progress.",
    },
    emergencyFund: {
      label: "Emergency Fund",
      available: Boolean(emergencyFund),
      data: emergencyFund || null,
      purpose: "Emergency fund setup, saved amount, target, and storage wallet.",
    },
    debtObligations: {
      label: "Debt / Obligations",
      available: debts.length > 0,
      data: debts.slice(0, 10),
      purpose: "Debt, bills, recurring obligations, loans, payables, and monthly commitments.",
    },
    schedule: {
      label: "Schedule",
      available: Boolean(schedule),
      data: schedule || null,
      purpose: "Work schedule, routine, payday cycle, sleep pattern, and timing pressure.",
    },
    memory: {
      label: "Memory",
      available: Boolean(memory),
      data: memory || null,
      purpose: "Saved user context, preferences, profile answers, and behavior notes.",
    },
    transactions: {
      label: "Transactions",
      available: transactions.length > 0,
      data: transactions.slice(0, 15),
      purpose: "Recent money movement, income, expenses, transfers, and activity.",
    },
    dashboardCards: {
      label: "Dashboard Cards",
      available: Boolean(dashboardCards),
      data: dashboardCards || null,
      purpose: "Current visible dashboard summaries and card-level app data.",
    },
  };
}

function getClaraAiMode({ mode = "", userMessage = "" } = {}) {
  const normalizedMode = String(mode || "");
  const text = normalizeChoice(userMessage);

  if (DIRECT_PROMPT_MODES.has(normalizedMode)) return normalizedMode.startsWith("deep_decision") ? "deep_decision" : "normal_chat";
  if (DEEP_AI_MODES.has(normalizedMode)) return "deep_decision";
  if (/^talk_to_clara/.test(normalizedMode)) return "direct_prompt";

  const typedDeepIntent =
    /\b(can i afford|afford this|can i buy|should i buy|buy check)\b/i.test(text) ||
    /\b(forecast|future money|next payday forecast)\b/i.test(text) ||
    /\b(analyze my spending|spending analysis|spending checkup|analytics)\b/i.test(text);

  if (typedDeepIntent) return "deep_decision";
  if (NORMAL_BUCKET_MODES.has(normalizedMode) || !normalizedMode) return "normal_chat";
  return "deep_decision";
}

function buildNormalChatAiPrompt({ userMessage = "", recentConversation = [], dataMap = {} } = {}) {
  return `You are CLARA, a personal money coach inside the CLARA app.

This is NORMAL CHAT mode.

Your job:
- Understand the user's message.
- Choose the most relevant CLARA data bucket.
- Answer simply using only the chosen bucket.
- For casual greetings, greet naturally and do not summarize money data.
- Do not perform full financial diagnosis.
- Do not combine all modules unless the user explicitly asks for a full overview.
- Do not over-contextualize.
- Do not infer emotional or behavioral risk unless the user asks about behavior, habits, or memory.
- If the user's request is unclear, ask one short clarification question.
- If the relevant data bucket is unavailable, say what data is missing and ask one short question.

Available CLARA data buckets and basic data:
${safeStringifyForPrompt(dataMap)}

Recent conversation:
${getRecentConversationText(recentConversation, 6) || "No recent conversation."}

User message:
${stripInstructionText(userMessage)}

Routing rules:
- Schedule questions → use Schedule only.
- Income questions → use Income Hub only.
- Wallet or money-on-hand questions → use Wallets only.
- Budget questions → use Budgets only.
- Debt, obligation, payable, loan, or utang questions → use Debt / Obligations only.
- Savings goal questions → use Savings Goals only.
- Emergency fund questions → use Emergency Fund only.
- Recent spending, transaction, transfer, or activity questions → use Transactions only.
- Dashboard/card questions → use Dashboard Cards only.
- Memory, profile, habits, preferences, or "what do you know about me" → use Memory only.
- If the user says "break down", "details", "show more", or "explain", connect it to the latest active topic in recent conversation.
- If there is no clear latest topic, ask one clarification question.

Answer rules:
- Be direct.
- Use only facts from the selected bucket.
- Never invent numbers.
- Never say you checked a module if the data is not available.
- Ask only one question when clarification is needed.

${PRESENTATION_RULES}`;
}

function buildDeepDecisionAiPrompt({ userMessage = "", mode = "", fullContext = {}, recentConversation = [] } = {}) {
  return `You are CLARA, a personal money coach inside the CLARA app.

This is DEEP DECISION mode.

Use full CLARA context because the user is asking for one of these:
- Buy Check / Can I Afford This
- Future Money Forecast
- Analytics / Spending Checkup

Selected mode:
${mode || "Typed deep decision request"}

User message:
${stripInstructionText(userMessage)}

Recent conversation:
${getRecentConversationText(recentConversation, 6) || "No recent conversation."}

Full CLARA context:
${safeStringifyForPrompt(fullContext)}

Rules:
- Use all relevant context for decision, forecast, or analysis.
- You may compare income, wallets, budgets, transactions, savings goals, emergency fund, debt, obligations, schedule, memory, behavior, and risk signals.
- Do not invent missing data.
- If purchase details are missing in Buy Check, ask for item and amount.
- If forecast period is missing, ask for the period.
- If analytics scope is missing, ask what the user wants analyzed.
- If the intent is unclear, ask one short clarification question.
- Keep the answer practical and mobile-friendly.

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
  if (!reply) return true;
  if (reply.length < 18) return true;
  if (/[,:;\-–—]$/.test(reply)) return true;
  if (/\b(and|but|because|so|while|with|for|to|if|unless|before|after|about|around)$/i.test(reply)) return true;
  return false;
}

function buildCompletionRetryPrompt({ originalPrompt = "", incompleteReply = "" } = {}) {
  return `${originalPrompt}

IMPORTANT COMPLETION REPAIR:
The previous response was incomplete and must not be shown to the user:
"${cleanText(incompleteReply)}"

Write a new complete CLARA reply from scratch.
Rules:
- Do not continue the broken sentence.
- Do not stop mid-sentence.
- Use 2-4 complete conversational sentences.
- If wallet or budget data is missing, say that clearly and ask one helpful next question.
- End with a complete sentence and punctuation.`;
}

async function requestGeminiText({ model, prompt, signal, generationConfig } = {}) {
  return requestClaraGeminiProxyText({
    prompt,
    model,
    signal,
    generationConfig: {
      temperature: 0.55,
      topP: 0.86,
      maxOutputTokens: 520,
      ...(generationConfig || {}),
    },
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

      const retryText = await requestGeminiText({
        model,
        prompt: buildCompletionRetryPrompt({ originalPrompt: prompt, incompleteReply: text }),
        signal,
      });

      if (retryText && !isIncompleteClaraReply(retryText)) return retryText;

      lastError = new Error(`Gemini returned incomplete CLARA reply using ${model}.`);
      lastError.model = model;
      lastError.partialReply = retryText || text;
    } catch (error) {
      if (shouldDebugClaraAi()) {
        console.warn("[CLARA Gemini Routing] Proxy model failed", {
          mode,
          model,
          message: error?.message,
          status: error?.status,
        });
      }
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

  if (DIRECT_PROMPT_MODES.has(normalizedMode)) {
    return requestPromptWithRetry({ prompt: message, mode: normalizedMode, signal });
  }

  const aiMode = getClaraAiMode({ mode: normalizedMode, userMessage: visibleUserMessage });

  if (shouldDebugClaraAi()) {
    console.log("[CLARA Gemini Routing] Selected mode", {
      mode: normalizedMode,
      aiMode,
      visibleUserMessage,
    });
  }

  if (aiMode === "direct_prompt") {
    return requestPromptWithRetry({
      prompt: buildDirectPrompt({ message, conversationHistory }),
      mode: normalizedMode,
      signal,
    });
  }

  if (aiMode === "deep_decision") {
    return requestPromptWithRetry({
      prompt: buildDeepDecisionAiPrompt({
        userMessage: visibleUserMessage,
        mode: normalizedMode,
        fullContext: context,
        recentConversation: conversationHistory,
      }),
      mode: normalizedMode || "deep_decision",
      signal,
    });
  }

  return requestPromptWithRetry({
    prompt: buildNormalChatAiPrompt({
      userMessage: visibleUserMessage,
      recentConversation: conversationHistory,
      dataMap: buildNormalChatDataMap(context),
    }),
    mode: normalizedMode || "normal_chat",
    signal,
  });
}

export async function refineClaraSupportMessageWithGemini({ topic, message }) {
  return `Topic: ${topic || "General"}\n\n${cleanText(message)}`;
}
