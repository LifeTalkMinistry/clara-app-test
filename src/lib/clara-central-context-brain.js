import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";
import { readUserContextStory } from "@/lib/clara-user-context-story";
import { getAvailableCabinetNames, searchMultipleMemoryCabinets } from "@/lib/memory-cabinets";

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
  "live_conversation_history",
  "conversation_memory_summarizer",
  "memory_cabinet_router",
  "routed_memory_cabinets",
  "user_context_story",
];

const DIAGNOSTIC_CABINET_HINTS = [
  { terms: ["spend", "spent", "buy", "bili", "order", "food", "coffee", "shopping", "gastos", "expense", "leak"], cabinets: ["Spending Memory", "Decision Memory"] },
  { terms: ["budget", "limit", "allocation", "category", "left"], cabinets: ["Budget Memory"] },
  { terms: ["wallet", "cash", "gcash", "maya", "bank", "balance"], cabinets: ["Wallet Memory"] },
  { terms: ["goal", "save", "saving", "target", "ipon"], cabinets: ["Goal Memory"] },
  { terms: ["emergency", "buffer", "survival", "safety"], cabinets: ["Emergency Memory"] },
  { terms: ["debt", "utang", "loan", "payable", "obligation"], cabinets: ["Debt Memory"] },
  { terms: ["schedule", "shift", "work", "after work", "payday", "routine", "sleep", "night"], cabinets: ["Schedule Memory"] },
  { terms: ["stress", "sad", "tired", "emotion", "lonely", "burnout", "drained", "happy", "reward"], cabinets: ["Emotional Memory"] },
  { terms: ["lifestyle", "habit", "routine", "family", "partner", "friends", "social"], cabinets: ["Lifestyle Memory", "Relationship Memory"] },
  { terms: ["decide", "decision", "should i", "can i", "afford", "choose"], cabinets: ["Decision Memory"] },
  { terms: ["learn", "lesson", "understand", "teach", "explain"], cabinets: ["Learning Memory"] },
  { terms: ["prefer", "tone", "style", "remind", "guidance"], cabinets: ["Preference Memory"] },
  { terms: ["relationship", "partner", "family", "coworker", "friend", "conflict"], cabinets: ["Relationship Memory"] },
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
  if (value === undefined || value === null) return { status: "not_available", value: null };
  if (isEmptyValue(value)) return { status: "empty", value: Array.isArray(value) ? [] : value };
  return { status: "available", value };
}

function memoryContextEntry(value) {
  if (!value) return contextEntry(null);
  if (Number(value.bulletCount || 0) > 0 || value.essay || Number(value.sectionCount || 0) > 0) return contextEntry(value);
  return { status: "empty", value };
}

function connectedContextEntry(value = {}) {
  return { status: "available", value };
}

