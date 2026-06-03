import { supabase } from "@/lib/supabaseClient";
import { readClaraDevIdentityOverride } from "@/lib/clara-dev-simulator";
import {
  getBudgets,
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
  getWallets,
} from "@/lib/financeRepository";

const BUY_CHECK_LABEL = "Buy Check";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const CORE_PANEL_LABELS = ["Core Features", "Forecast"];
const BUY_CHECK_PANEL_ID = "clara-buy-check-guided-panel";
const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const DEMO_LOCAL_USER_ID = "clara-demo-user";

let buyCheckContext = null;
let buyCheckLoading = false;
let buyCheckState = makeInitialState();

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function includesAny(text = "", labels = []) {
  return labels.some((label) => text.includes(label));
}

function makeInitialState() {
  return {
    step: "item",
    item: "",
    amount: "",
    planningStatus: "",
    walletId: "",
    category: "",
    messages: [
      {
        role: "assistant",
        text: "What do you want to buy?\n\nYou can type the item only, or item + amount like: Shoes 2500.",
      },
    ],
    result: null,
    error: "",
  };
}

function addMessage(role, text, meta = {}) {
  buyCheckState.messages.push({ role, text, ...meta });
}

async function getLocalUserId() {
  try {
    if (readClaraDevIdentityOverride()?.scenarioId === "demo_user") return DEMO_LOCAL_USER_ID;
  } catch {}

  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    return String(user?.id || user?.email || "local-user").trim() || "local-user";
  } catch {
    return "local-user";
  }
}

function removeDeleted(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) => !row?.deletedAt && !row?.deleted_at);
}

async function loadBuyCheckContext() {
  const localUserId = await getLocalUserId();
  const [wallets, expenses, budgets, savingsGoals, emergencyFund] = await Promise.all([
    getWallets(localUserId).catch(() => []),
    getExpenses(localUserId).catch(() => []),
    getBudgets(localUserId).catch(() => []),
    getSavingsGoals(localUserId).catch(() => []),
    getEmergencyFund(localUserId).catch(() => null),
  ]);

  return {
    localUserId,
    wallets: removeDeleted(wallets),
    expenses: removeDeleted(expenses),
    budgets: removeDeleted(budgets),
    savingsGoals: removeDeleted(savingsGoals),
    emergencyFund,
    memory: readSpendingMemory(),
  };
}

