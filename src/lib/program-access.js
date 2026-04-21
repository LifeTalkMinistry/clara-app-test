import { resolveExperienceTier, taskSupportsTier } from "@/lib/program-journey";
import {
  addLocalDays,
  getChallengeTimeZone,
  getCurrentChallengeDay,
  getLocalDateKey,
} from "@/lib/challenge-schedule";
import { buildProgramCompletionPatch } from "@/lib/clara-entitlements";

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

  const payload = {
    user_id: user.id,
    user_email: user.email || null,
    program_start_date: null,
    assigned_tier: tier,
    is_active: true,
    challenge_started: false,
    active_day_number: 0,
    current_day_status: "not_started",
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

export async function startUserChallenge({ supabase, user, profile, programRecord = null }) {
  if (!user?.id) return null;

  const now = new Date();
  const localStartDate = getLocalDateKey(now);
  const programEndsAt = addLocalDays(localStartDate, 30);
  const tier = resolveExperienceTier(profile, null, profile?.plan);
  const payload = {
    user_id: user.id,
    user_email: user.email || null,
    assigned_tier: tier === "free" ? "core" : tier,
    program_family: "reset_30",
    program_start_date: localStartDate,
    program_started_at: now.toISOString(),
    program_ends_at: `${programEndsAt}T00:00:00+08:00`,
    challenge_started: true,
    challenge_started_at: now.toISOString(),
    challenge_local_start_date: localStartDate,
    challenge_timezone: getChallengeTimeZone(),
    active_day_number: 1,
    current_day_unlocked_at: now.toISOString(),
    current_day_status: "available",
    manual_unlock_until: 1,
    current_day_override: null,
    is_active: true,
  };

  const query = programRecord?.id
    ? supabase.from("user_programs").update(payload).eq("id", programRecord.id)
    : supabase.from("user_programs").upsert(payload, { onConflict: "user_id" });

  const { data, error } = await query.select("*").single();
  if (error) throw error;

  await supabase
    .from("profiles")
    .update({
      program_started_at: payload.program_started_at,
      program_ends_at: payload.program_ends_at,
      challenge_started: true,
      challenge_started_at: payload.challenge_started_at,
      challenge_local_start_date: localStartDate,
      active_day_number: 1,
      current_day_unlocked_at: payload.current_day_unlocked_at,
      current_day_status: "available",
      program_active: true,
      is_enrolled: true,
      entitlement_status: "program_active",
    })
    .eq("id", user.id);

  return data;
}

export async function syncChallengeDaySummary({ supabase, userId, programRecord }) {
  if (!userId || !programRecord?.challenge_started) return null;

  const activeDay = getCurrentChallengeDay(
    programRecord.challenge_local_start_date || programRecord.program_start_date
  );

  const patch = {
    active_day_number: activeDay,
    current_day_status: "available",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_programs")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;

  await supabase
    .from("profiles")
    .update({
      active_day_number: activeDay,
      current_day_status: "available",
    })
    .eq("id", userId);

  return data || { ...programRecord, ...patch };
}

export async function completeUserProgram({ supabase, userId, profile, programRecord }) {
  if (!userId || profile?.program_completed_at) return null;

  const completionPatch = buildProgramCompletionPatch(profile, new Date());

  const profileResult = await supabase.from("profiles").update(completionPatch).eq("id", userId);
  const programResult = programRecord?.id
    ? await supabase
        .from("user_programs")
        .update({
          program_completed_at: completionPatch.program_completed_at,
          is_active: false,
          active_day_number: 30,
          current_day_status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", programRecord.id)
    : { error: null };

  if (profileResult.error) throw profileResult.error;
  if (programResult.error) throw programResult.error;

  return completionPatch;
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
