import { queryClientInstance } from "@/lib/query-client";
import { supabase } from "@/lib/supabaseClient";
import { AI_INTENTS, formatPeso, titleCase } from "@/lib/ai-command/command-parser";
import { buildCreatedAtFromPHDate, getPHMonthKey, monthKeyToPHRange } from "@/lib/ai-command/time";

const EXPENSES_TABLE = "expenses";
const WALLETS_TABLE = "wallets";
const TXN_TABLE = "wallet_transactions";

function generateId(prefix = "ai") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/[₱,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function userFilter(row, user) {
  const userId = String(user?.id || "");
  const email = normalize(user?.email);
  return (
    (userId && [row?.user_id, row?.owner_id, row?.profile_id].map(String).includes(userId)) ||
    (email &&
      [row?.user_email, row?.created_by, row?.owner_email, row?.email]
        .map(normalize)
        .includes(email))
  );
}

async function fetchUserRows(table, user) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  return (data || []).filter((row) => userFilter(row, user));
}

async function resolveWallet(walletName, user) {
  const wallets = await fetchUserRows(WALLETS_TABLE, user);
  const requested = normalize(walletName);
  const wallet =
    wallets.find((item) => normalize(item.name || item.wallet_name) === requested) ||
    wallets.find((item) => normalize(item.name || item.wallet_name).includes(requested)) ||
    null;

  if (!wallet) {
    return { wallet: null, wallets };
  }

  return {
    wallet: {
      ...wallet,
      id: String(wallet.id),
      name: wallet.name || wallet.wallet_name || "Wallet",
      balance: toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? 0),
    },
    wallets,
  };
}

async function updateWalletBalance(walletId, nextBalance) {
  const { error } = await supabase
    .from(WALLETS_TABLE)
    .update({ balance: toNumber(nextBalance), updated_at: new Date().toISOString() })
    .eq("id", walletId);
  if (error) throw error;
}

async function insertWalletTransaction(payload, user) {
  const now = payload.created_at || new Date().toISOString();
  const { error } = await supabase.from(TXN_TABLE).insert([
    {
      id: generateId("txn"),
      wallet_id: payload.wallet_id ? String(payload.wallet_id) : null,
      amount: toNumber(payload.amount),
      type: payload.type,
      category: payload.category || null,
      need_type: payload.need_type || null,
      planning_status: payload.planning_status || null,
      unplanned_reason: payload.unplanned_reason || null,
      expense_id: payload.expense_id || null,
      source_type: payload.source_type || null,
      tag: payload.tag || null,
      notes: payload.notes || "",
      created_at: now,
      updated_at: now,
      created_by: user?.email || null,
      user_email: user?.email || null,
      user_id: user?.id || null,
    },
  ]);
  if (error) throw error;
}

function ensureUser(user) {
  if (!user?.id && !user?.email) {
    throw Object.assign(new Error("Please sign in again before I make changes."), {
      code: "NO_USER",
    });
  }
}

function ensurePositiveAmount(value) {
  const amount = toNumber(value);
  if (amount <= 0) {
    throw Object.assign(new Error("I need a valid amount before I can do that."), {
      code: "INVALID_AMOUNT",
    });
  }
  return amount;
}

async function executeLogExpense(command, context) {
  const user = context.user;
  ensureUser(user);

  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.amount);
  const label = String(data.item || data.label || "").trim();
  if (!label) throw new Error("What should I call this expense?");

  const { wallet } = await resolveWallet(data.wallet, user);
  if (!wallet) {
    return {
      success: false,
      intent: command.intent,
      errorCode: "WALLET_NOT_FOUND",
      message: `I couldn’t find a wallet named ${data.wallet}. Try the exact wallet name.`,
    };
  }

  if (amount > wallet.balance) {
    return {
      success: false,
      intent: command.intent,
      errorCode: "INSUFFICIENT_BALANCE",
      message: `That is more than the current ${wallet.name} balance.`,
    };
  }

  const createdAt = buildCreatedAtFromPHDate(data.date);
  const expenseId = generateId("expense");
  const payload = {
    id: expenseId,
    amount,
    category: data.category || "other",
    wallet_id: wallet.id,
    date: data.date,
    notes: label,
    need_type: ["food", "transport", "utilities", "housing", "health", "education"].includes(data.category)
      ? "need"
      : "want",
    planning_status: "planned",
    unplanned_reason: null,
    created_by: user.email || null,
    user_email: user.email || null,
    user_id: user.id || null,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const { error } = await supabase.from(EXPENSES_TABLE).insert([payload]);
  if (error) throw error;

  await insertWalletTransaction(
    {
      wallet_id: wallet.id,
      amount,
      type: "expense",
      category: payload.category,
      need_type: payload.need_type,
      planning_status: "planned",
      expense_id: expenseId,
      notes: label,
      created_at: createdAt,
    },
    user
  );

  await updateWalletBalance(wallet.id, wallet.balance - amount);

  return {
    success: true,
    intent: command.intent,
    message: `Done. I logged ${formatPeso(amount)} for ${label} from ${wallet.name}.`,
    createdRecord: payload,
  };
}

