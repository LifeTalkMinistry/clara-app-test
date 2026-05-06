import { firstPositiveNumber } from "@/utils/dashboard/dashboardHelpers";
import { DEFAULT_DASHBOARD_THEME_KEY } from "./dashboardThemeBase";

const dashboardRuntimeThemes = new Map();
const dashboardRuntimeSurvivalExpenses = new Map();

const dispatchClaraRuntimeThemeEvent = (name, detail = null) => {
  if (typeof window === "undefined") return;

  if (detail && typeof detail === "object") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return;
  }

  window.dispatchEvent(new Event(name));
};

export const getDashboardThemeStorageKey = (userId) =>
  `clara_dashboard_theme_${userId || "guest"}`;

export function readStoredDashboardTheme(userId) {
  return dashboardRuntimeThemes.get(getDashboardThemeStorageKey(userId)) || DEFAULT_DASHBOARD_THEME_KEY;
}

export function persistDashboardTheme(userId, themeKey) {
  dashboardRuntimeThemes.set(getDashboardThemeStorageKey(userId), themeKey);

  const detail = {
    themeKey,
    key: themeKey,
    dashboardTheme: themeKey,
    userId: userId || null,
  };

  dispatchClaraRuntimeThemeEvent("clara-dashboard-theme-updated", detail);
  dispatchClaraRuntimeThemeEvent("clara-theme-selected", detail);
  dispatchClaraRuntimeThemeEvent("clara-theme-change", detail);
}

export const readStoredSurvivalExpense = (userId) =>
  firstPositiveNumber(dashboardRuntimeSurvivalExpenses.get(userId || "guest"));

export const persistStoredSurvivalExpense = (userId, value) => {
  const amount = firstPositiveNumber(value);
  if (amount <= 0) return;

  dashboardRuntimeSurvivalExpenses.set(userId || "guest", amount);
  dispatchClaraRuntimeThemeEvent("clara:survival-expense-updated", {
    amount,
    monthlyEssentialExpenses: amount,
    monthly_survival_expense: amount,
    survivalExpense: amount,
    survival_expense: amount,
  });
};
