import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Settings,
  Clock,
  Play,
  FileText,
  ExternalLink,
  Image as ImageIcon,
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
  Eye,
  EyeOff,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import EmergencyFundCard from "../components/EmergencyFundCard";
import WalletCard from "../components/WalletCard";
import BudgetCard from "../components/BudgetCard";
import SavingsCard from "../components/SavingsCard";
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
import { getWalletBalance } from "@/utils/financialEngine";

const normalizeString = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeString(value).toLowerCase();
const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MINUTES = 8 * 60;
const DEBUG_FINANCE_DIAGNOSTICS = false;

const FINANCE_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "shopping",
  "health",
  "education",
  "personal",
  "other",
];

const INCOME_TRANSACTION_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

const createFinanceId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error("Unable to generate a valid UUID on this device.");
};


const isClaraOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

const createLocalOnlyExpenseRecord = (payload) => ({
  ...payload,
  id: payload?.id || createFinanceId(),
  local_id: payload?.local_id || createFinanceId(),
  local_only: true,
  sync_status: payload?.sync_status || "local_only",
  syncStatus: payload?.syncStatus || "local_only",
  source: payload?.source || "local",
});

const DASHBOARD_FALLBACK_BILLBOARD = {
  id: "clara-fallback-billboard",
  is_active: true,
  title: "CLARA is ready offline",
  subtitle: "Your wallet, budget, savings, and emergency fund stay available on this phone.",
  tag: "Offline-first",
  cta_label: "Keep tracking",
  media_type: "none",
  local_fallback: true,
};

const getSafeBillboards = (items = []) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const activeItems = safeItems.filter(
    (item) =>
      isTruthyActive(item?.is_active) ||
      item?.is_active === null ||
      item?.is_active === undefined
  );

  return activeItems.length > 0 ? activeItems : [DASHBOARD_FALLBACK_BILLBOARD];
};

const isProtectedFinanceRefreshWarning = (message = "") => {
  const normalized = normalizeLower(message).replace(/[\u2019']/g, "");

  return (
    normalized.includes("dashboard data could not fully refresh") ||
    normalized.includes("finance data remains protected offline") ||
    normalized.includes("could not fully refresh")
  );
};
const ENROLLMENT_PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
]);

const ENROLLMENT_APPROVED_STATUSES = new Set([
  "approved",
  "active",
  "enrolled",
]);

const ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES = new Set([
  "",
  "none",
  "free",
  "rejected",
  "resubmit_required",
  "cancelled",
]);

const isOwnedByUser = (item, user) => {
  if (!user || !item) return false;

  const userId = normalizeString(user?.id);
  const userEmail = normalizeString(user?.email).toLowerCase();

  const possibleIds = [item?.user_id, item?.owner_id, item?.profile_id, item?.id]
    .map(normalizeString)
    .filter(Boolean);

  const possibleEmails = [
    item?.created_by,
    item?.user_email,
    item?.owner_email,
    item?.email,
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .filter(Boolean);

  if (userId && possibleIds.includes(userId)) return true;
  if (userEmail && possibleEmails.includes(userEmail)) return true;

  return false;
};

const firstValidNumber = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
};

const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const num = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
};

const isTruthyActive = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const getBillboardMediaType = (item) => {
  const explicitType = normalizeString(item?.media_type).toLowerCase();
  if (explicitType) return explicitType;

  const url = normalizeString(
    item?.media_url ||
      item?.image_url ||
      item?.thumbnail_url ||
      item?.photo_url ||
      ""
  ).toLowerCase();

  if (!url) return "none";

  if (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes(".mov") ||
    url.includes(".m4v") ||
    url.includes("video")
  ) {
    return "video";
  }

  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".webp") ||
    url.includes(".gif") ||
    url.includes(".svg")
  ) {
    return "image";
  }

  if (url.includes(".pdf")) return "pdf";

  return "file";
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const padDatePart = (value) => String(value).padStart(2, "0");

const getPHParts = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
};

const getPHDateKey = (value = new Date()) => {
  const parts = getPHParts(value);
  if (!parts) return "";
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
};

const getPHMonthKey = (value = new Date()) => {
  const parts = getPHParts(value);
  if (!parts) return "";
  return `${parts.year}-${padDatePart(parts.month)}`;
};

const phLocalPartsToUtcDate = ({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
}) => {
  const utcMillis =
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
    PH_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
};

const getPHMonthRange = (value = new Date()) => {
  const parts = getPHParts(value) || getPHParts(new Date());
  const start = phLocalPartsToUtcDate({
    year: parts.year,
    month: parts.month,
    day: 1,
  });
  const nextMonth = phLocalPartsToUtcDate({
    year: parts.month === 12 ? parts.year + 1 : parts.year,
    month: parts.month === 12 ? 1 : parts.month + 1,
    day: 1,
  });

  return { start, end: new Date(nextMonth.getTime() - 1) };
};

const getPHWeekStartKey = (value = new Date()) => {
  const parts = getPHParts(value);
  if (!parts) return "";
  const current = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayIndex = current.getUTCDay();
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  current.setUTCDate(current.getUTCDate() + mondayOffset);
  return `${current.getUTCFullYear()}-${padDatePart(current.getUTCMonth() + 1)}-${padDatePart(
    current.getUTCDate()
  )}`;
};

const isInPHRange = (value, start, end) => {
  const date = normalizeDateValue(value);
  if (!date) return false;
  return date >= start && date <= end;
};

const sortByNewestDate = (items = [], dateKeys = ["created_at", "date", "updated_at"]) => {
  return [...items].sort((a, b) => {
    const aDate =
      dateKeys.map((key) => normalizeDateValue(a?.[key])).find(Boolean) || null;
    const bDate =
      dateKeys.map((key) => normalizeDateValue(b?.[key])).find(Boolean) || null;
    return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
  });
};

const getWalletDisplayName = (wallet) =>
  normalizeString(wallet?.name || wallet?.wallet_name || wallet?.title || "Wallet");

const getWalletDisplayBalance = (wallet) =>
  firstValidNumber(
    wallet?.balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.amount
  );

const getBudgetTotal = (budget) =>
  firstValidNumber(
    budget?.allocated_amount,
    budget?.budget_amount,
    budget?.total_budget,
    budget?.budget,
    budget?.amount,
    budget?.target_amount
  );

const getBudgetSpent = (budget) =>
  firstValidNumber(
    budget?.spent,
    budget?.spent_amount,
    budget?.total_spent,
    budget?.used_amount
  );

const getBudgetRemaining = (budget) => {
  const explicit = firstValidNumber(
    budget?.remaining,
    budget?.remaining_amount,
    budget?.amount_left
  );
  if (explicit) return explicit;
  const total = getBudgetTotal(budget);
  const spent = getBudgetSpent(budget);
  return Math.max(total - spent, 0);
};

const getBudgetCategoryValue = (budget, keys = []) =>
  firstValidNumber(...keys.map((key) => budget?.[key]));

const getBudgetTrackingStart = (budget) => {
  const raw =
    budget?.tracking_start_date ||
    budget?.range_start ||
    budget?.start_date ||
    budget?.created_at ||
    budget?.created_date ||
    null;

  return normalizeDateValue(raw);
};

const isExpenseInsideBudgetWindow = (expense, budget) => {
  const expenseDate = normalizeDateValue(
    expense?.date || expense?.expense_date || expense?.created_at
  );
  if (!expenseDate) return false;

  const trackingStart = getBudgetTrackingStart(budget);
  if (!trackingStart) return true;

  return expenseDate.getTime() >= trackingStart.getTime();
};

const getSavingsSaved = (goal) =>
  firstValidNumber(
    goal?.saved_amount,
    goal?.current_amount,
    goal?.saved,
    goal?.progress_amount,
    goal?.amount_saved
  );

const getSavingsTarget = (goal) =>
  firstValidNumber(
    goal?.target_amount,
    goal?.goal_amount,
    goal?.target,
    goal?.amount,
    goal?.desired_amount
  );

const getSavingsGoalTitle = (goal) =>
  normalizeString(goal?.title || goal?.name || goal?.goal_name || "Savings Goal");

const formatCompactDate = (value) => {
  const date = normalizeDateValue(value);
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getTransactionDate = (item) =>
  normalizeDateValue(
    item?.created_at ||
      item?.date ||
      item?.updated_at ||
      item?.transaction_date ||
      item?.expense_date
  );

const getExpenseCategoryKey = (item) => {
  const raw = normalizeLower(
    item?.category ||
      item?.budget_category ||
      item?.expense_category ||
      item?.classification ||
      "other"
  );
  return FINANCE_CATEGORIES.includes(raw) ? raw : "other";
};

const getBudgetCategoryKey = (budget) => {
  const raw = normalizeLower(
    budget?.category ||
      budget?.budget_category ||
      budget?.expense_category ||
      budget?.classification ||
      budget?.type ||
      "all"
  );
  return FINANCE_CATEGORIES.includes(raw) ? raw : "all";
};

const formatBudgetLabel = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return "Budget";
  return normalized
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getBudgetListTitle = (budget) =>
  formatBudgetLabel(
    budget?.title ||
      budget?.name ||
      budget?.budget_name ||
      budget?.label ||
      budget?.category ||
      budget?.budget_category ||
      budget?.expense_category ||
      budget?.classification ||
      budget?.type ||
      "Budget"
  );

const getBudgetNeedType = (budget) => {
  const raw = normalizeLower(
    budget?.need_type ||
      budget?.needType ||
      budget?.spending_type ||
      budget?.budget_type ||
      budget?.category_type ||
      budget?.classification_type ||
      ""
  );

  if (["need", "needs", "essential", "necessity"].includes(raw)) return "need";
  if (["want", "wants", "non_essential", "non-essential", "lifestyle"].includes(raw)) return "want";
  if (["other", "savings", "goal", "misc", "miscellaneous"].includes(raw)) return "other";

  const category = normalizeLower(
    budget?.category || budget?.budget_category || budget?.expense_category || ""
  );

  if (["entertainment", "shopping", "personal"].includes(category)) return "want";
  if (["other", "savings"].includes(category)) return "other";

  return "need";
};

const getWalletSortOrder = (wallet, index) => {
  const value = Number(wallet?.sort_order);
  return Number.isFinite(value) ? value : index;
};

const getToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const dashboardRuntimePrefs = new Map();
const dashboardRuntimeNotifications = new Map();
const dashboardRuntimeMoneySummaryVisibility = new Map();

const getDashboardPrefsStorageKey = (userId) =>
  `clara_dashboard_prefs_${userId || "guest"}`;

const MONEY_SUMMARY_PRIVACY_KEY = "clara_dashboard_money_summary_visible";

function readMoneySummaryVisibility(userId = "guest") {
  return dashboardRuntimeMoneySummaryVisibility.get(userId || "guest") === true;
}

function persistMoneySummaryVisibility(visible, userId = "guest") {
  dashboardRuntimeMoneySummaryVisibility.set(userId || "guest", Boolean(visible));
}

function readDashboardPrefs(userId) {
  const key = getDashboardPrefsStorageKey(userId);
  const parsed = dashboardRuntimePrefs.get(key) || {};

  return {
    reminderTime: normalizeString(parsed?.reminderTime || ""),
    financialGoal: normalizeString(parsed?.financialGoal || ""),
  };
}

function persistDashboardPrefs(userId, updates) {
  if (!userId) return;
  const key = getDashboardPrefsStorageKey(userId);
  const current = readDashboardPrefs(userId);
  dashboardRuntimePrefs.set(key, { ...current, ...(updates || {}) });
}

function getSettingsStorageKey(userId) {
  return `clara_settings_${userId || "guest"}`;
}

function readStoredNotificationSettings(userId) {
  const defaults = {
    dailyReminders: true,
    productUpdates: true,
    coachingAlerts: true,
    budgetAlerts: true,
  };
  const saved = dashboardRuntimeNotifications.get(getSettingsStorageKey(userId)) || {};
  return { ...defaults, ...saved };
}

function persistStoredNotificationSettings(userId, updates = {}) {
  const key = getSettingsStorageKey(userId);
  const current = readStoredNotificationSettings(userId);
  const next = { ...current, ...(updates || {}) };
  dashboardRuntimeNotifications.set(key, next);
  dispatchClaraEvent("clara:settings-updated", { type: "notifications", notifications: next });
  return next;
}

const CLARA_VISUAL_PERFORMANCE_STYLE_ID = "clara-visual-performance-mode-style";
const dashboardRuntimePerformanceMode = new Map();

const getVisualPerformanceStorageKey = (userId) =>
  `clara_visual_performance_${userId || "guest"}`;

const ensureClaraVisualPerformanceStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLARA_VISUAL_PERFORMANCE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = CLARA_VISUAL_PERFORMANCE_STYLE_ID;
  style.textContent = `
    .clara-premium-mode { --clara-motion-duration: 220ms; --clara-glow-strength: 1; --clara-blur-strength: 1; }
    .clara-performance-mode { --clara-motion-duration: 0ms; --clara-glow-strength: 0; --clara-blur-strength: 0; }
    .clara-performance-mode *, .clara-performance-mode *::before, .clara-performance-mode *::after { animation: none !important; transition: none !important; transition-duration: 0ms !important; scroll-behavior: auto !important; text-shadow: none !important; }
    .clara-performance-mode .theme-shell-card, .clara-performance-mode .theme-panel-card, .clara-performance-mode .theme-soft-card, .clara-performance-mode .theme-modal-card, .clara-performance-mode .clara-card, .clara-performance-mode .clara-card-soft, .clara-performance-mode [class*="backdrop-blur"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .clara-performance-mode [class*="shadow-"], .clara-performance-mode [style*="box-shadow"] { box-shadow: none !important; }
    .clara-performance-mode [class*="blur-"], .clara-performance-mode [style*="filter"] { filter: none !important; }
    .clara-performance-mode [class*="before:blur"]::before, .clara-performance-mode [class*="after:blur"]::after, .clara-performance-mode [class*="before:bg-white"]::before, .clara-performance-mode [class*="after:bg-white"]::after { opacity: 0 !important; filter: none !important; }
    .clara-performance-mode [class*="animate-"], .clara-performance-mode [style*="animation"] { animation: none !important; animation-duration: 0ms !important; animation-iteration-count: 1 !important; }
    .clara-performance-mode [class*="hover:-translate"], .clara-performance-mode [class*="hover:scale"], .clara-performance-mode [class*="active:scale"], .clara-performance-mode [class*="group-hover:-translate"], .clara-performance-mode [class*="group-active:scale"] { transform: none !important; }
    .clara-performance-mode video, .clara-performance-mode img { filter: none !important; }
    .clara-performance-mode .theme-page-shell, .clara-performance-mode .theme-panel-card, .clara-performance-mode .theme-shell-card, .clara-performance-mode .theme-soft-card, .clara-performance-mode .theme-modal-card { isolation: auto !important; }
  `;
  document.head.appendChild(style);
};

const applyVisualPerformanceMode = (enabled) => {
  if (typeof document === "undefined") return;
  ensureClaraVisualPerformanceStyles();
  document.documentElement.classList.toggle("clara-performance-mode", Boolean(enabled));
  document.documentElement.classList.toggle("clara-premium-mode", !enabled);
  document.body?.classList?.toggle("clara-performance-mode", Boolean(enabled));
  document.body?.classList?.toggle("clara-premium-mode", !enabled);
  document.documentElement.dataset.claraVisualMode = enabled ? "performance" : "premium";
  if (document.body) document.body.dataset.claraVisualMode = enabled ? "performance" : "premium";
};

const readStoredPerformanceMode = (userId) =>
  dashboardRuntimePerformanceMode.get(getVisualPerformanceStorageKey(userId)) === true;

const saveVisualPerformanceMode = (userId, enabled) => {
  const nextValue = Boolean(enabled);
  dashboardRuntimePerformanceMode.set(getVisualPerformanceStorageKey(userId), nextValue);
  applyVisualPerformanceMode(nextValue);
  dispatchClaraEvent("clara:visual-performance-mode-updated", { enabled: nextValue, visualMode: nextValue ? "performance" : "premium", userId: userId || null });
  return nextValue;
};

const dashboardRuntimeProgramPrompts = new Set();

const getProgramPromptSessionKey = (userId, bubble) => {
  const safeUserId = normalizeString(userId || "guest");
  const bubbleSignature = [normalizeString(bubble?.kind), normalizeString(bubble?.action), normalizeString(bubble?.href), normalizeString(bubble?.title), normalizeString(bubble?.body), normalizeString(bubble?.ctaLabel)].filter(Boolean).join("||");
  return `clara_program_prompt_seen_session_${safeUserId}_${bubbleSignature || "default"}`;
};

const readProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return false;
  return dashboardRuntimeProgramPrompts.has(getProgramPromptSessionKey(userId, bubble));
};

const persistProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return;
  dashboardRuntimeProgramPrompts.add(getProgramPromptSessionKey(userId, bubble));
};

const clearProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return;
  dashboardRuntimeProgramPrompts.delete(getProgramPromptSessionKey(userId, bubble));
};

const isProgramApproved = (profile, isPaid, enrollmentRecord = null) => {
  const status = normalizeLower(profile?.status);
  const enrollmentStatus = normalizeLower(
    enrollmentRecord?.status || profile?.enrollment_status
  );
  const plan = normalizeLower(profile?.plan);
  const role = normalizeLower(profile?.role);

  return (
    isPaid === true ||
    profile?.is_enrolled === true ||
    profile?.program_active === true ||
    role === "paid_user" ||
    (plan && plan !== "free") ||
    ENROLLMENT_APPROVED_STATUSES.has(status) ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus)
  );
};

const shouldForceToEnroll = (profile, enrollmentRecord, isPaid) => {
  const role = normalizeLower(profile?.role);
  const plan = normalizeLower(profile?.plan);
  const profileStatus = normalizeLower(profile?.status);
  const enrollmentStatus = normalizeLower(
    enrollmentRecord?.status || profile?.enrollment_status
  );

  const hasApproved =
    isProgramApproved(profile, isPaid, enrollmentRecord) ||
    ENROLLMENT_APPROVED_STATUSES.has(profileStatus) ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus);

  const pending =
    ENROLLMENT_PENDING_STATUSES.has(profileStatus) ||
    ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus);

  if (hasApproved || pending) return false;

  const freeRole = !role || role === "free_user" || role === "user";
  const freePlan = !plan || plan === "free";

  if (!enrollmentRecord) return false;

  if (
    freeRole &&
    freePlan &&
    ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES.has(enrollmentStatus)
  ) {
    return true;
  }

  if (
    freeRole &&
    freePlan &&
    ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES.has(profileStatus)
  ) {
    return true;
  }

  return false;
};

