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

const BUY_CHECK_LABEL = "Buy Check";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const CORE_PANEL_LABELS = ["Core Features", "Forecast"];
const BUY_CHECK_STYLE_ID = "clara-buy-check-board-style";
const BUY_CHECK_DEMO_USER_ID = "clara-demo-user";

let buyCheckFlow = null;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function includesAny(text = "", labels = []) {
  return labels.some((label) => text.includes(label));
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return includesAny(text, CORE_PANEL_LABELS) && includesAny(text, SMART_ACTIONS_LABELS);
  });
}

function getAssistantMain() {
  return getAssistantShell()?.querySelector("main") || null;
}

function getAssistantButtons() {
  const shell = getAssistantShell();
  if (!shell) return [];
  return Array.from(shell.querySelectorAll("button"));
}

function isAssistantTabButton(button) {
  if (!button) return false;

  const label = clean(button.textContent);
  if (!["Talk to CLARA", "Memory", BUY_CHECK_LABEL].includes(label)) return false;

  const shell = getAssistantShell();
  if (!shell || !shell.contains(button)) return false;

  const rowText = clean(button.parentElement?.textContent || "");
  return includesAny(rowText, CORE_PANEL_LABELS) && includesAny(rowText, SMART_ACTIONS_LABELS);
}

function relabelBuyCheckTab() {
  getAssistantButtons().forEach((button) => {
    if (!isAssistantTabButton(button)) return;
    if (clean(button.textContent) === BUY_CHECK_LABEL) return;

    button.textContent = BUY_CHECK_LABEL;
    button.dataset.claraBuyCheckTab = "true";
    button.setAttribute("aria-label", "Open CLARA Buy Check");
    button.setAttribute("title", "Buy Check");
  });
}

