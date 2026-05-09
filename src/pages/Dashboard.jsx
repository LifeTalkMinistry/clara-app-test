import {
  useState,
  useEffect,
  useCallback,
  useRef } from "react";

import {
  dashboardPanelFormatTime,
  dashboardPanelInitials,
  } from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";
import DashboardFeedPanel from "@/components/fresh/dashboard-panels/feed/DashboardFeedPanel";
import DashboardMessagesPanel from "@/components/fresh/main-dashboard/dashboard-panels/messages/DashboardMessagesPanel";
import DashboardTasksPanel from "@/components/fresh/main-dashboard/dashboard-panels/tasks/DashboardTasksPanel";
import DashboardSettingsPanel from "@/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel";
import {
  Settings,
  Clock,
  FileText,
  ExternalLink,
  Rocket,
  CheckCircle2,
  ShieldCheck,
  CalendarDays,
  Flag,
  Bell,
  X,
  Home,
  MessageCircle,
  Send,
  Search,
  ListChecks,
  WalletCards,
  Target,
  ChevronRight,
  Plus,
  RotateCcw,
  ArrowDown,
  Wallet,
  Palette,
  Check,
  } from "lucide-react";
import { Link,
  useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import DashboardFinanceExpandedSheet from "@/components/fresh/main-dashboard/financial-cards/DashboardFinanceExpandedSheet";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardMoneySummary from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummary";
import useMoneySummaryVisibility from "@/components/fresh/main-dashboard/money-summary/useMoneySummaryVisibility";
import useMoneyLeftSummaryHandlers from "@/components/fresh/main-dashboard/money-summary/useMoneyLeftSummaryHandlers";
import useDashboardMoneyLeftMetrics from "@/components/fresh/main-dashboard/money-summary/useDashboardMoneyLeftMetrics";
import useDashboardMoneyInsightState from "@/components/fresh/main-dashboard/money-summary/useDashboardMoneyInsightState";
import useDashboardBudgetSummaries from "@/components/fresh/main-dashboard/budget/useDashboardBudgetSummaries";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardSelectedBudgetState from "@/components/fresh/main-dashboard/budget/useDashboardSelectedBudgetState";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import useDashboardBudgetFormProgress from "@/components/fresh/main-dashboard/budget/useDashboardBudgetFormProgress";
import useDashboardManualExpenseBudgetListItems from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetListItems";
import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";
import DashboardShell from "@/components/fresh/main-dashboard/shell/DashboardShell";
import DashboardEmbeddedStyles from "@/components/fresh/main-dashboard/shell/DashboardEmbeddedStyles";
import useDashboardShellReady from "@/components/fresh/main-dashboard/shell/useDashboardShellReady";
import useDashboardPanelNavigation from "@/components/fresh/main-dashboard/shell/useDashboardPanelNavigation";
import useDashboardScrollState from "@/components/fresh/main-dashboard/shell/useDashboardScrollState";
import useDashboardInteractionState from "@/components/fresh/main-dashboard/shell/useDashboardInteractionState";
import DashboardContentArea from "@/components/fresh/main-dashboard/shell/DashboardContentArea";
import DashboardPanelRenderer from "@/components/fresh/main-dashboard/shell/DashboardPanelRenderer";
import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";
import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  DASHBOARD_SCALE,
  useDashboardViewportMode,
  } from "@/components/fresh/main-dashboard/dashboard-scale/dashboardScale";
import {
  applyVisualPerformanceMode,
  readStoredPerformanceMode,
  saveVisualPerformanceMode,
  } from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";
import {
  MONEY_SUMMARY_PRIVACY_KEY,
  persistDashboardPrefs,
  persistStoredNotificationSettings,
  readDashboardPrefs,
  readStoredNotificationSettings,
  } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import useDashboardNotificationSettings from "@/components/fresh/main-dashboard/dashboard-settings/useDashboardNotificationSettings";
import {
  clearProgramPromptSeenThisSession,
  getProgramPromptSessionKey,
  persistProgramPromptSeenThisSession,
  readProgramPromptSeenThisSession,
  } from "@/components/fresh/main-dashboard/program-prompts/programPromptSession";
import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";
import useFinanceDataErrorNotice from "@/components/fresh/main-dashboard/finance-notices/useFinanceDataErrorNotice";
import useDashboardOnlineStatusNotice from "@/components/fresh/main-dashboard/finance-notices/useDashboardOnlineStatusNotice";
import useDashboardFinanceRefreshEvents from "@/components/fresh/main-dashboard/finance-notices/useDashboardFinanceRefreshEvents";
import useDashboardScheduledRefresh from "@/components/fresh/main-dashboard/finance-notices/useDashboardScheduledRefresh";
import useLatestValueRef from "@/components/fresh/main-dashboard/hooks/useLatestValueRef";
import useDashboardInitialLoad from "@/components/fresh/main-dashboard/hooks/useDashboardInitialLoad";
import usePhpCurrencyFormatter from "@/components/fresh/main-dashboard/hooks/usePhpCurrencyFormatter";
import useDashboardEnrollmentRedirect from "@/components/fresh/main-dashboard/program-access/useDashboardEnrollmentRedirect";
import useDashboardProgramJourneyState from "@/components/fresh/main-dashboard/program-journey/useDashboardProgramJourneyState";
import useDashboardProfileUpdateListener from "@/components/fresh/main-dashboard/profile/useDashboardProfileUpdateListener";
import OnboardingActionBar from "@/components/fresh/main-dashboard/onboarding/OnboardingActionBar";
import useOnboardingPageLock from "@/components/fresh/main-dashboard/onboarding/useOnboardingPageLock";
import useDashboardOnboardingState from "@/components/fresh/main-dashboard/onboarding/useDashboardOnboardingState";
import createInitialFinanceForm from "@/components/fresh/main-dashboard/finance-form/financeFormInitialState";
import useDashboardFinanceUiState from "@/components/fresh/main-dashboard/finance-form/useDashboardFinanceUiState";
import useDashboardManualExpenseValidation from "@/components/fresh/main-dashboard/finance-form/useDashboardManualExpenseValidation";
import useManualExpenseBudgetListKey from "@/components/fresh/main-dashboard/finance-form/useManualExpenseBudgetListKey";
import useBudgetListDropdownDismiss from "@/components/fresh/main-dashboard/finance-form/useBudgetListDropdownDismiss";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";
import useDashboardVisibleFinanceData from "@/components/fresh/main-dashboard/finance-content/useDashboardVisibleFinanceData";
import useDashboardFinanceStateSync from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync";
import useDashboardFinanceOverviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceOverviewState";
import useDashboardClaraAssistantContext from "@/components/fresh/main-dashboard/assistant/useDashboardClaraAssistantContext";
import useDashboardFinanceActionHandlers from "@/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers";
import useDashboardFinanceDiagnostics from "@/components/fresh/main-dashboard/finance-diagnostics/useDashboardFinanceDiagnostics";
import useDashboardFinanceCardExpansion from "@/components/fresh/main-dashboard/financial-cards/useDashboardFinanceCardExpansion";
import {
  dashboardTheme,
  DEFAULT_DASHBOARD_THEME_KEY,
  getDashboardGlowCardClass,
  } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeBase";
