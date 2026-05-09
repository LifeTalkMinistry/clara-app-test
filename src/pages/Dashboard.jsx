import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Home, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import DashboardFeedPanel from "@/components/fresh/dashboard-panels/feed/DashboardFeedPanel";
import DashboardMessagesPanel from "@/components/fresh/main-dashboard/dashboard-panels/messages/DashboardMessagesPanel";
import DashboardSettingsPanel from "@/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel";
import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";
import DashboardShell from "@/components/fresh/main-dashboard/shell/DashboardShell";
import DashboardEmbeddedStyles from "@/components/fresh/main-dashboard/shell/DashboardEmbeddedStyles";
import DashboardContentArea from "@/components/fresh/main-dashboard/shell/DashboardContentArea";
import DashboardPanelRenderer from "@/components/fresh/main-dashboard/shell/DashboardPanelRenderer";
import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";
import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import DashboardHomePanel from "@/components/fresh/main-dashboard/shell/DashboardHomePanel";
import DashboardFinanceExpandedSheetLayer from "@/components/fresh/main-dashboard/shell/DashboardFinanceExpandedSheetLayer";
import useDashboardShellReady from "@/components/fresh/main-dashboard/shell/useDashboardShellReady";
import useDashboardPanelNavigation from "@/components/fresh/main-dashboard/shell/useDashboardPanelNavigation";
import useDashboardScrollState from "@/components/fresh/main-dashboard/shell/useDashboardScrollState";
import useDashboardInteractionState from "@/components/fresh/main-dashboard/shell/useDashboardInteractionState";
import DashboardProgramOnboardingModal from "@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal";
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
import { DASHBOARD_SCALE, useDashboardViewportMode } from "@/components/fresh/main-dashboard/dashboard-scale/dashboardScale";
import { persistDashboardPrefs } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
import useDashboardNotificationSettings from "@/components/fresh/main-dashboard/dashboard-settings/useDashboardNotificationSettings";
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
import useDashboardVisibleFinanceData from "@/components/fresh/main-dashboard/finance-content/useDashboardVisibleFinanceData";
import useDashboardFinanceStateSync from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync";
import useDashboardFinanceOverviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceOverviewState";
import useDashboardClaraAssistantContext from "@/components/fresh/main-dashboard/assistant/useDashboardClaraAssistantContext";
import useDashboardFinanceActionHandlers from "@/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers";
import useDashboardFinanceDiagnostics from "@/components/fresh/main-dashboard/finance-diagnostics/useDashboardFinanceDiagnostics";
import useDashboardFinanceCardExpansion from "@/components/fresh/main-dashboard/financial-cards/useDashboardFinanceCardExpansion";
import { readStoredSurvivalExpense, persistStoredSurvivalExpense } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import useDashboardThemeClasses from "@/components/fresh/main-dashboard/dashboard-theme/useDashboardThemeClasses";
import useDashboardThemePersistence from "@/components/fresh/main-dashboard/dashboard-theme/useDashboardThemePersistence";
import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";
import useDashboardHydrateFromCache from "@/components/fresh/main-dashboard/dashboard-cache/useDashboardHydrateFromCache";
import useDashboardCacheOwnerSync from "@/components/fresh/main-dashboard/dashboard-cache/useDashboardCacheOwnerSync";
import useDashboardDataLoader from "@/components/fresh/main-dashboard/dashboard-cache/useDashboardDataLoader";
import useDashboardDataState from "@/components/fresh/main-dashboard/dashboard-state/useDashboardDataState";
import { DASHBOARD_PANEL_ORDER } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";
import useDashboardProgramPromptFlow from "@/components/fresh/main-dashboard/program-prompts/useDashboardProgramPromptFlow";
import useUserRole from "../hooks/useUserRole";
import useTaskReminderPrompt from "@/hooks/useTaskReminderPrompt";
import useFinancialData from "../hooks/useFinancialData";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import { useTheme } from "@/theme/ThemeProvider";
import { DEFAULT_THEME_KEY } from "@/theme/themes";
import { normalizeString, firstValidNumber, firstPositiveNumber, getBudgetTotal } from "@/utils/dashboard/dashboardHelpers";

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

  const {
    programBubble,
    floatingProgramBubble,
    markProgramPromptAsSeen,
    startProgramFlow,
    closeProgramStart,
    closeOnboarding,
    finishOnboarding,
  } = useDashboardProgramPromptFlow({
    dailyRemindersEnabled,
    dashboardShellReady,
    floatingPromptEnabled: hasPaidProgramAccess,
    hasPaidProgramAccess,
    markOnboardingCompleted,
    navigate,
    onboardingDone,
    profileData,
    programJourney,
    refreshUser,
    saveOnboardingDraft,
    setOnboardingStep,
    setProgramPromptSeenThisSession,
    setShowOnboarding,
    setShowProgramStart,
    showOnboarding,
    user,
  });

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

  const saveSurvivalExpenseInline = useCallback(async (val) => {
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
  }, [
    firstPositiveNumber,
    loadDashboardData,
    profileData,
    setProfileData,
    setSurvivalExpense,
    user?.id,
  ]);

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
        <DashboardHomePanel
          isPending={isPending}
          dashboardShellReady={dashboardShellReady}
          dashboardScale={dashboardScale}
          financeNotice={financeNotice}
          closeFinanceNotice={closeFinanceNotice}
          shouldShowNonBlockingRefresh={shouldShowNonBlockingRefresh}
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
          openManualExpenseModal={openManualExpenseModal}
          saveSurvivalExpenseInline={saveSurvivalExpenseInline}
          openBudgetModal={openBudgetModal}
          openDeleteBudgetCategoryModal={openDeleteBudgetCategoryModal}
          openResetBudgetModal={openResetBudgetModal}
          openCreateWalletModal={openCreateWalletModal}
          moveWalletInline={moveWalletInline}
          openDeleteWalletModal={openDeleteWalletModal}
          openAddMoneyModal={openAddMoneyModal}
          openTransferMoneyModal={openTransferMoneyModal}
          openSavingsGoalModal={openSavingsGoalModal}
          openDeleteSavingsGoalModal={openDeleteSavingsGoalModal}
          openAddSavingsModal={openAddSavingsModal}
          startClaraAiLongPress={startClaraAiLongPress}
          endClaraAiLongPress={endClaraAiLongPress}
          handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}
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
        <DashboardFinanceExpandedSheetLayer
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
          saveSurvivalExpenseInline={saveSurvivalExpenseInline}
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