function routedMemoryContextEntry(value = {}) {
  if (Number(value.memoryCount || 0) > 0) return contextEntry(value);
  return { status: "empty", value };
}

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstAvailable(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getPath(source, path) {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
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

function readLiveConversationHistoryFromWindow() {
  if (typeof window === "undefined") return [];
  try {
    const bridgeMessages = window.CLARA_BEHAVIORAL_MEMORY?.readLiveUserMessageHistory?.() || [];
    if (Array.isArray(bridgeMessages) && bridgeMessages.length) return bridgeMessages;
  } catch {}
  try {
    const parsed = JSON.parse(window.sessionStorage?.getItem("CLARA_LIVE_USER_MESSAGE_HISTORY") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function lastUserMessageFromHistory(messages = []) {
  if (!Array.isArray(messages)) return "";
  const last = [...messages].reverse().find((message) => cleanText(message?.text || message?.content || message?.message));
  return cleanText(last?.text || last?.content || last?.message);
}

function selectDiagnosticCabinetsForMessage(message = "") {
  const text = cleanText(message).toLowerCase();
  const selected = new Set();
  DIAGNOSTIC_CABINET_HINTS.forEach((hint) => {
    if (hint.terms.some((term) => text.includes(term))) hint.cabinets.forEach((cabinet) => selected.add(cabinet));
  });
  if (!selected.size) {
    selected.add("Spending Memory");
    selected.add("Emotional Memory");
    selected.add("Decision Memory");
  }
  return Array.from(selected).slice(0, 5);
}

function buildRoutedMemoryCabinetContext(userConcern = "") {
  const concern = cleanText(userConcern);
  const openCabinets = selectDiagnosticCabinetsForMessage(concern);
  try {
    const memories = searchMultipleMemoryCabinets(openCabinets, concern, 5);
    return {
      connected: true,
      route: {
        open_cabinets: openCabinets,
        reason: concern ? "Diagnostic routed memory cabinets from the current user concern." : "No current concern was available, so CLARA used the safe default memory route.",
      },
      memories,
      memoryCount: memories.length,
      note: memories.length ? "CLARA can pull relevant summaries from the routed memory cabinets." : "Memory cabinet routing is connected, but no saved cabinet summaries matched this concern yet.",
    };
  } catch (error) {
    return { connected: false, route: { open_cabinets: openCabinets, reason: "Memory cabinet search failed during diagnostic." }, memories: [], memoryCount: 0, error: cleanText(error?.message) };
  }
}

function shortMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null;
}

function summarizeBudgets(budgets = []) {
  return (Array.isArray(budgets) ? budgets : []).map((budget) => ({
    id: budget.id || budget.key || budget.name || budget.category,
    name: budget.name || budget.category || budget.title || "Budget",
    allocated: budget.allocated ?? null,
    allocatedText: shortMoney(budget.allocated),
    spent: budget.spent ?? null,
    spentText: shortMoney(budget.spent),
    remaining: budget.remaining ?? null,
    remainingText: shortMoney(budget.remaining),
  }));
}

function summarizeWallets(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).map((wallet) => ({ id: wallet.id || wallet.name, name: wallet.name || "Wallet", balance: wallet.balance ?? null }));
}

function summarizeExpenses(expenses = [], limit = 12) {
  return (Array.isArray(expenses) ? expenses : []).slice(0, limit).map((expense) => ({ id: expense.id, amount: expense.amount ?? null, category: expense.category || "Expense", merchant: expense.merchant || "", date: expense.date || "", planned: expense.isPlanned ?? null }));
}

function summarizeGoals(goals = []) {
  return (Array.isArray(goals) ? goals : []).map((goal) => ({ id: goal.id || goal.name, name: goal.name || "Savings goal", saved: goal.saved ?? null, target: goal.target ?? null, percent: goal.percent ?? null }));
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

export function getClaraCoreIdentity() {
  return {
    product_name: "CLARA: Personal Money Coach",
    tagline: "Normalize budgeting, ask before you spend.",
    identity: "A warm, behavior-first personal money coach that helps users pause before spending.",
    principles: ["Ask before you spend", "No shame, only clarity", "Protect essentials first", "Use money decisions to build better habits", "Help the user think, not just track"],
    tone: ["warm", "practical", "emotionally aware", "non-shaming", "clear", "human"],
  };
}

export function collectClaraAvailableContext(context = {}) {
  const source = context || {};
  const snapshot = buildClaraFinanceSnapshot(source);
  const budgetPlan = snapshot.budgetPlan || {};
  const lifeStageContext = firstAvailable(source.lifeStageContext, source.lifeStageAiContext, source.meLifeStageProfile, buildClaraLifeStageAiContext());
  const dailyMoneyTip = firstPath(source, ["dailyMoneyTip", "daily_money_tip", "dashboard.dailyMoneyTip", "moneyTip", "tipOfTheDay"]);
  const learningHubProgress = firstPath(source, ["learningHubProgress", "learning_hub_progress", "learning.progress", "booksProgress", "readBooks"]);
  const dashboardCards = firstPath(source, ["dashboardCardsCarousel", "dashboard_cards_carousel", "dashboardCards", "cardsCarousel", "cards"]);
  const moneySummary = firstPath(source, ["moneySummary", "money_summary", "dashboard.moneySummary", "finance.moneySummary"]) || {
    availableMoney: snapshot.availableMoney,
    totalWalletBalance: snapshot.totalWalletBalance,
    monthlySpent: snapshot.monthlySpent,
    budgetAllocated: snapshot.budgetAllocated,
    budgetSpent: snapshot.budgetSpent,
    budgetRemaining: snapshot.budgetRemaining,
    budgetPlan,
    savingsSaved: snapshot.savingsSaved,
    savingsTarget: snapshot.savingsTarget,
    income: snapshot.income,
  };
  const transactionHistory = firstPath(source, ["transactionHistory", "transaction_history", "transactionsHistory", "transactions"]) || snapshot.expenses;
  const scheduleEvents = firstPath(source, ["scheduleEvents", "schedule_events", "calendarEvents", "events", "schedule.items"]);
  const explicitLiveConversationHistory = firstExistingPath(source, ["live_conversation_history", "liveConversationHistory", "userMessageHistory", "user_message_history", "conversationHistory", "messages"]);
  const liveConversationHistory = explicitLiveConversationHistory !== undefined ? explicitLiveConversationHistory : readLiveConversationHistoryFromWindow();
  const currentUserMessage = firstPath(source, ["currentUserMessage", "userMessage", "message", "prompt", "current_message"]) || lastUserMessageFromHistory(liveConversationHistory);
  const routedMemoryCabinets = buildRoutedMemoryCabinetContext(currentUserMessage);
  const explicitMeSummaryProfile = firstExistingPath(source, ["Me_summary_profile", "meSummaryProfile", "me_summary_profile", "profile.Me_summary_profile", "profile.meSummaryProfile"]);
  const explicitSnapshotSignals = firstExistingPath(source, ["life_stage_snapshot_signals", "lifeStageSnapshotSignals", "lifeStageContext.snapshotTopSignals", "lifeStageAiContext.snapshotTopSignals", "meLifeStageProfile.snapshotTopSignals"]);
  const explicitDominantPressure = firstExistingPath(source, ["dominant_pressure", "dominantPressure", "lifeStageContext.dominantPressure", "lifeStageAiContext.dominantPressure", "meLifeStageProfile.dominantPressure"]);
  const explicitRecommendedNextMoves = firstExistingPath(source, ["recommended_next_moves", "recommendedNextMoves", "lifeStageContext.recommendedNextMoves", "lifeStageAiContext.recommendedNextMoves", "meLifeStageProfile.recommendedNextMoves"]);
  const explicitUserContextStory = firstExistingPath(source, ["user_context_story", "userContextStory", "contextStory", "story.user_context_story", "memory.user_context_story"]);
  const meSummaryProfile = explicitMeSummaryProfile !== undefined ? explicitMeSummaryProfile : lifeStageContext?.hasProfile ? lifeStageContext.profileAnswers : null;
  const lifeStageSnapshotSignals = explicitSnapshotSignals !== undefined ? explicitSnapshotSignals : lifeStageContext?.snapshotTopSignals || [];
  const dominantPressure = explicitDominantPressure !== undefined ? explicitDominantPressure : lifeStageContext?.dominantPressure || null;
  const recommendedNextMoves = explicitRecommendedNextMoves !== undefined ? explicitRecommendedNextMoves : lifeStageContext?.recommendedNextMoves || [];
  const userContextStory = explicitUserContextStory !== undefined ? explicitUserContextStory : readUserContextStory();
  const budgetSummary = budgetPlan.hasDeclaredBudget || budgetPlan.spentTotal > 0 || budgetPlan.categoryCount > 0 ? {
    declaredBudget: budgetPlan.declaredBudget,
    declaredBudgetText: shortMoney(budgetPlan.declaredBudget),
    allocatedBudget: budgetPlan.allocatedBudget,
    allocatedBudgetText: shortMoney(budgetPlan.allocatedBudget),
    unallocatedBudget: budgetPlan.unallocatedBudget,
    unallocatedBudgetText: shortMoney(budgetPlan.unallocatedBudget),
    spentTotal: budgetPlan.spentTotal,
    spentTotalText: shortMoney(budgetPlan.spentTotal),
    remainingSpendableBudget: budgetPlan.remainingSpendableBudget,
    remainingSpendableBudgetText: shortMoney(budgetPlan.remainingSpendableBudget),
    categoryCount: budgetPlan.categoryCount,
    budgetStatus: budgetPlan.budgetStatus,
    budgetExplanation: budgetPlan.budgetExplanation,
  } : null;

  return {
    CLARA_core_identity: contextEntry(getClaraCoreIdentity()),
    daily_money_tip: contextEntry(dailyMoneyTip),
    learning_hub_progress: contextEntry(learningHubProgress),
    dashboard_cards_carousel: contextEntry(dashboardCards),
    money_summary: contextEntry(moneySummary),
    transaction_history: contextEntry(transactionHistory),
    wallet_balance: contextEntry(snapshot.availableMoney !== null || snapshot.totalWalletBalance !== null ? { availableMoney: snapshot.availableMoney, availableMoneyText: shortMoney(snapshot.availableMoney), totalWalletBalance: snapshot.totalWalletBalance, totalWalletBalanceText: shortMoney(snapshot.totalWalletBalance) } : null),
    wallet_list: contextEntry(summarizeWallets(snapshot.wallets)),
    budget_summary: contextEntry(budgetSummary),
    budget_categories: contextEntry(summarizeBudgets(budgetPlan.hasBudgetCategories ? budgetPlan.categories : [])),
    recent_expenses: contextEntry(summarizeExpenses(snapshot.currentMonthExpenses?.length ? snapshot.currentMonthExpenses : snapshot.expenses)),
    monthly_spending: contextEntry(snapshot.monthlySpent !== null ? { amount: snapshot.monthlySpent, amountText: shortMoney(snapshot.monthlySpent), label: snapshot.monthlySpentLabel, topCategory: snapshot.topSpendingCategory || null } : null),
    planned_vs_unplanned_spending: contextEntry(snapshot.plannedSpent !== null || snapshot.unplannedSpent !== null ? { plannedSpent: snapshot.plannedSpent, plannedSpentText: shortMoney(snapshot.plannedSpent), unplannedSpent: snapshot.unplannedSpent, unplannedSpentText: shortMoney(snapshot.unplannedSpent), undocumentedSpent: snapshot.undocumentedSpent, undocumentedSpentText: shortMoney(snapshot.undocumentedSpent) } : null),
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
    live_conversation_history: contextEntry(liveConversationHistory),
    conversation_memory_summarizer: connectedContextEntry({ connected: true, note: "CLARA can summarize live conversations into stable long-term memory after the assistant session closes.", saves_to: ["user_context_story", "routed memory cabinets"] }),
    memory_cabinet_router: connectedContextEntry({ connected: true, available_cabinets: getAvailableCabinetNames(), note: "CLARA can choose the most relevant memory cabinets before retrieving long-term memory." }),
    routed_memory_cabinets: routedMemoryContextEntry(routedMemoryCabinets),
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
  return { available_sources, empty_sources, missing_sources, ai_ready_sources, diagnostic_notes };
}

export function buildContextSelectorPrompt(userMessage = "", context = {}) {
  const diagnostics = buildClaraContextDiagnostics({ ...(context || {}), currentUserMessage: userMessage });
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
- Use live_conversation_history for the current active chat when available.
- Use memory_cabinet_router and routed_memory_cabinets when saved long-term patterns can improve the answer.
- Include user_context_story whenever the message involves behavior, emotion, repeated patterns, decisions, motivation, relationships, or life pressure.
- Do not request universal_memory_profile. It is retired and replaced by user_context_story plus routed memory cabinets.`;
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
