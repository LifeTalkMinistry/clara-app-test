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
  };
  window[ROUTER_STATE_KEY] = state;
  return state;
}

function resetState() {
  window[ROUTER_STATE_KEY] = null;
}

function appendBubble(role, text, options = {}) {
  const chat = getStaticChat();
  if (!chat) return;

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
  if (/shoe|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
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
  const bridgeContext = buildClaraBridgeReadableContext({
    messages: [
      { role: "user", text: state.item },
      { role: "user", text: money(state.price) },
      { role: "user", text: state.reason },
    ],
  });

  return {
    purchaseSummary: {
      item: state.item,
      price: state.price,
      reason: state.reason,
      inferredCategory: category,
    },
    financeContext: {
      wallets: wallets.slice(0, 12).map((wallet) => ({
        id: wallet.id,
        name: wallet.name || wallet.wallet_name || wallet.title || "Wallet",
        balance: getWalletBalance(wallet),
      })),
      totalWalletBalance: wallets.reduce((sum, wallet) => sum + getWalletBalance(wallet), 0),
      budgets: budgets.slice(0, 20).map((budget) => ({ title: getBudgetTitle(budget), limit: getBudgetLimit(budget) })),
      matchingBudget: matchingBudget ? {
        title: getBudgetTitle(matchingBudget),
        limit: budgetLimit,
        spentThisMonth: categorySpent,
        remaining: budgetLimit - categorySpent,
      } : null,
      recentExpenses: currentMonthExpenses.slice(-30).map((expense) => ({
        amount: getExpenseAmount(expense),
        category: getExpenseCategory(expense),
        note: clean(expense.notes || expense.item || expense.title || ""),
        date: expense.date || expense.created_at || expense.createdAt || "",
      })),
      savingsGoals: savingsGoals.slice(0, 12),
      emergencyFund,
    },
    scheduleContext: bridgeContext.scheduleEvents,
    mePageContext: bridgeContext.Me_summary_profile || bridgeContext.meLifeStageProfile || bridgeContext.lifeStageContext,
    fullMemoryContext: {
      memoryCabinets: summarizeMemoryCabinets(),
      previousConversationMemory: bridgeContext.previousConversationMemory,
      userMessageHistory: bridgeContext.userMessageHistory,
    },
    timeContext: bridgeContext.currentTime,
  };
}

function localFallback(context) {
  const price = Number(context.purchaseSummary.price || 0);
  const totalWalletBalance = Number(context.financeContext.totalWalletBalance || 0);
  const budget = context.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  const risk = !totalWalletBalance || price > totalWalletBalance || (budget && price > remaining) ? "High" : price > totalWalletBalance * 0.35 ? "Medium" : "Low";
  const decision = risk === "High" ? "Wait" : risk === "Medium" ? "Pause" : "Buy";
  const budgetLine = budget ? `Your ${budget.title} budget has ${money(Math.max(0, remaining))} remaining.` : "I did not find a matching budget, so I’m treating this with caution.";

  return `Decision: ${decision}\nRisk: ${risk}\nWhy:\n- This costs ${money(price)} and your visible wallet total is ${money(totalWalletBalance)}.\n- ${budgetLine}\n- I also considered your reason, schedule, Me profile, goals, and memory.\nSafer move: ${risk === "Low" ? "Buy only if it remains your priority, then log it after." : "Pause first or choose a cheaper option before spending."}`;
}

async function runDiagnosis(state) {
  state.busy = true;
  appendBubble("clara", "Got it. I’m checking your wallet, budget, schedule, Me profile, goals, and memory now...");

  try {
    const context = await buildDiagnosisContext(state);
    const prompt = `You are CLARA, a personal money coach.\n\nA Buy Check static diagnosis is complete.\n\nUser answered:\nItem: ${context.purchaseSummary.item}\nPrice: ${money(context.purchaseSummary.price)}\nReason: ${context.purchaseSummary.reason}\n\nUse the context package below to decide whether the user should buy now, buy with a cap, reduce, wait, or pause.\n\nDo not ask more default questions. Infer planned/unplanned from budget fit, savings goals, reason, memory, schedule, and Me profile. Memory is always part of the diagnosis. Keep it short and authoritative.\n\nRequired output format:\nDecision: Buy / Buy with cap / Reduce / Wait / Pause\nRisk: Low / Medium / High\nWhy:\n- reason 1\n- reason 2\n- reason 3 if needed\nSafer move: one clear action\n\nContext package:\n${JSON.stringify(context, null, 2)}`;
    let reply = "";

    if (hasGeminiConfig()) {
      reply = await generateClaraGeminiReply({
        message: prompt,
        context,
        mode: "buy_check_static_diagnosis",
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
    appendBubble("clara", "Decision: Pause\nRisk: Medium\nWhy:\n- I couldn’t complete the full context check right now.\n- It is safer not to rush a purchase when diagnosis is incomplete.\nSafer move: Try again, or check your wallet and budget manually before buying.");
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
