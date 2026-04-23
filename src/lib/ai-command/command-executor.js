import { queryClientInstance } from "@/lib/query-client";
import { supabase } from "@/lib/supabaseClient";
import {
  AI_INTENTS,
  WRITE_INTENTS,
  formatPeso,
  titleCase,
} from "@/lib/ai-command/command-parser";
import {
  computeFinanceSummary,
  loadFinanceSnapshot,
  summarizeSpendForScope,
} from "@/lib/ai-command/finance-context";
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
      details: payload.details || null,
      created_at: now,
      updated_at: now,
      created_by: user?.email || null,
      user_email: user?.email || null,
      user_id: user?.id || null,
    },
  ]);
  if (error) throw error;
}

export async function resolveAuthenticatedUser(user) {
  if (user?.id || user?.email) {
    return user;
  }

  const { data } = await supabase.auth.getUser();
  return data?.user || null;
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

function invalidResult(command, errorCode, message) {
  return {
    success: false,
    intent: command.intent,
    errorCode,
    message,
  };
}

async function executeLogExpense(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.amount);
  const label = String(data.item || data.label || "").trim();
  if (!label) return invalidResult(command, "MISSING_LABEL", "What should I call this expense?");

  const { wallet } = await resolveWallet(data.wallet, user);
  if (!wallet) {
    return invalidResult(
      command,
      "WALLET_NOT_FOUND",
      `I could not find a wallet named ${data.wallet}. Try the exact wallet name.`
    );
  }

  if (amount > wallet.balance) {
    return invalidResult(
      command,
      "INSUFFICIENT_BALANCE",
      `${wallet.name} only has ${formatPeso(wallet.balance)} available, so I could not log ${formatPeso(amount)} from it.`
    );
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

  const nextBalance = wallet.balance - amount;
  await updateWalletBalance(wallet.id, nextBalance);

  return {
    success: true,
    intent: command.intent,
    message: `Logged ${formatPeso(amount)} for ${label} from ${wallet.name}. Balance moved from ${formatPeso(wallet.balance)} to ${formatPeso(nextBalance)}.`,
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
    return invalidResult(command, "WALLET_NOT_FOUND", `I could not find a wallet named ${data.wallet}.`);
  }

  const nextBalance = wallet.balance + amount;
  await updateWalletBalance(wallet.id, nextBalance);
  await insertWalletTransaction(
    {
      wallet_id: wallet.id,
      amount,
      type: "income",
      source_type: "AI command",
      notes: data.notes || "Added through CLARA",
      created_at: new Date().toISOString(),
    },
    user
  );

  return {
    success: true,
    intent: command.intent,
    message: `Added ${formatPeso(amount)} to ${wallet.name}. Balance moved from ${formatPeso(wallet.balance)} to ${formatPeso(nextBalance)}.`,
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
    return invalidResult(
      command,
      "WALLET_NOT_FOUND",
      "I could not find one of those wallets. Try the exact wallet names."
    );
  }

  if (fromWallet.id === toWallet.id) {
    return invalidResult(command, "SAME_WALLET", "Choose two different wallets for a transfer.");
  }

  if (fromWallet.balance < amount) {
    return invalidResult(
      command,
      "INSUFFICIENT_BALANCE",
      `${fromWallet.name} only has ${formatPeso(fromWallet.balance)} available, so that transfer could not go through.`
    );
  }

  const transferGroupId = generateId("transfer");
  const now = new Date().toISOString();
  const fromNextBalance = fromWallet.balance - amount;
  const toNextBalance = toWallet.balance + amount;

  await updateWalletBalance(fromWallet.id, fromNextBalance);
  await updateWalletBalance(toWallet.id, toNextBalance);
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
    message: `Transferred ${formatPeso(amount)} from ${fromWallet.name} to ${toWallet.name}. ${fromWallet.name} is now ${formatPeso(fromNextBalance)} and ${toWallet.name} is now ${formatPeso(toNextBalance)}.`,
  };
}

async function executeCreateBudget(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.amount);
  const label = String(data.label || "").trim();
  if (!label) return invalidResult(command, "MISSING_LABEL", "What should I call this budget?");

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

  const { error, data: inserted } = await supabase
    .from("budgets")
    .insert([payload])
    .select("*")
    .single();
  if (error) throw error;

  return {
    success: true,
    intent: command.intent,
    message: `Created a ${formatPeso(amount)} budget for ${titleCase(label)} for ${month}.`,
    createdRecord: inserted || payload,
  };
}

