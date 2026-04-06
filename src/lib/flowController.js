export function getUserFlow(profile) {
  if (!profile) return "universal_onboarding";

  const onboardingCompleted =
    profile.onboarding_completed === true ||
    profile.has_completed_onboarding === true;

  const enrollmentStatus = String(
    profile.enrollment_status || "none"
  ).toLowerCase();

  const programOnboardingCompleted =
    profile.program_onboarding_completed === true;

  if (!onboardingCompleted) {
    return "universal_onboarding";
  }

  if (["pending", "under_review"].includes(enrollmentStatus)) {
    return "payment_pending";
  }

  if (
    ["approved", "active"].includes(enrollmentStatus) &&
    !programOnboardingCompleted
  ) {
    return "program_onboarding";
  }

  return "dashboard";
}