import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { persistStoredSurvivalExpense } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import { firstPositiveNumber } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardSurvivalExpenseSaver({
  user,
  profileData,
  setProfileData,
  setSurvivalExpense,
  loadDashboardData,
  onCacheUpdate,
}) {
  return useCallback(async (val) => {
    const nextValue = firstPositiveNumber(val);
    if (nextValue <= 0) return;

    persistStoredSurvivalExpense(user?.id, nextValue);
    setSurvivalExpense(nextValue);

    const nextProfileData = {
      ...(profileData || {}),
      monthly_survival_expense: nextValue,
      survival_expense: nextValue,
      clara_survival_expense: nextValue,
      survival_setup_done: true,
    };

    setProfileData(nextProfileData);
    onCacheUpdate?.({
      survivalExpense: nextValue,
      profileData: nextProfileData,
    });

    if (user?.id) {
      const { error } = await supabase
        .from("profiles")
        .update({
          monthly_survival_expense: nextValue,
          survival_setup_done: true,
        })
        .eq("id", user.id);

      if (error) {
        console.warn(
          "Survival expense was saved locally, but profile sync failed:",
          error
        );
      }
    }

    await loadDashboardData({ background: true });
  }, [
    loadDashboardData,
    onCacheUpdate,
    profileData,
    setProfileData,
    setSurvivalExpense,
    user?.id,
  ]);
}
