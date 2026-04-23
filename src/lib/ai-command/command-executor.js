import { queryClientInstance } from "@/lib/query-client";
import { supabase } from "@/lib/supabaseClient";
import { AI_INTENTS, WRITE_INTENTS, formatPeso, titleCase } from "@/lib/ai-command/command-parser";
import { computeFinanceSummary, loadFinanceSnapshot } from "@/lib/ai-command/finance-context";
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
    (email && [row?.user_email, row?.created_by, row?.owner_email, row?.email].map(normalize).includes(email))
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

  if (!wallet) return { wallet: null, wallets };
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
      id: payload.id || generateId("txn"),
      wallet_id: payload.wallet_id ? String(payload.wallet_id) : null,
      amount: toNumber(payload.amount),
      type: payload.type,
      category: payload.category || null,
      need_type: payload.need_type || null,
      planning_status: payload.planning_status || null,
      unplanned_reason: payload.unplanned_reason || null,
      expense_id: payload.expense_id || null,
      transfer_group_id: payload.transfer_group_id || null,
      related_wallet_id: payload.related_wallet_id || null,
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
      message: `I could not find a wallet named ${data.wallet}. Try the exact wallet name.`,
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
  const category = data.category || "other";
  const payload = {
    id: expenseId,
    amount,
    category,
    wallet_id: wallet.id,
    date: data.date,
    notes: label,
    need_type: ["food", "transport", "utilities", "housing", "health", "education"].includes(category) ? "need" : "want",
    planning_status: data.planning_status || "planned",
    unplanned_reason: data.planning_status === "unplanned" ? data.unplanned_reason || "Logged through CLARA" : null,
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
      category,
      need_type: payload.need_type,
      planning_status: payload.planning_status,
      unplanned_reason: payload.unplanned_reason,
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
      message: `I could not find a wallet named ${data.wallet}.`,
    };
  }

  await updateWalletBalance(wallet.id, wallet.balance + amount);
  await insertWalletTransaction(
    {
      wallet_id: wallet.id,
      amount,
      type: "income",
      source_type: "AI command",
      notes: "Added through CLARA",
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

async function executeTransferMoney(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.amount);
  const { wallet: fromWallet } = await resolveWallet(data.fromWallet, user);
  const { wallet: toWallet } = await resolveWallet(data.toWallet, user);

  if (!fromWallet || !toWallet) {
    return {
      success: false,
      intent: command.intent,
      errorCode: "WALLET_NOT_FOUND",
      message: "I could not find one of those wallets. Try the exact wallet names.",
    };
  }
  if (fromWallet.id === toWallet.id) {
    return {
      success: false,
      intent: command.intent,
      errorCode: "SAME_WALLET",
      message: "Choose two different wallets for a transfer.",
    };
  }
  if (fromWallet.balance < amount) {
    return {
      success: false,
      intent: command.intent,
      errorCode: "INSUFFICIENT_BALANCE",
      message: `${fromWallet.name} does not have enough balance for that transfer.`,
    };
  }

  const transferGroupId = generateId("transfer");
  const now = new Date().toISOString();
  await updateWalletBalance(fromWallet.id, fromWallet.balance - amount);
  await updateWalletBalance(toWallet.id, toWallet.balance + amount);
  await insertWalletTransaction(
    {
      wallet_id: fromWallet.id,
      amount,
      type: "transfer_out",
      transfer_group_id: transferGroupId,
      related_wallet_id: toWallet.id,
      notes: `Transfer to ${toWallet.name}`,
      created_at: now,
    },
    user
  );
  await insertWalletTransaction(
    {
      wallet_id: toWallet.id,
      amount,
      type: "transfer_in",
      transfer_group_id: transferGroupId,
      related_wallet_id: fromWallet.id,
      notes: `Transfer from ${fromWallet.name}`,
      created_at: now,
    },
    user
  );
  const { error } = await supabase.from("transfers").insert([
    {
      id: transferGroupId,
      from_wallet_id: fromWallet.id,
      to_wallet_id: toWallet.id,
      amount,
      notes: data.notes || "",
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
      created_at: now,
      updated_at: now,
    },
  ]);
  if (error) console.warn("AI transfer summary insert failed:", error);

  return {
    success: true,
    intent: command.intent,
    message: `Done. I transferred ${formatPeso(amount)} from ${fromWallet.name} to ${toWallet.name}.`,
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
  const isNeed = ["housing", "food", "transport", "utilities", "health", "education"].includes(category);
  const isWant = ["entertainment", "shopping", "personal"].includes(category);
  const payload = {
    month,
    category,
    budget_category: category,
    allocated_amount: amount,
    total_budget: amount,
    needs_pct: isNeed ? 100 : 0,
    wants_pct: isWant ? 100 : 0,
    other_pct: !isNeed && !isWant ? 100 : 0,
    needs_percent: isNeed ? 100 : 0,
    wants_percent: isWant ? 100 : 0,
    other_percent: !isNeed && !isWant ? 100 : 0,
    savings_pct: 0,
    savings_percent: 0,
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
    reasons: ["Created through CLARA", "", ""],
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

async function executeCheckBalance(command, context) {
  ensureUser(context.user);
  const snapshot = await loadFinanceSnapshot(context.user);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const wallets = (snapshot.wallets || [])
    .map((wallet) => `${wallet.name || wallet.wallet_name || "Wallet"}: ${formatPeso(wallet.balance ?? wallet.current_balance ?? 0)}`)
    .slice(0, 6)
    .join(", ");
  return {
    success: true,
    intent: command.intent,
    message: `You have ${formatPeso(summary.totalBalance)} across your wallets. This month, income is ${formatPeso(summary.incomeThisMonth)} and expenses are ${formatPeso(summary.spentThisMonth)}, so your month balance is ${formatPeso(summary.moneyLeftThisMonth)}. ${wallets ? `Wallets: ${wallets}.` : ""}`,
  };
}

async function executeAnalyzeSpending(command, context) {
  ensureUser(context.user);
  const snapshot = await loadFinanceSnapshot(context.user);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const top = summary.topCategory?.name && summary.topCategory.name !== "none"
    ? `${summary.topCategory.name} at ${formatPeso(summary.topCategory.amount)}`
    : "no clear category yet";
  return {
    success: true,
    intent: command.intent,
    message: `This month you have spent ${formatPeso(summary.spentThisMonth)} across ${summary.expenseCountThisMonth} expenses. Your biggest area is ${top}. Today is at ${formatPeso(summary.spentToday)}. A good next move is to set or tighten the category budget that keeps showing up most.`,
  };
}

async function executeSavingsSuggestion(command, context) {
  ensureUser(context.user);
  const snapshot = await loadFinanceSnapshot(context.user);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const suggested = Math.max(50, Math.round(Math.max(summary.moneyLeftThisMonth, 0) * 0.15));
  return {
    success: true,
    intent: command.intent,
    message: summary.moneyLeftThisMonth > 0
      ? `You can start with ${formatPeso(suggested)} as a gentle savings move this month. Your current month balance is ${formatPeso(summary.moneyLeftThisMonth)}, so this keeps pressure low while still moving forward.`
      : "This month is tight right now. Protect essentials first, pause non-urgent spending, and save only a small symbolic amount until income catches up.",
  };
}

async function executeSpendingPlan(command, context) {
  ensureUser(context.user);
  const snapshot = await loadFinanceSnapshot(context.user);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const dayAllowance = Math.max(0, Math.floor(summary.moneyLeftThisMonth / 7));
  return {
    success: true,
    intent: command.intent,
    message: `For today, keep it simple: essentials first, cap flexible spending around ${formatPeso(dayAllowance || 100)}, and avoid adding a new unplanned purchase unless it protects your week. You have spent ${formatPeso(summary.spentToday)} today so far.`,
  };
}

async function executeEmergencyFundPlan(command, context) {
  ensureUser(context.user);
  const snapshot = await loadFinanceSnapshot(context.user);
  const essentialCategories = new Set(["food", "transport", "housing", "utilities", "health", "education"]);
  const essentialMonthly = (snapshot.expenses || [])
    .filter((expense) => essentialCategories.has(normalize(expense.category)))
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const months = essentialMonthly > 0 ? summary.savingsSaved / essentialMonthly : 0;
  return {
    success: true,
    intent: command.intent,
    message: `Your tracked essential spending baseline is about ${formatPeso(essentialMonthly)}. Based on saved goals in CLARA, you have roughly ${months.toFixed(1)} months of coverage. Aim first for one calm month, then build toward three.`,
  };
}

async function executeLifeGuidance(command, context) {
  ensureUser(context.user);
  const snapshot = await loadFinanceSnapshot(context.user);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const data = command.parsedData || {};
  const subject = data.decisionSubject || data.label || "this";
  const amount = toNumber(data.amount);

  if (command.intent === AI_INTENTS.DECISION_GUIDANCE && amount > 0) {
    const pressure = summary.moneyLeftThisMonth > 0 ? amount / summary.moneyLeftThisMonth : 1;
    if (pressure > 0.35) {
      return {
        success: true,
        intent: command.intent,
        message: `You may be able to do it, but ${formatPeso(amount)} is a heavy move against your remaining month balance. If it is not urgent, wait 24 hours or choose a smaller version.`,
      };
    }
    return {
      success: true,
      intent: command.intent,
      message: "This looks manageable if it is aligned with your priorities. Keep it planned, use the right wallet, and avoid stacking another unplanned spend after it.",
    };
  }

  return {
    success: true,
    intent: command.intent,
    message: `For ${subject}, choose one clear next action, one spending boundary, and one time block today. Keep the system light: decide, schedule, then review tonight.`,
  };
}

function refreshAppFinanceState() {
  [
    "clara-expenses-updated",
    "clara-finance-updated",
    "clara-wallets-updated",
    "clara-wallet-transactions-updated",
    "clara-budgets-updated",
    "clara-savings-goals-updated",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
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
    else if (command.intent === AI_INTENTS.TRANSFER_MONEY) result = await executeTransferMoney(command, context);
    else if (command.intent === AI_INTENTS.CREATE_BUDGET) result = await executeCreateBudget(command, context);
    else if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL) result = await executeCreateSavingsGoal(command, context);
    else if (command.intent === AI_INTENTS.CHECK_BALANCE) result = await executeCheckBalance(command, context);
    else if (command.intent === AI_INTENTS.ANALYZE_SPENDING) result = await executeAnalyzeSpending(command, context);
    else if (command.intent === AI_INTENTS.SUGGEST_SAVINGS) result = await executeSavingsSuggestion(command, context);
    else if (command.intent === AI_INTENTS.PLAN_SPENDING) result = await executeSpendingPlan(command, context);
    else if (command.intent === AI_INTENTS.EMERGENCY_FUND_PLAN) result = await executeEmergencyFundPlan(command, context);
    else if (
      [
        AI_INTENTS.DECISION_GUIDANCE,
        AI_INTENTS.DAILY_PLANNING,
        AI_INTENTS.CREATE_REMINDER,
        AI_INTENTS.HABIT_TRACKING,
        AI_INTENTS.PRODUCTIVITY_COACHING,
        AI_INTENTS.GOAL_PLANNING,
        AI_INTENTS.LIFESTYLE_GUIDANCE,
        AI_INTENTS.EMOTIONAL_GUIDANCE,
        AI_INTENTS.GENERAL_GUIDANCE,
      ].includes(command.intent)
    ) result = await executeLifeGuidance(command, context);
    else {
      return {
        success: false,
        intent: command.intent,
        errorCode: "UNKNOWN_INTENT",
        message: "I can help with money, planning, decisions, goals, and daily guidance. Tell me what you want to do.",
      };
    }

    if (result?.success && WRITE_INTENTS.has(command.intent)) refreshAppFinanceState();
    return result;
  } catch (error) {
    console.error("AI command execution failed:", error);
    return {
      success: false,
      intent: command?.intent || AI_INTENTS.UNKNOWN,
      errorCode: error?.code || "EXECUTION_FAILED",
      message: error?.message || "I could not complete that right now.",
    };
  }
}
