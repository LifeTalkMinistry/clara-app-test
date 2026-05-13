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
  return String(value)
    .replace(/[*_`]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
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
  const patterns = [
    /declared(?:\s+(?:budget|amount|income|monthly))?\D{0,30}((?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)/i,
    /(?:monthly\s+)?(?:income|budget)\D{0,30}((?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match?.[1]) {
      const amount = toNumber(match[1]);
      if (amount > 0) return amount;
    }
  }

  return 0;
}

function parseTableRows(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => line.replace(/^\|/, "").replace(/\|$/, ""))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2)
    .filter((cells) => !/^[-:\s]+$/.test(cells.join("")))
    .filter((cells) => !/category/i.test(cells[0]) || MONEY_PATTERN.test(cells[cells.length - 1]))
    .map((cells) => {
      const categoryCell = cells[0];
      const amountCell = cells[cells.length - 1];
      const amountMatch = amountCell.match(MONEY_PATTERN);
      const amount = amountMatch ? toNumber(amountMatch[0]) : 0;
      const title = cleanCategoryName(categoryCell);

      return title && amount > 0
        ? {
            title,
            amount,
            slug: slugify(title),
          }
        : null;
    })
    .filter(Boolean);
}

function looksLikeBudgetSetup(text = "") {
  const clean = String(text || "").toLowerCase();
  return (
    (clean.includes("budget") || clean.includes("declared")) &&
    (clean.includes("set") || clean.includes("setup") || clean.includes("help me") || clean.includes("decided")) &&
    MONEY_PATTERN.test(clean)
  );
}

function getRecordTime(record = {}) {
  return new Date(
    record.updatedAt ||
      record.updated_at ||
      record.createdAt ||
      record.created_at ||
      record.date ||
      0
  ).getTime();
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
    LOCAL_FINANCE_STORES.walletTransactions,
    LOCAL_FINANCE_STORES.savingsGoals,
    LOCAL_FINANCE_STORES.lifeProfile,
  ].filter(Boolean);

  const records = [];

  for (const storeName of storesToCheck) {
    try {
      const rows = await readAllStoreRecords(storeName);
      records.push(
        ...rows.filter((row) => row?.localUserId && !row?.deletedAt && !row?.deleted_at)
      );
    } catch {
      // Keep the command center resilient if one optional store is unavailable.
    }
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
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: window.__claraLastBudgetCommandResult,
      })
    );
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

  console.log("CLARA budget command saved:", {
    localUserId,
    declaredAmount: command.declaredAmount,
    categoryCount: command.categoryCount,
  });

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

    if (typeof window !== "undefined") {
      window.__claraLastBudgetCommandResult = {
        status: "failed",
        error: error?.message || "Budget command failed.",
        failedAt: new Date().toISOString(),
      };
    }
  }
}

export function parseClaraBudgetSetupCommand(text = "") {
  if (!looksLikeBudgetSetup(text)) return null;

  const declaredAmount = extractDeclaredAmount(text);
  const categories = parseTableRows(text);

  if (!categories.length) return null;

  const allocatedTotal = categories.reduce((sum, row) => sum + row.amount, 0);
  const difference = declaredAmount ? allocatedTotal - declaredAmount : allocatedTotal;
  const isBalanced = declaredAmount > 0 && Math.abs(difference) < 0.01;

  return {
    type: "budget_setup",
    phase: "parse_validate",
    declaredAmount,
    categories,
    allocatedTotal,
    difference,
    isBalanced,
    categoryCount: categories.length,
  };
}

export function buildClaraBudgetCommandPreviewReply(command) {
  if (!command || command.type !== "budget_setup") return null;

  const topCategories = command.categories
    .slice(0, 3)
    .map((item) => `${item.title} ${formatMoney(item.amount)}`)
    .join(", ");

  if (!command.declaredAmount) {
    return `I can read the budget categories, but I need the declared monthly amount first ⚠ I detected ${command.categoryCount} categories totaling ${formatMoney(command.allocatedTotal)}. Add something like “Declared ${formatMoney(command.allocatedTotal)}” so I can validate it.`;
  }

  if (!command.isBalanced) {
    const direction = command.difference > 0 ? "over" : "under";
    return `I can read the budget, but it is ${formatMoney(Math.abs(command.difference))} ${direction} your declared amount ⚠ Declared: ${formatMoney(command.declaredAmount)}. Categories total: ${formatMoney(command.allocatedTotal)}. Fix that difference first, then I can set it up.`;
  }

  return `I can read this budget perfectly ✅ Declared ${formatMoney(command.declaredAmount)} and ${command.categoryCount} categories total ${formatMoney(command.allocatedTotal)}. I’m setting this up as your active monthly budget now.`;
}

export function buildClaraBudgetRecords(command, { monthKey, monthRange } = {}) {
  if (!command?.isBalanced) return [];

  const safeMonthKey = monthKey || new Date().toISOString().slice(0, 7);
  const timestamp = new Date().toISOString();

  const header = {
    id: `clara_budget_header_${safeMonthKey}`,
    title: "Monthly Spending Plan",
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    type: "monthly_budget",
    plan_type: "monthly_budget",
    is_plan_header: true,
    is_active: true,
    active: true,
    status: "active",
    month: safeMonthKey,
    month_key: safeMonthKey,
    declared_amount: command.declaredAmount,
    declared_budget: command.declaredAmount,
    monthly_budget_amount: command.declaredAmount,
    total_declared_budget: command.declaredAmount,
    amount: command.declaredAmount,
    cycle_start: monthRange?.start || null,
    cycle_end: monthRange?.end || null,
    created_via: "clara_command_center",
    updated_at: timestamp,
  };

  const categoryRows = command.categories.map((item, index) => ({
    id: `clara_budget_${safeMonthKey}_${item.slug}`,
    title: item.title,
    category: item.title,
    budget_category: item.title,
    section_key: item.slug,
    amount: item.amount,
    budget: item.amount,
    budget_amount: item.amount,
    allocated: item.amount,
    allocated_amount: item.amount,
    total_budget: item.amount,
    month: safeMonthKey,
    month_key: safeMonthKey,
    sort_order: index,
    display_order: index,
    is_active: true,
    active: true,
    status: "active",
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
