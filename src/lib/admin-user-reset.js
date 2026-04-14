import { supabase } from "@/lib/supabaseClient";

export const RESET_PROFILE_FIELDS = {
  role: "free_user",
  user_role: "free_user",
  account_role: "free_user",
  plan: "free",
  plan_key: "free",
  tier: "free",
  subscription_tier: "free",
  selected_plan: null,
  has_completed_onboarding: false,
  onboarding_completed: false,
  onboarding_step: 0,
  program_onboarding_completed: false,
  enrollment_status: "none",
  status: "free",
  is_enrolled: false,
  program_active: false,
  referral_enabled: false,
  monthly_survival_expense: 0,
  preferred_reminder_time: null,
  financial_goal: null,
  total_income: 0,
  income_total: 0,
  total_savings: 0,
  savings_total: 0,
  force_reauth: true,
};

function getErrorMessage(table, error) {
  return error?.message || `Failed to reset ${table}.`;
}

function isMissingRelationError(error) {
  const message = String(error?.message || "");
  return error?.code === "PGRST205" || /Could not find the table|schema cache/i.test(message);
}

function isMissingColumnError(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "PGRST204" ||
    /column .* does not exist/i.test(message) ||
    /Could not find the .* column/i.test(message)
  );
}

async function deleteByColumn(table, column, value, { optional = false } = {}) {
  if (value === undefined || value === null || value === "") return;

  const { error } = await supabase.from(table).delete().eq(column, value);

  if (error) {
    if (optional || isMissingRelationError(error) || isMissingColumnError(error)) return;
    throw new Error(getErrorMessage(table, error));
  }
}

async function deleteByIds(table, column, ids, { optional = false } = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return;

  const { error } = await supabase.from(table).delete().in(column, ids);

  if (error) {
    if (optional || isMissingRelationError(error) || isMissingColumnError(error)) return;
    throw new Error(getErrorMessage(table, error));
  }
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isOwnedByUser(row, userId, email) {
  if (!row) return false;

  const normalizedUserId = String(userId ?? "").trim();
  const normalizedEmail = normalizeValue(email);

  const possibleIds = [row.user_id, row.owner_id, row.profile_id, row.referrer_id]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const possibleEmails = [
    row.email,
    row.user_email,
    row.owner_email,
    row.created_by,
    row.referrer_email,
  ]
    .map(normalizeValue)
    .filter(Boolean);

  if (normalizedUserId && possibleIds.includes(normalizedUserId)) return true;
  if (normalizedEmail && possibleEmails.includes(normalizedEmail)) return true;

  return false;
}

async function collectOwnedIds(table, userId, email, { optional = false } = {}) {
  const { data, error } = await supabase.from(table).select("*");

  if (error) {
    if (optional || isMissingRelationError(error) || isMissingColumnError(error)) return [];
    throw new Error(getErrorMessage(table, error));
  }

  return (data || [])
    .filter((row) => isOwnedByUser(row, userId, email))
    .map((row) => row?.id)
    .filter(Boolean);
}

async function collectOwnedWalletIds(userId, email) {
  const walletIdSet = new Set();

  if (userId) {
    const { data, error } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId);

    if (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) return [];
      throw new Error(getErrorMessage("wallets", error));
    }

    (data || []).forEach((row) => {
      if (row?.id) walletIdSet.add(row.id);
    });
  }

  if (email) {
    for (const column of ["user_email", "created_by"]) {
      const { data, error } = await supabase
        .from("wallets")
        .select("id")
        .eq(column, email);

      if (error) {
        if (isMissingRelationError(error) || isMissingColumnError(error)) return [];
        throw new Error(getErrorMessage("wallets", error));
      }

      (data || []).forEach((row) => {
        if (row?.id) walletIdSet.add(row.id);
      });
    }
  }

  return Array.from(walletIdSet);
}

export async function resetUserAccount({ userId, email }) {
  if (!userId) {
    throw new Error("Missing user id for reset.");
  }

  const walletIds = await collectOwnedWalletIds(userId, email);
  const enrollmentIds = await collectOwnedIds("enrollments", userId, email);

  await deleteByColumn("user_settings", "id", userId);
  await deleteByColumn("admin_notes", "student_id", userId, { optional: true });
  await deleteByColumn("student_task_access", "user_id", userId);
  await deleteByColumn("student_module_access", "user_id", userId);
  await deleteByColumn("task_submissions", "user_id", userId);
  await deleteByColumn("module_progress", "user_id", userId);
  await deleteByColumn("coaching_requests", "user_id", userId);
  await deleteByColumn("referrals", "user_id", userId);
  await deleteByColumn("referrals", "referrer_id", userId);
  await deleteByColumn("enrollments", "user_id", userId);
  await deleteByColumn("savings_goals", "user_id", userId);
  await deleteByColumn("expenses", "user_id", userId);
  await deleteByColumn("budgets", "user_id", userId);
  await deleteByColumn("wallet_transactions", "user_id", userId);
  await deleteByColumn("wallets", "user_id", userId);

  if (email) {
    await deleteByColumn("task_submissions", "created_by", email);
    await deleteByColumn("module_progress", "created_by", email);
    await deleteByColumn("referrals", "created_by", email);
    await deleteByColumn("referrals", "referrer_email", email);
    await deleteByColumn("enrollments", "email", email);
    await deleteByColumn("enrollments", "user_email", email);
    await deleteByColumn("enrollments", "created_by", email);
    await deleteByColumn("savings_goals", "created_by", email);
    await deleteByColumn("expenses", "user_email", email);
    await deleteByColumn("expenses", "created_by", email);
    await deleteByColumn("budgets", "email", email);
    await deleteByColumn("budgets", "created_by", email);
    await deleteByColumn("wallet_transactions", "user_email", email);
    await deleteByColumn("wallet_transactions", "created_by", email);
    await deleteByColumn("wallets", "user_email", email);
    await deleteByColumn("wallets", "created_by", email);
  }

  await deleteByIds("enrollments", "id", enrollmentIds);
  await deleteByIds("wallet_transactions", "wallet_id", walletIds);

  const { error: profileError } = await supabase
    .from("profiles")
    .update(RESET_PROFILE_FIELDS)
    .eq("id", userId);

  if (profileError) {
    throw new Error(getErrorMessage("profiles", profileError));
  }
}
