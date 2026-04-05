export function getUserFlow(profile) {
  // 🔥 CRITICAL FIX: handle missing profile safely
  if (!profile) {
    return "universal_onboarding"; // instead of "loading"
  }

  // Step 1: Universal onboarding
  if (!profile.onboarding_completed) {
    return "universal_onboarding";
  }

  // Step 2: Payment pending
  if (profile.enrollment_status === "pending") {
    return "payment_pending";
  }

  // Step 3: Program onboarding (only for enrolled users)
  if (
    profile.enrollment_status === "active" &&
    !profile.program_onboarding_completed
  ) {
    return "program_onboarding";
  }

  // Step 4: Default app
  return "dashboard";
}