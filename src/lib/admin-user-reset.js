import { supabase } from "@/lib/supabaseClient";
import {
  formatSupabaseError,
  isMissingColumnError,
  isSchemaMismatchError,
  normalizeString,
} from "@/lib/admin-panel-utils";

export const RESET_PROFILE_FIELDS = {
  role: "free_user",
  plan: "free",
  has_completed_onboarding: false,
  onboarding_completed: false,
  onboarding_step: 0,
  program_onboarding_completed: false,
  enrollment_status: "none",
  status: "free",
  is_enrolled: false,
  program_active: false,
  force_reauth: true,
};

const ONBOARDING_RESET_FIELDS = new Set(["has_completed_onboarding", "onboarding_completed"]);

const OWNED_TABLES = [
  "admin_notes",
  "student_task_access",
  "student_module_access",
  "task_submissions",
  "module_progress",
  "coaching_requests",
  "user_programs",
  "referrals",
  "enrollments",
  "savings_goals",
  "expenses",
  "budgets",
  "wallet_transactions",
  "wallets",
];

function getOwnershipTokens(userId, email) {
  const normalizedUserId = normalizeString(userId);
  const normalizedEmail = normalizeString(email).toLowerCase();

  return {
    userId: normalizedUserId,
    email: normalizedEmail,
  };
}

function rowBelongsToUser(row, ownership) {
  if (!row) return false;

  const possibleIds = [row.id, row.user_id, row.owner_id, row.profile_id, row.referrer_id]
    .map((value) => normalizeString(value))
    .filter(Boolean);

  const possibleEmails = [
    row.email,
    row.user_email,
    row.owner_email,
    row.created_by,
    row.referrer_email,
    row.student_email,
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .filter(Boolean);

  return (
    (ownership.userId && possibleIds.includes(ownership.userId)) ||
    (ownership.email && possibleEmails.includes(ownership.email))
  );
}

async function deleteOwnedRows(table, ownership) {
  const { data, error } = await supabase.from(table).select("*");

  if (error) {
    if (isSchemaMismatchError(error)) return;
    throw new Error(formatSupabaseError(error, `Failed to inspect ${table}.`));
  }

  const ownedIds = (data || [])
    .filter((row) => rowBelongsToUser(row, ownership))
    .map((row) => row?.id)
    .filter(Boolean);

  if (ownedIds.length === 0) return;

  const { error: deleteError } = await supabase.from(table).delete().in("id", ownedIds);

  if (deleteError) {
    if (isSchemaMismatchError(deleteError)) return;
    throw new Error(formatSupabaseError(deleteError, `Failed to reset ${table}.`));
  }
}

async function deleteWalletLinkedTransactions(userId, email) {
  const ownership = getOwnershipTokens(userId, email);
  const { data, error } = await supabase.from("wallets").select("*");

  if (error) {
    if (isSchemaMismatchError(error)) return;
    throw new Error(formatSupabaseError(error, "Failed to inspect wallets."));
  }

  const walletIds = (data || [])
    .filter((row) => rowBelongsToUser(row, ownership))
    .map((row) => row?.id)
    .filter(Boolean);

  if (walletIds.length === 0) return;

  const { error: deleteError } = await supabase
    .from("wallet_transactions")
    .delete()
    .in("wallet_id", walletIds);

  if (deleteError && !isSchemaMismatchError(deleteError)) {
    throw new Error(formatSupabaseError(deleteError, "Failed to reset wallet transactions."));
  }
}

async function resetProfileFields(userId) {
  const { error: profileError } = await supabase
    .from("profiles")
    .update(RESET_PROFILE_FIELDS)
    .eq("id", userId);

  if (!profileError) return;

  if (!isMissingColumnError(profileError)) {
    throw new Error(formatSupabaseError(profileError, "Failed to reset profile."));
  }

  const appliedFields = [];
  const skippedFields = [];

  for (const [field, value] of Object.entries(RESET_PROFILE_FIELDS)) {
    const { error: fieldError } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", userId);

    if (!fieldError) {
      appliedFields.push(field);
      continue;
    }

    if (isMissingColumnError(fieldError)) {
      skippedFields.push(field);
      continue;
    }

    throw new Error(formatSupabaseError(fieldError, `Failed to reset profile field ${field}.`));
  }

  const resetCanRouteToOnboarding = appliedFields.some((field) => ONBOARDING_RESET_FIELDS.has(field));

  if (!resetCanRouteToOnboarding) {
    throw new Error(
      "Failed to reset profile. The profiles table is missing the onboarding reset columns."
    );
  }

  if (skippedFields.length > 0) {
    console.warn("Skipped optional profile reset fields missing from Supabase schema:", skippedFields);
  }
}

export async function resetUserAccount({ userId, email }) {
  if (!userId) {
    throw new Error("Missing user id for reset.");
  }

  const ownership = getOwnershipTokens(userId, email);

  const { error: settingsError } = await supabase
    .from("user_settings")
    .delete()
    .eq("id", userId);

  if (settingsError && !isSchemaMismatchError(settingsError)) {
    throw new Error(formatSupabaseError(settingsError, "Failed to reset user settings."));
  }

  await deleteWalletLinkedTransactions(userId, email);

  for (const table of OWNED_TABLES) {
    await deleteOwnedRows(table, ownership);
  }

  await resetProfileFields(userId);
}