import {
  readStoredDashboardTheme,
  readStoredSurvivalExpense,
  persistStoredSurvivalExpense,
  } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import useDashboardThemeClasses from "@/components/fresh/main-dashboard/dashboard-theme/useDashboardThemeClasses";
import useDashboardThemePersistence from "@/components/fresh/main-dashboard/dashboard-theme/useDashboardThemePersistence";
import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";
import useDashboardHydrateFromCache from "@/components/fresh/main-dashboard/dashboard-cache/useDashboardHydrateFromCache";
import useDashboardCacheOwnerSync from "@/components/fresh/main-dashboard/dashboard-cache/useDashboardCacheOwnerSync";
import useDashboardDataLoader from "@/components/fresh/main-dashboard/dashboard-cache/useDashboardDataLoader";
import useDashboardDataState from "@/components/fresh/main-dashboard/dashboard-state/useDashboardDataState";
import {
  DASHBOARD_PANEL_ORDER,
  dashboardPanelCardClass,
  dashboardPanelTextClass,
  } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import TaskReminderPrompt from "@/components/TaskReminderPrompt";
import useUserRole from "../hooks/useUserRole";
import useTaskReminderPrompt from "@/hooks/useTaskReminderPrompt";
import useFinancialData from "../hooks/useFinancialData";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import { useTheme } from "@/theme/ThemeProvider";
import { DEFAULT_THEME_KEY } from "@/theme/themes";
import {
  buildProgramJourney,
  getProgramBubbleContent,
  normalizeProgramTask,
  } from "@/lib/program-journey";
import {
  ensureUserProgramAccess,
  fetchUserProgramRecord,
  } from "@/lib/program-access";
import {
  isProgramApproved,
  shouldForceToEnroll,
  } from "@/components/fresh/main-dashboard/program-access/programAccessRules";
import { getWalletBalance } from "@/utils/financialEngine";
import {
  normalizeString,
  PH_TIME_ZONE,
  PH_OFFSET_MINUTES,
  FINANCE_CATEGORIES,
  createFinanceId,
  isClaraOnline,
  createLocalOnlyExpenseRecord,
  ENROLLMENT_PENDING_STATUSES,
  ENROLLMENT_APPROVED_STATUSES,
  ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES,
  isOwnedByUser,
  firstValidNumber,
  firstPositiveNumber,
  isTruthyActive,
  normalizeDateValue,
  padDatePart,
  getPHDateKey,
  phLocalPartsToUtcDate,
  getPHMonthRange,
  getPHWeekStartKey,
  isInPHRange,
  sortByNewestDate,
  getWalletDisplayName,
  getBudgetTotal,
  getBudgetSpent,
  getBudgetRemaining,
  formatBudgetRemainingCurrency,
  getBudgetRemainingToneClass,
  getBudgetCategoryValue,
  getBudgetTrackingStart,
  isExpenseInsideBudgetWindow,
  getSavingsSaved,
  getSavingsTarget,
  getSavingsGoalTitle,
  formatCompactDate,
  getExpenseCategoryKey,
  getBudgetCategoryKey,
  formatBudgetLabel,
  getBudgetListTitle,
  getBudgetNeedType,
  getWalletSortOrder,
  getToday,
} from "@/utils/dashboard/dashboardHelpers";

let dashboardPageCache = createEmptyDashboardCache();
let dashboardPageInFlight = null;


