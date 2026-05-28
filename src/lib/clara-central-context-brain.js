import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";
import { readUniversalMemoryProfile } from "@/lib/clara-universal-memory-profile";
import { readUserContextStory } from "@/lib/clara-user-context-story";

const CONTEXT_SOURCE_NAMES = [
  "CLARA_core_identity",
  "daily_money_tip",
  "learning_hub_progress",
  "dashboard_cards_carousel",
  "money_summary",
  "transaction_history",
  "wallet_balance",
  "wallet_list",
  "budget_summary",
  "budget_categories",
  "recent_expenses",
  "monthly_spending",
  "planned_vs_unplanned_spending",
  "savings_goals",
  "emergency_fund",
  "income",
  "wallet_transactions",
  "transfers",
  "Me_summary_profile",
  "life_stage_snapshot_signals",
  "dominant_pressure",
  "recommended_next_moves",
  "schedule_events",
  "weather",
  "current_time",
  "location",
  "previous_conversation_memory",
  "user_message_history",
  "universal_memory_profile",
  "user_context_story",
];

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isEmptyValue(value) {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function contextEntry(value) {
  if (value === undefined || value === null) {
    return { status: "not_available", value: null };
  }

  if (isEmptyValue(value)) {
    return { status: "empty", value: Array.isArray(value) ? [] : value };
  }

  return { status: "available", value };
}

function memoryContextEntry(value) {
  if (!value) return contextEntry(null);
  if (Number(value.bulletCount || 0) > 0 || value.essay || Number(value.sectionCount || 0) > 0) return contextEntry(value);
  return { status: "empty", value };
}

function firstAvailable(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getPath(source, path) {
  if (!source || !path) return undefined;

  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, source);
}

function hasPath(source, path) {
  if (!source || !path) return false;

  const parts = path.split(".");
  let current = source;

  for (const key of parts) {
    if (current === undefined || current === null) return false;
    if (!Object.prototype.hasOwnProperty.call(Object(current), key)) return false;
    current = current[key];
  }

  return true;
}

function firstPath(source, paths = []) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function firstExistingPath(source, paths = []) {
  for (const path of paths) {
    if (hasPath(source, path)) return getPath(source, path);
  }

  return undefined;
}

function shortMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null;
}

function summarizeBudgets(budgets = []) {
  return (Array.isArray(budgets) ? budgets : []).map((budget) => ({
    name: budget.name || budget.category || "Budget",
    allocated: budget.allocated ?? null,
    spent: budget.spent ?? null,
    remaining: budget.remaining ?? null,
  }));
}

function summarizeWallets(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).map((wallet) => ({
    id: wallet.id || wallet.name,
    name: wallet.name || "Wallet",
    balance: wallet.balance ?? null,
  }));
}

function summarizeExpenses(expenses = [], limit = 12) {
  return (Array.isArray(expenses) ? expenses : []).slice(0, limit).map((expense) => ({
    id: expense.id,
    amount: expense.amount ?? null,
    category: expense.category || "Expense",
    merchant: expense.merchant || "",
    date: expense.date || "",
    planned: expense.isPlanned ?? null,
  }));
}

