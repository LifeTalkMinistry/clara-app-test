import { resolveExperienceTier, taskSupportsTier } from "@/lib/program-journey";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

function isMissingRelationError(error) {
  const message = String(error?.message || "");
  return error?.code === "PGRST205" || /Could not find the table|schema cache/i.test(message);
}

export async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle();
  if (error && isMissingRelationError(error)) return null;
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function ensureUserProgramAccess({
  supabase,
  user,
  profile,
  enrollment = null,
  tasks = [],
}) {
  if (!user?.id) return null;

  const tier = resolveExperienceTier(profile, enrollment, profile?.plan);
  if (tier === "free") return null;

  const hasEligibleTask = tasks.some((task) => taskSupportsTier(task, tier));
  if (!hasEligibleTask) return null;

  const existing = await maybeSingle(
    supabase.from("user_programs").select("*").eq("user_id", user.id)
  );

  if (existing) return existing;

  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    user_id: user.id,
    user_email: user.email || null,
    program_start_date: today,
    assigned_tier: tier,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("user_programs")
    .insert([payload])
    .select("*")
    .single();

  if (error && isMissingRelationError(error)) return null;
  if (error) throw error;
  return data;
}

export async function fetchUserProgramRecord({ supabase, userId }) {
  if (!userId) return null;

  return maybeSingle(
    supabase.from("user_programs").select("*").eq("user_id", userId)
  );
}

export async function resetUserProgramProgress({
  supabase,
  userId,
  programTaskIds = [],
}) {
  const today = new Date().toISOString().slice(0, 10);

  await supabase
    .from("user_programs")
    .update({
      program_start_date: today,
      manual_unlock_until: 1,
      current_day_override: null,
      reset_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (programTaskIds.length > 0) {
    await supabase
      .from("task_submissions")
      .delete()
      .eq("user_id", userId)
      .in("task_id", programTaskIds);
  }
}

export async function overrideUserProgramDay({
  supabase,
  userId,
  unlockUntil,
}) {
  const nextValue = Number(unlockUntil) || 1;

  const { error } = await supabase
    .from("user_programs")
    .update({
      manual_unlock_until: nextValue,
      current_day_override: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}