async function executeCreateSavingsGoal(command, context) {
  const user = context.user;
  ensureUser(user);
  const data = command.parsedData || {};
  const amount = ensurePositiveAmount(data.targetAmount);
  const label = String(data.label || "").trim();
  if (!label) return invalidResult(command, "MISSING_LABEL", "What should I call this savings goal?");

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

  const { error, data: inserted } = await supabase
    .from("savings_goals")
    .insert([payload])
    .select("*")
    .single();
  if (error) throw error;
  return {
    success: true,
    intent: command.intent,
    message: `Created your ${titleCase(label)} savings goal with a target of ${formatPeso(amount)}.`,
    createdRecord: inserted || payload,
  };
}

async function executeCheckBalance(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const wallets = (snapshot.wallets || [])
    .map((wallet) => `${wallet.name}: ${formatPeso(wallet.balance)}`)
    .slice(0, 6)
    .join(", ");

  return {
    success: true,
    intent: command.intent,
    message: `You have ${formatPeso(summary.totalBalance)} across your wallets.${wallets ? ` Wallets: ${wallets}.` : ""}`,
  };
}

async function executeReadSpending(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const scoped = summarizeSpendForScope(snapshot, command.parsedData?.scope || "today");
  return {
    success: true,
    intent: command.intent,
    message: `You spent ${formatPeso(scoped.amount)} ${scoped.label} across ${scoped.expenseCount} expense${scoped.expenseCount === 1 ? "" : "s"}.`,
  };
}

async function executeReadWalletHistory(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const walletName = command.parsedData?.wallet;
  const wallet =
    (snapshot.wallets || []).find((item) => normalize(item.name) === normalize(walletName)) ||
    (snapshot.wallets || []).find((item) => normalize(item.name).includes(normalize(walletName)));

  if (!walletName || !wallet) {
    const recent = (snapshot.walletTransactions || [])
      .slice(0, 3)
      .map((txn) => `${txn.type} ${formatPeso(txn.amount)}`)
      .join(", ");
    return {
      success: true,
      intent: command.intent,
      message: recent
        ? `Recent wallet activity: ${recent}. Ask for a specific wallet to narrow it down.`
        : "I do not see wallet transaction history yet.",
    };
  }

  const recent = (snapshot.walletTransactions || [])
    .filter((txn) => String(txn.wallet_id) === String(wallet.id))
    .slice(0, 4)
    .map((txn) => `${txn.type.replace(/_/g, " ")} ${formatPeso(txn.amount)}`)
    .join(", ");

  return {
    success: true,
    intent: command.intent,
    message: recent
      ? `${wallet.name} is at ${formatPeso(wallet.balance)}. Recent history: ${recent}.`
      : `${wallet.name} is at ${formatPeso(wallet.balance)} with no recent transaction history yet.`,
  };
}

async function executeReadBudgetStatus(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const month = command.parsedData?.period || getPHMonthKey();
  const category = command.parsedData?.category;
  const budgets = (snapshot.budgets || []).filter((budget) => budget.month === month);

  if (!budgets.length) {
    return {
      success: true,
      intent: command.intent,
      message: `I do not see any budgets saved for ${month} yet.`,
    };
  }

  const matchedBudget =
    budgets.find((budget) => normalize(budget.category) === normalize(category)) ||
    budgets[0];

  const spent = (snapshot.expenses || [])
    .filter(
      (expense) =>
        String(expense.date || expense.created_at || "").startsWith(month) &&
        normalize(expense.category) === normalize(matchedBudget.category)
    )
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const remaining = Math.max(toNumber(matchedBudget.allocated_amount) - spent, 0);

  return {
    success: true,
    intent: command.intent,
    message: `${titleCase(matchedBudget.category)} budget for ${month}: allocated ${formatPeso(
      matchedBudget.allocated_amount
    )}, spent ${formatPeso(spent)}, remaining ${formatPeso(remaining)}.`,
  };
}

