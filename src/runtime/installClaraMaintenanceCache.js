import { saveAccessSnapshot } from "@/lib/offline-access-cache";
import { saveLocalSetupProfile } from "@/lib/claraLocalProfile";

const MAINTENANCE_CACHE_ENABLED = true;
const LOCAL_USER_ID = "local-dev-user";
const LOCAL_EMAIL = "local@clara.app";

export function installClaraMaintenanceCache() {
  if (!MAINTENANCE_CACHE_ENABLED) return;
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();
  const profile = {
    id: LOCAL_USER_ID,
    email: LOCAL_EMAIL,
    full_name: "CLARA Local User",
    display_name: "CLARA Local User",
    role: "user",
    plan: "committed_249",
    plan_key: "committed_249",
    subscription_plan: "committed_249",
    access_level: "committed",
    subscription_status: "active",
    subscription_label: "Committed",
    status: "active",
    enrollment_status: "approved",
    activation_status: "active",
    is_activated: true,
    is_enrolled: true,
    program_active: true,
    onboarding_completed: true,
    onboarding_step: 0,
    program_onboarding_completed: true,
    has_completed_program_onboarding: true,
    has_completed_universal_onboarding: true,
    has_seen_universal_onboarding: true,
    offline_access: true,
    offline_limited_access: false,
    offline_access_notice: "CLARA is using local data while account services are unavailable.",
    updated_at: now,
  };

  try {
    window.sessionStorage?.setItem("clara_supabase_quota_blocked", "1");
  } catch {
    // Ignore unavailable storage.
  }

  saveLocalSetupProfile({
    completed: true,
    completed_at: now,
    recommended_access_level: "committed",
    answers: {
      commitment_level: "committed",
      lifestyle_context: "maintenance",
      money_pressure_point: "service_temporarily_unavailable",
      spending_trigger: "general_awareness",
      spending_guidance_style: "direct_coach",
      guidance_intensity: "balanced",
    },
  });

  saveAccessSnapshot({
    userId: LOCAL_USER_ID,
    email: LOCAL_EMAIL,
    profileBasic: profile,
    role: "user",
    plan: "committed_249",
    subscriptionStatus: "active",
    onboardingCompleted: true,
    lastResolvedAppFlow: "normal",
    lastValidRoute: "/dashboard",
    accessState: {
      role: "user",
      plan: "committed_249",
      accessLevel: "committed",
      subscriptionStatus: "active",
      entitlementStatus: "local",
    },
    savedAt: now,
  });
}
