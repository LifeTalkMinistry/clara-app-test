import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { supabase } from "@/lib/supabaseClient";
import {
  getBudgets,
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
  getWallets,
} from "@/lib/financeRepository";
import { buildClaraBridgeReadableContext } from "@/lib/clara-bridge-context-readers";
import { MEMORY_CABINET_DEFINITIONS, readMemoryCabinet } from "@/lib/memory-cabinets";

const ROUTER_STATE_KEY = "__CLARA_BUY_CHECK_STATIC_ROUTER_STATE__";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function percent(value = 0) {
  const number = Number(value) || 0;
  return `${number.toFixed(number >= 10 ? 0 : 1)}%`;
}

function safeJson(value, fallback = "Not available") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value) && !value.length) return fallback;
  if (typeof value === "string" && !clean(value)) return fallback;
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function extractPrice(text = "") {
  const match = clean(text).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function getStaticChat() {
  return document.querySelector("[data-clara-buy-check-static-chat]");
}

function getAssistantShell() {
  const chat = getStaticChat();
  return chat?.closest(".fixed") || null;
}

function getInput() {
  return getAssistantShell()?.querySelector("form input, form textarea") || null;
}

function setInputValue(input, value = "") {
  if (!input) return;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function getState() {
  const chat = getStaticChat();
  if (!chat) return null;

  const current = window[ROUTER_STATE_KEY];
  if (current?.active) return current;

  const state = {
    active: true,
    step: "item",
    item: "",
    price: 0,
    reason: "",
    busy: false,
    done: false,
  };
  window[ROUTER_STATE_KEY] = state;
  return state;
}

function resetState() {
  window[ROUTER_STATE_KEY] = null;
}

function appendBubble(role, text, options = {}) {
  const chat = getStaticChat();
  if (!chat) return null;

  const row = document.createElement("div");
  row.className = `clara-buy-check-static-bubble-row ${role === "user" ? "user" : "clara"}`;

  const bubble = document.createElement("div");
  bubble.className = `clara-buy-check-static-bubble ${role === "user" ? "user" : "clara"}`;

  if (options.html) bubble.innerHTML = options.html;
  else bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

  row.appendChild(bubble);
  chat.appendChild(row);

  const main = chat.closest("main");
  requestAnimationFrame(() => main?.scrollTo?.({ top: main.scrollHeight, behavior: "smooth" }));
  return row;
}

function appendOpeningIfMissing() {
  const chat = getStaticChat();
  if (!chat) return;

  const firstText = clean(chat.textContent);
  if (firstText.includes("Hi, Max! What do you want to buy?")) return;

  appendBubble("clara", "", {
    html: `<div class="clara-buy-check-message-title">Hi, Max! What do you want to buy?</div><div class="clara-buy-check-message-sub">Type the exact item first.</div><div class="clara-buy-check-message-example">Example: Running shoes</div>`,
  });
}

function inferCategory(item = "") {
  const text = clean(item).toLowerCase();
  if (/food|meal|jollibee|mcdo|mcdonald|coffee|milk tea|milktea|snack|restaurant|delivery|grabfood|panda|grocery|groceries/.test(text)) return "Food";
  if (/jeep|bus|taxi|grab|angkas|moveit|gas|fare|transport/.test(text)) return "Transportation";
  if (/rent|electric|water|internet|wifi|bill|load|subscription/.test(text)) return "Bills";
  if (/medicine|doctor|hospital|vitamin|health|checkup/.test(text)) return "Health";
  if (/shoe|shoes|sneaker|sneakers|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function normalizeCategory(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getWalletBalance(wallet = {}) {
  return toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? wallet.available_balance ?? wallet.starting_balance ?? 0);
}

function getExpenseAmount(expense = {}) {
  return toNumber(expense.amount ?? expense.total ?? expense.value ?? 0);
}

function getExpenseCategory(expense = {}) {
  return clean(expense.category || expense.category_name || expense.budget_category || expense.tag || "Uncategorized");
}

function getExpenseDate(expense = {}) {
  const date = new Date(expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getBudgetTitle(budget = {}) {
  return clean(budget.category || budget.name || budget.title || budget.label || budget.budget_category || "");
}

function getBudgetLimit(budget = {}) {
  return toNumber(budget.amount ?? budget.limit ?? budget.budget_amount ?? budget.allocated ?? budget.allocated_amount ?? budget.monthly_amount ?? budget.cap ?? 0);
}

function getGoalTitle(goal = {}) {
  return clean(goal.name || goal.title || goal.goal_name || goal.label || "Savings goal");
}

function getGoalSaved(goal = {}) {
  return toNumber(goal.saved_amount ?? goal.savedAmount ?? goal.current_amount ?? goal.currentAmount ?? goal.amount ?? 0);
}

function getGoalTarget(goal = {}) {
  return toNumber(goal.target_amount ?? goal.targetAmount ?? goal.target ?? goal.goal_amount ?? 0);
}

function getEmergencySaved(emergencyFund = {}) {
  return toNumber(emergencyFund?.saved_amount ?? emergencyFund?.savedAmount ?? emergencyFund?.currentAmount ?? emergencyFund?.current_amount ?? emergencyFund?.balance ?? emergencyFund?.protectedBalance ?? 0);
}

function getEmergencyTarget(emergencyFund = {}) {
  return toNumber(emergencyFund?.target_amount ?? emergencyFund?.targetAmount ?? emergencyFund?.target ?? emergencyFund?.goalAmount ?? 0);
}

function summarizeMemoryCabinets() {
  try {
    return MEMORY_CABINET_DEFINITIONS.map((definition) => ({
      cabinet: definition.name,
      records: readMemoryCabinet(definition.name)
        .slice(-20)
        .map((entry) => ({
          id: entry.id,
          summary: clean(entry.summary || entry.text || entry.content || entry.value || ""),
          signals: Array.isArray(entry.signals) ? entry.signals.slice(0, 6) : [],
          patternStrength: entry.patternStrength || "",
          occurrenceCount: entry.occurrenceCount || 1,
        }))
        .filter((entry) => entry.summary || entry.signals.length),
    })).filter((cabinet) => cabinet.records.length);
  } catch {
    return [];
  }
}

function pickMemoryEvidence(memoryCabinets = []) {
  return memoryCabinets
    .flatMap((cabinet) => cabinet.records.map((record) => ({ cabinet: cabinet.cabinet, ...record })))
    .filter((record) => record.summary || record.signals?.length)
    .sort((a, b) => Number(b.occurrenceCount || 1) - Number(a.occurrenceCount || 1))
    .slice(0, 8)
    .map((record) => ({
      cabinet: record.cabinet,
      summary: record.summary,
      signals: record.signals || [],
      strength: record.patternStrength || "",
      count: record.occurrenceCount || 1,
    }));
}

async function getLocalUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    return String(user?.id || user?.email || "local-user").trim() || "local-user";
  } catch {
    return "local-user";
  }
}

async function buildDiagnosisContext(state) {
  const localUserId = await getLocalUserId();
  const [wallets, budgets, expenses, savingsGoals, emergencyFund] = await Promise.all([
    getWallets(localUserId).catch(() => []),
    getBudgets(localUserId).catch(() => []),
    getExpenses(localUserId).catch(() => []),
    getSavingsGoals(localUserId).catch(() => []),
    getEmergencyFund(localUserId).catch(() => null),
  ]);

  const category = inferCategory(state.item);
  const categoryKey = normalizeCategory(category);
  const now = new Date();
  const currentMonthExpenses = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const categoryExpenses = currentMonthExpenses.filter((expense) => normalizeCategory(getExpenseCategory(expense)) === categoryKey);
  const matchingBudget = budgets.find((budget) => normalizeCategory(getBudgetTitle(budget)) === categoryKey) || null;
  const budgetLimit = matchingBudget ? getBudgetLimit(matchingBudget) : 0;
  const categorySpent = categoryExpenses.reduce((sum, expense) => sum + getExpenseAmount(expense), 0);
  const categoryRemaining = matchingBudget ? budgetLimit - categorySpent : null;
  const totalWalletBalance = wallets.reduce((sum, wallet) => sum + getWalletBalance(wallet), 0);
  const purchaseWalletPercentage = totalWalletBalance ? (state.price / totalWalletBalance) * 100 : null;
  const purchaseBudgetPercentage = categoryRemaining && categoryRemaining > 0 ? (state.price / categoryRemaining) * 100 : null;
  const similarPurchases = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    if (!date || (Date.now() - date.getTime()) / 86400000 > 45) return false;
    const text = `${expense.item || ""} ${expense.title || ""} ${expense.notes || ""} ${getExpenseCategory(expense)}`.toLowerCase();
    const firstWord = state.item.toLowerCase().split(" ")[0] || "";
    return (firstWord && text.includes(firstWord)) || normalizeCategory(getExpenseCategory(expense)) === categoryKey;
  }).slice(-20);
  const bridgeContext = buildClaraBridgeReadableContext({
    messages: [
      { role: "user", text: state.item },
      { role: "user", text: money(state.price) },
      { role: "user", text: state.reason },
    ],
  });
  const memoryCabinets = summarizeMemoryCabinets();
  const memoryEvidence = pickMemoryEvidence(memoryCabinets);
  const scheduleEvents = bridgeContext.scheduleEvents || [];
  const mePageContext = bridgeContext.Me_summary_profile || bridgeContext.meLifeStageProfile || bridgeContext.lifeStageContext || null;
  const emergencySaved = getEmergencySaved(emergencyFund || {});
  const emergencyTarget = getEmergencyTarget(emergencyFund || {});

  const evidenceSummary = {
    wallet: wallets.length
      ? {
          totalVisibleBalance: totalWalletBalance,
          purchaseShareOfVisibleBalance: purchaseWalletPercentage === null ? null : Number(purchaseWalletPercentage.toFixed(1)),
          walletCount: wallets.length,
          topWallets: wallets.slice(0, 5).map((wallet) => ({
            name: wallet.name || wallet.wallet_name || wallet.title || "Wallet",
            balance: getWalletBalance(wallet),
          })),
        }
      : "Not available",
    budget: matchingBudget
      ? {
          category: getBudgetTitle(matchingBudget),
          limit: budgetLimit,
          spentThisMonth: categorySpent,
          remaining: categoryRemaining,
          purchaseShareOfRemainingBudget: purchaseBudgetPercentage === null ? null : Number(purchaseBudgetPercentage.toFixed(1)),
        }
      : "No matching budget found",
    goalsAndEmergency: {
      emergencyFund: emergencyFund
        ? {
            current: emergencySaved,
            target: emergencyTarget,
            progressPercent: emergencyTarget ? Number(((emergencySaved / emergencyTarget) * 100).toFixed(1)) : null,
          }
        : "Not available",
      savingsGoals: savingsGoals.length
        ? savingsGoals.slice(0, 8).map((goal) => ({
            title: getGoalTitle(goal),
            saved: getGoalSaved(goal),
            target: getGoalTarget(goal),
          }))
        : "Not available",
    },
    spendingPattern: {
      currentMonthCategorySpend: categorySpent,
      similarPurchasesLast45Days: similarPurchases.map((expense) => ({
        amount: getExpenseAmount(expense),
        category: getExpenseCategory(expense),
        note: clean(expense.notes || expense.item || expense.title || ""),
        date: expense.date || expense.created_at || expense.createdAt || "",
      })),
      memoryEvidence: memoryEvidence.length ? memoryEvidence : "Not available",
    },
    scheduleAndProfile: {
      scheduleEvents: scheduleEvents.length ? scheduleEvents.slice(0, 8) : "Not available",
      mePageContext: mePageContext || "Not available",
    },
  };

  const financeContext = {
    wallets: wallets.slice(0, 12).map((wallet) => ({
      id: wallet.id,
      name: wallet.name || wallet.wallet_name || wallet.title || "Wallet",
      balance: getWalletBalance(wallet),
    })),
    totalWalletBalance,
    budgets: budgets.slice(0, 20).map((budget) => ({ title: getBudgetTitle(budget), limit: getBudgetLimit(budget) })),
    matchingBudget: matchingBudget ? {
      title: getBudgetTitle(matchingBudget),
      limit: budgetLimit,
      spentThisMonth: categorySpent,
      remaining: categoryRemaining,
    } : null,
    recentExpenses: currentMonthExpenses.slice(-30).map((expense) => ({
      amount: getExpenseAmount(expense),
      category: getExpenseCategory(expense),
      note: clean(expense.notes || expense.item || expense.title || ""),
      date: expense.date || expense.created_at || expense.createdAt || "",
    })),
    savingsGoals: savingsGoals.slice(0, 12),
    emergencyFund,
  };

  const dataReadStatus = {
    walletsLoaded: wallets.length,
    budgetsLoaded: budgets.length,
    expensesLoaded: expenses.length,
    savingsGoalsLoaded: savingsGoals.length,
    emergencyFundLoaded: Boolean(emergencyFund),
    scheduleLoaded: scheduleEvents.length > 0,
    meProfileLoaded: Boolean(mePageContext),
    memoryLoaded: memoryCabinets.length > 0,
  };

  const context = {
    dataReadStatus,
    purchaseSummary: {
      item: state.item,
      price: state.price,
      reason: state.reason,
      inferredCategory: category,
    },
    evidenceSummary,
    financeContext,
    scheduleContext: scheduleEvents,
    mePageContext,
    fullMemoryContext: {
      memoryCabinets,
      previousConversationMemory: bridgeContext.previousConversationMemory,
      userMessageHistory: bridgeContext.userMessageHistory,
    },
    timeContext: bridgeContext.currentTime,
  };

  window.__CLARA_LAST_BUY_CHECK_DATA_READ_STATUS__ = dataReadStatus;
  window.__CLARA_LAST_BUY_CHECK_CONTEXT__ = context;
  return context;
}

function localFallback(context) {
  const price = Number(context.purchaseSummary.price || 0);
  const walletEvidence = context.evidenceSummary.wallet;
  const budgetEvidence = context.evidenceSummary.budget;
  const emergencyEvidence = context.evidenceSummary.goalsAndEmergency?.emergencyFund;
  const goalsEvidence = context.evidenceSummary.goalsAndEmergency?.savingsGoals;
  const memoryEvidence = context.evidenceSummary.spendingPattern?.memoryEvidence;
  const scheduleProfile = context.evidenceSummary.scheduleAndProfile;
  const totalWalletBalance = Number(context.financeContext.totalWalletBalance || 0);
  const budgetRemaining = typeof budgetEvidence === "object" ? Number(budgetEvidence.remaining || 0) : null;
  const hasBudgetRoom = budgetRemaining !== null && price <= budgetRemaining;
  const hasWalletRoom = totalWalletBalance > 0 && price <= totalWalletBalance;
  const risk = !hasWalletRoom || (budgetRemaining !== null && !hasBudgetRoom) ? "High" : budgetRemaining === null || price > totalWalletBalance * 0.25 ? "Medium" : "Low";
  const decision = risk === "High" ? "WAIT" : risk === "Medium" ? "BUY WITH CAP" : "BUY";

  return `Decision: ${decision}

Risk: ${risk}

Why:
• Wallet: ${typeof walletEvidence === "object" ? `${money(price)} is ${percent(walletEvidence.purchaseShareOfVisibleBalance || 0)} of visible wallet balance from wallet records (${money(walletEvidence.totalVisibleBalance)}).` : "Not available."}
• Budget: ${typeof budgetEvidence === "object" ? `${budgetEvidence.category} has ${money(Math.max(0, budgetEvidence.remaining))} remaining; this purchase uses ${percent(budgetEvidence.purchaseShareOfRemainingBudget || 0)} of that room.` : "No matching budget found."}
• Goals/Emergency: ${typeof emergencyEvidence === "object" ? `Emergency fund is ${money(emergencyEvidence.current)} of ${money(emergencyEvidence.target)}${emergencyEvidence.progressPercent ? ` (${percent(emergencyEvidence.progressPercent)})` : ""}.` : "Emergency fund not available."} ${Array.isArray(goalsEvidence) ? `${goalsEvidence.length} savings goal(s) detected.` : "Savings goals not available."}
• Pattern/Memory: ${Array.isArray(memoryEvidence) && memoryEvidence.length ? memoryEvidence[0].summary : "No specific memory signal available."}
• Schedule/Profile: ${scheduleProfile?.scheduleEvents !== "Not available" ? "Schedule context detected." : "Schedule not available."} ${scheduleProfile?.mePageContext !== "Not available" ? "Me profile context detected." : "Me profile not available."}

Safer move:
${risk === "Low" ? "Buy only if it remains your priority, then log it immediately." : risk === "Medium" ? `If you buy it, cap yourself at ${money(price)} and avoid another discretionary purchase for the next 7 days.` : "Wait for now or choose a cheaper option that does not break your budget."}

One sentence from CLARA:
I checked this against the available wallet, budget, goals, schedule, profile, and memory context before giving the verdict.`;
}

function buildFullContextBuyCheckPrompt(context) {
  const finance = context.financeContext || {};
  const purchase = context.purchaseSummary || {};
  const status = context.dataReadStatus || {};

  return `You are CLARA.

You are performing a BUY CHECK.

Your job is NOT to be a shopping assistant.
Your job is to protect the user's financial goals, spending discipline, and long-term progress.

━━━━━━━━━━━━━━━━━━━
DATA READ CHECK
━━━━━━━━━━━━━━━━━━━

Wallets loaded:
${status.walletsLoaded ?? 0}

Budgets loaded:
${status.budgetsLoaded ?? 0}

Expenses loaded:
${status.expensesLoaded ?? 0}

Savings goals loaded:
${status.savingsGoalsLoaded ?? 0}

Emergency fund loaded:
${status.emergencyFundLoaded ? "Yes" : "No"}

Schedule loaded:
${status.scheduleLoaded ? "Yes" : "No"}

Me profile loaded:
${status.meProfileLoaded ? "Yes" : "No"}

Memory loaded:
${status.memoryLoaded ? "Yes" : "No"}

━━━━━━━━━━━━━━━━━━━
USER ANSWERS
━━━━━━━━━━━━━━━━━━━

Item:
${purchase.item || "Not available"}

Price:
${money(purchase.price || 0)}

Reason:
${purchase.reason || "Not available"}

Inferred category:
${purchase.inferredCategory || "Not available"}

━━━━━━━━━━━━━━━━━━━
WALLETS
━━━━━━━━━━━━━━━━━━━

Total visible wallet balance from wallet records:
${money(finance.totalWalletBalance || 0)}

Important:
Do not call this the user's full money unless wallet records are complete.

Wallet records:
${safeJson(finance.wallets)}

━━━━━━━━━━━━━━━━━━━
BUDGETS
━━━━━━━━━━━━━━━━━━━

Matching budget:
${safeJson(finance.matchingBudget)}

All budget records:
${safeJson(finance.budgets)}

━━━━━━━━━━━━━━━━━━━
SAVINGS GOALS
━━━━━━━━━━━━━━━━━━━

${safeJson(finance.savingsGoals)}

━━━━━━━━━━━━━━━━━━━
EMERGENCY FUND
━━━━━━━━━━━━━━━━━━━

${safeJson(finance.emergencyFund)}

━━━━━━━━━━━━━━━━━━━
RECENT EXPENSES
━━━━━━━━━━━━━━━━━━━

${safeJson(finance.recentExpenses)}

━━━━━━━━━━━━━━━━━━━
SCHEDULE
━━━━━━━━━━━━━━━━━━━

${safeJson(context.scheduleContext)}

━━━━━━━━━━━━━━━━━━━
ME PROFILE
━━━━━━━━━━━━━━━━━━━

${safeJson(context.mePageContext)}

━━━━━━━━━━━━━━━━━━━
MEMORY
━━━━━━━━━━━━━━━━━━━

${safeJson(context.fullMemoryContext)}

━━━━━━━━━━━━━━━━━━━
BUY CHECK RULES
━━━━━━━━━━━━━━━━━━━

Analyze:
1. Affordability
2. Budget impact
3. Savings impact
4. Emergency fund impact
5. Upcoming schedule impact
6. Historical spending behavior
7. User goals
8. User memory patterns

Do NOT give generic advice.
Reference actual numbers.
Reference actual memory when available.
Reference actual goals when available.
If a context area is missing, say Not available.
Do not invent wallet balance, budget room, goals, memory, schedule, or profile data.

━━━━━━━━━━━━━━━━━━━
REQUIRED RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━

Decision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE

Risk: Low | Medium | High

Why:
• Wallet: ...
• Budget: ...
• Goals/Emergency: ...
• Pattern/Memory: ...
• Schedule/Profile: ...

Safer move:
...

One sentence from CLARA:
...`;
}

async function runDiagnosis(state) {
  state.busy = true;
  appendBubble("clara", "Got it. I’m checking your wallet, budget, schedule, Me profile, goals, and memory now...");

  try {
    const context = await buildDiagnosisContext(state);
    const prompt = buildFullContextBuyCheckPrompt(context);
    window.__CLARA_LAST_BUY_CHECK_PROMPT__ = prompt;
    let reply = "";

    if (hasGeminiConfig()) {
      reply = await generateClaraGeminiReply({
        message: prompt,
        context,
        mode: "buy_check_full_context_diagnosis",
        conversationHistory: [
          { role: "user", text: context.purchaseSummary.item },
          { role: "user", text: money(context.purchaseSummary.price) },
          { role: "user", text: context.purchaseSummary.reason },
        ],
      });
    }

    appendBubble("clara", clean(reply) || localFallback(context));
  } catch (error) {
    console.warn("[CLARA Buy Check Router] Diagnosis failed", error);
    appendBubble("clara", "Decision: PAUSE\n\nRisk: Medium\n\nWhy:\n• Wallet: Not available.\n• Budget: Not available.\n• Goals/Emergency: Not available.\n• Pattern/Memory: Not available.\n• Schedule/Profile: Not available.\n\nSafer move:\nTry again in a moment before buying. CLARA should not approve a purchase when the diagnosis package is incomplete.\n\nOne sentence from CLARA:\nI need the full context package before I can responsibly approve this purchase.");
  } finally {
    state.busy = false;
    state.done = true;
  }
}

function handleAnswer(value = "") {
  const state = getState();
  if (!state || state.busy || state.done) return;

  const answer = clean(value);
  if (!answer) return;

  appendOpeningIfMissing();
  appendBubble("user", answer);

  if (state.step === "item") {
    state.item = answer;
    state.step = "price";
    appendBubble("clara", `How much does ${answer} cost?\n\nType the amount only if you can. Example: ₱3,500`);
    return;
  }

  if (state.step === "price") {
    const price = extractPrice(answer);
    if (!price) {
      appendBubble("clara", "Please type the price clearly so I can check it properly. Example: ₱3,500");
      return;
    }

    state.price = price;
    state.step = "reason";
    appendBubble("clara", "Why do you want to buy it?\n\nExample: replacement, work need, reward, health, hobby, or just want it.");
    return;
  }

  if (state.step === "reason") {
    state.reason = answer;
    state.step = "diagnosis";
    runDiagnosis(state);
  }
}

function routeBuyCheckInput(event) {
  const chat = getStaticChat();
  if (!chat) return false;

  const shell = getAssistantShell();
  const input = getInput();
  if (!shell || !input) return false;

  const target = event.target;
  if (target && !shell.contains(target)) return false;

  const value = clean(input.value);
  if (!value) return false;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  setInputValue(input, "");
  handleAnswer(value);
  return true;
}

function installBuyCheckInputRouter() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_INPUT_ROUTER_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_INPUT_ROUTER_INSTALLED__ = true;

  document.addEventListener("submit", routeBuyCheckInput, true);

  document.addEventListener("click", (event) => {
    const shell = getAssistantShell();
    if (!shell || !getStaticChat()) return;

    const button = event.target?.closest?.("button");
    if (!button || !shell.contains(button)) return;

    const isSend = button.type === "submit" || String(button.getAttribute("aria-label") || "").toLowerCase().includes("send");
    if (isSend) routeBuyCheckInput(event);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const input = getInput();
    if (!input || event.target !== input) return;
    routeBuyCheckInput(event);
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-buy-check-close-board]")) resetState();
    if (event.target?.closest?.("[data-clara-buy-check-again]")) resetState();
  }, true);
}

installBuyCheckInputRouter();
