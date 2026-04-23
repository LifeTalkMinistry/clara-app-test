import { supabase } from "@/lib/supabaseClient";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveDate(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "today") {
    return new Date().toISOString();
  }

  if (raw === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }

  if (raw === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

function normalizeWalletName(value) {
  return String(value || "").trim().toLowerCase();
}

async function findWalletByName(walletName, user) {
  const { data, error } = await supabase.from("wallets").select("*");

  if (error) throw error;

  const userId = String(user?.id || "").trim();
  const userEmail = String(user?.email || "").trim().toLowerCase();
  const target = normalizeWalletName(walletName);

  return (data || []).find((wallet) => {
    const owned =
      String(wallet?.user_id || "").trim() === userId ||
      String(wallet?.user_email || "").trim().toLowerCase() === userEmail ||
      String(wallet?.created_by || "").trim().toLowerCase() === userEmail;

    return owned && normalizeWalletName(wallet?.name || wallet?.wallet_name) === target;
  });
}

async function updateWalletBalance(walletId, delta) {
  const { data: wallet, error: loadError } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .single();

  if (loadError) throw loadError;

  const currentBalance = toNumber(
    wallet?.balance ??
      wallet?.derived_balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.starting_balance ??
      0
  );

  const nextBalance = currentBalance + toNumber(delta);

  const { error: updateError } = await supabase
    .from("wallets")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId);

  if (updateError) throw updateError;
}

async function insertWalletTransaction({
  wallet_id,
  amount,
  type,
  category = null,
  need_type = null,
  planning_status = null,
  unplanned_reason = null,
  expense_id = null,
  source_type = null,
  tag = null,
  notes = "",
  created_at,
  user,
}) {
  const now = new Date().toISOString();

  const { error } = await supabase.from("wallet_transactions").insert([
    {
      id: generateId(),
      wallet_id: wallet_id ? String(wallet_id) : null,
      amount: toNumber(amount),
      type,
      category,
      need_type,
      planning_status,
      unplanned_reason,
      expense_id,
      transfer_group_id: null,
      related_wallet_id: null,
      source_type,
      tag,
      notes,
      created_at: created_at || now,
      updated_at: now,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    },
  ]);

  if (error) throw error;
}

async function executeLogExpense(session, user) {
  const fields = session?.fields || {};
  const wallet = await findWalletByName(fields.wallet, user);

  if (!wallet) {
    throw new Error(`Wallet not found: ${fields.wallet}`);
  }

  const expenseId = generateId();
  const amount = toNumber(fields.amount);
  const dateIso = resolveDate(fields.date);

  const payload = {
    id: expenseId,
    user_id: user?.id || null,
    user_email: user?.email || null,
    created_by: user?.email || null,
    amount,
    item: fields.item || null,
    category: fields.category || "other",
    wallet_id: wallet.id,
    date: dateIso,
    planning_status: "planned",
    unplanned_reason: null,
    notes: "",
  };

  const { error } = await supabase.from("expenses").insert([payload]);
  if (error) throw error;

  await updateWalletBalance(wallet.id, -amount);

  await insertWalletTransaction({
    wallet_id: wallet.id,
    amount,
    type: "expense",
    category: payload.category,
    need_type: null,
    planning_status: "planned",
    unplanned_reason: null,
    expense_id: expenseId,
    notes: payload.item || "",
    created_at: dateIso,
    user,
  });

  return {
    success: true,
    message: `Expense saved: ${fields.item} for ₱${amount}.`,
  };
}

async function executeAddMoney(session, user) {
  const fields = session?.fields || {};
  const wallet = await findWalletByName(fields.wallet, user);

  if (!wallet) {
    throw new Error(`Wallet not found: ${fields.wallet}`);
  }

  const amount = toNumber(fields.amount);

  await updateWalletBalance(wallet.id, amount);

  await insertWalletTransaction({
    wallet_id: wallet.id,
    amount,
    type: "income",
    source_type: "ai_add_money",
    notes: "Added via CLARA AI",
    created_at: new Date().toISOString(),
    user,
  });

  return {
    success: true,
    message: `Added ₱${amount} to ${fields.wallet}.`,
  };
}

async function executeCreateBudget(session, user) {
  const fields = session?.fields || {};

  const { error } = await supabase.from("budgets").insert([
    {
      id: generateId(),
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
      name: fields.name || "New Budget",
      amount: toNumber(fields.amount),
      period: fields.period || "monthly",
      spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  if (error) throw error;

  return {
    success: true,
    message: `Budget created: ${fields.name}.`,
  };
}

async function executeCreateSavingsGoal(session) {
  return {
    success: false,
    message: "Savings goal execution is not wired yet.",
  };
}

export async function executeCommand(session, user) {
  if (!session?.intent) {
    throw new Error("Missing session intent.");
  }

  if (!user?.id && !user?.email) {
    throw new Error("User not found.");
  }

  if (session.intent === "LOG_EXPENSE") {
    return executeLogExpense(session, user);
  }

  if (session.intent === "ADD_MONEY") {
    return executeAddMoney(session, user);
  }

  if (session.intent === "CREATE_BUDGET") {
    return executeCreateBudget(session, user);
  }

  if (session.intent === "CREATE_SAVINGS_GOAL") {
    return executeCreateSavingsGoal(session, user);
  }

  throw new Error(`Unsupported intent: ${session.intent}`);
}