async function executeReadSavingsStatus(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const goals = snapshot.savingsGoals || [];

  if (!goals.length) {
    return {
      success: true,
      intent: command.intent,
      message: "I do not see any savings goals yet.",
    };
  }

  const requested = normalize(command.parsedData?.label);
  const goal =
    goals.find((item) => normalize(item.title) === requested) ||
    goals.find((item) => normalize(item.title).includes(requested)) ||
    goals[0];

  return {
    success: true,
    intent: command.intent,
    message: `${goal.title}: saved ${formatPeso(goal.saved_amount)} out of ${formatPeso(
      goal.target_amount
    )}${goal.planned_use_date ? `, target date ${goal.planned_use_date}` : ""}.`,
  };
}

async function executeAnalyzeSpending(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const top =
    summary.topCategory?.name && summary.topCategory.name !== "none"
      ? `${summary.topCategory.name} at ${formatPeso(summary.topCategory.amount)}`
      : "no clear category yet";
  return {
    success: true,
    intent: command.intent,
    message: `This month you have spent ${formatPeso(summary.spentThisMonth)} across ${summary.expenseCountThisMonth} expenses. Your biggest area is ${top}. Today is at ${formatPeso(summary.spentToday)}.`,
  };
}

async function executeSavingsSuggestion(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const suggested = Math.max(50, Math.round(Math.max(summary.totalBalance, 0) * 0.15));
  return {
    success: true,
    intent: command.intent,
    message:
      summary.totalBalance > 0
        ? `A gentle next savings move is ${formatPeso(suggested)}. Your available wallet balance is ${formatPeso(summary.totalBalance)} right now.`
        : "Your balance is tight right now. Protect essentials first and save only a symbolic amount until more money comes in.",
  };
}

async function executeSpendingPlan(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const dayAllowance = Math.max(0, Math.floor(summary.totalBalance / 7));
  return {
    success: true,
    intent: command.intent,
    message: `For today, keep flexible spending around ${formatPeso(dayAllowance || 100)} and stay anchored to essentials first. You have spent ${formatPeso(summary.spentToday)} today so far.`,
  };
}

async function executeEmergencyFundPlan(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const essentialCategories = new Set(["food", "transport", "housing", "utilities", "health", "education"]);
  const essentialMonthly = (snapshot.expenses || [])
    .filter((expense) => essentialCategories.has(normalize(expense.category)))
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const months = essentialMonthly > 0 ? summary.savingsSaved / essentialMonthly : 0;
  return {
    success: true,
    intent: command.intent,
    message: `Your tracked essential spending baseline is about ${formatPeso(essentialMonthly)}. Based on saved goals in CLARA, you have roughly ${months.toFixed(1)} months of coverage.`,
  };
}

async function executeLifeGuidance(command, context) {
  ensureUser(context.user);
  const snapshot = context.financeSnapshot || (await loadFinanceSnapshot(context.user));
  const summary = snapshot.summary || computeFinanceSummary(snapshot);
  const data = command.parsedData || {};
  const subject = data.decisionSubject || data.label || "this";
  const amount = toNumber(data.amount);
  const normalizedSubject = normalize(subject);

  if (/^(hi|hello|hey|good morning|good evening|can i ask|may i ask)/.test(normalizedSubject)) {
    return {
      success: true,
      intent: command.intent,
      message: `Yes, of course. Ask me anything about your spending, wallets, budgets, savings goals, or a money decision you are weighing. I can reason through it using your real CLARA numbers.`,
    };
  }

  if (command.intent === AI_INTENTS.DECISION_GUIDANCE && amount > 0) {
    const pressure = summary.totalBalance > 0 ? amount / summary.totalBalance : 1;
    if (pressure > 0.35) {
      return {
        success: true,
        intent: command.intent,
        message: `${formatPeso(amount)} is a heavy move against your current available balance. If it is not urgent, wait a day or choose a smaller version.`,
      };
    }
    return {
      success: true,
      intent: command.intent,
      message: "This looks manageable if it truly matches your priorities. Keep it planned and avoid stacking another unplanned spend after it.",
    };
  }

  if (/save more|saving more|how do i save|save money/.test(normalizedSubject)) {
    const topCategory = summary.topCategory?.name && summary.topCategory.name !== "none"
      ? `${summary.topCategory.name} at ${formatPeso(summary.topCategory.amount)}`
      : "your variable spending";
    return {
      success: true,
      intent: command.intent,
      message:
        summary.totalBalance > 0
          ? `A strong next move is to protect a small automatic savings amount first, then tighten ${topCategory}. You currently have ${formatPeso(summary.totalBalance)} across wallets, so even setting aside 10% to 15% before flexible spending would make your month calmer.`
          : `Start by protecting essentials, cutting one repeat expense, and setting a very small non-zero savings target so the habit stays alive. Once more money lands, save first before flexible spending starts.`,
    };
  }

  if (/debt|loan|utang|borrow/.test(normalizedSubject)) {
    return {
      success: true,
      intent: command.intent,
      message: `When you are weighing debt, check three things in order: whether it solves a real urgent need, whether the payment still leaves breathing room after essentials, and whether there is a cheaper alternative. If you want, tell me the loan amount, payment, and purpose and I will reason it through with you.`,
    };
  }

  if (/budget|overspend|overspending|too much/.test(normalizedSubject)) {
    const topCategory = summary.topCategory?.name && summary.topCategory.name !== "none"
      ? titleCase(summary.topCategory.name)
      : "your biggest flexible category";
    return {
      success: true,
      intent: command.intent,
      message: `Your best budget fix is to anchor essentials first, put a hard cap on ${topCategory}, and review spending every few days instead of waiting for month-end. Right now your total wallet balance is ${formatPeso(summary.totalBalance)}, so keep your next adjustment simple and measurable.`,
    };
  }

  return {
    success: true,
    intent: command.intent,
    message: `I can help you think this through. For ${subject}, start with the goal, the money limit, and the tradeoff. If you want deeper advice, tell me the amount, timeline, and what you are choosing between, and I will reason it out with your real CLARA finances in mind.`,
  };
}