function ensureBuyCheckBoardStyle() {
  if (document.getElementById(BUY_CHECK_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = BUY_CHECK_STYLE_ID;
  style.textContent = `
    .clara-buy-check-board-close,
    .clara-buy-check-static-close {
      position: absolute;
      right: 12px;
      top: 12px;
      display: grid;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.075);
      color: rgba(255,255,255,.78);
      font: 800 18px/1 system-ui, sans-serif;
      z-index: 20;
    }

    .clara-buy-check-board-steps {
      margin: 16px auto 0;
      display: grid;
      max-width: 250px;
      gap: 9px;
      text-align: left;
    }

    .clara-buy-check-board-steps span {
      display: flex;
      gap: 10px;
      align-items: center;
      color: rgba(226,232,240,.82);
      font: 800 12.5px/1.35 system-ui, sans-serif;
    }

    .clara-buy-check-board-steps b {
      display: grid;
      width: 22px;
      height: 22px;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 999px;
      border: 1px solid rgba(110,231,183,.20);
      background: rgba(110,231,183,.10);
      color: rgba(110,231,183,.96);
      font: 950 11px/1 system-ui, sans-serif;
    }

    .clara-buy-check-board-start,
    .clara-buy-check-static-button {
      margin: 18px auto 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(110,231,183,.98), rgba(34,211,238,.84));
      color: rgba(2,6,23,.96);
      padding: 12px 18px;
      font: 950 13px/1 system-ui, sans-serif;
      box-shadow: 0 0 28px rgba(45,212,191,.18);
    }

    .clara-buy-check-board-note {
      margin: 15px auto 0;
      max-width: 286px;
      color: rgba(203,213,225,.62);
      font: 750 12px/1.55 system-ui, sans-serif;
    }

    .clara-buy-check-static-wrap {
      min-height: 100%;
      padding: 52px 0 112px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .clara-buy-check-static-bubble-row {
      display: flex;
      width: 100%;
    }

    .clara-buy-check-static-bubble-row.user {
      justify-content: flex-end;
    }

    .clara-buy-check-static-bubble-row.clara {
      justify-content: flex-start;
    }

    .clara-buy-check-static-bubble {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      box-shadow: 0 14px 34px rgba(0,0,0,.16);
    }

    .clara-buy-check-static-bubble.user {
      max-width: 86%;
      border-radius: 24px;
      background: rgb(110,231,183);
      color: rgb(2,6,23);
      padding: 12px 16px;
      font: 700 13px/1.55 system-ui, sans-serif;
    }

    .clara-buy-check-static-bubble.clara {
      width: 94%;
      max-width: 94%;
      border-radius: 26px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.075);
      color: rgba(255,255,255,.90);
      padding: 16px 20px;
      font: 500 13px/1.65 system-ui, sans-serif;
      box-shadow: 0 18px 44px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.075);
      backdrop-filter: blur(18px);
    }

    .clara-buy-check-static-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: -4px;
      padding-left: 4px;
    }

    .clara-buy-check-static-actions .clara-buy-check-static-button {
      margin: 0;
      padding: 10px 13px;
      font-size: 11px;
    }
  `;
  document.head.appendChild(style);
}

function findInstructionBoard() {
  const shell = getAssistantShell();
  if (!shell) return null;

  const closeButton = shell.querySelector('button[aria-label="Close CLARA AI mode"]');
  const board = closeButton?.closest?.(".relative");
  if (board) return board;

  return Array.from(shell.querySelectorAll("div")).find((node) => {
    const text = clean(node.textContent);
    return (
      text.includes("Need help thinking through a decision") ||
      text.includes("Hi, any spending concern today") ||
      text.includes("What money situation are we figuring out") ||
      text.includes("Tell CLARA what")
    );
  }) || null;
}

function hidePanelTabsForBuyCheckBoard(board) {
  const shell = getAssistantShell();
  if (!shell || !board) return;

  const tabRow = Array.from(shell.querySelectorAll("div")).find((node) => {
    if (node.contains(board)) return false;

    const text = clean(node.textContent);
    return (
      text.includes(BUY_CHECK_LABEL) &&
      text.includes("Forecast") &&
      text.includes("Analytic") &&
      node.querySelectorAll("button").length >= 3
    );
  });

  if (!tabRow) return;

  const noisyShell = tabRow.parentElement?.querySelectorAll("button").length === 3
    ? tabRow.parentElement
    : tabRow;

  noisyShell.style.display = "none";
  noisyShell.setAttribute("data-clara-hidden-during-buy-check", "true");
}

function closeAssistantOverlay() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

function renderBuyCheckBoard() {
  ensureBuyCheckBoardStyle();

  const board = findInstructionBoard();
  if (!board) {
    startStaticBuyCheckFlow();
    return;
  }

  board.innerHTML = `
    <button type="button" class="clara-buy-check-board-close" data-clara-buy-check-close-board="true" aria-label="Close CLARA AI mode">×</button>
    <p class="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">BUY CHECK</p>
    <h3 class="mt-3 text-xl font-black leading-tight tracking-tight text-white">Let’s check this purchase first.</h3>
    <div class="mx-auto mt-3 max-w-[292px] text-sm leading-6 text-slate-300/75">
      <p>Answer clearly so CLARA can judge the decision properly.</p>
    </div>
    <div class="clara-buy-check-board-steps">
      <span><b>1</b> Item you want to buy</span>
      <span><b>2</b> Amount or price</span>
      <span><b>3</b> Why you want it</span>
    </div>
    <p class="clara-buy-check-board-note">Then CLARA checks wallet, budget, schedule, Me profile, goals, and memory before giving a decision.</p>
    <button type="button" class="clara-buy-check-board-start" data-clara-start-buy-check="true">Start Buy Check</button>
  `;

  board.setAttribute("data-clara-buy-check-board", "true");
  hidePanelTabsForBuyCheckBoard(board);
}

function makeFlowMessage(role, text) {
  return {
    role,
    text: clean(text),
    id: `buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

function renderStaticBuyCheckChat() {
  ensureBuyCheckBoardStyle();

  const main = getAssistantMain();
  if (!main || !buyCheckFlow) return;

  const messages = buyCheckFlow.messages || [];
  main.innerHTML = `
    <button type="button" class="clara-buy-check-static-close" data-clara-buy-check-close-board="true" aria-label="Close CLARA AI mode">×</button>
    <div class="clara-buy-check-static-wrap" data-clara-buy-check-static-chat="true">
      ${messages
        .map((message) => `
          <div class="clara-buy-check-static-bubble-row ${message.role === "user" ? "user" : "clara"}">
            <div class="clara-buy-check-static-bubble ${message.role === "user" ? "user" : "clara"}">${escapeHtml(message.text)}</div>
          </div>
        `)
        .join("")}
      ${buyCheckFlow.done ? `
        <div class="clara-buy-check-static-actions">
          <button type="button" class="clara-buy-check-static-button" data-clara-buy-check-again="true">Check another</button>
          <button type="button" class="clara-buy-check-static-button" data-clara-buy-check-close-board="true">Done</button>
        </div>
      ` : ""}
    </div>
  `;

  window.requestAnimationFrame(() => {
    main.scrollTo?.({ top: main.scrollHeight, behavior: "smooth" });
  });
}

function startStaticBuyCheckFlow() {
  buyCheckFlow = {
    step: "item",
    item: "",
    price: 0,
    reason: "",
    busy: false,
    done: false,
    messages: [
      makeFlowMessage("clara", "Hi, Max! What do you want to buy?\n\nType the exact item first. Example: Running shoes"),
    ],
  };

  renderStaticBuyCheckChat();
}

function extractPrice(text = "") {
  const match = clean(text).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
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

function normalizeCategory(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function summarizeMemoryCabinets() {
  try {
    return MEMORY_CABINET_DEFINITIONS.map((definition) => ({
      cabinet: definition.name,
      records: readMemoryCabinet(definition.name).slice(-20).map((entry) => ({
        id: entry.id,
        summary: clean(entry.summary || entry.text || entry.content || entry.value || ""),
        signals: Array.isArray(entry.signals) ? entry.signals.slice(0, 6) : [],
        patternStrength: entry.patternStrength || "",
        occurrenceCount: entry.occurrenceCount || 1,
      })).filter((entry) => entry.summary || entry.signals.length),
    })).filter((cabinet) => cabinet.records.length);
  } catch {
    return [];
  }
}

async function getLocalUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    return String(user?.id || user?.email || BUY_CHECK_DEMO_USER_ID).trim() || BUY_CHECK_DEMO_USER_ID;
  } catch {
    return "local-user";
  }
}

async function buildBuyCheckDiagnosisContext() {
  const localUserId = await getLocalUserId();
  const [wallets, budgets, expenses, savingsGoals, emergencyFund] = await Promise.all([
    getWallets(localUserId).catch(() => []),
    getBudgets(localUserId).catch(() => []),
    getExpenses(localUserId).catch(() => []),
    getSavingsGoals(localUserId).catch(() => []),
    getEmergencyFund(localUserId).catch(() => null),
  ]);

  const item = buyCheckFlow?.item || "";
  const price = buyCheckFlow?.price || 0;
  const reason = buyCheckFlow?.reason || "";
  const category = inferCategory(item);
  const categoryKey = normalizeCategory(category);
  const now = new Date();
  const currentMonthExpenses = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const categoryExpenses = currentMonthExpenses.filter((expense) => normalizeCategory(getExpenseCategory(expense)) === categoryKey);
  const similarPurchases = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    if (!date || (Date.now() - date.getTime()) / 86400000 > 45) return false;
    const text = `${expense.item || ""} ${expense.title || ""} ${expense.notes || ""} ${getExpenseCategory(expense)}`.toLowerCase();
    return text.includes(item.toLowerCase().split(" ")[0] || "") || normalizeCategory(getExpenseCategory(expense)) === categoryKey;
  }).slice(-20);
  const matchingBudget = budgets.find((budget) => normalizeCategory(getBudgetTitle(budget)) === categoryKey) || null;
  const budgetLimit = matchingBudget ? getBudgetLimit(matchingBudget) : 0;
  const categorySpent = categoryExpenses.reduce((sum, expense) => sum + getExpenseAmount(expense), 0);
  const bridgeContext = buildClaraBridgeReadableContext({
    messages: (buyCheckFlow?.messages || []).map((message) => ({ role: message.role === "clara" ? "assistant" : message.role, text: message.text })),
  });

  return {
    purchaseSummary: {
      item,
      price,
      reason,
      inferredCategory: category,
    },
    contextRouterInventory: [
      "wallets and spendable balance",
      "budgets and category room",
      "expenses / recent transactions",
      "similar purchases",
      "savings goals",
      "emergency fund",
      "obligations, bills, subscriptions, debt, income/payday cycle when available",
      "schedule / calendar context",
      "Me page / life profile context",
      "full memory context",
    ],
    financeContext: {
      wallets: wallets.slice(0, 12).map((wallet) => ({
        id: wallet.id,
        name: wallet.name || wallet.wallet_name || wallet.title || "Wallet",
        balance: getWalletBalance(wallet),
      })),
      totalWalletBalance: wallets.reduce((sum, wallet) => sum + getWalletBalance(wallet), 0),
      budgets: budgets.slice(0, 20).map((budget) => ({
        title: getBudgetTitle(budget),
        limit: getBudgetLimit(budget),
      })),
      matchingBudget: matchingBudget ? { title: getBudgetTitle(matchingBudget), limit: budgetLimit, spentThisMonth: categorySpent, remaining: budgetLimit - categorySpent } : null,
      recentExpenses: currentMonthExpenses.slice(-30).map((expense) => ({
        amount: getExpenseAmount(expense),
        category: getExpenseCategory(expense),
        note: clean(expense.notes || expense.item || expense.title || ""),
        date: expense.date || expense.created_at || expense.createdAt || "",
      })),
      similarPurchases: similarPurchases.map((expense) => ({
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

function buildFinalDiagnosisPrompt(contextPackage) {
  return `You are CLARA, a personal money coach.

A Buy Check static diagnosis is complete.

User answered:
Item: ${contextPackage.purchaseSummary.item}
Price: ${money(contextPackage.purchaseSummary.price)}
Reason: ${contextPackage.purchaseSummary.reason}

Task:
Use the context package below to decide whether the user should buy now, buy with a cap, reduce, wait, or pause.

Important:
- Do not ask more default questions.
- Infer planned/unplanned from budget fit, savings goals, reason, memory, schedule, and Me profile.
- Memory is always part of the diagnosis.
- Mention only the most relevant context. Do not dump raw data.
- Keep it short and authoritative.

Required output format:
Decision: Buy / Buy with cap / Reduce / Wait / Pause
Risk: Low / Medium / High
Why:
- reason 1
- reason 2
- reason 3 if needed
Safer move: one clear action

Context package:
${JSON.stringify(contextPackage, null, 2)}`;
}

function localBuyCheckFallback(contextPackage) {
  const price = Number(contextPackage.purchaseSummary.price || 0);
  const totalWalletBalance = Number(contextPackage.financeContext.totalWalletBalance || 0);
  const budget = contextPackage.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  const risk = !totalWalletBalance || price > totalWalletBalance || (budget && price > remaining) ? "High" : price > totalWalletBalance * 0.35 ? "Medium" : "Low";
  const decision = risk === "High" ? "Wait" : risk === "Medium" ? "Pause" : "Buy";
  const budgetLine = budget ? `Your ${budget.title} budget has ${money(Math.max(0, remaining))} remaining.` : "CLARA did not find a matching budget, so this is treated with caution.";

  return `Decision: ${decision}
Risk: ${risk}
Why:
- The item costs ${money(price)} and your visible wallet total is ${money(totalWalletBalance)}.
- ${budgetLine}
- CLARA also considered your reason, schedule, Me profile, goals, and saved memory context.
Safer move: ${risk === "Low" ? "Buy it only if it still matches your priority, then log it after." : "Wait first or choose a cheaper option before spending."}`;
}

async function runFinalBuyCheckDiagnosis() {
  if (!buyCheckFlow || buyCheckFlow.busy) return;

  buyCheckFlow.busy = true;
  buyCheckFlow.messages.push(makeFlowMessage("clara", "Got it. I’m checking your wallet, budget, schedule, Me profile, goals, and memory now..."));
  renderStaticBuyCheckChat();

  try {
    const contextPackage = await buildBuyCheckDiagnosisContext();
    const prompt = buildFinalDiagnosisPrompt(contextPackage);
    let reply = "";

    if (hasGeminiConfig()) {
      reply = await generateClaraGeminiReply({
        message: prompt,
        context: contextPackage,
        mode: "buy_check_static_diagnosis",
        conversationHistory: buyCheckFlow.messages.map((message) => ({ role: message.role === "clara" ? "assistant" : message.role, text: message.text })),
      });
    }

    if (!clean(reply)) reply = localBuyCheckFallback(contextPackage);

    buyCheckFlow.messages = buyCheckFlow.messages.filter((message) => !message.text.includes("I’m checking your wallet"));
    buyCheckFlow.messages.push(makeFlowMessage("clara", reply));
    buyCheckFlow.done = true;
  } catch (error) {
    console.warn("[CLARA Buy Check] Final diagnosis failed", error);
    buyCheckFlow.messages = buyCheckFlow.messages.filter((message) => !message.text.includes("I’m checking your wallet"));
    buyCheckFlow.messages.push(makeFlowMessage("clara", "Decision: Pause\nRisk: Medium\nWhy:\n- I couldn’t complete the full context check right now.\n- It is safer not to rush a purchase when the diagnosis is incomplete.\nSafer move: Try again in a moment, or check your wallet and budget manually before buying."));
    buyCheckFlow.done = true;
  } finally {
    buyCheckFlow.busy = false;
    renderStaticBuyCheckChat();
  }
}

function extractPrice(text = "") {
  const match = clean(text).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function handleStaticBuyCheckAnswer(text = "") {
  if (!buyCheckFlow || buyCheckFlow.busy || buyCheckFlow.done) return;

  const answer = clean(text);
  if (!answer) return;

  buyCheckFlow.messages.push(makeFlowMessage("user", answer));

  if (buyCheckFlow.step === "item") {
    buyCheckFlow.item = answer;
    buyCheckFlow.step = "price";
    buyCheckFlow.messages.push(makeFlowMessage("clara", `How much does ${answer} cost?\n\nType the amount only if you can. Example: ₱3,500`));
    renderStaticBuyCheckChat();
    return;
  }

  if (buyCheckFlow.step === "price") {
    const price = extractPrice(answer);
    if (!price) {
      buyCheckFlow.messages.push(makeFlowMessage("clara", "Please type the price clearly so I can check it properly. Example: ₱3,500"));
      renderStaticBuyCheckChat();
      return;
    }

    buyCheckFlow.price = price;
    buyCheckFlow.step = "reason";
    buyCheckFlow.messages.push(makeFlowMessage("clara", "Why do you want to buy it?\n\nExample: replacement, work need, reward, health, hobby, or just want it."));
    renderStaticBuyCheckChat();
    return;
  }

  if (buyCheckFlow.step === "reason") {
    buyCheckFlow.reason = answer;
    buyCheckFlow.step = "diagnosis";
    renderStaticBuyCheckChat();
    runFinalBuyCheckDiagnosis();
  }
}

function clearAssistantInput() {
  const input = getAssistantShell()?.querySelector("input, textarea");
  if (!input) return;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function openBuyCheckMode() {
  renderBuyCheckBoard();
}

function installBuyCheckClickCapture() {
  document.addEventListener("click", (event) => {
    const closeBoard = event.target?.closest?.("[data-clara-buy-check-close-board]");
    if (closeBoard) {
      event.preventDefault();
      event.stopPropagation();
      buyCheckFlow = null;
      closeAssistantOverlay();
      return;
    }

    const startButton = event.target?.closest?.("[data-clara-start-buy-check]");
    if (startButton) {
      event.preventDefault();
      event.stopPropagation();
      startStaticBuyCheckFlow();
      return;
    }

    const checkAgain = event.target?.closest?.("[data-clara-buy-check-again]");
    if (checkAgain) {
      event.preventDefault();
      event.stopPropagation();
      startStaticBuyCheckFlow();
      return;
    }

    const button = event.target?.closest?.("button");
    if (!button) return;

    const isBuyCheckTab = button.dataset?.claraBuyCheckTab === "true" || clean(button.textContent) === BUY_CHECK_LABEL;
    if (!isBuyCheckTab || !getAssistantShell()?.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openBuyCheckMode();
  }, true);
}

function installBuyCheckSubmitCapture() {
  document.addEventListener("submit", (event) => {
    if (!buyCheckFlow) return;
    const shell = getAssistantShell();
    if (!shell || !shell.contains(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const input = event.target?.querySelector?.("input, textarea");
    const value = clean(input?.value);
    clearAssistantInput();
    handleStaticBuyCheckAnswer(value);
  }, true);
}

function installBuyCheckObserver() {
  const observer = new MutationObserver(() => relabelBuyCheckTab());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelBuyCheckTab();
}

function installClaraAssistantBuyCheckTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_BUY_CHECK_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_BUY_CHECK_TAB_INSTALLED__ = true;
  installBuyCheckClickCapture();
  installBuyCheckSubmitCapture();
  installBuyCheckObserver();
}

installClaraAssistantBuyCheckTab();
