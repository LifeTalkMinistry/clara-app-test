import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { persistDashboardPrefs } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import { normalizeString } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardOnboardingActions({
  user = null,
  profileData = null,
  nickname = "",
  reminderTime = "",
  financialGoal = "",
  onboardingStep = 0,
  setSavingOnboarding = () => {},
  setOnboardingStep = () => {},
} = {}) {
  const markOnboardingCompleted = useCallback(async () => {
    if (!user?.id) return;

    try {
      const updates = {
        program_onboarding_completed: true,
        has_completed_program_onboarding: true,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.warn("Profiles table does not accept onboarding fields yet:", error);
      }
    } catch (error) {
      console.error("Failed to save onboarding completion:", error);
    }
  }, [user?.id]);

  const isProgramOnboardingCompleted = useCallback(() => {
    return hasCompletedProgramOnboarding(profileData);
  }, [profileData]);

  const saveOnboardingDraft = useCallback(async () => {
    if (!user?.id) return true;

    setSavingOnboarding(true);

    try {
      const nextName = normalizeString(nickname);
      persistDashboardPrefs(user.id, {
        reminderTime,
        financialGoal,
      });

      const updates = {
        onboarding_step: onboardingStep,
      };

      if (nextName) {
        updates.full_name = nextName;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.warn("Optional onboarding fields were not saved to DB:", error);
      }

      return true;
    } catch (error) {
      console.error("Failed to save onboarding draft:", error);
      return false;
    } finally {
      setSavingOnboarding(false);
    }
  }, [
    user?.id,
    nickname,
    reminderTime,
    financialGoal,
    onboardingStep,
    setSavingOnboarding,
  ]);

  const goToNextOnboardingStep = useCallback(async () => {
    await saveOnboardingDraft();
    setOnboardingStep((prev) => prev + 1);
  }, [saveOnboardingDraft, setOnboardingStep]);

  return {
    markOnboardingCompleted,
    isProgramOnboardingCompleted,
    saveOnboardingDraft,
    goToNextOnboardingStep,
  };
}
