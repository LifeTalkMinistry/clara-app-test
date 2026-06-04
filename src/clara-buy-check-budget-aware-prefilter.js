import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";

const STATE_KEY = "__CLARA_BUY_CHECK_REPORT_ROUTER_STATE__";
const FALLBACK_USER_ID = "clara-demo-user";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (value = 0) => `₱${(Number(value) || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
const safeHtml = (value = "") => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function priceFromText(text = "") {
  const match = clean(text).match(/([0-9][0-9,\s]*(?:\.\d{1,2})?)/);
  return match ? toNumber(match[1]) : 0;
}

function inferCategory(item = "") {
  const text = clean(item).toLowerCase();
  if (/food|meal|coffee|snack|restaurant|delivery|grocery|groceries/.test(text)) return "Food";
  if (/jeep|bus|taxi|grab|gas|fare|transport/.test(text)) return "Transportation";
  if (/rent|electric|water|internet|wifi|bill|load|subscription/.test(text)) return "Bills";
  if (/medicine|doctor|vitamin|health|checkup/.test(text)) return "Health";
  if (/shoe|shoes|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function norm(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function budgetTitle(budget = {}) {
  return clean(budget.title || budget.category || budget.name || budget.label || budget.budget_category || "");
}

function budgetLimit(budget = {}) {
  return toNumber(budget.limit ?? budget.amount ?? budget.budget_amount ?? budget.allocated ?? budget.allocated_amount ?? budget.monthly_amount ?? budget.total_budget ?? budget.budget ?? budget.cap ?? 0);
}

function isProtectedWallet(wallet = {}) {
  const text = `${wallet.name || ""} ${wallet.type || ""}`.toLowerCase();
  return text.includes("emergency") || text.includes("reserve") || text.includes("savings") || text.includes("goal");
}

function findBudget(budgets = [], category = "") {
  const key = norm(category);
  const exact = budgets.find((budget) => norm(budgetTitle(budget)) === key);
  if (exact) return exact;
  const fallback = {
    shopping: ["shopping", "miscellaneous", "lifestyle", "entertainment"],
    lifestyle: ["lifestyle", "miscellaneous", "entertainment"],
    health: ["health", "medical", "miscellaneous"],
    bills: ["bills", "utilities", "subscriptions"],
    transportation: ["transportation", "transport", "fare"],
  }[key] || [];
  return budgets.find((budget) => fallback.includes(norm(budgetTitle(budget)))) || null;
}

function getChat() {
  return document.querySelector("[data-clara-buy-check-static-chat]");
}
function getShell() {
  return getChat()?.closest(".fixed") || null;
}
function getInput() {
  return getShell()?.querySelector("form input, form textarea") || null;
}
function getState() {
  const state = window[STATE_KEY];
  return state?.active ? state : null;
}
function setInputValue(input, value = "") {
  if (!input) return;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function appendBubble(role, text = "", html = "") {
  const chat = getChat();
  if (!chat) return null;
  const row = document.createElement("div");
  row.className = `clara-buy-check-static-bubble-row ${role === "user" ? "user" : "clara"}`;
  const bubble = document.createElement("div");
  bubble.className = `clara-buy-check-static-bubble ${role === "user" ? "user" : "clara"}`;
  bubble.innerHTML = html || safeHtml(text).replace(/\n/g, "<br>");
  row.appendChild(bubble);
  chat.appendChild(row);
  requestAnimationFrame(() => {
    const main = chat.closest("main");
    main?.scrollTo?.({ top: main.scrollHeight || 9999, behavior: "smooth" });
  });
  return row;
}

async function getUserContext() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    const localUserId = String(user?.id || user?.email || FALLBACK_USER_ID).trim() || FALLBACK_USER_ID;
    return { user, localUserId };
  } catch {
    return { user: null, localUserId: FALLBACK_USER_ID };
  }
}

function scanBudgetCoverage(item = "", price = 0, effective = {}) {
  const amount = toNumber(price);
  const category = inferCategory(item);
  const budgets = Array.isArray(effective.budgets) ? effective.budgets : [];
  const expenses = Array.isArray(effective.expenses) ? effective.expenses : [];
  const wallets = Array.isArray(effective.wallets) ? effective.wallets : [];
  const budget = findBudget(budgets, category);
  const limit = budgetLimit(budget);
  if (!budget || limit <= 0 || amount <= 0) return null;

  const categoryKey = norm(category);
  const now = new Date();
  const spent = expenses.reduce((sum, expense) => {
    const date = new Date(expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return sum;
    const expenseKey = norm(expense.category || expense.category_name || expense.budget_category || expense.expense_category || expense.tag || "");
    const matches = expenseKey === categoryKey || (categoryKey === "shopping" && ["miscellaneous", "lifestyle", "entertainment"].includes(expenseKey));
    return matches ? sum + toNumber(expense.amount ?? expense.total ?? expense.value ?? 0) : sum;
  }, 0);

  const remaining = Math.max(0, limit - spent);
  const spendableWalletTotal = wallets.filter((wallet) => !isProtectedWallet(wallet)).reduce((sum, wallet) => sum + toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? wallet.available_balance ?? wallet.starting_balance ?? 0), 0);
  if (remaining < amount || spendableWalletTotal < amount) return null;

  return {
    budgetTitle: budgetTitle(budget) || category,
    remaining,
    purchaseAmount: amount,
    remainingAfter: Math.max(0, remaining - amount),
  };
}

function budgetCoveredHtml(coverage = {}) {
  return `
    <div class="clara-buy-check-message-title">This looks like it may already be planned.</div>
    <div class="clara-buy-check-confirm-summary">I noticed this may already be covered by your ${safeHtml(coverage.budgetTitle)} budget.</div>
    <div class="clara-buy-check-confirm-summary">Available in this budget: <strong>${money(coverage.remaining)}</strong></div>
    <div class="clara-buy-check-confirm-summary">Purchase amount: <strong>${money(coverage.purchaseAmount)}</strong></div>
    <div class="clara-buy-check-confirm-summary">Remaining after purchase: <strong>${money(coverage.remainingAfter)}</strong></div>
    <div class="clara-buy-check-message-sub">Based on your current plan, you can go ahead.</div>
  `;
}

async function handlePrice(value = "") {
  const state = getState();
  if (!state || state.busy || state.done || state.step !== "price") return false;

  const answer = clean(value);
  appendBubble("user", answer);
  const price = priceFromText(answer);
  if (!price) {
    appendBubble("clara", "Please type the price clearly so I can check it properly. Example: ₱3,500");
    return true;
  }

  state.price = price;
  state.busy = true;
  try {
    const { user, localUserId } = await getUserContext();
    const effective = await getClaraEffectiveFinanceContext(localUserId, { user });
    const coverage = scanBudgetCoverage(state.item, price, effective || {});
    if (coverage) {
      state.step = "budget-covered";
      state.reason = "Already covered by budget";
      state.done = true;
      window.__CLARA_LAST_BUY_CHECK_BUDGET_COVERAGE__ = coverage;
      appendBubble("clara", "", budgetCoveredHtml(coverage));
      return true;
    }
  } catch (error) {
    console.warn("[CLARA Buy Check] Budget scan skipped; continuing normal flow.", error);
  } finally {
    state.busy = false;
  }

  state.step = "reason";
  appendBubble("clara", "Why do you want to buy it?\n\nExample: replacement, work need, reward, health, hobby, or just want it.");
  return true;
}

function shouldIntercept() {
  const state = getState();
  return Boolean(state && !state.busy && !state.done && state.step === "price" && getChat() && getInput());
}

function route(event) {
  if (!shouldIntercept()) return false;
  const shell = getShell();
  const input = getInput();
  if (!shell || !input) return false;
  if (event.target && !shell.contains(event.target)) return false;
  const value = clean(input.value);
  if (!value) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  setInputValue(input, "");
  handlePrice(value);
  return true;
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_BUDGET_AWARE_PREFILTER_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_BUDGET_AWARE_PREFILTER_INSTALLED__ = true;
  document.addEventListener("submit", route, true);
  document.addEventListener("click", (event) => {
    if (!shouldIntercept()) return;
    const button = event.target?.closest?.("button");
    if (!button) return;
    const isSend = button.type === "submit" || String(button.getAttribute("aria-label") || "").toLowerCase().includes("send");
    if (isSend) route(event);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const input = getInput();
    if (!input || event.target !== input) return;
    route(event);
  }, true);
}

install();
