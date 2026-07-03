import { useEffect } from "react";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import { persistDashboardTheme } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import { normalizeString } from "@/utils/dashboard/dashboardHelpers";
import { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";

export default function useDashboardThemePersistence({ selectedDashboardTheme }) {
  const userId = ensureActiveLocalVaultId();

  useEffect(() => {
    const themeKey = normalizeString(
      selectedDashboardTheme?.key ||
        selectedDashboardTheme?.id ||
        selectedDashboardTheme?.value ||
        selectedDashboardTheme?.name ||
        selectedDashboardTheme?.label ||
        ""
    ).toLowerCase();

    if (!themeKey) return;

    persistDashboardTheme(userId, themeKey);

    const detail = {
      themeKey,
      key: themeKey,
      dashboardTheme: themeKey,
      selectedTheme: themeKey,
      userId,
      isLight: selectedDashboardTheme?.isLight === true,
    };

    dispatchClaraEvent("clara-dashboard-theme-updated", detail);
    dispatchClaraEvent("clara-theme-selected", detail);
    dispatchClaraEvent("clara-theme-change", detail);

    if (typeof document !== "undefined") {
      document.documentElement.dataset.dashboardTheme = themeKey;
      document.body.dataset.dashboardTheme = themeKey;
      document.documentElement.dataset.theme = themeKey;
      document.body.dataset.theme = themeKey;
    }
  }, [selectedDashboardTheme, userId]);
}
