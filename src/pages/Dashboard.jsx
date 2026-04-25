import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingDown,
  Newspaper,
  Clock,
  Sparkles,
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
  ListChecks,
  WalletCards,
  Target,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeftRight,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Edit,
  Calendar,
  AlertTriangle,
  Wallet,
  Palette,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import EmergencyFundCard from "../components/EmergencyFundCard";
import WalletCard from "../components/WalletCard";
import BudgetCard from "../components/BudgetCard";
import SavingsCard from "../components/SavingsCard";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import TaskReminderPrompt from "@/components/TaskReminderPrompt";
import useUserRole from "../hooks/useUserRole";
import useTaskReminderPrompt from "@/hooks/useTaskReminderPrompt";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import { useTheme } from "@/theme/ThemeProvider";
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

const createFinanceId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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

const sortByNewestDate = (items = [], dateKeys = ["updated_at", "created_at", "date"]) => {
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
    budget?.budget,
    budget?.total_budget,
    budget?.budget_amount,
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

const formatHistoryDate = (value) => {
  const date = normalizeDateValue(value);
  if (!date) return "No date";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getHistoryTypeLabel = (type) => {
  switch (normalizeLower(type)) {
    case "add":
      return "Added Money";
    case "income":
      return "Income";
    case "transfer_in":
      return "Transfer In";
    case "transfer_out":
      return "Transfer Out";
    case "expense":
      return "Expense";
    case "reset":
      return "Reset";
    case "savings_goal":
      return "Savings Goal";
    default:
      return String(type || "Transaction")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const getHistoryAmountPrefix = (type) => {
  const normalized = normalizeLower(type);
  if (["transfer_out", "expense", "reset", "savings_goal"].includes(normalized)) {
    return "-";
  }
  return "+";
};

const getTransactionDate = (item) =>
  normalizeDateValue(
    item?.transaction_date ||
      item?.date ||
      item?.created_at ||
      item?.updated_at ||
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

const getTransactionGroupLabel = (dateValue) => {
  const date = normalizeDateValue(dateValue);
  if (!date) return "Older";

  const todayKey = getPHDateKey();
  const txDateKey = getPHDateKey(date);
  if (txDateKey === todayKey) return "Today";

  const now = new Date();
  if (getPHWeekStartKey(date) === getPHWeekStartKey(now)) return "This Week";
  if (getPHMonthKey(date) === getPHMonthKey(now)) return "This Month";

  return "Older";
};

const buildUnifiedTransactions = (walletTransactions = [], expenses = []) => {
  const expenseIdsInLedger = new Set(
    walletTransactions
      .filter((txn) => normalizeLower(txn?.type) === "expense" && txn?.expense_id)
      .map((txn) => String(txn.expense_id))
  );

  const walletItems = walletTransactions.map((txn) => ({
    id: `wallet-${txn.id}`,
    source: "wallet",
    date: getTransactionDate(txn),
    type: normalizeLower(txn?.type || "transaction"),
    title: getHistoryTypeLabel(txn?.type),
    description: txn?.notes || txn?.category || txn?.details || "",
    amount: firstValidNumber(txn?.amount),
    raw: txn,
  }));

  const orphanExpenseItems = expenses
    .filter((expense) => !expenseIdsInLedger.has(String(expense.id)))
    .map((expense) => ({
      id: `expense-${expense.id}`,
      source: "expense",
      date: getTransactionDate(expense),
      type: "expense",
      title: "Expense",
      description: expense?.notes || getExpenseCategoryKey(expense),
      amount: firstValidNumber(expense?.amount),
      raw: expense,
    }));

  return [...walletItems, ...orphanExpenseItems].sort(
    (a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
  );
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

const getDashboardPrefsStorageKey = (userId) =>
  `clara_dashboard_prefs_${userId || "guest"}`;

function readDashboardPrefs(userId) {
  if (!userId) {
    return {
      reminderTime: "",
      financialGoal: "",
    };
  }

  try {
    const raw = localStorage.getItem(getDashboardPrefsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      reminderTime: normalizeString(parsed?.reminderTime || ""),
      financialGoal: normalizeString(parsed?.financialGoal || ""),
    };
  } catch (error) {
    console.error("Failed to read dashboard prefs:", error);
    return {
      reminderTime: "",
      financialGoal: "",
    };
  }
}

function persistDashboardPrefs(userId, updates) {
  if (!userId) return;

  try {
    const current = readDashboardPrefs(userId);
    localStorage.setItem(
      getDashboardPrefsStorageKey(userId),
      JSON.stringify({
        ...current,
        ...updates,
      })
    );
  } catch (error) {
    console.error("Failed to save dashboard prefs:", error);
  }
}

function getSettingsStorageKey(userId) {
  return `clara_settings_${userId || "guest"}`;
}

function readStoredNotificationSettings(userId) {
  const defaults = {
    dailyReminders: true,
    productUpdates: true,
    coachingAlerts: true,
  };

  if (!userId) return defaults;

  try {
    const raw = localStorage.getItem(getSettingsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...defaults,
      ...(parsed?.notifications || {}),
    };
  } catch (error) {
    console.error("Failed to read notification settings:", error);
    return defaults;
  }
}

const getProgramPromptSessionKey = (userId, bubble) => {
  const safeUserId = normalizeString(userId || "guest");
  const bubbleSignature = [
    normalizeString(bubble?.kind),
    normalizeString(bubble?.action),
    normalizeString(bubble?.href),
    normalizeString(bubble?.title),
    normalizeString(bubble?.body),
    normalizeString(bubble?.ctaLabel),
  ]
    .filter(Boolean)
    .join("||");

  return `clara_program_prompt_seen_session_${safeUserId}_${bubbleSignature || "default"}`;
};

const readProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return false;

  try {
    return sessionStorage.getItem(getProgramPromptSessionKey(userId, bubble)) === "true";
  } catch (error) {
    console.error("Failed to read program prompt session state:", error);
    return false;
  }
};

const persistProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return;

  try {
    sessionStorage.setItem(getProgramPromptSessionKey(userId, bubble), "true");
  } catch (error) {
    console.error("Failed to save program prompt session state:", error);
  }
};

const clearProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return;

  try {
    sessionStorage.removeItem(getProgramPromptSessionKey(userId, bubble));
  } catch (error) {
    console.error("Failed to clear program prompt session state:", error);
  }
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


const FinanceInlineAlert = ({ notice, onClose }) => {
  if (!notice?.message) return null;

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
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-4 pb-4 pt-10 backdrop-blur-md sm:items-center sm:p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-5rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#071120]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {description ? (
                <p className="mt-1 text-sm leading-6 text-white/65">{description}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex max-h-[calc(100dvh-5rem)] flex-col sm:max-h-[calc(100dvh-2rem)]">
          <div className="space-y-4 overflow-y-auto px-5 py-5">{children}</div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
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
        </form>
      </div>
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

const FINANCE_CARD_KEYS = ["emergency", "wallets", "budgets", "savings"];

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
    page: "min-h-[100dvh]",
    headerOuter: "px-[clamp(10px,3vw,14px)] pb-1 pt-[calc(env(safe-area-inset-top)+8px)] md:px-[clamp(10px,3vw,14px)]",
    headerPanel: "rounded-[22px] px-2 py-1.5 sm:px-2",
    headerItem: "gap-0.5 rounded-[14px] px-1 py-1.5 sm:px-1.5",
    headerIcon: "h-8 w-8",
    headerIconSvg: "h-4 w-4",
    headerLabel: "text-[10px]",
    content: "mt-1 space-y-[clamp(7px,1.5dvh,10px)] px-[clamp(10px,3vw,14px)] pb-[calc(env(safe-area-inset-bottom)+12px)] md:px-[clamp(10px,3vw,14px)] md:space-y-[clamp(7px,1.5dvh,10px)]",
    billboard: "h-[clamp(78px,13dvh,96px)]",
    billboardPad: "gap-2 p-3",
    billboardTitle: "mt-0.5 text-[clamp(13px,3.5vw,15px)]",
    billboardText: "mt-0.5 line-clamp-1 text-[11px] leading-snug",
    billboardCta: "mt-1",
    billboardIcon: "h-10 w-10 rounded-xl",
    financeWrap: "space-y-1.5",
    financeClip: "rounded-[24px]",
    financeSlide: "min-h-[238px] rounded-[24px] [&>*]:min-h-[236px] [&>*]:rounded-[23px]",
    dots: "gap-1 pt-0",
    summaryGrid: "rounded-[22px]",
    summaryCell: "min-h-[118px] p-[clamp(10px,3vw,12px)]",
    summaryLabel: "text-[9px] tracking-[0.18em]",
    summaryAmount: "mt-2 text-[clamp(22px,7vw,27px)]",
    summaryCopy: "mt-2 text-[11px] leading-4",
    summarySubcopy: "mt-1 text-[10px] leading-4",
  },
  compact: {
    page: "min-h-[100dvh]",
    headerOuter: "px-[clamp(12px,3.5vw,16px)] pb-1 pt-[calc(env(safe-area-inset-top)+10px)] md:px-[clamp(12px,3.5vw,16px)]",
    headerPanel: "rounded-[24px] px-2 py-2 sm:px-2",
    headerItem: "gap-0.5 rounded-[15px] px-1 py-1.5 sm:px-1.5",
    headerIcon: "h-9 w-9",
    headerIconSvg: "h-[18px] w-[18px]",
    headerLabel: "text-[10.5px]",
    content: "mt-1.5 space-y-[clamp(8px,1.7dvh,12px)] px-[clamp(12px,3.5vw,16px)] pb-[calc(env(safe-area-inset-bottom)+14px)] md:px-[clamp(12px,3.5vw,16px)] md:space-y-[clamp(8px,1.7dvh,12px)]",
    billboard: "h-[clamp(88px,14dvh,108px)]",
    billboardPad: "gap-2.5 p-3",
    billboardTitle: "mt-0.5 text-[clamp(14px,3.7vw,16px)]",
    billboardText: "mt-0.5 line-clamp-1 text-xs leading-snug",
    billboardCta: "mt-1.5",
    billboardIcon: "h-11 w-11 rounded-[14px]",
    financeWrap: "space-y-1.5",
    financeClip: "rounded-[26px]",
    financeSlide: "min-h-[258px] rounded-[26px] [&>*]:min-h-[256px] [&>*]:rounded-[25px]",
    dots: "gap-1.5 pt-0",
    summaryGrid: "rounded-[24px]",
    summaryCell: "min-h-[128px] p-[clamp(11px,3.2vw,14px)]",
    summaryLabel: "text-[10px] tracking-[0.2em]",
    summaryAmount: "mt-2.5 text-[clamp(24px,7.2vw,29px)]",
    summaryCopy: "mt-2 text-xs leading-5",
    summarySubcopy: "mt-1.5 text-[11px] leading-4",
  },
  normal: {
    page: "min-h-[100dvh]",
    headerOuter: "px-[clamp(14px,4vw,18px)] pb-1.5 pt-[calc(env(safe-area-inset-top)+12px)] md:px-[clamp(14px,4vw,18px)]",
    headerPanel: "rounded-[24px] px-2 py-2 sm:px-2.5",
    headerItem: "gap-1 rounded-[16px] px-1 py-2 sm:px-2",
    headerIcon: "h-10 w-10",
    headerIconSvg: "h-5 w-5",
    headerLabel: "text-[11px]",
    content: "mt-2 space-y-[clamp(10px,1.8dvh,14px)] px-[clamp(14px,4vw,18px)] pb-[calc(env(safe-area-inset-bottom)+16px)] md:px-[clamp(14px,4vw,18px)] md:space-y-[clamp(10px,1.8dvh,14px)]",
    billboard: "h-[clamp(100px,15dvh,124px)]",
    billboardPad: "gap-3 p-4",
    billboardTitle: "mt-1 text-base",
    billboardText: "mt-1 line-clamp-2 text-xs leading-relaxed",
    billboardCta: "mt-2",
    billboardIcon: "h-12 w-12 rounded-2xl",
    financeWrap: "space-y-2",
    financeClip: "rounded-[28px]",
    financeSlide: "min-h-[286px] rounded-[28px] [&>*]:min-h-[284px] [&>*]:rounded-[27px]",
    dots: "gap-1.5 pt-0.5",
    summaryGrid: "rounded-[26px]",
    summaryCell: "min-h-[140px] p-[clamp(13px,3.6vw,16px)]",
    summaryLabel: "text-[11px] tracking-[0.22em]",
    summaryAmount: "mt-3 text-3xl",
    summaryCopy: "mt-3 text-sm leading-6",
    summarySubcopy: "mt-2 text-xs leading-5",
  },
  spacious: {
    page: "min-h-[100dvh]",
    headerOuter: "px-[clamp(16px,4vw,20px)] pb-2 pt-[calc(env(safe-area-inset-top)+14px)] md:px-[clamp(16px,4vw,20px)]",
    headerPanel: "rounded-[24px] px-2 py-2.5 sm:px-2.5",
    headerItem: "gap-1 rounded-[16px] px-1 py-2 sm:px-2",
    headerIcon: "h-10 w-10",
    headerIconSvg: "h-5 w-5",
    headerLabel: "text-[11px]",
    content: "mt-2.5 space-y-[clamp(12px,2dvh,16px)] px-[clamp(16px,4vw,20px)] pb-[calc(env(safe-area-inset-bottom)+18px)] md:px-[clamp(16px,4vw,20px)] md:space-y-[clamp(12px,2dvh,16px)]",
    billboard: "h-[clamp(112px,15dvh,138px)]",
    billboardPad: "gap-3 p-4",
    billboardTitle: "mt-1 text-base",
    billboardText: "mt-1 line-clamp-2 text-xs leading-relaxed",
    billboardCta: "mt-2",
    billboardIcon: "h-12 w-12 rounded-2xl",
    financeWrap: "space-y-2",
    financeClip: "rounded-[30px]",
    financeSlide: "min-h-[314px] rounded-[30px] [&>*]:min-h-[312px] [&>*]:rounded-[29px]",
    dots: "gap-1.5 pt-0.5",
    summaryGrid: "rounded-[28px]",
    summaryCell: "min-h-[148px] p-4",
    summaryLabel: "text-[11px] tracking-[0.22em]",
    summaryAmount: "mt-3 text-3xl",
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

const getDashboardThemeStorageKey = (userId) =>
  `clara_dashboard_theme_${userId || "guest"}`;

function readStoredDashboardTheme(userId) {
  try {
    const raw = localStorage.getItem(getDashboardThemeStorageKey(userId));
    const exists = DASHBOARD_THEME_PRESETS.some((theme) => theme.key === raw);
    return exists ? raw : DASHBOARD_THEME_PRESETS[0].key;
  } catch (error) {
    console.error("Failed to read dashboard theme:", error);
    return DASHBOARD_THEME_PRESETS[0].key;
  }
}

function persistDashboardTheme(userId, themeKey) {
  try {
    localStorage.setItem(getDashboardThemeStorageKey(userId), themeKey);

    if (typeof window !== "undefined") {
      const detail = {
        themeKey,
        key: themeKey,
        dashboardTheme: themeKey,
        userId: userId || null,
      };

      window.dispatchEvent(
        new CustomEvent("clara-dashboard-theme-updated", { detail })
      );
      window.dispatchEvent(new CustomEvent("clara-theme-selected", { detail }));
      window.dispatchEvent(new CustomEvent("clara-theme-change", { detail }));
    }
  } catch (error) {
    console.error("Failed to save dashboard theme:", error);
  }
}

const dispatchClaraEvent = (name, detail = null) => {
  if (typeof window === "undefined") return;

  if (detail && typeof detail === "object") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return;
  }

  window.dispatchEvent(new Event(name));
};

const getSurvivalExpenseStorageKeys = (userId) => {
  const safeUserId = userId || "guest";
  return [
    `clara_survival_expense_${safeUserId}`,
    `clara_survival_number_${safeUserId}`,
    `survival_expense_${safeUserId}`,
    "clara_survival_expense",
    "clara_survival_number",
    "survival_expense",
  ];
};

const readStoredSurvivalExpense = (userId) => {
  if (typeof window === "undefined") return 0;

  for (const key of getSurvivalExpenseStorageKeys(userId)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      })();

      const amount = firstPositiveNumber(
        parsed?.monthlyEssentialExpenses,
        parsed?.monthly_survival_expense,
        parsed?.survivalExpense,
        parsed?.survival_expense,
        parsed?.amount,
        parsed
      );

      if (amount > 0) return amount;
    } catch (error) {
      console.error(`Failed to read ${key}:`, error);
    }
  }

  return 0;
};

const persistStoredSurvivalExpense = (userId, value) => {
  if (typeof window === "undefined") return;

  const amount = firstPositiveNumber(value);
  if (amount <= 0) return;

  const payload = JSON.stringify({
    amount,
    monthlyEssentialExpenses: amount,
    monthly_survival_expense: amount,
    survivalExpense: amount,
    survival_expense: amount,
    savedAt: new Date().toISOString(),
  });

  for (const key of getSurvivalExpenseStorageKeys(userId)) {
    try {
      window.localStorage.setItem(key, payload);
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  window.dispatchEvent(
    new CustomEvent("clara:survival-expense-updated", {
      detail: {
        amount,
        monthlyEssentialExpenses: amount,
        monthly_survival_expense: amount,
        survivalExpense: amount,
        survival_expense: amount,
      },
    })
  );
};

const createEmptyDashboardCache = (key = null) => ({
  key,
  loaded: false,
  tasks: [],
  submissions: [],
  programRecord: null,
  billboards: [],
  survivalExpense: 0,
  walletMoney: 0,
  wallets: [],
  walletTransactions: [],
  budgets: [],
  savingsGoals: [],
  expenses: [],
  profileData: null,
  latestEnrollment: null,
  guardChecked: false,
  nickname: "",
  reminderTime: "",
  financialGoal: "",
});

let dashboardPageCache = createEmptyDashboardCache();
let dashboardPageInFlight = null;

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedTheme: selectedDashboardTheme, openThemePicker } = useTheme();
  const dashboardViewportMode = useDashboardViewportMode();
  const dashboardScale = DASHBOARD_SCALE[dashboardViewportMode] || DASHBOARD_SCALE.normal;
  const { user, plan, isAdvertiser, isPaid, isFree, isPending, refreshUser } =
    useUserRole();

  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const cacheKey = userId || userEmail || null;
  const initialCache =
    dashboardPageCache.loaded && dashboardPageCache.key === cacheKey
      ? dashboardPageCache
      : createEmptyDashboardCache(cacheKey);

  const [tasks, setTasks] = useState(initialCache.tasks);
  const [submissions, setSubmissions] = useState(initialCache.submissions);
  const [programRecord, setProgramRecord] = useState(initialCache.programRecord);
  const [billboards, setBillboards] = useState(initialCache.billboards);
  const [survivalExpense, setSurvivalExpense] = useState(initialCache.survivalExpense);
  const [walletMoney, setWalletMoney] = useState(initialCache.walletMoney);
  const [wallets, setWallets] = useState(initialCache.wallets);
  const [walletTransactions, setWalletTransactions] = useState(initialCache.walletTransactions);
  const [budgets, setBudgets] = useState(initialCache.budgets);
  const [savingsGoals, setSavingsGoals] = useState(initialCache.savingsGoals);
  const [expenses, setExpenses] = useState(initialCache.expenses);
  const [loading, setLoading] = useState(!initialCache.loaded);

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
  const [expandedFinanceCard, setExpandedFinanceCard] = useState(null);
  const [financeActionLoading, setFinanceActionLoading] = useState(false);
  const [financeNotice, setFinanceNotice] = useState(null);
  const [financeModal, setFinanceModal] = useState({ type: null, payload: null });
  const [financeForm, setFinanceForm] = useState({
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
    ? "border-slate-300/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.90))] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_18px_rgba(148,163,184,0.16)] group-hover:border-slate-400/60 group-hover:bg-white"
    : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,255,255,0.04)] group-hover:border-white/20 group-hover:bg-white/[0.10]";
  const themeDividerClass = themeIsLight ? "via-slate-300/50" : "via-white/10";
  const themeInactiveDotClass = themeIsLight ? "bg-slate-400/35 hover:bg-slate-500/55" : "bg-white/20 hover:bg-white/35";
  const themeQuickActionPanelStyle = {
    background:
      selectedDashboardTheme?.tokens?.topNav ||
      selectedDashboardTheme?.tokens?.gradientHero ||
      "var(--theme-top-nav)",
    borderColor: selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
    boxShadow: themeIsLight
      ? "0 0 0 1px rgba(148,163,184,0.18), 0 18px 40px rgba(15,23,42,0.10)"
      : "0 0 0 1px rgba(255,255,255,0.03), 0 18px 46px rgba(0,0,0,0.32), 0 0 40px color-mix(in srgb, var(--theme-glow) 18%, transparent)",
  };
  const themeQuickActionGlowStyle = {
    background:
      selectedDashboardTheme?.tokens?.gradientHero ||
      "var(--theme-gradient-hero)",
    opacity: themeIsLight ? 0.42 : 0.7,
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
  const trackedViewIdsRef = useRef(new Set());
  const trackedClickIdsRef = useRef(new Set());
  const clickInFlightIdsRef = useRef(new Set());
  const approvalTriggeredRef = useRef(false);
  const hasLoadedDashboardRef = useRef(false);
  const latestEnrollmentRef = useRef(null);
  const isPaidRef = useRef(isPaid);

  const hydrateFromCache = useCallback((nextCache) => {
    setTasks(nextCache.tasks);
    setSubmissions(nextCache.submissions);
    setProgramRecord(nextCache.programRecord);
    setBillboards(nextCache.billboards);
    setSurvivalExpense(nextCache.survivalExpense);
    setWalletMoney(nextCache.walletMoney);
    setWallets(nextCache.wallets);
    setWalletTransactions(nextCache.walletTransactions);
    setBudgets(nextCache.budgets);
    setSavingsGoals(nextCache.savingsGoals);
    setExpenses(nextCache.expenses);
    setProfileData(nextCache.profileData);
    setLatestEnrollment(nextCache.latestEnrollment);
    setGuardChecked(nextCache.guardChecked);
    setNickname(nextCache.nickname);
    setReminderTime(nextCache.reminderTime);
    setFinancialGoal(nextCache.financialGoal);
    hasLoadedDashboardRef.current = nextCache.loaded;
    setLoading(!nextCache.loaded);
  }, []);

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
    setLoading(true);
  }, [cacheKey, hydrateFromCache]);

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
      const currentUser = {
        id: userId,
        email: userEmail,
        full_name: user?.full_name || "",
      };

      if (!currentUser.email && !currentUser.id) {
        const emptyCache = createEmptyDashboardCache();
        dashboardPageCache = emptyCache;
        hydrateFromCache(emptyCache);
        return;
      }

      if (dashboardPageInFlight?.key === cacheKey) {
        return dashboardPageInFlight.promise;
      }

      if (!hasLoadedDashboardRef.current && !background) {
        setLoading(true);
      }

      try {
        const promise = (async () => {
          const [
            tasksRes,
            submissionsRes,
            userProgramRecord,
            billboardsRes,
            expensesRes,
            profilesRes,
            walletsRes,
            walletTransactionsRes,
            budgetsRes,
            savingsGoalsRes,
            enrollmentsRes,
          ] = await Promise.all([
            supabase
              .from("challenge_tasks")
              .select("*")
              .order("sort_order", { ascending: true })
              .order("day", { ascending: true }),

            supabase.from("task_submissions").select("*"),

            fetchUserProgramRecord({ supabase, userId: currentUser.id }),

            supabase
              .from("billboards")
              .select("*")
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: false })
              .limit(10),

            supabase.from("expenses").select("*"),

            supabase.from("profiles").select("*"),

            supabase.from("wallets").select("*"),

            supabase
              .from("wallet_transactions")
              .select("*")
              .order("created_at", { ascending: false }),

            supabase.from("budgets").select("*"),

            supabase.from("savings_goals").select("*"),

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
          if (billboardsRes.error) {
            console.error("Failed to load billboards:", billboardsRes.error);
          }
          if (expensesRes.error) {
            console.error("Failed to load expenses:", expensesRes.error);
          }
          if (profilesRes.error) {
            console.error("Failed to load profiles:", profilesRes.error);
          }
          if (walletsRes.error) {
            console.error("Failed to load wallets:", walletsRes.error);
          }
          if (walletTransactionsRes.error) {
            console.error(
              "Failed to load wallet transactions:",
              walletTransactionsRes.error
            );
          }
          if (budgetsRes.error) {
            console.error("Failed to load budgets:", budgetsRes.error);
          }
          if (savingsGoalsRes.error) {
            console.error("Failed to load savings goals:", savingsGoalsRes.error);
          }
          if (enrollmentsRes.error) {
            console.error("Failed to load enrollments:", enrollmentsRes.error);
          }

          const userSubmissions = (submissionsRes.data || []).filter((item) =>
            isOwnedByUser(item, currentUser)
          );

          const normalizedTasks = (tasksRes.data || []).map(normalizeProgramTask);

          const userExpenses = (expensesRes.data || [])
            .filter((expense) => isOwnedByUser(expense, currentUser))
            .map((expense) => ({
              ...expense,
              amount: Number(expense.amount) || 0,
              date: expense.date || expense.created_at || "",
            }));

          const userProfile =
            (profilesRes.data || []).find((profile) =>
              isOwnedByUser(profile, currentUser)
            ) || null;

          const enrollmentRecord = (enrollmentsRes.data || [])[0] || null;

          const userWallets = (walletsRes.data || []).filter((wallet) =>
            isOwnedByUser(wallet, currentUser)
          );

          const userWalletTransactions = sortByNewestDate(
            (walletTransactionsRes.data || []).filter((item) =>
              isOwnedByUser(item, currentUser)
            ),
            ["transaction_date", "date", "created_at", "updated_at"]
          );

          const sortedWallets = [...userWallets].sort((a, b) => {
            const aPosition = firstValidNumber(
              a?.position,
              a?.sort_order,
              a?.display_order,
              a?.priority,
              999
            );
            const bPosition = firstValidNumber(
              b?.position,
              b?.sort_order,
              b?.display_order,
              b?.priority,
              999
            );

            if (aPosition !== bPosition) return aPosition - bPosition;
            return getWalletDisplayName(a).localeCompare(getWalletDisplayName(b));
          }).map((wallet) => {
            const balance = getWalletBalance(wallet, userWalletTransactions);
            return {
              ...wallet,
              balance,
              derived_balance: balance,
            };
          });

          const userBudgets = sortByNewestDate(
            (budgetsRes.data || []).filter((budget) => isOwnedByUser(budget, currentUser))
          );

          const userSavingsGoals = sortByNewestDate(
            (savingsGoalsRes.data || []).filter((goal) => isOwnedByUser(goal, currentUser)),
            ["deadline", "due_date", "target_date", "updated_at", "created_at"]
          );

          const totalWalletMoney = sortedWallets.reduce((sum, wallet) => {
            return sum + getWalletDisplayBalance(wallet);
          }, 0);

          const activeBillboards = (billboardsRes.data || []).filter(
            (item) =>
              isTruthyActive(item?.is_active) ||
              item?.is_active === null ||
              item?.is_active === undefined
          );

          const storedPrefs = readDashboardPrefs(currentUser.id);
          const nextNickname = normalizeString(
            userProfile?.display_name ||
              userProfile?.nickname ||
              userProfile?.full_name ||
              nickname ||
              dashboardPageCache.nickname ||
              currentUser.full_name ||
              ""
          );
          const nextReminderTime =
            reminderTime || dashboardPageCache.reminderTime || storedPrefs.reminderTime;
          const nextFinancialGoal =
            financialGoal ||
            dashboardPageCache.financialGoal ||
            storedPrefs.financialGoal;

          const approved = isProgramApproved(userProfile, isPaid, enrollmentRecord);
          const onboardingDone = hasCompletedProgramOnboarding(userProfile);

          if (!approved || onboardingDone || !dailyRemindersEnabled) {
            setShowProgramStart(false);
          }

          const nextCache = {
            key: cacheKey,
            loaded: true,
            tasks: normalizedTasks,
            submissions: userSubmissions,
            programRecord:
              userProgramRecord ||
              (approved
                ? await ensureUserProgramAccess({
                    supabase,
                    user: currentUser,
                    profile: userProfile,
                    enrollment: enrollmentRecord,
                    tasks: normalizedTasks,
                  })
                : null),
            billboards: activeBillboards,
            survivalExpense: firstPositiveNumber(
              userProfile?.monthly_survival_expense,
              userProfile?.survival_expense,
              userProfile?.clara_survival_expense,
              readStoredSurvivalExpense(currentUser.id),
              survivalExpense,
              dashboardPageCache.survivalExpense
            ),
            walletMoney: totalWalletMoney,
            wallets: sortedWallets,
            walletTransactions: userWalletTransactions,
            budgets: userBudgets,
            savingsGoals: userSavingsGoals,
            expenses: userExpenses,
            profileData: userProfile,
            latestEnrollment: enrollmentRecord,
            guardChecked: true,
            nickname: nextNickname,
            reminderTime: nextReminderTime,
            financialGoal: nextFinancialGoal,
          };

          dashboardPageCache = nextCache;
          hydrateFromCache(nextCache);
          return nextCache;
        })();

        dashboardPageInFlight = {
          key: cacheKey,
          promise,
        };

        return await promise;
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        if (dashboardPageInFlight?.key === cacheKey) {
          dashboardPageInFlight = null;
        }
        setLoading(false);
        setGuardChecked(true);
      }
    },
    [
      cacheKey,
      financialGoal,
      hydrateFromCache,
      isPaid,
      dailyRemindersEnabled,
      nickname,
      reminderTime,
      user?.full_name,
      userEmail,
      userId,
    ]
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      loadDashboardData({ background: true });
    }, 350);
  }, [loadDashboardData]);

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

  const dashboardTransactions = useMemo(
    () => buildUnifiedTransactions(walletTransactions, expenses),
    [walletTransactions, expenses]
  );

  const groupedDashboardTransactions = useMemo(() => {
    const groups = {
      Today: [],
      "This Week": [],
      "This Month": [],
      Older: [],
    };

    dashboardTransactions.slice(0, 18).forEach((transaction) => {
      const label = getTransactionGroupLabel(transaction.date);
      groups[label].push(transaction);
    });

    return groups;
  }, [dashboardTransactions]);

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

      if (!showOnboarding && dailyRemindersEnabled && hasPaidProgramAccess) {
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
  ]);

  useEffect(() => {
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

  const scrollFinanceCardsTo = useCallback((nextIndex) => {
    const container = financeCarouselRef.current;
    if (!container) return;
    const width = container.clientWidth || 0;
    container.scrollTo({
      left: width * nextIndex,
      behavior: "smooth",
    });
  }, []);

  const toggleFinanceDetails = useCallback((cardKey) => {
    setExpandedFinanceCard((prev) => (prev === cardKey ? null : cardKey));
  }, []);

  const handleFinanceCarouselScroll = useCallback(() => {
    const container = financeCarouselRef.current;
    if (!container) return;
    const width = container.clientWidth || 1;
    const index = Math.round(container.scrollLeft / width);
    setFinanceCardIndex(Math.max(0, Math.min(financeCards.length - 1, index)));
  }, [financeCards.length]);

  const showFinanceNotice = useCallback((message, type = "error") => {
    setFinanceNotice({ message, type });
  }, []);

  const closeFinanceNotice = useCallback(() => {
    setFinanceNotice(null);
  }, []);

  const closeFinanceModal = useCallback(() => {
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

  const openBudgetModal = useCallback(() => {
    setFinanceForm((prev) => ({
      ...prev,
      totalBudget: derivedActiveBudget ? String(getBudgetTotal(derivedActiveBudget)) : "",
      needsPct: String(derivedActiveBudget?.needs_pct ?? derivedActiveBudget?.needs_percent ?? 50),
      wantsPct: String(derivedActiveBudget?.wants_pct ?? derivedActiveBudget?.wants_percent ?? 30),
      otherPct: String(derivedActiveBudget?.other_pct ?? derivedActiveBudget?.other_percent ?? 20),
    }));
    setFinanceModal({ type: "save_budget", payload: activeBudget || null });
  }, [derivedActiveBudget]);

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
    const container = financeCarouselRef.current;
    if (!container) return;

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
  }, [handleFinanceCarouselScroll]);


  const refreshFinanceSection = useCallback(async () => {
    await loadDashboardData({ background: true });
    dispatchClaraEvent("clara-finance-updated");
  }, [loadDashboardData]);

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

        const results = await Promise.all(
          orderedWallets.map((wallet, index) =>
            supabase
              .from("wallets")
              .update({ sort_order: index })
              .eq("id", String(wallet.id))
          )
        );

        const failed = results.find((result) => result?.error);
        if (failed?.error) throw failed.error;

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
      const { error } = await supabase.from("wallets").insert([
        {
          name,
          type,
          balance: startingBalance,
          starting_balance: startingBalance,
          sort_order: wallets.length,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
      ]);

      if (error) throw error;

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
  ]);

  const deleteWalletInline = useCallback(async () => {
    const walletId = financeModal?.payload?.id;
    if (!walletId) return;

    try {
      setFinanceActionLoading(true);
      const { error } = await supabase
        .from("wallets")
        .delete()
        .eq("id", String(walletId));

      if (error) throw error;

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Wallet deleted.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to delete wallet.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice]);

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
      const { error: historyError } = await supabase.from("wallet_transactions").insert([
        {
          id: createFinanceId("txn"),
          wallet_id: wallet.id,
          type: "income",
          amount,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
      ]);

      if (historyError) throw historyError;

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
      const transferGroupId = createFinanceId("transfer");
      const { error: historyError } = await supabase.from("wallet_transactions").insert([
        {
          id: createFinanceId("txn"),
          wallet_id: fromWallet.id,
          type: "transfer_out",
          amount,
          transfer_group_id: transferGroupId,
          related_wallet_id: String(destinationWallet.id),
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
        {
          id: createFinanceId("txn"),
          wallet_id: destinationWallet.id,
          type: "transfer_in",
          amount,
          transfer_group_id: transferGroupId,
          related_wallet_id: String(fromWallet.id),
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
      ]);
      if (historyError) throw historyError;

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
  ]);

  const saveBudgetInline = useCallback(async () => {
    const totalBudget = Number(financeForm.totalBudget);
    const needsPct = Number(financeForm.needsPct);
    const wantsPct = Number(financeForm.wantsPct);
    const otherPct = Number(financeForm.otherPct);

    if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
      showFinanceNotice("Please enter a valid total budget.");
      return;
    }

    if (
      ![needsPct, wantsPct, otherPct].every(Number.isFinite) ||
      needsPct + wantsPct + otherPct !== 100
    ) {
      showFinanceNotice("Needs, Wants, and Other must total exactly 100%.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      const monthKey = activeBudget?.month || getPHMonthKey();

      if (user?.id || user?.email) {
        await supabase
          .from("budgets")
          .update({ is_active: false, status: "inactive" })
          .or(
            [
              user?.id ? `user_id.eq.${user.id}` : null,
              user?.email ? `user_email.eq.${user.email}` : null,
              user?.email ? `email.eq.${user.email}` : null,
              user?.email ? `created_by.eq.${user.email}` : null,
            ]
              .filter(Boolean)
              .join(",")
          );
      }

      const payload = {
        is_active: true,
        status: "active",
        month: monthKey,
        total_budget: totalBudget,
        needs_pct: needsPct,
        wants_pct: wantsPct,
        other_pct: otherPct,
        needs_percent: needsPct,
        wants_percent: wantsPct,
        other_percent: otherPct,
        savings_pct: otherPct,
        savings_percent: otherPct,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (activeBudget?.id) {
        result = await supabase.from("budgets").update(payload).eq("id", activeBudget.id);
      } else {
        result = await supabase.from("budgets").insert([
          {
            ...payload,
            tracking_start_date: nowIso,
            range_start: nowIso,
            created_at: nowIso,
            created_by: user?.email || null,
            email: user?.email || null,
            user_id: user?.id || null,
          },
        ]);
      }

      if (result.error) throw result.error;

      await refreshFinanceSection();
      setExpandedFinanceCard("budgets");
      closeFinanceModal();
      showFinanceNotice("Budget saved successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to save budget.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    activeBudget,
    derivedActiveBudget,
    closeFinanceModal,
    financeForm.needsPct,
    financeForm.otherPct,
    financeForm.totalBudget,
    financeForm.wantsPct,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
  ]);

  const resetBudgetInline = useCallback(async () => {
    if (!activeBudget?.id) return;

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("budgets")
        .update({
          tracking_start_date: nowIso,
          range_start: nowIso,
          updated_at: nowIso,
        })
        .eq("id", activeBudget.id);
      if (error) throw error;

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Budget tracking has been reset.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to reset budget.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [activeBudget, closeFinanceModal, refreshFinanceSection, showFinanceNotice]);

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
        const { error } = await supabase
          .from("savings_goals")
          .update(payload)
          .eq("id", String(goal.id));
        if (error) throw error;
      } else {
        const { error } = await supabase.from("savings_goals").insert([
          {
            id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            ...payload,
            created_date: new Date().toISOString(),
          },
        ]);
        if (error) throw error;
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
  ]);

  const deleteSavingsGoalInline = useCallback(async () => {
    const goalId = financeModal?.payload?.id;
    if (!goalId) return;

    try {
      setFinanceActionLoading(true);
      const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", String(goalId));
      if (error) throw error;

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Savings goal deleted.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to delete savings goal.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice]);

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
      const { error: txnError } = await supabase.from("wallet_transactions").insert([
        {
          id: createFinanceId("txn"),
          wallet_id: String(sourceWallet.id),
          type: "savings_goal",
          amount: finalAmount,
          notes: `Moved to savings goal: ${goal.title}`,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
      ]);
      if (txnError) throw txnError;

      const { error: goalError } = await supabase
        .from("savings_goals")
        .update({
          saved_amount: Math.min(currentSaved + finalAmount, target),
          wallet_id: sourceWallet.id,
          updated_date: new Date().toISOString(),
        })
        .eq("id", String(goal.id));
      if (goalError) throw goalError;

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
        subcopy: `Income not recorded yet. Spent ${fmt(thisMonthSpent)} this month.`,
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
  const newsHasUpdate = hasBillboardContent;

  const headerQuickActions = [
    {
      key: "feed",
      label: "Feed",
      icon: Home,
      to: "/feed",
      badge: feedHasHighlight
        ? {
            type: "pill",
            value: "New",
            className:
              "border-emerald-400/20 bg-emerald-400/12 text-emerald-200",
          }
        : null,
    },
    {
      key: "messages",
      label: "Messages",
      icon: MessageCircle,
      to: "/messages",
      badge: unreadMessagesCount > 0
        ? {
            type: "count",
            value: unreadMessagesCount > 9 ? "9+" : String(unreadMessagesCount),
            className: "border-red-400/20 bg-red-500/18 text-red-100",
          }
        : null,
    },
    {
      key: "task",
      label: "Task",
      icon: ListChecks,
      to: "/tasks",
      badge: taskBadgeLabel
        ? {
            type: "pill",
            value: taskBadgeLabel,
            className: "border-amber-400/20 bg-amber-400/14 text-amber-200",
          }
        : null,
    },
    {
      key: "news",
      label: "News",
      icon: Newspaper,
      to: "/news",
      badge: newsHasUpdate
        ? {
            type: "dot",
            value: "",
            className: "border-sky-400/25 bg-sky-400 text-sky-100",
          }
        : null,
    },
  ];

  if (!guardChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061018] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
          <p className="text-sm text-white/75">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-page-shell relative isolate z-0 w-full max-w-[430px] mx-auto ${dashboardScale.page} overflow-x-hidden overflow-y-auto`} style={{ WebkitOverflowScrolling: "touch" }}>
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
                      : item.key === "news"
                        ? "group-hover:shadow-[0_0_22px_rgba(56,189,248,0.16)]"
                        : "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.10)]";

                return (
                  <div key={item.key} className="flex flex-1 items-center">
                    <Link
                      to={item.to}
                      className="group flex-1"
                      aria-label={item.label}
                    >
                      <div className={`relative flex w-full flex-col items-center justify-center transition duration-200 hover:-translate-y-[1px] active:scale-[0.985] ${dashboardScale.headerItem} ${themeQuickActionBaseClass}`}>
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
                    </Link>

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

      <div className={`mx-auto w-full max-w-[430px] ${dashboardScale.content}`}>
        {isPending && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-secondary/20 p-3">
            <Clock className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-sm">Enrollment Under Review</div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        {hasBillboardContent && (
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
          <div className={dashboardScale.financeWrap}>
            <FinanceInlineAlert notice={financeNotice} onClose={closeFinanceNotice} />
            <div className={`overflow-hidden ${dashboardScale.financeClip}`}>
              <div
                ref={financeCarouselRef}
                className="flex items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex w-full shrink-0 snap-center">
                  <div className={getFinanceSlideShellClass("emergency", selectedDashboardTheme, dashboardScale)}>
                    <EmergencyFundCard
                      moneyLeft={walletMoney}
                      survivalExpense={survivalExpense}
                      retentionRate={0}
                      theme={selectedDashboardTheme}
                      onOpenThemePicker={openThemePicker}
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

                <div className="flex w-full shrink-0 snap-center">
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

                <div className="flex w-full shrink-0 snap-center">
                  <div className={getFinanceSlideShellClass("budgets", selectedDashboardTheme, dashboardScale)}>
                    <BudgetCard
                    activeBudget={derivedActiveBudget}
                    theme={selectedDashboardTheme}
                    expanded={expandedFinanceCard === "budgets"}
                    onToggleDetails={() => toggleFinanceDetails("budgets")}
                    financeActionLoading={financeActionLoading}
                    onSaveBudget={openBudgetModal}
                    onResetBudget={openResetBudgetModal}
                  />
                  </div>
                </div>

                <div className="flex w-full shrink-0 snap-center">
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
          className={`grid grid-cols-2 overflow-hidden border backdrop-blur-sm ${dashboardScale.summaryGrid}`}
          style={{
            borderColor:
              selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
            boxShadow: themeIsLight
              ? "0 18px 44px rgba(15,23,42,0.10)"
              : "0 22px 65px rgba(0,0,0,0.26)",
          }}
        >
          <div
            className={`relative isolate overflow-hidden ${dashboardScale.summaryCell}`}
            style={{
              background:
                selectedDashboardTheme?.tokens?.gradientMoney ||
                "var(--theme-gradient-money)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="relative min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`uppercase ${dashboardScale.summaryLabel} ${themeSoftTextClass}`}>
                  Money Left
                </p>
                <span aria-hidden="true" className="w-8 shrink-0" />
              </div>
              <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount} ${themePrimaryTextClass}`}>
                {fmt(walletMoney)}
              </h2>
              <p className={`${dashboardScale.summaryCopy} ${themeMutedTextClass}`}>
                {moneyLeftHealth.title}
                {moneyLeftHealth.highlight ? (
                  <>
                    {" "}
                    <span className="font-bold text-emerald-300">
                      {moneyLeftHealth.highlight}
                    </span>
                  </>
                ) : null}
              </p>
              {moneyLeftHealth.subcopy ? (
                <p className={`${dashboardScale.summarySubcopy} ${themeSoftTextClass}`}>
                  {moneyLeftHealth.subcopy}
                </p>
              ) : null}
            </div>
          </div>

          <div
            className={`relative isolate overflow-hidden border-l ${dashboardScale.summaryCell}`}
            style={{
              background:
                selectedDashboardTheme?.tokens?.gradientExpense ||
                "var(--theme-gradient-expense)",
              borderColor:
                selectedDashboardTheme?.tokens?.border || "var(--theme-border)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="relative min-w-0">
              <p className={`uppercase ${dashboardScale.summaryLabel} ${themeSoftTextClass}`}>
                Total Expense
              </p>
              <h2 className={`font-bold leading-none ${dashboardScale.summaryAmount} ${themePrimaryTextClass}`}>
                {fmt(thisMonthSpent)}
              </h2>
              <p className={`${dashboardScale.summaryCopy} ${themeMutedTextClass}`}>
                {expenseHealth.title}
                {expenseHealth.highlight ? (
                  <>
                    {" "}
                    <span className="font-bold text-emerald-300">
                      {expenseHealth.highlight}
                    </span>
                  </>
                ) : null}
              </p>
              <p className={`${dashboardScale.summarySubcopy} ${themeSoftTextClass}`}>
                {expenseHealth.subcopy}
              </p>
            </div>
          </div>
        </div>

      </div>


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

      <FinanceActionModal
        open={financeModal.type === "save_budget"}
        title={activeBudget?.id ? "Edit budget" : "Create budget"}
        description="Keep the same premium card layout while updating your budget inside an in-app modal."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          saveBudgetInline();
        }}
        submitLabel={activeBudget?.id ? "Save changes" : "Create budget"}
        loading={financeActionLoading}
      >
        <FinanceField label="Total budget">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FinanceField label="Needs %">
            <input
              type="number"
              min="0"
              max="100"
              value={financeForm.needsPct}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, needsPct: event.target.value }))
              }
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Wants %">
            <input
              type="number"
              min="0"
              max="100"
              value={financeForm.wantsPct}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, wantsPct: event.target.value }))
              }
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Other %">
            <input
              type="number"
              min="0"
              max="100"
              value={financeForm.otherPct}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, otherPct: event.target.value }))
              }
              className={financeInputClassName}
            />
          </FinanceField>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/60">
          Total allocation must equal exactly 100%.
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

    </div>
  );
}