function readSpendingMemory() {
  try {
    const raw = window.localStorage.getItem(USER_CONTEXT_STORY_KEY);
    if (!raw) return [];

    const story = JSON.parse(raw);
    const allowed = new Set([
      "Money",
      "Food",
      "Lifestyle",
      "Triggers",
      "Decision Style",
      "Support Style",
      "Routine",
      "Emotional",
      "Health",
      "Relationships",
      "Protection",
    ]);

    return (Array.isArray(story?.sections) ? story.sections : [])
      .filter((section) => allowed.has(section?.title))
      .flatMap((section) =>
        (Array.isArray(section?.bullets) ? section.bullets : []).map((bullet) => ({
          section: section.title,
          text: clean(bullet),
        }))
      )
      .filter((item) => item.text)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function getWalletName(wallet = {}) {
  return clean(wallet.name || wallet.wallet_name || wallet.title || wallet.label || "Wallet");
}

function getWalletBalance(wallet = {}) {
  return toNumber(
    wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0
  );
}

function getEmergencySaved(emergencyFund = {}) {
  return toNumber(
    emergencyFund?.saved_amount ??
      emergencyFund?.savedAmount ??
      emergencyFund?.protectedBalance ??
      emergencyFund?.protected_balance ??
      emergencyFund?.reserveBalance ??
      emergencyFund?.reserve_balance ??
      emergencyFund?.currentAmount ??
      emergencyFund?.current_amount ??
      emergencyFund?.balance ??
      0
  );
}

function getEmergencyWalletId(emergencyFund = {}) {
  return clean(
    emergencyFund?.linkedWalletId ??
      emergencyFund?.linked_wallet_id ??
      emergencyFund?.reserveWalletId ??
      emergencyFund?.reserve_wallet_id ??
      emergencyFund?.sourceWalletId ??
      emergencyFund?.source_wallet_id ??
      emergencyFund?.walletId ??
      emergencyFund?.wallet_id ??
      ""
  );
}

function getGoalSaved(goal = {}) {
  return toNumber(goal.saved_amount ?? goal.savedAmount ?? goal.current_amount ?? goal.amount ?? 0);
}

function getGoalWalletId(goal = {}) {
  return clean(goal.wallet_id ?? goal.walletId ?? goal.sourceWalletId ?? goal.source_wallet_id ?? "");
}

function protectedAmountForWallet(walletId = "", context = buyCheckContext) {
  if (!context || !walletId) return 0;

  let protectedAmount = 0;
  const emergencyWalletId = getEmergencyWalletId(context.emergencyFund || {});
  if (emergencyWalletId && walletId === emergencyWalletId) {
    protectedAmount += getEmergencySaved(context.emergencyFund || {});
  }

  context.savingsGoals.forEach((goal) => {
    const goalWalletId = getGoalWalletId(goal);
    if (goalWalletId && goalWalletId === walletId) protectedAmount += getGoalSaved(goal);
  });

  return protectedAmount;
}

function getSelectedWallet() {
  if (!buyCheckContext || !buyCheckState.walletId) return null;
  return buyCheckContext.wallets.find((wallet) => String(wallet.id) === String(buyCheckState.walletId)) || null;
}

function getSpendableBalance() {
  const selectedWallet = getSelectedWallet();
  if (selectedWallet) {
    return Math.max(0, getWalletBalance(selectedWallet) - protectedAmountForWallet(String(selectedWallet.id)));
  }

  if (!buyCheckContext) return 0;

  return buyCheckContext.wallets.reduce((sum, wallet) => {
    return sum + Math.max(0, getWalletBalance(wallet) - protectedAmountForWallet(String(wallet.id)));
  }, 0);
}

function normalizeCategory(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferCategoryFromItem(item = "") {
  const text = clean(item).toLowerCase();
  if (/food|meal|jollibee|mcdo|mcdonald|coffee|milk tea|milktea|snack|restaurant|delivery|grabfood|panda|grocery|groceries/.test(text)) return "Food";
  if (/jeep|bus|taxi|grab|angkas|moveit|gas|fare|transport/.test(text)) return "Transportation";
  if (/rent|electric|water|internet|wifi|bill|load|subscription/.test(text)) return "Bills";
  if (/medicine|doctor|hospital|vitamin|health|checkup/.test(text)) return "Health";
  if (/shoe|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function getBudgetTitle(budget = {}) {
  return clean(budget.category || budget.name || budget.title || budget.label || budget.budget_category || "");
}

function getBudgetLimit(budget = {}) {
  return toNumber(
    budget.amount ??
      budget.limit ??
      budget.budget_amount ??
      budget.allocated ??
      budget.allocated_amount ??
      budget.monthly_amount ??
      budget.cap ??
      0
  );
}

function findBudgetForCategory(category = "") {
  if (!buyCheckContext || !category) return null;

  const key = normalizeCategory(category);
  return buyCheckContext.budgets.find((budget) => normalizeCategory(getBudgetTitle(budget)) === key) || null;
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

function isCurrentMonth(date) {
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getSpentThisMonth(category = "") {
  if (!buyCheckContext || !category) return 0;

  const key = normalizeCategory(category);
  return buyCheckContext.expenses.reduce((sum, expense) => {
    if (normalizeCategory(getExpenseCategory(expense)) !== key) return sum;
    if (!isCurrentMonth(getExpenseDate(expense))) return sum;
    return sum + getExpenseAmount(expense);
  }, 0);
}

function getSimilarPurchases(item = "", category = "") {
  if (!buyCheckContext) return [];

  const itemText = normalizeCategory(item);
  const categoryKey = normalizeCategory(category);

  return buyCheckContext.expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    if (!date) return false;

    const ageDays = (Date.now() - date.getTime()) / 86400000;
    if (ageDays > 30) return false;

    const expenseCategory = normalizeCategory(getExpenseCategory(expense));
    const notes = normalizeCategory(`${expense.notes || ""} ${expense.item || ""} ${expense.title || ""}`);

    return (categoryKey && expenseCategory === categoryKey) || (itemText && notes.includes(itemText));
  });
}

function getUnplannedCount(category = "") {
  return getSimilarPurchases("", category).filter((expense) => {
    const status = clean(expense.planning_status || expense.planningStatus || "").toLowerCase();
    return status === "unplanned" || clean(expense.unplanned_reason || expense.unplannedReason);
  }).length;
}

function getCategories() {
  const fallback = ["Food", "Transportation", "Bills", "Shopping", "Health", "Lifestyle"];
  if (!buyCheckContext) return fallback;

  const categories = new Set(fallback);

  buyCheckContext.budgets.forEach((budget) => {
    const title = getBudgetTitle(budget);
    if (title) categories.add(title);
  });

  buyCheckContext.expenses.slice(0, 60).forEach((expense) => {
    const category = getExpenseCategory(expense);
    if (category && category !== "Uncategorized") categories.add(category);
  });

  return [...categories].slice(0, 12);
}

function extractAmountFromText(value = "") {
  const match = clean(value).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function stripAmountFromText(value = "") {
  return clean(value).replace(/(?:₱|php\s*)?[0-9][0-9,]*(?:\.\d{1,2})?/i, "").trim();
}

function relevantMemoryFor(category = "") {
  const categoryKey = category.toLowerCase();
  return (buyCheckContext?.memory || [])
    .filter((item) => {
      const text = `${item.section} ${item.text}`.toLowerCase();
      return text.includes(categoryKey) || /trigger|stress|tired|impulse|food|spend|budget|pressure|decision|routine|emotional/.test(text);
    })
    .slice(0, 4);
}

function getRecommendedResult() {
  const amount = toNumber(buyCheckState.amount);
  const category = buyCheckState.category || inferCategoryFromItem(buyCheckState.item);
  const spendable = getSpendableBalance();
  const selectedWallet = getSelectedWallet();
  const walletBalance = selectedWallet
    ? getWalletBalance(selectedWallet)
    : (buyCheckContext?.wallets || []).reduce((sum, wallet) => sum + getWalletBalance(wallet), 0);
  const protectedAmount = selectedWallet ? protectedAmountForWallet(String(selectedWallet.id)) : 0;
  const budget = findBudgetForCategory(category);
  const budgetLimit = budget ? getBudgetLimit(budget) : 0;
  const spent = getSpentThisMonth(category);
  const remaining = budgetLimit ? budgetLimit - spent : null;
  const similar = getSimilarPurchases(buyCheckState.item, category);
  const unplannedCount = getUnplannedCount(category);
  const isUnplanned = buyCheckState.planningStatus === "unplanned";
  const memory = relevantMemoryFor(category);

  const reasons = [];
  const risks = [];
  let status = "safe";
  let decision = "Buy";
  let saferMove = "Buy it, then log it so your budget stays accurate.";

  if (!amount || amount <= 0) {
    return {
      status: "risk",
      decision: "Fix amount",
      reasons: ["CLARA needs a valid amount before checking the purchase."],
      saferMove: "Enter the price first.",
      meta: {},
    };
  }

  if (spendable <= 0) {
    status = "risk";
    decision = "Wait";
    risks.push("No spendable wallet balance was found.");
  } else if (amount > spendable) {
    status = "risk";
    decision = "Wait";
    risks.push(`This costs ${money(amount)}, but spendable money is only ${money(spendable)}.`);
  } else {
    reasons.push(`Spendable money checked: ${money(spendable)} available.`);
  }

  if (selectedWallet && protectedAmount > 0 && amount > Math.max(0, walletBalance - protectedAmount)) {
    status = "risk";
    decision = "Wait";
    risks.push(`This may touch protected money in ${getWalletName(selectedWallet)}.`);
  }

  if (budget && remaining !== null) {
    if (amount > remaining) {
      status = status === "risk" ? "risk" : "caution";
      decision = status === "risk" ? decision : "Reduce";
      risks.push(`Your ${category} budget has ${money(Math.max(0, remaining))} left.`);
    } else if (amount > remaining * 0.6) {
      status = status === "safe" ? "caution" : status;
      decision = decision === "Buy" ? "Buy with cap" : decision;
      reasons.push(`It fits the ${category} budget, but it uses a big part of what remains.`);
    } else {
      reasons.push(`It fits your ${category} budget.`);
    }
  } else {
    status = status === "safe" ? "caution" : status;
    reasons.push(`No clear ${category} budget was found, so CLARA treats this with caution.`);
  }

  if (isUnplanned) {
    status = status === "risk" ? "risk" : "pause";
    decision = decision === "Wait" ? decision : "Pause";
    risks.push("You marked this as unplanned, so CLARA adds a pause check.");
    saferMove = "Wait 10 minutes, then buy only if it still feels necessary.";
  }

  if (similar.length >= 3) {
    status = status === "risk" ? "risk" : "caution";
    decision = decision === "Buy" ? "Reduce" : decision;
    risks.push(`${category} appeared ${similar.length} times in the last 30 days.`);
    saferMove = `Cap it below ${money(Math.max(50, Math.floor(amount * 0.6)))} or wait until tomorrow.`;
  }

  if (unplannedCount >= 2) {
    status = status === "risk" ? "risk" : "pause";
    decision = decision === "Wait" ? decision : "Pause";
    risks.push(`Recent ${category} spending includes repeated unplanned purchases.`);
  }

  if (memory.length && (isUnplanned || similar.length >= 2)) {
    status = status === "risk" ? "risk" : "pause";
    decision = decision === "Wait" ? decision : "Pause";
    risks.push("This may connect to a saved spending pattern or trigger.");
  }

  if (status === "risk") {
    saferMove = "Wait for now, or choose a cheaper replacement that does not touch protected money or break the budget.";
  } else if (status === "caution" && decision === "Buy") {
    decision = "Buy with cap";
    saferMove = `Keep it at ${money(amount)} or lower. Do not add extras.`;
  }

  const finalReasons = [...risks, ...reasons].slice(0, 4);
  if (!finalReasons.length) finalReasons.push("CLARA checked wallet, budget, pattern, and memory context.");

  return {
    status,
    decision,
    reasons: finalReasons,
    saferMove,
    meta: {
      category,
      amount,
      spendable,
      walletName: selectedWallet ? getWalletName(selectedWallet) : "All wallets",
      budgetLimit,
      spent,
      remaining,
      similarCount: similar.length,
      memory,
    },
  };
}

function statusCopy(status = "safe") {
  if (status === "risk") return { label: "Risk", emoji: "🔴" };
  if (status === "pause") return { label: "Pause", emoji: "🟠" };
  if (status === "caution") return { label: "Caution", emoji: "🟡" };
  return { label: "Safe", emoji: "🟢" };
}

function resultText(result = buyCheckState.result) {
  const status = statusCopy(result.status);
  const meta = result.meta || {};
  const reasons = (result.reasons || []).map((reason) => `• ${reason}`).join("\n");
  const memory = meta.memory?.length
    ? `\n\nMemory signal used:\n${meta.memory.map((item) => `• ${item.section}: ${item.text}`).join("\n")}`
    : "";

  return `${status.emoji} Decision: ${result.decision}\nRisk: ${status.label}\n\nItem: ${buyCheckState.item}\nAmount: ${money(meta.amount)}\nCategory: ${meta.category || "Lifestyle"}\nWallet: ${meta.walletName || "All wallets"}\n\nWhy:\n${reasons}\n\nSafer move:\n${result.saferMove}${memory}`;
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return includesAny(text, CORE_PANEL_LABELS) && includesAny(text, SMART_ACTIONS_LABELS);
  });
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

function walletChoices() {
  const wallets = buyCheckContext?.wallets || [];
  if (!wallets.length) return [{ label: "Continue without wallet", value: "" }];

  return wallets.slice(0, 8).map((wallet) => {
    const balance = getWalletBalance(wallet);
    const protectedAmount = protectedAmountForWallet(String(wallet.id));
    const spendable = Math.max(0, balance - protectedAmount);
    return {
      label: `${getWalletName(wallet)} · ${money(spendable)}`,
      value: String(wallet.id),
    };
  });
}

function categoryChoices() {
  return getCategories().map((category) => ({ label: category, value: category }));
}

function quickChoicesHtml() {
  if (buyCheckState.step === "plan") {
    return `
      <div class="clara-buy-check-choices two">
        <button type="button" data-buy-check-choice="planned">Planned</button>
        <button type="button" data-buy-check-choice="unplanned">Unplanned</button>
      </div>
    `;
  }

  if (buyCheckState.step === "wallet") {
    return `<div class="clara-buy-check-choices">${walletChoices()
      .map((choice) => `<button type="button" data-buy-check-choice="${escapeHtml(choice.value)}">${escapeHtml(choice.label)}</button>`)
      .join("")}</div>`;
  }

  if (buyCheckState.step === "category") {
    return `<div class="clara-buy-check-choices">${categoryChoices()
      .map((choice) => `<button type="button" data-buy-check-choice="${escapeHtml(choice.value)}">${escapeHtml(choice.label)}</button>`)
      .join("")}</div>`;
  }

  if (buyCheckState.step === "result") {
    return `
      <div class="clara-buy-check-choices two">
        <button type="button" data-buy-check-reset="true">Check another</button>
        <button type="button" data-close-buy-check="true">Done</button>
      </div>
    `;
  }

  return "";
}

function messagesHtml() {
  const messages = buyCheckLoading
    ? [
        ...buyCheckState.messages,
        { role: "assistant", text: "Reading your wallet, budget, expenses, goals, and spending memory..." },
      ]
    : buyCheckState.messages;

  return messages
    .map((message) => `<div class="clara-buy-check-message ${message.role}">${escapeHtml(message.text).replace(/\n/g, "<br>")}</div>`)
    .join("");
}

function renderBuyCheckPanel() {
  return `
    <div id="${BUY_CHECK_PANEL_ID}" class="clara-buy-check-shell" role="dialog" aria-label="CLARA Buy Check">
      <div class="clara-buy-check-backdrop" data-close-buy-check="true"></div>
      <section class="clara-buy-check-panel">
        <header class="clara-buy-check-header">
          <div>
            <p>BUY CHECK</p>
            <h2>Pause before you spend.</h2>
            <span>Controlled chat • wallet + budget + pattern check</span>
          </div>
          <button type="button" data-close-buy-check="true" aria-label="Close Buy Check">×</button>
        </header>
        <main class="clara-buy-check-body" data-buy-check-messages="true">
          ${messagesHtml()}
        </main>
        ${quickChoicesHtml()}
        <form class="clara-buy-check-form" data-buy-check-form="true">
          <input name="buyCheckText" autocomplete="off" ${buyCheckLoading || buyCheckState.step === "result" ? "disabled" : ""} placeholder="${buyCheckState.step === "amount" ? "Type the amount..." : buyCheckState.step === "category" ? "Type category or choose above..." : "Type your answer..."}" />
          <button type="submit" ${buyCheckLoading || buyCheckState.step === "result" ? "disabled" : ""}>↑</button>
        </form>
      </section>
    </div>`;
}

function ensureBuyCheckStyles() {
  if (document.getElementById("clara-buy-check-guided-style")) return;

  const style = document.createElement("style");
  style.id = "clara-buy-check-guided-style";
  style.textContent = `
    .clara-buy-check-shell { position: fixed; inset: 0; z-index: 620; display: flex; justify-content: center; align-items: stretch; color: white; }
    .clara-buy-check-backdrop { position: absolute; inset: 0; background: rgba(2,6,23,.68); backdrop-filter: blur(6px); }
    .clara-buy-check-panel { position: relative; width: min(430px, 100vw); min-height: 100vh; max-height: 100vh; overflow: hidden; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,.12); background: radial-gradient(circle at 18% 0%, rgba(16,185,129,.22), transparent 34%), radial-gradient(circle at 88% 12%, rgba(34,211,238,.18), transparent 34%), linear-gradient(145deg, rgba(3,12,22,.98), rgba(15,23,42,.96)); box-shadow: 0 0 90px rgba(0,0,0,.55); padding-top: max(env(safe-area-inset-top), 18px); }
    .clara-buy-check-header { display: flex; justify-content: space-between; gap: 14px; padding: 20px 20px 14px; border-bottom: 1px solid rgba(255,255,255,.08); flex: 0 0 auto; }
    .clara-buy-check-header p { margin: 0 0 7px; color: rgba(110,231,183,.76); font: 950 10px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; }
    .clara-buy-check-header h2 { margin: 0; font: 950 23px/1.05 system-ui, sans-serif; color: white; }
    .clara-buy-check-header span { display: block; margin-top: 8px; color: rgba(226,232,240,.62); font: 750 12px/1.45 system-ui, sans-serif; }
    .clara-buy-check-header button { width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: white; font-size: 24px; }
    .clara-buy-check-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 14px 10px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; }
    .clara-buy-check-body::-webkit-scrollbar { display: none; }
    .clara-buy-check-message { max-width: 92%; border: 1px solid rgba(255,255,255,.10); border-radius: 22px; padding: 12px 14px; font: 760 13px/1.55 system-ui, sans-serif; white-space: normal; box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
    .clara-buy-check-message.assistant { align-self: flex-start; background: rgba(255,255,255,.055); color: rgba(248,250,252,.90); }
    .clara-buy-check-message.user { align-self: flex-end; background: rgba(110,231,183,.18); border-color: rgba(110,231,183,.22); color: white; }
    .clara-buy-check-choices { flex: 0 0 auto; display: flex; gap: 8px; overflow-x: auto; padding: 8px 14px 10px; scrollbar-width: none; }
    .clara-buy-check-choices::-webkit-scrollbar { display: none; }
    .clara-buy-check-choices.two { display: grid; grid-template-columns: 1fr 1fr; overflow-x: visible; }
    .clara-buy-check-choices button { flex: 0 0 auto; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(255,255,255,.07); color: white; padding: 11px 13px; font: 850 12px/1 system-ui, sans-serif; }
    .clara-buy-check-choices.two button { border-radius: 18px; padding: 13px; }
    .clara-buy-check-form { margin: 0 14px max(14px, env(safe-area-inset-bottom)); display: flex; gap: 8px; align-items: center; border: 1px solid rgba(255,255,255,.11); border-radius: 22px; background: rgba(255,255,255,.055); padding: 8px; flex: 0 0 auto; }
    .clara-buy-check-form input { min-width: 0; flex: 1 1 auto; height: 42px; border: 0; background: transparent; color: white; outline: none; font: 760 13px/1 system-ui, sans-serif; }
    .clara-buy-check-form input::placeholder { color: rgba(203,213,225,.46); }
    .clara-buy-check-form button { width: 42px; height: 42px; border-radius: 999px; border: 0; background: linear-gradient(135deg, rgba(110,231,183,.96), rgba(34,211,238,.82)); color: rgba(2,6,23,.96); font: 950 18px/1 system-ui, sans-serif; }
    .clara-buy-check-form input:disabled, .clara-buy-check-form button:disabled { opacity: .45; }
  `;
  document.head.appendChild(style);
}

function closeBuyCheck() {
  document.getElementById(BUY_CHECK_PANEL_ID)?.remove();
}

function renderBuyCheck() {
  ensureBuyCheckStyles();
  closeBuyCheck();
  document.body.insertAdjacentHTML("beforeend", renderBuyCheckPanel());

  requestAnimationFrame(() => {
    const messages = document.querySelector(`#${BUY_CHECK_PANEL_ID} [data-buy-check-messages]`);
    const input = document.querySelector(`#${BUY_CHECK_PANEL_ID} input[name="buyCheckText"]`);
    messages?.scrollTo?.({ top: messages.scrollHeight, behavior: "smooth" });
    input?.focus?.();
  });
}

async function openBuyCheckMode() {
  buyCheckState = makeInitialState();
  buyCheckContext = null;
  buyCheckLoading = true;
  renderBuyCheck();

  try {
    buyCheckContext = await loadBuyCheckContext();
  } catch (error) {
    console.warn("[CLARA Buy Check] Context load failed", error);
    buyCheckContext = { wallets: [], expenses: [], budgets: [], savingsGoals: [], emergencyFund: null, memory: [] };
  } finally {
    buyCheckLoading = false;
    renderBuyCheck();
  }
}

function askNextAfterItem(userText = "") {
  const amount = extractAmountFromText(userText);
  const item = stripAmountFromText(userText) || userText;
  buyCheckState.item = item;
  if (amount > 0) buyCheckState.amount = String(amount);

  addMessage("user", userText);

  if (amount > 0) {
    buyCheckState.step = "plan";
    addMessage("assistant", `${item} for ${money(amount)}. Was this planned or unplanned?`);
    return;
  }

  buyCheckState.step = "amount";
  addMessage("assistant", `How much does ${item} cost?`);
}

function askNextAfterAmount(userText = "") {
  const amount = extractAmountFromText(userText);
  addMessage("user", userText);

  if (amount <= 0) {
    addMessage("assistant", "Please enter a valid amount so I can check it properly.");
    return;
  }

  buyCheckState.amount = String(amount);
  buyCheckState.step = "plan";
  addMessage("assistant", `${money(amount)} noted. Was this planned or unplanned?`);
}

function askNextAfterPlan(value = "") {
  const normalized = clean(value).toLowerCase().includes("un") ? "unplanned" : "planned";
  buyCheckState.planningStatus = normalized;
  addMessage("user", normalized === "planned" ? "Planned" : "Unplanned");
  buyCheckState.step = "wallet";

  const wallets = buyCheckContext?.wallets || [];
  if (!wallets.length) {
    addMessage("assistant", "I don’t see a wallet yet, so I’ll check this using budget and behavior context only. What category should this go under?");
    buyCheckState.step = "category";
    if (!buyCheckState.category) buyCheckState.category = inferCategoryFromItem(buyCheckState.item);
    return;
  }

  addMessage("assistant", "Which wallet will you use? Choose one below, or type the wallet name.");
}

function askNextAfterWallet(value = "") {
  const wallets = buyCheckContext?.wallets || [];
  const exact = wallets.find((wallet) => String(wallet.id) === String(value));
  const byName = wallets.find((wallet) => getWalletName(wallet).toLowerCase() === clean(value).toLowerCase());
  const selected = exact || byName || null;

  buyCheckState.walletId = selected ? String(selected.id) : "";
  addMessage("user", selected ? getWalletName(selected) : "Continue without wallet");

  if (!buyCheckState.category) buyCheckState.category = inferCategoryFromItem(buyCheckState.item);

  buyCheckState.step = "category";
  addMessage("assistant", `What category is this? I guessed ${buyCheckState.category}. You can choose below or type another category.`);
}

function finishCategory(value = "") {
  buyCheckState.category = clean(value) || buyCheckState.category || inferCategoryFromItem(buyCheckState.item);
  addMessage("user", buyCheckState.category);
  buyCheckState.result = getRecommendedResult();
  buyCheckState.step = "result";
  addMessage("assistant", resultText(buyCheckState.result));
}

function handleBuyCheckAnswer(value = "") {
  const text = clean(value);
  if (!text || buyCheckLoading) return;

  if (buyCheckState.step === "item") askNextAfterItem(text);
  else if (buyCheckState.step === "amount") askNextAfterAmount(text);
  else if (buyCheckState.step === "plan") askNextAfterPlan(text);
  else if (buyCheckState.step === "wallet") askNextAfterWallet(text);
  else if (buyCheckState.step === "category") finishCategory(text);

  renderBuyCheck();
}

function installBuyCheckEvents() {
  document.addEventListener(
    "click",
    (event) => {
      const close = event.target?.closest?.("[data-close-buy-check]");
      if (close) {
        closeBuyCheck();
        return;
      }

      const reset = event.target?.closest?.("[data-buy-check-reset]");
      if (reset) {
        buyCheckState = makeInitialState();
        renderBuyCheck();
        return;
      }

      const choice = event.target?.closest?.("[data-buy-check-choice]");
      if (choice) {
        event.preventDefault();
        event.stopPropagation();
        handleBuyCheckAnswer(choice.getAttribute("data-buy-check-choice") || choice.textContent || "");
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
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target?.closest?.("[data-buy-check-form]");
      if (!form) return;

      event.preventDefault();
      event.stopPropagation();
      const input = form.querySelector('input[name="buyCheckText"]');
      const value = clean(input?.value);
      if (!value) return;
      input.value = "";
      handleBuyCheckAnswer(value);
    },
    true
  );
}

function installBuyCheckObserver() {
  const observer = new MutationObserver(() => relabelBuyCheckTab());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelBuyCheckTab();
}

function installClaraAssistantBuyCheckTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_BUY_CHECK_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_BUY_CHECK_TAB_INSTALLED__ = true;
  installBuyCheckEvents();
  installBuyCheckObserver();
}

installClaraAssistantBuyCheckTab();
