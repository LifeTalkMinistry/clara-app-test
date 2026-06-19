import { saveAccessSnapshot } from "@/lib/offline-access-cache";
import { saveLocalSetupProfile } from "@/lib/claraLocalProfile";

const LOCAL_MODE_ENABLED = true;
const LOCAL_MODE_USER_ID = "local-dev-user";
const LOCAL_MODE_EMAIL = "local@clara.app";

function safeWriteSessionFlag() {
  try {
    window.sessionStorage?.setItem("clara_supabase_quota_blocked", "1");
  } catch {
    // Ignore unavailable storage.
  }
}

export function installClaraTemporaryLocalMode() {
  if (!LOCAL_MODE_ENABLED) return;
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();

  const localProfile = {
    id: LOCAL_MODE_USER_ID,
    email: LOCAL_MODE_EMAIL,
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
    offline_access_notice: "CLARA is running in local mode while account services are unavailable.",
    updated_at: now,
  };

  safeWriteSessionFlag();

  saveLocalSetupProfile({
    completed: true,
    completed_at: now,
    recommended_access_level: "committed",
    answers: {
      commitment_level: "committed",
      lifestyle_context: "temporary_local_mode",
      money_pressure_point: "account_services_temporarily_unavailable",
      spending_trigger: "general_awareness",
      spending_guidance_style: "direct_coach",
      guidance_intensity: "balanced",
    },
  });

  saveAccessSnapshot({
    userId: LOCAL_MODE_USER_ID,
    email: LOCAL_MODE_EMAIL,
    profileBasic: localProfile,
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
      entitlementStatus: "local_mode",
    },
    savedAt: now,
  });
}
