import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { normalizeProgramTask } from "@/lib/program-journey";
import {
  ensureUserProgramAccess,
  fetchUserProgramRecord,
} from "@/lib/program-access";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import { isProgramApproved } from "@/components/fresh/main-dashboard/program-access/programAccessRules";
import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";
import { readDashboardPrefs } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import { readStoredSurvivalExpense } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import {
  firstPositiveNumber,
  getWalletDisplayBalance,
  isClaraOnline,
  isOwnedByUser,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

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
  isPaid = false,
  dailyRemindersEnabled = true,
  hasVisibleFinanceData = false,
  hydrateFromCache,
  hasLoadedDashboardRef,
  getDashboardPageCache,
  setDashboardPageCache,
  getDashboardPageInFlight,
  setDashboardPageInFlight,
  clearDashboardPageInFlight,
  setLoading,
  setGuardChecked,
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

          // TEMP AUTH BYPASS: Used while Supabase project is restricted. Remove or disable when Supabase Auth is restored.
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
              plan: "life_os_499",
              plan_key: "life_os_499",
              access_level: "life_os",
              subscription_status: "active",
              subscription_label: "Life OS",
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
              tasks: dashboardCacheSnapshot?.tasks || [],
              submissions: dashboardCacheSnapshot?.submissions || [],
              programRecord: dashboardCacheSnapshot?.programRecord || null,
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
            setProgramRecord(nextCache.programRecord);

            if (!hasVisibleFinanceData) {
              setFinanceNotice(null);
            }

            return nextCache;
          }

          const [
            tasksRes,
            submissionsRes,
            userProgramRecord,
            profilesRes,
            enrollmentsRes,
          ] = await Promise.all([
            supabase
              .from("challenge_tasks")
              .select("*")
              .order("sort_order", { ascending: true })
              .order("day", { ascending: true }),
            supabase.from("task_submissions").select("*"),
            fetchUserProgramRecord({ supabase, userId: currentUser.id }),
            supabase.from("profiles").select("*"),
            supabase
              .from("enrollments")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(1),
          ]);

          if (tasksRes.error) console.error("Failed to load tasks:", tasksRes.error);
          if (submissionsRes.error) {
            console.error("Failed to load submissions:", submissionsRes.error);
          }
          if (profilesRes.error) {
            console.error("Failed to load profiles:", profilesRes.error);
          }
          if (enrollmentsRes.error) {
            console.error("Failed to load enrollments:", enrollmentsRes.error);
          }

          const userSubmissions = (submissionsRes.data || []).filter((item) =>
            isOwnedByUser(item, currentUser)
          );
          const normalizedTasks = (tasksRes.data || []).map(normalizeProgramTask);
          const userProfile =
            (profilesRes.data || []).find((profile) => isOwnedByUser(profile, currentUser)) ||
            null;
          const enrollmentRecord = (enrollmentsRes.data || [])[0] || null;

          const nextNickname = normalizeString(
            userProfile?.display_name ||
              userProfile?.nickname ||
              userProfile?.full_name ||
              nickname ||
              dashboardCacheSnapshot?.nickname ||
              currentUser.full_name ||
              ""
          );
          const nextReminderTime =
            reminderTime || dashboardCacheSnapshot?.reminderTime || storedPrefs.reminderTime;
          const nextFinancialGoal =
            financialGoal || dashboardCacheSnapshot?.financialGoal || storedPrefs.financialGoal;
          const approved = isProgramApproved(userProfile, isPaid, enrollmentRecord);
          const onboardingDone = hasCompletedProgramOnboarding(userProfile);

          if (!approved || onboardingDone || !dailyRemindersEnabled) {
            setShowProgramStart(false);
          }

          const nextCache = {
            key: ownerKey,
            loaded: true,
            tasks: normalizedTasks,
            submissions: userSubmissions,
            programRecord: userProgramRecord || dashboardCacheSnapshot?.programRecord || null,
            survivalExpense: firstPositiveNumber(
              userProfile?.monthly_survival_expense,
              userProfile?.survival_expense,
              userProfile?.clara_survival_expense,
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
            profileData: userProfile,
            latestEnrollment: enrollmentRecord,
            guardChecked: true,
            nickname: nextNickname,
            reminderTime: nextReminderTime,
            financialGoal: nextFinancialGoal,
          };

          if (typeof setDashboardPageCache === "function") {
            setDashboardPageCache(nextCache);
          }
          hydrateFromCache(nextCache);

          if (approved && !nextCache.programRecord && currentUser.id) {
            ensureUserProgramAccess({
              supabase,
              user: currentUser,
              profile: userProfile,
              enrollment: enrollmentRecord,
              tasks: normalizedTasks,
            })
              .then((ensuredRecord) => {
                if (!ensuredRecord) return;
                const latestCache =
                  typeof getDashboardPageCache === "function"
                    ? getDashboardPageCache()
                    : nextCache;
                const updatedCache = {
                  ...latestCache,
                  programRecord: ensuredRecord,
                };

                if (typeof setDashboardPageCache === "function") {
                  setDashboardPageCache(updatedCache);
                }
                setProgramRecord(ensuredRecord);
              })
              .catch((ensureError) => {
                console.warn("Program access background refresh failed:", ensureError);
              });
          }

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

        return await promise;
      } catch (error) {
        console.warn("Dashboard background refresh warning:", error);
        const latestCache =
          typeof getDashboardPageCache === "function" ? getDashboardPageCache() : null;

        if (!hasVisibleFinanceData && !hasDashboardFinanceContent(latestCache)) {
          setFinanceNotice({
            message:
              "Dashboard data could not fully refresh. Finance data remains protected offline.",
            type: "error",
          });
        }

        return latestCache;
      } finally {
        if (typeof clearDashboardPageInFlight === "function") {
          clearDashboardPageInFlight(ownerKey);
        }
        setLoading(false);
        setGuardChecked(true);
      }
    },
    [
      cacheKey,
      clearDashboardPageInFlight,
      dailyRemindersEnabled,
      financeBudgets,
      financeEmergencyFund,
      financeExpenses,
      financeSavingsGoals,
      financeTransfers,
      financeWalletTransactions,
      financeWallets,
      financialGoal,
      getDashboardPageCache,
      getDashboardPageInFlight,
      hasLoadedDashboardRef,
      hasVisibleFinanceData,
      hydrateFromCache,
      isPaid,
      nickname,
      reminderTime,
      setDashboardPageCache,
      setDashboardPageInFlight,
      setFinanceNotice,
      setGuardChecked,
      setLoading,
      setProgramRecord,
      setShowProgramStart,
      survivalExpense,
      user,
      userEmail,
      userId,
    ]
  );
}