function summarizeGoals(goals = []) {
  return (Array.isArray(goals) ? goals : []).map((goal) => ({
    id: goal.id || goal.name,
    name: goal.name || "Savings goal",
    saved: goal.saved ?? null,
    target: goal.target ?? null,
    percent: goal.percent ?? null,
  }));
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

export function getClaraCoreIdentity() {
  return {
    product_name: "CLARA: Personal Money Coach",
    tagline: "Normalize budgeting, ask before you spend.",
    identity: "A warm, behavior-first personal money coach that helps users pause before spending.",
    principles: [
      "Ask before you spend",
      "No shame, only clarity",
      "Protect essentials first",
      "Use money decisions to build better habits",
      "Help the user think, not just track",
    ],
    tone: ["warm", "practical", "emotionally aware", "non-shaming", "clear", "human"],
  };
}

export function collectClaraAvailableContext(context = {}) {
  const source = context || {};
  const snapshot = buildClaraFinanceSnapshot(source);
  const lifeStageContext = firstAvailable(
    source.lifeStageContext,
    source.lifeStageAiContext,
    source.meLifeStageProfile,
    buildClaraLifeStageAiContext()
  );

  const dailyMoneyTip = firstPath(source, [
    "dailyMoneyTip",
    "daily_money_tip",
    "dashboard.dailyMoneyTip",
    "moneyTip",
    "tipOfTheDay",
  ]);

  const learningHubProgress = firstPath(source, [
    "learningHubProgress",
    "learning_hub_progress",
    "learning.progress",
    "booksProgress",
    "readBooks",
  ]);

  const dashboardCards = firstPath(source, [
    "dashboardCardsCarousel",
    "dashboard_cards_carousel",
    "dashboardCards",
    "cardsCarousel",
    "cards",
  ]);

  const moneySummary = firstPath(source, [
    "moneySummary",
    "money_summary",
    "dashboard.moneySummary",
    "finance.moneySummary",
  ]) || {
    availableMoney: snapshot.availableMoney,
    totalWalletBalance: snapshot.totalWalletBalance,
    monthlySpent: snapshot.monthlySpent,
    budgetAllocated: snapshot.budgetAllocated,
    budgetSpent: snapshot.budgetSpent,
    budgetRemaining: snapshot.budgetRemaining,
    savingsSaved: snapshot.savingsSaved,
    savingsTarget: snapshot.savingsTarget,
    income: snapshot.income,
  };

  const transactionHistory = firstPath(source, [
    "transactionHistory",
    "transaction_history",
    "transactionsHistory",
    "transactions",
  ]) || snapshot.expenses;

  const scheduleEvents = firstPath(source, [
    "scheduleEvents",
    "schedule_events",
    "calendarEvents",
    "events",
    "schedule.items",
  ]);

  const previousConversationMemory = firstPath(source, [
    "previousConversationMemory",
    "previous_conversation_memory",
    "conversationMemory",
    "memory.previousConversation",
  ]);

  const userMessageHistory = firstPath(source, [
    "userMessageHistory",
    "user_message_history",
    "conversationHistory",
    "messages",
  ]);

  const explicitMeSummaryProfile = firstExistingPath(source, [
    "Me_summary_profile",
    "meSummaryProfile",
    "me_summary_profile",
    "profile.Me_summary_profile",
    "profile.meSummaryProfile",
  ]);

  const explicitSnapshotSignals = firstExistingPath(source, [
    "life_stage_snapshot_signals",
    "lifeStageSnapshotSignals",
    "lifeStageContext.snapshotTopSignals",
    "lifeStageAiContext.snapshotTopSignals",
    "meLifeStageProfile.snapshotTopSignals",
  ]);

  const explicitDominantPressure = firstExistingPath(source, [
    "dominant_pressure",
    "dominantPressure",
    "lifeStageContext.dominantPressure",
    "lifeStageAiContext.dominantPressure",
    "meLifeStageProfile.dominantPressure",
  ]);

  const explicitRecommendedNextMoves = firstExistingPath(source, [
    "recommended_next_moves",
    "recommendedNextMoves",
    "lifeStageContext.recommendedNextMoves",
    "lifeStageAiContext.recommendedNextMoves",
    "meLifeStageProfile.recommendedNextMoves",
  ]);

  const explicitUniversalMemoryProfile = firstExistingPath(source, [
    "universal_memory_profile",
    "universalMemoryProfile",
    "memory.universal_memory_profile",
    "memory.universalMemoryProfile",
  ]);

  const explicitUserContextStory = firstExistingPath(source, [
    "user_context_story",
    "userContextStory",
    "contextStory",
    "story.user_context_story",
    "memory.user_context_story",
  ]);

  const meSummaryProfile = explicitMeSummaryProfile !== undefined
    ? explicitMeSummaryProfile
    : lifeStageContext?.hasProfile
      ? lifeStageContext.profileAnswers
      : null;

  const lifeStageSnapshotSignals = explicitSnapshotSignals !== undefined
    ? explicitSnapshotSignals
    : lifeStageContext?.snapshotTopSignals || [];

  const dominantPressure = explicitDominantPressure !== undefined
    ? explicitDominantPressure
    : lifeStageContext?.dominantPressure || null;

  const recommendedNextMoves = explicitRecommendedNextMoves !== undefined
    ? explicitRecommendedNextMoves
    : lifeStageContext?.recommendedNextMoves || [];

  const universalMemoryProfile = explicitUniversalMemoryProfile !== undefined
    ? explicitUniversalMemoryProfile
    : readUniversalMemoryProfile();

  const userContextStory = explicitUserContextStory !== undefined
    ? explicitUserContextStory
    : readUserContextStory();

  return {
    CLARA_core_identity: contextEntry(getClaraCoreIdentity()),
    daily_money_tip: contextEntry(dailyMoneyTip),
    learning_hub_progress: contextEntry(learningHubProgress),
    dashboard_cards_carousel: contextEntry(dashboardCards),
    money_summary: contextEntry(moneySummary),
    transaction_history: contextEntry(transactionHistory),
    wallet_balance: contextEntry(
      snapshot.availableMoney !== null || snapshot.totalWalletBalance !== null
        ? {
            availableMoney: snapshot.availableMoney,
            availableMoneyText: shortMoney(snapshot.availableMoney),
            totalWalletBalance: snapshot.totalWalletBalance,
            totalWalletBalanceText: shortMoney(snapshot.totalWalletBalance),
          }
        : null
    ),
    wallet_list: contextEntry(summarizeWallets(snapshot.wallets)),
    budget_summary: contextEntry(
      snapshot.budgetAllocated !== null || snapshot.budgetSpent !== null || snapshot.budgetRemaining !== null
        ? {
            allocated: snapshot.budgetAllocated,
            allocatedText: shortMoney(snapshot.budgetAllocated),
            spent: snapshot.budgetSpent,
            spentText: shortMoney(snapshot.budgetSpent),
            remaining: snapshot.budgetRemaining,
            remainingText: shortMoney(snapshot.budgetRemaining),
            pressure: snapshot.budgetPressure,
            hasActiveBudgetPlan: snapshot.hasActiveBudgetPlan,
          }
        : null
    ),
    budget_categories: contextEntry(summarizeBudgets(snapshot.budgets)),
    recent_expenses: contextEntry(summarizeExpenses(snapshot.currentMonthExpenses?.length ? snapshot.currentMonthExpenses : snapshot.expenses)),
    monthly_spending: contextEntry(
      snapshot.monthlySpent !== null
        ? {
            amount: snapshot.monthlySpent,
            amountText: shortMoney(snapshot.monthlySpent),
            label: snapshot.monthlySpentLabel,
            topCategory: snapshot.topSpendingCategory || null,
          }
        : null
    ),
    planned_vs_unplanned_spending: contextEntry(
      snapshot.plannedSpent !== null || snapshot.unplannedSpent !== null
        ? {
            plannedSpent: snapshot.plannedSpent,
            plannedSpentText: shortMoney(snapshot.plannedSpent),
            unplannedSpent: snapshot.unplannedSpent,
            unplannedSpentText: shortMoney(snapshot.unplannedSpent),
          }
        : null
    ),
    savings_goals: contextEntry(summarizeGoals(snapshot.savingsGoals)),
    emergency_fund: contextEntry(snapshot.emergencyFund),
    income: contextEntry(snapshot.income !== null ? { amount: snapshot.income, amountText: shortMoney(snapshot.income) } : null),
    wallet_transactions: contextEntry(snapshot.walletTransactions),
    transfers: contextEntry(snapshot.transfers),
    Me_summary_profile: contextEntry(meSummaryProfile),
    life_stage_snapshot_signals: contextEntry(lifeStageSnapshotSignals),
    dominant_pressure: contextEntry(dominantPressure),
    recommended_next_moves: contextEntry(recommendedNextMoves),
    schedule_events: contextEntry(scheduleEvents),
    weather: contextEntry(firstPath(source, ["weather", "currentWeather", "weatherContext"])),
    current_time: contextEntry(firstPath(source, ["currentTime", "current_time", "timeContext"])),
    location: contextEntry(firstPath(source, ["location", "userLocation", "locationContext"])),
    previous_conversation_memory: contextEntry(previousConversationMemory),
    user_message_history: contextEntry(userMessageHistory),
    universal_memory_profile: memoryContextEntry(universalMemoryProfile),
    user_context_story: memoryContextEntry(userContextStory),
  };
}

export function buildClaraContextDiagnostics(context = {}) {
  const availableContext = collectClaraAvailableContext(context);
  const available_sources = [];
  const empty_sources = [];
  const missing_sources = [];
  const ai_ready_sources = [];
  const diagnostic_notes = [];

  for (const sourceName of CONTEXT_SOURCE_NAMES) {
    const entry = availableContext[sourceName] || { status: "not_available", value: null };

    if (entry.status === "available") {
      available_sources.push(sourceName);
      ai_ready_sources.push(sourceName);
      diagnostic_notes.push(`${sourceName} is available`);
    } else if (entry.status === "empty") {
      empty_sources.push(sourceName);
      diagnostic_notes.push(`${sourceName} exists but is empty`);
    } else {
      missing_sources.push(sourceName);
      diagnostic_notes.push(`${sourceName} is not connected yet`);
    }
  }

  return {
    available_sources,
    empty_sources,
    missing_sources,
    ai_ready_sources,
    diagnostic_notes,
  };
}

export function buildContextSelectorPrompt(userMessage = "", context = {}) {
  const diagnostics = buildClaraContextDiagnostics(context);

  return `You are CLARA’s Context + Emotion Selector.

Your job is NOT to answer the user yet.

Your job is to decide what CLARA needs to understand before answering.

User asked:
"${String(userMessage || "").trim()}"

CLARA core identity:
${safeJson(getClaraCoreIdentity())}

Available context sources and status:
${safeJson(diagnostics)}

Available context source names:
${CONTEXT_SOURCE_NAMES.map((name) => `- ${name}`).join("\n")}

Return JSON only:

{
  "intent": "",
  "needed_context": [],
  "missing_questions": [],
  "emotional_signal": "",
  "emotional_mode": "",
  "empathy_style": "",
  "risk_level": "",
  "decision_mode": "",
  "answer_strategy": "",
  "response_style": ""
}

Rules:
- Do not answer the user.
- Choose only relevant context sources.
- Prefer available sources over missing sources.
- If important context is missing, include that in missing_questions or answer_strategy.
- emotional_signal means what the user may be feeling.
- emotional_mode means how CLARA should emotionally respond.
- empathy_style means the exact kind of empathy CLARA should show.
- decision_mode should be one of: ask_follow_up, answer_with_guidance, warn_user, reassure_user, explain, log_or_confirm_action.
- response_style should describe final tone and length.
- Include user_context_story whenever the message involves behavior, emotion, repeated patterns, decisions, motivation, relationships, or life pressure.
- Use universal_memory_profile when categorized long-term memory can improve personalization.`;
}

export function buildFinalClaraPrompt(userMessage = "", selectorResult = {}, selectedContext = {}) {
  return `You are CLARA, a warm behavioral money coach.

CLARA core identity:
${safeJson(getClaraCoreIdentity())}

User asked:
"${String(userMessage || "").trim()}"

Context Selector result:
${safeJson(selectorResult || {})}

Selected user context:
${safeJson(selectedContext || {})}

Instructions:
- Answer naturally as CLARA.
- Do not sound robotic.
- Do not sound like a static template.
- Use the selected context only when useful.
- If important information is missing, ask one clear follow-up question instead of giving a fake yes/no.
- For money decisions, include recommendation, short reason, and next step.
- Use empathy before advice when emotional_signal is present.
- Never shame the user.
- Never stop mid-sentence.
- End with a complete sentence.

Final answer to user:`;
}