async function executeMultiAction(command, context) {
  const subcommands = command.parsedData?.commands || command.subcommands || [];
  const messages = [];
  const results = [];

  for (const subcommand of subcommands) {
    const result = await executeAICommand(subcommand, context);
    results.push(result);
    messages.push(result.message);
    if (!result.success) {
      return {
        success: false,
        intent: command.intent,
        errorCode: result.errorCode || "MULTI_ACTION_FAILED",
        message: messages.join(" "),
        results,
      };
    }
  }

  return {
    success: true,
    intent: command.intent,
    message: messages.join(" "),
    results,
  };
}

function refreshAppFinanceState() {
  if (typeof window === "undefined") return;
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
  const executionUser = await resolveAuthenticatedUser(context.user);
  const executionContext = { ...context, user: executionUser };

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
    if (command.intent === AI_INTENTS.MULTI_ACTION) result = await executeMultiAction(command, executionContext);
    else if (command.intent === AI_INTENTS.LOG_EXPENSE) result = await executeLogExpense(command, executionContext);
    else if (command.intent === AI_INTENTS.ADD_MONEY) result = await executeAddMoney(command, executionContext);
    else if (command.intent === AI_INTENTS.TRANSFER_MONEY) result = await executeTransferMoney(command, executionContext);
    else if (command.intent === AI_INTENTS.CREATE_BUDGET) result = await executeCreateBudget(command, executionContext);
    else if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL) result = await executeCreateSavingsGoal(command, executionContext);
    else if (command.intent === AI_INTENTS.CHECK_BALANCE) result = await executeCheckBalance(command, executionContext);
    else if (command.intent === AI_INTENTS.READ_SPENDING) result = await executeReadSpending(command, executionContext);
    else if (command.intent === AI_INTENTS.READ_WALLET_HISTORY) result = await executeReadWalletHistory(command, executionContext);
    else if (command.intent === AI_INTENTS.READ_BUDGET_STATUS) result = await executeReadBudgetStatus(command, executionContext);
    else if (command.intent === AI_INTENTS.READ_SAVINGS_STATUS) result = await executeReadSavingsStatus(command, executionContext);
    else if (command.intent === AI_INTENTS.ANALYZE_SPENDING) result = await executeAnalyzeSpending(command, executionContext);
    else if (command.intent === AI_INTENTS.SUGGEST_SAVINGS) result = await executeSavingsSuggestion(command, executionContext);
    else if (command.intent === AI_INTENTS.PLAN_SPENDING) result = await executeSpendingPlan(command, executionContext);
    else if (command.intent === AI_INTENTS.EMERGENCY_FUND_PLAN) result = await executeEmergencyFundPlan(command, executionContext);
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
    ) {
      result = await executeLifeGuidance(command, executionContext);
    } else {
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
