import {
  LOCAL_FINANCE_STORES,
  addBudget,
  openLocalFinanceDb,
} from "./localFinanceStore";

const MONEY_PATTERN = /(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?/i;
const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_BUDGET_EVENTS = ["clara-budgets-updated", "clara-finance-updated"];

let autoRunStarted = false;
const processedBudgetCommands = new Set();

function toNumber(value) {
  const cleaned = String(value || "")
    .replace(/php/gi, "")
    .replace(/[₱,\s]/g, "")
    .trim();

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : "₱0";
}

function cleanCategoryName(value = "") {
  return String(value || "")
    .replace(/[🏠🍚🚗💾🎯🧠📱]/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value = "") {
  return cleanCategoryName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "budget-category";
}

function extractDeclaredAmount(text = "") {
  const match = String(text || "").match(/declared[^\d]*((?:₱|php\s*)?\d[\d,]*)/i);
  return match ? toNumber(match[1]) : 0;
}

function parseTableRows(text = "") {
  const rows = [];

  const segments = String(text || "")
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (let index = 0; index < segments.length - 1; index += 1) {
    const category = cleanCategoryName(segments[index]);
    const next = segments[index + 1];

    if (!MONEY_PATTERN.test(next)) continue;
    if (/category|budget|declared/i.test(category)) continue;

    const amountMatch = next.match(MONEY_PATTERN);
    const amount = amountMatch ? toNumber(amountMatch[0]) : 0;

    if (!category || amount <= 0) continue;

    rows.push({
      title: category,
      amount,
      slug: slugify(category),
    });
  }

  const unique = [];
  const seen = new Set();

  rows.forEach((row) => {
    const signature = `${row.slug}:${row.amount}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    unique.push(row);
  });

  return unique;
}

function looksLikeBudgetSetup(text = "") {
  const clean = String(text || "").toLowerCase();
  return clean.includes("budget") && clean.includes("declared") && MONEY_PATTERN.test(clean);
}

function getRecordTime(record = {}) {
  return new Date(record.updatedAt || record.updated_at || 0).getTime();
}

async function readAllStoreRecords(storeName) {
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error(`Failed to read ${storeName}.`));
  });
}

async function inferActiveLocalUserId() {
  const storesToCheck = [
    LOCAL_FINANCE_STORES.wallets,
    LOCAL_FINANCE_STORES.budgets,
    LOCAL_FINANCE_STORES.expenses,
  ].filter(Boolean);

  const records = [];

  for (const storeName of storesToCheck) {
    try {
      const rows = await readAllStoreRecords(storeName);
      records.push(...rows.filter((row) => row?.localUserId));
    } catch {}
  }

  const newestRecord = records.sort((a, b) => getRecordTime(b) - getRecordTime(a))[0];
  return newestRecord?.localUserId || "local-user";
}

function commandSignature(command) {
  return [
    command.declaredAmount,
    command.allocatedTotal,
    command.categories.map((item) => `${item.slug}:${item.amount}`).join(";"),
  ].join("|");
}

function dispatchBudgetRefresh(command, localUserId) {
  if (typeof window === "undefined") return;

  window.__claraLastBudgetCommandResult = {
    status: "saved",
    localUserId,
    declaredAmount: command.declaredAmount,
    allocatedTotal: command.allocatedTotal,
    categoryCount: command.categoryCount,
    savedAt: new Date().toISOString(),
  };

  CLARA_BUDGET_EVENTS.forEach((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName));
  });
}

async function executeBudgetSetupCommand(command) {
  if (!command?.isBalanced) return null;

  const signature = commandSignature(command);
  if (processedBudgetCommands.has(signature)) return null;
  processedBudgetCommands.add(signature);

  const localUserId = await inferActiveLocalUserId();
  const records = buildClaraBudgetRecords(command);

  for (const record of records) {
    await addBudget(localUserId, record);
  }

  dispatchBudgetRefresh(command, localUserId);

  return {
    localUserId,
    records,
  };
}

async function handleMoneyChatEvent(event) {
  const messages = Array.isArray(event?.detail?.messages) ? event.detail.messages : [];
  const latestUserMessage = [...messages].reverse().find((message) => message?.role === "user");
  const text = latestUserMessage?.text || "";
  const command = parseClaraBudgetSetupCommand(text);

  if (!command?.isBalanced) return;

  try {
    await executeBudgetSetupCommand(command);
  } catch (error) {
    console.warn("CLARA budget command failed:", error);
  }
}

export function parseClaraBudgetSetupCommand(text = "") {
  if (!looksLikeBudgetSetup(text)) return null;

  const declaredAmount = extractDeclaredAmount(text);
  const categories = parseTableRows(text);

  if (!categories.length) return null;

  const allocatedTotal = categories.reduce((sum, row) => sum + row.amount, 0);
  const difference = declaredAmount ? allocatedTotal - declaredAmount : allocatedTotal;
  const isBalanced = declaredAmount > 0 && Math.abs(difference) < 1;

  return {
    type: "budget_setup",
    declaredAmount,
    categories,
    allocatedTotal,
    difference,
    isBalanced,
    categoryCount: categories.length,
  };
}

export function buildClaraBudgetCommandPreviewReply(command) {
  if (!command) return null;

  return `I can read this budget perfectly ✅ Declared ${formatMoney(command.declaredAmount)} and ${command.categoryCount} categories total ${formatMoney(command.allocatedTotal)}.`;
}

export function buildClaraBudgetRecords(command, { monthKey } = {}) {
  if (!command?.isBalanced) return [];

  const safeMonthKey = monthKey || new Date().toISOString().slice(0, 7);
  const timestamp = new Date().toISOString();

  const header = {
    id: `clara_budget_header_${safeMonthKey}`,
    title: "Monthly Spending Plan",
    category: "__monthly_budget__",
    type: "monthly_budget",
    month: safeMonthKey,
    declared_amount: command.declaredAmount,
    amount: command.declaredAmount,
    created_via: "clara_command_center",
    updated_at: timestamp,
  };

  const categoryRows = command.categories.map((item, index) => ({
    id: `clara_budget_${safeMonthKey}_${item.slug}`,
    title: item.title,
    category: item.title,
    amount: item.amount,
    allocated: item.amount,
    month: safeMonthKey,
    sort_order: index,
    created_via: "clara_command_center",
    updated_at: timestamp,
  }));

  return [header, ...categoryRows];
}

export function ensureClaraBudgetCommandCenterAutoRun() {
  if (autoRunStarted) return;
  if (typeof window === "undefined") return;

  autoRunStarted = true;
  window.addEventListener(CLARA_MONEY_CHAT_EVENT, handleMoneyChatEvent);
}

export const claraBudgetCommandCenterUtils = {
  parseClaraBudgetSetupCommand,
  buildClaraBudgetCommandPreviewReply,
  buildClaraBudgetRecords,
  ensureClaraBudgetCommandCenterAutoRun,
};
