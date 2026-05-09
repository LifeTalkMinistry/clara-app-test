import { useState, useEffect, useMemo, useCallback, useRef } from "react";

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
  Trash2,
  RotateCcw,
  ArrowDown,
  Edit,
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
import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";
import DashboardShell from "@/components/fresh/main-dashboard/shell/DashboardShell";
import useDashboardShellReady from "@/components/fresh/main-dashboard/shell/useDashboardShellReady";
import useDashboardPanelNavigation from "@/components/fresh/main-dashboard/shell/useDashboardPanelNavigation";
import useDashboardScrollState from "@/components/fresh/main-dashboard/shell/useDashboardScrollState";
import useDashboardInteractionState from "@/components/fresh/main-dashboard/shell/useDashboardInteractionState";
import DashboardContentArea from "@/components/fresh/main-dashboard/shell/DashboardContentArea";
import DashboardPanelRenderer from "@/components/fresh/main-dashboard/shell/DashboardPanelRenderer";
import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";
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
import useDashboardProfileUpdateListener from "@/components/fresh/main-dashboard/profile/useDashboardProfileUpdateListener";
import OnboardingActionBar from "@/components/fresh/main-dashboard/onboarding/OnboardingActionBar";
import useOnboardingPageLock from "@/components/fresh/main-dashboard/onboarding/useOnboardingPageLock";
import useDashboardOnboardingState from "@/components/fresh/main-dashboard/onboarding/useDashboardOnboardingState";
import {
  financeInputClassName,
  UNDOCUMENTED_SPENDING_REASONS,
} from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import createInitialFinanceForm from "@/components/fresh/main-dashboard/finance-form/financeFormInitialState";
import useDashboardFinanceUiState from "@/components/fresh/main-dashboard/finance-form/useDashboardFinanceUiState";
import useDashboardManualExpenseValidation from "@/components/fresh/main-dashboard/finance-form/useDashboardManualExpenseValidation";
import useManualExpenseBudgetListKey from "@/components/fresh/main-dashboard/finance-form/useManualExpenseBudgetListKey";
import useBudgetListDropdownDismiss from "@/components/fresh/main-dashboard/finance-form/useBudgetListDropdownDismiss";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";
import useDashboardVisibleFinanceData from "@/components/fresh/main-dashboard/finance-content/useDashboardVisibleFinanceData";
import useDashboardFinanceStateSync from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync";
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
import {
  DASHBOARD_PANEL_ORDER,
  dashboardPanelCardClass,
  dashboardPanelTextClass,
} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import ManualExpenseFullScreenSheet from "@/components/fresh/main-dashboard/dashboard-primitives/ManualExpenseFullScreenSheet";
import QuickActionDropdown from "@/components/fresh/main-dashboard/dashboard-primitives/QuickActionDropdown";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
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

  const [tasks, setTasks] = useState(initialCache.tasks);
  const [submissions, setSubmissions] = useState(initialCache.submissions);
  const [programRecord, setProgramRecord] = useState(initialCache.programRecord);
  const [survivalExpense, setSurvivalExpense] = useState(initialCache.survivalExpense);
  const [walletMoney, setWalletMoney] = useState(initialCache.walletMoney);
  const [wallets, setWallets] = useState(Array.isArray(initialCache.wallets) ? initialCache.wallets : []);
  const [walletTransactions, setWalletTransactions] = useState(Array.isArray(initialCache.walletTransactions) ? initialCache.walletTransactions : []);
  const [transfers, setTransfers] = useState(Array.isArray(initialCache.transfers) ? initialCache.transfers : []);
  const [budgets, setBudgets] = useState(Array.isArray(initialCache.budgets) ? initialCache.budgets : []);
  const [savingsGoals, setSavingsGoals] = useState(Array.isArray(initialCache.savingsGoals) ? initialCache.savingsGoals : []);
  const [emergencyFund, setEmergencyFund] = useState(initialCache.emergencyFund || null);
  const [expenses, setExpenses] = useState(Array.isArray(initialCache.expenses) ? initialCache.expenses : []);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [offlineReady, setOfflineReady] = useState(true);
  const [loading, setLoading] = useState(
    !hasInitialFinanceCache && !initialCache.loaded && financeDataLoading
  );

  const [profileData, setProfileData] = useState(initialCache.profileData);
  const [latestEnrollment, setLatestEnrollment] = useState(
    initialCache.latestEnrollment
  );
  const [guardChecked, setGuardChecked] = useState(initialCache.guardChecked);

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
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const hydrateFromCache = useCallback((nextCache) => {
    setTasks(nextCache.tasks);
    setSubmissions(nextCache.submissions);
    setProgramRecord(nextCache.programRecord);
    setSurvivalExpense(nextCache.survivalExpense);
    setWalletMoney(nextCache.walletMoney);
    setWallets(nextCache.wallets);
    setWalletTransactions(nextCache.walletTransactions);
    setTransfers(nextCache.transfers || []);
    setBudgets(nextCache.budgets);
    setSavingsGoals(nextCache.savingsGoals);
    setExpenses(nextCache.expenses);
    setPendingExpenses(nextCache.pendingExpenses || []);
    setOfflineReady(Boolean(nextCache.offlineReady));
    setProfileData(nextCache.profileData);
    setLatestEnrollment(nextCache.latestEnrollment);
    setGuardChecked(nextCache.guardChecked);
    setNickname(nextCache.nickname);
    setReminderTime(nextCache.reminderTime);
    setFinancialGoal(nextCache.financialGoal);
    hasLoadedDashboardRef.current = nextCache.loaded;
    setLoading(!nextCache.loaded && !hasDashboardFinanceContent(nextCache) && financeDataLoading);
  }, [financeDataLoading]);

  useEffect(() => {
    if (!cacheKey) {
      const emptyCache = createEmptyDashboardCache();
      dashboardPageCache = emptyCache;
      hydrateFromCache(emptyCache);
      return;
    }

    if (dashboardPageCache.loaded && dashboardPageCache.key === cacheKey) {
      hydrateFromCache(dashboardPageCache);
      return;
    }

    hasLoadedDashboardRef.current = false;
    setGuardChecked(false);
    setLoading(!hasDashboardFinanceContent(initialCache) && financeDataLoading);
  }, [cacheKey, financeDataLoading, hydrateFromCache]);

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

  const loadDashboardData = useCallback(
    async ({ background = false } = {}) => {
      const currentUser = { id: userId, email: userEmail, full_name: user?.full_name || "" };

      if (!currentUser.email && !currentUser.id) {
        const emptyCache = createEmptyDashboardCache();
        dashboardPageCache = emptyCache;
        hydrateFromCache(emptyCache);
        return emptyCache;
      }

      const ownerKey = cacheKey || currentUser.id || currentUser.email || "guest";
      if (dashboardPageInFlight?.key === ownerKey) return dashboardPageInFlight.promise;
      if (!hasLoadedDashboardRef.current && !background && !hasDashboardFinanceContent(dashboardPageCache)) {
        setLoading(true);
      }

      try {
        const promise = (async () => {
          const [tasksRes, submissionsRes, userProgramRecord, profilesRes, enrollmentsRes] = await Promise.all([
            supabase.from("challenge_tasks").select("*").order("sort_order", { ascending: true }).order("day", { ascending: true }),
            supabase.from("task_submissions").select("*"),
            fetchUserProgramRecord({ supabase, userId: currentUser.id }),
            supabase.from("profiles").select("*"),
            supabase.from("enrollments").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(1),
          ]);

          if (tasksRes.error) console.error("Failed to load tasks:", tasksRes.error);
          if (submissionsRes.error) console.error("Failed to load submissions:", submissionsRes.error);
          if (profilesRes.error) console.error("Failed to load profiles:", profilesRes.error);
          if (enrollmentsRes.error) console.error("Failed to load enrollments:", enrollmentsRes.error);

          const userSubmissions = (submissionsRes.data || []).filter((item) => isOwnedByUser(item, currentUser));
          const normalizedTasks = (tasksRes.data || []).map(normalizeProgramTask);
          const userProfile = (profilesRes.data || []).find((profile) => isOwnedByUser(profile, currentUser)) || null;
          const enrollmentRecord = (enrollmentsRes.data || [])[0] || null;

          const safeWallets = Array.isArray(financeWallets) ? financeWallets : [];
          const safeWalletTransactions = Array.isArray(financeWalletTransactions) ? financeWalletTransactions : [];
          const safeTransfers = Array.isArray(financeTransfers) ? financeTransfers : [];
          const safeBudgets = Array.isArray(financeBudgets) ? financeBudgets : [];
          const safeSavingsGoals = Array.isArray(financeSavingsGoals) ? financeSavingsGoals : [];
          const safeExpenses = Array.isArray(financeExpenses) ? financeExpenses : [];
          const safePendingExpenses = safeExpenses.filter((item) => item?.pending_sync || item?.sync_status === "pending" || item?.syncStatus === "pending" || item?.local_only);
          const nextWalletMoney = safeWallets.reduce((sum, wallet) => sum + getWalletDisplayBalance(wallet), 0);

          const storedPrefs = readDashboardPrefs(currentUser.id);
          const nextNickname = normalizeString(userProfile?.display_name || userProfile?.nickname || userProfile?.full_name || nickname || dashboardPageCache.nickname || currentUser.full_name || "");
          const nextReminderTime = reminderTime || dashboardPageCache.reminderTime || storedPrefs.reminderTime;
          const nextFinancialGoal = financialGoal || dashboardPageCache.financialGoal || storedPrefs.financialGoal;
          const approved = isProgramApproved(userProfile, isPaid, enrollmentRecord);
          const onboardingDone = hasCompletedProgramOnboarding(userProfile);
          if (!approved || onboardingDone || !dailyRemindersEnabled) setShowProgramStart(false);

          const nextCache = {
            key: ownerKey,
            loaded: true,
            tasks: normalizedTasks,
            submissions: userSubmissions,
            programRecord: userProgramRecord || dashboardPageCache.programRecord || null,
            survivalExpense: firstPositiveNumber(userProfile?.monthly_survival_expense, userProfile?.survival_expense, userProfile?.clara_survival_expense, readStoredSurvivalExpense(currentUser.id), survivalExpense, dashboardPageCache.survivalExpense),
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

          dashboardPageCache = nextCache;
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
                dashboardPageCache = {
                  ...dashboardPageCache,
                  programRecord: ensuredRecord,
                };
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

        dashboardPageInFlight = { key: ownerKey, promise };
        return await promise;
      } catch (error) {
        console.warn("Dashboard background refresh warning:", error);
        if (!hasVisibleFinanceData && !hasDashboardFinanceContent(dashboardPageCache)) {
          setFinanceNotice({
            message: "Dashboard data could not fully refresh. Finance data remains protected offline.",
            type: "error",
          });
        }
        return dashboardPageCache;
      } finally {
        if (dashboardPageInFlight?.key === ownerKey) dashboardPageInFlight = null;
        setLoading(false);
        setGuardChecked(true);
      }
    },
    [cacheKey, dailyRemindersEnabled, financeBudgets, financeEmergencyFund, financeExpenses, financeSavingsGoals, financeTransfers, financeWalletTransactions, financeWallets, financialGoal, hasVisibleFinanceData, hydrateFromCache, isPaid, nickname, reminderTime, survivalExpense, user?.full_name, userEmail, userId]
  );  const scheduleRefresh = useDashboardScheduledRefresh({
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

  const manualExpenseBudgetListItems = useMemo(
    () => [
      {
        key: "__unplanned__",
        title: "Unplanned Spending",
        subtitle: "Outside your completed monthly budget",
        tone: "amber",
        disabled: false,
      },
      {
        key: "__undocumented__",
        title: "Undocumented Spending",
        subtitle: "Spent but details are incomplete",
        tone: "cyan",
        disabled: false,
      },
      ...manualExpenseBudgetOptions.map((budgetItem) => ({
        key: budgetItem.key,
        title: budgetItem.title,
        subtitle: budgetPlanIsComplete ? "Planned monthly budget category" : "Finish budget first",
        tone: "neutral",
        disabled: !budgetPlanIsComplete,
      })),
    ],
    [budgetPlanIsComplete, manualExpenseBudgetOptions]
  );

  const programJourney = useMemo(
    () =>
      buildProgramJourney(tasks, submissions, {
        plan,
        profile: profileData || user,
        enrollment: latestEnrollment,
        programRecord,
      }),
    [latestEnrollment, plan, profileData, programRecord, submissions, tasks, user]
  );

  const activeTask = programJourney.todayItem || programJourney.activeItem;
  const nextTask = programJourney.nextItem;
  const onboardingDone = isProgramOnboardingCompleted();

  const hasPaidProgramAccess = useMemo(() => {
    const approved = isProgramApproved(profileData, isPaid, latestEnrollment);
    const nonFreeTier =
      normalizeLower(programJourney?.tier) !== "free" &&
      normalizeLower(profileData?.plan || plan) !== "free";
    return approved && nonFreeTier;
  }, [profileData, latestEnrollment, isPaid, programJourney?.tier, plan]);

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

  const topWallet = useMemo(() => wallets[0] || null, [wallets]);

  const walletPreviewTransactions = useMemo(
    () => walletTransactions.slice(0, 2),
    [walletTransactions]
  );

  const activeBudget = useMemo(() => {
    if (!budgets.length) return null;

    const active =
      budgets.find(
        (budget) =>
          isTruthyActive(budget?.is_active) ||
          normalizeLower(budget?.status) === "active"
      ) || budgets[0];

    return active || null;
  }, [budgets]);

  const derivedActiveBudget = useMemo(() => {
    if (!activeBudget) return null;

    const spentFromExpenses = expenses.reduce((sum, expense) => {
      if (!isExpenseInsideBudgetWindow(expense, activeBudget)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const explicitSpent = getBudgetSpent(activeBudget);
    const spent = spentFromExpenses > 0 ? spentFromExpenses : explicitSpent;
    const total = getBudgetTotal(activeBudget);
    const remaining = Math.max(total - spent, 0);

    return {
      ...activeBudget,
      spent,
      spent_amount: spent,
      total_spent: spent,
      remaining,
      remaining_amount: remaining,
      amount_left: remaining,
    };
  }, [activeBudget, expenses]);

  const totalSavingsTarget = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0),
    [savingsGoals]
  );

  const totalSavingsSaved = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0),
    [savingsGoals]
  );

  const primarySavingsGoal = useMemo(() => savingsGoals[0] || null, [savingsGoals]);

  const claraAssistantContext = useMemo(() => {
    const safeWallets = Array.isArray(wallets) ? wallets : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeBudgets = Array.isArray(budgets) ? budgets : [];
    const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];
    const safeWalletTransactions = Array.isArray(walletTransactions)
      ? walletTransactions
      : [];
    const safePendingExpenses = Array.isArray(pendingExpenses) ? pendingExpenses : [];
    const currentMonthKey = getPHMonthKey();

    const readNumber = (...values) => {
      for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        const number =
          typeof value === "number"
            ? value
            : Number(String(value).replace(/[₱,\s]/g, ""));

        if (Number.isFinite(number)) return number;
      }

      return null;
    };

    const sumNumbers = (items, getValue) =>
      items.reduce((sum, item) => sum + (readNumber(getValue(item)) ?? 0), 0);

    const isCurrentMonthItem = (item) => {
      const itemDate = getTransactionDate(item);
      return Boolean(itemDate && getPHMonthKey(itemDate) === currentMonthKey);
    };

    const getExpensePlanningStatus = (expense) =>
      normalizeLower(
        expense?.planning_status ||
          expense?.planningStatus ||
          expense?.status ||
          ""
      );

    const getExpenseNeedType = (expense) =>
      normalizeLower(
        expense?.need_type ||
          expense?.needType ||
          expense?.spending_type ||
          expense?.type ||
          ""
      );

    const currentMonthExpenses = safeExpenses.filter(isCurrentMonthItem);
    const safeMonthlySpent = readNumber(thisMonthSpent) ?? sumNumbers(
      currentMonthExpenses,
      (expense) => expense?.amount
    );
    const recentExpenseRows = sortByNewestDate(safeExpenses).slice(0, 8);

    const plannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "planned";
    });
    const unplannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "unplanned";
    });
    const undocumentedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "undocumented";
    });
    const needsExpenseRows = currentMonthExpenses.filter((expense) => {
      const type = getExpenseNeedType(expense);
      return type === "need" || type === "needs" || type === "essential";
    });
    const wantsExpenseRows = currentMonthExpenses.filter((expense) => {
      const type = getExpenseNeedType(expense);
      return type === "want" || type === "wants" || type === "lifestyle";
    });

    const walletTotalFromRows = safeWallets.length
      ? sumNumbers(safeWallets, getWalletDisplayBalance)
      : null;
    const walletMoneyValue = readNumber(walletMoney);
    const safeTotalWalletBalance =
      walletTotalFromRows ?? (walletMoneyValue !== 0 ? walletMoneyValue : null);
    const safeTotalMoneyLeft =
      safeTotalWalletBalance ??
      readNumber(moneyLeftThisMonth) ??
      null;

    const incomeTransactionRows = safeWalletTransactions.filter((transaction) => {
      const type = normalizeLower(
        transaction?.type || transaction?.transaction_type || transaction?.kind
      );
      return INCOME_TRANSACTION_TYPES.has(type);
    });
    const currentMonthIncomeRows = incomeTransactionRows.filter(isCurrentMonthItem);
    const monthlyIncomeValue =
      currentMonthIncomeRows.length > 0
        ? sumNumbers(currentMonthIncomeRows, (transaction) => transaction?.amount)
        : readNumber(thisMonthIncome);
    const totalIncomeValue = incomeTransactionRows.length
      ? sumNumbers(incomeTransactionRows, (transaction) => transaction?.amount)
      : null;

    const declaredBudgetAmount = readNumber(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      monthlyBudgetPlan?.monthly_budget_amount
    );
    const hasBudgetData =
      safeBudgets.length > 0 ||
      Number(monthlyBudgetPlan?.category_count || 0) > 0 ||
      (declaredBudgetAmount !== null && declaredBudgetAmount > 0) ||
      Boolean(derivedActiveBudget);

    const budgetAllocated = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.allocated_amount,
          monthlyBudgetPlan?.allocated_total,
          monthlyBudgetPlan?.total_budget,
          derivedActiveBudget?.allocated_amount,
          derivedActiveBudget?.total_budget,
          derivedActiveBudget ? getBudgetTotal(derivedActiveBudget) : null
        )
      : null;
    const budgetSpent = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.spent,
          monthlyBudgetPlan?.spent_amount,
          monthlyBudgetPlan?.total_spent,
          derivedActiveBudget?.spent,
          derivedActiveBudget?.spent_amount,
          derivedActiveBudget?.total_spent,
          derivedActiveBudget ? getBudgetSpent(derivedActiveBudget) : null
        )
      : null;
    const budgetRemaining = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.remaining,
          monthlyBudgetPlan?.remaining_amount,
          derivedActiveBudget?.remaining,
          derivedActiveBudget?.remaining_amount,
          derivedActiveBudget?.amount_left,
          derivedActiveBudget ? getBudgetRemaining(derivedActiveBudget) : null
        )
      : null;

    const savingsSaved = safeSavingsGoals.length
      ? readNumber(totalSavingsSaved) ?? sumNumbers(safeSavingsGoals, getSavingsSaved)
      : null;
    const savingsTarget = safeSavingsGoals.length
      ? readNumber(totalSavingsTarget) ?? sumNumbers(safeSavingsGoals, getSavingsTarget)
      : null;

    const emergencyTarget = firstPositiveNumber(
      survivalExpense,
      profileData?.monthly_survival_expense,
      profileData?.survival_expense,
      profileData?.clara_survival_expense,
      profileData?.emergency_fund_target,
      profileData?.emergencyFundTarget
    );
    const emergencySaved = readNumber(
      profileData?.emergency_fund_saved,
      profileData?.emergencyFundSaved,
      profileData?.current_emergency_fund,
      profileData?.emergency_fund_amount,
      profileData?.emergency_saved
    );

    const categoryTotals = currentMonthExpenses.reduce((acc, expense) => {
      const category = getExpenseCategoryKey(expense);
      acc[category] = (acc[category] || 0) + (readNumber(expense?.amount) ?? 0);
      return acc;
    }, {});
    const topSpendingCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const normalizedWallets = safeWallets.map((wallet) => ({
      ...(wallet || {}),
      id: wallet?.id || null,
      name: getWalletDisplayName(wallet),
      balance: readNumber(getWalletDisplayBalance(wallet)),
    }));

    const normalizedExpenses = safeExpenses.map((expense) => ({
      ...(expense || {}),
      id: expense?.id || null,
      amount: readNumber(expense?.amount),
      category: getExpenseCategoryKey(expense),
      date: expense?.date || expense?.expense_date || expense?.created_at || null,
      need_type:
        expense?.need_type ||
        expense?.needType ||
        expense?.spending_type ||
        null,
      planning_status:
        expense?.planning_status ||
        expense?.planningStatus ||
        expense?.status ||
        null,
      unplanned_reason: expense?.unplanned_reason || null,
      notes: normalizeString(expense?.notes || expense?.description || ""),
    }));

    const normalizedBudgets = safeBudgets.map((budget) => ({
      ...(budget || {}),
      id: budget?.id || null,
      name: getBudgetListTitle(budget),
      allocated: readNumber(getBudgetTotal(budget)),
      allocated_amount: readNumber(getBudgetTotal(budget)),
      spent: readNumber(getBudgetSpent(budget)),
      spent_amount: readNumber(getBudgetSpent(budget)),
      remaining: readNumber(getBudgetRemaining(budget)),
      remaining_amount: readNumber(getBudgetRemaining(budget)),
      need_type: getBudgetNeedType(budget),
    }));

    const normalizedSavingsGoals = safeSavingsGoals.map((goal) => ({
      ...(goal || {}),
      id: goal?.id || null,
      name: getSavingsGoalTitle(goal),
      title: getSavingsGoalTitle(goal),
      saved: readNumber(getSavingsSaved(goal)),
      saved_amount: readNumber(getSavingsSaved(goal)),
      target: readNumber(getSavingsTarget(goal)),
      target_amount: readNumber(getSavingsTarget(goal)),
    }));

    const normalizeExpenseList = (rows) =>
      rows.map((expense) => ({
        ...(expense || {}),
        id: expense?.id || null,
        amount: readNumber(expense?.amount),
        category: getExpenseCategoryKey(expense),
        date: expense?.date || expense?.expense_date || expense?.created_at || null,
        need_type:
          expense?.need_type ||
          expense?.needType ||
          expense?.spending_type ||
          null,
        planning_status:
          expense?.planning_status ||
          expense?.planningStatus ||
          expense?.status ||
          null,
        notes: normalizeString(expense?.notes || expense?.description || ""),
      }));

    return {
      userName:
        nickname ||
        profileData?.full_name ||
        profileData?.display_name ||
        profileData?.nickname ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")?.[0] ||
        "there",
      offlineReady,
      online: isClaraOnline(),
      pendingExpenses: safePendingExpenses,
      localExpenses: normalizedExpenses.filter((expense) => expense?.local_only),
      pendingLocalExpenses: safePendingExpenses,

      wallets: normalizedWallets,
      expenses: normalizedExpenses,
      budgets: normalizedBudgets,
      savingsGoals: normalizedSavingsGoals,
      emergencyFund: {
        saved: emergencySaved,
        current: emergencySaved,
        current_amount: emergencySaved,
        target: emergencyTarget > 0 ? emergencyTarget : null,
        target_amount: emergencyTarget > 0 ? emergencyTarget : null,
        summary:
          emergencyTarget > 0
            ? `Your emergency baseline is ${fmt(emergencyTarget)}.`
            : "",
      },
      walletTransactions: safeWalletTransactions,
      transfers: [],

      totalWalletBalance: safeTotalWalletBalance,
      totalAvailableMoney: safeTotalMoneyLeft,
      availableMoney: safeTotalMoneyLeft,
      totalMoneyLeft: safeTotalMoneyLeft,
      moneyLeftThisMonth: readNumber(moneyLeftThisMonth),

      monthlySpent: safeMonthlySpent,
      totalExpensesThisMonth: safeMonthlySpent,
      thisMonthSpent: safeMonthlySpent,
      monthlyExpenses: safeMonthlySpent,
      currentMonthExpenses: normalizeExpenseList(currentMonthExpenses),

      monthlyIncome: monthlyIncomeValue,
      totalIncome: totalIncomeValue,
      addedFunds: totalIncomeValue,

      budgetAllocated,
      budgetSpent,
      budgetRemaining,
      budget: {
        ...(monthlyBudgetPlan || {}),
        allocated: budgetAllocated,
        allocated_amount: budgetAllocated,
        spent: budgetSpent,
        spent_amount: budgetSpent,
        remaining: budgetRemaining,
        remaining_amount: budgetRemaining,
        summary:
          budgetAllocated !== null
            ? `Your current budget shows ${fmt(budgetSpent || 0)} spent out of ${fmt(
                budgetAllocated
              )} allocated.`
            : "",
        categories: Array.isArray(budgetSummaries) ? budgetSummaries : [],
      },

      totalSavingsSaved: savingsSaved,
      totalSavingsTarget: savingsTarget,
      savings: {
        saved: savingsSaved,
        saved_amount: savingsSaved,
        target: savingsTarget,
        target_amount: savingsTarget,
        summary:
          savingsTarget !== null
            ? `Your savings progress is ${fmt(savingsSaved || 0)} out of ${fmt(
                savingsTarget
              )}.`
            : safeSavingsGoals.length
              ? `You have ${safeSavingsGoals.length} savings goal${
                  safeSavingsGoals.length === 1 ? "" : "s"
                } tracked.`
              : "",
      },

      emergencyFundSaved: emergencySaved,
      emergencyFundTarget: emergencyTarget > 0 ? emergencyTarget : null,

      needsSpending: needsExpenseRows.length
        ? sumNumbers(needsExpenseRows, (expense) => expense?.amount)
        : null,
      wantsSpending: wantsExpenseRows.length
        ? sumNumbers(wantsExpenseRows, (expense) => expense?.amount)
        : null,
      plannedExpenses: normalizeExpenseList(plannedExpenseRows),
      unplannedExpenses: normalizeExpenseList(unplannedExpenseRows),
      undocumentedExpenses: normalizeExpenseList(undocumentedExpenseRows),

      plannedSpent: plannedExpenseRows.length
        ? sumNumbers(plannedExpenseRows, (expense) => expense?.amount)
        : null,
      unplannedSpent:
        readNumber(monthlyBudgetPlan?.unplanned_spent) ??
        (unplannedExpenseRows.length
          ? sumNumbers(unplannedExpenseRows, (expense) => expense?.amount)
          : null),
      undocumentedSpent:
        readNumber(monthlyBudgetPlan?.undocumented_spent) ??
        (undocumentedExpenseRows.length
          ? sumNumbers(undocumentedExpenseRows, (expense) => expense?.amount)
          : null),

      topSpendingCategory,
      recentExpenses: normalizeExpenseList(recentExpenseRows),
      budgetCategories: Array.isArray(budgetSummaries) ? budgetSummaries : [],
      manualExpenseBudgetOptions: Array.isArray(manualExpenseBudgetOptions)
        ? manualExpenseBudgetOptions
        : [],
    };
  }, [
    budgetSummaries,
    budgets,
    derivedActiveBudget,
    expenses,
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
    user,
    walletMoney,
    walletTransactions,
    wallets,
  ]);

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

  const showFinanceNotice = useCallback((message, type = "error") => {
    setFinanceNotice({ message, type });
  }, []);

  const closeFinanceNotice = useCallback(() => {
    setFinanceNotice(null);
  }, []);

  const closeFinanceModal = useCallback(() => {
    setBudgetExitConfirm(false);
    setBudgetListOpen(false);
    setFinanceModal({ type: null, payload: null });
  }, []);

  const openCreateWalletModal = useCallback(() => {
    setFinanceForm({
      name: "",
      type: "cash",
      customWalletType: "",
      startingBalance: "0",
      amount: "",
      destinationWalletId: "",
      totalBudget: "",
      needsPct: "50",
      wantsPct: "30",
      otherPct: "20",
      title: "",
      targetAmount: "",
      savingsWalletId: "",
      category: "",
      subcategory: "",
      plannedUseDate: "",
      reasonOne: "",
      reasonTwo: "",
      reasonThree: "",
      emotionalValue: "joy",
      priority: "medium",
      flexibility: "flexible",
      notes: "",
    });
    setFinanceModal({ type: "create_wallet", payload: null });
  }, []);

  const openDeleteWalletModal = useCallback((walletId) => {
    const wallet = wallets.find((item) => String(item.id) === String(walletId)) || null;
    setFinanceModal({ type: "delete_wallet", payload: wallet });
  }, [wallets]);

  const openAddMoneyModal = useCallback((wallet) => {
    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
    }));
    setFinanceModal({ type: "add_money", payload: wallet });
  }, []);

  const openTransferMoneyModal = useCallback((fromWallet) => {
    const destinationOptions = wallets.filter(
      (wallet) => String(wallet.id) !== String(fromWallet?.id)
    );

    if (destinationOptions.length < 1) {
      showFinanceNotice("Create another wallet first before transferring.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      destinationWalletId: String(destinationOptions[0]?.id || ""),
    }));
    setFinanceModal({ type: "transfer_money", payload: fromWallet });
  }, [wallets, showFinanceNotice]);

  const openManualExpenseModal = useCallback(() => {
    if (!wallets.length) {
      showFinanceNotice("Create or fund a wallet first before logging an expense.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      budgetListKey: "",
      expenseWalletId: String(wallets[0]?.id || ""),
      unplannedReason: "",
      undocumentedReason: "",
      undocumentedNote: "",
      notes: "",
    }));
    setBudgetListOpen(false);
    setFinanceModal({ type: "manual_expense", payload: null });
  }, [showFinanceNotice, wallets]);

  const getClaraAiOrbButtonFromEvent = useCallback((event) => {
    const target = event?.target;
    if (!target?.closest) return null;

    const emergencyCard = target.closest("[data-emergency-card]");
    if (!emergencyCard) return null;

    const button = target.closest("button");
    if (!button || !emergencyCard.contains(button)) return null;

    const buttonSignature = [
      button.getAttribute?.("aria-label"),
      button.getAttribute?.("title"),
      button.textContent,
    ]
      .map((value) => normalizeLower(value))
      .filter(Boolean)
      .join(" ");

    if (
      buttonSignature.includes("clara ai") ||
      buttonSignature.includes("clara") ||
      buttonSignature.includes("assistant") ||
      buttonSignature.includes("ask")
    ) {
      return button;
    }

    return null;
  }, []);

  const isClaraAiOrbEvent = useCallback((event) => {
    return Boolean(getClaraAiOrbButtonFromEvent(event));
  }, [getClaraAiOrbButtonFromEvent]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openClaraAiFromLongPress = useCallback(() => {
    setShowAiAssistant(true);
  }, []);

  const startClaraAiLongPress = useCallback((event) => {
    if (!isClaraAiOrbEvent(event)) return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openClaraAiFromLongPress();
    }, 550);
  }, [clearLongPressTimer, isClaraAiOrbEvent, openClaraAiFromLongPress]);

  const endClaraAiLongPress = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleClaraAiOrbClickCapture = useCallback((event) => {
    if (!isClaraAiOrbEvent(event)) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return true;
    }

    openManualExpenseModal();
    return true;
  }, [isClaraAiOrbEvent, openManualExpenseModal]);


  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const startMoneyLeftOrbLongPress = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openClaraAiFromLongPress();
    }, 550);
  }, [clearLongPressTimer, openClaraAiFromLongPress, stopMoneyLeftOrbEvent]);

  const endMoneyLeftOrbLongPress = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);
    clearLongPressTimer();
  }, [clearLongPressTimer, stopMoneyLeftOrbEvent]);

  const handleMoneyLeftOrbClick = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    openManualExpenseModal();
  }, [openManualExpenseModal, stopMoneyLeftOrbEvent]);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  useEffect(() => {
    const handleOpenAssistant = (event) => {
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      setShowAiAssistant(true);
    };

    window.addEventListener("clara:open-assistant", handleOpenAssistant, true);

    return () => {
      window.removeEventListener("clara:open-assistant", handleOpenAssistant, true);
    };
  }, []);

  const openBudgetModal = useCallback((budgetCategory = null) => {
    const item = budgetCategory?.budget || budgetCategory || null;
    const declaredAmount = firstValidNumber(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      declaredMonthlyBudgetAmount
    );

    setBudgetExitConfirm(false);
    setFinanceForm((prev) => ({
      ...prev,
      monthlyBudgetAmount: declaredAmount > 0 ? String(declaredAmount) : "",
      title: item ? getBudgetListTitle(item) : "",
      budgetCategoryName: item ? getBudgetListTitle(item) : "",
      totalBudget: item ? String(getBudgetTotal(item)) : "",
      needsPct: String(item?.needs_pct ?? item?.needs_percent ?? 50),
      wantsPct: String(item?.wants_pct ?? item?.wants_percent ?? 30),
      otherPct: String(item?.other_pct ?? item?.other_percent ?? 20),
    }));
    setFinanceModal({ type: "save_budget", payload: item || null });
  }, [declaredMonthlyBudgetAmount, monthlyBudgetPlan?.declared_amount, monthlyBudgetPlan?.declared_budget]);

  const openDeleteBudgetCategoryModal = useCallback((budgetCategory = null) => {
    const item = budgetCategory?.budget || budgetCategory || null;
    if (!item?.id) return;
    setFinanceModal({ type: "delete_budget_category", payload: item });
  }, []);

  const openResetBudgetModal = useCallback(() => {
    if (!activeBudget?.id) return;
    setFinanceModal({ type: "reset_budget", payload: activeBudget });
  }, [activeBudget]);

  const openSavingsGoalModal = useCallback(
    (goal = null) => {
      if (goal?.id) {
        navigate("/savings-goals", {
          state: {
            editGoalId: String(goal.id),
            focusGoalId: String(goal.id),
          },
        });
        return;
      }

      navigate("/savings-goals", {
        state: {
          openCreateSavingsGoal: true,
        },
      });
    },
    [navigate]
  );

  const openDeleteSavingsGoalModal = useCallback((goalId) => {
    const goal = savingsGoals.find((item) => String(item.id) === String(goalId)) || null;
    setFinanceModal({ type: "delete_savings_goal", payload: goal });
  }, [savingsGoals]);

  const openAddSavingsModal = useCallback((goal) => {
    const compatibleWallets = wallets.filter((wallet) => getWalletDisplayBalance(wallet) > 0);

    if (!compatibleWallets.length) {
      showFinanceNotice("Add balance to a wallet first before funding a goal.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      savingsWalletId: String(compatibleWallets[0]?.id || ""),
    }));
    setFinanceModal({ type: "add_savings", payload: goal });
  }, [wallets, showFinanceNotice]);

  useEffect(() => {
    window.addEventListener("clara:open-manual-expense", openManualExpenseModal);
    return () => window.removeEventListener("clara:open-manual-expense", openManualExpenseModal);
  }, [openManualExpenseModal]);


  const refreshFinanceSection = useCallback(async () => {
    await refreshFinancialData?.();
    dispatchClaraEvent("clara-finance-updated");
  }, [refreshFinancialData]);

  const moveWalletInline = useCallback(
    async (walletId, direction) => {
      if (financeActionLoading) return;

      const orderedWallets = [...wallets].sort((a, b) => {
        const aIndex = wallets.findIndex((wallet) => String(wallet.id) === String(a.id));
        const bIndex = wallets.findIndex((wallet) => String(wallet.id) === String(b.id));
        return getWalletSortOrder(a, aIndex) - getWalletSortOrder(b, bIndex);
      });

      const fromIndex = orderedWallets.findIndex(
        (wallet) => String(wallet.id) === String(walletId)
      );

      if (fromIndex === -1) return;

      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= orderedWallets.length) return;

      [orderedWallets[fromIndex], orderedWallets[toIndex]] = [
        orderedWallets[toIndex],
        orderedWallets[fromIndex],
      ];

      try {
        setFinanceActionLoading(true);

        await Promise.all(
          orderedWallets.map((wallet, index) =>
            updateWalletData?.(String(wallet.id), { sort_order: index })
          )
        );

        await refreshFinanceSection();
      } catch (error) {
        showFinanceNotice(error?.message || "Failed to reorder wallets.");
      } finally {
        setFinanceActionLoading(false);
      }
    },
    [financeActionLoading, refreshFinanceSection, showFinanceNotice, wallets]
  );

  const createWalletInline = useCallback(async () => {
    const name = normalizeString(financeForm.name);
    const selectedWalletType = normalizeString(financeForm.type) || "cash";
    const customWalletType = normalizeString(financeForm.customWalletType);
    const type =
      selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;
    const startingBalance = Number(financeForm.startingBalance);

    if (!name) {
      showFinanceNotice("Please enter a wallet name.");
      return;
    }

    if (!type) {
      showFinanceNotice("Please enter a wallet type.");
      return;
    }

    if (!Number.isFinite(startingBalance) || startingBalance < 0) {
      showFinanceNotice("Please enter a valid starting balance.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await addWalletData?.({
        name,
        type,
        balance: startingBalance,
        starting_balance: startingBalance,
        sort_order: wallets.length,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await refreshFinanceSection();
      setExpandedFinanceCard("wallets");
      closeFinanceModal();
      showFinanceNotice("Wallet created successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to create wallet.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.customWalletType,
    financeForm.name,
    financeForm.startingBalance,
    financeForm.type,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    wallets.length,
    addWalletData,
  ]);

  const deleteWalletInline = useCallback(async () => {
    const walletId = financeModal?.payload?.id;
    if (!walletId) return;

    try {
      setFinanceActionLoading(true);
      await deleteWalletData?.(walletId);

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Wallet deleted.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to delete wallet.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice, deleteWalletData]);

  const saveManualExpenseInline = useCallback(async () => {
    const amount = Number(financeForm.amount);
    const wallet = wallets.find(
      (item) => String(item.id) === String(financeForm.expenseWalletId)
    );
    const isUnplanned = financeForm.budgetListKey === "__unplanned__";
    const isUndocumented = financeForm.budgetListKey === "__undocumented__";
    const selectedBudget = manualExpenseBudgetOptions.find(
      (item) => String(item.key) === String(financeForm.budgetListKey)
    );
    const reason = normalizeString(financeForm.unplannedReason || financeForm.notes);
    const undocumentedReason = normalizeString(financeForm.undocumentedReason);
    const undocumentedNote = normalizeString(financeForm.undocumentedNote);
    const undocumentedFallbackNote = normalizeString(
      [undocumentedReason, undocumentedNote].filter(Boolean).join(" — ")
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid expense amount.");
      return;
    }

    if (!financeForm.budgetListKey) {
      showFinanceNotice("Please select a budget list item.");
      return;
    }

    if (!wallet) {
      showFinanceNotice("Please select a valid wallet.");
      return;
    }

    if (getWalletDisplayBalance(wallet) < amount) {
      showFinanceNotice("Insufficient balance in the selected wallet.");
      return;
    }

    if (isUnplanned && !reason) {
      showFinanceNotice("Please explain the purpose before logging this unplanned expense.");
      return;
    }

    if (isUndocumented && !undocumentedReason) {
      showFinanceNotice("Please select why this spending is undocumented.");
      return;
    }

    if (!isUnplanned && !isUndocumented && !budgetPlanIsComplete) {
      showFinanceNotice("You haven’t completed your monthly budgeting plan yet. Finish assigning your budget before logging planned expenses.");
      return;
    }

    if (!isUnplanned && !isUndocumented && !selectedBudget) {
      showFinanceNotice("Please select a valid budget list item.");
      return;
    }

    try {
      setFinanceActionLoading(true);

      const nowIso = new Date().toISOString();
      const budgetCategory = isUnplanned
        ? "Unplanned Spending"
        : isUndocumented
          ? "Undocumented Spending"
          : selectedBudget.title;
      const needType = isUnplanned || isUndocumented ? "other" : selectedBudget.needType || "need";
      const planningStatus = isUnplanned ? "unplanned" : isUndocumented ? "undocumented" : "planned";
      const notesValue = isUnplanned ? reason : isUndocumented ? undocumentedFallbackNote : "";

      const expensePayload = {
        amount,
        wallet_id: wallet.id,
        category: budgetCategory,
        need_type: needType,
        planning_status: planningStatus,
        unplanned_reason: isUnplanned
          ? reason
          : isUndocumented
            ? undocumentedFallbackNote || "Undocumented Spending"
            : null,
        notes: notesValue,
        date: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      };

      const walletTransactionPayload = {
        wallet_id: wallet.id,
        type: "expense",
        amount,
        category: budgetCategory,
        need_type: needType,
        planning_status: planningStatus,
        unplanned_reason: expensePayload.unplanned_reason,
        source_type: "Manual Log Expense",
        notes: notesValue,
        details: {
          budget_category: budgetCategory,
          previous_balance: getWalletDisplayBalance(wallet),
          next_balance: getWalletDisplayBalance(wallet) - amount,
        },
        created_at: nowIso,
        updated_at: nowIso,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      };

      await addExpenseData?.(expensePayload);

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Expense logged successfully.", "success");
    } catch (error) {
      console.warn("CLARA manual expense save failed:", error);
      showFinanceNotice("CLARA could not save this expense yet. Please try again.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    budgetPlanIsComplete,
    closeFinanceModal,
    financeForm.amount,
    financeForm.budgetListKey,
    financeForm.expenseWalletId,
    financeForm.notes,
    financeForm.undocumentedNote,
    financeForm.undocumentedReason,
    financeForm.unplannedReason,
    cacheKey,
    manualExpenseBudgetOptions,
    pendingExpenses,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    walletMoney,
    walletTransactions,
    wallets,
    expenses,
    addExpenseData,
  ]);

  const addMoneyInline = useCallback(async () => {
    const wallet = financeModal?.payload;
    const amount = Number(financeForm.amount);

    if (!wallet) return;

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid amount.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await addIncomeData?.({
        wallet_id: wallet.id,
        type: "income",
        amount,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Money added successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to add money.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    addIncomeData,
  ]);

  const transferMoneyInline = useCallback(async () => {
    const fromWallet = financeModal?.payload;
    const destinationWallet = wallets.find(
      (wallet) => String(wallet.id) === String(financeForm.destinationWalletId)
    );
    const amount = Number(financeForm.amount);

    if (!fromWallet) return;

    if (!destinationWallet) {
      showFinanceNotice("Please select a valid destination wallet.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid amount.");
      return;
    }

    if (getWalletDisplayBalance(fromWallet) < amount) {
      showFinanceNotice("Insufficient balance in the source wallet.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await transferBetweenWalletsData?.({
        from_wallet_id: fromWallet.id,
        to_wallet_id: destinationWallet.id,
        amount,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Transfer completed successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to transfer money.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeForm.destinationWalletId,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    wallets,
    transferBetweenWalletsData,
  ]);

  const syncBudgetRowsIntoState = useCallback((rows = []) => {
    const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (!safeRows.length) return;

    setBudgets((previousBudgets) => {
      const safeBudgets = Array.isArray(previousBudgets) ? previousBudgets : [];
      const nextBudgets = [...safeBudgets];

      safeRows.forEach((row) => {
        const rowId = normalizeString(row?.id);
        const rowMonth = normalizeString(row?.month || row?.budget_month || row?.month_key || getPHMonthKey());
        const rowPlanType = normalizeLower(row?.plan_type || row?.type || "");
        const rowCategory = normalizeLower(row?.category || row?.budget_category || row?.title || row?.name || "");

        const existingIndex = nextBudgets.findIndex((budget) => {
          const budgetId = normalizeString(budget?.id);
          if (rowId && budgetId && rowId === budgetId) return true;

          const budgetMonth = normalizeString(budget?.month || budget?.budget_month || budget?.month_key || getPHMonthKey());
          const budgetPlanType = normalizeLower(budget?.plan_type || budget?.type || "");
          const budgetCategory = normalizeLower(budget?.category || budget?.budget_category || budget?.title || budget?.name || "");

          return (
            rowMonth === budgetMonth &&
            rowPlanType === budgetPlanType &&
            rowCategory === budgetCategory
          );
        });

        if (existingIndex >= 0) {
          nextBudgets[existingIndex] = {
            ...nextBudgets[existingIndex],
            ...row,
          };
        } else {
          nextBudgets.unshift(row);
        }
      });

      return nextBudgets;
    });
  }, []);

  const saveBudgetInline = useCallback(async ({ finish = false, exitAfterSave = false, saveCategory = true } = {}) => {
    const categoryName = normalizeString(financeForm.budgetCategoryName || financeForm.title);
    const categoryAmount = Number(financeForm.totalBudget);
    const declaredAmount = Number(financeForm.monthlyBudgetAmount);
    const existingCategory = financeModal?.payload || null;
    const monthKey = getPHMonthKey();
    const shouldSaveCategory = saveCategory && Boolean(categoryName || financeForm.totalBudget || existingCategory?.id);

    if (!Number.isFinite(declaredAmount) || declaredAmount <= 0) {
      showFinanceNotice("Please enter a valid declared monthly budget amount.");
      return false;
    }

    if (shouldSaveCategory && !categoryName) {
      showFinanceNotice("Please enter a budget category name.");
      return false;
    }

    if (shouldSaveCategory && (!Number.isFinite(categoryAmount) || categoryAmount <= 0)) {
      showFinanceNotice("Please enter a valid allocated amount.");
      return false;
    }

    const currentAllocated = firstValidNumber(monthlyBudgetPlan?.allocated_amount, monthlyBudgetPlan?.allocated_total);
    const existingAllocation = existingCategory?.id ? getBudgetTotal(existingCategory) : 0;
    const projectedAllocated = shouldSaveCategory
      ? currentAllocated - existingAllocation + categoryAmount
      : currentAllocated;
    const remainingToAllocate = Math.max(declaredAmount - (currentAllocated - existingAllocation), 0);
    const projectedUnallocated = Math.max(declaredAmount - projectedAllocated, 0);

    if (projectedAllocated > declaredAmount) {
      showFinanceNotice(
        `This exceeds your declared monthly budget. You only have ${fmt(remainingToAllocate)} left to allocate.`
      );
      return false;
    }

    if (finish && projectedUnallocated > 0) {
      showFinanceNotice(`Assign the remaining ${fmt(projectedUnallocated)} before completing your budget.`);
      return false;
    }

    if (finish && projectedAllocated !== declaredAmount) {
      showFinanceNotice("Finish Budget is only available when your unallocated balance is exactly ₱0.");
      return false;
    }

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      const complete = finish && projectedAllocated === declaredAmount && projectedUnallocated === 0;
      const nextStatus = complete ? "active" : "draft";

      const headerPayload = {
        is_active: true,
        status: nextStatus,
        is_complete: complete,
        is_plan_header: true,
        plan_type: "monthly_budget",
        month: monthKey,
        category: "__monthly_budget__",
        budget_category: "__monthly_budget__",
        title: "Monthly Spending Plan",
        name: "Monthly Spending Plan",
        declared_amount: declaredAmount,
        declared_budget: declaredAmount,
        monthly_budget_amount: declaredAmount,
        total_budget: declaredAmount,
        updated_at: nowIso,
        user_id: user?.id || monthlyBudgetHeader?.user_id || null,
        user_email: user?.email || monthlyBudgetHeader?.user_email || monthlyBudgetHeader?.email || null,
        email: user?.email || monthlyBudgetHeader?.email || null,
        created_by: user?.email || monthlyBudgetHeader?.created_by || null,
      };

      if (monthlyBudgetHeader?.id) {
        await updateBudgetData?.(String(monthlyBudgetHeader.id), headerPayload);
      } else {
        await addBudgetData?.({
          ...headerPayload,
          tracking_start_date: nowIso,
          range_start: nowIso,
          created_at: nowIso,
        });
      }

      const optimisticBudgetRows = [
        {
          ...(monthlyBudgetHeader || {}),
          ...headerPayload,
          id: monthlyBudgetHeader?.id || `local_monthly_budget_${monthKey}`,
          created_at: monthlyBudgetHeader?.created_at || nowIso,
        },
      ];

      if (shouldSaveCategory) {
        const payload = {
          is_active: true,
          status: nextStatus,
          is_complete: complete,
          is_plan_header: false,
          plan_type: "budget_category",
          month: normalizeString(existingCategory?.month || existingCategory?.budget_month || monthKey) || monthKey,
          category: categoryName,
          budget_category: categoryName,
          title: categoryName,
          name: categoryName,
          allocated_amount: categoryAmount,
          budget_amount: categoryAmount,
          total_budget: categoryAmount,
          declared_amount: declaredAmount,
          declared_budget: declaredAmount,
          monthly_budget_amount: declaredAmount,
          need_type: getBudgetNeedType({ ...existingCategory, category: categoryName }),
          sort_order: firstValidNumber(existingCategory?.sort_order, existingCategory?.display_order, budgets.length + 1),
          updated_at: nowIso,
          user_id: user?.id || existingCategory?.user_id || null,
          user_email: user?.email || existingCategory?.user_email || existingCategory?.email || null,
          email: user?.email || existingCategory?.email || null,
          created_by: user?.email || existingCategory?.created_by || null,
        };

        if (existingCategory?.id) {
          await updateBudgetData?.(String(existingCategory.id), payload);
        } else {
          await addBudgetData?.({
            ...payload,
            tracking_start_date: nowIso,
            range_start: nowIso,
            created_at: nowIso,
          });
        }

        optimisticBudgetRows.push({
          ...(existingCategory || {}),
          ...payload,
          id: existingCategory?.id || `local_budget_category_${Date.now()}`,
          created_at: existingCategory?.created_at || nowIso,
        });
      }

      syncBudgetRowsIntoState(optimisticBudgetRows);

      if (complete && monthlyBudgetPlan.categories.length) {
        const categoryIds = monthlyBudgetPlan.categories.map((item) => item.id).filter(Boolean);
        if (categoryIds.length) {
          await Promise.all(
            categoryIds.map((id) =>
              updateBudgetData?.(String(id), {
                status: "active",
                is_complete: true,
                updated_at: nowIso,
              })
            )
          );
        }
      }

      await refreshFinanceSection();
      setExpandedFinanceCard("budgets");
      setBudgetExitConfirm(false);

      if (exitAfterSave || complete) {
        closeFinanceModal();
      } else {
        setFinanceModal({ type: "save_budget", payload: null });
        setFinanceForm((prev) => ({
          ...prev,
          title: "",
          budgetCategoryName: "",
          totalBudget: "",
          monthlyBudgetAmount: String(declaredAmount),
        }));
      }

      showFinanceNotice(
        complete
          ? "Budget completed. Planned expense logging is now unlocked."
          : shouldSaveCategory
            ? "Category saved as draft. Keep assigning the remaining budget."
            : "Budget draft saved. You can continue later.",
        "success"
      );
      return true;
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to save monthly budget plan.");
      return false;
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    budgets.length,
    closeFinanceModal,
    financeForm.budgetCategoryName,
    financeForm.monthlyBudgetAmount,
    financeForm.title,
    financeForm.totalBudget,
    financeModal?.payload,
    monthlyBudgetHeader,
    monthlyBudgetPlan?.allocated_amount,
    monthlyBudgetPlan?.allocated_total,
    monthlyBudgetPlan.categories,
    refreshFinanceSection,
    showFinanceNotice,
    syncBudgetRowsIntoState,
    addBudgetData,
    updateBudgetData,
    user?.email,
    user?.id,
  ]);

  const handleBudgetModalClose = useCallback(() => {
    const declaredAmount = firstValidNumber(financeForm.monthlyBudgetAmount, monthlyBudgetPlan.declared_budget);
    const isIncomplete =
      financeModal.type === "save_budget" &&
      declaredAmount > 0 &&
      !budgetPlanIsComplete;

    if (isIncomplete && !budgetExitConfirm) {
      setBudgetExitConfirm(true);
      return;
    }

    closeFinanceModal();
  }, [
    budgetExitConfirm,
    budgetPlanIsComplete,
    closeFinanceModal,
    financeForm.monthlyBudgetAmount,
    financeModal.type,
    monthlyBudgetPlan.declared_budget,
  ]);

  const deleteBudgetCategoryInline = useCallback(async () => {
    const item = financeModal?.payload || null;
    if (!item?.id) return;

    try {
      setFinanceActionLoading(true);
      const monthRange = getPHMonthRange();
      const categoryName = getBudgetListTitle(item);
      const linkedExpenseCount = expenses.filter((expense) => {
        const status = normalizeLower(expense?.planning_status);
        if (status && status !== "planned") return false;

        const expenseBudgetId = normalizeString(expense?.budget_category_id || expense?.budget_item_id || "");
        const expenseCategory = normalizeString(expense?.budget_category || expense?.expense_category || expense?.category || "");
        const linkedById = expenseBudgetId && expenseBudgetId === normalizeString(item.id);
        const linkedByCategory = normalizeLower(expenseCategory) === normalizeLower(categoryName);

        return (linkedById || linkedByCategory) && isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end);
      }).length;

      if (linkedExpenseCount > 0) {
        await updateBudgetData?.(String(item.id), {
          is_active: false,
          status: "inactive",
          updated_at: new Date().toISOString(),
        });
      } else {
        await deleteBudgetData?.(String(item.id));
      }

      await refreshFinanceSection();
      setExpandedFinanceCard("budgets");
      closeFinanceModal();
      showFinanceNotice(
        linkedExpenseCount > 0
          ? "Budget category has linked expenses, so it was deactivated."
          : "Budget category deleted.",
        "success"
      );
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to remove budget category.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    expenses,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
  ]);

  const resetBudgetInline = useCallback(async () => {
    const currentMonthKey = getPHMonthKey();
    const categoryIds = manualExpenseBudgetOptions
      .map((item) => item.id)
      .filter(Boolean);

    if (!categoryIds.length) return;

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      await Promise.all(
        categoryIds.map((id) =>
          updateBudgetData?.(String(id), {
            tracking_start_date: nowIso,
            range_start: nowIso,
            updated_at: nowIso,
          })
        )
      );

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice(`Budget tracking has been reset for ${currentMonthKey}.`, "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to reset budget.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, manualExpenseBudgetOptions, refreshFinanceSection, showFinanceNotice]);

  const saveSavingsGoalInline = useCallback(async () => {
    const goal = financeModal?.payload || null;
    const title = normalizeString(financeForm.title);
    const targetAmount = Number(financeForm.targetAmount);

    if (!title) {
      showFinanceNotice("Please enter a goal title.");
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      showFinanceNotice("Please enter a valid target amount.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      const currentSavedAmount = Math.max(
        0,
        Number(financeForm.amount || goal?.saved_amount || goal?.current_amount || goal?.saved || 0)
      );
      const payload = {
        title,
        target_amount: targetAmount,
        saved_amount: currentSavedAmount,
        current_amount: currentSavedAmount,
        category: financeForm.category || "",
        subcategory: financeForm.subcategory || "",
        notes: financeForm.notes || "",
        wallet_id: financeForm.savingsWalletId || null,
        planned_use_date: financeForm.plannedUseDate || null,
        deadline: financeForm.plannedUseDate || null,
        reason_one: financeForm.reasonOne || "",
        reason_two: financeForm.reasonTwo || "",
        reason_three: financeForm.reasonThree || "",
        emotional_value: financeForm.emotionalValue || "joy",
        priority: financeForm.priority || "medium",
        flexibility: financeForm.flexibility || "flexible",
        created_by: user?.email || null,
        user_email: user?.email || null,
        user_id: user?.id || null,
        updated_date: new Date().toISOString(),
      };

      if (goal?.id) {
        await updateSavingsGoalData?.(String(goal.id), payload);
      } else {
        await addSavingsGoalData?.({
          id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          ...payload,
          created_date: new Date().toISOString(),
        });
      }

      await refreshFinanceSection();
      setExpandedFinanceCard("savings");
      closeFinanceModal();
      showFinanceNotice("Savings goal saved successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to save savings goal.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeForm.category,
    financeForm.emotionalValue,
    financeForm.flexibility,
    financeForm.notes,
    financeForm.plannedUseDate,
    financeForm.priority,
    financeForm.reasonOne,
    financeForm.reasonThree,
    financeForm.reasonTwo,
    financeForm.savingsWalletId,
    financeForm.subcategory,
    financeForm.targetAmount,
    financeForm.title,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    addSavingsGoalData,
    updateSavingsGoalData,
  ]);

  const deleteSavingsGoalInline = useCallback(async () => {
    const goalId = financeModal?.payload?.id;
    if (!goalId) return;

    try {
      setFinanceActionLoading(true);
      await deleteSavingsGoalData?.(String(goalId));

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Savings goal deleted.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to delete savings goal.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice, deleteSavingsGoalData]);

  const addSavingsInline = useCallback(async () => {
    const goal = financeModal?.payload;
    const sourceWallet = wallets.find(
      (wallet) => String(wallet.id) === String(financeForm.savingsWalletId)
    );
    const amount = Number(financeForm.amount);

    if (!goal) return;

    if (!sourceWallet) {
      showFinanceNotice("Please select a valid source wallet.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid amount.");
      return;
    }

    const currentSaved = getSavingsSaved(goal);
    const target = getSavingsTarget(goal);
    const remaining = Math.max(target - currentSaved, 0);

    if (remaining <= 0) {
      showFinanceNotice("This goal is already fully funded.");
      return;
    }

    const finalAmount = Math.min(amount, remaining);

    if (getWalletDisplayBalance(sourceWallet) < finalAmount) {
      showFinanceNotice("Not enough balance in the selected wallet.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await addExpenseData?.({
        wallet_id: String(sourceWallet.id),
        type: "savings_goal",
        amount: finalAmount,
        category: "Savings Goal",
        need_type: "other",
        planning_status: "planned",
        notes: `Moved to savings goal: ${goal.title}`,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await updateSavingsGoalData?.(String(goal.id), {
        saved_amount: Math.min(currentSaved + finalAmount, target),
        current_amount: Math.min(currentSaved + finalAmount, target),
        wallet_id: sourceWallet.id,
        updated_date: new Date().toISOString(),
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Savings added successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to add savings.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeForm.savingsWalletId,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    wallets,
    addExpenseData,
    updateSavingsGoalData,
  ]);

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
      <style>{`
        .theme-page-shell {
          overscroll-behavior-x: auto;
          scroll-padding-bottom: 0;
        }

        .clara-theme-nav-pill-active {
          background:
            radial-gradient(circle at top, color-mix(in srgb, var(--theme-glow) 22%, transparent), transparent 58%),
            color-mix(in srgb, var(--theme-glow) 14%, rgba(255, 255, 255, 0.08)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            0 0 18px color-mix(in srgb, var(--theme-glow) 16%, transparent);
        }

        .clara-theme-nav-pill-active .clara-theme-nav-icon-shell {
          border-color: color-mix(in srgb, var(--theme-glow) 58%, rgba(255, 255, 255, 0.18)) !important;
          background:
            radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.26), transparent 34%),
            radial-gradient(circle at 64% 78%, color-mix(in srgb, var(--theme-glow) 34%, transparent), transparent 50%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-glow) 30%, rgba(255, 255, 255, 0.11)),
              color-mix(in srgb, var(--theme-glow) 16%, rgba(255, 255, 255, 0.055))
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 0 0 1px color-mix(in srgb, var(--theme-glow) 14%, transparent),
            0 0 26px color-mix(in srgb, var(--theme-glow) 28%, transparent) !important;
          color: color-mix(in srgb, var(--theme-glow) 22%, white) !important;
        }

        .clara-theme-nav-pill-active .clara-theme-nav-icon-shell-light {
          background:
            radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.78), transparent 34%),
            radial-gradient(circle at 64% 78%, color-mix(in srgb, var(--theme-glow) 25%, transparent), transparent 50%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-glow) 18%, rgba(255, 255, 255, 0.94)),
              rgba(248, 250, 252, 0.88)
            ) !important;
          color: color-mix(in srgb, var(--theme-glow) 48%, rgb(15, 23, 42)) !important;
        }


        .clara-theme-nav-icon-shell {
          --clara-nav-icon-accent: var(--theme-glow, #22d3ee);
          border-color: color-mix(in srgb, var(--clara-nav-icon-accent) 34%, rgba(255, 255, 255, 0.14)) !important;
          background:
            radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.20), transparent 34%),
            radial-gradient(circle at 62% 76%, color-mix(in srgb, var(--clara-nav-icon-accent) 20%, transparent), transparent 48%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--clara-nav-icon-accent) 16%, rgba(255, 255, 255, 0.075)),
              color-mix(in srgb, var(--clara-nav-icon-accent) 9%, rgba(255, 255, 255, 0.035))
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 0 0 1px color-mix(in srgb, var(--clara-nav-icon-accent) 8%, transparent),
            0 0 18px color-mix(in srgb, var(--clara-nav-icon-accent) 13%, transparent) !important;
          color: color-mix(in srgb, var(--clara-nav-icon-accent) 18%, white) !important;
        }

        .clara-theme-nav-icon-shell-light {
          border-color: color-mix(in srgb, var(--clara-nav-icon-accent) 32%, rgba(148, 163, 184, 0.38)) !important;
          background:
            radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.72), transparent 34%),
            radial-gradient(circle at 62% 76%, color-mix(in srgb, var(--clara-nav-icon-accent) 18%, transparent), transparent 48%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--clara-nav-icon-accent) 12%, rgba(255, 255, 255, 0.92)),
              rgba(248, 250, 252, 0.84)
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.80),
            0 8px 20px rgba(15, 23, 42, 0.08),
            0 0 18px color-mix(in srgb, var(--clara-nav-icon-accent) 12%, transparent) !important;
          color: color-mix(in srgb, var(--clara-nav-icon-accent) 42%, rgb(15, 23, 42)) !important;
        }

        .group:hover .clara-theme-nav-icon-shell {
          border-color: color-mix(in srgb, var(--clara-nav-icon-accent) 48%, rgba(255, 255, 255, 0.20)) !important;
          background:
            radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.24), transparent 34%),
            radial-gradient(circle at 62% 76%, color-mix(in srgb, var(--clara-nav-icon-accent) 28%, transparent), transparent 50%),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--clara-nav-icon-accent) 22%, rgba(255, 255, 255, 0.09)),
              color-mix(in srgb, var(--clara-nav-icon-accent) 12%, rgba(255, 255, 255, 0.045))
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 0 0 1px color-mix(in srgb, var(--clara-nav-icon-accent) 10%, transparent),
            0 0 24px color-mix(in srgb, var(--clara-nav-icon-accent) 22%, transparent) !important;
        }

        .clara-performance-mode .clara-theme-nav-icon-shell {
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--theme-glow) 10%, rgba(255, 255, 255, 0.055)),
              rgba(255, 255, 255, 0.035)
            ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 6px 14px rgba(0, 0, 0, 0.16) !important;
        }


        [data-emergency-card] button[aria-label*="CLARA AI"] {
          --clara-orb-accent: var(--theme-glow, #22d3ee);
          --clara-orb-border: var(--theme-border, rgba(103, 232, 249, 0.38));
          --clara-orb-surface: var(--theme-gradient-money, var(--theme-gradient-hero));
          isolation: isolate;
          overflow: visible;
          border-color: color-mix(in srgb, var(--clara-orb-accent) 52%, rgba(255, 255, 255, 0.16)) !important;
          background:
            radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.32), transparent 28%),
            radial-gradient(circle at 63% 72%, color-mix(in srgb, var(--clara-orb-accent) 42%, transparent), transparent 42%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--clara-orb-accent) 18%, rgba(8, 22, 30, 0.84)),
              color-mix(in srgb, var(--clara-orb-accent) 26%, rgba(7, 35, 45, 0.70)) 48%,
              rgba(3, 13, 23, 0.84)
            ) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.09) inset,
            0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 10%, transparent),
            0 10px 28px rgba(0, 0, 0, 0.34),
            0 0 22px color-mix(in srgb, var(--clara-orb-accent) 34%, transparent) !important;
          color: color-mix(in srgb, var(--clara-orb-accent) 26%, white) !important;
          transform: translateZ(0);
          will-change: transform;
          animation: claraEmergencyOrbBreath 2.8s ease-in-out infinite;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]::before {
          content: "";
          position: absolute;
          inset: -6px;
          z-index: -1;
          border-radius: 9999px;
          background:
            radial-gradient(
              circle,
              color-mix(in srgb, var(--clara-orb-accent) 36%, transparent),
              color-mix(in srgb, var(--clara-orb-accent) 14%, transparent) 48%,
              transparent 70%
            );
          opacity: 0.68;
          transform: scale(0.96);
          animation: claraEmergencyOrbHalo 2.8s ease-in-out infinite;
          pointer-events: none;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]::after {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 9999px;
          border: 1px solid color-mix(in srgb, var(--clara-orb-accent) 28%, rgba(255, 255, 255, 0.16));
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.20), transparent 34%),
            radial-gradient(circle at 50% 64%, color-mix(in srgb, var(--clara-orb-accent) 26%, transparent), transparent 50%);
          opacity: 0.88;
          pointer-events: none;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"] > span:first-of-type {
          inset: -4px !important;
          border-radius: 9999px !important;
          background: radial-gradient(circle, color-mix(in srgb, var(--clara-orb-accent) 34%, transparent), transparent 66%) !important;
          filter: blur(8px) !important;
          opacity: 0.52 !important;
          animation: claraEmergencyOrbSoftGlow 2.8s ease-in-out infinite !important;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"] > span:nth-of-type(2) {
          inset: 4px !important;
          border-radius: 9999px !important;
          background:
            radial-gradient(circle at 38% 24%, rgba(255, 255, 255, 0.30), transparent 30%),
            radial-gradient(circle at 56% 64%, color-mix(in srgb, var(--clara-orb-accent) 30%, transparent), transparent 48%) !important;
          opacity: 0.76 !important;
          animation: claraEmergencyOrbInner 2.8s ease-in-out infinite !important;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"] svg {
          color: color-mix(in srgb, var(--clara-orb-accent) 22%, white) !important;
          filter: drop-shadow(0 0 7px color-mix(in srgb, var(--clara-orb-accent) 72%, transparent));
          transform: translateZ(0);
          animation: claraEmergencyOrbIconGlow 2.8s ease-in-out infinite;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]:hover {
          border-color: color-mix(in srgb, var(--clara-orb-accent) 64%, rgba(255, 255, 255, 0.18)) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.11) inset,
            0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 13%, transparent),
            0 12px 30px rgba(0, 0, 0, 0.36),
            0 0 27px color-mix(in srgb, var(--clara-orb-accent) 42%, transparent) !important;
        }

        [data-emergency-card] button[aria-label*="CLARA AI"]:active {
          transform: scale(0.94) translateZ(0) !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"],
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::before,
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::after,
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] > span,
        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] svg {
          animation: none !important;
          transition-duration: 0ms !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] {
          border-color: color-mix(in srgb, var(--clara-orb-accent) 42%, rgba(255, 255, 255, 0.12)) !important;
          background:
            radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.17), transparent 31%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--clara-orb-accent) 14%, rgba(8, 26, 34, 0.78)),
              rgba(5, 18, 28, 0.84)
            ) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.07) inset,
            0 8px 18px rgba(0, 0, 0, 0.22),
            0 0 16px color-mix(in srgb, var(--clara-orb-accent) 18%, transparent) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          will-change: auto;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::before {
          opacity: 0 !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"]::after {
          opacity: 0.58 !important;
          background: transparent !important;
          border-color: color-mix(in srgb, var(--clara-orb-accent) 22%, rgba(255, 255, 255, 0.10)) !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] > span:first-of-type {
          opacity: 0 !important;
          filter: none !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] > span:nth-of-type(2) {
          opacity: 0.26 !important;
          filter: none !important;
          background: radial-gradient(circle, color-mix(in srgb, var(--clara-orb-accent) 22%, transparent), transparent 58%) !important;
        }

        .clara-performance-mode [data-emergency-card] button[aria-label*="CLARA AI"] svg {
          filter: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-emergency-card] button[aria-label*="CLARA AI"],
          [data-emergency-card] button[aria-label*="CLARA AI"]::before,
          [data-emergency-card] button[aria-label*="CLARA AI"]::after,
          [data-emergency-card] button[aria-label*="CLARA AI"] > span,
          [data-emergency-card] button[aria-label*="CLARA AI"] svg {
            animation: none !important;
            transition-duration: 0ms !important;
          }

          [data-emergency-card] button[aria-label*="CLARA AI"] {
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.08) inset,
              0 8px 18px rgba(0, 0, 0, 0.24),
              0 0 16px color-mix(in srgb, var(--clara-orb-accent) 18%, transparent) !important;
            will-change: auto;
          }
        }

        @keyframes claraEmergencyOrbBreath {
          0%, 100% {
            transform: scale(1) translateZ(0);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.09) inset,
              0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 10%, transparent),
              0 10px 28px rgba(0, 0, 0, 0.34),
              0 0 18px color-mix(in srgb, var(--clara-orb-accent) 26%, transparent) !important;
          }
          45% {
            transform: scale(1.028) translateZ(0);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.13) inset,
              0 0 0 6px color-mix(in srgb, var(--clara-orb-accent) 17%, transparent),
              0 11px 30px rgba(0, 0, 0, 0.36),
              0 0 30px color-mix(in srgb, var(--clara-orb-accent) 54%, transparent) !important;
          }
          62% {
            transform: scale(1.012) translateZ(0);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.11) inset,
              0 0 0 5px color-mix(in srgb, var(--clara-orb-accent) 13%, transparent),
              0 10px 29px rgba(0, 0, 0, 0.35),
              0 0 24px color-mix(in srgb, var(--clara-orb-accent) 40%, transparent) !important;
          }
        }

        @keyframes claraEmergencyOrbHalo {
          0%, 100% {
            opacity: 0.42;
            transform: scale(0.94);
            filter: blur(0px);
          }
          45% {
            opacity: 0.92;
            transform: scale(1.13);
            filter: blur(1px);
          }
          62% {
            opacity: 0.62;
            transform: scale(1.04);
            filter: blur(0px);
          }
        }

        @keyframes claraEmergencyOrbSoftGlow {
          0%, 100% { opacity: 0.36; transform: scale(0.96); }
          45% { opacity: 0.78; transform: scale(1.13); }
          62% { opacity: 0.54; transform: scale(1.04); }
        }

        @keyframes claraEmergencyOrbInner {
          0%, 100% { opacity: 0.58; transform: scale(0.98); }
          45% { opacity: 0.92; transform: scale(1.035); }
          62% { opacity: 0.72; transform: scale(1.01); }
        }

        @keyframes claraEmergencyOrbIconGlow {
          0%, 100% {
            opacity: 0.86;
            transform: scale(1) translateZ(0);
            filter: drop-shadow(0 0 6px color-mix(in srgb, var(--clara-orb-accent) 58%, transparent));
          }
          45% {
            opacity: 1;
            transform: scale(1.08) translateZ(0);
            filter: drop-shadow(0 0 12px color-mix(in srgb, var(--clara-orb-accent) 88%, transparent));
          }
          62% {
            opacity: 0.96;
            transform: scale(1.035) translateZ(0);
            filter: drop-shadow(0 0 9px color-mix(in srgb, var(--clara-orb-accent) 72%, transparent));
          }
        }
        @keyframes claraDashboardPanelForwardIn {
          0% { opacity: 0; transform: translate3d(32px, 0, 0) scale(0.985); filter: blur(5px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        @keyframes claraDashboardPanelReverseIn {
          0% { opacity: 0; transform: translate3d(-32px, 0, 0) scale(0.985); filter: blur(5px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
      `}</style>
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


      <FinanceActionModal
        open={financeModal.type === "create_wallet"}
        title="Where will your money live?"
        description="Create a new money container inside your CLARA system."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          createWalletInline();
        }}
        submitLabel="Create wallet →"
        loading={financeActionLoading}
      >
        <FinanceField label="Wallet name">
          <input
            type="text"
            value={financeForm.name}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="e.g. GCash, Cash, Payroll"
            className={financeInputClassName}
          />
        </FinanceField>

        <FinanceField
          label="Wallet type"
          helper="Choose the closest type so CLARA can organize your money clearly."
        >
          <div className="space-y-3">
            <select
              value={financeForm.type}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  type: event.target.value,
                  customWalletType:
                    event.target.value === "custom" ? prev.customWalletType : "",
                }))
              }
              className={financeInputClassName}
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank">Bank</option>
              <option value="payroll">Payroll</option>
              <option value="savings">Savings</option>
              <option value="allowance">Allowance</option>
              <option value="business">Business</option>
              <option value="credit_card">Credit Card</option>
              <option value="custom">Custom</option>
            </select>

            {financeForm.type === "custom" ? (
              <input
                type="text"
                value={financeForm.customWalletType}
                onChange={(event) =>
                  setFinanceForm((prev) => ({
                    ...prev,
                    customWalletType: event.target.value,
                  }))
                }
                placeholder="e.g. Loan Wallet, Travel Fund, Side Hustle"
                className={financeInputClassName}
              />
            ) : null}
          </div>
        </FinanceField>

        <FinanceField label="Starting balance">
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.startingBalance}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                startingBalance: event.target.value,
              }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "delete_wallet"}
        title="Delete wallet"
        description={`Remove ${getWalletDisplayName(financeModal.payload)} from your wallet list?`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          deleteWalletInline();
        }}
        submitLabel="Delete wallet"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This will remove the selected wallet from the dashboard. Use this only when you are sure.
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "add_money"}
        title="Add money"
        description={`Add funds to ${getWalletDisplayName(financeModal.payload)}.`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          addMoneyInline();
        }}
        submitLabel="Add money"
        loading={financeActionLoading}
      >
        <FinanceField
          label="Amount"
          helper={`Current balance: ${fmt(getWalletDisplayBalance(financeModal.payload))}`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.amount}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "transfer_money"}
        title="Transfer money"
        description={`Move funds from ${getWalletDisplayName(financeModal.payload)} to another wallet.`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          transferMoneyInline();
        }}
        submitLabel="Transfer"
        loading={financeActionLoading}
      >
        <FinanceField label="Destination wallet">
          <select
            value={financeForm.destinationWalletId}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                destinationWalletId: event.target.value,
              }))
            }
            className={financeInputClassName}
          >
            {wallets
              .filter(
                (wallet) =>
                  String(wallet.id) !== String(financeModal.payload?.id)
              )
              .map((wallet) => (
                <option key={wallet.id} value={String(wallet.id)}>
                  {getWalletDisplayName(wallet)} • {fmt(getWalletDisplayBalance(wallet))}
                </option>
              ))}
          </select>
        </FinanceField>

        <FinanceField
          label="Amount"
          helper={`Available: ${fmt(getWalletDisplayBalance(financeModal.payload))}`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.amount}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      <ManualExpenseFullScreenSheet
        open={financeModal.type === "manual_expense"}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          saveManualExpenseInline();
        }}
        submitDisabled={!manualExpenseCanSubmit}
        loading={financeActionLoading}
      >
        <FinanceField label="Amount">
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.amount}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0"
            className={`${financeInputClassName} min-h-[68px] rounded-[24px] px-5 text-3xl font-bold tracking-tight placeholder:text-white/25 focus:border-emerald-300/40 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.10)]`}
          />
        </FinanceField>

        <FinanceField
          label="Budget List"
          helper="Choose where this expense belongs in your active monthly budget."
        >
          <QuickActionDropdown
            value={financeForm.budgetListKey}
            placeholder="Select budget list"
            ariaLabel="Select budget list"
            options={manualExpenseBudgetListItems.map((item) => ({
              value: item.key,
              label: item.title,
              subtitle: item.subtitle,
              tone: item.tone,
              disabled: item.disabled,
              onDisabledClick: () =>
                showFinanceNotice("You haven’t completed your monthly budgeting plan yet. Finish assigning your budget before logging planned expenses."),
            }))}
            onChange={(nextValue) => setManualExpenseBudgetListKey(nextValue)}
          />
        </FinanceField>

        <FinanceField label="Wallet">
          <QuickActionDropdown
            value={financeForm.expenseWalletId}
            placeholder="Select wallet"
            ariaLabel="Select wallet for expense"
            options={wallets.map((wallet) => ({
              value: String(wallet.id),
              label: getWalletDisplayName(wallet),
              subtitle: `Available • ${fmt(getWalletDisplayBalance(wallet))}`,
              tone: "neutral",
            }))}
            onChange={(nextValue) =>
              setFinanceForm((prev) => ({
                ...prev,
                expenseWalletId: nextValue,
              }))
            }
          />
        </FinanceField>

        {manualExpenseIsUnplanned ? (
          <div className="rounded-[24px] border border-amber-300/18 bg-amber-500/10 p-4 shadow-[0_14px_34px_rgba(245,158,11,0.08)]">
            <p className="mb-3 text-xs leading-5 text-amber-50/80">
              This is outside your monthly budget. Please explain the purpose before logging.
            </p>
            <FinanceField label="Purpose / Reason">
              <textarea
                rows={3}
                value={financeForm.unplannedReason || ""}
                onChange={(event) =>
                  setFinanceForm((prev) => ({
                    ...prev,
                    unplannedReason: event.target.value,
                    notes: event.target.value,
                  }))
                }
                placeholder="What is this for?"
                className={`${financeInputClassName} min-h-[96px] resize-none`}
              />
            </FinanceField>
          </div>
        ) : manualExpenseIsUndocumented ? (
          <div className="rounded-[24px] border border-cyan-300/18 bg-cyan-500/10 p-4 shadow-[0_14px_34px_rgba(34,211,238,0.08)]">
            <p className="mb-3 text-xs leading-5 text-cyan-50/80">
              No worries. Choose the closest reason so CLARA can keep your records clean.
            </p>

            <FinanceField label="Undocumented Reason">
              <QuickActionDropdown
                value={financeForm.undocumentedReason || ""}
                placeholder="Why is this undocumented?"
                ariaLabel="Select undocumented spending reason"
                options={UNDOCUMENTED_SPENDING_REASONS.map((reasonOption) => ({
                  value: reasonOption,
                  label: reasonOption,
                  tone: reasonOption === "Other undocumented reason" ? "cyan" : "neutral",
                }))}
                onChange={(nextValue) =>
                  setFinanceForm((prev) => ({
                    ...prev,
                    undocumentedReason: nextValue,
                  }))
                }
              />
            </FinanceField>

            {financeForm.undocumentedReason === "Other undocumented reason" ? (
              <div className="mt-3">
                <FinanceField label="Optional note">
                  <input
                    type="text"
                    value={financeForm.undocumentedNote || ""}
                    onChange={(event) =>
                      setFinanceForm((prev) => ({
                        ...prev,
                        undocumentedNote: event.target.value,
                      }))
                    }
                    placeholder="Add a short note, if needed"
                    className={financeInputClassName}
                  />
                </FinanceField>
              </div>
            ) : null}
          </div>
        ) : selectedManualExpenseBudget ? (
          <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-500/10 px-4 py-3 shadow-[0_14px_34px_rgba(16,185,129,0.08)] text-xs leading-5 text-emerald-50/75">
            This will be saved as a planned expense under {selectedManualExpenseBudget.title}.
          </div>
        ) : null}
      </ManualExpenseFullScreenSheet>

      <FinanceActionModal
        open={financeModal.type === "save_budget"}
        title={
          !monthlyBudgetPlan.declared_budget && !financeModal.payload?.id
            ? "Declare monthly budget"
            : financeModal.payload?.id
              ? "Edit budget category"
              : "Budget discipline mode"
        }
        description={
          !monthlyBudgetPlan.declared_budget && !financeModal.payload?.id
            ? "Start by declaring the total money you plan to spend this month."
            : `Assign every peso from your ${getPHMonthKey()} budget into categories.`
        }
        onClose={handleBudgetModalClose}
        onSubmit={(event) => {
          event.preventDefault();
          saveBudgetInline({ exitAfterSave: true, saveCategory: false });
        }}
        submitLabel="Save Draft"
        loading={financeActionLoading}
      >
        {budgetExitConfirm ? (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-bold text-amber-50">Your budget is not fully assigned yet.</p>
            <p className="mt-2 text-xs leading-5 text-amber-50/75">
              Save as draft before leaving so you can continue later.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={financeActionLoading}
                onClick={() => saveBudgetInline({ exitAfterSave: true, saveCategory: false })}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.22)] disabled:opacity-60"
              >
                Save Draft and Exit
              </button>
              <button
                type="button"
                onClick={() => setBudgetExitConfirm(false)}
                className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >
                Continue Budgeting
              </button>
            </div>
          </div>
        ) : null}

        <FinanceField
          label="Declared monthly budget amount"
          helper="This is the total money you plan to spend for the month."
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.monthlyBudgetAmount}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                monthlyBudgetAmount: event.target.value,
              }))
            }
            placeholder="25000"
            className={financeInputClassName}
          />
        </FinanceField>

        {budgetFormDeclaredAmount > 0 ? (
          <div className="rounded-3xl border border-white/15 bg-white/[0.075] p-4 text-xs leading-5 text-white/70">
            <div className="flex items-center justify-between gap-3">
              <span>Declared budget</span>
              <strong className="text-white">{fmt(budgetFormDeclaredAmount)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Allocated so far</span>
              <strong className="text-white">{fmt(budgetProjectedAllocated)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Unallocated balance</span>
              <strong className={budgetProjectedUnallocated === 0 ? "text-emerald-200" : "text-amber-100"}>
                {fmt(budgetProjectedUnallocated)}
              </strong>
            </div>

            {budgetFinishHelper ? (
              <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-50/80">
                {budgetFinishHelper}
              </p>
            ) : null}
          </div>
        ) : null}

        {budgetFormDeclaredAmount > 0 ? (
          <div className="rounded-3xl border border-white/15 bg-white/[0.035] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
              Add budget category
            </p>

            <div className="space-y-4">
              <FinanceField label="Category name">
                <input
                  type="text"
                  value={financeForm.budgetCategoryName || ""}
                  onChange={(event) =>
                    setFinanceForm((prev) => ({
                      ...prev,
                      budgetCategoryName: event.target.value,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Bills, Food, Transportation..."
                  className={financeInputClassName}
                />
              </FinanceField>

              <FinanceField label="Allocated amount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={financeForm.totalBudget}
                  onChange={(event) =>
                    setFinanceForm((prev) => ({
                      ...prev,
                      totalBudget: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className={financeInputClassName}
                />
              </FinanceField>

              <button
                type="button"
                disabled={financeActionLoading}
                onClick={() => saveBudgetInline({ exitAfterSave: false, saveCategory: true })}
                className="w-full rounded-2xl border border-emerald-300/20 bg-emerald-500/12 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/18 disabled:opacity-60"
              >
                {financeModal.payload?.id ? "Update Category" : "Add Category"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/15 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white">Added categories</p>
            <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/60">
              {monthlyBudgetPlan.categories.length}
            </span>
          </div>

          {monthlyBudgetPlan.categories.length ? (
            <div className="space-y-2">
              {monthlyBudgetPlan.categories.map((item) => (
                <div
                  key={item.key || item.id || item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/15 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{fmt(item.allocated)} allocated</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openBudgetModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.075] text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteBudgetCategoryModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-500/10 text-rose-100/80 transition hover:bg-rose-500/15 hover:text-rose-100"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-black/15 px-4 py-4 text-sm text-white/55">
              No categories added yet.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={financeActionLoading}
            onClick={() => saveBudgetInline({ exitAfterSave: true, saveCategory: false })}
            className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={!budgetCanFinish || financeActionLoading}
            onClick={() => saveBudgetInline({ finish: true, exitAfterSave: true, saveCategory: false })}
            className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Finish Budget
          </button>
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "delete_budget_category"}
        title="Remove budget category"
        description="If this category already has linked expenses, CLARA will deactivate it instead of deleting history."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          deleteBudgetCategoryInline();
        }}
        submitLabel="Remove category"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Remove {financeModal.payload ? getBudgetListTitle(financeModal.payload) : "this category"} from this month’s spending plan?
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "reset_budget"}
        title="Reset budget tracking"
        description="Start the active budget tracking window from right now."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          resetBudgetInline();
        }}
        submitLabel="Reset tracking"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-yellow-400/15 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
          This keeps your budget setup, but it resets the tracking start date to now.
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "save_savings_goal"}
        title={financeModal.payload?.id ? "Edit savings goal" : "New Savings Goal"}
        description={null}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          saveSavingsGoalInline();
        }}
        submitLabel={financeModal.payload?.id ? "Save changes" : "Create goal"}
        loading={financeActionLoading}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FinanceField label="Goal title">
            <input
              type="text"
              value={financeForm.title}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="e.g., Emergency Fund, Dream Vacation"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Category">
            <input
              type="text"
              value={financeForm.category || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="e.g. Travel, Emergency, Gadget"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Subcategory">
            <input
              type="text"
              value={financeForm.subcategory || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, subcategory: event.target.value }))
              }
              placeholder="e.g. Local Trip, Repairs, Phone"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Target amount">
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeForm.targetAmount}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  targetAmount: event.target.value,
                }))
              }
              placeholder="Target ₱"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Already saved">
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeForm.amount}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  amount: event.target.value,
                }))
              }
              placeholder="0"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Source wallet">
            <select
              value={financeForm.savingsWalletId || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  savingsWalletId: event.target.value,
                }))
              }
              className={financeInputClassName}
            >
              <option value="">Select wallet...</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={String(wallet.id)}>
                  {getWalletDisplayName(wallet)}
                </option>
              ))}
            </select>
          </FinanceField>

          <FinanceField label="Planned use date">
            <input
              type="date"
              value={financeForm.plannedUseDate || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  plannedUseDate: event.target.value,
                }))
              }
              className={financeInputClassName}
            />
          </FinanceField>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
            3 reasons / motivations
          </p>

          <input
            type="text"
            value={financeForm.reasonOne || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, reasonOne: event.target.value }))
            }
            placeholder="Reason 1"
            className={financeInputClassName}
          />

          <input
            type="text"
            value={financeForm.reasonTwo || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, reasonTwo: event.target.value }))
            }
            placeholder="Reason 2"
            className={financeInputClassName}
          />

          <input
            type="text"
            value={financeForm.reasonThree || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, reasonThree: event.target.value }))
            }
            placeholder="Reason 3"
            className={financeInputClassName}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FinanceField label="Emotional value">
            <select
              value={financeForm.emotionalValue || "joy"}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  emotionalValue: event.target.value,
                }))
              }
              className={financeInputClassName}
            >
              <option value="joy">Joy 😊</option>
              <option value="peace">Peace 😌</option>
              <option value="security">Security 🛡️</option>
              <option value="freedom">Freedom ✨</option>
              <option value="love">Love ❤️</option>
            </select>
          </FinanceField>

          <FinanceField label="Priority">
            <select
              value={financeForm.priority || "medium"}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  priority: event.target.value,
                }))
              }
              className={financeInputClassName}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FinanceField>

          <FinanceField label="Flexibility">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFinanceForm((prev) => ({ ...prev, flexibility: "flexible" }))
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  (financeForm.flexibility || "flexible") === "flexible"
                    ? "border-emerald-400/30 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
                    : "border-white/15 bg-white/[0.075] text-white/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Flexible
              </button>

              <button
                type="button"
                onClick={() =>
                  setFinanceForm((prev) => ({ ...prev, flexibility: "must_have" }))
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  (financeForm.flexibility || "flexible") === "must_have"
                    ? "border-emerald-400/30 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
                    : "border-white/15 bg-white/[0.075] text-white/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Must Have
              </button>
            </div>
          </FinanceField>
        </div>

        <FinanceField label="Notes">
          <textarea
            rows={4}
            value={financeForm.notes || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Add extra context, reminders, or details for this goal."
            className={`${financeInputClassName} resize-none`}
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "delete_savings_goal"}
        title="Delete savings goal"
        description={`Remove ${getSavingsGoalTitle(financeModal.payload)} from your savings list?`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          deleteSavingsGoalInline();
        }}
        submitLabel="Delete goal"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This deletes the selected goal from the card details section.
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "add_savings"}
        title="Add to savings goal"
        description={`Move money into ${getSavingsGoalTitle(financeModal.payload)} using one of your wallets.`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          addSavingsInline();
        }}
        submitLabel="Add savings"
        loading={financeActionLoading}
      >
        <FinanceField label="Source wallet">
          <select
            value={financeForm.savingsWalletId}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                savingsWalletId: event.target.value,
              }))
            }
            className={financeInputClassName}
          >
            {wallets
              .filter((wallet) => getWalletDisplayBalance(wallet) > 0)
              .map((wallet) => (
                <option key={wallet.id} value={String(wallet.id)}>
                  {getWalletDisplayName(wallet)} • {fmt(getWalletDisplayBalance(wallet))}
                </option>
              ))}
          </select>
        </FinanceField>

        <FinanceField
          label="Amount"
          helper={`Remaining target: ${fmt(
            Math.max(
              getSavingsTarget(financeModal.payload) -
                getSavingsSaved(financeModal.payload),
              0
            )
          )}`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.amount}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      {dashboardShellReady ? (
        <ClaraAssistantPanel
          open={showAiAssistant}
          onClose={() => setShowAiAssistant(false)}
          context={claraAssistantContext}
        />
      ) : null}

      </DashboardModalLayer>
    </DashboardShell>
  );
}