const OnboardingActionBar = ({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled = false,
  nextClassName = "",
}) => {
  return (
    <div className="sticky bottom-0 z-30 mt-6 border-t border-white/10 bg-[#071120]/96 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] sm:w-auto sm:min-w-[120px]"
          >
            {backLabel}
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={`w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[180px] ${nextClassName}`}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
};


const shouldSilenceNormalOfflineNotice = (message = "") => {
  const normalized = normalizeLower(message).replace(/[\u2019']/g, "");

  return (
    normalized.includes("youre offline. clara is using your saved access state") ||
    normalized.includes("connect to the internet later to finish account setup") ||
    normalized.includes("youre offline. clara is using saved data") ||
    normalized.includes("clara is using your saved access state") ||
    normalized.includes("clara is using saved data")
  );
};

const FinanceInlineAlert = ({ notice, onClose }) => {
  if (!notice?.message) return null;

  if (
    shouldSilenceNormalOfflineNotice(notice.message) ||
    isProtectedFinanceRefreshWarning(notice.message)
  ) {
    return null;
  }

  const tone =
    notice.type === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-rose-400/20 bg-rose-500/10 text-rose-100";

  return (
    <div className={`mb-3 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-sm leading-6">{notice.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-0.5 shrink-0 rounded-full border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss message"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const FinanceActionModal = ({
  open,
  title,
  description,
  children,
  onClose,
  onSubmit,
  submitLabel = "Save",
  submitDisabled = false,
  loading = false,
  danger = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
      <div className="flex w-full max-w-lg max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden rounded-[28px] border border-white/10 bg-[#071120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] sm:max-h-[calc(100dvh-2rem)]">
        <form onSubmit={onSubmit} className="flex min-h-0 w-full flex-col">
          <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {description ? (
                  <p className="mt-1 text-sm leading-6 text-white/65">{description}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-6">{children}</div>

          <div className="shrink-0 border-t border-white/10 bg-[#071120]/98 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitDisabled || loading}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  danger
                    ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.24)]"
                    : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
                }`}
              >
                {loading ? "Saving..." : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const ManualExpenseFullScreenSheet = ({
  open,
  children,
  onClose,
  onSubmit,
  submitDisabled = false,
  loading = false,
}) => {
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

  if (!open) return null;

  const sheet = (
    <div className="clara-manual-expense-sheet fixed inset-0 z-[160] min-h-[100dvh] overflow-hidden bg-[#041018] text-white">
      <style>{`
        .clara-manual-expense-sheet {
          min-height: 100dvh;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .clara-manual-expense-sheet input,
        .clara-manual-expense-sheet textarea,
        .clara-manual-expense-sheet select {
          font-size: 16px;
        }

        .clara-manual-expense-sheet [aria-haspopup="listbox"] {
          min-height: 64px;
          border-radius: 24px !important;
          padding: 16px 20px !important;
          background: linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.20);
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,rgba(4,16,24,0.98)_0%,rgba(4,12,22,0.99)_52%,rgba(2,8,16,1)_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 flex h-[100dvh] min-h-[100dvh] animate-[claraManualExpenseIn_220ms_ease-out] flex-col"
      >
        <div className="shrink-0 border-b border-white/10 bg-[#06111f]/82 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[520px] items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/85">
                Manual Log
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Log expense
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-white/66">
                Connect this expense to your monthly budget list.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/78 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.10] hover:text-white active:scale-95"
              aria-label="Close log expense"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(150px+env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[520px] space-y-5">
            <div className="relative overflow-visible rounded-[30px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-emerald-300/8 blur-3xl" />
              <div className="relative space-y-5">{children}</div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#041018]/96 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_50px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="mx-auto grid w-full max-w-[520px] grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[54px] rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.99]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitDisabled || loading}
              className="min-h-[56px] rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-5 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? "Saving..." : "Add Expense"}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes claraManualExpenseIn {
          0% {
            opacity: 0;
            transform: translate3d(0, 14px, 0) scale(0.985);
            filter: blur(3px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
};


const QuickActionDropdown = ({
  value,
  placeholder = "Select option",
  options = [],
  onChange,
  disabled = false,
  ariaLabel = "Select option",
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((item) => String(item.value) === String(value));

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const getToneClass = (tone) => {
    if (tone === "amber") {
      return "border-amber-300/15 bg-amber-500/10 text-amber-50 hover:bg-amber-500/15";
    }

    if (tone === "cyan") {
      return "border-cyan-300/15 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/15";
    }

    if (tone === "emerald") {
      return "border-emerald-300/15 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15";
    }

    return "border-white/8 bg-white/[0.035] text-white hover:bg-white/[0.07]";
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-55 ${
          open
            ? "border-cyan-300/35 bg-white/[0.075] shadow-[0_0_0_3px_rgba(34,211,238,0.10),0_12px_34px_rgba(0,0,0,0.22)]"
            : "border-white/10 bg-white/[0.04] hover:border-white/16 hover:bg-white/[0.06]"
        }`}
      >
        <span className={selected ? "min-w-0 text-white" : "min-w-0 text-white/35"}>
          <span className="block truncate">{selected?.label || placeholder}</span>
          {selected?.subtitle ? (
            <span className="mt-0.5 block truncate text-[11px] text-white/45">
              {selected.subtitle}
            </span>
          ) : null}
        </span>
        <ArrowDown
          className={`h-4 w-4 shrink-0 text-cyan-100/70 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[150] max-h-60 overflow-y-auto rounded-3xl border border-cyan-200/10 bg-[#06111f]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_36px_rgba(34,211,238,0.10)] backdrop-blur-2xl"
        >
          {options.map((item) => {
            const isSelected = String(value) === String(item.value);
            const toneClass = getToneClass(item.tone);

            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) {
                    item.onDisabledClick?.();
                    return;
                  }

                  onChange?.(item.value, item);
                  setOpen(false);
                }}
                className={`mb-1 flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition last:mb-0 disabled:cursor-not-allowed disabled:opacity-45 ${toneClass} ${
                  isSelected
                    ? "ring-1 ring-cyan-300/30 shadow-[0_0_22px_rgba(34,211,238,0.10)]"
                    : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  {item.subtitle ? (
                    <span className="mt-0.5 block truncate text-[11px] text-white/45">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-cyan-200" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const FinanceField = ({ label, children, helper }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-white/85">{label}</span>
    {children}
    {helper ? <p className="text-xs leading-5 text-white/50">{helper}</p> : null}
  </label>
);

const financeInputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-400/30 focus:bg-white/[0.06]";

const isMoneyLeftSummaryEvent = (event) =>
  Boolean(
    event?.target?.closest?.('[data-clara-summary-card="money-left"]')
  );

const stopFinancialSummaryInteraction = (event) => {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
  return false;
};

const isMoneySummaryPrivacyToggleEvent = (event) =>
  Boolean(
    event?.target?.closest?.('[data-clara-summary-privacy-toggle="true"]')
  );

const stopFinancialSummaryInteractionUnlessMoneyLeft = (event) => {
  if (isMoneyLeftSummaryEvent(event) || isMoneySummaryPrivacyToggleEvent(event)) {
    return undefined;
  }

  return stopFinancialSummaryInteraction(event);
};

const financialSummaryParentHandlers = {
  onClickCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onClick: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onDoubleClickCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onDoubleClick: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onPointerUpCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onPointerUp: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onMouseUpCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onMouseUp: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onTouchEndCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onTouchEnd: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onKeyDownCapture: stopFinancialSummaryInteractionUnlessMoneyLeft,
  onKeyDown: stopFinancialSummaryInteractionUnlessMoneyLeft,
};

const financialSummaryInertHandlers = {
  onClickCapture: stopFinancialSummaryInteraction,
  onClick: stopFinancialSummaryInteraction,
  onDoubleClickCapture: stopFinancialSummaryInteraction,
  onDoubleClick: stopFinancialSummaryInteraction,
  onPointerUpCapture: stopFinancialSummaryInteraction,
  onPointerUp: stopFinancialSummaryInteraction,
  onMouseUpCapture: stopFinancialSummaryInteraction,
  onMouseUp: stopFinancialSummaryInteraction,
  onTouchEndCapture: stopFinancialSummaryInteraction,
  onTouchEnd: stopFinancialSummaryInteraction,
  onKeyDownCapture: stopFinancialSummaryInteraction,
  onKeyDown: stopFinancialSummaryInteraction,
};

const UNDOCUMENTED_SPENDING_REASONS = [
  "Forgot to log it immediately",
  "Cannot remember the exact item",
  "Spent multiple times and forgot the details",
  "Lost receipt or proof of purchase",
  "No internet connection at the time",
  "Paid in cash and forgot to record it",
  "Someone else used the money",
  "Emergency or rushed spending",
  "App was not available at the moment",
  "Other undocumented reason",
];

const FINANCE_CARD_KEYS = ["emergency", "wallets", "budgets", "savings"];

const hasDashboardFinanceContent = (snapshot = {}) =>
  Boolean(
    (Array.isArray(snapshot.wallets) && snapshot.wallets.length > 0) ||
      (Array.isArray(snapshot.expenses) && snapshot.expenses.length > 0) ||
      (Array.isArray(snapshot.budgets) && snapshot.budgets.length > 0) ||
      (Array.isArray(snapshot.savingsGoals) && snapshot.savingsGoals.length > 0) ||
      (Array.isArray(snapshot.walletTransactions) && snapshot.walletTransactions.length > 0) ||
      snapshot.emergencyFund ||
      Number(snapshot.walletMoney || 0) > 0
  );

const getFinanceThemeAccentClass = (tone = "emerald", isLight = false) => {
  if (isLight) {
    const lightToneMap = {
      emerald:
        "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,244,0.94)_52%,rgba(236,253,245,0.96))] shadow-[0_22px_60px_rgba(16,185,129,0.10)]",
      blue:
        "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94)_52%,rgba(224,231,255,0.96))] shadow-[0_22px_60px_rgba(59,130,246,0.10)]",
      teal:
        "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.94)_52%,rgba(236,254,255,0.96))] shadow-[0_22px_60px_rgba(20,184,166,0.10)]",
      gold:
        "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94)_52%,rgba(255,247,237,0.96))] shadow-[0_22px_60px_rgba(245,158,11,0.10)]",
    };
    return lightToneMap[tone] || lightToneMap.emerald;
  }

  const darkToneMap = {
    emerald:
      "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,rgba(4,25,24,0.96),rgba(6,38,36,0.93)_52%,rgba(3,19,18,0.98))] shadow-[0_28px_85px_rgba(16,185,129,0.16)]",
    blue:
      "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.14),transparent_42%),linear-gradient(135deg,rgba(8,18,52,0.96),rgba(12,33,80,0.93)_52%,rgba(7,15,38,0.98))] shadow-[0_28px_85px_rgba(59,130,246,0.16)]",
    teal:
      "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_42%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(5,40,48,0.93)_52%,rgba(4,17,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.16)]",
    gold:
      "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_42%),linear-gradient(135deg,rgba(29,18,8,0.96),rgba(43,28,13,0.93)_52%,rgba(18,11,8,0.98))] shadow-[0_28px_85px_rgba(245,158,11,0.16)]",
  };

  return darkToneMap[tone] || darkToneMap.emerald;
};


const getDashboardViewportMode = () => {
  if (typeof window === "undefined") return "normal";

  const height = window.innerHeight || 844;
  const width = window.innerWidth || 390;

  if (height <= 700 || width <= 360) return "ultraCompact";
  if (height <= 780) return "compact";
  if (height <= 860) return "normal";
  return "spacious";
};

function useDashboardViewportMode() {
  const [mode, setMode] = useState(getDashboardViewportMode);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frameId = null;
    const updateMode = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setMode(getDashboardViewportMode());
      });
    };

    updateMode();
    window.addEventListener("resize", updateMode, { passive: true });
    window.addEventListener("orientationchange", updateMode, { passive: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateMode);
      window.removeEventListener("orientationchange", updateMode);
    };
  }, []);

  return mode;
}

const DASHBOARD_SCALE = {
  ultraCompact: {
    page: "min-h-0",
    headerOuter: "px-[clamp(10px,3vw,14px)] pb-1 pt-[calc(env(safe-area-inset-top)+8px)] md:px-[clamp(10px,3vw,14px)]",
    headerPanel: "rounded-[22px] px-2 py-1.5 sm:px-2",
    headerItem: "gap-0.5 rounded-[14px] px-1 py-1.5 sm:px-1.5",
    headerIcon: "h-8 w-8",
    headerIconSvg: "h-4 w-4",
    headerLabel: "text-[10px]",
    content: "mt-1 space-y-[clamp(7px,1.5dvh,10px)] px-[clamp(10px,3vw,14px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(10px,3vw,14px)] md:space-y-[clamp(7px,1.5dvh,10px)]",
    billboard: "h-[clamp(90px,14dvh,108px)]",
    billboardPad: "gap-2 p-2.5",
    billboardTitle: "mt-0.5 text-[clamp(13px,3.5vw,15px)]",
    billboardText: "mt-0.5 line-clamp-1 text-[11px] leading-snug",
    billboardCta: "mt-1",
    billboardIcon: "h-10 w-10 rounded-xl",
    financeWrap: "space-y-[clamp(8px,1.4dvh,12px)]",
    financeClip: "rounded-[24px]",
    financeSlide: "min-h-[238px] rounded-[24px] [&>*]:min-h-[236px] [&>*]:rounded-[23px]",
    dots: "gap-1 pt-1 pb-[clamp(6px,1.2dvh,10px)]",
    summaryGrid: "rounded-[22px]",
    summaryCell: "min-h-[104px] p-[clamp(13px,3.4vw,16px)]",
    summaryLabel: "text-[9px] tracking-[0.18em]",
    summaryAmount: "mt-2.5 text-[clamp(30px,8vw,35px)]",
    summaryCopy: "mt-2 text-[11px] leading-4",
    summarySubcopy: "mt-1 text-[10px] leading-4",
  },
  compact: {
    page: "min-h-0",
    headerOuter: "px-[clamp(12px,3.5vw,16px)] pb-1 pt-[calc(env(safe-area-inset-top)+10px)] md:px-[clamp(12px,3.5vw,16px)]",
    headerPanel: "rounded-[24px] px-2 py-2 sm:px-2",
    headerItem: "gap-0.5 rounded-[15px] px-1 py-1.5 sm:px-1.5",
    headerIcon: "h-9 w-9",
    headerIconSvg: "h-[18px] w-[18px]",
    headerLabel: "text-[10.5px]",
    content: "mt-1.5 space-y-[clamp(8px,1.7dvh,12px)] px-[clamp(12px,3.5vw,16px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(12px,3.5vw,16px)] md:space-y-[clamp(8px,1.7dvh,12px)]",
    billboard: "h-[clamp(98px,14.5dvh,116px)]",
    billboardPad: "gap-2.5 p-3",
    billboardTitle: "mt-0.5 text-[clamp(14px,3.7vw,16px)]",
    billboardText: "mt-0.5 line-clamp-1 text-xs leading-snug",
    billboardCta: "mt-1.5",
    billboardIcon: "h-11 w-11 rounded-[14px]",
    financeWrap: "space-y-[clamp(8px,1.4dvh,12px)]",
    financeClip: "rounded-[26px]",
    financeSlide: "min-h-[258px] rounded-[26px] [&>*]:min-h-[256px] [&>*]:rounded-[25px]",
    dots: "gap-1.5 pt-1 pb-[clamp(7px,1.3dvh,12px)]",
    summaryGrid: "rounded-[24px]",
    summaryCell: "min-h-[106px] p-[clamp(13px,3.5vw,16px)]",
    summaryLabel: "text-[10px] tracking-[0.2em]",
    summaryAmount: "mt-2.5 text-[clamp(31px,8.2vw,36px)]",
    summaryCopy: "mt-2 text-xs leading-5",
    summarySubcopy: "mt-1.5 text-[11px] leading-4",
  },
  normal: {
    page: "min-h-0",
    headerOuter: "px-[clamp(14px,4vw,18px)] pb-1.5 pt-[calc(env(safe-area-inset-top)+12px)] md:px-[clamp(14px,4vw,18px)]",
    headerPanel: "rounded-[24px] px-2 py-2 sm:px-2.5",
    headerItem: "gap-1 rounded-[16px] px-1 py-2 sm:px-2",
    headerIcon: "h-10 w-10",
    headerIconSvg: "h-5 w-5",
    headerLabel: "text-[11px]",
    content: "mt-2 space-y-[clamp(10px,1.8dvh,14px)] px-[clamp(14px,4vw,18px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(14px,4vw,18px)] md:space-y-[clamp(10px,1.8dvh,14px)]",
    billboard: "h-[clamp(106px,15dvh,126px)]",
    billboardPad: "gap-3 p-3.5",
    billboardTitle: "mt-1 text-base",
    billboardText: "mt-1 line-clamp-2 text-xs leading-relaxed",
    billboardCta: "mt-2",
    billboardIcon: "h-12 w-12 rounded-2xl",
    financeWrap: "space-y-[clamp(9px,1.5dvh,14px)]",
    financeClip: "rounded-[28px]",
    financeSlide: "min-h-[286px] rounded-[28px] [&>*]:min-h-[284px] [&>*]:rounded-[27px]",
    dots: "gap-1.5 pt-1.5 pb-[clamp(8px,1.4dvh,14px)]",
    summaryGrid: "rounded-[26px]",
    summaryCell: "min-h-[110px] p-[clamp(14px,3.6vw,17px)]",
    summaryLabel: "text-[11px] tracking-[0.22em]",
    summaryAmount: "mt-2.5 text-[clamp(32px,8.4vw,37px)]",
    summaryCopy: "mt-3 text-sm leading-6",
    summarySubcopy: "mt-2 text-xs leading-5",
  },
  spacious: {
    page: "min-h-0",
    headerOuter: "px-[clamp(16px,4vw,20px)] pb-2 pt-[calc(env(safe-area-inset-top)+14px)] md:px-[clamp(16px,4vw,20px)]",
    headerPanel: "rounded-[24px] px-2 py-2.5 sm:px-2.5",
    headerItem: "gap-1 rounded-[16px] px-1 py-2 sm:px-2",
    headerIcon: "h-10 w-10",
    headerIconSvg: "h-5 w-5",
    headerLabel: "text-[11px]",
    content: "mt-2.5 space-y-[clamp(12px,2dvh,16px)] px-[clamp(16px,4vw,20px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(16px,4vw,20px)] md:space-y-[clamp(12px,2dvh,16px)]",
    billboard: "h-[clamp(112px,15.5dvh,132px)]",
    billboardPad: "gap-3 p-3.5",
    billboardTitle: "mt-1 text-base",
    billboardText: "mt-1 line-clamp-2 text-xs leading-relaxed",
    billboardCta: "mt-2",
    billboardIcon: "h-12 w-12 rounded-2xl",
    financeWrap: "space-y-[clamp(9px,1.5dvh,14px)]",
    financeClip: "rounded-[30px]",
    financeSlide: "min-h-[314px] rounded-[30px] [&>*]:min-h-[312px] [&>*]:rounded-[29px]",
    dots: "gap-1.5 pt-1.5 pb-[clamp(8px,1.4dvh,14px)]",
    summaryGrid: "rounded-[28px]",
    summaryCell: "min-h-[112px] p-[clamp(14px,3.8vw,18px)]",
    summaryLabel: "text-[11px] tracking-[0.22em]",
    summaryAmount: "mt-2.5 text-[clamp(32px,8.4vw,37px)]",
    summaryCopy: "mt-3 text-sm leading-6",
    summarySubcopy: "mt-2 text-xs leading-5",
  },
};

const getFinanceSlideShellClass = (cardKey, theme = null, scale = null) => {
  const accentMap = {
    emergency:
      "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_38%),linear-gradient(135deg,rgba(5,16,31,0.88),rgba(6,18,36,0.96)_42%,rgba(3,10,24,0.98))] shadow-[0_28px_85px_rgba(16,185,129,0.16)]",
    wallets:
      "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(5,16,31,0.88),rgba(6,18,36,0.96)_42%,rgba(3,10,24,0.98))] shadow-[0_28px_85px_rgba(34,211,238,0.15)]",
    budgets:
      "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_40%),linear-gradient(135deg,rgba(15,8,30,0.9),rgba(11,10,37,0.96)_42%,rgba(4,6,22,0.98))] shadow-[0_28px_85px_rgba(250,204,21,0.16)]",
    savings:
      "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.16),transparent_40%),linear-gradient(135deg,rgba(4,18,24,0.9),rgba(5,21,31,0.96)_42%,rgba(3,10,24,0.98))] shadow-[0_28px_85px_rgba(52,211,153,0.16)]",
  };

  const toneMap = {
    emergency: theme?.moneyTone || "blue",
    wallets: theme?.moneyTone || "teal",
    budgets: theme?.monthTone || theme?.moneyTone || "gold",
    savings: theme?.tipTone || theme?.monthTone || "emerald",
  };

  const accentClass = theme
    ? getFinanceThemeAccentClass(toneMap[cardKey] || "emerald", theme?.isLight === true)
    : accentMap[cardKey] || accentMap.emergency;

  const shellBorderClass = theme?.isLight === true ? "border-slate-300/45" : "border-white/10";
  const glowCapClass = theme?.isLight === true ? "before:bg-white/70" : "before:bg-white/10";
  const innerRingClass = theme?.isLight === true ? "after:ring-slate-300/40" : "after:ring-white/6";

  const scaleSlideClass = scale?.financeSlide || "min-h-[314px] rounded-[30px] [&>*]:min-h-[312px] [&>*]:rounded-[29px]";

  return `relative isolate w-full overflow-hidden ${scaleSlideClass} ${shellBorderClass} p-[1px] backdrop-blur-sm before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-20 before:rounded-full ${glowCapClass} before:blur-3xl after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset ${innerRingClass} [&>*]:mb-0 [&>*]:h-full ${accentClass}`;
};

const getDashboardGlowCardClass = (tone = "emerald") => {
  const toneMap = {
    emerald:
      "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_42%),linear-gradient(135deg,rgba(7,25,24,0.94),rgba(7,31,40,0.92)_52%,rgba(5,18,29,0.95))] shadow-[0_22px_65px_rgba(16,185,129,0.14)]",
    blue:
      "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_42%),linear-gradient(135deg,rgba(10,20,54,0.95),rgba(18,44,112,0.9)_54%,rgba(10,18,40,0.95))] shadow-[0_22px_65px_rgba(59,130,246,0.16)]",
    teal:
      "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_42%),linear-gradient(135deg,rgba(7,24,44,0.95),rgba(7,39,53,0.92)_54%,rgba(8,21,31,0.96))] shadow-[0_22px_65px_rgba(20,184,166,0.15)]",
    gold:
      "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_42%),linear-gradient(135deg,rgba(31,19,9,0.95),rgba(46,26,17,0.92)_54%,rgba(16,11,26,0.96))] shadow-[0_22px_65px_rgba(245,158,11,0.15)]",
  };

  return `relative isolate overflow-hidden rounded-[28px] border border-white/10 backdrop-blur-sm before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-16 before:rounded-full before:bg-white/8 before:blur-3xl after:pointer-events-none after:absolute after:inset-0 after:rounded-[28px] after:ring-1 after:ring-inset after:ring-white/6 ${toneMap[tone] || toneMap.emerald}`;
};


const DASHBOARD_THEME_CATEGORY_ORDER = [
  "classic",
  "aesthetic",
  "anime",
  "marvel",
  "signature",
];

const DASHBOARD_THEME_CATEGORY_LABELS = {
  classic: "Classic",
  aesthetic: "Aesthetic",
  anime: "Anime Inspired",
  marvel: "Marvel Inspired",
  signature: "Signature",
};

const DASHBOARD_THEME_PRESETS = [
  {
    key: "obsidian",
    category: "classic",
    label: "Obsidian Black",
    chip: "Pure dark",
    pageSurface: "bg-[#05070a]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[260px] before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[220px] after:bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.03),transparent_58%)]",
    heroShell: "border-white/10 bg-[#0a0d12] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_34px_rgba(0,0,0,0.35)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_36%)]",
    moneyTone: "blue",
    moneyOverlay: "border-white/10 bg-[#0c1016]",
    monthTone: "blue",
    monthOverlay: "border-white/10 bg-[#0d1118]",
    tipTone: "blue",
    tipOverlay: "border-white/10 bg-[#0d1118]",
    indicatorActive: "bg-white",
    modalAccent: "from-white/10 via-white/5 to-white/10",
    preview: "bg-[#05070a]",
  },
  {
    key: "arctic",
    category: "classic",
    label: "Arctic White",
    chip: "Pure light",
    isLight: true,
    pageSurface: "bg-[linear-gradient(180deg,#dce9f7_0%,#f8fbff_42%,#dfe8f2_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[340px] before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_62%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[240px] after:bg-[radial-gradient(circle_at_bottom,rgba(191,219,254,0.35),transparent_58%)]",
    heroShell: "border-slate-300/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(240,247,255,0.96)_100%)] shadow-[0_0_0_1px_rgba(148,163,184,0.18),0_18px_40px_rgba(15,23,42,0.12)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.55),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.24),transparent_40%)]",
    moneyTone: "blue",
    moneyOverlay: "border-slate-300/40 bg-white/90",
    monthTone: "teal",
    monthOverlay: "border-slate-300/40 bg-white/88",
    tipTone: "blue",
    tipOverlay: "border-slate-300/40 bg-white/88",
    indicatorActive: "bg-slate-700",
    modalAccent: "from-slate-300/25 via-sky-200/18 to-white/20",
    preview: "bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_55%,#d7e6f3_100%)]",
  },
  {
    key: "royal",
    category: "classic",
    label: "Royal Blue",
    chip: "Single-color blue",
    pageSurface: "bg-[linear-gradient(180deg,#07132d_0%,#0a2252_48%,#0b1b3b_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[360px] before:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_60%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[250px] after:bg-[radial-gradient(circle_at_bottom,rgba(96,165,250,0.12),transparent_58%)]",
    heroShell: "border-blue-300/15 bg-[linear-gradient(135deg,rgba(10,37,90,0.97)_0%,rgba(13,46,117,0.94)_100%)] shadow-[0_0_0_1px_rgba(96,165,250,0.10),0_16px_38px_rgba(0,0,0,0.34),0_0_44px_rgba(59,130,246,0.15)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_36%)]",
    moneyTone: "blue",
    moneyOverlay: "from-blue-500/26 to-blue-600/18 border-blue-300/24",
    monthTone: "blue",
    monthOverlay: "from-blue-500/18 to-blue-600/12 border-blue-300/18",
    tipTone: "blue",
    tipOverlay: "from-blue-500/18 to-blue-600/12 border-blue-300/18",
    indicatorActive: "bg-blue-400",
    modalAccent: "from-blue-400/20 via-blue-500/16 to-blue-600/18",
    preview: "bg-[linear-gradient(135deg,#07132d_0%,#1347a6_100%)]",
  },
  {
    key: "emerald",
    category: "classic",
    label: "Emerald Green",
    chip: "Single-color green",
    pageSurface: "bg-[linear-gradient(180deg,#041510_0%,#0a2a1f_46%,#081c16_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[360px] before:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_60%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[250px] after:bg-[radial-gradient(circle_at_bottom,rgba(52,211,153,0.10),transparent_58%)]",
    heroShell: "border-emerald-300/15 bg-[linear-gradient(135deg,rgba(6,44,33,0.97)_0%,rgba(7,88,68,0.94)_100%)] shadow-[0_0_0_1px_rgba(52,211,153,0.10),0_16px_38px_rgba(0,0,0,0.34),0_0_44px_rgba(16,185,129,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_36%)]",
    moneyTone: "emerald",
    moneyOverlay: "from-emerald-500/26 to-emerald-600/18 border-emerald-300/24",
    monthTone: "emerald",
    monthOverlay: "from-emerald-500/18 to-emerald-600/12 border-emerald-300/18",
    tipTone: "emerald",
    tipOverlay: "from-emerald-500/18 to-emerald-600/12 border-emerald-300/18",
    indicatorActive: "bg-emerald-400",
    modalAccent: "from-emerald-400/20 via-emerald-500/16 to-emerald-600/18",
    preview: "bg-[linear-gradient(135deg,#041510_0%,#0ea56f_100%)]",
  },
  {
    key: "crimson",
    category: "classic",
    label: "Crimson Red",
    chip: "Single-color red",
    pageSurface: "bg-[linear-gradient(180deg,#190709_0%,#3d1117_44%,#190709_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[360px] before:bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.22),transparent_60%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[250px] after:bg-[radial-gradient(circle_at_bottom,rgba(248,113,113,0.10),transparent_58%)]",
    heroShell: "border-red-300/15 bg-[linear-gradient(135deg,rgba(65,12,20,0.98)_0%,rgba(127,29,29,0.94)_100%)] shadow-[0_0_0_1px_rgba(248,113,113,0.10),0_16px_38px_rgba(0,0,0,0.34),0_0_44px_rgba(239,68,68,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(252,165,165,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.16),transparent_36%)]",
    moneyTone: "gold",
    moneyOverlay: "from-red-500/26 to-rose-600/18 border-red-300/24",
    monthTone: "gold",
    monthOverlay: "from-red-500/18 to-rose-600/12 border-red-300/18",
    tipTone: "gold",
    tipOverlay: "from-red-500/18 to-rose-600/12 border-red-300/18",
    indicatorActive: "bg-red-400",
    modalAccent: "from-red-400/20 via-rose-500/16 to-red-600/18",
    preview: "bg-[linear-gradient(135deg,#190709_0%,#dc2626_100%)]",
  },
  {
    key: "violet",
    category: "classic",
    label: "Deep Violet",
    chip: "Single-color violet",
    pageSurface: "bg-[linear-gradient(180deg,#12071f_0%,#2c1456_46%,#14081f_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[360px] before:bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_60%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[250px] after:bg-[radial-gradient(circle_at_bottom,rgba(196,181,253,0.10),transparent_58%)]",
    heroShell: "border-violet-300/15 bg-[linear-gradient(135deg,rgba(48,15,91,0.98)_0%,rgba(91,33,182,0.94)_100%)] shadow-[0_0_0_1px_rgba(196,181,253,0.10),0_16px_38px_rgba(0,0,0,0.34),0_0_44px_rgba(168,85,247,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(216,180,254,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_36%)]",
    moneyTone: "blue",
    moneyOverlay: "from-violet-500/26 to-violet-600/18 border-violet-300/24",
    monthTone: "blue",
    monthOverlay: "from-violet-500/18 to-violet-600/12 border-violet-300/18",
    tipTone: "blue",
    tipOverlay: "from-violet-500/18 to-violet-600/12 border-violet-300/18",
    indicatorActive: "bg-violet-400",
    modalAccent: "from-violet-400/20 via-violet-500/16 to-violet-600/18",
    preview: "bg-[linear-gradient(135deg,#12071f_0%,#8b5cf6_100%)]",
  },
  {
    key: "midnight",
    category: "aesthetic",
    label: "Midnight CLARA",
    chip: "Default glow",
    pageSurface: "bg-[linear-gradient(180deg,#030b14_0%,#06131d_42%,#04111b_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[420px] before:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.14),transparent_58%)]",
    heroShell: "border-cyan-300/15 bg-[linear-gradient(135deg,rgba(10,25,60,0.95)_0%,rgba(8,20,40,0.95)_38%,rgba(38,18,46,0.94)_66%,rgba(92,16,28,0.72)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_14px_34px_rgba(0,0,0,0.35),0_0_40px_rgba(59,130,246,0.10),0_0_30px_rgba(220,38,38,0.08)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(220,38,38,0.16),transparent_38%),radial-gradient(circle_at_center,rgba(250,204,21,0.08),transparent_58%)]",
    moneyTone: "blue",
    moneyOverlay: "from-cyan-500/20 to-emerald-500/20 border-cyan-400/20",
    monthTone: "emerald",
    monthOverlay: "from-emerald-500/16 to-cyan-500/12 border-emerald-300/18",
    tipTone: "emerald",
    tipOverlay: "from-emerald-500/18 to-teal-500/16 border-emerald-300/18",
    indicatorActive: "bg-emerald-400",
    modalAccent: "from-cyan-400/20 via-blue-500/18 to-emerald-400/20",
    preview: "bg-[linear-gradient(135deg,#071828_0%,#0b2a4a_45%,#341127_100%)]",
  },
  {
    key: "rainy",
    category: "aesthetic",
    label: "Rainy Season",
    chip: "Storm blue",
    pageSurface: "bg-[linear-gradient(180deg,#04101b_0%,#072136_38%,#0a3150_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[440px] before:bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(56,189,248,0.16),transparent_58%)]",
    heroShell: "border-sky-300/15 bg-[linear-gradient(145deg,rgba(4,15,34,0.98)_0%,rgba(10,32,64,0.96)_38%,rgba(18,58,94,0.92)_72%,rgba(29,78,120,0.88)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_16px_38px_rgba(0,0,0,0.34),0_0_44px_rgba(56,189,248,0.16)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_36%),radial-gradient(circle_at_center,rgba(191,219,254,0.08),transparent_58%)]",
    moneyTone: "blue",
    moneyOverlay: "from-sky-500/24 to-cyan-500/18 border-sky-300/30",
    monthTone: "teal",
    monthOverlay: "from-sky-500/16 to-cyan-500/12 border-sky-300/20",
    tipTone: "blue",
    tipOverlay: "from-blue-500/20 to-sky-500/16 border-sky-300/20",
    indicatorActive: "bg-sky-400",
    modalAccent: "from-sky-400/20 via-cyan-500/16 to-blue-500/18",
    preview: "bg-[linear-gradient(135deg,#061427_0%,#0a3358_50%,#146c94_100%)]",
  },
  {
    key: "sunset",
    category: "aesthetic",
    label: "Sunset Glow",
    chip: "Warm reward",
    pageSurface: "bg-[linear-gradient(180deg,#2e0f10_0%,#7b2d26_34%,#ea580c_72%,#3b1207_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.22),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(244,114,182,0.14),transparent_58%)]",
    heroShell: "border-orange-300/15 bg-[linear-gradient(135deg,rgba(70,20,10,0.97)_0%,rgba(180,83,9,0.92)_48%,rgba(190,24,93,0.84)_100%)] shadow-[0_0_0_1px_rgba(254,215,170,0.10),0_18px_40px_rgba(0,0,0,0.34),0_0_46px_rgba(251,146,60,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(253,186,116,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.18),transparent_34%)]",
    moneyTone: "gold",
    moneyOverlay: "from-orange-500/24 to-pink-500/18 border-orange-300/25",
    monthTone: "gold",
    monthOverlay: "from-orange-500/16 to-pink-500/12 border-orange-300/20",
    tipTone: "gold",
    tipOverlay: "from-orange-500/18 to-pink-500/12 border-orange-300/20",
    indicatorActive: "bg-orange-400",
    modalAccent: "from-orange-400/20 via-amber-500/16 to-pink-500/18",
    preview: "bg-[linear-gradient(135deg,#431407_0%,#f97316_62%,#ec4899_100%)]",
  },
  {
    key: "ocean",
    category: "aesthetic",
    label: "Ocean Flow",
    chip: "Aqua balance",
    pageSurface: "bg-[linear-gradient(180deg,#031319_0%,#083344_34%,#0f766e_70%,#07272a_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.20),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(34,211,238,0.14),transparent_58%)]",
    heroShell: "border-teal-300/15 bg-[linear-gradient(135deg,rgba(3,30,38,0.97)_0%,rgba(8,83,95,0.94)_56%,rgba(14,116,144,0.84)_100%)] shadow-[0_0_0_1px_rgba(153,246,228,0.10),0_18px_42px_rgba(0,0,0,0.34),0_0_48px_rgba(45,212,191,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(153,246,228,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_34%)]",
    moneyTone: "teal",
    moneyOverlay: "from-teal-500/24 to-cyan-500/18 border-teal-300/24",
    monthTone: "teal",
    monthOverlay: "from-teal-500/16 to-cyan-500/12 border-teal-300/18",
    tipTone: "teal",
    tipOverlay: "from-teal-500/18 to-cyan-500/12 border-teal-300/18",
    indicatorActive: "bg-teal-400",
    modalAccent: "from-teal-400/20 via-cyan-500/16 to-sky-500/18",
    preview: "bg-[linear-gradient(135deg,#042f2e_0%,#0891b2_55%,#5eead4_100%)]",
  },
  {
    key: "forest",
    category: "aesthetic",
    label: "Forest Deep",
    chip: "Earth calm",
    pageSurface: "bg-[linear-gradient(180deg,#07130b_0%,#18331f_36%,#365314_72%,#111827_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[420px] before:bg-[radial-gradient(circle_at_top,rgba(101,163,13,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[310px] after:bg-[radial-gradient(circle_at_bottom,rgba(34,197,94,0.12),transparent_58%)]",
    heroShell: "border-lime-300/15 bg-[linear-gradient(135deg,rgba(15,37,15,0.97)_0%,rgba(39,72,22,0.92)_54%,rgba(77,124,15,0.84)_100%)] shadow-[0_0_0_1px_rgba(190,242,100,0.08),0_18px_42px_rgba(0,0,0,0.34),0_0_42px_rgba(101,163,13,0.12)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.14),transparent_36%)]",
    moneyTone: "emerald",
    moneyOverlay: "from-lime-500/18 to-emerald-500/18 border-lime-300/18",
    monthTone: "emerald",
    monthOverlay: "from-lime-500/14 to-emerald-500/12 border-lime-300/16",
    tipTone: "emerald",
    tipOverlay: "from-lime-500/16 to-emerald-500/12 border-lime-300/16",
    indicatorActive: "bg-lime-400",
    modalAccent: "from-lime-400/18 via-emerald-500/14 to-lime-600/14",
    preview: "bg-[linear-gradient(135deg,#0f2410_0%,#4d7c0f_58%,#86efac_100%)]",
  },
  {
    key: "rainbow",
    category: "aesthetic",
    label: "Rainbow Pop",
    chip: "Bold spectrum",
    pageSurface: "bg-[linear-gradient(180deg,#250a3d_0%,#0b2454_28%,#0b4f45_58%,#663f0a_82%,#3a0c16_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[460px] before:bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.20),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[360px] after:bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.14),transparent_58%)]",
    heroShell: "border-fuchsia-300/15 bg-[linear-gradient(135deg,rgba(56,10,72,0.96)_0%,rgba(16,42,103,0.96)_22%,rgba(4,120,87,0.94)_48%,rgba(202,138,4,0.92)_70%,rgba(153,27,27,0.90)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.34),0_0_52px_rgba(217,70,239,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_32%)]",
    moneyTone: "gold",
    moneyOverlay: "from-fuchsia-500/24 via-cyan-500/18 to-emerald-500/18 border-fuchsia-300/28",
    monthTone: "blue",
    monthOverlay: "from-fuchsia-500/16 via-sky-500/12 to-amber-500/12 border-fuchsia-300/20",
    tipTone: "emerald",
    tipOverlay: "from-emerald-500/18 via-cyan-500/12 to-fuchsia-500/14 border-emerald-300/18",
    indicatorActive: "bg-fuchsia-400",
    modalAccent: "from-fuchsia-400/22 via-sky-500/18 to-amber-400/18",
    preview: "bg-[linear-gradient(135deg,#591c87_0%,#1d4ed8_28%,#059669_56%,#f59e0b_78%,#dc2626_100%)]",
  },
  {
    key: "dawn-blade",
    category: "anime",
    label: "Dawn Blade",
    chip: "Sunrise swordsman",
    pageSurface: "bg-[linear-gradient(180deg,#1c0b07_0%,#7c2d12_42%,#f97316_76%,#2a0f08_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.22),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(254,215,170,0.10),transparent_58%)]",
    heroShell: "border-orange-300/15 bg-[linear-gradient(135deg,rgba(74,24,7,0.98)_0%,rgba(194,65,12,0.92)_58%,rgba(251,146,60,0.82)_100%)] shadow-[0_0_0_1px_rgba(253,186,116,0.10),0_18px_42px_rgba(0,0,0,0.34),0_0_44px_rgba(249,115,22,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(254,215,170,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.16),transparent_34%)]",
    moneyTone: "gold",
    moneyOverlay: "from-orange-500/24 to-amber-500/18 border-orange-300/24",
    monthTone: "gold",
    monthOverlay: "from-orange-500/18 to-amber-500/12 border-orange-300/18",
    tipTone: "gold",
    tipOverlay: "from-orange-500/18 to-amber-500/12 border-orange-300/18",
    indicatorActive: "bg-orange-400",
    modalAccent: "from-orange-400/20 via-amber-500/16 to-orange-600/18",
    preview: "bg-[linear-gradient(135deg,#431407_0%,#ea580c_62%,#fdba74_100%)]",
  },
  {
    key: "moon-aura",
    category: "anime",
    label: "Moon Aura",
    chip: "Mystic silver-blue",
    pageSurface: "bg-[linear-gradient(180deg,#060a19_0%,#1e1b4b_42%,#312e81_76%,#090d1d_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(165,180,252,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(129,140,248,0.12),transparent_58%)]",
    heroShell: "border-indigo-300/15 bg-[linear-gradient(135deg,rgba(8,14,39,0.98)_0%,rgba(49,46,129,0.92)_58%,rgba(99,102,241,0.82)_100%)] shadow-[0_0_0_1px_rgba(199,210,254,0.10),0_18px_42px_rgba(0,0,0,0.34),0_0_44px_rgba(99,102,241,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(224,231,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.16),transparent_34%)]",
    moneyTone: "blue",
    moneyOverlay: "from-indigo-500/24 to-blue-500/18 border-indigo-300/24",
    monthTone: "blue",
    monthOverlay: "from-indigo-500/18 to-blue-500/12 border-indigo-300/18",
    tipTone: "blue",
    tipOverlay: "from-indigo-500/18 to-blue-500/12 border-indigo-300/18",
    indicatorActive: "bg-indigo-400",
    modalAccent: "from-indigo-400/20 via-blue-500/16 to-violet-500/18",
    preview: "bg-[linear-gradient(135deg,#0b122e_0%,#4338ca_60%,#93c5fd_100%)]",
  },
  {
    key: "spirit-sakura",
    category: "anime",
    label: "Spirit Sakura",
    chip: "Pink + magenta bloom",
    pageSurface: "bg-[linear-gradient(180deg,#2b0b1b_0%,#7a1638_42%,#db2777_76%,#2a0a18_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(251,207,232,0.10),transparent_58%)]",
    heroShell: "border-pink-300/15 bg-[linear-gradient(135deg,rgba(72,13,32,0.98)_0%,rgba(157,23,77,0.92)_58%,rgba(236,72,153,0.82)_100%)] shadow-[0_0_0_1px_rgba(251,207,232,0.10),0_18px_42px_rgba(0,0,0,0.34),0_0_44px_rgba(236,72,153,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(251,207,232,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.16),transparent_34%)]",
    moneyTone: "gold",
    moneyOverlay: "from-pink-500/24 to-fuchsia-500/18 border-pink-300/24",
    monthTone: "gold",
    monthOverlay: "from-pink-500/18 to-fuchsia-500/12 border-pink-300/18",
    tipTone: "gold",
    tipOverlay: "from-pink-500/18 to-fuchsia-500/12 border-pink-300/18",
    indicatorActive: "bg-pink-400",
    modalAccent: "from-pink-400/20 via-fuchsia-500/16 to-rose-500/18",
    preview: "bg-[linear-gradient(135deg,#4a1029_0%,#db2777_62%,#f9a8d4_100%)]",
  },
  {
    key: "hero-red",
    category: "marvel",
    label: "Hero Red",
    chip: "Iconic action red",
    pageSurface: "bg-[linear-gradient(180deg,#060d1d_0%,#0d2145_36%,#3d111b_72%,#19080c_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[330px] after:bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.14),transparent_58%)]",
    heroShell: "border-red-300/15 bg-[linear-gradient(135deg,rgba(6,16,40,0.97)_0%,rgba(11,30,74,0.95)_42%,rgba(92,16,28,0.92)_72%,rgba(127,29,29,0.90)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_42px_rgba(0,0,0,0.34),0_0_52px_rgba(239,68,68,0.12),0_0_42px_rgba(59,130,246,0.10)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.18),transparent_34%),radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_58%)]",
    moneyTone: "blue",
    moneyOverlay: "from-blue-500/24 to-red-500/20 border-red-300/25",
    monthTone: "blue",
    monthOverlay: "from-red-500/14 to-blue-500/14 border-red-300/20",
    tipTone: "gold",
    tipOverlay: "from-amber-500/18 to-red-500/14 border-amber-300/20",
    indicatorActive: "bg-red-400",
    modalAccent: "from-blue-500/20 via-red-500/18 to-slate-200/10",
    preview: "bg-[linear-gradient(135deg,#07122a_0%,#123a7a_40%,#7f1d1d_100%)]",
  },
  {
    key: "gamma-smash",
    category: "marvel",
    label: "Gamma Smash",
    chip: "Power green",
    pageSurface: "bg-[linear-gradient(180deg,#071209_0%,#12321a_36%,#3f6212_72%,#10140b_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(163,230,53,0.12),transparent_58%)]",
    heroShell: "border-lime-300/15 bg-[linear-gradient(135deg,rgba(11,27,11,0.98)_0%,rgba(34,84,20,0.92)_58%,rgba(101,163,13,0.82)_100%)] shadow-[0_0_0_1px_rgba(217,249,157,0.08),0_18px_42px_rgba(0,0,0,0.34),0_0_44px_rgba(132,204,22,0.12)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.16),transparent_34%)]",
    moneyTone: "emerald",
    moneyOverlay: "from-lime-500/24 to-emerald-500/18 border-lime-300/22",
    monthTone: "emerald",
    monthOverlay: "from-lime-500/16 to-emerald-500/12 border-lime-300/18",
    tipTone: "emerald",
    tipOverlay: "from-lime-500/16 to-emerald-500/12 border-lime-300/18",
    indicatorActive: "bg-lime-400",
    modalAccent: "from-lime-400/20 via-emerald-500/16 to-green-500/18",
    preview: "bg-[linear-gradient(135deg,#0b1c0f_0%,#4d7c0f_62%,#bef264_100%)]",
  },
  {
    key: "arc-reactor",
    category: "marvel",
    label: "Arc Reactor",
    chip: "Tech cyan",
    pageSurface: "bg-[linear-gradient(180deg,#03111a_0%,#083146_36%,#0e7490_72%,#06131d_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(103,232,249,0.12),transparent_58%)]",
    heroShell: "border-cyan-300/15 bg-[linear-gradient(135deg,rgba(6,22,36,0.98)_0%,rgba(8,83,118,0.92)_58%,rgba(34,211,238,0.78)_100%)] shadow-[0_0_0_1px_rgba(165,243,252,0.08),0_18px_42px_rgba(0,0,0,0.34),0_0_46px_rgba(34,211,238,0.14)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(165,243,252,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_34%)]",
    moneyTone: "teal",
    moneyOverlay: "from-cyan-500/24 to-sky-500/18 border-cyan-300/22",
    monthTone: "teal",
    monthOverlay: "from-cyan-500/16 to-sky-500/12 border-cyan-300/18",
    tipTone: "teal",
    tipOverlay: "from-cyan-500/16 to-sky-500/12 border-cyan-300/18",
    indicatorActive: "bg-cyan-400",
    modalAccent: "from-cyan-400/20 via-sky-500/16 to-blue-500/18",
    preview: "bg-[linear-gradient(135deg,#06273b_0%,#0891b2_62%,#67e8f9_100%)]",
  },
  {
    key: "messenger",
    category: "signature",
    label: "Messenger Pulse",
    chip: "Social neon",
    pageSurface: "bg-[linear-gradient(180deg,#051624_0%,#0b2a44_34%,#1649a1_64%,#432785_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_58%)]",
    heroShell: "border-cyan-300/15 bg-[linear-gradient(135deg,rgba(4,18,38,0.97)_0%,rgba(8,47,73,0.95)_30%,rgba(37,99,235,0.90)_58%,rgba(168,85,247,0.84)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_42px_rgba(0,0,0,0.34),0_0_52px_rgba(34,211,238,0.12),0_0_42px_rgba(168,85,247,0.10)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_58%)]",
    moneyTone: "teal",
    moneyOverlay: "from-cyan-500/24 to-violet-500/18 border-cyan-300/28",
    monthTone: "blue",
    monthOverlay: "from-cyan-500/14 to-violet-500/14 border-cyan-300/20",
    tipTone: "teal",
    tipOverlay: "from-cyan-500/18 via-blue-500/14 to-violet-500/14 border-cyan-300/20",
    indicatorActive: "bg-cyan-400",
    modalAccent: "from-cyan-400/20 via-blue-500/18 to-violet-500/18",
    preview: "bg-[linear-gradient(135deg,#05263b_0%,#2563eb_52%,#8b5cf6_100%)]",
  },
  {
    key: "pirate-gold",
    category: "signature",
    label: "Pirate Gold",
    chip: "Treasure mood",
    pageSurface: "bg-[linear-gradient(180deg,#1c1208_0%,#5b3711_36%,#b45309_72%,#1f1007_100%)]",
    pageGlow: "before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[430px] before:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.22),transparent_58%)] after:absolute after:inset-x-0 after:bottom-0 after:-z-10 after:h-[320px] after:bg-[radial-gradient(circle_at_bottom,rgba(253,230,138,0.10),transparent_58%)]",
    heroShell: "border-amber-300/15 bg-[linear-gradient(135deg,rgba(53,30,9,0.98)_0%,rgba(146,64,14,0.92)_58%,rgba(245,158,11,0.84)_100%)] shadow-[0_0_0_1px_rgba(252,211,77,0.08),0_18px_42px_rgba(0,0,0,0.34),0_0_44px_rgba(245,158,11,0.12)]",
    heroGlow: "bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_34%)]",
    moneyTone: "gold",
    moneyOverlay: "from-amber-500/24 to-orange-500/18 border-amber-300/22",
    monthTone: "gold",
    monthOverlay: "from-amber-500/16 to-orange-500/12 border-amber-300/18",
    tipTone: "gold",
    tipOverlay: "from-amber-500/16 to-orange-500/12 border-amber-300/18",
    indicatorActive: "bg-amber-400",
    modalAccent: "from-amber-400/20 via-orange-500/16 to-yellow-500/18",
    preview: "bg-[linear-gradient(135deg,#2a1807_0%,#d97706_62%,#fde68a_100%)]",
  },
];

const dashboardRuntimeThemes = new Map();
const dashboardRuntimeSurvivalExpenses = new Map();

const getDashboardThemeStorageKey = (userId) =>
  `clara_dashboard_theme_${userId || "guest"}`;

function readStoredDashboardTheme(userId) {
  const raw = dashboardRuntimeThemes.get(getDashboardThemeStorageKey(userId));
  const exists = DASHBOARD_THEME_PRESETS.some((theme) => theme.key === raw);
  return exists ? raw : DASHBOARD_THEME_PRESETS[0].key;
}

function persistDashboardTheme(userId, themeKey) {
  dashboardRuntimeThemes.set(getDashboardThemeStorageKey(userId), themeKey);
  const detail = { themeKey, key: themeKey, dashboardTheme: themeKey, userId: userId || null };
  dispatchClaraEvent("clara-dashboard-theme-updated", detail);
  dispatchClaraEvent("clara-theme-selected", detail);
  dispatchClaraEvent("clara-theme-change", detail);
}

const dispatchClaraEvent = (name, detail = null) => {
  if (typeof window === "undefined") return;
  if (detail && typeof detail === "object") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return;
  }
  window.dispatchEvent(new Event(name));
};

const readStoredSurvivalExpense = (userId) => firstPositiveNumber(dashboardRuntimeSurvivalExpenses.get(userId || "guest"));

const persistStoredSurvivalExpense = (userId, value) => {
  const amount = firstPositiveNumber(value);
  if (amount <= 0) return;
  dashboardRuntimeSurvivalExpenses.set(userId || "guest", amount);
  dispatchClaraEvent("clara:survival-expense-updated", { amount, monthlyEssentialExpenses: amount, monthly_survival_expense: amount, survivalExpense: amount, survival_expense: amount });
};

const createEmptyDashboardCache = (key = null) => ({
  key,
  loaded: false,
  tasks: [],
  submissions: [],
  programRecord: null,
  billboards: getSafeBillboards([]),
  survivalExpense: 0,
  walletMoney: 0,
  wallets: [],
  walletTransactions: [],
  budgets: [],
  savingsGoals: [],
  expenses: [],
  pendingExpenses: [],
  offlineReady: false,
  profileData: null,
  latestEnrollment: null,
  guardChecked: false,
  nickname: "",
  reminderTime: "",
  financialGoal: "",
});

let dashboardPageCache = createEmptyDashboardCache();
let dashboardPageInFlight = null;


const DASHBOARD_PANEL_ORDER = ["home", "feed", "messages", "settings"];

const dashboardPanelCardClass =
  "rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl";

const dashboardPanelTextClass = "text-white/65";

const dashboardPanelFormatTime = (dateString) => {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

const dashboardPanelInitials = (value = "") => {
  const parts = String(value || "")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

function DashboardPanelShell({
  title,
  subtitle,
  icon: Icon,
  viewAllTo,
  viewAllLabel = "View full page",
  onBack,
  children,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{title}</p>
            <p className="truncate text-xs text-white/55">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {viewAllTo ? (
            <Link
              to={viewAllTo}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/12"
            >
              {viewAllLabel}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/12"
          >
            Home
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

function DashboardFeedPanel({ onBack }) {
  const FEED_STORAGE_BUCKET = "feed-media";
  const createFeedUuid = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  };
  const FEED_CATEGORIES = [
    { key: "achievement", label: "Achievement" },
    { key: "testimony", label: "Testimony" },
    { key: "advice", label: "Advice" },
    { key: "question", label: "Question" },
    { key: "motivation", label: "Motivation" },
    { key: "thought", label: "Thought" },
  ];

  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("You");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState("");

  const [newPost, setNewPost] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("achievement");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMedia, setComposerMedia] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [activeYoutubePosts, setActiveYoutubePosts] = useState({});

  useEffect(() => {
    setComposerOpen(false);
  }, []);

  const getYoutubeId = useCallback((value = "") => {
    const text = value.trim();
    if (!text) return null;

    try {
      if (text.includes("youtu.be/")) {
        return text.split("youtu.be/")[1]?.split(/[?&/]/)[0] || null;
      }

      if (text.includes("/shorts/")) {
        return text.split("/shorts/")[1]?.split(/[?&/]/)[0] || null;
      }

      if (text.includes("/embed/")) {
        return text.split("/embed/")[1]?.split(/[?&/]/)[0] || null;
      }

      const url = new URL(text);
      return url.searchParams.get("v");
    } catch {
      return null;
    }
  }, []);

  const mapFeedPost = useCallback((row, comments = []) => {
    let media = null;

    if (row.media_type === "image" || row.media_type === "video") {
      media = {
        type: row.media_type,
        url: row.media_url,
        path: row.media_path,
        name: row.media_name,
        mimeType: row.media_mime_type,
      };
    }

    if (row.media_type === "youtube") {
      media = {
        type: "youtube",
        url: row.youtube_url,
        embedUrl: row.youtube_embed_url,
        youtubeId: row.youtube_id,
        thumbnailUrl: row.youtube_thumbnail_url,
        name: row.media_name || "YouTube video",
      };
    }

    return {
      id: row.id,
      author_id: row.author_id || null,
      author_name: row.author_name || "CLARA User",
      content: row.content || "",
      category: row.category || "achievement",
      likes: Number(row.likes || 0),
      liked_by: Array.isArray(row.liked_by) ? row.liked_by : [],
      comments: comments.map((comment) => ({
        id: comment.id,
        post_id: comment.post_id,
        author_id: comment.author_id || null,
        author_name: comment.author_name || "CLARA User",
        content: comment.content || "",
        created_at: comment.created_at || new Date().toISOString(),
      })),
      media,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || null,
    };
  }, []);

  const fetchFeedUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      setCurrentUser(user || null);

      if (!user) {
        setCurrentUserName("You");
        return null;
      }

      const fallbackName =
        user.user_metadata?.display_name ||
        user.user_metadata?.nickname ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")?.[0] ||
        "You";

      setCurrentUserName(fallbackName);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && profileData) {
        setCurrentUserName(profileData.full_name || fallbackName);
      }

      return user;
    } catch (userError) {
      console.error("Dashboard feed user fetch failed:", userError);
      setCurrentUser(null);
      setCurrentUserName("You");
      return null;
    }
  }, []);

  const fetchFeedPosts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const { data: postsData, error: postsError } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const postIds = (postsData || []).map((post) => post.id);
      let commentsData = [];

      if (postIds.length > 0) {
        const { data, error: commentsError } = await supabase
          .from("feed_comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        if (commentsError) throw commentsError;
        commentsData = Array.isArray(data) ? data : [];
      }

      const commentsByPostId = commentsData.reduce((acc, comment) => {
        if (!acc[comment.post_id]) acc[comment.post_id] = [];
        acc[comment.post_id].push(comment);
        return acc;
      }, {});

      setPosts(
        (postsData || []).map((postRow) =>
          mapFeedPost(postRow, commentsByPostId[postRow.id] || [])
        )
      );
    } catch (feedError) {
      console.error("Dashboard feed fetch failed:", feedError);
      setError(feedError?.message || "Unable to load the feed right now.");
    } finally {
      setLoading(false);
    }
  }, [mapFeedPost]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await fetchFeedUser();
      if (mounted) await fetchFeedPosts(true);
    };

    init();

    const channel = supabase
      .channel("dashboard-full-feed-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feed_posts" },
        () => fetchFeedPosts(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feed_comments" },
        () => fetchFeedPosts(false)
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
        URL.revokeObjectURL(composerMedia.previewUrl);
      }
    };
  }, [fetchFeedPosts, fetchFeedUser]);

  const resetComposer = useCallback(() => {
    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setNewPost("");
    setSelectedCategory("achievement");
    setComposerMedia(null);
    setYoutubeLink("");
    setError("");
  }, [composerMedia]);

  const uploadFeedMedia = useCallback(async (file, userId) => {
    if (!file) return null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "";
    const filePath = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}${fileExt ? `.${fileExt}` : ""}`;

    const { error: uploadError } = await supabase.storage
      .from(FEED_STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(FEED_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrlData?.publicUrl || "",
      name: file.name,
      mimeType: file.type || "",
      type: file.type?.startsWith("video/") ? "video" : "image",
    };
  }, []);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setYoutubeLink("");

    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    const supported =
      file.type?.startsWith("image/") || file.type?.startsWith("video/");

    if (!supported) {
      setError("Use an image or video file for the feed.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setComposerMedia({
      type: file.type.startsWith("video/") ? "video" : "image",
      url: previewUrl,
      previewUrl,
      name: file.name,
      mimeType: file.type,
      file,
    });
  }, [composerMedia]);

  const applyYoutubeLink = useCallback((rawValue = youtubeLink, options = {}) => {
    const trimmed = String(rawValue || "").trim();
    const youtubeId = getYoutubeId(trimmed);

    if (!youtubeId) {
      if (!options.silent) setError("Paste a valid YouTube video link.");
      return false;
    }

    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setError("");
    setComposerMedia({
      type: "youtube",
      url: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      youtubeId,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      name: "YouTube video",
      file: null,
    });

    return true;
  }, [composerMedia, getYoutubeId, youtubeLink]);

  const handlePost = useCallback(async () => {
    const content = newPost.trim();

    if (!content && !composerMedia) return;

    if (content.length > 280) {
      setError("Post must be 280 characters or less.");
      return;
    }

    setPosting(true);
    setError("");

    try {
      const freshUser = currentUser || (await fetchFeedUser());

      if (!freshUser?.id) {
        throw new Error("Please log in again before posting.");
      }

      let mediaPayload = {
        media_type: null,
        media_url: null,
        media_path: null,
        media_name: null,
        media_mime_type: null,
        youtube_url: null,
        youtube_embed_url: null,
        youtube_id: null,
        youtube_thumbnail_url: null,
      };

      if (composerMedia?.type === "image" || composerMedia?.type === "video") {
        const uploaded = await uploadFeedMedia(composerMedia.file, freshUser.id);

        mediaPayload = {
          media_type: uploaded.type,
          media_url: uploaded.url,
          media_path: uploaded.path,
          media_name: uploaded.name,
          media_mime_type: uploaded.mimeType,
          youtube_url: null,
          youtube_embed_url: null,
          youtube_id: null,
          youtube_thumbnail_url: null,
        };
      }

      if (composerMedia?.type === "youtube") {
        mediaPayload = {
          media_type: "youtube",
          media_url: null,
          media_path: null,
          media_name: composerMedia.name || "YouTube video",
          media_mime_type: null,
          youtube_url: composerMedia.url || null,
          youtube_embed_url: composerMedia.embedUrl || null,
          youtube_id: composerMedia.youtubeId || null,
          youtube_thumbnail_url: composerMedia.thumbnailUrl || null,
        };
      }

      const insertPayload = {
        id: createFeedUuid(),
        author_id: freshUser.id,
        author_name: currentUserName || freshUser.email?.split("@")?.[0] || "You",
        content,
        category: selectedCategory,
        likes: 0,
        liked_by: [],
        ...mediaPayload,
      };

      const { data: insertedPost, error: insertError } = await supabase
        .from("feed_posts")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (insertedPost) {
        setPosts((prev) => [mapFeedPost(insertedPost, []), ...prev]);
      } else {
        await fetchFeedPosts(false);
      }

      resetComposer();
      setComposerOpen(false);
    } catch (postError) {
      console.error("Dashboard feed post failed:", postError);
      setError(postError?.message || "Unable to post right now.");
    } finally {
      setPosting(false);
    }
  }, [
    composerMedia,
    createFeedUuid,
    currentUser,
    currentUserName,
    fetchFeedPosts,
    fetchFeedUser,
    mapFeedPost,
    newPost,
    resetComposer,
    selectedCategory,
    uploadFeedMedia,
  ]);

  const handleLike = useCallback(async (post) => {
    const likerId = currentUser?.id;
    if (!likerId) {
      setError("Please log in again to like posts.");
      return;
    }

    const alreadyLiked = Array.isArray(post.liked_by)
      ? post.liked_by.includes(likerId)
      : false;

    const nextLikedBy = alreadyLiked
      ? post.liked_by.filter((id) => id !== likerId)
      : [...(post.liked_by || []), likerId];

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, liked_by: nextLikedBy, likes: nextLikedBy.length }
          : item
      )
    );

    const { error: likeError } = await supabase
      .from("feed_posts")
      .update({
        liked_by: nextLikedBy,
        likes: nextLikedBy.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (likeError) {
      console.error("Dashboard feed like failed:", likeError);
      await fetchFeedPosts(false);
    }
  }, [currentUser?.id, fetchFeedPosts]);

  const handleComment = useCallback(async (postId) => {
    const content = commentTexts[postId]?.trim();

    if (!content) return;

    setSavingComment(true);
    setError("");

    try {
      const freshUser = currentUser || (await fetchFeedUser());

      if (!freshUser?.id) {
        throw new Error("Please log in again before commenting.");
      }

      const commentPayload = {
        id: createFeedUuid(),
        post_id: postId,
        author_id: freshUser.id,
        author_name: currentUserName || freshUser.email?.split("@")?.[0] || "You",
        content,
      };

      const { data: insertedComment, error: commentError } = await supabase
        .from("feed_comments")
        .insert(commentPayload)
        .select("*")
        .single();

      if (commentError) throw commentError;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...(post.comments || []), insertedComment] }
            : post
        )
      );

      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      setOpenComments((prev) => ({ ...prev, [postId]: true }));
    } catch (commentError) {
      console.error("Dashboard feed comment failed:", commentError);
      setError(commentError?.message || "Unable to comment right now.");
    } finally {
      setSavingComment(false);
    }
  }, [commentTexts, currentUser, currentUserName, fetchFeedUser]);

  const handleDeletePost = useCallback(async (post) => {
    if (!currentUser?.id || post.author_id !== currentUser.id) return;

    try {
      if (post.media?.path) {
        await supabase.storage.from(FEED_STORAGE_BUCKET).remove([post.media.path]);
      }

      await supabase.from("feed_comments").delete().eq("post_id", post.id);

      const { error: deleteError } = await supabase
        .from("feed_posts")
        .delete()
        .eq("id", post.id);

      if (deleteError) throw deleteError;

      setPosts((prev) => prev.filter((item) => item.id !== post.id));
    } catch (deleteError) {
      console.error("Dashboard feed delete failed:", deleteError);
      setError(deleteError?.message || "Unable to delete post.");
    }
  }, [currentUser?.id]);

  const renderFeedMedia = (post) => {
    const media = post.media;
    if (!media) return null;

    if (media.type === "image" && media.url) {
      return (
        <div className="mx-auto mt-3 w-full max-w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
          <img
            src={media.url}
            alt={media.name || "Feed media"}
            className="max-h-[340px] w-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    if (media.type === "video" && media.url) {
      return (
        <div className="mx-auto mt-3 w-full max-w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
          <video
            src={media.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video max-h-[340px] w-full bg-black object-contain"
          />
        </div>
      );
    }

    if (media.type === "youtube" && media.embedUrl) {
      const isActive = activeYoutubePosts[post.id];

      if (!isActive) {
        return (
          <button
            type="button"
            onClick={() => setActiveYoutubePosts((prev) => ({ ...prev, [post.id]: true }))}
            className="relative mx-auto mt-3 block w-full max-w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/30 text-left touch-pan-y"
            aria-label="Play YouTube video inline"
          >
            <div className="relative aspect-video w-full bg-black">
              {media.thumbnailUrl ? (
                <img
                  src={media.thumbnailUrl}
                  alt="YouTube preview"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/50">
                  YouTube preview
                </div>
              )}

              <div className="absolute inset-0 bg-black/20" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
                  <Play className="ml-1 h-7 w-7 fill-current" />
                </div>
              </div>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-center text-[10px] font-bold text-white/70 backdrop-blur-md">
                Tap to load player
              </div>
            </div>
          </button>
        );
      }

      return (
        <div className="mx-auto mt-3 w-full max-w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/30 shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
          <div className="relative aspect-video w-full">
            <iframe
              src={`${media.embedUrl}?autoplay=0&playsinline=1&rel=0&modestbranding=1&controls=1&fs=1`}
              title="YouTube video"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4 touch-pan-y overscroll-y-contain">

      <div className="rounded-[30px] border border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),rgba(255,255,255,0.055)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setComposerOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-left transition hover:bg-white/8 ${composerOpen ? "mb-3" : ""}`}
          aria-expanded={composerOpen}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
              <Plus className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Share something</p>
              <p className="text-xs text-white/55">Win, question, advice, or update</p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-white/45 transition ${composerOpen ? "rotate-90" : ""}`} />
        </button>

        <div
          className={`grid transition-all duration-300 ease-out ${
            composerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!composerOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-3">
            <textarea
              value={newPost}
              onChange={(event) => setNewPost(event.target.value)}
              placeholder={`What's happening, ${currentUserName}?`}
              maxLength={280}
              className="min-h-[96px] w-full resize-none rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/35"
            />

            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FEED_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setSelectedCategory(category.key)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold transition ${
                    selectedCategory === category.key
                      ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
                      : "border-white/10 bg-white/6 text-white/55"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {composerMedia ? (
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold text-white/70">{composerMedia.name || "Attached media"}</p>
                  <button type="button" onClick={() => { setComposerMedia(null); setYoutubeLink(""); }} className="rounded-full bg-white/10 p-1 text-white/70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {composerMedia.type === "image" ? (
                  <img src={composerMedia.url || composerMedia.thumbnailUrl} alt="Composer media" className="max-h-[220px] w-full rounded-2xl object-cover" />
                ) : composerMedia.type === "video" ? (
                  <video src={composerMedia.url} controls playsInline className="max-h-[220px] w-full rounded-2xl bg-black" />
                ) : (
                  <img src={composerMedia.thumbnailUrl} alt="YouTube preview" className="max-h-[220px] w-full rounded-2xl object-cover" />
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/70 transition hover:bg-white/12">
                <ImageIcon className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3 py-2">
                <input
                  value={youtubeLink}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setYoutubeLink(nextValue);
                    applyYoutubeLink(nextValue, { silent: true });
                  }}
                  onPaste={(event) => {
                    const pastedValue = event.clipboardData?.getData("text") || "";
                    if (pastedValue) {
                      applyYoutubeLink(pastedValue, { silent: true });
                    }
                  }}
                  placeholder="Paste YouTube link"
                  className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
                />
              </div>

              <button
                type="button"
                onClick={handlePost}
                disabled={posting || (!newPost.trim() && !composerMedia)}
                className="h-11 rounded-2xl bg-emerald-400 px-4 text-xs font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] disabled:opacity-45"
              >
                {posting ? "Posting" : "Post"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] text-white/40">
              <span>{newPost.length}/280</span>
              <button type="button" onClick={resetComposer} className="font-semibold text-white/50">
                Clear
              </button>
            </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-[30px] border border-white/10 bg-white/6" />
          <div className="h-28 animate-pulse rounded-[30px] border border-white/10 bg-white/6" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          <p className="text-sm font-bold text-white">No posts yet</p>
          <p className="mt-1 text-xs text-white/55">Be the first to share a win or question.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const liked = currentUser?.id && post.liked_by?.includes(currentUser.id);
            const canDelete = currentUser?.id && post.author_id === currentUser.id;
            const commentsOpen = openComments[post.id];

            return (
              <article
                key={post.id}
                className="rounded-[30px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white">
                      {dashboardPanelInitials(post.author_name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{post.author_name}</p>
                      <p className="mt-0.5 text-[11px] text-white/42">
                        {dashboardPanelFormatTime(post.created_at)} • {FEED_CATEGORIES.find((item) => item.key === post.category)?.label || "Update"}
                      </p>
                    </div>
                  </div>

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post)}
                      className="shrink-0 rounded-full border border-white/10 bg-white/6 p-2 text-white/45 transition hover:bg-rose-500/10 hover:text-rose-200"
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="mt-3">
                  {post.content ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-white/74">{post.content}</p>
                  ) : null}

                  {renderFeedMedia(post)}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleLike(post)}
                        className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${
                          liked
                            ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                            : "border-white/10 bg-white/6 text-white/60"
                        }`}
                      >
                        {liked ? "Liked" : "Like"} • {post.likes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/10"
                      >
                        Comments • {post.comments?.length || 0}
                      </button>
                    </div>

                    {commentsOpen ? (
                      <div className="mt-4 space-y-3">
                        {(post.comments || []).length > 0 ? (
                          <div className="space-y-2">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="rounded-2xl border border-white/10 bg-black/16 px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-[11px] font-bold text-white/75">{comment.author_name}</p>
                                  <span className="shrink-0 text-[10px] text-white/35">{dashboardPanelFormatTime(comment.created_at)}</span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-white/62">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-2xl border border-white/10 bg-black/14 px-3 py-3 text-center text-xs text-white/45">
                            No comments yet.
                          </p>
                        )}

                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3 py-2">
                          <input
                            value={commentTexts[post.id] || ""}
                            onChange={(event) =>
                              setCommentTexts((prev) => ({
                                ...prev,
                                [post.id]: event.target.value,
                              }))
                            }
                            placeholder="Write a comment..."
                            className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleComment(post.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleComment(post.id)}
                            disabled={savingComment || !commentTexts[post.id]?.trim()}
                            className="rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-black text-slate-950 disabled:opacity-45"
                          >
                            Send
                          </button>
                        </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}



function DashboardMessagesPanel({ onBack }) {
  const { user, isAdmin, access, getFeatureAccessMode, loading: accessLoading } = useUserRole();

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const messagesEndRef = useRef(null);

  const currentUserId = user?.id || null;
  const currentUserEmail = user?.email || "";
  const currentUserName =
    user?.full_name ||
    user?.nickname ||
    user?.display_name ||
    user?.email ||
    "You";

  const messageMode = getFeatureAccessMode?.("messages");
  const hasFullMessaging = isAdmin || !!access?.messagingFull;
  const canMessageAdmins = isAdmin || !!access?.messagingAdminOnly;
  const hasMessagingAccess =
    (hasFullMessaging || canMessageAdmins) && !user?.messaging_disabled;

  const fetchUsers = useCallback(async () => {
    if (!currentUserId) {
      setUsers([]);
      return;
    }

    const { data: baseProfiles, error: baseError } = await supabase
      .from("profiles")
      .select("id,email,full_name");

    if (baseError) {
      console.error("[DashboardMessagesPanel] base profiles fetch failed:", baseError);
      setUsers([]);
      return;
    }

    let optionalProfiles = [];
    const { data: extraProfiles, error: extraError } = await supabase
      .from("profiles")
      .select("id,role,username,display_name");

    if (!extraError) {
      optionalProfiles = Array.isArray(extraProfiles) ? extraProfiles : [];
    } else {
      const { data: fallbackProfiles, error: fallbackError } = await supabase
        .from("profiles")
        .select("id,role");

      if (!fallbackError) {
        optionalProfiles = Array.isArray(fallbackProfiles) ? fallbackProfiles : [];
      }
    }

    const optionalMap = optionalProfiles.reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});

    let merged = (Array.isArray(baseProfiles) ? baseProfiles : []).map((profile) => {
      const extra = optionalMap[profile.id] || {};
      const username = normalizeString(extra?.username || "");
      const displayName =
        normalizeString(profile?.full_name) ||
        normalizeString(extra?.display_name) ||
        username ||
        normalizeString(profile?.email) ||
        "CLARA User";

      return {
        id: profile?.id || null,
        email: profile?.email || "",
        full_name: displayName,
        username,
        role: String(extra?.role || "user").toLowerCase(),
      };
    });

    merged = merged.filter((profile) => {
      if (!profile?.id) return false;
      if (profile.id === currentUserId) return false;
      if (
        currentUserEmail &&
        profile.email &&
        profile.email.toLowerCase() === currentUserEmail.toLowerCase()
      ) {
        return false;
      }
      return true;
    });

    if (!hasFullMessaging && canMessageAdmins) {
      merged = merged.filter((profile) => profile.role === "admin");
    }

    setUsers(merged);
  }, [canMessageAdmins, currentUserEmail, currentUserId, hasFullMessaging]);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DashboardMessagesPanel] messages fetch failed:", error);
      return;
    }

    setMessages(Array.isArray(data) ? data : []);
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!currentUserId || !hasMessagingAccess) {
        if (mounted) {
          setUsers([]);
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      if (mounted) setLoading(true);

      try {
        await Promise.all([fetchUsers(), fetchMessages()]);
      } catch (error) {
        console.error("[DashboardMessagesPanel] initial load failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [currentUserId, fetchMessages, fetchUsers, hasMessagingAccess]);

  useEffect(() => {
    if (!currentUserId || !hasMessagingAccess) return undefined;

    const channel = supabase
      .channel(`dashboard-direct-messages-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        fetchMessages
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchMessages, hasMessagingAccess]);

  const usersById = useMemo(() => {
    return users.reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});
  }, [users]);

  const getPersonDisplayName = useCallback((person = {}) => {
    return normalizeString(person.full_name || person.name || person.email || person.username || "CLARA User");
  }, []);

  const getPersonSortKey = useCallback(
    (person = {}) => getPersonDisplayName(person).trim().toLowerCase(),
    [getPersonDisplayName]
  );

  const sortPeopleAlphabetically = useCallback(
    (items = []) =>
      [...items].sort((a, b) => {
        const nameA = getPersonSortKey(a);
        const nameB = getPersonSortKey(b);
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return normalizeLower(a.email).localeCompare(normalizeLower(b.email));
      }),
    [getPersonSortKey]
  );

  const alphabetizedUsers = useMemo(() => {
    const unique = new Map();

    users.forEach((person) => {
      if (person?.id && !unique.has(person.id)) unique.set(person.id, person);
    });

    return sortPeopleAlphabetically(Array.from(unique.values()));
  }, [sortPeopleAlphabetically, users]);

  const conversations = useMemo(() => {
    const map = {};

    messages.forEach((message) => {
      const isMine = message.sender_id === currentUserId;
      const otherId = isMine ? message.recipient_id : message.sender_id;
      if (!otherId) return;

      const otherEmail = isMine ? message.recipient_email : message.sender_email;
      const otherName = isMine
        ? message.recipient_name || usersById[message.recipient_id]?.full_name || otherEmail
        : message.sender_name || usersById[message.sender_id]?.full_name || otherEmail;

      if (!map[otherId]) {
        map[otherId] = {
          id: otherId,
          email: otherEmail || "",
          name: otherName || "CLARA User",
          username: usersById[otherId]?.username || "",
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        };
      }

      map[otherId].messages.push(message);

      if (message.recipient_id === currentUserId && !message.is_read) {
        map[otherId].unreadCount += 1;
      }
    });

    Object.values(map).forEach((convo) => {
      convo.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      convo.lastMessage = convo.messages[convo.messages.length - 1] || null;
    });

    return Object.values(map).sort((a, b) => {
      const nameA = normalizeLower(a.name || a.email || a.username || "CLARA User");
      const nameB = normalizeLower(b.name || b.email || b.username || "CLARA User");
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return normalizeLower(a.email).localeCompare(normalizeLower(b.email));
    });
  }, [currentUserId, messages, usersById]);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = alphabetizedUsers;

    if (!term) return source;

    return source.filter((item) => {
      const name = (item.full_name || item.name || "").trim().toLowerCase();
      const email = (item.email || "").trim().toLowerCase();
      const username = (item.username || "").trim().toLowerCase();
      return name.includes(term) || email.includes(term) || username.includes(term);
    });
  }, [alphabetizedUsers, search]);

  const filteredNewChatPeople = useMemo(() => {
    const term = newChatSearch.trim().toLowerCase();
    const source = alphabetizedUsers;

    if (!term) return source;

    return source.filter((item) => {
      const name = (item.full_name || item.name || "").trim().toLowerCase();
      const email = (item.email || "").trim().toLowerCase();
      const username = (item.username || "").trim().toLowerCase();
      return name.includes(term) || email.includes(term) || username.includes(term);
    });
  }, [alphabetizedUsers, newChatSearch]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return conversations;

    return conversations.filter((convo) => {
      const name = (convo.name || "").trim().toLowerCase();
      const email = (convo.email || "").trim().toLowerCase();
      const username = (convo.username || "").trim().toLowerCase();
      return name.includes(term) || email.includes(term) || username.includes(term);
    });
  }, [conversations, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;

    const existing = conversations.find((item) => item.id === selectedConvo);
    if (existing) return existing;

    const foundUser = users.find((item) => item.id === selectedConvo);
    if (!foundUser) return null;

    return {
      id: foundUser.id,
      email: foundUser.email || "",
      name: foundUser.full_name || foundUser.email || "CLARA User",
      username: foundUser.username || "",
      messages: [],
      lastMessage: null,
      unreadCount: 0,
    };
  }, [conversations, selectedConvo, users]);

  useEffect(() => {
    if (activeConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConvo, messages]);

  useEffect(() => {
    const markRead = async () => {
      if (!activeConvo?.id || !currentUserId) return;

      const unreadIds = activeConvo.messages
        .filter((message) => message.recipient_id === currentUserId && !message.is_read)
        .map((message) => message.id);

      if (!unreadIds.length) return;

      const { error } = await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) {
        console.error("[DashboardMessagesPanel] mark as read failed:", error);
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          unreadIds.includes(message.id) ? { ...message, is_read: true } : message
        )
      );
    };

    markRead();
  }, [activeConvo, currentUserId]);

  const openConversation = useCallback((userId) => {
    setSelectedConvo(userId);
    setPeopleOpen(false);
    setNewChatSearch("");
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMsg.trim() || !selectedConvo || !currentUserId || sending) return;

    const recipientUser = users.find((item) => item.id === selectedConvo);
    if (!recipientUser) return;

    setSending(true);

    const payload = {
      conversation_id: [String(currentUserId), String(recipientUser.id)].sort().join("_"),
      sender_id: currentUserId,
      sender_email: currentUserEmail,
      sender_name: currentUserName,
      recipient_id: recipientUser.id,
      recipient_email: recipientUser.email || "",
      recipient_name: recipientUser.full_name || recipientUser.email || "CLARA User",
      content: newMsg.trim(),
      is_read: false,
    };

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      ...payload,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [optimisticMessage, ...prev]);
    setNewMsg("");

    const { data, error } = await supabase
      .from("direct_messages")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[DashboardMessagesPanel] send failed:", error);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setNewMsg(payload.content);
      setSending(false);
      return;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((message) => message.id !== optimisticId);
      return data ? [data, ...withoutTemp] : withoutTemp;
    });

    setSending(false);
  }, [
    currentUserEmail,
    currentUserId,
    currentUserName,
    newMsg,
    selectedConvo,
    sending,
    users,
  ]);

  if (accessLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-emerald-300" />
          <p className="mt-3 text-sm text-white/55">Preparing messages...</p>
        </div>
      </div>
    );
  }

  if (!currentUserId || !hasMessagingAccess) {
    return (
      <div className="space-y-4">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-center backdrop-blur-xl">
          <MessageCircle className="mx-auto h-8 w-8 text-white/55" />
          <p className="mt-3 text-sm font-bold text-white">
            {!currentUserId ? "User session not ready" : "Messages are locked"}
          </p>
          <p className="mt-1 text-xs text-white/55">
            {!currentUserId
              ? "Refresh or log in again."
              : "Enable messaging or upgrade this plan to use conversations."}
          </p>
        </div>
      </div>
    );
  }

  if (activeConvo) {
    const isAdminConversation = messageMode === "admin_only" && !isAdmin;
    const activeMessages = Array.isArray(activeConvo.messages) ? activeConvo.messages : [];

    const conversationOverlay = (
      <section
        className="fixed inset-0 z-[2147483000] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#020817] text-white"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          maxWidth: "100vw",
          maxHeight: "100dvh",
          margin: 0,
          borderRadius: 0,
          transform: "none",
          isolation: "isolate",
        }}
        aria-label={`Conversation with ${activeConvo.name}`}
      >
        <style>{`
          @keyframes claraDashboardMessageIn {
            from { opacity: 0; transform: translateY(8px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .clara-dashboard-message-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.16) transparent;
          }

          .clara-dashboard-message-scroll::-webkit-scrollbar { width: 4px; }
          .clara-dashboard-message-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.16);
            border-radius: 999px;
          }
        `}</style>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_42%)]" />

        <header className="relative z-20 shrink-0 border-b border-white/10 bg-[#03151b]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedConvo(null)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/85 transition hover:bg-white/[0.08] active:scale-95"
              aria-label="Back to inbox"
            >
              <ArrowDown className="h-4 w-4 rotate-90" />
            </button>

            <div className="relative shrink-0">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/20 bg-[radial-gradient(circle_at_30%_20%,rgba(45,246,222,0.32),rgba(10,88,86,0.56)_42%,rgba(5,25,35,0.96)_100%)] text-xs font-black tracking-tight text-white shadow-[0_0_24px_rgba(20,184,166,0.16)]">
                {dashboardPanelInitials(activeConvo.name || activeConvo.email || "CL")}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#03111c] bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-black leading-tight text-white">{activeConvo.name}</p>
              <p className="truncate text-[11px] font-medium text-white/55">
                {isAdminConversation ? "CLARA Admin" : "Private conversation"}
              </p>
            </div>

          </div>
        </header>

        <main
          className="clara-dashboard-message-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end">
            {activeMessages.length === 0 ? (
              <div className="flex min-h-[56dvh] items-center justify-center px-6 text-center">
                <div className="w-full max-w-[280px]">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.16)]">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-lg font-black text-white">Start your conversation</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Send your first message to {activeConvo.name}.
                  </p>
                </div>
              </div>
            ) : (
              activeMessages.map((message, index) => {
                const isMine = message.sender_id === currentUserId;
                const previous = activeMessages[index - 1];
                const next = activeMessages[index + 1];
                const previousIsMine = previous?.sender_id === currentUserId;
                const nextIsMine = next?.sender_id === currentUserId;
                const isFirstInGroup = !previous || previousIsMine !== isMine;
                const isLastInGroup = !next || nextIsMine !== isMine;
                const currentDate = message.created_at ? new Date(message.created_at) : null;
                const previousDate = previous?.created_at ? new Date(previous.created_at) : null;
                const showDateSeparator =
                  !previous ||
                  !currentDate ||
                  !previousDate ||
                  currentDate.toDateString() !== previousDate.toDateString();

                return (
                  <div key={message.id || `message-${index}`}>
                    {showDateSeparator ? (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                          {dashboardPanelFormatTime(message.created_at)}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={`flex w-full animate-[claraDashboardMessageIn_180ms_ease-out_both] ${
                        isMine ? "justify-end" : "justify-start"
                      } ${isFirstInGroup ? "mt-4" : "mt-1.5"}`}
                    >
                      <div className={`flex max-w-[86%] items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMine ? (
                          isFirstInGroup ? (
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-[10px] font-black text-white/75">
                              {dashboardPanelInitials(activeConvo.name || "CL")}
                            </div>
                          ) : (
                            <div className="h-7 w-7 shrink-0" />
                          )
                        ) : null}

                        <div className="min-w-0">
                          <div
                            className={`break-words px-4 py-3 text-[14px] leading-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                              isMine
                                ? "rounded-[22px] bg-[linear-gradient(135deg,rgba(16,185,129,1),rgba(20,184,166,1))] text-white"
                                : "rounded-[22px] border border-white/10 bg-white/[0.06] text-white/92"
                            } ${isMine && isFirstInGroup ? "rounded-tr-md" : ""} ${
                              isMine && isLastInGroup ? "rounded-br-md" : ""
                            } ${!isMine && isFirstInGroup ? "rounded-tl-md" : ""} ${
                              !isMine && isLastInGroup ? "rounded-bl-md" : ""
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>

                          {isLastInGroup ? (
                            <div className={`mt-1 px-1 text-[10px] font-medium text-white/38 ${isMine ? "text-right" : "text-left"}`}>
                              {dashboardPanelFormatTime(message.created_at)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </main>

        <footer className="relative z-20 shrink-0 border-t border-white/10 bg-[#020817]/94 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2 backdrop-blur-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-[28px] border border-white/10 bg-white/[0.05] p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
          >
            <textarea
              value={newMsg}
              onChange={(event) => setNewMsg(event.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              rows={1}
              className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[14px] leading-5 text-white outline-none placeholder:text-white/38 disabled:opacity-60"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={!newMsg.trim() || sending}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,1),rgba(34,211,238,0.92))] text-white shadow-[0_0_24px_rgba(20,184,166,0.28)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </footer>
      </section>
    );

    return createPortal(conversationOverlay, document.body);
  }

  if (peopleOpen) {
    const newChatOverlay = (
      <section
        className="fixed inset-0 z-[2147483000] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#020817] text-white"
        aria-label="New chat"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_42%)]" />

        <header className="relative z-20 shrink-0 border-b border-white/10 bg-[#03151b]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPeopleOpen(false);
                setNewChatSearch("");
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/85 transition hover:bg-white/[0.08] active:scale-95"
              aria-label="Back to messages"
            >
              <ArrowDown className="h-4 w-4 rotate-90" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black leading-tight text-white">New Chat</p>
              <p className="truncate text-[11px] font-medium text-white/55">Choose someone from CLARA People</p>
            </div>
          </div>
        </header>

        <div className="relative z-10 shrink-0 border-b border-white/10 bg-[#020817]/86 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,0.18)]">
            <Search className="h-4 w-4 text-white/45" />
            <input
              value={newChatSearch}
              onChange={(event) => setNewChatSearch(event.target.value)}
              placeholder="Search people..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              autoFocus
            />
          </div>
        </div>

        <main
          className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-auto grid w-full max-w-3xl gap-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {filteredNewChatPeople.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
                <MessageCircle className="mx-auto h-8 w-8 text-white/45" />
                <p className="mt-3 text-sm font-bold text-white">No people found.</p>
              </div>
            ) : (
              filteredNewChatPeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => openConversation(person.id)}
                  className="w-full rounded-[24px] border border-white/10 bg-white/[0.055] px-4 py-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.075] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/10 text-sm font-black text-white">
                      {dashboardPanelInitials(person.full_name || person.email || person.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {person.full_name || person.email || person.username || "CLARA User"}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {person.email || person.username || "CLARA member"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/35" />
                  </div>
                </button>
              ))
            )}
          </div>
        </main>
      </section>
    );

    return createPortal(newChatOverlay, document.body);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
          <Search className="h-4 w-4 text-white/45" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people or conversations..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>

        <button
          type="button"
          onClick={() => setPeopleOpen(true)}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-left transition hover:bg-emerald-400/15 active:scale-[0.99]"
        >
          <div>
            <p className="text-sm font-bold text-white">Start new chat</p>
            <p className="text-xs text-white/55">
              {messageMode === "admin_only" && !isAdmin
                ? "Message CLARA admins"
                : "Choose someone from CLARA People"}
            </p>
          </div>
          <Plus className="h-5 w-5 text-emerald-200" />
        </button>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          <MessageCircle className="mx-auto h-8 w-8 text-white/45" />
          <p className="mt-3 text-sm font-bold text-white">{search.trim() ? "No conversations found." : "No messages yet"}</p>
          <p className="mt-1 text-xs text-white/55">
            {search.trim() ? "Try searching another name, email, or username." : "Start a conversation above and it will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => {
            const last = conversation.lastMessage;
            const isMine = last?.sender_id === currentUserId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                className="w-full rounded-[30px] border border-white/10 bg-white/[0.055] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl transition hover:bg-white/[0.075]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/10 text-sm font-black text-white">
                      {dashboardPanelInitials(conversation.name)}
                    </div>
                    {conversation.unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black text-slate-950">
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-white">{conversation.name}</p>
                      <span className="shrink-0 text-[10px] text-white/45">
                        {dashboardPanelFormatTime(last?.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/55">
                      {isMine ? "You: " : ""}{last?.content || "Start chatting"}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-white/35" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


function DashboardTasksPanel({ onBack, activeTask, nextTask, tasks = [], submissions = [], programJourney }) {
  const completedSubmissionIds = useMemo(() => {
    return new Set((submissions || []).map((submission) => String(submission.task_id || submission.id || "")));
  }, [submissions]);

  const visibleTasks = useMemo(() => {
    const journeyTasks = Array.isArray(programJourney?.items) ? programJourney.items : [];
    const sourceTasks = journeyTasks.length > 0 ? journeyTasks : tasks;
    return (sourceTasks || []).slice(0, 6);
  }, [programJourney, tasks]);

  const highlightedTask = activeTask || nextTask || visibleTasks[0] || null;

  return (
    <DashboardPanelShell
      title="Tasks"
      subtitle="Today’s program focus and progress"
      icon={ListChecks}
      viewAllTo="/tasks"
      onBack={onBack}
    >
      {highlightedTask ? (
        <div className="overflow-hidden rounded-[30px] border border-amber-400/18 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_36%),linear-gradient(135deg,rgba(58,35,12,0.92),rgba(24,18,12,0.96))] p-5 shadow-[0_20px_60px_rgba(250,204,21,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/80">
                {highlightedTask.week ? `Week ${highlightedTask.week}` : "Current focus"}
                {highlightedTask.day ? ` • Day ${highlightedTask.day}` : ""}
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight text-white">{highlightedTask.title || "Your next task is ready"}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/68">
                {highlightedTask.description || highlightedTask.summary || "Open your full tasks page to continue your guided CLARA progress."}
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-amber-300/20 bg-amber-300/12 text-amber-100">
              <Flag className="h-6 w-6" />
            </div>
          </div>

          <Link to="/tasks" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(250,204,21,0.22)]">
            Continue task
          </Link>
        </div>
      ) : (
        <div className={`${dashboardPanelCardClass} text-center`}>
          <p className="text-sm font-semibold text-white">No task assigned yet</p>
          <p className="mt-1 text-xs text-white/55">Once your program starts, your tasks will appear here.</p>
        </div>
      )}

      {visibleTasks.length > 0 ? (
        <div className="space-y-3">
          {visibleTasks.map((task, index) => {
            const taskId = String(task.id || task.task_id || index);
            const done = completedSubmissionIds.has(taskId) || task.status === "completed" || task.completed === true;

            return (
              <Link key={taskId} to="/tasks" className={`${dashboardPanelCardClass} block transition hover:bg-white/[0.075]`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${done ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/8 text-white/65"}`}>
                    {done ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{task.title || `Task ${index + 1}`}</p>
                    <p className="mt-1 truncate text-xs text-white/50">
                      {task.day ? `Day ${task.day}` : "Program task"}{done ? " • Completed" : " • Pending"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/35" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </DashboardPanelShell>
  );
}

function DashboardSettingsPanel({
  onBack,
  user,
  plan,
  isPaid,
  isFree,
  isAdmin = false,
  notificationSettings,
  openThemePicker,
  resetThemeToDefault,
  onOpenMessages,
}) {
  const navigate = useNavigate();

  const initialDisplayName =
    user?.full_name ||
    user?.display_name ||
    user?.nickname ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")?.[0] ||
    "";

  const [localNotifications, setLocalNotifications] = useState(() => ({
    dailyReminders: notificationSettings?.dailyReminders !== false,
    productUpdates: notificationSettings?.productUpdates !== false,
    coachingAlerts: notificationSettings?.coachingAlerts !== false,
    budgetAlerts: notificationSettings?.budgetAlerts !== false,
  }));
  const [localPerformanceMode, setLocalPerformanceMode] = useState(() =>
    readStoredPerformanceMode(user?.id || "guest")
  );

  const [activeSetting, setActiveSetting] = useState(null);
  const [activeAboutInfo, setActiveAboutInfo] = useState(null);
  const [legalInfoRows, setLegalInfoRows] = useState([]);
  const [legalInfoDraftRows, setLegalInfoDraftRows] = useState([]);
  const [legalInfoLoading, setLegalInfoLoading] = useState(false);
  const [legalInfoSaving, setLegalInfoSaving] = useState(false);
  const [legalInfoEditMode, setLegalInfoEditMode] = useState(false);
  const [legalInfoError, setLegalInfoError] = useState("");
  const [profileName, setProfileName] = useState(initialDisplayName);
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [supportTopic, setSupportTopic] = useState("Billing / enrollment");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [billingRecord, setBillingRecord] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    setProfileName(initialDisplayName);
  }, [initialDisplayName]);

  useEffect(() => {
    setLocalNotifications({
      dailyReminders: notificationSettings?.dailyReminders !== false,
      productUpdates: notificationSettings?.productUpdates !== false,
      coachingAlerts: notificationSettings?.coachingAlerts !== false,
      budgetAlerts: notificationSettings?.budgetAlerts !== false,
    });
  }, [notificationSettings]);

  useEffect(() => {
    const storedPerformanceMode = readStoredPerformanceMode(user?.id || "guest");
    setLocalPerformanceMode(storedPerformanceMode);
    applyVisualPerformanceMode(storedPerformanceMode);
  }, [user?.id]);

  useEffect(() => {
    applyVisualPerformanceMode(localPerformanceMode);
  }, [localPerformanceMode]);

  useEffect(() => {
    const syncPerformanceMode = () => {
      setLocalPerformanceMode(readStoredPerformanceMode(user?.id || "guest"));
    };

    window.addEventListener("storage", syncPerformanceMode);
    window.addEventListener("clara:visual-performance-mode-updated", syncPerformanceMode);

    return () => {
      window.removeEventListener("storage", syncPerformanceMode);
      window.removeEventListener("clara:visual-performance-mode-updated", syncPerformanceMode);
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchBillingRecord = async () => {
      if (!user?.id) {
        setBillingRecord(null);
        setBillingLoading(false);
        return;
      }

      setBillingLoading(true);

      try {
        const { data, error } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted) return;

        setBillingRecord(data || null);
      } catch (error) {
        console.error("Embedded billing fetch failed:", error);
        if (isMounted) setBillingRecord(null);
      } finally {
        if (isMounted) setBillingLoading(false);
      }
    };

    fetchBillingRecord();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchLegalInformationContent = async () => {
      setLegalInfoError("");

      if (!user?.id) {
        setLegalInfoRows([]);
        setLegalInfoLoading(false);
        return;
      }

      setLegalInfoLoading(true);

      try {
        const { data, error } = await supabase
          .from("legal_information_content")
          .select("section_key,title,subtitle,body,sort_order,is_active,updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        setLegalInfoRows(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Legal information content fetch failed:", error);
        if (isMounted) {
          setLegalInfoRows([]);
          setLegalInfoError("");
        }
      } finally {
        if (isMounted) setLegalInfoLoading(false);
      }
    };

    fetchLegalInformationContent();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const displayName = profileName?.trim() || initialDisplayName || "Your CLARA account";
  const rawCurrentPlan = isPaid ? plan || "Paid" : isFree ? "Free" : plan || "Plan";
  const normalizePlanDisplay = useCallback((value) => {
    const normalized = normalizeLower(value);

    if (["pro", "pro_99", "pro99", "pro tools", "pro_tools"].some((key) => normalized.includes(key))) {
      return "Pro 99";
    }

    if (["core", "core_199", "core199", "core_599"].some((key) => normalized.includes(key))) {
      return "Core 199";
    }

    if (["life os", "life_os", "lifeos", "life-os", "coaching", "coach", "coaching_1299"].some((key) => normalized.includes(key))) {
      return "Life OS 499";
    }

    if (normalized === "free") return "Free";
    if (!normalized || normalized === "paid" || normalized === "plan") return isPaid ? "Paid plan" : "Free";

    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }, [isPaid]);

  const currentPlan = normalizePlanDisplay(rawCurrentPlan);
  const planStatusLabel = isPaid ? "Unlocked" : isFree ? "Limited" : "Active";
  const supportEmail = "claraprogram2026@gmail.com";

  const saveNotificationSettings = useCallback((next) => {
    try {
      const saved = persistStoredNotificationSettings(user?.id || "guest", next);
      setNotificationSettings(saved);
      dispatchClaraEvent("clara-settings-updated", { type: "notifications", notifications: saved });
    } catch (error) {
      console.error("Failed to save embedded settings:", error);
    }
  }, [user?.id]);  const persistNotificationToggle = useCallback((key) => {
    setLocalNotifications((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      saveNotificationSettings(next);
      setSettingsNotice({ type: "success", message: "Notification preference updated." });
      return next;
    });
  }, [saveNotificationSettings]);

  const persistPerformanceToggle = useCallback(() => {
    setLocalPerformanceMode((current) => {
      const next = !current;
      saveVisualPerformanceMode(user?.id || "guest", next);
      setSettingsNotice({
        type: "success",
        message: next
          ? "Performance Mode is on. CLARA is now using a static, smoother visual design."
          : "Premium Mode is on. CLARA will use the full premium visual experience.",
      });
      return next;
    });
  }, [user?.id]);

  const handleSaveProfile = useCallback(async () => {
    const nextName = profileName.trim();

    if (!nextName) {
      setSettingsNotice({ type: "error", message: "Please enter a display name." });
      return;
    }

    if (!user?.id) {
      setSettingsNotice({ type: "error", message: "User session is not ready. Please log in again." });
      return;
    }

    setSavingProfile(true);
    setSettingsNotice(null);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email || "",
            full_name: nextName,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      try {
        await supabase.auth.updateUser({
          data: {
            full_name: nextName,
            name: nextName,
          },
        });
      } catch (metadataError) {
        console.warn("Profile metadata update skipped:", metadataError);
      }

      setSettingsNotice({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      console.error("Profile update failed:", error);
      setSettingsNotice({
        type: "error",
        message: error?.message || "Profile update failed. Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  }, [profileName, user?.email, user?.id]);

  const clearLocalPreferences = useCallback(async () => {
    try {
      dashboardRuntimePrefs.clear();
      dashboardRuntimeNotifications.clear();
      dashboardRuntimeMoneySummaryVisibility.clear();
      dashboardRuntimePerformanceMode.clear();
      dashboardRuntimeProgramPrompts.clear();
      dashboardRuntimeThemes.clear();
      dashboardRuntimeSurvivalExpenses.clear();

      if (typeof resetThemeToDefault === "function") await resetThemeToDefault();

      setSettingsNotice({ type: "success", message: "Local preferences were reset and the theme is back to default. Financial data was not touched." });
    } catch (error) {
      console.error("Local preferences reset failed:", error);
      setSettingsNotice({ type: "error", message: "Unable to reset local preferences." });
    }
  }, [resetThemeToDefault]);  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setSettingsNotice(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Sign out failed:", error);
      setSettingsNotice({ type: "error", message: "Sign out failed. Please try again." });
      setSigningOut(false);
    }
  }, [navigate]);

  const openSupportMessages = useCallback(() => {
    if (typeof onOpenMessages === "function") {
      onOpenMessages();
      return;
    }

    navigate("/messages");
  }, [navigate, onOpenMessages]);

  const handleSendSupportMessage = useCallback(async () => {
    const trimmed = supportMessage.trim();

    if (!trimmed) {
      setSettingsNotice({ type: "error", message: "Write a short support message first." });
      return;
    }

    if (!user?.id) {
      setSettingsNotice({ type: "error", message: "Your session is not ready. Please log in again." });
      return;
    }

    setSupportSending(true);
    setSettingsNotice(null);

    try {
      const { data: adminProfiles, error: adminError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role")
        .eq("role", "admin");

      if (adminError) {
        console.error("Support admin lookup failed:", adminError);
        throw new Error("Unable to find CLARA admin accounts. Please check the profiles role setup.");
      }

      const admins = (Array.isArray(adminProfiles) ? adminProfiles : [])
        .filter((admin) => admin?.id && admin.id !== user.id);

      if (admins.length === 0) {
        setSettingsNotice({
          type: "error",
          message: "No admin account is available for support messages yet.",
        });
        setSupportSending(false);
        return;
      }

      const supportContent = `[CLARA Support • ${supportTopic}]\n\n${trimmed}`;
      const senderName =
        displayName ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "CLARA User";

      const payloads = admins.map((admin) => {
        const adminName =
          admin?.full_name ||
          admin?.email ||
          "CLARA Admin";

        return {
          conversation_id: [String(user.id), String(admin.id)].sort().join("_"),
          sender_id: user.id,
          sender_email: user.email || "",
          sender_name: senderName,
          recipient_id: admin.id,
          recipient_email: admin.email || supportEmail,
          recipient_name: adminName,
          content: supportContent,
          is_read: false,
        };
      });

      const { error: messageError } = await supabase
        .from("direct_messages")
        .insert(payloads);

      if (messageError) throw messageError;

      setSupportSent(true);
      setSupportMessage("");
      setSettingsNotice({
        type: "success",
        message: `Support message sent to ${admins.length} admin${admins.length > 1 ? "s" : ""}.`,
      });

      if (typeof onOpenMessages === "function") {
        setTimeout(() => {
          onOpenMessages();
        }, 350);
      }
    } catch (error) {
      console.error("Support message send failed:", error);
      setSettingsNotice({
        type: "error",
        message: error?.message || "Unable to send support message.",
      });
    } finally {
      setSupportSending(false);
    }
  }, [
    displayName,
    onOpenMessages,
    supportEmail,
    supportMessage,
    supportTopic,
    user?.email,
    user?.id,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
  ]);

  const notificationRows = [
    {
      key: "dailyReminders",
      title: "Daily reminders",
      description: "Budget nudges and daily financial check-ins",
    },
    {
      key: "budgetAlerts",
      title: "Budget alerts",
      description: "Warnings when spending gets close to your budget",
    },
    {
      key: "productUpdates",
      title: "Product updates",
      description: "New CLARA improvements and feature notices",
    },
    {
      key: "coachingAlerts",
      title: "Coaching alerts",
      description: "Program/coaching related prompts",
    },
  ];

  const settingSections = [
    {
      title: "Account",
      rows: [
        {
          key: "profile",
          title: "Profile information",
          description: "Name, email, and account identity",
          icon: Home,
          badge: "Edit",
          action: () => setActiveSetting("profile"),
        },
        {
          key: "security",
          title: "Security & privacy",
          description: "Session status and safe preference reset",
          icon: ShieldCheck,
          badge: "Safe",
          action: () => setActiveSetting("security"),
        },
      ],
    },
    {
      title: "Preferences",
      rows: [
        {
          key: "appearance",
          title: "Theme & appearance",
          description: "Colors, visual style, and dashboard theme",
          icon: Palette,
          badge: "Customize",
          featured: true,
          action: openThemePicker,
        },
        {
          key: "performance",
          title: "Performance Mode",
          description: "Static visuals with no animation, glow, or blur",
          icon: Rocket,
          badge: localPerformanceMode ? "On" : "Off",
          featured: localPerformanceMode,
          action: () => setActiveSetting("performance"),
        },
        {
          key: "notifications",
          title: "Notifications",
          description: "Reminders, alerts, and program updates",
          icon: Bell,
          badge: localNotifications.dailyReminders ? "On" : "Off",
          action: () => setActiveSetting("notifications"),
        },
      ],
    },
    {
      title: "Program",
      rows: [
        {
          key: "plan",
          title: "Plan & billing",
          description: "Enrollment, payment, and access level",
          icon: WalletCards,
          badge: currentPlan,
          action: () => setActiveSetting("plan"),
        },
        {
          key: "support",
          title: "Help & support",
          description: "Message support or report an issue",
          icon: MessageCircle,
          badge: "Help",
          action: () => setActiveSetting("support"),
        },
        {
          key: "about",
          title: "About CLARA",
          description: "Mission, vision, app info, and legal links",
          icon: FileText,
          badge: "Info",
          action: () => setActiveSetting("about"),
        },
        ...(isAdmin
          ? [
              {
                key: "admin",
                title: "Admin Panel",
                description: "Manage users, access, and CLARA controls",
                icon: ShieldCheck,
                badge: "Admin",
                featured: true,
                action: () => navigate("/admin"),
              },
            ]
          : []),
      ],
    },
  ];

  const resolveBillingCycle = useCallback((record) => {
    const rawCycle = normalizeLower(
      record?.billing_cycle ||
        record?.billing_interval ||
        record?.subscription_interval ||
        record?.interval ||
        record?.cycle ||
        record?.renewal_frequency ||
        record?.payment_cycle ||
        ""
    );

    if (!rawCycle) return "Not recorded";
    if (["month", "monthly", "1 month", "per month", "mo"].includes(rawCycle) || rawCycle.includes("monthly")) {
      return "Monthly";
    }
    if (["year", "yearly", "annual", "annually", "12 months"].includes(rawCycle) || rawCycle.includes("annual")) {
      return "Yearly";
    }
    if (rawCycle.includes("one") || rawCycle.includes("lifetime")) {
      return "One-time";
    }

    return rawCycle.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  const resolveBillingDate = useCallback((record, keys = []) => {
    const rawValue = keys.map((key) => record?.[key]).find(Boolean);
    return rawValue ? formatCompactDate(rawValue) : "Not recorded";
  }, []);

  const billingCycleLabel = resolveBillingCycle(billingRecord);
  const billingStatusLabel = billingLoading
    ? "Checking..."
    : billingRecord
      ? normalizePlanDisplay(
          billingRecord?.payment_status ||
            billingRecord?.status ||
            billingRecord?.enrollment_status ||
            billingRecord?.subscription_status ||
            "Active"
        )
      : "No record";
  const billingStartLabel = billingRecord
    ? resolveBillingDate(billingRecord, ["current_period_start", "billing_start", "started_at", "approved_at", "created_at"])
    : "Not recorded";
  const nextBillingLabel = billingRecord
    ? resolveBillingDate(billingRecord, ["next_billing_date", "next_payment_due", "current_period_end", "renewal_date", "expires_at", "valid_until", "end_date"])
    : "Not recorded";

  const planOptions = [
    {
      key: "pro_99",
      title: "Pro",
      price: "₱99",
      displayName: "Pro 99",
      description: "Starter upgrade for essential CLARA tools.",
    },
    {
      key: "core_199",
      title: "Core",
      price: "₱199",
      displayName: "Core 199",
      description: "Main financial system access for deeper tracking.",
    },
    {
      key: "life_os_499",
      title: "Life OS",
      price: "₱499",
      displayName: "Life OS 499",
      description: "Full CLARA access with Life OS support.",
    },
  ];

  const renderNotice = () => {
    if (!settingsNotice) return null;

    return (
      <div
        className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          settingsNotice.type === "error"
            ? "border-rose-300/20 bg-rose-500/12 text-rose-100"
            : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
        }`}
      >
        {settingsNotice.message}
      </div>
    );
  };

  const SettingsToggle = ({ enabled }) => (
    <span
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
        enabled
          ? "border-emerald-300/25 bg-emerald-400/30"
          : "border-white/10 bg-white/8"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          enabled ? "left-6" : "left-1"
        }`}
      />
    </span>
  );

  const PremiumRow = ({ icon: Icon, title, description, badge, featured, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition ${
        featured
          ? "border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_35%),rgba(16,185,129,0.07)] shadow-[0_16px_40px_rgba(16,185,129,0.08)]"
          : "border-white/10 bg-white/[0.045] hover:bg-white/[0.07]"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
          featured
            ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-100"
            : "border-white/10 bg-white/8 text-white/65 group-hover:text-white"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="mt-1 truncate text-xs text-white/45">{description}</p>
      </div>

      {badge ? (
        <span className="max-w-[96px] shrink-0 truncate rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white/55">
          {badge}
        </span>
      ) : null}

      <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
    </button>
  );

  const DetailHeader = ({ title, subtitle }) => (
    <div className="mb-4 space-y-4">
      <button
        type="button"
        onClick={() => {
          setActiveSetting(null);
          setActiveAboutInfo(null);
          setSettingsNotice(null);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/12"
      >
        <ArrowDown className="h-3.5 w-3.5 rotate-90" />
        Settings
      </button>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-[30ch] text-xs leading-5 text-white/50">{subtitle}</p> : null}
      </div>
    </div>
  );

  const InfoTile = ({ label, value }) => (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );

  const renderProfilePage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Profile information"
        subtitle="Manage how your CLARA profile appears across the app."
      />

      {renderNotice()}

      <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/10 text-xl font-black text-white">
            {dashboardPanelInitials(displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">{displayName}</p>
            <p className="truncate text-xs text-white/50">{user?.email || "No email found"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Display name</span>
          <input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-2xl border border-white/10 bg-[#071120] px-4 py-3 text-sm font-semibold text-white caret-emerald-300 outline-none placeholder:text-white/35 focus:border-emerald-300/35"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Email</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{user?.email || "No email found"}</p>
          <p className="mt-1 text-[11px] text-white/40">For security, email is read-only inside dashboard settings.</p>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] disabled:opacity-55"
        >
          <Check className="h-4 w-4" />
          {savingProfile ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );

  const renderNotificationsPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Notifications"
        subtitle="Choose what deserves your attention."
      />

      {renderNotice()}

      <div className="space-y-3">
        {notificationRows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => persistNotificationToggle(row.key)}
            className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.045] px-4 py-4 text-left transition hover:bg-white/[0.07]"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{row.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{row.description}</p>
            </div>

            <SettingsToggle enabled={localNotifications[row.key]} />
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">Delivery behavior</p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          These preferences are saved on this device first. You can later move them to Supabase when you add a shared user settings table.
        </p>
      </div>
    </div>
  );

  const renderPlanPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Plan & billing"
        subtitle="Manage your access, enrollment, and payment flow inside settings."
      />

      <div className="rounded-[30px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),rgba(16,185,129,0.07)] p-5 shadow-[0_18px_50px_rgba(16,185,129,0.10)] backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Current plan</p>
        <p className="mt-2 text-2xl font-black text-white">{currentPlan}</p>
        <p className="mt-1 text-sm text-white/58">{planStatusLabel} access level</p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
          <InfoTile label="Features" value={isPaid ? "Unlocked" : "Limited"} />
          <InfoTile label="Tier" value={currentPlan} />
          <InfoTile label="Billing cycle" value={billingCycleLabel} />
          <InfoTile label="Next billing" value={nextBillingLabel} />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-black text-white">Plan details</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Expense tracking", "Wallets", "Budgets", "Analytics", "Emergency fund", "Messages"].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
              <span className="truncate text-[11px] font-bold text-white/62">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-black text-white">Simple terms</p>
        <p className="mt-2 text-xs leading-5 text-white/48">
          Access depends on approved enrollment or active payment status. For billing concerns, use Help & support inside Settings.
        </p>
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
          Available plans
        </p>

        {planOptions.map((option) => {
          const normalizedCurrentPlan = normalizeLower(currentPlan);
          const normalizedRawPlan = normalizeLower(rawCurrentPlan);
          const isLifeOsLegacy =
            option.key === "life_os_499" &&
            ["coaching", "coach", "coaching_1299", "life os", "life_os", "lifeos"].some((key) =>
              normalizedRawPlan.includes(key)
            );

          const isCoreLegacy =
            option.key === "core_199" &&
            ["core", "core_199", "core199", "core_599"].some((key) =>
              normalizedRawPlan.includes(key)
            );

          const isProLegacy =
            option.key === "pro_99" &&
            ["pro", "pro_99", "pro99", "pro_tools"].some((key) =>
              normalizedRawPlan.includes(key)
            );

          const isCurrent =
            normalizedCurrentPlan.includes(normalizeLower(option.displayName)) ||
            normalizedCurrentPlan.includes(normalizeLower(option.title)) ||
            isLifeOsLegacy ||
            isCoreLegacy ||
            isProLegacy;

          return (
            <div
              key={option.key}
              className={`rounded-[24px] border p-4 ${
                isCurrent
                  ? "border-emerald-400/25 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.045]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{option.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{option.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">{option.price}</p>
                  {isCurrent ? (
                    <p className="mt-1 text-[10px] font-black text-emerald-200">CURRENT</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Billing status</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Read from your enrollment/payment record when available.
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-black text-white/55">
            {billingStatusLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <InfoTile label="Cycle" value={billingCycleLabel} />
          <InfoTile label="Started" value={billingStartLabel} />
        </div>

        {billingCycleLabel === "Not recorded" ? (
          <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/8 px-3 py-2 text-[11px] leading-5 text-amber-100/75">
            Monthly billing will show here once the billing cycle field is saved in the enrollment record.
          </p>
        ) : null}
      </div>
    </div>
  );

  const renderSecurityPage = () => (
    <div className="space-y-4 pb-6">
      <DetailHeader
        title="Security & privacy"
        subtitle="Account session, protected data, and default theme reset."
      />

      {renderNotice()}

      <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),rgba(255,255,255,0.045)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Current session</p>
                <p className="mt-1 truncate text-xs text-white/50">
                  {user?.email || "Current user session"}
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-100">
                Secure
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[11px] font-black text-white">Signed in</p>
                <p className="mt-1 text-[10px] text-white/40">Session</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[11px] font-black text-white">Protected</p>
                <p className="mt-1 text-[10px] text-white/40">Account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="text-sm font-black text-white">Protected app data</p>
        <p className="mt-2 text-xs leading-5 text-white/48">
          Resetting preferences will not touch your financial records.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {["Wallets", "Expenses", "Budgets", "Enrollments"].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-3"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
              <span className="truncate text-xs font-bold text-white/68">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-amber-300/15 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_34%),rgba(255,255,255,0.04)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
            <RotateCcw className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Local preference reset</p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              Clears local choices and restores CLARA's default theme on this device.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearLocalPreferences}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-400/15"
        >
          <RotateCcw className="h-4 w-4" />
          Reset preferences and theme
        </button>
      </div>

    </div>
  );

  const renderSupportPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Help & support"
        subtitle="Send a support message directly to CLARA admins."
      />

      {renderNotice()}

      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Topic</span>
          <select
            value={supportTopic}
            onChange={(event) => setSupportTopic(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#071120] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-300/35"
          >
            <option>Billing / enrollment</option>
            <option>Technical issue</option>
            <option>Account access</option>
            <option>Feature request</option>
            <option>Other concern</option>
          </select>
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Message</span>
          <textarea
            value={supportMessage}
            onChange={(event) => setSupportMessage(event.target.value)}
            placeholder="Briefly describe what you need help with..."
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-[#071120] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-emerald-300/35"
            disabled={supportSending}
          />
        </label>

        <button
          type="button"
          onClick={handleSendSupportMessage}
          disabled={supportSending || !supportMessage.trim()}
          className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] transition hover:scale-[1.01] disabled:opacity-55"
        >
          {supportSending ? "Sending to CLARA support..." : "Send CLARA support message"}
        </button>

        <p className="mt-3 text-center text-[11px] leading-5 text-white/45">
          All admin accounts will receive this in Messages. You’ll be moved to the Message tab after sending.
        </p>
      </div>

      {supportSent ? (
        <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-bold text-emerald-100">Support message sent</p>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Your message was sent to CLARA admin support. Check the Message tab for the conversation.
          </p>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">Support email</p>
        <p className="mt-1 select-all text-sm font-black text-emerald-100">{supportEmail}</p>
      </div>
    </div>
  );

  const renderPerformancePage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Performance Mode"
        subtitle="Keep CLARA premium with a static, smooth, no-glow visual mode for slower phones."
      />

      {renderNotice()}

      <button
        type="button"
        onClick={persistPerformanceToggle}
        className={`flex w-full items-center justify-between gap-4 rounded-[30px] border p-5 text-left transition ${
          localPerformanceMode
            ? "border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_36%),rgba(16,185,129,0.08)] shadow-[0_16px_42px_rgba(16,185,129,0.10)]"
            : "border-white/10 bg-white/[0.045] hover:bg-white/[0.07]"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
            localPerformanceMode
              ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
              : "border-white/10 bg-white/8 text-white/65"
          }`}>
            <Rocket className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white">Performance Mode</p>
            <p className="mt-1 text-xs leading-5 text-white/50">
              Static visuals with no animation, glow, or blur for smoother performance.
            </p>
          </div>
        </div>

        <SettingsToggle enabled={localPerformanceMode} />
      </button>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">
          Current visual mode: {localPerformanceMode ? "Performance" : "Premium"}
        </p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          Premium Mode keeps CLARA's full glow, blur, shadows, and animations. Performance Mode keeps the same layout and colors, but uses static visuals with no glow, no blur, and no motion.
        </p>
      </div>
    </div>
  );

  const defaultAboutClaraRows = [
    {
      section_key: "mission",
      key: "mission",
      title: "Mission",
      subtitle: "See CLARA’s purpose and guiding mission.",
      body:
        "To help people build financial discipline through simple tracking, guided decisions, and a supportive environment.",
      sort_order: 1,
      is_active: true,
    },
    {
      section_key: "vision",
      key: "vision",
      title: "Vision",
      subtitle: "See the long-term direction of CLARA.",
      body:
        "To make budgeting normal, approachable, and part of everyday life.",
      sort_order: 2,
      is_active: true,
    },
    {
      section_key: "clara_difference",
      key: "clara_difference",
      title: "What makes CLARA different",
      subtitle: "See how CLARA goes beyond basic expense tracking.",
      body:
        "CLARA is not only built to record expenses. It is designed to help users understand behavior, reduce emotional spending, and make better choices before money is spent.\n\nPeople do not change because of information alone. People change because of environment. CLARA is built to become that environment.",
      sort_order: 3,
      is_active: true,
    },
    {
      section_key: "terms_of_use",
      key: "terms_of_use",
      title: "Terms of use",
      subtitle: "Coming inside CLARA settings.",
      body:
        "Terms of use will be available inside CLARA settings.",
      sort_order: 4,
      is_active: true,
    },
    {
      section_key: "privacy_policy",
      key: "privacy_policy",
      title: "Privacy policy",
      subtitle: "Coming inside CLARA settings.",
      body:
        "Privacy policy will be available inside CLARA settings.",
      sort_order: 5,
      is_active: true,
    },
  ];

  const normalizeLegalInfoRow = (row, fallback) => ({
    section_key: row?.section_key || fallback.section_key,
    key: row?.section_key || fallback.section_key,
    title: normalizeString(row?.title || fallback.title),
    subtitle: normalizeString(row?.subtitle || fallback.subtitle),
    body: normalizeString(row?.body || fallback.body),
    sort_order: firstValidNumber(row?.sort_order, fallback.sort_order),
    is_active: row?.is_active !== false,
  });

  const aboutClaraRows = useMemo(() => {
    const savedRows = Array.isArray(legalInfoRows) ? legalInfoRows : [];

    return defaultAboutClaraRows.map((fallback) => {
      const saved = savedRows.find((row) => row?.section_key === fallback.section_key);
      return normalizeLegalInfoRow(saved, fallback);
    });
  }, [legalInfoRows]);

  const canEditLegalInformation = Boolean(isAdmin);

  const isProfileAdmin = useCallback((profileRecord) => {
    const roleValue = normalizeLower(profileRecord?.role);
    const userTypeValue = normalizeLower(profileRecord?.user_type);
    const accessLevelValue = normalizeLower(profileRecord?.access_level);

    return (
      roleValue === "admin" ||
      userTypeValue === "admin" ||
      accessLevelValue === "admin" ||
      profileRecord?.is_admin === true ||
      profileRecord?.admin === true
    );
  }, []);

  const verifyLegalInformationAdminAccess = useCallback(async () => {
    if (!user?.id || !canEditLegalInformation) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return isProfileAdmin(data);
  }, [canEditLegalInformation, isProfileAdmin, user?.id]);

  const startLegalInformationEdit = useCallback(() => {
    if (!canEditLegalInformation) return;

    setLegalInfoError("");
    setSettingsNotice(null);
    setLegalInfoDraftRows(aboutClaraRows.map((row) => ({ ...row })));
    setLegalInfoEditMode(true);
  }, [aboutClaraRows, canEditLegalInformation]);

  const cancelLegalInformationEdit = useCallback(() => {
    setLegalInfoDraftRows([]);
    setLegalInfoEditMode(false);
    setLegalInfoError("");
  }, []);

  const updateLegalInformationDraft = useCallback((sectionKey, field, value) => {
    setLegalInfoDraftRows((currentRows) =>
      currentRows.map((row) =>
        row.section_key === sectionKey ? { ...row, [field]: value } : row
      )
    );
    setLegalInfoError("");
    setSettingsNotice(null);
  }, []);

  const saveLegalInformationContent = useCallback(async () => {
    if (!canEditLegalInformation || legalInfoSaving) return;

    setLegalInfoSaving(true);
    setLegalInfoError("");
    setSettingsNotice(null);

    try {
      const verifiedAdmin = await verifyLegalInformationAdminAccess();

      if (!verifiedAdmin) {
        throw new Error("Admin permission is required to update Legal & Information content.");
      }

      const now = new Date().toISOString();
      const rowsToSave = legalInfoDraftRows.map((row, index) => ({
        section_key: row.section_key,
        title: normalizeString(row.title) || defaultAboutClaraRows[index]?.title || "Untitled",
        subtitle: normalizeString(row.subtitle),
        body: normalizeString(row.body),
        sort_order: index + 1,
        is_active: true,
        updated_at: now,
        updated_by: user?.id || null,
      }));

      const { data, error } = await supabase
        .from("legal_information_content")
        .upsert(rowsToSave, { onConflict: "section_key" })
        .select("section_key,title,subtitle,body,sort_order,is_active,updated_at")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setLegalInfoRows(Array.isArray(data) ? data : rowsToSave);
      setLegalInfoDraftRows([]);
      setLegalInfoEditMode(false);
      setSettingsNotice({
        type: "success",
        message: "Legal & Information content updated.",
      });
    } catch (error) {
      console.error("Legal information content save failed:", error);
      setLegalInfoError(error?.message || "Unable to save Legal & Information content right now.");
    } finally {
      setLegalInfoSaving(false);
    }
  }, [
    canEditLegalInformation,
    defaultAboutClaraRows,
    legalInfoDraftRows,
    legalInfoSaving,
    user?.id,
    verifyLegalInformationAdminAccess,
  ]);

  const AboutClaraRow = ({ row }) => {
    const isOpen = activeAboutInfo === row.section_key;

    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
        <button
          type="button"
          onClick={() => setActiveAboutInfo((current) => (current === row.section_key ? null : row.section_key))}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.065] active:scale-[0.99]"
          aria-expanded={isOpen}
        >
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs font-bold text-white">{row.title}</p>
            <p className="mt-1 break-words text-[11px] leading-5 text-white/42">{row.subtitle}</p>
          </div>

          <ChevronRight
            className={`h-4 w-4 shrink-0 text-white/35 transition duration-200 ${
              isOpen ? "rotate-90 text-emerald-200" : ""
            }`}
          />
        </button>

        <div
          className={`grid transition-all duration-200 ease-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-white/10 bg-black/15 px-4 py-4">
              {row.body
                .split(/\n{2,}/)
                .map((paragraph, index) => (
                  <p
                    key={`${row.section_key}-${index}`}
                    className={`${index > 0 ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-emerald-50/85" : "text-white/70"} text-sm leading-6`}
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LegalInformationEditField = ({ row, index }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
          {row.title || defaultAboutClaraRows[index]?.title || "Section"}
        </p>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/45">
          {index + 1}
        </span>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-white/60">Title</span>
          <input
            type="text"
            value={row.title}
            onChange={(event) => updateLegalInformationDraft(row.section_key, "title", event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.06]"
            placeholder="Section title"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-white/60">Subtitle</span>
          <input
            type="text"
            value={row.subtitle}
            onChange={(event) => updateLegalInformationDraft(row.section_key, "subtitle", event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.06]"
            placeholder="Short row description"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-white/60">Body</span>
          <textarea
            value={row.body}
            onChange={(event) => updateLegalInformationDraft(row.section_key, "body", event.target.value)}
            rows={5}
            className="min-h-[118px] w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/30 focus:bg-white/[0.06]"
            placeholder="Main detail content"
          />
        </label>
      </div>
    </div>
  );

  const renderAboutPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="About CLARA"
        subtitle="Understand CLARA’s purpose, direction, and the principles behind the app."
      />

      <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="text-2xl font-black text-white">CLARA</p>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Built to help users see where their money goes, understand why they spend, and build better financial discipline one decision at a time.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <InfoTile label="Version" value="v1" />
          <InfoTile label="Experience" value="Mobile" />
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Legal & information</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Mission, vision, and build information can be rendered here directly so the user stays inside settings.
            </p>
          </div>

          {canEditLegalInformation && !legalInfoEditMode ? (
            <button
              type="button"
              onClick={startLegalInformationEdit}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-100 transition hover:bg-emerald-400/15 active:scale-[0.98]"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : null}
        </div>

        {legalInfoError ? (
          <div className="mb-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs leading-5 text-rose-100">
            {legalInfoError}
          </div>
        ) : null}

        {legalInfoLoading && !legalInfoEditMode ? (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/45">
            Loading Legal & Information content...
          </div>
        ) : null}

        {legalInfoEditMode ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs font-bold text-emerald-50">Admin editing mode</p>
              <p className="mt-1 text-[11px] leading-5 text-emerald-50/65">
                Edit the Legal & Information content below. Changes are saved to Supabase and shown to all users.
              </p>
            </div>

            {legalInfoDraftRows.map((row, index) => (
              <LegalInformationEditField key={row.section_key} row={row} index={index} />
            ))}

            <div className="sticky bottom-3 z-10 grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-[#071120]/92 p-2 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <button
                type="button"
                onClick={cancelLegalInformationEdit}
                disabled={legalInfoSaving}
                className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLegalInformationContent}
                disabled={legalInfoSaving}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white shadow-[0_12px_34px_rgba(16,185,129,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {legalInfoSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {aboutClaraRows.map((row) => (
              <AboutClaraRow key={row.section_key} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderActiveSetting = () => {
    if (activeSetting === "profile") return renderProfilePage();
    if (activeSetting === "notifications") return renderNotificationsPage();
    if (activeSetting === "performance") return renderPerformancePage();
    if (activeSetting === "plan") return renderPlanPage();
    if (activeSetting === "security") return renderSecurityPage();
    if (activeSetting === "support") return renderSupportPage();
    if (activeSetting === "about") return renderAboutPage();
    return null;
  };

  if (activeSetting) {
    return (
      <div className="min-h-full space-y-4 pb-6">
        {renderActiveSetting()}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {renderNotice()}

      <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%),rgba(255,255,255,0.045)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-lg font-black text-white">
            {dashboardPanelInitials(displayName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">{displayName}</p>
            <p className="truncate text-xs text-white/50">{user?.email || "CLARA user"}</p>
          </div>

          <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-200">
            {currentPlan}
          </span>
        </div>
      </div>

      {settingSections.map((section) => (
        <section key={section.title} className="space-y-2">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            {section.title}
          </p>

          <div className="space-y-2.5">
            {section.rows.map((row) => (
              <PremiumRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                description={row.description}
                badge={row.badge}
                featured={row.featured}
                onClick={row.action}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_34%),rgba(244,63,94,0.08)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.08)] transition hover:bg-rose-500/15 disabled:opacity-55"
        >
          <X className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Log out"}
        </button>

        <p className="px-3 text-center text-[10px] font-semibold leading-4 text-white/32">
          You can log back in anytime using your CLARA account.
        </p>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const [moneySummaryVisible, setMoneySummaryVisible] = useState(() =>
    readMoneySummaryVisibility("guest")
  );

  const toggleMoneySummaryVisibility = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();

    setMoneySummaryVisible((current) => {
      const nextVisible = !current;
      persistMoneySummaryVisibility(nextVisible, userId || "guest");
      return nextVisible;
    });
  }, []);

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
  const [billboards, setBillboards] = useState(() => getSafeBillboards(initialCache.billboards));
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

  const [showProgramStart, setShowProgramStart] = useState(false);
  const [programPromptSeenThisSession, setProgramPromptSeenThisSession] =
    useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [commitmentChecked, setCommitmentChecked] = useState(false);
  const [nickname, setNickname] = useState(initialCache.nickname);
  const [reminderTime, setReminderTime] = useState(initialCache.reminderTime);
  const [financialGoal, setFinancialGoal] = useState(initialCache.financialGoal);
  const [notificationSettings, setNotificationSettings] = useState(() =>
    readStoredNotificationSettings(userId)
  );
  const [financeCardIndex, setFinanceCardIndex] = useState(0);
  const [dailyStrategyFlipped, setDailyStrategyFlipped] = useState(false);
  const [activeDashboardPanel, setActiveDashboardPanel] = useState("home");
  const [dashboardShellReady, setDashboardShellReady] = useState(false);
  const [dashboardPanelDirection, setDashboardPanelDirection] = useState("forward");
  const [expandedFinanceCard, setExpandedFinanceCard] = useState(null);
  const [expandedFinanceDetailSections, setExpandedFinanceDetailSections] = useState({});
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [isDashboardScrollable, setIsDashboardScrollable] = useState(false);
  const [financeActionLoading, setFinanceActionLoading] = useState(false);
  const [financeNotice, setFinanceNotice] = useState(null);
  const [financeModal, setFinanceModal] = useState({ type: null, payload: null });
  const [budgetExitConfirm, setBudgetExitConfirm] = useState(false);
  const [budgetListOpen, setBudgetListOpen] = useState(false);
  const budgetListDropdownRef = useRef(null);
  const moneyLeftTapRef = useRef({
    lastTapAt: 0,
    lastHandledEventAt: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const moneyLeftNavigateLockRef = useRef(0);
  const [financeForm, setFinanceForm] = useState({
    name: "",
    type: "cash",
    customWalletType: "",
    startingBalance: "0",
    amount: "",
    destinationWalletId: "",
    expenseWalletId: "",
    budgetListKey: "",
    unplannedReason: "",
    undocumentedReason: "",
    undocumentedNote: "",
    totalBudget: "",
    monthlyBudgetAmount: "",
    needsPct: "50",
    wantsPct: "30",
    otherPct: "20",
    title: "",
    budgetCategoryName: "",
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

  useEffect(() => {
    let timerId = null;
    let frameId = null;

    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      frameId = window.requestAnimationFrame(() => {
        timerId = window.setTimeout(() => setDashboardShellReady(true), 80);
      });
    } else {
      timerId = setTimeout(() => setDashboardShellReady(true), 80);
    }

    return () => {
      if (frameId && typeof window !== "undefined") window.cancelAnimationFrame(frameId);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!budgetListOpen) return;

    const handlePointerDown = (event) => {
      if (!budgetListDropdownRef.current) return;
      if (budgetListDropdownRef.current.contains(event.target)) return;
      setBudgetListOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setBudgetListOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [budgetListOpen]);

  useEffect(() => {
    const safeWallets = Array.isArray(financeWallets) ? financeWallets : [];
    const safeWalletTransactions = Array.isArray(financeWalletTransactions) ? financeWalletTransactions : [];
    const safeTransfers = Array.isArray(financeTransfers) ? financeTransfers : [];
    const safeBudgets = Array.isArray(financeBudgets) ? financeBudgets : [];
    const safeSavingsGoals = Array.isArray(financeSavingsGoals) ? financeSavingsGoals : [];
    const safeExpenses = Array.isArray(financeExpenses) ? financeExpenses : [];
    const safePendingExpenses = safeExpenses.filter(
      (item) => item?.pending_sync || item?.sync_status === "pending" || item?.local_only
    );
    const nextWalletMoney = safeWallets.reduce(
      (sum, wallet) => sum + getWalletDisplayBalance(wallet),
      0
    );

    setWallets(safeWallets);
    setWalletTransactions(safeWalletTransactions);
    setTransfers(safeTransfers);
    setBudgets(safeBudgets);
    setSavingsGoals(safeSavingsGoals);
    setEmergencyFund(financeEmergencyFund || null);
    setExpenses(safeExpenses);
    setPendingExpenses(safePendingExpenses);
    setOfflineReady(true);
    setWalletMoney(nextWalletMoney);
    setLoading(false);

    dashboardPageCache = {
      ...dashboardPageCache,
      key: cacheKey,
      loaded: true,
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
    };
  }, [
    cacheKey,
    financeBudgets,
    financeEmergencyFund,
    financeExpenses,
    financeSavingsGoals,
    financeTransfers,
    financeWalletTransactions,
    financeWallets,
  ]);

  const hasVisibleFinanceData = useMemo(
    () =>
      hasDashboardFinanceContent({
        wallets,
        expenses,
        budgets,
        savingsGoals,
        walletTransactions,
        emergencyFund,
        walletMoney,
      }),
    [budgets, emergencyFund, expenses, savingsGoals, walletMoney, walletTransactions, wallets]
  );

  useEffect(() => {
    if (!financeDataError) return;

    const message =
      typeof financeDataError === "string"
        ? financeDataError
        : financeDataError?.message;

    if (!message) return;

    if (hasVisibleFinanceData || isProtectedFinanceRefreshWarning(message)) {
      console.warn("Background finance refresh warning:", message);
      return;
    }

    setFinanceNotice({ message, type: "error" });
  }, [financeDataError, hasVisibleFinanceData]);

  const dailyRemindersEnabled = notificationSettings?.dailyReminders !== false;
  const themeIsLight = selectedDashboardTheme?.isLight === true;
  const themePrimaryTextClass = themeIsLight ? "text-slate-900" : "text-white";
  const themeSecondaryTextClass = themeIsLight ? "text-slate-700" : "text-white/82";
  const themeMutedTextClass = themeIsLight ? "text-slate-600" : "text-white/75";
  const themeSoftTextClass = themeIsLight ? "text-slate-500" : "text-white/55";
  const themeGlassButtonClass = themeIsLight
    ? "border-slate-300/60 bg-white/72 text-slate-800 shadow-[0_8px_22px_rgba(148,163,184,0.18)] hover:bg-white/90"
    : "border-white/10 bg-white/10 text-white hover:bg-white/15";
  const themeGlassIconButtonClass = themeIsLight
    ? "border-slate-300/60 bg-white/78 text-slate-800 shadow-[0_8px_22px_rgba(148,163,184,0.18)] hover:bg-white/92"
    : "border-white/10 bg-white/10 text-white hover:bg-white/15";
  const themeQuickActionBaseClass = themeIsLight
    ? "text-slate-700 hover:bg-slate-900/[0.04] hover:text-slate-900"
    : "text-white/82 hover:bg-white/[0.06] hover:text-white";
  const themeQuickActionIconShellClass = themeIsLight
    ? "clara-theme-nav-icon-shell clara-theme-nav-icon-shell-light border-slate-300/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.90))] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_18px_rgba(148,163,184,0.16)] group-hover:border-slate-400/60 group-hover:bg-white"
    : "clara-theme-nav-icon-shell border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,255,255,0.04)] group-hover:border-white/20 group-hover:bg-white/[0.10]";
  const themeDividerClass = themeIsLight ? "via-slate-300/50" : "via-white/10";
  const themeInactiveDotClass = themeIsLight ? "bg-slate-400/35 hover:bg-slate-500/55" : "bg-white/20 hover:bg-white/35";
  const themeQuickActionPanelStyle = {
    background: themeIsLight
      ? `radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--theme-glow) 18%, transparent), transparent 42%),
         radial-gradient(circle at 82% 100%, color-mix(in srgb, var(--theme-glow) 14%, transparent), transparent 46%),
         linear-gradient(135deg, color-mix(in srgb, var(--theme-glow) 10%, rgba(255,255,255,0.92)), rgba(248,250,252,0.88) 48%, color-mix(in srgb, var(--theme-glow) 8%, rgba(241,245,249,0.92)))`
      : `radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--theme-glow) 30%, transparent), transparent 44%),
         radial-gradient(circle at 82% 100%, color-mix(in srgb, var(--theme-glow) 24%, transparent), transparent 48%),
         linear-gradient(135deg, color-mix(in srgb, var(--theme-glow) 18%, rgba(7,18,35,0.96)), rgba(8,18,36,0.94) 46%, color-mix(in srgb, var(--theme-glow) 16%, rgba(13,9,30,0.95)))`,
    borderColor: selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
    boxShadow: themeIsLight
      ? "0 0 0 1px color-mix(in srgb, var(--theme-glow) 14%, rgba(148,163,184,0.18)), 0 18px 40px rgba(15,23,42,0.10), 0 0 28px color-mix(in srgb, var(--theme-glow) 10%, transparent)"
      : "0 0 0 1px rgba(255,255,255,0.03), 0 18px 46px rgba(0,0,0,0.32), 0 0 42px color-mix(in srgb, var(--theme-glow) 24%, transparent)",
  };
  const themeQuickActionGlowStyle = {
    background: `radial-gradient(circle at 20% 18%, color-mix(in srgb, var(--theme-glow) 22%, transparent), transparent 38%),
      radial-gradient(circle at 76% 78%, color-mix(in srgb, var(--theme-glow) 18%, transparent), transparent 42%),
      ${selectedDashboardTheme?.tokens?.gradientHero || "var(--theme-gradient-hero)"}`,
    opacity: themeIsLight ? 0.24 : 0.42,
  };

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
      userId: userId || null,
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

  const refreshTimeoutRef = useRef(null);
  const financeCarouselRef = useRef(null);
  const dashboardScrollRef = useRef(null);
  const dashboardContentRef = useRef(null);
  const dashboardScrollTimersRef = useRef([]);
  const trackedViewIdsRef = useRef(new Set());
  const trackedClickIdsRef = useRef(new Set());
  const clickInFlightIdsRef = useRef(new Set());
  const approvalTriggeredRef = useRef(false);
  const hasLoadedDashboardRef = useRef(false);
  const latestEnrollmentRef = useRef(null);
  const isPaidRef = useRef(isPaid);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const hydrateFromCache = useCallback((nextCache) => {
    setTasks(nextCache.tasks);
    setSubmissions(nextCache.submissions);
    setProgramRecord(nextCache.programRecord);
    setBillboards(getSafeBillboards(nextCache.billboards));
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

  useEffect(() => {
    setNotificationSettings(readStoredNotificationSettings(userId));
  }, [userId]);

  useEffect(() => {
    const syncNotificationSettings = () => {
      if (document.visibilityState && document.visibilityState === "hidden") return;
      setNotificationSettings(readStoredNotificationSettings(userId));
    };

    window.addEventListener("storage", syncNotificationSettings);
    window.addEventListener("focus", syncNotificationSettings);
    window.addEventListener("clara-settings-updated", syncNotificationSettings);
    document.addEventListener("visibilitychange", syncNotificationSettings);

    return () => {
      window.removeEventListener("storage", syncNotificationSettings);
      window.removeEventListener("focus", syncNotificationSettings);
      window.removeEventListener("clara-settings-updated", syncNotificationSettings);
      document.removeEventListener("visibilitychange", syncNotificationSettings);
    };
  }, [userId]);

  useEffect(() => {
    if (!showOnboarding) {
      document.body.classList.remove("clara-onboarding-open");
      document.documentElement.classList.remove("clara-onboarding-open");
      return;
    }

    document.body.classList.add("clara-onboarding-open");
    document.documentElement.classList.add("clara-onboarding-open");

    const styleId = "clara-onboarding-global-hide-style";
    let styleEl = document.getElementById(styleId);

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
        body.clara-onboarding-open [data-bottom-nav],
        body.clara-onboarding-open [data-mobile-nav],
        body.clara-onboarding-open [data-tab-bar],
        body.clara-onboarding-open [data-fab],
        body.clara-onboarding-open .bottom-nav,
        body.clara-onboarding-open .mobile-bottom-nav,
        body.clara-onboarding-open .app-bottom-nav,
        body.clara-onboarding-open .floating-add-button,
        body.clara-onboarding-open .global-fab,
        body.clara-onboarding-open .bottom-tab-bar,
        body.clara-onboarding-open *[class*="fab"],
        body.clara-onboarding-open *[class*="FAB"],
        body.clara-onboarding-open [class*="floating"],
        body.clara-onboarding-open [class*="bottom-nav"],
        body.clara-onboarding-open [class*="tab-bar"] {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }

        body.clara-onboarding-open,
        html.clara-onboarding-open {
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    return () => {
      document.body.classList.remove("clara-onboarding-open");
      document.documentElement.classList.remove("clara-onboarding-open");
    };
  }, [showOnboarding]);

  const fmt = useCallback((n) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));
  }, []);


  const stopMoneyLeftSummaryEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
    return false;
  }, []);

  const openTransactionHubFromMoneyLeft = useCallback(
    (event) => {
      stopMoneyLeftSummaryEvent(event);

      const now = Date.now();
      if (now - moneyLeftNavigateLockRef.current < 450) return;

      moneyLeftNavigateLockRef.current = now;
      navigate("/transactions-hub");
    },
    [navigate, stopMoneyLeftSummaryEvent]
  );

  const handleMoneyLeftPointerDown = useCallback((event) => {
    event?.stopPropagation?.();
    const point = event?.touches?.[0] || event;

    moneyLeftTapRef.current = {
      ...moneyLeftTapRef.current,
      startX: Number(point?.clientX || 0),
      startY: Number(point?.clientY || 0),
      moved: false,
    };
  }, []);

  const handleMoneyLeftPointerMove = useCallback((event) => {
    const point = event?.touches?.[0] || event;
    const startX = moneyLeftTapRef.current.startX || 0;
    const startY = moneyLeftTapRef.current.startY || 0;
    const dx = Math.abs(Number(point?.clientX || 0) - startX);
    const dy = Math.abs(Number(point?.clientY || 0) - startY);

    if (dx > 12 || dy > 12) {
      moneyLeftTapRef.current.moved = true;
    }
  }, []);

  const handleMoneyLeftTapEnd = useCallback(
    (event) => {
      stopMoneyLeftSummaryEvent(event);

      if (moneyLeftTapRef.current.moved) {
        moneyLeftTapRef.current.lastTapAt = 0;
        return;
      }

      const now = Date.now();
      const eventStamp = Number(event?.timeStamp || now);
      const lastHandledEventAt = moneyLeftTapRef.current.lastHandledEventAt || 0;

      if (lastHandledEventAt && Math.abs(eventStamp - lastHandledEventAt) < 120) {
        return;
      }

      moneyLeftTapRef.current.lastHandledEventAt = eventStamp;

      const previousTapAt = moneyLeftTapRef.current.lastTapAt || 0;

      if (previousTapAt && now - previousTapAt <= 320) {
        moneyLeftTapRef.current.lastTapAt = 0;
        openTransactionHubFromMoneyLeft(event);
        return;
      }

      moneyLeftTapRef.current.lastTapAt = now;
    },
    [openTransactionHubFromMoneyLeft, stopMoneyLeftSummaryEvent]
  );

  const moneyLeftSummaryHandlers = useMemo(
    () => ({
      onClickCapture: stopMoneyLeftSummaryEvent,
      onClick: stopMoneyLeftSummaryEvent,
      onDoubleClickCapture: openTransactionHubFromMoneyLeft,
      onDoubleClick: openTransactionHubFromMoneyLeft,
      onPointerDownCapture: handleMoneyLeftPointerDown,
      onPointerMoveCapture: handleMoneyLeftPointerMove,
      onPointerUpCapture: handleMoneyLeftTapEnd,
      onTouchStartCapture: handleMoneyLeftPointerDown,
      onTouchMoveCapture: handleMoneyLeftPointerMove,
      onTouchEndCapture: handleMoneyLeftTapEnd,
      onMouseUpCapture: handleMoneyLeftTapEnd,
      onKeyDownCapture: stopMoneyLeftSummaryEvent,
      onKeyDown: stopMoneyLeftSummaryEvent,
    }),
    [
      handleMoneyLeftPointerDown,
      handleMoneyLeftPointerMove,
      handleMoneyLeftTapEnd,
      openTransactionHubFromMoneyLeft,
      stopMoneyLeftSummaryEvent,
    ]
  );

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
          const [tasksRes, submissionsRes, userProgramRecord, billboardsRes, profilesRes, enrollmentsRes] = await Promise.all([
            supabase.from("challenge_tasks").select("*").order("sort_order", { ascending: true }).order("day", { ascending: true }),
            supabase.from("task_submissions").select("*"),
            fetchUserProgramRecord({ supabase, userId: currentUser.id }),
            supabase.from("billboards").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }).limit(10),
            supabase.from("profiles").select("*"),
            supabase.from("enrollments").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(1),
          ]);

          if (tasksRes.error) console.error("Failed to load tasks:", tasksRes.error);
          if (submissionsRes.error) console.error("Failed to load submissions:", submissionsRes.error);
          if (billboardsRes.error) console.error("Failed to load billboards:", billboardsRes.error);
          if (profilesRes.error) console.error("Failed to load profiles:", profilesRes.error);
          if (enrollmentsRes.error) console.error("Failed to load enrollments:", enrollmentsRes.error);

          const userSubmissions = (submissionsRes.data || []).filter((item) => isOwnedByUser(item, currentUser));
          const normalizedTasks = (tasksRes.data || []).map(normalizeProgramTask);
          const userProfile = (profilesRes.data || []).find((profile) => isOwnedByUser(profile, currentUser)) || null;
          const enrollmentRecord = (enrollmentsRes.data || [])[0] || null;
          const activeBillboards = getSafeBillboards(billboardsRes.data);

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
            billboards: activeBillboards,
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
  );  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshFinancialData?.();
      loadDashboardData({ background: true });
    }, 350);
  }, [loadDashboardData, refreshFinancialData]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const trackBillboardView = useCallback(
    async (billboardId) => {
      if (!billboardId || !user?.id) return;
      if (trackedViewIdsRef.current.has(billboardId)) return;

      trackedViewIdsRef.current.add(billboardId);

      try {
        const { data: existing, error: existingError } = await supabase
          .from("billboard_views")
          .select("id")
          .eq("billboard_id", billboardId)
          .eq("viewer_user_id", user.id)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) return;

        const { error: insertError } = await supabase
          .from("billboard_views")
          .insert({
            billboard_id: billboardId,
            viewer_user_id: user.id,
          });

        if (insertError) throw insertError;
      } catch (error) {
        console.error("View tracking failed:", error);
      }
    },
    [user?.id]
  );

  const trackBillboardClick = useCallback(
    async (billboardId) => {
      if (!billboardId || !user?.id) return false;

      if (trackedClickIdsRef.current.has(billboardId)) {
        return false;
      }

      if (clickInFlightIdsRef.current.has(billboardId)) {
        return false;
      }

      clickInFlightIdsRef.current.add(billboardId);

      try {
        const { data: existing, error: existingError } = await supabase
          .from("billboard_clicks")
          .select("id")
          .eq("billboard_id", billboardId)
          .eq("viewer_user_id", user.id)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          trackedClickIdsRef.current.add(billboardId);
          return false;
        }

        const { error: insertError } = await supabase
          .from("billboard_clicks")
          .insert({
            billboard_id: billboardId,
            viewer_user_id: user.id,
          });

        if (insertError) {
          const message = String(insertError?.message || "").toLowerCase();
          const details = String(insertError?.details || "").toLowerCase();

          if (
            message.includes("duplicate") ||
            message.includes("unique") ||
            details.includes("duplicate") ||
            details.includes("unique")
          ) {
            trackedClickIdsRef.current.add(billboardId);
            return false;
          }

          throw insertError;
        }

        trackedClickIdsRef.current.add(billboardId);
        return true;
      } catch (error) {
        console.error("Click tracking failed:", error);
        return false;
      } finally {
        clickInFlightIdsRef.current.delete(billboardId);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    latestEnrollmentRef.current = latestEnrollment;
  }, [latestEnrollment]);

  useEffect(() => {
    isPaidRef.current = isPaid;
  }, [isPaid]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOffline = () => {
      setFinanceNotice({
        message: "You’re offline. CLARA is using saved data.",
        type: "success",
      });
    };

    const handleOnline = () => {
      setFinanceNotice({
        message: "You’re back online. CLARA is syncing saved data.",
        type: "success",
      });
      loadDashboardData({ background: true });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const updated = event?.detail?.profile || {};

      setProfileData((prev) => ({
        ...(prev || {}),
        ...updated,
      }));

      const nextName = normalizeString(
        updated?.display_name ||
          updated?.nickname ||
          updated?.full_name ||
          ""
      );

      if (nextName) {
        setNickname(nextName);
      }

      scheduleRefresh();
    };

    window.addEventListener("clara-profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("clara-profile-updated", handleProfileUpdated);
    };
  }, [scheduleRefresh]);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    window.addEventListener("clara-expenses-updated", scheduleRefresh);
    window.addEventListener("clara-finance-updated", scheduleRefresh);
    window.addEventListener("clara-wallets-updated", scheduleRefresh);
    window.addEventListener("clara-wallet-transactions-updated", scheduleRefresh);
    window.addEventListener("clara-budgets-updated", scheduleRefresh);
    window.addEventListener("clara-savings-goals-updated", scheduleRefresh);

    const channel = supabase
      .channel(`dashboard-live-${user?.id || user?.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_goals" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_tasks" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_submissions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboards" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async (payload) => {
          scheduleRefresh();

          const newData = payload?.new || {};
          const oldData = payload?.old || {};
          const belongsToUser =
            normalizeString(newData?.id) === normalizeString(user?.id) ||
            normalizeString(newData?.email).toLowerCase() ===
              normalizeString(user?.email).toLowerCase();

          if (!belongsToUser) return;

          const currentEnrollment = latestEnrollmentRef.current;
          const wasApproved = isProgramApproved(oldData, false, currentEnrollment);
          const nowApproved = isProgramApproved(
            newData,
            isPaidRef.current,
            currentEnrollment
          );

          if (!wasApproved && nowApproved && !approvalTriggeredRef.current) {
            approvalTriggeredRef.current = true;

            try {
              const completed = hasCompletedProgramOnboarding(newData);

              if (!completed) {
                setOnboardingStep(Number(newData?.onboarding_step) || 0);
              }
            } catch (error) {
              console.error("Failed handling approval transition:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("clara-expenses-updated", scheduleRefresh);
      window.removeEventListener("clara-finance-updated", scheduleRefresh);
      window.removeEventListener("clara-wallets-updated", scheduleRefresh);
      window.removeEventListener(
        "clara-wallet-transactions-updated",
        scheduleRefresh
      );
      window.removeEventListener("clara-budgets-updated", scheduleRefresh);
      window.removeEventListener("clara-savings-goals-updated", scheduleRefresh);

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, scheduleRefresh]);

  useEffect(() => {
    if (!guardChecked || !profileData) return;

    const shouldRedirect = shouldForceToEnroll(profileData, latestEnrollment, isPaid);

    if (shouldRedirect) {
      navigate("/enroll", { replace: true });
    }
  }, [guardChecked, profileData, latestEnrollment, isPaid, navigate]);

  const thisMonthSpent = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return expenses.reduce((sum, expense) => {
      const expenseDate = getTransactionDate(expense);
      if (!expenseDate) return sum;

      return getPHMonthKey(expenseDate) === currentMonthKey
        ? sum + Number(expense.amount || 0)
        : sum;
    }, 0);
  }, [expenses]);

  const thisMonthIncome = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return walletTransactions.reduce((sum, transaction) => {
      const type = normalizeLower(transaction?.type || transaction?.transaction_type);
      if (!INCOME_TRANSACTION_TYPES.has(type)) return sum;

      const date = getTransactionDate(transaction);
      if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;

      return sum + firstValidNumber(transaction?.amount);
    }, 0);
  }, [walletTransactions]);

  const moneyLeftThisMonth = thisMonthIncome - thisMonthSpent;

  const budgetSummaries = useMemo(() => {
    const monthRange = getPHMonthRange();
    const activeBudgets = budgets.filter((budget) => {
      const month = normalizeString(budget?.month || budget?.budget_month);
      return !month || month === getPHMonthKey();
    });

    return FINANCE_CATEGORIES.map((category) => {
      const allocated = activeBudgets.reduce((sum, budget) => {
        const budgetCategory = getBudgetCategoryKey(budget);
        if (budgetCategory !== category) return sum;
        return sum + getBudgetTotal(budget);
      }, 0);

      const used = expenses.reduce((sum, expense) => {
        if (getExpenseCategoryKey(expense) !== category) return sum;
        if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) {
          return sum;
        }
        return sum + firstValidNumber(expense?.amount);
      }, 0);

      return {
        category,
        allocated,
        used,
        remaining: Math.max(allocated - used, 0),
        pct: allocated > 0 ? Math.min((used / allocated) * 100, 999) : 0,
      };
    })
      .filter((item) => item.allocated > 0 || item.used > 0)
      .sort((a, b) => b.used - a.used || b.allocated - a.allocated)
      .slice(0, 4);
  }, [budgets, expenses]);

  const monthlyBudgetHeader = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return (
      budgets.find((budget) => {
        const month = normalizeString(budget?.month || budget?.budget_month || budget?.month_key);
        const isCurrentMonth = !month || month === currentMonthKey;
        const status = normalizeLower(budget?.status);
        const isActive = budget?.is_active !== false && budget?.active !== false;
        const isHeader =
          budget?.is_plan_header === true ||
          budget?.plan_type === "monthly_budget" ||
          normalizeLower(budget?.category) === "__monthly_budget__" ||
          normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
          normalizeLower(budget?.type) === "monthly_budget";

        return isCurrentMonth && isActive && !["inactive", "archived", "deleted", "closed"].includes(status) && isHeader;
      }) || null
    );
  }, [budgets]);

  const declaredMonthlyBudgetAmount = useMemo(() => {
    return firstValidNumber(
      monthlyBudgetHeader?.declared_amount,
      monthlyBudgetHeader?.declared_budget,
      monthlyBudgetHeader?.monthly_budget_amount,
      monthlyBudgetHeader?.total_declared_budget,
      monthlyBudgetHeader?.total_budget,
      monthlyBudgetHeader?.budget_amount,
      monthlyBudgetHeader?.amount
    );
  }, [monthlyBudgetHeader]);

  const manualExpenseBudgetOptions = useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const seen = new Set();

    return budgets
      .filter((budget) => {
        const month = normalizeString(budget?.month || budget?.budget_month || budget?.month_key);
        const status = normalizeLower(budget?.status);
        const isActive = budget?.is_active !== false && budget?.active !== false;
        const isClosed = ["inactive", "archived", "deleted", "closed"].includes(status);
        const isHeader =
          budget?.is_plan_header === true ||
          budget?.plan_type === "monthly_budget" ||
          normalizeLower(budget?.category) === "__monthly_budget__" ||
          normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
          normalizeLower(budget?.type) === "monthly_budget";

        return !isHeader && isActive && !isClosed && (!month || month === currentMonthKey);
      })
      .map((budget, index) => {
        const title = getBudgetListTitle(budget);
        const keySource =
          budget?.id ||
          budget?.section_key ||
          budget?.category ||
          budget?.budget_category ||
          title;

        return {
          key: String(keySource),
          id: budget?.id || null,
          title,
          needType: getBudgetNeedType(budget),
          allocated: firstValidNumber(
            budget?.allocated_amount,
            budget?.budget_amount,
            budget?.total_budget,
            budget?.amount,
            budget?.budget
          ),
          month: normalizeString(budget?.month || budget?.budget_month || budget?.month_key || currentMonthKey),
          sortOrder: firstValidNumber(
            budget?.sort_order,
            budget?.display_order,
            budget?.position,
            index
          ),
          budget,
        };
      })
      .filter((item) => {
        const signature = normalizeLower(item.title);
        if (!signature || signature === "monthly spending plan" || seen.has(signature)) return false;
        seen.add(signature);
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }, [budgets]);

  const selectedManualExpenseBudget = useMemo(
    () =>
      manualExpenseBudgetOptions.find(
        (item) => String(item.key) === String(financeForm.budgetListKey)
      ) || null,
    [financeForm.budgetListKey, manualExpenseBudgetOptions]
  );

  const selectedBudgetListLabel = useMemo(() => {
    if (financeForm.budgetListKey === "__unplanned__") return "Unplanned Spending";
    if (financeForm.budgetListKey === "__undocumented__") return "Undocumented Spending";
    return selectedManualExpenseBudget?.title || "Select budget list";
  }, [financeForm.budgetListKey, selectedManualExpenseBudget?.title]);

  const setManualExpenseBudgetListKey = useCallback((nextValue) => {
    setFinanceForm((prev) => ({
      ...prev,
      budgetListKey: nextValue,
      unplannedReason:
        nextValue === "__unplanned__" ? prev.unplannedReason : "",
      undocumentedReason:
        nextValue === "__undocumented__" ? prev.undocumentedReason : "",
      undocumentedNote:
        nextValue === "__undocumented__" ? prev.undocumentedNote : "",
      notes:
        nextValue === "__unplanned__" || nextValue === "__undocumented__"
          ? prev.notes
          : "",
    }));
    setBudgetListOpen(false);
  }, []);

  const manualExpenseIsUnplanned = financeForm.budgetListKey === "__unplanned__";
  const manualExpenseIsUndocumented = financeForm.budgetListKey === "__undocumented__";
  const manualExpenseReason = normalizeString(financeForm.unplannedReason || financeForm.notes);
  const manualExpenseUndocumentedReason = normalizeString(financeForm.undocumentedReason);
  const manualExpenseCanSubmit =
    Number(financeForm.amount) > 0 &&
    Boolean(financeForm.budgetListKey) &&
    Boolean(financeForm.expenseWalletId) &&
    (!manualExpenseIsUnplanned || Boolean(manualExpenseReason)) &&
    (!manualExpenseIsUndocumented || Boolean(manualExpenseUndocumentedReason));

  const monthlyBudgetPlan = useMemo(() => {
    const monthKey = getPHMonthKey();
    const monthRange = getPHMonthRange();
    const categoryRows = manualExpenseBudgetOptions.map((item) => {
      const spent = expenses.reduce((sum, expense) => {
        const status = normalizeLower(expense?.planning_status);
        if (status && status !== "planned") return sum;

        const expenseCategory = normalizeString(
          expense?.budget_category ||
            expense?.expense_category ||
            expense?.category ||
            ""
        );
        const expenseBudgetId = normalizeString(
          expense?.budget_category_id || expense?.budget_item_id || ""
        );
        const itemId = normalizeString(item.id || item.key || "");
        const matchesId = itemId && expenseBudgetId && expenseBudgetId === itemId;
        const matchesCategory =
          normalizeLower(expenseCategory) === normalizeLower(item.title);

        if (!matchesId && !matchesCategory) return sum;
        if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) {
          return sum;
        }

        return sum + firstValidNumber(expense?.amount);
      }, 0);

      const allocated = firstValidNumber(item.allocated);
      const remaining = Math.max(allocated - spent, 0);
      const progress = allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0;

      return {
        ...item,
        allocated,
        allocated_amount: allocated,
        spent,
        spent_amount: spent,
        remaining,
        remaining_amount: remaining,
        progress,
        progress_pct: progress,
      };
    });

    const allocatedTotal = categoryRows.reduce((sum, item) => sum + firstValidNumber(item.allocated), 0);
    const totalSpent = categoryRows.reduce((sum, item) => sum + firstValidNumber(item.spent), 0);
    const declaredBudget = Math.max(declaredMonthlyBudgetAmount, allocatedTotal);
    const unallocated = Math.max(declaredBudget - allocatedTotal, 0);
    const isComplete = declaredBudget > 0 && allocatedTotal === declaredBudget && unallocated === 0;
    const isDraft = declaredBudget > 0 && !isComplete;
    const unplannedSpent = expenses.reduce((sum, expense) => {
      if (normalizeLower(expense?.planning_status) !== "unplanned") return sum;
      if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);
    const undocumentedSpent = expenses.reduce((sum, expense) => {
      if (normalizeLower(expense?.planning_status) !== "undocumented") return sum;
      if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    return {
      id: monthlyBudgetHeader?.id || `monthly_plan_${monthKey}`,
      month: monthKey,
      is_monthly_plan: true,
      is_active: true,
      is_complete: isComplete,
      is_draft: isDraft,
      status: isComplete ? "active" : isDraft ? "draft" : "empty",
      header: monthlyBudgetHeader,
      categories: categoryRows,
      category_count: categoryRows.length,
      declared_budget: declaredBudget,
      declared_amount: declaredBudget,
      monthly_budget_amount: declaredBudget,
      total_budget: allocatedTotal,
      allocated_amount: allocatedTotal,
      allocated_total: allocatedTotal,
      unallocated_amount: unallocated,
      spent: totalSpent,
      spent_amount: totalSpent,
      total_spent: totalSpent,
      remaining: Math.max(allocatedTotal - totalSpent, 0),
      remaining_amount: Math.max(allocatedTotal - totalSpent, 0),
      unplanned_spent: unplannedSpent,
      undocumented_spent: undocumentedSpent,
    };
  }, [declaredMonthlyBudgetAmount, expenses, manualExpenseBudgetOptions, monthlyBudgetHeader]);

  const budgetPlanIsComplete = monthlyBudgetPlan.is_complete === true;
  const budgetAllocatedSoFar = firstValidNumber(monthlyBudgetPlan.allocated_amount, monthlyBudgetPlan.allocated_total);
  const budgetCurrentEditAllocation =
    financeModal.type === "save_budget" && financeModal.payload?.id
      ? getBudgetTotal(financeModal.payload)
      : 0;
  const budgetFormDeclaredAmount = firstValidNumber(financeForm.monthlyBudgetAmount, monthlyBudgetPlan.declared_budget);
  const budgetFormCategoryAmount = firstValidNumber(financeForm.totalBudget);
  const budgetAllocatedExcludingCurrent = Math.max(budgetAllocatedSoFar - budgetCurrentEditAllocation, 0);
  const budgetProjectedAllocated = budgetAllocatedExcludingCurrent + budgetFormCategoryAmount;
  const budgetProjectedUnallocated = Math.max(budgetFormDeclaredAmount - budgetProjectedAllocated, 0);
  const budgetCanFinish =
    financeModal.type === "save_budget" &&
    budgetFormDeclaredAmount > 0 &&
    budgetProjectedAllocated === budgetFormDeclaredAmount &&
    monthlyBudgetPlan.category_count > 0;
  const budgetFinishHelper =
    budgetFormDeclaredAmount > 0 && budgetProjectedUnallocated > 0
      ? `Assign the remaining ${fmt(budgetProjectedUnallocated)} before completing your budget.`
      : "";

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

  const financeCards = useMemo(() => FINANCE_CARD_KEYS, []);

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


  const scrollFinanceCardsTo = useCallback((nextIndex) => {
    const safeIndex = Math.max(0, Math.min(financeCards.length - 1, nextIndex));
    const container = financeCarouselRef.current;

    setFinanceCardIndex(safeIndex);

    if (!container) return;

    const slideWidth =
      financeCards.length > 0
        ? container.scrollWidth / financeCards.length
        : container.clientWidth || 0;

    container.scrollTo({
      left: slideWidth * safeIndex,
      behavior: "smooth",
    });
  }, [financeCards.length]);

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

  const handleFinanceCarouselScroll = useCallback(() => {
    const container = financeCarouselRef.current;
    if (!container || financeCards.length <= 0) return;

    const slideWidth = Math.max(
      1,
      container.scrollWidth / financeCards.length || container.clientWidth || 1
    );

    const index = Math.round(container.scrollLeft / slideWidth);
    setFinanceCardIndex(Math.max(0, Math.min(financeCards.length - 1, index)));
  }, [financeCards.length]);

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
    financeCardIndex,
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

  useEffect(() => {
    const container = financeCarouselRef.current;
    if (!container) return undefined;

    let frame = null;

    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(handleFinanceCarouselScroll);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    handleFinanceCarouselScroll();

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [handleFinanceCarouselScroll, user?.id, activeDashboardPanel, financeCards.length]);


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

  const activeBillboard =
    billboards.find((item) => isTruthyActive(item?.is_active)) ||
    billboards[0] ||
    null;

  useEffect(() => {
    if (activeBillboard?.id) {
      trackBillboardView(activeBillboard.id);
    }
  }, [activeBillboard?.id, trackBillboardView]);

  const billboardMediaUrl = normalizeString(
    activeBillboard?.media_url ||
      activeBillboard?.image_url ||
      activeBillboard?.thumbnail_url ||
      activeBillboard?.photo_url ||
      ""
  );

  const billboardTitle = normalizeString(
    activeBillboard?.title ||
      activeBillboard?.headline ||
      activeBillboard?.name ||
      ""
  );

  const billboardSubtitle = normalizeString(
    activeBillboard?.body ||
      activeBillboard?.subtitle ||
      activeBillboard?.description ||
      activeBillboard?.caption ||
      ""
  );

  const billboardTag = normalizeString(
    activeBillboard?.tag_label ||
      activeBillboard?.tag ||
      activeBillboard?.badge ||
      ""
  );

  const billboardCta = normalizeString(
    activeBillboard?.cta_label ||
      activeBillboard?.button_text ||
      ""
  );

  const billboardTargetUrl = normalizeString(
    activeBillboard?.cta_url || billboardMediaUrl || ""
  );

  const billboardMediaType = getBillboardMediaType(activeBillboard);
  const hasBillboardContent =
    !!billboardMediaUrl || !!billboardTitle || !!billboardSubtitle;

  const billboardClickable = !!billboardTargetUrl;

  const openBillboardTarget = useCallback(async () => {
    if (!billboardTargetUrl) return;

    if (activeBillboard?.id) {
      await trackBillboardClick(activeBillboard.id);
    }

    window.open(billboardTargetUrl, "_blank", "noopener,noreferrer");
  }, [billboardTargetUrl, activeBillboard?.id, trackBillboardClick]);

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

  const feedHasHighlight = hasBillboardContent || programJourney.accessibleCompletedCount > 0;
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
      badge: hasBillboardContent
        ? {
            type: "dot",
            value: "",
            className: "border-sky-400/25 bg-sky-400 text-sky-100",
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
    <div
      ref={dashboardScrollRef}
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
      <div className={dashboardScale.headerOuter}>
        <div className="mx-auto w-full max-w-[430px]">
          <div
            className={`relative w-full overflow-hidden border backdrop-blur-xl ${dashboardScale.headerPanel}`}
            style={themeQuickActionPanelStyle}
          >
            <div className="pointer-events-none absolute inset-0" style={themeQuickActionGlowStyle} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.18)_18%,transparent_36%,transparent_64%,rgba(255,255,255,0.10)_82%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <div className="relative flex items-center justify-between gap-1 sm:gap-1.5">
              {headerQuickActions.map((item, index) => {
                const Icon = item.icon;
                const pillGlow =
                  item.key === "feed"
                    ? "shadow-[0_0_12px_rgba(59,130,246,0.20)]"
                    : item.key === "task"
                      ? "shadow-[0_0_12px_rgba(250,204,21,0.22)]"
                      : "";
                const iconHoverGlow =
                  item.key === "feed"
                    ? "group-hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                    : item.key === "task"
                      ? "group-hover:shadow-[0_0_24px_rgba(250,204,21,0.18)]"
                      : item.key === "settings"
                        ? "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.16)]"
                        : "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.10)]";

                return (
                  <div key={item.key} className="flex flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => openDashboardPanel(item.key)}
                      className="group flex-1"
                      aria-label={item.label}
                    >
                      <div className={`relative flex w-full flex-col items-center justify-center transition duration-200 hover:-translate-y-[1px] active:scale-[0.985] ${dashboardScale.headerItem} ${themeQuickActionBaseClass} ${activeDashboardPanel === item.key ? "clara-theme-nav-pill-active" : ""}`}>
                        <div className={`pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition duration-200 group-hover:opacity-100 ${themeIsLight ? "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)]" : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]"}`} />

                        <div className={`relative flex items-center justify-center rounded-full border transition duration-200 ${dashboardScale.headerIcon} ${themeQuickActionIconShellClass} ${iconHoverGlow}`}>
                          <Icon className={dashboardScale.headerIconSvg} />

                          {item.badge?.type === "count" ? (
                            <span
                              className={`absolute -right-1.5 -top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full border px-1 py-[2px] text-[8px] font-bold leading-none shadow-[0_4px_12px_rgba(0,0,0,0.24)] ${item.badge.className}`}
                            >
                              {item.badge.value}
                            </span>
                          ) : item.badge?.type === "pill" ? (
                            <span
                              className={`absolute -right-2 -top-1.5 inline-flex items-center justify-center rounded-full border px-1.5 py-[2px] text-[8px] font-semibold leading-none ${pillGlow} ${item.badge.className}`}
                            >
                              {item.badge.value}
                            </span>
                          ) : item.badge?.type === "dot" ? (
                            <span
                              className={`absolute right-0 top-0 h-1.5 w-1.5 rounded-full border shadow-[0_0_10px_rgba(56,189,248,0.45),0_4px_10px_rgba(0,0,0,0.22)] ${item.badge.className}`}
                            />
                          ) : null}
                        </div>

                        <span className={`max-w-full truncate font-medium leading-none ${dashboardScale.headerLabel} ${themeSecondaryTextClass}`}>
                          {item.label}
                        </span>
                      </div>
                    </button>

                    {index < headerQuickActions.length - 1 ? (
                      <div className={`pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 bg-gradient-to-b from-transparent ${themeDividerClass} to-transparent sm:block`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
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
          {activeDashboardPanel === "home" ? (
            <>
        {isPending && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-secondary/20 p-3">
            <Clock className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-sm">Enrollment Under Review</div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        {dashboardShellReady && hasBillboardContent && (
          <div
            className={`${getDashboardGlowCardClass("teal")} ${
              billboardClickable ? "cursor-pointer" : ""
            }`}
            onClick={billboardClickable ? openBillboardTarget : undefined}
            role={billboardClickable ? "button" : undefined}
            tabIndex={billboardClickable ? 0 : undefined}
            onKeyDown={
              billboardClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBillboardTarget();
                    }
                  }
                : undefined
            }
          >
            <div className={`relative ${dashboardScale.billboard}`}>
              {billboardMediaUrl ? (
                billboardMediaType === "video" ? (
                  <video
                    src={billboardMediaUrl}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : billboardMediaType === "image" ? (
                  <img
                    src={billboardMediaUrl}
                    alt={billboardTitle || "Billboard"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/85">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {billboardMediaType === "pdf" ? "PDF Attached" : "File Attached"}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />

              <div className={`absolute inset-0 flex items-center justify-between ${dashboardScale.billboardPad}`}>
                <div className="min-w-0 max-w-[72%]">
                  {!!billboardTag && (
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                      {billboardTag}
                    </p>
                  )}

                  {!!billboardTitle && (
                    <h3 className={`line-clamp-1 font-bold leading-tight text-white ${dashboardScale.billboardTitle}`}>
                      {billboardTitle}
                    </h3>
                  )}

                  {!!billboardSubtitle && (
                    <p className={`${dashboardScale.billboardText} text-white/80`}>
                      {billboardSubtitle}
                    </p>
                  )}

                  {!!billboardCta && (
                    <div className={`flex items-center gap-2 ${dashboardScale.billboardCta}`}>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90">
                        <span>{billboardCta}</span>
                        {billboardClickable && <ExternalLink className="h-3 w-3" />}
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <div className={`flex items-center justify-center border border-white/15 bg-black/25 backdrop-blur-sm ${dashboardScale.billboardIcon}`}>
                    {billboardMediaType === "video" ? (
                      <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
                    ) : billboardMediaType === "image" ? (
                      <ImageIcon className="h-5 w-5 text-emerald-300" />
                    ) : billboardMediaType === "pdf" || billboardMediaType === "file" ? (
                      <FileText className="h-5 w-5 text-emerald-300" />
                    ) : (
                      <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!!user && (
          <div className={`${dashboardScale.financeWrap} ${hasBillboardContent ? "mt-[clamp(16px,2.6dvh,24px)]" : ""}`}>
            <FinanceInlineAlert notice={financeNotice} onClose={closeFinanceNotice} />
            {shouldShowNonBlockingRefresh ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100/80">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                Refreshing finance data...
              </div>
            ) : null}
            <div className={`overflow-hidden ${dashboardScale.financeClip}`}>
              <div
                ref={financeCarouselRef}
                onScroll={handleFinanceCarouselScroll}
                className="flex touch-pan-x items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex w-full min-w-full shrink-0 snap-center">
                  <div
                    className={getFinanceSlideShellClass("emergency", selectedDashboardTheme, dashboardScale)}
                    onMouseDownCapture={startClaraAiLongPress}
                    onMouseUpCapture={endClaraAiLongPress}
                    onMouseLeaveCapture={endClaraAiLongPress}
                    onTouchStartCapture={startClaraAiLongPress}
                    onTouchEndCapture={endClaraAiLongPress}
                    onTouchCancelCapture={endClaraAiLongPress}
                    onClickCapture={(event) => {
                      if (handleClaraAiOrbClickCapture(event)) {
                        return;
                      }

                      const button = event.target?.closest?.("button");
                      const label = String(button?.textContent || "").toLowerCase();
                      if (label.includes("show details") || label.includes("hide details")) {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFinanceDetails("emergency", { autoExpand: true, forceOpen: true });
                      }
                    }}
                  >
                    <EmergencyFundCard
                      moneyLeft={walletMoney}
                      survivalExpense={survivalExpense}
                      retentionRate={0}
                      theme={selectedDashboardTheme}
                      expanded={expandedFinanceCard === "emergency"}
                      onToggleDetails={() => toggleFinanceDetails("emergency", { autoExpand: true, forceOpen: true })}
                      canAutoPrompt={Boolean(user?.id) && guardChecked && !loading}
                      hasSurvivalSetup={
                        Boolean(profileData?.survival_setup_done) ||
                        firstPositiveNumber(
                          profileData?.monthly_survival_expense,
                          profileData?.survival_expense,
                          profileData?.clara_survival_expense,
                          survivalExpense,
                          readStoredSurvivalExpense(user?.id)
                        ) > 0
                      }
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
                  />
                  </div>
                </div>

                <div className="flex w-full min-w-full shrink-0 snap-center">
                  <div className={getFinanceSlideShellClass("wallets", selectedDashboardTheme, dashboardScale)}>
                    <WalletCard
                    wallets={wallets}
                    walletMoney={walletMoney}
                    walletPreviewTransactions={walletPreviewTransactions}
                    theme={selectedDashboardTheme}
                    expanded={expandedFinanceCard === "wallets"}
                    onToggleDetails={() => toggleFinanceDetails("wallets")}
                    financeActionLoading={financeActionLoading}
                    onCreateWallet={openCreateWalletModal}
                    onMoveWallet={moveWalletInline}
                    onDeleteWallet={openDeleteWalletModal}
                    onAddMoney={openAddMoneyModal}
                    onTransferMoney={openTransferMoneyModal}
                  />
                  </div>
                </div>

                <div className="flex w-full min-w-full shrink-0 snap-center">
                  <div className={getFinanceSlideShellClass("budgets", selectedDashboardTheme, dashboardScale)}>
                    <BudgetCard
                    activeBudget={monthlyBudgetPlan}
                    budgetCategories={monthlyBudgetPlan.categories}
                    declaredBudget={monthlyBudgetPlan.declared_budget}
                    unallocatedAmount={monthlyBudgetPlan.unallocated_amount}
                    budgetStatus={monthlyBudgetPlan.status}
                    isComplete={monthlyBudgetPlan.is_complete}
                    unplannedSpent={monthlyBudgetPlan.unplanned_spent}
                    undocumentedSpent={monthlyBudgetPlan.undocumented_spent}
                    theme={selectedDashboardTheme}
                    expanded={expandedFinanceCard === "budgets"}
                    onToggleDetails={() => toggleFinanceDetails("budgets")}
                    financeActionLoading={financeActionLoading}
                    onSaveBudget={openBudgetModal}
                    onEditBudgetCategory={openBudgetModal}
                    onDeleteBudgetCategory={openDeleteBudgetCategoryModal}
                    onResetBudget={openResetBudgetModal}
                  />
                  </div>
                </div>

                <div className="flex w-full min-w-full shrink-0 snap-center">
                  <div className={getFinanceSlideShellClass("savings", selectedDashboardTheme, dashboardScale)}>
                    <SavingsCard
                    savingsGoals={savingsGoals}
                    totalSavingsSaved={totalSavingsSaved}
                    totalSavingsTarget={totalSavingsTarget}
                    primarySavingsGoal={primarySavingsGoal}
                    theme={selectedDashboardTheme}
                    expanded={expandedFinanceCard === "savings"}
                    onToggleDetails={() => toggleFinanceDetails("savings")}
                    financeActionLoading={financeActionLoading}
                    onSaveSavingsGoal={openSavingsGoalModal}
                    onDeleteSavingsGoal={openDeleteSavingsGoalModal}
                    onAddSavings={openAddSavingsModal}
                  />
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-center ${dashboardScale.dots}`}>
              {financeCards.map((cardKey, index) => (
                <button
                  key={cardKey}
                  type="button"
                  onClick={() => scrollFinanceCardsTo(index)}
                  aria-label={`Go to ${cardKey} card`}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    financeCardIndex === index
                      ? `w-5 ${selectedDashboardTheme.indicatorActive || "bg-emerald-400"}`
                      : `w-2 ${themeInactiveDotClass}`
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div
          {...financialSummaryParentHandlers}
          aria-label="Financial summary"
          className={`relative grid cursor-default select-none grid-cols-2 overflow-hidden border backdrop-blur-sm ${dashboardScale.summaryGrid}`}
          style={{
            borderColor:
              selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
            boxShadow: themeIsLight
              ? "0 18px 44px rgba(15,23,42,0.10)"
              : "0 22px 65px rgba(0,0,0,0.26)",
            WebkitTapHighlightColor: "transparent",
            touchAction: "pan-y",
          }}
        >
          <button
            type="button"
            data-clara-summary-privacy-toggle="true"
            onClick={toggleMoneySummaryVisibility}
            onPointerUp={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
            className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/55 shadow-[0_0_14px_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.13] hover:text-white/85 active:scale-95"
            aria-label={moneySummaryVisible ? "Hide financial summary amounts" : "Show financial summary amounts"}
            title={moneySummaryVisible ? "Hide amounts" : "Show amounts"}
          >
            {moneySummaryVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>

          <div
            {...moneyLeftSummaryHandlers}
            aria-label="Double tap Total Money Left to open Transaction Hub"
            data-clara-summary-card="money-left"
            className={`pointer-events-auto relative isolate cursor-default overflow-hidden ${dashboardScale.summaryCell}`}
            style={{
              background:
                selectedDashboardTheme?.tokens?.gradientMoney ||
                "var(--theme-gradient-money)",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <div
              {...moneyLeftSummaryHandlers}
              aria-hidden="true"
              className="absolute inset-0 z-30 cursor-default bg-transparent"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="pointer-events-none relative flex min-h-full min-w-0 flex-col justify-center">
              <p className={`uppercase ${dashboardScale.summaryLabel} ${themeSoftTextClass}`}>
                Total Money Left
              </p>
              <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount} ${themePrimaryTextClass}`}>
                {moneySummaryVisible ? fmt(walletMoney) : "₱••••••"}
              </h2>
            </div>
          </div>

          <div
            {...financialSummaryInertHandlers}
            aria-hidden="true"
            data-clara-summary-card="total-expense"
            className={`pointer-events-auto relative isolate cursor-default overflow-hidden border-l ${dashboardScale.summaryCell}`}
            style={{
              background:
                selectedDashboardTheme?.tokens?.gradientExpense ||
                "var(--theme-gradient-expense)",
              borderColor:
                selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
              WebkitTapHighlightColor: "transparent",
              touchAction: "pan-y",
            }}
          >
            <div
              {...financialSummaryInertHandlers}
              aria-hidden="true"
              className="absolute inset-0 z-30 cursor-default bg-transparent"
              style={{ touchAction: "pan-y", WebkitTapHighlightColor: "transparent" }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="pointer-events-none relative flex min-h-full min-w-0 flex-col justify-center">
              <p className={`uppercase ${dashboardScale.summaryLabel} ${themeSoftTextClass}`}>
                Total Expense
              </p>
              <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount} ${themePrimaryTextClass}`}>
                {moneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
              </h2>
            </div>
          </div>
        </div>

        

            </>
          ) : activeDashboardPanel === "feed" ? (
            <DashboardFeedPanel onBack={closeDashboardPanel} />
          ) : activeDashboardPanel === "messages" ? (
            <DashboardMessagesPanel onBack={closeDashboardPanel} />
          ) : activeDashboardPanel === "settings" ? (
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
          ) : null}
        </div>
      </div>


      {activeDashboardPanel === "home" && expandedFinanceCard && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/72 backdrop-blur-xl sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close finance details"
            onClick={() => setExpandedFinanceCard(null)}
          />

          <div className="relative z-10 flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(45,246,222,0.14),transparent_34%),linear-gradient(180deg,rgba(4,17,32,0.98),rgba(3,10,24,0.99))] shadow-[0_-24px_80px_rgba(0,0,0,0.45)] sm:h-[92dvh] sm:rounded-[32px]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                  CLARA Details
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-white">
                  {expandedFinanceCard === "emergency"
                    ? "Emergency Fund"
                    : expandedFinanceCard === "wallets"
                      ? "Wallets"
                      : expandedFinanceCard === "budgets"
                        ? "Budget"
                        : "Savings Goals"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setExpandedFinanceCard(null)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+24px)] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {expandedFinanceCard === "emergency" && (
                <div className="[&>*]:!mb-0">
                  <EmergencyFundCard
                    moneyLeft={walletMoney}
                    survivalExpense={survivalExpense}
                    retentionRate={0}
                    theme={selectedDashboardTheme}
                    expanded={expandedFinanceDetailSections?.emergency !== false}
                    onToggleDetails={() => toggleExpandedFinanceDetailSection("emergency")}
                    canAutoPrompt={false}
                    hasSurvivalSetup={
                      Boolean(profileData?.survival_setup_done) ||
                      firstPositiveNumber(
                        profileData?.monthly_survival_expense,
                        profileData?.survival_expense,
                        profileData?.clara_survival_expense,
                        survivalExpense,
                        readStoredSurvivalExpense(user?.id)
                      ) > 0
                    }
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
                  />
                </div>
              )}

              {expandedFinanceCard === "wallets" && (
                <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
                  <WalletCard
                    wallets={wallets}
                    walletMoney={walletMoney}
                    walletPreviewTransactions={walletPreviewTransactions}
                    theme={selectedDashboardTheme}
                    expanded={true}
                    onToggleDetails={() => setExpandedFinanceCard(null)}
                    financeActionLoading={financeActionLoading}
                    onCreateWallet={() => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openCreateWalletModal());
                    }}
                    onMoveWallet={moveWalletInline}
                    onDeleteWallet={(walletId) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openDeleteWalletModal(walletId));
                    }}
                    onAddMoney={(wallet) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openAddMoneyModal(wallet));
                    }}
                    onTransferMoney={(wallet) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openTransferMoneyModal(wallet));
                    }}
                  />
                </div>
              )}

              {expandedFinanceCard === "budgets" && (
                <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
                  <BudgetCard
                    activeBudget={monthlyBudgetPlan}
                    budgetCategories={Array.isArray(monthlyBudgetPlan?.categories) ? monthlyBudgetPlan.categories : []}
                    declaredBudget={Number(monthlyBudgetPlan?.declared_budget || monthlyBudgetPlan?.declared_amount || 0)}
                    unallocatedAmount={Number(monthlyBudgetPlan?.unallocated_amount || 0)}
                    budgetStatus={monthlyBudgetPlan?.status || ""}
                    isComplete={monthlyBudgetPlan?.is_complete === true}
                    unplannedSpent={Number(monthlyBudgetPlan?.unplanned_spent || 0)}
                    undocumentedSpent={Number(monthlyBudgetPlan?.undocumented_spent || 0)}
                    theme={selectedDashboardTheme}
                    expanded={true}
                    onToggleDetails={() => setExpandedFinanceCard(null)}
                    financeActionLoading={financeActionLoading}
                    onSaveBudget={() => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openBudgetModal());
                    }}
                    onEditBudgetCategory={(item) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openBudgetModal(item));
                    }}
                    onDeleteBudgetCategory={(item) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openDeleteBudgetCategoryModal(item));
                    }}
                    onResetBudget={() => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openResetBudgetModal());
                    }}
                  />
                </div>
              )}

              {expandedFinanceCard === "savings" && (
                <div className="[&>*]:!mb-0 [&>*]:!min-h-0">
                  <SavingsCard
                    savingsGoals={savingsGoals}
                    totalSavingsSaved={totalSavingsSaved}
                    totalSavingsTarget={totalSavingsTarget}
                    primarySavingsGoal={primarySavingsGoal}
                    theme={selectedDashboardTheme}
                    expanded={true}
                    onToggleDetails={() => setExpandedFinanceCard(null)}
                    financeActionLoading={financeActionLoading}
                    onSaveSavingsGoal={(goal) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openSavingsGoalModal(goal));
                    }}
                    onDeleteSavingsGoal={(goalId) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openDeleteSavingsGoalModal(goalId));
                    }}
                    onAddSavings={(goal) => {
                      setExpandedFinanceCard(null);
                      window.requestAnimationFrame(() => openAddSavingsModal(goal));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {showOnboarding && (
        <div
          className="fixed inset-0 z-[99999] bg-[#020817]/88 backdrop-blur-xl"
          onClick={closeOnboarding}
        >
          <div className="flex h-[100dvh] w-full items-end justify-center sm:items-center">
            <div
              className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#08111f_0%,#071120_38%,#061018_100%)] text-white sm:h-[94vh] sm:max-h-[920px] sm:w-[min(100%,860px)] sm:rounded-[32px] sm:border sm:border-white/10 sm:shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative z-10 border-b border-white/10 bg-black/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6">
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
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
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

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                        <p className="text-sm leading-7 text-white/80">
                          By continuing, you acknowledge that you are entering a guided
                          financial coaching experience and you are expected to complete
                          your tasks honestly and consistently.
                        </p>

                        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-3xl border border-white/10 bg-[#091423] px-4 py-4 transition hover:border-emerald-400/25 hover:bg-[#0c1829]">
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
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
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
                              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
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
                              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
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
                              className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
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
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                          <p className="text-sm font-semibold text-white">What happens next</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Access your first weekly module</li>
                            <li>• Start completing daily tasks in order</li>
                            <li>• Track money using your dashboard tools</li>
                          </ul>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                          <p className="text-sm font-semibold text-white">Dashboard</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            This is your main control center for progress, money tracking,
                            and daily action.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                          <p className="text-sm font-semibold text-white">Day Mission</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            Your next task is always visible so you know exactly what to do next.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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
        title="Create wallet"
        description="Add a new wallet without leaving the finance carousel."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          createWalletInline();
        }}
        submitLabel="Create wallet"
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
          helper="Choose a default type or create your own custom wallet type."
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
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
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
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-white/70">
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
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
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

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white">Added categories</p>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/60">
              {monthlyBudgetPlan.categories.length}
            </span>
          </div>

          {monthlyBudgetPlan.categories.length ? (
            <div className="space-y-2">
              {monthlyBudgetPlan.categories.map((item) => (
                <div
                  key={item.key || item.id || item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{fmt(item.allocated)} allocated</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openBudgetModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteBudgetCategoryModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/15 bg-rose-500/10 text-rose-100/80 transition hover:bg-rose-500/15 hover:text-rose-100"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm text-white/55">
              No categories added yet.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={financeActionLoading}
            onClick={() => saveBudgetInline({ exitAfterSave: true, saveCategory: false })}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
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
                    : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
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
                    : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
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

    </div>
  );
}