async function executeAddMoney(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.amount);
  const { wallet } = await resolveWallet(data.wallet, user);

  if (!wallet) {
    return {
      success: false,
      intent: command.intent,
      errorCode: "WALLET_NOT_FOUND",
      message: `I couldn’t find a wallet named ${data.wallet}.`,
    };
  }

  await updateWalletBalance(wallet.id, wallet.balance + amount);
  await insertWalletTransaction(
    {
      wallet_id: wallet.id,
      amount,
      type: "income",
      source_type: "AI command",
      notes: "Added through CLARA voice command",
      created_at: new Date().toISOString(),
    },
    user
  );

  return {
    success: true,
    intent: command.intent,
    message: `Done. I added ${formatPeso(amount)} to your ${wallet.name} wallet.`,
  };
}

async function executeCreateBudget(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.amount);
  const label = String(data.label || "").trim();
  if (!label) throw new Error("What should I call this budget?");

  const month = data.period || getPHMonthKey();
  const range = monthKeyToPHRange(month);
  const category = data.category || "other";
  const now = new Date().toISOString();
  const payload = {
    month,
    category,
    budget_category: category,
    allocated_amount: amount,
    total_budget: amount,
    needs_pct: ["housing", "food", "transport", "utilities", "health", "education"].includes(category) ? 100 : 0,
    wants_pct: ["entertainment", "shopping", "personal"].includes(category) ? 100 : 0,
    other_pct: category === "other" ? 100 : 0,
    needs_percent: ["housing", "food", "transport", "utilities", "health", "education"].includes(category) ? 100 : 0,
    wants_percent: ["entertainment", "shopping", "personal"].includes(category) ? 100 : 0,
    other_percent: category === "other" ? 100 : 0,
    savings_pct: category === "other" ? 100 : 0,
    savings_percent: category === "other" ? 100 : 0,
    tracking_start_date: range.start,
    tracking_end_date: range.end,
    range_start: range.start,
    range_end: range.end,
    is_manual_range: true,
    created_at: now,
    updated_at: now,
    created_by: user.email || null,
    email: user.email || null,
    user_id: user.id || null,
  };

  const { error, data: inserted } = await supabase.from("budgets").insert([payload]).select("*").single();
  if (error) throw error;

  return {
    success: true,
    intent: command.intent,
    message: `Done. I created a ${formatPeso(amount)} budget for ${titleCase(label)}.`,
    createdRecord: inserted || payload,
  };
}

async function executeCreateSavingsGoal(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.targetAmount);
  const label = String(data.label || "").trim();
  if (!label) throw new Error("What should I call this savings goal?");

  const now = new Date().toISOString();
  const payload = {
    id: generateId("goal"),
    title: titleCase(label),
    category: "",
    subcategory: "",
    target_amount: amount,
    saved_amount: 0,
    planned_use_date: data.targetDate || null,
    reasons: ["Created through CLARA command", "", ""],
    emotional_value: "security",
    flexibility: "flexible",
    priority: "medium",
    notes: "",
    wallet_id: null,
    created_by: user.email || null,
    user_email: user.email || null,
    user_id: user.id || null,
    created_date: now,
    updated_date: now,
  };

  const { error, data: inserted } = await supabase.from("savings_goals").insert([payload]).select("*").single();
  if (error) throw error;

  return {
    success: true,
    intent: command.intent,
    message: `Done. I created your ${titleCase(label)} savings goal with a target of ${formatPeso(amount)}.`,
    createdRecord: inserted || payload,
  };
}

function refreshAppFinanceState() {
  ["clara-expenses-updated", "clara-finance-updated", "clara-wallets-updated", "clara-wallet-transactions-updated", "clara-budgets-updated"].forEach(
    (eventName) => window.dispatchEvent(new Event(eventName))
  );
  queryClientInstance.invalidateQueries();
}

export async function executeAICommand(command, context = {}) {
  if (!command?.canExecute) {
    return {
      success: false,
      intent: command?.intent || AI_INTENTS.UNKNOWN,
      errorCode: "INCOMPLETE_COMMAND",
      message: "I still need a little more detail before I can do that.",
    };
  }

  try {
    let result;
    if (command.intent === AI_INTENTS.LOG_EXPENSE) result = await executeLogExpense(command, context);
    else if (command.intent === AI_INTENTS.ADD_MONEY) result = await executeAddMoney(command, context);
    else if (command.intent === AI_INTENTS.CREATE_BUDGET) result = await executeCreateBudget(command, context);
    else if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL) result = await executeCreateSavingsGoal(command, context);
    else {
      return {
        success: false,
        intent: command.intent,
        errorCode: "UNKNOWN_INTENT",
        message: "I can help with expenses, wallet money, budgets, and savings goals for now.",
      };
    }

    if (result?.success) refreshAppFinanceState();
    return result;
  } catch (error) {
    console.error("AI command execution failed:", error);
    return {
      success: false,
      intent: command?.intent || AI_INTENTS.UNKNOWN,
      errorCode: error?.code || "EXECUTION_FAILED",
      message: error?.message || "I couldn’t complete that right now.",
    };
  }
}

