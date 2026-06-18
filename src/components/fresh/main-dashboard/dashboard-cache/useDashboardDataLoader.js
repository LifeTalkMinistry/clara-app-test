import { useCallback } from "react";
import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";
import { readDashboardPrefs } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import { readStoredSurvivalExpense } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import {
  firstPositiveNumber,
  getWalletDisplayBalance,
  isClaraOnline,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";
import {
  getSupabaseQuotaNotice,
  isSupabaseQuotaBlocked,
} from "@/lib/supabaseQuotaGuard";

const LOCAL_AUTH_FALLBACK_USER_ID = "local-dev-user";

function isLocalAuthFallbackUser(currentUser = {}, authUser = {}) {
  return (
    currentUser?.id === LOCAL_AUTH_FALLBACK_USER_ID ||
    authUser?.id === LOCAL_AUTH_FALLBACK_USER_ID ||
    authUser?.profile?.id === LOCAL_AUTH_FALLBACK_USER_ID ||
    authUser?.email === "local@clara.app" ||
    currentUser?.email === "local@clara.app"
  );
}

function buildProfileFromAuth(currentUser = {}, authUser = {}) {
  const authProfile = authUser?.profile || authUser?.account_profile || authUser || {};
  const fallbackName =
    currentUser.full_name ||
    authProfile.full_name ||
    authProfile.display_name ||
    currentUser.email?.split("@")[0] ||
    "CLARA User";

  return {
    ...authProfile,
    id: authProfile.id || currentUser.id || null,
    email: authProfile.email || currentUser.email || null,
    full_name: authProfile.full_name || fallbackName,
    display_name: authProfile.display_name || authProfile.nickname || fallbackName,
    plan: authProfile.plan || authProfile.plan_key || "free",
    plan_key: authProfile.plan_key || authProfile.plan || "free",
    subscription_status: authProfile.subscription_status || authProfile.status || "free",
    subscription_label: authProfile.subscription_label || "Free",
    status: authProfile.status || authProfile.subscription_status || "free",
  };
}

export default function useDashboardDataLoader({
  userId,
  userEmail,
  user,
  cacheKey,
  financeWallets = [],
  financeWalletTransactions = [],
  financeTransfers = [],
  financeBudgets = [],
  financeSavingsGoals = [],
  financeExpenses = [],
  financeEmergencyFund = null,
  nickname,
  reminderTime,
  financialGoal,
  survivalExpense,
  hasVisibleFinanceData = false,
  hydrateFromCache,
  hasLoadedDashboardRef,
  getDashboardPageCache,
  setDashboardPageCache,
  getDashboardPageInFlight,
  setDashboardPageInFlight,
  clearDashboardPageInFlight,
  setLoading,
  setFinanceNotice,
  setShowProgramStart,
  setProgramRecord,
} = {}) {
  return useCallback(
    async ({ background = false } = {}) => {
      const currentUser = {
        id: userId,
        email: userEmail,
        full_name: user?.full_name || "",
      };

      const currentDashboardCache =
        typeof getDashboardPageCache === "function" ? getDashboardPageCache() : null;

      if (!currentUser.email && !currentUser.id) {
        const emptyCache = createEmptyDashboardCache();
        if (typeof setDashboardPageCache === "function") {
          setDashboardPageCache(emptyCache);
        }
        hydrateFromCache(emptyCache);
        return emptyCache;
      }

      const ownerKey = cacheKey || currentUser.id || currentUser.email || "guest";
      const activeInFlight =
        typeof getDashboardPageInFlight === "function"
          ? getDashboardPageInFlight()
          : null;

      if (activeInFlight?.key === ownerKey) return activeInFlight.promise;

      if (
        !hasLoadedDashboardRef?.current &&
        !background &&
        !hasDashboardFinanceContent(currentDashboardCache)
      ) {
        setLoading(true);
      }

      const localAuthFallbackActive = isLocalAuthFallbackUser(currentUser, user);

      try {
        const promise = (async () => {
          const dashboardCacheSnapshot =
            typeof getDashboardPageCache === "function"
              ? getDashboardPageCache()
              : null;

          const safeWallets = Array.isArray(financeWallets) ? financeWallets : [];
          const safeWalletTransactions = Array.isArray(financeWalletTransactions)
            ? financeWalletTransactions
            : [];
          const safeTransfers = Array.isArray(financeTransfers) ? financeTransfers : [];
          const safeBudgets = Array.isArray(financeBudgets) ? financeBudgets : [];
          const safeSavingsGoals = Array.isArray(financeSavingsGoals)
            ? financeSavingsGoals
            : [];
          const safeExpenses = Array.isArray(financeExpenses) ? financeExpenses : [];
          const safePendingExpenses = safeExpenses.filter(
            (item) =>
              item?.pending_sync ||
              item?.sync_status === "pending" ||
              item?.syncStatus === "pending" ||
              item?.local_only
          );
          const nextWalletMoney = safeWallets.reduce(
            (sum, wallet) => sum + getWalletDisplayBalance(wallet),
            0
          );

          const storedPrefs = readDashboardPrefs(currentUser.id);

          if (localAuthFallbackActive) {
            const localProfile = {
              ...(user?.profile || {}),
              id: currentUser.id,
              email: currentUser.email,
              display_name:
                user?.display_name ||
                user?.full_name ||
                currentUser.full_name ||
                "CLARA User",
              full_name: user?.full_name || currentUser.full_name || "CLARA User",
              plan: "committed_249",
              plan_key: "committed_249",
              access_level: "committed",
              subscription_status: "active",
              subscription_label: "Committed",
              status: "active",
              enrollment_status: "approved",
              is_enrolled: true,
              program_active: true,
              onboarding_completed: true,
              has_completed_universal_onboarding: true,
              has_seen_universal_onboarding: true,
              program_onboarding_completed: true,
              has_completed_program_onboarding: true,
              activation_status: "active",
              is_activated: true,
            };

            const nextNickname = normalizeString(
              localProfile.display_name ||
                localProfile.nickname ||
                localProfile.full_name ||
                nickname ||
                dashboardCacheSnapshot?.nickname ||
                "CLARA User"
            );
            const nextReminderTime =
              reminderTime || dashboardCacheSnapshot?.reminderTime || storedPrefs.reminderTime;
            const nextFinancialGoal =
              financialGoal || dashboardCacheSnapshot?.financialGoal || storedPrefs.financialGoal;

            const nextCache = {
              key: ownerKey,
              loaded: true,
              tasks: [],
              submissions: [],
              programRecord: null,
              survivalExpense: firstPositiveNumber(
                localProfile?.monthly_survival_expense,
                localProfile?.survival_expense,
                localProfile?.clara_survival_expense,
                readStoredSurvivalExpense(currentUser.id),
                survivalExpense,
                dashboardCacheSnapshot?.survivalExpense
              ),
              walletMoney: nextWalletMoney,
              wallets: safeWallets,
              walletTransactions: safeWalletTransactions,
              transfers: safeTransfers,
              budgets: safeBudgets,
              savingsGoals: safeSavingsGoals,
              emergencyFund: financeEmergencyFund || null,
              expenses: safeExpenses,
              pendingExpenses: safePendingExpenses,
              offlineReady: true,
              profileData: localProfile,
              latestEnrollment: null,
              guardChecked: true,
              nickname: nextNickname,
              reminderTime: nextReminderTime,
              financialGoal: nextFinancialGoal,
            };

            if (typeof setDashboardPageCache === "function") {
              setDashboardPageCache(nextCache);
            }
            hydrateFromCache(nextCache);
            setShowProgramStart(false);
            setProgramRecord(null);

            if (!hasVisibleFinanceData) {
              setFinanceNotice(null);
            }

            return nextCache;
          }

          const safeProfile = buildProfileFromAuth(currentUser, user);

          if (isSupabaseQuotaBlocked()) {
            setFinanceNotice({
              message: getSupabaseQuotaNotice(),
              type: "warning",
            });
          }

          const nextNickname = normalizeString(
            safeProfile?.display_name ||
              safeProfile?.nickname ||
              safeProfile?.full_name ||
              nickname ||
              dashboardCacheSnapshot?.nickname ||
              currentUser.full_name ||
              ""
          );
          const nextReminderTime =
            reminderTime || dashboardCacheSnapshot?.reminderTime || storedPrefs.reminderTime;
          const nextFinancialGoal =
            financialGoal || dashboardCacheSnapshot?.financialGoal || storedPrefs.financialGoal;

          setShowProgramStart(false);
          setProgramRecord(null);

          const nextCache = {
            key: ownerKey,
            loaded: true,
            tasks: [],
            submissions: [],
            programRecord: null,
            survivalExpense: firstPositiveNumber(
              safeProfile?.monthly_survival_expense,
              safeProfile?.survival_expense,
              safeProfile?.clara_survival_expense,
              readStoredSurvivalExpense(currentUser.id),
              survivalExpense,
              dashboardCacheSnapshot?.survivalExpense
            ),
            walletMoney: nextWalletMoney,
            wallets: safeWallets,
            walletTransactions: safeWalletTransactions,
            transfers: safeTransfers,
            budgets: safeBudgets,
            savingsGoals: safeSavingsGoals,
            emergencyFund: financeEmergencyFund || null,
            expenses: safeExpenses,
            pendingExpenses: safePendingExpenses,
            offlineReady: true,
            profileData: safeProfile,
            latestEnrollment: null,
            guardChecked: true,
            nickname: nextNickname,
            reminderTime: nextReminderTime,
            financialGoal: nextFinancialGoal,
          };

          if (typeof setDashboardPageCache === "function") {
            setDashboardPageCache(nextCache);
          }
          hydrateFromCache(nextCache);

          if (!isClaraOnline() && !hasVisibleFinanceData) {
            setFinanceNotice({
              message: "You’re offline. CLARA is using offline-first finance data.",
              type: "success",
            });
          }

          return nextCache;
        })();

        if (typeof setDashboardPageInFlight === "function") {
          setDashboardPageInFlight({ key: ownerKey, promise });
        }

        const result = await promise;
        return result;
      } catch (error) {
        console.error("Dashboard load error:", error);
        const fallbackCache = currentDashboardCache || createEmptyDashboardCache();
        hydrateFromCache(fallbackCache);
        return fallbackCache;
      } finally {
        if (typeof clearDashboardPageInFlight === "function") {
          clearDashboardPageInFlight(ownerKey);
        }
        setLoading(false);
      }
    },
    [
      userId,
      userEmail,
      user,
      cacheKey,
      getDashboardPageCache,
      getDashboardPageInFlight,
      hasLoadedDashboardRef,
      financeWallets,
      financeWalletTransactions,
      financeTransfers,
      financeBudgets,
      financeSavingsGoals,
      financeExpenses,
      financeEmergencyFund,
      nickname,
      reminderTime,
      financialGoal,
      survivalExpense,
      hasVisibleFinanceData,
      hydrateFromCache,
      setDashboardPageCache,
      setDashboardPageInFlight,
      clearDashboardPageInFlight,
      setLoading,
      setFinanceNotice,
      setShowProgramStart,
      setProgramRecord,
    ]
  );
}
