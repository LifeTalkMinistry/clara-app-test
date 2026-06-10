import { supabase } from "@/lib/supabaseClient";
import { normalizePlanKey } from "@/lib/plan-config";

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function formatActivationCode(value) {
  const code = normalizeCode(value);
  return code.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export function createActivationCode(planKey = "committed_249") {
  const prefix = normalizePlanKey(planKey) === "committed_249" ? "LIFE" : "CORE";
  const random =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((n) => (n % 36).toString(36).toUpperCase())
          .join("")
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return formatActivationCode(`${prefix}${random}`);
}

export async function validateActivationCode({ code, user, plan }) {
  const cleanCode = normalizeCode(code);
  const planKey = normalizePlanKey(plan || user?.plan);

  if (!cleanCode) {
    throw new Error("Enter your activation code.");
  }

  if (!user?.id) {
    throw new Error("Sign in before activating CLARA.");
  }

  const { data, error } = await supabase
    .from("activation_codes")
    .select("*")
    .eq("code_normalized", cleanCode)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Activation code not found.");

  const codePlan = normalizePlanKey(data.plan_key || data.plan || data.tier);
  if (codePlan !== planKey) {
    throw new Error("This code is for a different CLARA tier.");
  }

  if (data.used_at || data.status === "used") {
    throw new Error("This activation code has already been used.");
  }

  if (data.user_id && String(data.user_id) !== String(user.id)) {
    throw new Error("This activation code is assigned to another user.");
  }

  const nowIso = new Date().toISOString();

  const [{ error: codeError }, { error: profileError }] = await Promise.all([
    supabase
      .from("activation_codes")
      .update({
        user_id: user.id,
        user_email: user.email || null,
        status: "used",
        used_at: nowIso,
        activated_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", data.id),
    supabase
      .from("profiles")
      .update({
        activation_status: "activated",
        is_activated: true,
        activated_at: nowIso,
        activation_plan: planKey,
        activation_code_id: data.id,
        program_onboarding_completed: false,
        has_completed_program_onboarding: false,
        updated_at: nowIso,
      })
      .eq("id", user.id),
  ]);

  if (codeError) throw codeError;
  if (profileError) throw profileError;

  return { ...data, used_at: nowIso, status: "used" };
}
