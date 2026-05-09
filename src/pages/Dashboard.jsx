import {
  useState,
  useEffect,
  useMemo,
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
  Flag,
  Bell,
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
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import DashboardFinanceExpandedSheet from "@/components/fresh/main-dashboard/financial-cards/DashboardFinanceExpandedSheet";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardMoneySummary from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummary";
import useMoneySummaryVisibility from "@/components/fresh/main-dashboard/money-summary/useMoneySummaryVisibility";
import useMoneyLeftSummaryHandlers from "@/components/fresh/main-dashboard/money-summary/useMoneyLeftSummaryHandlers";
import useDashboardMoneyLeftMetrics from "@/components/fresh/main-dashboard/money-summary/useDashboardMoneyLeftMetrics";
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
import DashboardProgramOnboardingModal from "@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal";
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
  normalizeLower,
  PH_TIME_ZONE,
  PH_OFFSET_MINUTES,
  DEBUG_FINANCE_DIAGNOSTICS,
  FINANCE_CATEGORIES,
  INCOME_TRANSACTION_TYPES,
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
  getPHParts,
  getPHDateKey,
  getPHMonthKey,
  phLocalPartsToUtcDate,
  getPHMonthRange,
  getPHWeekStartKey,
  isInPHRange,
  sortByNewestDate,
  getWalletDisplayName,
  getWalletDisplayBalance,
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
  getTransactionDate,
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

  useEffect(() => {
    if (!DEBUG_FINANCE_DIAGNOSTICS) return;

    const toFinanceNumber = (value) => {
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      const cleaned = String(value ?? "").replace(/[₱,\s]/g, "");
      const number = Number(cleaned);
      return Number.isFinite(number) ? number : 0;
    };

    const getSignedLedgerAmount = (transaction) => {
      const type = normalizeLower(
        transaction?.type || transaction?.transaction_type || transaction?.kind
      );
      const amount = toFinanceNumber(transaction?.amount);

      if (
        [
          "expense",
          "transfer_out",
          "savings_goal",
          "savings_transfer",
          "reset",
          "debit",
          "withdrawal",
        ].includes(type)
      ) {
        return -amount;
      }

      if (
        [
          "income",
          "add",
          "cash_in",
          "deposit",
          "transfer_in",
          "opening_balance",
          "credit",
        ].includes(type)
      ) {
        return amount;
      }

      return 0;
    };

    const isExpenseType = (transaction) =>
      normalizeLower(transaction?.type || transaction?.transaction_type || transaction?.kind) ===
      "expense";

    const currentMonthKey = getPHMonthKey();
    const normalizedWalletBalanceSum = wallets.reduce(
      (sum, wallet) => sum + toFinanceNumber(getWalletDisplayBalance(wallet)),
      0
    );
    const walletLedgerNetTotal = walletTransactions.reduce(
      (sum, transaction) => sum + getSignedLedgerAmount(transaction),
      0
    );
    const expenseTableMonthlyRows = expenses.filter((expense) => {
      const expenseDate = getTransactionDate(expense);
      return expenseDate && getPHMonthKey(expenseDate) === currentMonthKey;
    });
    const expenseTableMonthlySum = expenseTableMonthlyRows.reduce(
      (sum, expense) => sum + toFinanceNumber(expense?.amount),
      0
    );
    const walletTransactionExpenseMonthlyRows = walletTransactions.filter((transaction) => {
      const transactionDate = getTransactionDate(transaction);
      return (
        isExpenseType(transaction) &&
        transactionDate &&
        getPHMonthKey(transactionDate) === currentMonthKey
      );
    });
    const walletTransactionExpenseMonthlySum = walletTransactionExpenseMonthlyRows.reduce(
      (sum, transaction) => sum + toFinanceNumber(transaction?.amount),
      0
    );
    const tolerance = 0.01;
    const differs = (a, b) => Math.abs(toFinanceNumber(a) - toFinanceNumber(b)) > tolerance;

    const walletSummaries = Array.isArray(claraAssistantContext?.wallets)
      ? claraAssistantContext.wallets.map((wallet) => ({
          id: wallet?.id,
          name: wallet?.name,
          balance: wallet?.balance,
        }))
      : [];

    const diagnostics = {
      walletTotals: {
        dashboardWalletMoney: toFinanceNumber(walletMoney),
        dashboardTotalMoneyLeft: toFinanceNumber(claraAssistantContext?.totalMoneyLeft),
        normalizedWalletBalanceSum,
        walletLedgerNetTotal,
        walletsLoaded: wallets.length,
      },
      monthlySpending: {
        dashboardThisMonthSpent: toFinanceNumber(thisMonthSpent),
        expenseTableMonthlySum,
        walletTransactionExpenseMonthlySum,
        expenseRowsThisMonth: expenseTableMonthlyRows.length,
        walletTransactionExpenseRowsThisMonth: walletTransactionExpenseMonthlyRows.length,
      },
      claraContext: {
        totalAvailableMoney: toFinanceNumber(claraAssistantContext?.totalMoneyLeft),
        monthlySpent: toFinanceNumber(claraAssistantContext?.totalExpensesThisMonth),
        walletCount: walletSummaries.length,
        walletSummaries,
        cashFlowRemaining: toFinanceNumber(moneyLeftThisMonth),
      },
      mismatchFlags: {
        walletMoneyDiffersFromWalletBalanceSum: differs(walletMoney, normalizedWalletBalanceSum),
        dashboardMonthlySpentDiffersFromExpenseTableMonthlySum: differs(
          thisMonthSpent,
          expenseTableMonthlySum
        ),
        walletTransactionExpenseTotalDiffersFromExpensesTableTotal: differs(
          walletTransactionExpenseMonthlySum,
          expenseTableMonthlySum
        ),
      },
    };

    console.groupCollapsed("CLARA Finance Diagnostics");
    console.table([diagnostics.walletTotals]);
    console.table([diagnostics.monthlySpending]);
    console.log("CLARA context:", diagnostics.claraContext);
    console.table([diagnostics.mismatchFlags]);

    Object.entries(diagnostics.mismatchFlags).forEach(([key, value]) => {
      if (value) {
        console.warn(`CLARA Finance Diagnostics mismatch: ${key}`, diagnostics);
      }
    });

    console.groupEnd();
  }, [
    claraAssistantContext,
    expenses,
    moneyLeftThisMonth,
    thisMonthSpent,
    walletMoney,
    walletTransactions,
    wallets,
  ]);


  const clearDashboardScrollTimers = useCallback(() => {
    dashboardScrollTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    dashboardScrollTimersRef.current = [];
  }, []);

  const measureDashboardScrollability = useCallback(() => {
    if (activeDashboardPanel !== "home" || !expandedFinanceCard) {
      setIsDashboardScrollable(false);
      return false;
    }

    const scrollNode = dashboardScrollRef.current;
    const contentNode = dashboardContentRef.current;
    if (!scrollNode || !contentNode || typeof window === "undefined") {
      setIsDashboardScrollable(false);
      return false;
    }

    const viewportHeight = Math.max(window.innerHeight || 0, scrollNode.clientHeight || 0);
    const contentHeight = Math.max(
      scrollNode.scrollHeight || 0,
      contentNode.scrollHeight || 0,
      contentNode.getBoundingClientRect?.().height || 0
    );
    const shouldScroll = contentHeight > viewportHeight + 8;

    setIsDashboardScrollable(shouldScroll);
    return shouldScroll;
  }, [activeDashboardPanel, expandedFinanceCard]);

  const scheduleDashboardScrollMeasure = useCallback(() => {
    if (typeof window === "undefined") return;

    clearDashboardScrollTimers();
    window.requestAnimationFrame(() => {
      measureDashboardScrollability();
    });

    [120, 280, 380].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        measureDashboardScrollability();
      }, delay);
      dashboardScrollTimersRef.current.push(timerId);
    });
  }, [clearDashboardScrollTimers, measureDashboardScrollability]);

  const toggleFinanceDetails = useCallback((cardKey, options = {}) => {
    const { autoExpand = false, forceOpen = false } = options || {};

    setExpandedFinanceCard((prev) => {
      const next = forceOpen ? cardKey : prev === cardKey ? null : cardKey;

      if (next && autoExpand) {
        setExpandedFinanceDetailSections((current) => ({
          ...current,
          [next]: true,
        }));
      }

      if (!next) {
        setIsDashboardScrollable(false);
        window.requestAnimationFrame(() => {
          dashboardScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
        });
      }

      return next;
    });
  }, []);

  const toggleExpandedFinanceDetailSection = useCallback((cardKey) => {
    setExpandedFinanceDetailSections((current) => ({
      ...current,
      [cardKey]: current?.[cardKey] === false ? true : false,
    }));
  }, []);

  useEffect(() => {
    scheduleDashboardScrollMeasure();

    if (!expandedFinanceCard) {
      setIsDashboardScrollable(false);
      dashboardScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    }

    return clearDashboardScrollTimers;
  }, [
    activeDashboardPanel,
    expandedFinanceCard,
    dashboardViewportMode,
    scheduleDashboardScrollMeasure,
    clearDashboardScrollTimers,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      scheduleDashboardScrollMeasure();
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [scheduleDashboardScrollMeasure]);

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

  const safeSurvivalExpense = Number(survivalExpense) || 0;

  const daysLeftInPHMonth = useMemo(() => {
    const parts = getPHParts(new Date());
    if (!parts) return 1;

    const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
    return Math.max(lastDay - parts.day + 1, 1);
  }, []);

  const moneyLeftHealth = useMemo(() => {
    const income = Math.max(Number(thisMonthIncome) || 0, 0);
    const spent = Math.max(Number(thisMonthSpent) || 0, 0);
    const balance = Math.max(Number(walletMoney) || 0, 0);
    const survival = Math.max(Number(safeSurvivalExpense) || 0, 0);

    if (income > 0) {
      const remainingFromIncome = income - spent;
      const safeDailyFromIncome = Math.max(remainingFromIncome, 0) / daysLeftInPHMonth;
      const ratio = spent / income;

      if (remainingFromIncome <= 0 || ratio > 1) {
        return {
          title: "Pause extra spending",
          highlight: "",
          subcopy: "Your spending already passed this month’s income.",
        };
      }

      if (ratio >= 0.9) {
        return {
          title: "Protect your cash",
          highlight: `${fmt(remainingFromIncome)} left.`,
          subcopy: "You’re near your monthly limit.",
        };
      }

      if (ratio >= 0.7) {
        return {
          title: "Spend carefully",
          highlight: `${fmt(safeDailyFromIncome)} today.`,
          subcopy: "Keep your spending pace under control.",
        };
      }

      return {
        title: "You can safely spend",
        highlight: `${fmt(safeDailyFromIncome)} today.`,
        subcopy: "Stay on track and reach your goals.",
      };
    }

    if (survival > 0) {
      const moneyAfterEssentials = balance - survival;
      const safeDailyFromSurvival = Math.max(moneyAfterEssentials, 0) / daysLeftInPHMonth;

      if (balance >= survival) {
        return {
          title: "You can safely spend",
          highlight: `${fmt(safeDailyFromSurvival)} today.`,
          subcopy: "Stay on track and reach your goals.",
        };
      }

      if (balance > survival * 0.5) {
        return {
          title: "Spend carefully today",
          highlight: "",
          subcopy: "Limit non-essentials and protect your basics.",
        };
      }

      return {
        title: "Pause extra spending today",
        highlight: "",
        subcopy: "Focus on essentials until you add more funds.",
      };
    }

    if (balance > 0) {
      return {
        title: "Cash available",
        highlight: fmt(balance),
        subcopy: "Add income or essentials for a smarter daily limit.",
      };
    }

    return {
      title: "No balance yet",
      highlight: "",
      subcopy: "Add money to start tracking your spending power.",
    };
  }, [daysLeftInPHMonth, safeSurvivalExpense, thisMonthIncome, thisMonthSpent, walletMoney]);

  const expenseHealth = useMemo(() => {
    if (thisMonthSpent <= 0) {
      return {
        title: "No spending yet",
        highlight: "",
        subcopy: "Your recorded spending for this month will appear here.",
      };
    }

    if (thisMonthIncome <= 0) {
      return {
        title: "Spending tracked",
        highlight: "",
        subcopy: `Income not recorded yet. Spent ${moneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"} this month.`,
      };
    }

    const ratio = thisMonthSpent / thisMonthIncome;

    if (ratio <= 0.7) {
      return {
        title: "You’re",
        highlight: "within budget 🎉",
        subcopy: "Great job managing your spending.",
      };
    }

    if (ratio <= 0.9) {
      return {
        title: "You’re",
        highlight: "still okay",
        subcopy: "Keep watching your spending pace.",
      };
    }

    if (ratio <= 1) {
      return {
        title: "You’re",
        highlight: "near your limit",
        subcopy: "Slow down before you exceed your income.",
      };
    }

    return {
      title: "You’re",
      highlight: "over budget",
      subcopy: "Pause extras and review your expenses today.",
    };
  }, [thisMonthIncome, thisMonthSpent]);

  const dailyStrategyCard = useMemo(() => {
    const safeSpendText = moneyLeftHealth?.highlight ||
      (walletMoney > 0 ? `${moneySummaryVisible ? fmt(walletMoney) : "₱••••••"} available.` : "Set up your wallet first.");

    const income = Math.max(Number(thisMonthIncome) || 0, 0);
    const spent = Math.max(Number(thisMonthSpent) || 0, 0);
    const balance = Math.max(Number(walletMoney) || 0, 0);
    const survival = Math.max(Number(safeSurvivalExpense) || 0, 0);
    const remainingIncome = Math.max(income - spent, 0);
    const recommendedWantLimit = Math.max(Math.min(remainingIncome * 0.15, balance * 0.08), 0);

    if (moneyLeftHealth?.title?.toLowerCase?.().includes("pause")) {
      return {
        safeAmount: safeSpendText,
        action: "Delay wants and protect essentials today.",
        backNote: "When money feels tight, CLARA’s safest move is to pause extras first.",
      };
    }

    if (moneyLeftHealth?.title?.toLowerCase?.().includes("carefully")) {
      return {
        safeAmount: safeSpendText,
        action: "Limit non-essentials and review before buying.",
        backNote: "Small pauses prevent emotional spending from becoming a pattern.",
      };
    }

    if (recommendedWantLimit > 0) {
      return {
        safeAmount: safeSpendText,
        action: `Keep wants under ${fmt(recommendedWantLimit)} today.`,
        backNote: "Before buying, ask: is this planned, needed, or emotional?",
      };
    }

    if (survival > 0 && balance >= survival) {
      return {
        safeAmount: safeSpendText,
        action: "Spend lightly and keep your emergency fund protected.",
        backNote: "Your future stability depends on what you protect today.",
      };
    }

    return {
      safeAmount: safeSpendText,
      action: "Log income and essentials to unlock smarter guidance.",
      backNote: "The more accurate your records are, the smarter CLARA’s advice becomes.",
    };
  }, [moneyLeftHealth, safeSurvivalExpense, thisMonthIncome, thisMonthSpent, walletMoney]);

  const moneyLeftTone =
    safeSurvivalExpense <= 0
      ? "from-cyan-500/20 to-emerald-500/20 border-cyan-400/20"
      : walletMoney >= safeSurvivalExpense
        ? "from-emerald-500/20 to-teal-500/20 border-emerald-400/20"
        : walletMoney > safeSurvivalExpense * 0.5
          ? "from-yellow-500/20 to-amber-500/20 border-yellow-400/20"
          : "from-rose-500/20 to-red-500/20 border-rose-400/20";

  const moneyLeftBadge =
    safeSurvivalExpense <= 0
      ? "Smart Guide"
      : walletMoney >= safeSurvivalExpense
        ? "Safe"
        : walletMoney > safeSurvivalExpense * 0.5
          ? "Watch"
          : "Alert";

  const missionLabel = activeTask
    ? `Week ${activeTask.week} • Day ${activeTask.day}`
    : programJourney.state === "starter_complete"
      ? "Starter path complete"
      : "Program overview";

  const missionTitle = activeTask?.title || "Your guided journey is ready";

  const missionSub = activeTask
    ? "Start your reset journey."
    : programJourney.state === "starter_complete"
      ? "Continue your 30-day reset when you're ready."
      : `${programJourney.accessibleCompletedCount} of ${
          programJourney.accessibleTaskCount || programJourney.totalCount
        } unlocked days complete`;

  const moneyAfterEssentials = walletMoney - safeSurvivalExpense;

  const moneyInsightLabel =
    safeSurvivalExpense <= 0
      ? "Smart setup"
      : moneyAfterEssentials >= 0
        ? "After essentials"
        : "Essential gap";

  const moneyInsightValue =
    safeSurvivalExpense <= 0 ? "Add baseline" : fmt(Math.abs(moneyAfterEssentials));

  const moneyInsightSub =
    safeSurvivalExpense <= 0
      ? "Set one monthly number to unlock runway insights."
      : moneyAfterEssentials >= 0
        ? "What stays available after your minimum monthly need."
        : "What your wallets still need to fully cover essentials.";

  const standardPromptTitle =
    floatingProgramBubble?.kind === "onboarding" ? "Complete your setup" : "Today's task";

  const standardPromptBody =
    floatingProgramBubble?.kind === "onboarding"
      ? "Finish your CLARA setup to unlock your guided program properly."
      : "Open your next step and keep your progress moving.";

  const standardPromptButton =
    floatingProgramBubble?.kind === "onboarding" ? "Continue" : "Open task";

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

  const feedHasHighlight = programJourney.accessibleCompletedCount > 0;
  const unreadMessagesCount = 0;
  const taskBadgeLabel = activeTask
    ? `Day ${activeTask.day}`
    : nextTask
      ? `Next ${nextTask.day}`
      : "";

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


      <DashboardProgramOnboardingModal
          showOnboarding={showOnboarding}
          closeOnboarding={closeOnboarding}
          onboardingStep={onboardingStep}
          setOnboardingStep={setOnboardingStep}
          commitmentChecked={commitmentChecked}
          setCommitmentChecked={setCommitmentChecked}
          savingOnboarding={savingOnboarding}
          goToNextOnboardingStep={goToNextOnboardingStep}
          nickname={nickname}
          setNickname={setNickname}
          reminderTime={reminderTime}
          setReminderTime={setReminderTime}
          financialGoal={financialGoal}
          setFinancialGoal={setFinancialGoal}
          finishOnboarding={finishOnboarding}
        />


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