export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedTheme: selectedDashboardTheme, openThemePicker, setTheme } = useTheme();
  const dashboardViewportMode = useDashboardViewportMode();
  const dashboardScale = DASHBOARD_SCALE[dashboardViewportMode] || DASHBOARD_SCALE.normal;
  const { user, plan, isAdmin, isAdvertiser, isPaid, isFree, isPending, refreshUser } =
    useUserRole();

  const {
    expenses: financeExpenses = [],
    wallets: financeWallets = [],
    walletTransactions: financeWalletTransactions = [],
    transfers: financeTransfers = [],
    budgets: financeBudgets = [],
    savingsGoals: financeSavingsGoals = [],
    emergencyFund: financeEmergencyFund = null,
    refreshData: refreshFinancialData,
    loading: financeDataLoading = false,
    refreshing: financeDataRefreshing = false,
    error: financeDataError = null,
    addExpense: addExpenseData,
    updateExpense: updateExpenseData,
    deleteExpense: deleteExpenseData,
    addWallet: addWalletData,
    updateWallet: updateWalletData,
    deleteWallet: deleteWalletData,
    addIncome: addIncomeData,
    transferBetweenWallets: transferBetweenWalletsData,
    addBudget: addBudgetData,
    updateBudget: updateBudgetData,
    deleteBudget: deleteBudgetData,
    addSavingsGoal: addSavingsGoalData,
    updateSavingsGoal: updateSavingsGoalData,
    deleteSavingsGoal: deleteSavingsGoalData,
    updateEmergencyFund: updateEmergencyFundData,
  } = useFinancialData(user);

  const userId = user?.id || null;
  const [moneySummaryVisible, toggleMoneySummaryVisibility] =
    useMoneySummaryVisibility(userId);
  const userEmail = user?.email || null;
  const cacheKey = userId || userEmail || null;
  const initialCache =
    dashboardPageCache.loaded && dashboardPageCache.key === cacheKey
      ? dashboardPageCache
      : createEmptyDashboardCache(cacheKey);
  const hasInitialFinanceCache = Boolean(
    initialCache.loaded ||
      initialCache.offlineReady ||
      (Array.isArray(initialCache.wallets) && initialCache.wallets.length > 0) ||
      (Array.isArray(initialCache.expenses) && initialCache.expenses.length > 0) ||
      (Array.isArray(initialCache.budgets) && initialCache.budgets.length > 0) ||
      (Array.isArray(initialCache.savingsGoals) && initialCache.savingsGoals.length > 0) ||
      initialCache.emergencyFund
  );

  const {
    tasks,
    setTasks,
    submissions,
    setSubmissions,
    programRecord,
    setProgramRecord,
    survivalExpense,
    setSurvivalExpense,
    walletMoney,
    setWalletMoney,
    wallets,
    setWallets,
    walletTransactions,
    setWalletTransactions,
    transfers,
    setTransfers,
    budgets,
    setBudgets,
    savingsGoals,
    setSavingsGoals,
    emergencyFund,
    setEmergencyFund,
    expenses,
    setExpenses,
    pendingExpenses,
    setPendingExpenses,
    offlineReady,
    setOfflineReady,
    loading,
    setLoading,
    profileData,
    setProfileData,
    latestEnrollment,
    setLatestEnrollment,
    guardChecked,
    setGuardChecked,
  } = useDashboardDataState({
    initialCache,
    hasInitialFinanceCache,
    financeDataLoading,
  });

  const {
    showProgramStart,
    setShowProgramStart,
    programPromptSeenThisSession,
    setProgramPromptSeenThisSession,
    showOnboarding,
    setShowOnboarding,
    onboardingStep,
    setOnboardingStep,
    savingOnboarding,
    setSavingOnboarding,
    commitmentChecked,
    setCommitmentChecked,
    nickname,
    setNickname,
    reminderTime,
    setReminderTime,
    financialGoal,
    setFinancialGoal,
  } = useDashboardOnboardingState(initialCache);
  const [notificationSettings, setNotificationSettings] =
    useDashboardNotificationSettings(userId);
  const {
    dailyStrategyFlipped,
    setDailyStrategyFlipped,
    expandedFinanceCard,
    setExpandedFinanceCard,
    expandedFinanceDetailSections,
    setExpandedFinanceDetailSections,
    showAiAssistant,
    setShowAiAssistant,
  } = useDashboardInteractionState();
  const {
    activeDashboardPanel,
    setActiveDashboardPanel,
    dashboardPanelDirection,
    setDashboardPanelDirection,
  } = useDashboardPanelNavigation();
  const dashboardShellReady = useDashboardShellReady();
  const {
    dashboardScrollRef,
    dashboardContentRef,
    dashboardScrollTimersRef,
    isDashboardScrollable,
    setIsDashboardScrollable,
  } = useDashboardScrollState();
  const {
    financeActionLoading,
    setFinanceActionLoading,
    financeNotice,
    setFinanceNotice,
    financeModal,
    setFinanceModal,
    budgetExitConfirm,
    setBudgetExitConfirm,
    budgetListOpen,
    setBudgetListOpen,
  } = useDashboardFinanceUiState();
  const budgetListDropdownRef = useRef(null);
  const [financeForm, setFinanceForm] = useState(createInitialFinanceForm);

  useBudgetListDropdownDismiss({
    budgetListOpen,
    budgetListDropdownRef,
    setBudgetListOpen,
  });

  const updateDashboardFinanceCache = useCallback((nextFinanceCache) => {
    dashboardPageCache = {
      ...dashboardPageCache,
      ...nextFinanceCache,
    };
  }, []);

  useDashboardFinanceStateSync({
    cacheKey,
    financeWallets,
    financeWalletTransactions,
    financeTransfers,
    financeBudgets,
    financeSavingsGoals,
    financeExpenses,
    financeEmergencyFund,
    setWallets,
    setWalletTransactions,
    setTransfers,
    setBudgets,
    setSavingsGoals,
    setEmergencyFund,
    setExpenses,
    setPendingExpenses,
    setOfflineReady,
    setWalletMoney,
    setLoading,
    onCacheUpdate: updateDashboardFinanceCache,
  });

  const hasVisibleFinanceData = useDashboardVisibleFinanceData({
    wallets,
    expenses,
    budgets,
    savingsGoals,
    walletTransactions,
    emergencyFund,
    walletMoney,
  });

  useFinanceDataErrorNotice({
    financeDataError,
    hasVisibleFinanceData,
    setFinanceNotice,
  });

  const dailyRemindersEnabled = notificationSettings?.dailyReminders !== false;
  const {
    themeIsLight,
    themePrimaryTextClass,
    themeSecondaryTextClass,
    themeMutedTextClass,
    themeSoftTextClass,
    themeGlassButtonClass,
    themeGlassIconButtonClass,
    themeQuickActionBaseClass,
    themeQuickActionIconShellClass,
    themeDividerClass,
    themeInactiveDotClass,
    themeQuickActionPanelStyle,
    themeQuickActionGlowStyle,
  } = useDashboardThemeClasses(selectedDashboardTheme);

  useDashboardThemePersistence({
    selectedDashboardTheme,
    userId,
  });

  const approvalTriggeredRef = useRef(false);
  const hasLoadedDashboardRef = useRef(false);
  const latestEnrollmentRef = useLatestValueRef(latestEnrollment);
  const isPaidRef = useLatestValueRef(isPaid);

  const hydrateFromCache = useDashboardHydrateFromCache({
    financeDataLoading,
    hasLoadedDashboardRef,
    setTasks,
    setSubmissions,
    setProgramRecord,
    setSurvivalExpense,
    setWalletMoney,
    setWallets,
    setWalletTransactions,
    setTransfers,
    setBudgets,
    setSavingsGoals,
    setExpenses,
    setPendingExpenses,
    setOfflineReady,
    setProfileData,
    setLatestEnrollment,
    setGuardChecked,
    setNickname,
    setReminderTime,
    setFinancialGoal,
    setLoading,
  });

  const getDashboardPageCache = useCallback(() => dashboardPageCache, []);
  const setDashboardPageCache = useCallback((nextCache) => {
    dashboardPageCache = nextCache;
  }, []);

  const getDashboardPageInFlight = useCallback(() => dashboardPageInFlight, []);
  const setDashboardPageInFlight = useCallback((nextInFlight) => {
    dashboardPageInFlight = nextInFlight;
  }, []);
  const clearDashboardPageInFlight = useCallback((ownerKey) => {
    if (dashboardPageInFlight?.key === ownerKey) dashboardPageInFlight = null;
  }, []);

  useDashboardCacheOwnerSync({
    cacheKey,
    initialCache,
    financeDataLoading,
    hasLoadedDashboardRef,
    hydrateFromCache,
    getDashboardPageCache,
    setDashboardPageCache,
    setGuardChecked,
    setLoading,
  });

  useOnboardingPageLock(showOnboarding);

  const fmt = usePhpCurrencyFormatter();


  const moneyLeftSummaryHandlers = useMoneyLeftSummaryHandlers({ navigate });

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
  }, [user?.id, nickname, reminderTime, financialGoal, onboardingStep]);

  const goToNextOnboardingStep = useCallback(async () => {
    await saveOnboardingDraft();
    setOnboardingStep((prev) => prev + 1);
  }, [saveOnboardingDraft]);

  const loadDashboardData = useDashboardDataLoader({
    userId,
    userEmail,
    user,
    cacheKey,
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
    isPaid,
    dailyRemindersEnabled,
    hasVisibleFinanceData,
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
  });

  const scheduleRefresh = useDashboardScheduledRefresh({
    loadDashboardData,
    refreshFinancialData,
  });

  useDashboardInitialLoad(loadDashboardData);

  useDashboardOnlineStatusNotice({
    setFinanceNotice,
    loadDashboardData,
  });



  useDashboardProfileUpdateListener({
    setProfileData,
    setNickname,
    scheduleRefresh,
  });

  useDashboardFinanceRefreshEvents({
    user,
    scheduleRefresh,
  });


  useDashboardEnrollmentRedirect({
    guardChecked,
    profileData,
    latestEnrollment,
    isPaid,
    navigate,
  });

  const {
    thisMonthSpent,
    thisMonthIncome,
    moneyLeftThisMonth,
  } = useDashboardMoneyLeftMetrics({
    expenses,
    walletTransactions,
  });

  const budgetSummaries = useDashboardBudgetSummaries({
    budgets,
    expenses,
  });

  const {
    monthlyBudgetHeader,
    declaredMonthlyBudgetAmount,
  } = useDashboardMonthlyBudgetHeader({
    budgets,
  });

  const manualExpenseBudgetOptions =
    useDashboardManualExpenseBudgetOptions({
      budgets,
    });

  const {
    selectedManualExpenseBudget,
    selectedBudgetListLabel,
  } = useDashboardSelectedBudgetState({
    financeForm,
    manualExpenseBudgetOptions,
  });

  const setManualExpenseBudgetListKey = useManualExpenseBudgetListKey({
    setFinanceForm,
    setBudgetListOpen,
  });

  const {
    manualExpenseIsUnplanned,
    manualExpenseIsUndocumented,
    manualExpenseReason,
    manualExpenseUndocumentedReason,
    manualExpenseCanSubmit,
  } = useDashboardManualExpenseValidation({
    financeForm,
  });

  const monthlyBudgetPlan = useDashboardMonthlyBudgetPlan({
    manualExpenseBudgetOptions,
    expenses,
    declaredMonthlyBudgetAmount,
  });

  const budgetPlanIsComplete = monthlyBudgetPlan.is_complete === true;
  const budgetAllocatedSoFar = firstValidNumber(monthlyBudgetPlan.allocated_amount, monthlyBudgetPlan.allocated_total);
  const budgetCurrentEditAllocation =
    financeModal.type === "save_budget" && financeModal.payload?.id
      ? getBudgetTotal(financeModal.payload)
      : 0;
  const {
    budgetFormDeclaredAmount,
    budgetProjectedAllocated,
    budgetProjectedUnallocated,
    budgetProjectedOverAllocated,
    budgetCanFinish,
    budgetFinishHelper,
  } = useDashboardBudgetFormProgress({
    financeForm,
    financeModal,
    monthlyBudgetPlan,
    declaredMonthlyBudgetAmount,
  });

  const manualExpenseBudgetListItems =
    useDashboardManualExpenseBudgetListItems({
      manualExpenseBudgetOptions,
      monthlyBudgetPlan,
      fmt,
    });

  const {
    programJourney,
    activeTask,
    nextTask,
    onboardingDone,
    hasPaidProgramAccess,
  } = useDashboardProgramJourneyState({
    tasks,
    submissions,
    plan,
    profileData,
    user,
    latestEnrollment,
    programRecord,
    isPaid,
    isProgramOnboardingCompleted,
  });

  const taskReminder = useTaskReminderPrompt({
    user,
    task: activeTask,
  });

  const canShowTaskReminderPrompt =
    !!user?.id &&
    dailyRemindersEnabled &&
    hasPaidProgramAccess &&
    !!activeTask &&
    dashboardShellReady &&
    !onboardingDone &&
    !showOnboarding;

  const programBubble = getProgramBubbleContent(programJourney, {
    onboardingRequired: hasPaidProgramAccess && !onboardingDone,
  });

  const floatingProgramBubble =
    hasPaidProgramAccess && programBubble && programBubble.kind !== "task_reminder"
      ? programBubble
      : null;

  useEffect(() => {
    if (!floatingProgramBubble || !user?.id) {
      setProgramPromptSeenThisSession(false);
      return;
    }

    const seen = readProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
  }, [floatingProgramBubble, user?.id]);

  useEffect(() => {
    if (!user?.id || !floatingProgramBubble) return;
    if (floatingProgramBubble?.action !== "onboarding") return;

    const completed = hasCompletedProgramOnboarding(profileData);

    if (!completed) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);

      if (dashboardShellReady && !showOnboarding && dailyRemindersEnabled && hasPaidProgramAccess) {
        setShowProgramStart(true);
      }
    }
  }, [
    user?.id,
    floatingProgramBubble,
    profileData,
    showOnboarding,
    dailyRemindersEnabled,
    hasPaidProgramAccess,
    dashboardShellReady,
  ]);

  useEffect(() => {
    if (!dashboardShellReady) {
      setShowProgramStart(false);
      return;
    }

    if (!dailyRemindersEnabled) {
      setShowProgramStart(false);
      return;
    }

    if (!floatingProgramBubble || !user?.id) {
      setShowProgramStart(false);
      return;
    }

    if (!hasPaidProgramAccess) {
      setShowProgramStart(false);
      return;
    }

    if (showOnboarding) {
      setShowProgramStart(false);
      return;
    }

    const completed = hasCompletedProgramOnboarding(profileData);

    if (floatingProgramBubble?.action === "onboarding" && !completed) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);
      setShowProgramStart(true);
      return;
    }

    const seen = readProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
    setShowProgramStart(!seen);
  }, [
    dailyRemindersEnabled,
    floatingProgramBubble,
    hasPaidProgramAccess,
    showOnboarding,
    user?.id,
    profileData,
    dashboardShellReady,
  ]);

  const {
    topWallet,
    walletPreviewTransactions,
    activeBudget,
    derivedActiveBudget,
    totalSavingsTarget,
    totalSavingsSaved,
    primarySavingsGoal,
  } = useDashboardFinanceOverviewState({
    wallets,
    walletTransactions,
    budgets,
    expenses,
    savingsGoals,
  });

  const claraAssistantContext = useDashboardClaraAssistantContext({
    budgetSummaries,
    budgets,
    derivedActiveBudget,
    emergencyFund,
    expenses,
    fmt,
    manualExpenseBudgetOptions,
    moneyLeftThisMonth,
    monthlyBudgetPlan,
    nickname,
    offlineReady,
    pendingExpenses,
    profileData,
    savingsGoals,
    survivalExpense,
    thisMonthIncome,
    thisMonthSpent,
    totalSavingsSaved,
    totalSavingsTarget,
    transfers,
    user,
    walletMoney,
    walletTransactions,
    wallets,
  });

  useDashboardFinanceDiagnostics({
    claraAssistantContext,
    expenses,
    moneyLeftThisMonth,
    thisMonthSpent,
    walletMoney,
    walletTransactions,
    wallets,
  });

  const {
    toggleFinanceDetails,
    toggleExpandedFinanceDetailSection,
  } = useDashboardFinanceCardExpansion({
    activeDashboardPanel,
    expandedFinanceCard,
    setExpandedFinanceCard,
    setExpandedFinanceDetailSections,
    dashboardViewportMode,
    dashboardScrollRef,
    dashboardContentRef,
    dashboardScrollTimersRef,
    setIsDashboardScrollable,
  });

  const {
    showFinanceNotice,
    closeFinanceNotice,
    closeFinanceModal,
    openCreateWalletModal,
    openDeleteWalletModal,
    openAddMoneyModal,
    openTransferMoneyModal,
    openManualExpenseModal,
    getClaraAiOrbButtonFromEvent,
    isClaraAiOrbEvent,
    clearLongPressTimer,
    openClaraAiFromLongPress,
    startClaraAiLongPress,
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
    stopMoneyLeftOrbEvent,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    handleMoneyLeftOrbClick,
    openBudgetModal,
    openDeleteBudgetCategoryModal,
    openResetBudgetModal,
    openSavingsGoalModal,
    openDeleteSavingsGoalModal,
    openAddSavingsModal,
    refreshFinanceSection,
    moveWalletInline,
    createWalletInline,
    deleteWalletInline,
    saveManualExpenseInline,
    addMoneyInline,
    transferMoneyInline,
    syncBudgetRowsIntoState,
    saveBudgetInline,
    handleBudgetModalClose,
    deleteBudgetCategoryInline,
    resetBudgetInline,
    saveSavingsGoalInline,
    deleteSavingsGoalInline,
    addSavingsInline
  } = useDashboardFinanceActionHandlers({
    activeBudget,
    addBudgetData,
    addExpenseData,
    addIncomeData,
    addSavingsGoalData,
    addWalletData,
    budgetExitConfirm,
    budgetPlanIsComplete,
    budgets,
    declaredMonthlyBudgetAmount,
    deleteBudgetData,
    deleteSavingsGoalData,
    deleteWalletData,
    expenses,
    financeActionLoading,
    financeForm,
    financeModal,
    fmt,
    manualExpenseBudgetOptions,
    monthlyBudgetHeader,
    monthlyBudgetPlan,
    navigate,
    refreshFinancialData,
    savingsGoals,
    setBudgetExitConfirm,
    setBudgetListOpen,
    setBudgets,
    setExpandedFinanceCard,
    setFinanceActionLoading,
    setFinanceForm,
    setFinanceModal,
    setFinanceNotice,
    setShowAiAssistant,
    transferBetweenWalletsData,
    updateBudgetData,
    updateSavingsGoalData,
    updateWalletData,
    user,
    wallets,
    cacheKey,
    pendingExpenses,
    walletMoney,
    walletTransactions
  });

  const {
    safeSurvivalExpense,
    moneyLeftHealth,
    expenseHealth,
    dailyStrategyCard,
    moneyLeftTone,
    moneyLeftBadge,
    missionLabel,
    missionTitle,
    missionSub,
    moneyAfterEssentials,
    moneyInsightLabel,
    moneyInsightValue,
    moneyInsightSub,
    standardPromptTitle,
    standardPromptBody,
    standardPromptButton,
    feedHasHighlight,
    unreadMessagesCount,
    taskBadgeLabel,
  } = useDashboardMoneyInsightState({
    activeTask,
    floatingProgramBubble,
    fmt,
    moneySummaryVisible,
    nextTask,
    programJourney,
    survivalExpense,
    thisMonthIncome,
    thisMonthSpent,
    walletMoney,
  });

  const markProgramPromptAsSeen = useCallback(() => {
    if (!user?.id || !floatingProgramBubble) return;
    persistProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(true);
  }, [user?.id, floatingProgramBubble]);

  const startProgramFlow = () => {
    setShowProgramStart(false);

    if (floatingProgramBubble?.action === "onboarding") {
      if (user?.id && floatingProgramBubble) {
        clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      }
      setProgramPromptSeenThisSession(false);
      setShowOnboarding(true);
      setOnboardingStep(Number(profileData?.onboarding_step) || 0);
      return;
    }

    markProgramPromptAsSeen();
    navigate(floatingProgramBubble?.href || "/tasks");
  };

  const closeProgramStart = () => {
    markProgramPromptAsSeen();
    setShowProgramStart(false);
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);

    const completed = hasCompletedProgramOnboarding(profileData);

    if (!completed && floatingProgramBubble?.action === "onboarding") {
      setShowProgramStart(true);
      setProgramPromptSeenThisSession(false);

      if (user?.id && floatingProgramBubble) {
        clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      }
    }
  };

  const finishOnboarding = async () => {
    await saveOnboardingDraft();
    await markOnboardingCompleted();
    setShowOnboarding(false);
    setShowProgramStart(false);

    if (user?.id && floatingProgramBubble) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      persistProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    }

    refreshUser?.();
    navigate("/tasks");
  };

  const openDashboardPanel = useCallback((panelKey) => {
    const targetPanel = DASHBOARD_PANEL_ORDER.includes(panelKey) ? panelKey : "home";
    const currentIndex = DASHBOARD_PANEL_ORDER.indexOf(activeDashboardPanel);
    const nextIndex = DASHBOARD_PANEL_ORDER.indexOf(targetPanel);

    setDashboardPanelDirection(nextIndex >= currentIndex ? "forward" : "backward");
    setActiveDashboardPanel(targetPanel);
  }, [activeDashboardPanel]);

  const closeDashboardPanel = useCallback(() => {
    setDashboardPanelDirection("backward");
    setActiveDashboardPanel("home");
  }, []);

  const resetDashboardThemeToDefault = useCallback(async () => {
    if (typeof setTheme === "function") {
      await setTheme(DEFAULT_THEME_KEY);
    }
  }, [setTheme]);

  const dashboardPanelAnimationClass =
    activeDashboardPanel === "home"
      ? "animate-[claraDashboardPanelReverseIn_320ms_cubic-bezier(.22,1,.36,1)_both]"
      : dashboardPanelDirection === "forward"
        ? "animate-[claraDashboardPanelForwardIn_340ms_cubic-bezier(.22,1,.36,1)_both]"
        : "animate-[claraDashboardPanelReverseIn_340ms_cubic-bezier(.22,1,.36,1)_both]";

  const dashboardPanelViewportClass =
    activeDashboardPanel === "home"
      ? ""
      : activeDashboardPanel === "messages"
        ? "h-[calc(100svh-132px)] max-h-[calc(100svh-132px)] overflow-hidden pr-0.5 pb-0 [padding-bottom:0!important] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        : "max-h-[calc(100svh-132px)] overflow-y-auto overscroll-y-contain touch-pan-y pr-0.5 pb-[calc(env(safe-area-inset-bottom)+14px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  const dashboardSmartScrollClass = "overflow-y-hidden";
  const shouldShowBlockingDashboardLoader = loading && !hasVisibleFinanceData;
  const shouldShowNonBlockingRefresh = Boolean(
    financeDataRefreshing ||
      (financeDataLoading && hasVisibleFinanceData)
  );
  const dashboardSmartContentClass = "";

  const headerQuickActions = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      badge: null,
    },
    {
      key: "feed",
      label: "Feed",
      icon: Home,
      badge: feedHasHighlight
        ? {
            type: "dot",
            value: "",
            className: "border-emerald-400/25 bg-emerald-400 text-emerald-100",
          }
        : null,
    },
    {
      key: "messages",
      label: "Message",
      icon: MessageCircle,
      badge: null,
    },
    {
      key: "settings",
      label: "Setting",
      icon: Settings,
      badge: null,
    },
  ];

  if (!guardChecked && shouldShowBlockingDashboardLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061018] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
          <p className="text-sm text-white/75">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      as="div"
      ref={dashboardScrollRef}
      baseClassName=""
      className={`theme-page-shell relative isolate z-0 w-full max-w-[430px] mx-auto ${dashboardScale.page} overflow-x-hidden ${dashboardSmartScrollClass}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <DashboardEmbeddedStyles />
      <DashboardTopNav
        dashboardScale={dashboardScale}
        headerQuickActions={headerQuickActions}
        activeDashboardPanel={activeDashboardPanel}
        openDashboardPanel={openDashboardPanel}
        themeQuickActionPanelStyle={themeQuickActionPanelStyle}
        themeQuickActionGlowStyle={themeQuickActionGlowStyle}
        themeQuickActionBaseClass={themeQuickActionBaseClass}
        themeQuickActionIconShellClass={themeQuickActionIconShellClass}
        themeSecondaryTextClass={themeSecondaryTextClass}
        themeDividerClass={themeDividerClass}
        themeIsLight={themeIsLight}
      />

      <DashboardContentArea
        ref={dashboardContentRef}
        className={`mx-auto w-full max-w-[430px] ${
          activeDashboardPanel === "messages"
            ? "mt-3 px-[clamp(14px,4vw,18px)] pb-0 [padding-bottom:0!important]"
            : `${dashboardScale.content} ${activeDashboardPanel === "home" ? dashboardSmartContentClass : "[padding-bottom:0!important]"}`
        }`}
      >
        <div
          key={activeDashboardPanel}
          className={`${dashboardPanelAnimationClass} ${dashboardPanelViewportClass}`}
        >
          <DashboardPanelRenderer
            activePanel={activeDashboardPanel}
            renderHome={() => (
              <>
        {isPending && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-secondary/20 p-3">
            <Clock className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-sm">Enrollment Under Review</div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        {dashboardShellReady && (
          <LearningHub />
        )}

        {!!user && (
          <div className={`${dashboardScale.financeWrap} ${dashboardShellReady ? "mt-[clamp(16px,2.6dvh,24px)]" : ""}`}>
            <FinanceInlineAlert notice={financeNotice} onClose={closeFinanceNotice} />
            {shouldShowNonBlockingRefresh ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100/80">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                Refreshing finance data...
              </div>
            ) : null}
            <FinancialCarousel
              dashboardScale={dashboardScale}
              selectedDashboardTheme={selectedDashboardTheme}
              themeInactiveDotClass={themeInactiveDotClass}
              wallets={wallets}
              walletMoney={walletMoney}
              walletPreviewTransactions={walletPreviewTransactions}
              survivalExpense={survivalExpense}
              user={user}
              guardChecked={guardChecked}
              loading={loading}
              profileData={profileData}
              firstPositiveNumber={firstPositiveNumber}
              readStoredSurvivalExpense={readStoredSurvivalExpense}
              monthlyBudgetPlan={monthlyBudgetPlan}
              savingsGoals={savingsGoals}
              totalSavingsSaved={totalSavingsSaved}
              totalSavingsTarget={totalSavingsTarget}
              primarySavingsGoal={primarySavingsGoal}
              expandedFinanceCard={expandedFinanceCard}
              toggleFinanceDetails={toggleFinanceDetails}
              financeActionLoading={financeActionLoading}
              onQuickExpense={openManualExpenseModal}
              onSurvivalSaved={async (val) => {
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
                dashboardPageCache = {
                  ...dashboardPageCache,
                  survivalExpense: nextValue,
                  profileData: nextProfileData,
                };

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
              }}
              onSaveBudget={() => {
                window.requestAnimationFrame(() => openBudgetModal());
              }}
              onEditBudgetCategory={(item) => {
                window.requestAnimationFrame(() => openBudgetModal(item));
              }}
              onDeleteBudgetCategory={(item) => {
                window.requestAnimationFrame(() => openDeleteBudgetCategoryModal(item));
              }}
              onResetBudget={() => {
                window.requestAnimationFrame(() => openResetBudgetModal());
              }}
              onCreateWallet={() => {
                window.requestAnimationFrame(() => openCreateWalletModal());
              }}
              onMoveWallet={moveWalletInline}
              onDeleteWallet={(walletId) => {
                window.requestAnimationFrame(() => openDeleteWalletModal(walletId));
              }}
              onAddMoney={(wallet) => {
                window.requestAnimationFrame(() => openAddMoneyModal(wallet));
              }}
              onTransferMoney={(wallet) => {
                window.requestAnimationFrame(() => openTransferMoneyModal(wallet));
              }}
              onSaveSavingsGoal={(goal) => {
                window.requestAnimationFrame(() => openSavingsGoalModal(goal));
              }}
              onDeleteSavingsGoal={(goalId) => {
                window.requestAnimationFrame(() => openDeleteSavingsGoalModal(goalId));
              }}
              onAddSavings={(goal) => {
                window.requestAnimationFrame(() => openAddSavingsModal(goal));
              }}
              startClaraAiLongPress={startClaraAiLongPress}
              endClaraAiLongPress={endClaraAiLongPress}
              handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}
            />
          </div>
        )}

        <DashboardMoneySummary
          dashboardScale={dashboardScale}
          selectedDashboardTheme={selectedDashboardTheme}
          themeIsLight={themeIsLight}
          themeSoftTextClass={themeSoftTextClass}
          themePrimaryTextClass={themePrimaryTextClass}
          moneySummaryVisible={moneySummaryVisible}
          toggleMoneySummaryVisibility={toggleMoneySummaryVisibility}
          moneyLeftSummaryHandlers={moneyLeftSummaryHandlers}
          handleMoneyLeftOrbClick={handleMoneyLeftOrbClick}
          startMoneyLeftOrbLongPress={startMoneyLeftOrbLongPress}
          endMoneyLeftOrbLongPress={endMoneyLeftOrbLongPress}
          stopMoneyLeftOrbEvent={stopMoneyLeftOrbEvent}
          walletMoney={walletMoney}
          thisMonthSpent={thisMonthSpent}
          fmt={fmt}
        />

        

              </>
            )}
            renderFeed={() => <DashboardFeedPanel onBack={closeDashboardPanel} />}
            renderMessages={() => <DashboardMessagesPanel onBack={closeDashboardPanel} />}
            renderSettings={() => (
              <DashboardSettingsPanel
                onBack={closeDashboardPanel}
                user={user}
                plan={plan}
                isPaid={isPaid}
                isFree={isFree}
                isAdmin={isAdmin}
                notificationSettings={notificationSettings}
                openThemePicker={openThemePicker}
                resetThemeToDefault={resetDashboardThemeToDefault}
                onOpenMessages={() => openDashboardPanel("messages")}
              />
            )}
          />
        </div>
      </DashboardContentArea>

      <DashboardModalLayer>
        <DashboardFinanceExpandedSheet
        activeDashboardPanel={activeDashboardPanel}
        expandedFinanceCard={expandedFinanceCard}
        setExpandedFinanceCard={setExpandedFinanceCard}
        walletMoney={walletMoney}
        survivalExpense={survivalExpense}
        selectedDashboardTheme={selectedDashboardTheme}
        expandedFinanceDetailSections={expandedFinanceDetailSections}
        toggleExpandedFinanceDetailSection={toggleExpandedFinanceDetailSection}
        profileData={profileData}
        firstPositiveNumber={firstPositiveNumber}
        readStoredSurvivalExpense={readStoredSurvivalExpense}
        user={user}
        onSurvivalSaved={async (val) => {
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
          dashboardPageCache = {
            ...dashboardPageCache,
            survivalExpense: nextValue,
            profileData: nextProfileData,
          };

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
        }}
        wallets={wallets}
        walletPreviewTransactions={walletPreviewTransactions}
        financeActionLoading={financeActionLoading}
        openCreateWalletModal={openCreateWalletModal}
        moveWalletInline={moveWalletInline}
        openDeleteWalletModal={openDeleteWalletModal}
        openAddMoneyModal={openAddMoneyModal}
        openTransferMoneyModal={openTransferMoneyModal}
        monthlyBudgetPlan={monthlyBudgetPlan}
        openBudgetModal={openBudgetModal}
        openDeleteBudgetCategoryModal={openDeleteBudgetCategoryModal}
        openResetBudgetModal={openResetBudgetModal}
        savingsGoals={savingsGoals}
        totalSavingsSaved={totalSavingsSaved}
        totalSavingsTarget={totalSavingsTarget}
        primarySavingsGoal={primarySavingsGoal}
        openSavingsGoalModal={openSavingsGoalModal}
        openDeleteSavingsGoalModal={openDeleteSavingsGoalModal}
        openAddSavingsModal={openAddSavingsModal}
      />


      {showOnboarding && (
        <div
          className="fixed inset-0 z-[99999] bg-[#020817]/88 backdrop-blur-xl"
          onClick={closeOnboarding}
        >
          <div className="flex h-[100dvh] w-full items-end justify-center sm:items-center">
            <div
              className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#08111f_0%,#071120_38%,#061018_100%)] text-white sm:h-[94vh] sm:max-h-[920px] sm:w-[min(100%,860px)] sm:rounded-[32px] sm:border sm:border-white/15 sm:shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative z-10 border-b border-white/15 bg-black/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
                      <span>CLARA Program Onboarding</span>
                    </div>

                    <h2 className="mt-3 text-[1.35rem] font-bold leading-tight md:text-[1.65rem]">
                      {onboardingStep === 0 && "Commitment Agreement"}
                      {onboardingStep === 1 && "Rules & Expectations"}
                      {onboardingStep === 2 && "Initial Setup"}
                      {onboardingStep === 3 && "Coaching & Support"}
                      {onboardingStep === 4 && "Dashboard Introduction"}
                      {onboardingStep === 5 && "How CLARA Helps You Daily"}
                      {onboardingStep === 6 && "Start Day 1"}
                    </h2>

                    <p className="mt-1 text-sm text-white/60">
                      Step {onboardingStep + 1} of 7
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeOnboarding}
                    className="shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-2.5 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-500 transition-all duration-300"
                      style={{ width: `${((onboardingStep + 1) / 7) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
                <div className="mx-auto w-full max-w-3xl">
                  {onboardingStep === 0 && (
                    <div className="space-y-5">
                      <div className="overflow-hidden rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/14 to-green-600/8 p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-500/18 text-emerald-300 shadow-[0_12px_30px_rgba(16,185,129,0.15)]">
                            <CheckCircle2 className="h-7 w-7" />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold leading-tight">
                              Welcome to your 30-day transformation
                            </h3>
                            <p className="mt-2 text-sm leading-7 text-white/75">
                              CLARA is not just a tracker. This is a guided behavior-change
                              program built around structure, consistency, accountability,
                              and action.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5 md:p-6">
                        <p className="text-sm leading-7 text-white/80">
                          By continuing, you acknowledge that you are entering a guided
                          financial coaching experience and you are expected to complete
                          your tasks honestly and consistently.
                        </p>

                        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-3xl border border-white/15 bg-[#091423] px-4 py-4 transition hover:border-emerald-400/25 hover:bg-[#0c1829]">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-emerald-500"
                            checked={commitmentChecked}
                            onChange={(e) => setCommitmentChecked(e.target.checked)}
                          />
                          <span className="text-sm leading-6 text-white/82">
                            I commit to completing the CLARA program, following the daily
                            process, and taking responsibility for my progress.
                          </span>
                        </label>
                      </div>

                      <OnboardingActionBar
                        onNext={goToNextOnboardingStep}
                        nextDisabled={!commitmentChecked || savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-white">What CLARA expects</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Complete tasks in sequence</li>
                            <li>• Show honesty in your submissions</li>
                            <li>• Treat progress as discipline, not mood</li>
                          </ul>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                            <CalendarDays className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-white">How the flow works</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• You unlock structure one day at a time</li>
                            <li>• Modules and tasks support each other</li>
                            <li>• Your dashboard is your daily control center</li>
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                        <p className="text-sm font-semibold text-white">Your commitment matters</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          This program works best when you stop waiting for the perfect mood
                          and start moving with structure. Your consistency is the strategy.
                        </p>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(0)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="I Understand"
                      />
                    </div>
                  )}

                  {onboardingStep === 2 && (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5 md:p-6">
                        <p className="text-sm font-semibold text-white">
                          Complete your initial setup
                        </p>
                        <p className="mt-1 text-sm text-white/65">
                          This helps personalize your coaching journey from Day 1.
                        </p>

                        <div className="mt-5 grid gap-4">
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                              Name or Nickname
                            </label>
                            <input
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value)}
                              placeholder="What should CLARA call you?"
                              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                              Preferred Reminder Time
                            </label>
                            <input
                              type="time"
                              value={reminderTime}
                              onChange={(e) => setReminderTime(e.target.value)}
                              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                              Main Financial Goal
                            </label>
                            <textarea
                              value={financialGoal}
                              onChange={(e) => setFinancialGoal(e.target.value)}
                              placeholder="Example: Build emergency fund, stop impulsive spending, save my first ₱50,000."
                              className="min-h-[110px] w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                            />
                          </div>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(1)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Save & Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 3 && (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-emerald-400/15 bg-emerald-500/10 p-5">
                        <p className="text-sm font-semibold text-white">Your support system</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          If your tier includes coaching, book your first session within
                          Day 1 to Day 3. That first session acts as your onboarding
                          alignment and sets the tone for the rest of the program.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">What happens next</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Access your first weekly module</li>
                            <li>• Start completing daily tasks in order</li>
                            <li>• Track money using your dashboard tools</li>
                          </ul>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Coaching users</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Book your session early</li>
                            <li>• Bring your honest money habits</li>
                            <li>• Use the session for clarity and accountability</li>
                          </ul>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(2)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 4 && (
                    <div className="space-y-4">
                      <div className="grid gap-3">
                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Dashboard</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            This is your main control center for progress, money tracking,
                            and daily action.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Day Mission</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            Your next task is always visible so you know exactly what to do next.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Finance carousel</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            Use wallets, expenses, budgets, and savings goals to support real
                            progress without losing momentum.
                          </p>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(3)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 5 && (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-yellow-300">
                          <Flag className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-white">How CLARA helps daily</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          Your dashboard keeps your priorities visible. Your tasks give you the
                          next step. Your tools give you the structure to stop drifting and
                          start building momentum.
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                        <p className="text-sm font-semibold text-white">What to remember</p>
                        <ul className="mt-3 space-y-2 text-sm text-white/70">
                          <li>• Progress comes from repetition</li>
                          <li>• Structure protects you from inconsistency</li>
                          <li>• Small daily action compounds</li>
                        </ul>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(4)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 6 && (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/16 to-cyan-500/10 p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-emerald-300">
                            <Rocket className="h-7 w-7" />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold leading-tight">You are ready to start</h3>
                            <p className="mt-2 text-sm leading-7 text-white/75">
                              Your setup is complete. Head into Day 1 and begin your guided
                              reset with clarity and structure.
                            </p>
                          </div>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(5)}
                        onNext={finishOnboarding}
                        nextDisabled={savingOnboarding}
                        nextLabel={savingOnboarding ? "Saving..." : "Start Day 1"}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <DashboardFinanceModalRenderer
        financeModal={financeModal}
        closeFinanceModal={closeFinanceModal}
        createWalletInline={createWalletInline}
        financeActionLoading={financeActionLoading}
        financeForm={financeForm}
        setFinanceForm={setFinanceForm}
        deleteWalletInline={deleteWalletInline}
        addMoneyInline={addMoneyInline}
        fmt={fmt}
        transferMoneyInline={transferMoneyInline}
        wallets={wallets}
        saveManualExpenseInline={saveManualExpenseInline}
        manualExpenseCanSubmit={manualExpenseCanSubmit}
        manualExpenseBudgetListItems={manualExpenseBudgetListItems}
        showFinanceNotice={showFinanceNotice}
        setManualExpenseBudgetListKey={setManualExpenseBudgetListKey}
        manualExpenseIsUnplanned={manualExpenseIsUnplanned}
        manualExpenseIsUndocumented={manualExpenseIsUndocumented}
        selectedManualExpenseBudget={selectedManualExpenseBudget}
        handleBudgetModalClose={handleBudgetModalClose}
        monthlyBudgetPlan={monthlyBudgetPlan}
        budgetExitConfirm={budgetExitConfirm}
        saveBudgetInline={saveBudgetInline}
        setBudgetExitConfirm={setBudgetExitConfirm}
        budgetFormDeclaredAmount={budgetFormDeclaredAmount}
        budgetProjectedAllocated={budgetProjectedAllocated}
        budgetProjectedUnallocated={budgetProjectedUnallocated}
        budgetFinishHelper={budgetFinishHelper}
        openBudgetModal={openBudgetModal}
        openDeleteBudgetCategoryModal={openDeleteBudgetCategoryModal}
        budgetCanFinish={budgetCanFinish}
        deleteBudgetCategoryInline={deleteBudgetCategoryInline}
        resetBudgetInline={resetBudgetInline}
        saveSavingsGoalInline={saveSavingsGoalInline}
        deleteSavingsGoalInline={deleteSavingsGoalInline}
        addSavingsInline={addSavingsInline}
        dashboardShellReady={dashboardShellReady}
        showAiAssistant={showAiAssistant}
        setShowAiAssistant={setShowAiAssistant}
        claraAssistantContext={claraAssistantContext}
      />

      </DashboardModalLayer>
    </DashboardShell>
  );
}
