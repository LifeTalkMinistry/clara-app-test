import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import useFinancialData, { CLARA_DEMO_LOCAL_USER_ID } from "../../hooks/useFinancialData";
import { insertWalletTransaction } from "@/lib/financeRepository";
import { readClaraDevIdentityOverride } from "@/lib/clara-dev-simulator";

export const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n) || 0);

export const MILESTONES = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

export const VALID_TARGET_MONTHS = [3, 6, 12];

const ORB_LONG_PRESS_MS = 520;
const ORB_DOUBLE_TAP_DELAY_MS = 340;
const INCOME_LOOKBACK_DAYS = 90;
const MOTION_TRANSITION_KEY = "clara_motion_transition_origin";
const TRANSACTION_TRANSITION_KEY = "clara_transactions_transition_origin";
const MOTION_TARGET_KEY = "clara_motion_target_path";
const INCOME_TYPES = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);

export function clampOpacity(value) {
  return Math.max(0, Math.min(Number(value) || 0.3, 0.5));
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFinanceIdentityMode() {
  try {
    return readClaraDevIdentityOverride()?.scenarioId || "real_user";
  } catch {
    return "real_user";
  }
}

function getLocalUserId(user) {
  if (getFinanceIdentityMode() === "demo_user") return CLARA_DEMO_LOCAL_USER_ID;
  return String(user?.id || user?.email || "local-user").trim() || "local-user";
}

function firstValue(source, keys = [], fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function getEmergencyActivityLog(emergencyFund) {
  const source =
    emergencyFund?.emergencyActivityLog ||
    emergencyFund?.emergency_activity_log ||
    emergencyFund?.activityLog ||
    emergencyFund?.activity_log ||
    emergencyFund?.usageLog ||
    emergencyFund?.usage_log ||
    [];
  return Array.isArray(source) ? source.filter(Boolean) : [];
}

function getSavedEmergencyAmount(emergencyFund) {
  return toNumber(
    firstValue(
      emergencyFund,
      [
        "protectedBalance",
        "protected_balance",
        "reserveBalance",
        "reserve_balance",
        "savedAmount",
        "saved_amount",
        "currentAmount",
        "current_amount",
        "amount",
        "balance",
        "moneyLeft",
      ],
      0
    )
  );
}

function getLinkedWalletId(emergencyFund) {
  return String(
    firstValue(
      emergencyFund,
      [
        "linkedWalletId",
        "linked_wallet_id",
        "reserveWalletId",
        "reserve_wallet_id",
        "sourceWalletId",
        "source_wallet_id",
        "walletId",
        "wallet_id",
      ],
      ""
    ) || ""
  ).trim();
}

function getLinkedWalletName(emergencyFund) {
  return String(
    firstValue(
      emergencyFund,
      [
        "linkedWalletName",
        "linked_wallet_name",
        "reserveWalletName",
        "reserve_wallet_name",
        "sourceWalletName",
        "source_wallet_name",
        "walletName",
        "wallet_name",
      ],
      ""
    ) || ""
  ).trim();
}

function walletId(wallet) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.uuid || "").trim();
}

function walletName(wallet) {
  return String(wallet?.name || wallet?.title || wallet?.wallet_name || wallet?.label || "Wallet").trim() || "Wallet";
}

function walletBalance(wallet) {
  return toNumber(
    wallet?.derived_balance ??
      wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.amount ??
      wallet?.money ??
      0
  );
}

function normalizeWallet(wallet = {}) {
  const id = walletId(wallet);
  const balance = walletBalance(wallet);
  const protectedAmount = toNumber(wallet?.emergencyProtectedAmount ?? wallet?.emergency_protected_amount ?? 0);
  return {
    ...wallet,
    id,
    wallet_id: id,
    name: walletName(wallet),
    balance,
    emergencyProtectedAmount: protectedAmount,
    emergency_protected_amount: protectedAmount,
    spendableBalance: Math.max(balance - Math.min(protectedAmount, balance), 0),
    spendable_balance: Math.max(balance - Math.min(protectedAmount, balance), 0),
  };
}

function isIncomeRecord(row) {
  const type = String(row?.type || row?.transaction_type || "").trim().toLowerCase();
  const category = String(row?.category || row?.category_name || "").trim().toLowerCase();
  const sourceType = String(row?.source_type || row?.sourceType || "").trim().toLowerCase();
  return INCOME_TYPES.has(type) || INCOME_TYPES.has(sourceType) || category.includes("income") || category.includes("salary") || sourceType.includes("salary");
}

function getRecordDate(row) {
  const value = row?.createdAt || row?.created_at || row?.created_date || row?.date || row?.transaction_date || row?.updatedAt || row?.updated_at;
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function standardDeviation(values = []) {
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function roundFriendly(value) {
  const amount = toNumber(value);
  if (amount <= 0) return 0;
  if (amount < 500) return Math.max(50, Math.round(amount / 50) * 50);
  if (amount < 3000) return Math.round(amount / 100) * 100;
  return Math.round(amount / 500) * 500;
}

function buildEmergencyAdvisor({ incomeRows = [], effectiveExpense = 0, amountNeeded = 0, targetMonths = 3 } = {}) {
  const now = Date.now();
  const startTime = now - INCOME_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const buckets = new Map();
  let total = 0;
  let count = 0;

  (Array.isArray(incomeRows) ? incomeRows : []).forEach((row) => {
    if (!row || row.deletedAt || row.deleted_at || !isIncomeRecord(row)) return;
    const amount = toNumber(row.amount ?? row.value ?? row.total ?? row.income_amount);
    const date = getRecordDate(row);
    if (amount <= 0 || !date || date.getTime() < startTime || date.getTime() > now) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) || 0) + amount);
    total += amount;
    count += 1;
  });

  const monthlyValues = Array.from(buckets.values()).filter((value) => value > 0);
  const averageMonthlyIncome = total > 0 ? total / Math.min(3, Math.max(monthlyValues.length, 1)) : 0;
  const variationRatio = averageMonthlyIncome > 0 ? standardDeviation(monthlyValues) / averageMonthlyIncome : 0;
  const stability = count < 2 || averageMonthlyIncome <= 0 ? "unknown" : variationRatio <= 0.25 ? "stable" : variationRatio <= 0.55 ? "mixed" : "irregular";
  const rate = stability === "stable" ? 0.15 : stability === "mixed" ? 0.1 : stability === "irregular" ? 0.07 : 0.05;
  const monthlyRoomAfterSurvival = Math.max(averageMonthlyIncome - toNumber(effectiveExpense), 0);
  const conservative = Math.min(averageMonthlyIncome * rate, monthlyRoomAfterSurvival > 0 ? monthlyRoomAfterSurvival * 0.35 : averageMonthlyIncome * rate);
  const recommendedMonthlyAmount = Math.min(Math.max(toNumber(amountNeeded), 0), roundFriendly(conservative));

  return {
    lookbackDays: INCOME_LOOKBACK_DAYS,
    incomeEntryCount: count,
    activeIncomeMonths: monthlyValues.length,
    averageMonthlyIncome,
    monthlyIncomeValues: monthlyValues,
    stability,
    variationRatio,
    monthlyRoomAfterSurvival,
    recommendedMonthlyAmount,
    estimatedMonthsToTarget: recommendedMonthlyAmount > 0 && amountNeeded > 0 ? Math.ceil(amountNeeded / recommendedMonthlyAmount) : 0,
    selectedTargetMonths: targetMonths,
    hasIncomeSignal: averageMonthlyIncome > 0 && count > 0,
    tone:
      stability === "stable"
        ? "Your income pattern looks stable enough for a consistent protection pace."
        : stability === "mixed"
          ? "Your income pattern moves a bit, so CLARA is keeping this pace flexible."
          : stability === "irregular"
            ? "Your income changes often, so CLARA is choosing a gentler protection pace."
            : "CLARA needs more income history before giving a precise pace.",
  };
}

function storeAnalyticsTransitionOrigin(element) {
  if (!element || typeof window === "undefined") return;
  try {
    const card = element.closest?.("[data-emergency-card]") || element;
    const rect = card.getBoundingClientRect();
    const payload = JSON.stringify({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    sessionStorage.setItem(MOTION_TRANSITION_KEY, payload);
    sessionStorage.setItem(TRANSACTION_TRANSITION_KEY, payload);
    sessionStorage.setItem(MOTION_TARGET_KEY, "/analytics");
  } catch (error) {
    console.warn("Unable to store analytics transition origin:", error);
  }
}

export function getStatus(months, targetMonths) {
  if (months >= targetMonths) return { label: "Secure", text: "text-emerald-300", badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25", bar: "from-emerald-400 to-green-300", ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]" };
  if (months >= targetMonths * 0.66) return { label: "Stable", text: "text-emerald-300", badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25", bar: "from-emerald-400 to-green-300", ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]" };
  if (months >= targetMonths * 0.33) return { label: "Building", text: "text-amber-300", badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25", bar: "from-amber-400 to-yellow-300", ring: "shadow-[0_0_24px_rgba(251,191,36,0.16)]" };
  return { label: "At Risk", text: "text-rose-300", badge: "bg-rose-500/15 text-rose-300 border border-rose-400/25", bar: "from-rose-400 to-pink-300", ring: "shadow-[0_0_24px_rgba(244,63,94,0.16)]" };
}

export function getProgression(months, targetMonths) {
  if (months >= targetMonths && targetMonths === 3) return "You're safe. Now push to 6 months.";
  if (months >= targetMonths && targetMonths === 6) return "Strong position. Aim for full protection (12 months).";
  if (months >= targetMonths) return "You are financially protected. Maintain this discipline.";
  if (months >= targetMonths * 0.66) return "You're close. Stay consistent and finish this.";
  if (months >= targetMonths * 0.33) return "Good start. Build momentum.";
  return "Start building your protection today.";
}

export function getEmergencyThemeClasses(theme) {
  const isLight = theme?.isLight === true;
  return {
    border: isLight ? "border-slate-300/45" : "border-white/10",
    title: isLight ? "text-slate-950" : "text-white",
    body: isLight ? "text-slate-700" : "text-white/82",
    muted: isLight ? "text-slate-500" : "text-white/60",
    glass: isLight ? "border-slate-300/45 bg-white/70 text-slate-800" : "border-white/10 bg-black/15 text-white/85",
    iconShell: isLight ? "border-cyan-300/40 bg-cyan-500/10 shadow-[0_0_18px_rgba(14,165,233,0.10)]" : "border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
    iconColor: isLight ? "text-cyan-700" : "text-cyan-300",
    background: theme?.tokens?.gradientEmergency || "var(--theme-gradient-emergency)",
    outline: theme?.tokens?.border || "var(--theme-border)",
  };
}

export default function useEmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
  theme = null,
  expanded = false,
  onQuickExpense,
  onQuickAI,
} = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const localUserId = getLocalUserId(user);
  const { emergencyFund, wallets = [], walletTransactions = [], incomes = [], updateEmergencyFund, refreshData } = useFinancialData(user);

  const linkedWalletIdFromFund = getLinkedWalletId(emergencyFund);
  const linkedWalletNameFromFund = getLinkedWalletName(emergencyFund);
  const storedSavedAmount = getSavedEmergencyAmount(emergencyFund);
  const emergencyTargetMonths = toNumber(firstValue(emergencyFund, ["targetMonths", "target_months", "months_target"], 3)) || 3;
  const hasEmergencyFundReset = Boolean(emergencyFund?.resetAt || emergencyFund?.reset_at);
  const survivalExpenseValueFromFund = firstValue(
    emergencyFund,
    ["survivalExpense", "survival_expense", "monthlyExpense", "monthly_expense", "monthly_survival_expense"],
    undefined
  );
  const hasEmergencySurvivalExpense = survivalExpenseValueFromFund !== undefined && survivalExpenseValueFromFund !== null && survivalExpenseValueFromFund !== "";
  const emergencySurvivalExpense = hasEmergencyFundReset
    ? 0
    : hasEmergencySurvivalExpense
      ? toNumber(survivalExpenseValueFromFund)
      : toNumber(survivalExpense);
  const emergencyWallpaper = firstValue(emergencyFund, ["wallpaper", "background", "image"], "") || "";
  const emergencyWallpaperOpacity = clampOpacity(firstValue(emergencyFund, ["wallpaperOpacity", "wallpaper_opacity", "backgroundOpacity"], 0.3));

  const safeWallets = useMemo(() => (Array.isArray(wallets) ? wallets.map(normalizeWallet).filter((wallet) => wallet.id && !wallet.deletedAt && !wallet.deleted_at) : []), [wallets]);
  const incomeRows = useMemo(() => [...(Array.isArray(walletTransactions) ? walletTransactions : []), ...(Array.isArray(incomes) ? incomes : [])], [walletTransactions, incomes]);
  const linkedWallet = useMemo(() => safeWallets.find((wallet) => wallet.id === linkedWalletIdFromFund) || safeWallets.find((wallet) => linkedWalletNameFromFund && wallet.name === linkedWalletNameFromFund) || null, [safeWallets, linkedWalletIdFromFund, linkedWalletNameFromFund]);
  const hasWallets = safeWallets.length > 0;
  const hasStoredEmergencyMoney = storedSavedAmount > 0;
  const hasLinkedWalletReference = Boolean(linkedWalletIdFromFund || linkedWalletNameFromFund);
  const sourceWalletMissing = hasStoredEmergencyMoney && (!hasWallets || !linkedWallet || !hasLinkedWalletReference);
  const needsWallet = !hasWallets;
  const effectiveSavedAmount = sourceWalletMissing ? 0 : storedSavedAmount;

  const isExpanded = Boolean(expanded);
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetMonths, setTargetMonths] = useState(VALID_TARGET_MONTHS.includes(emergencyTargetMonths) ? emergencyTargetMonths : 3);
  const [wallpaper, setWallpaper] = useState(emergencyWallpaper);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(emergencyWallpaperOpacity);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [draftWallpaper, setDraftWallpaper] = useState("");
  const [draftOpacity, setDraftOpacity] = useState(0.3);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpWalletId, setTopUpWalletId] = useState("");
  const [topUpError, setTopUpError] = useState("");
  const [saving, setSaving] = useState(false);

  const hasPrompted = useRef(false);
  const autoPromptTimeoutRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const orbTapTimeoutRef = useRef(null);
  const orbTapCountRef = useRef(0);

  useEffect(() => {
    setTargetMonths(VALID_TARGET_MONTHS.includes(emergencyTargetMonths) ? emergencyTargetMonths : 3);
    setWallpaper(emergencyWallpaper);
    setWallpaperOpacity(emergencyWallpaperOpacity);
  }, [emergencyTargetMonths, emergencyWallpaper, emergencyWallpaperOpacity]);

  useEffect(() => {
    if (!topUpWalletId && linkedWallet?.id) setTopUpWalletId(linkedWallet.id);
    else if (!topUpWalletId && safeWallets.length) setTopUpWalletId(safeWallets[0].id);
  }, [topUpWalletId, linkedWallet, safeWallets]);

  useEffect(() => () => {
    if (autoPromptTimeoutRef.current) window.clearTimeout(autoPromptTimeoutRef.current);
    if (longPressTimeoutRef.current) window.clearTimeout(longPressTimeoutRef.current);
    if (orbTapTimeoutRef.current) window.clearTimeout(orbTapTimeoutRef.current);
  }, []);

  const effectiveExpense = hasEmergencyFundReset ? 0 : emergencySurvivalExpense;
  const safeMoneyLeft = effectiveSavedAmount;
  const linkedWalletId = linkedWallet?.id || linkedWalletIdFromFund || "";
  const rawLinkedWalletName = linkedWallet?.name || linkedWalletNameFromFund || "";
  const linkedWalletName = rawLinkedWalletName || "Not linked yet";
  const hasLinkedWalletSelection = Boolean(linkedWalletId || rawLinkedWalletName);
  const isEmergencyFundConfigured = effectiveExpense > 0 && targetMonths > 0 && hasLinkedWalletSelection && !hasEmergencyFundReset;
  const isEmergencyFundUnconfigured = hasEmergencyFundReset || effectiveExpense <= 0 || !hasLinkedWalletSelection;
  const target = useMemo(() => (sourceWalletMissing || isEmergencyFundUnconfigured ? 0 : effectiveExpense * targetMonths), [effectiveExpense, targetMonths, sourceWalletMissing, isEmergencyFundUnconfigured]);
  const months = useMemo(() => (sourceWalletMissing || effectiveExpense <= 0 || isEmergencyFundUnconfigured ? 0 : safeMoneyLeft / effectiveExpense), [safeMoneyLeft, effectiveExpense, sourceWalletMissing, isEmergencyFundUnconfigured]);
  const pct = useMemo(() => (sourceWalletMissing || target <= 0 || isEmergencyFundUnconfigured ? 0 : Math.min((safeMoneyLeft / target) * 100, 100)), [safeMoneyLeft, target, sourceWalletMissing, isEmergencyFundUnconfigured]);
  const amountNeeded = Math.max(target - safeMoneyLeft, 0);
  const emergencyAdvisor = useMemo(() => buildEmergencyAdvisor({ incomeRows, effectiveExpense, amountNeeded, targetMonths }), [incomeRows, effectiveExpense, amountNeeded, targetMonths]);

  const selectedWallet = useMemo(() => safeWallets.find((wallet) => wallet.id === topUpWalletId), [topUpWalletId, safeWallets]);
  const selectedWalletBalance = walletBalance(selectedWallet);
  const selectedWalletIsLinked = Boolean(selectedWallet?.id && selectedWallet.id === (linkedWallet?.id || linkedWalletIdFromFund));
  const selectedWalletProtected = selectedWalletIsLinked ? storedSavedAmount : toNumber(selectedWallet?.emergencyProtectedAmount ?? selectedWallet?.emergency_protected_amount);
  const selectedWalletSpendableBalance = Math.max(selectedWalletBalance - Math.min(selectedWalletProtected, selectedWalletBalance), 0);

  const rawStatus = getStatus(months, targetMonths);
  const status = sourceWalletMissing
    ? {
        label: needsWallet ? "Needs wallet" : "Source missing",
        text: "text-amber-200",
        badge: "bg-amber-400/12 text-amber-100 border border-amber-300/18",
        bar: "from-amber-400 to-orange-300",
        ring: "shadow-[0_0_24px_rgba(251,191,36,0.12)]",
      }
    : rawStatus;
  const progression = sourceWalletMissing ? "Create or link a wallet first." : getProgression(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);
  const themeClasses = getEmergencyThemeClasses(theme);
  const emergencyWarningTitle = sourceWalletMissing ? (needsWallet ? "Create or link a wallet first" : "Source wallet missing") : "";
  const emergencyWarningMessage = sourceWalletMissing
    ? needsWallet
      ? "Old Emergency Fund data exists, but no wallet is available to hold it. Create a wallet first before CLARA counts it."
      : "Old Emergency Fund data exists, but its source wallet is missing. Relink it to an existing wallet before CLARA counts it."
    : "";

  useEffect(() => {
    if (autoPromptTimeoutRef.current) {
      window.clearTimeout(autoPromptTimeoutRef.current);
      autoPromptTimeoutRef.current = null;
    }
    if (!canAutoPrompt || hasPrompted.current) return;
    if (isEmergencyFundUnconfigured) {
      hasPrompted.current = true;
      return;
    }
    if (hasSurvivalSetup || effectiveExpense > 0) {
      hasPrompted.current = true;
      return;
    }
    autoPromptTimeoutRef.current = window.setTimeout(() => {
      if (hasPrompted.current) return;
      setShowModal(true);
      hasPrompted.current = true;
      autoPromptTimeoutRef.current = null;
    }, 350);
  }, [canAutoPrompt, hasSurvivalSetup, effectiveExpense, isEmergencyFundUnconfigured]);

  const persistEmergencyFund = async (patch) => {
    if (typeof updateEmergencyFund !== "function") return;
    setSaving(true);
    try {
      await updateEmergencyFund({ ...(emergencyFund || {}), ...patch });
      await refreshData?.();
    } finally {
      setSaving(false);
    }
  };

  const handleSaved = async (val) => {
    const num = toNumber(val);
    const nextTarget = num * targetMonths;
    setEditing(false);
    setShowModal(false);
    hasPrompted.current = true;
    await persistEmergencyFund({
      survivalExpense: num,
      survival_expense: num,
      monthlyExpense: num,
      monthly_expense: num,
      monthly_survival_expense: num,
      targetAmount: nextTarget,
      target_amount: nextTarget,
      target: nextTarget,
      targetMonths,
      target_months: targetMonths,
      months_target: targetMonths,
      resetAt: null,
      reset_at: null,
    });
    onSurvivalSaved?.(num);
  };

  const handleSetupComplete = async ({ monthlySurvivalCost, walletId, walletName: nextWalletName, targetMonths: nextTargetMonths } = {}) => {
    const num = toNumber(monthlySurvivalCost);
    const safeTargetMonths = VALID_TARGET_MONTHS.includes(toNumber(nextTargetMonths)) ? toNumber(nextTargetMonths) : 3;
    const safeWalletId = String(walletId || "").trim();
    const walletFromList = safeWallets.find((wallet) => wallet.id === safeWalletId);
    const safeWalletName = String(nextWalletName || walletFromList?.name || "").trim();

    if (num <= 0) throw new Error("Emergency Fund setup needs a monthly survival cost greater than 0.");
    if (!safeWalletId || !safeWalletName) throw new Error("Emergency Fund setup needs a linked wallet.");

    const nextTarget = num * safeTargetMonths;
    const now = new Date().toISOString();

    setTargetMonths(safeTargetMonths);
    setTopUpWalletId(safeWalletId);
    setEditing(false);
    setShowModal(false);
    hasPrompted.current = true;

    await persistEmergencyFund({
      survivalExpense: num,
      survival_expense: num,
      monthlyExpense: num,
      monthly_expense: num,
      monthly_survival_expense: num,

      targetAmount: nextTarget,
      target_amount: nextTarget,
      target: nextTarget,

      targetMonths: safeTargetMonths,
      target_months: safeTargetMonths,
      months_target: safeTargetMonths,

      linkedWalletId: safeWalletId,
      linked_wallet_id: safeWalletId,
      linkedWalletName: safeWalletName,
      linked_wallet_name: safeWalletName,

      reserveWalletId: safeWalletId,
      reserve_wallet_id: safeWalletId,
      reserveWalletName: safeWalletName,
      reserve_wallet_name: safeWalletName,

      sourceWalletId: safeWalletId,
      source_wallet_id: safeWalletId,
      sourceWalletName: safeWalletName,
      source_wallet_name: safeWalletName,

      resetAt: null,
      reset_at: null,
      updatedAt: now,
      updated_at: now,
    });

    onSurvivalSaved?.(num);
  };

  const changeTargetMonths = async (next) => {
    if (!VALID_TARGET_MONTHS.includes(next)) return;
    setTargetMonths(next);
    const nextTarget = isEmergencyFundUnconfigured ? 0 : effectiveExpense * next;
    await persistEmergencyFund({ targetMonths: next, target_months: next, months_target: next, targetAmount: nextTarget, target_amount: nextTarget, target: nextTarget });
  };

  const clearOrbTapTimer = () => {
    if (orbTapTimeoutRef.current) {
      window.clearTimeout(orbTapTimeoutRef.current);
      orbTapTimeoutRef.current = null;
    }
  };
  const resetOrbTapState = () => {
    orbTapCountRef.current = 0;
    clearOrbTapTimer();
  };
  const openQuickExpense = () => {
    resetOrbTapState();
    if (typeof onQuickExpense === "function") return onQuickExpense();
    window.dispatchEvent(new CustomEvent("clara:open-manual-expense"));
  };
  const openQuickAI = () => {
    resetOrbTapState();
    if (typeof onQuickAI === "function") return onQuickAI();
    window.dispatchEvent(new CustomEvent("clara:open-ai-chat"));
  };
  const openAnalytics = (event) => {
    resetOrbTapState();
    storeAnalyticsTransitionOrigin(event?.currentTarget || event?.target || null);
    navigate("/analytics");
  };
  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };
  const handleOrbPointerDown = () => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimeoutRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      openQuickAI();
      clearLongPressTimer();
    }, ORB_LONG_PRESS_MS);
  };
  const handleOrbPointerUp = () => clearLongPressTimer();
  const handleOrbPointerCancel = () => {
    clearLongPressTimer();
    resetOrbTapState();
  };
  const handleOrbClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      resetOrbTapState();
      return;
    }
    orbTapCountRef.current += 1;
    if (orbTapCountRef.current >= 2) {
      clearOrbTapTimer();
      openAnalytics(event);
      return;
    }
    clearOrbTapTimer();
    orbTapTimeoutRef.current = window.setTimeout(() => openQuickExpense(), ORB_DOUBLE_TAP_DELAY_MS);
  };

  const resolvedWallpaperOpacity = clampOpacity(wallpaperOpacity);
  const openWallpaperModal = () => {
    setDraftWallpaper(wallpaper || "");
    setDraftOpacity(clampOpacity(wallpaperOpacity));
    setShowWallpaperModal(true);
  };
  const handleWallpaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && setDraftWallpaper(reader.result);
    reader.readAsDataURL(file);
  };
  const handleWallpaperSave = async () => {
    const safeOpacity = clampOpacity(draftOpacity);
    setWallpaper(draftWallpaper || "");
    setWallpaperOpacity(safeOpacity);
    await persistEmergencyFund({ wallpaper: draftWallpaper || "", background: draftWallpaper || "", image: draftWallpaper || "", wallpaperOpacity: safeOpacity, wallpaper_opacity: safeOpacity, backgroundOpacity: safeOpacity });
    setShowWallpaperModal(false);
  };
  const handleWallpaperRemove = () => {
    setDraftWallpaper("");
    setDraftOpacity(0.3);
  };

  const openTopUpModal = async () => {
    setTopUpAmount("");
    setTopUpError("");
    if (!safeWallets.length) {
      setTopUpError("Create or link a wallet first.");
      setShowTopUpModal(true);
      return;
    }
    if (linkedWalletId && linkedWallet) setTopUpWalletId(linkedWalletId);
    if (!safeWallets.length) await refreshData?.();
    setShowTopUpModal(true);
  };

  const handleTopUpSave = async () => {
    const amount = toNumber(topUpAmount);
    if (!hasWallets) return setTopUpError("Create or link a wallet first.");
    if (amount <= 0) return setTopUpError("Enter a valid amount.");
    if (!topUpWalletId) return setTopUpError("Choose one source wallet first.");
    if (!selectedWallet) return setTopUpError("This source wallet was not found. Refresh and try again.");
    if (storedSavedAmount > 0 && linkedWalletId && linkedWallet && topUpWalletId !== linkedWalletId) return setTopUpError(`Emergency Fund is already protected inside ${linkedWalletName}. Use that wallet or reset first.`);
    if (sourceWalletMissing && storedSavedAmount > 0) return setTopUpError("Old Emergency Fund data is not linked to this wallet. Reset or relink before adding more.");
    if (selectedWalletSpendableBalance < amount) return setTopUpError("This wallet does not have enough spendable balance after protected money.");
    if (typeof updateEmergencyFund !== "function") return setTopUpError("Emergency protection is not ready yet. Try again after refresh.");

    const nextSavedAmount = safeMoneyLeft + amount;
    const now = new Date().toISOString();
    const reserveWalletName = walletName(selectedWallet);
    const activityId = `emergency_allocation_${Date.now()}`;
    const nextActivity = [
      {
        id: activityId,
        type: "allocation",
        amount,
        reason: "Emergency Fund Allocation",
        title: "Emergency Fund Allocation",
        note: `Protected inside ${reserveWalletName}`,
        sourceWalletId: topUpWalletId,
        source_wallet_id: topUpWalletId,
        sourceWalletName: reserveWalletName,
        source_wallet_name: reserveWalletName,
        balanceBefore: safeMoneyLeft,
        balanceAfter: nextSavedAmount,
        createdAt: now,
        created_at: now,
      },
      ...getEmergencyActivityLog(emergencyFund),
    ].slice(0, 60);

    setSaving(true);
    try {
      await insertWalletTransaction(localUserId, {
        id: activityId,
        wallet_id: topUpWalletId,
        walletId: topUpWalletId,
        amount,
        type: "emergency_reserve_allocation",
        category: "Emergency Fund",
        source_type: "emergency_fund_allocation",
        sourceType: "emergency_fund_allocation",
        tag: "protected_reserve",
        notes: `Protected ${fmt(amount)} inside ${reserveWalletName} as Emergency Fund. Wallet total was not changed.`,
        note: `Protected inside ${reserveWalletName}`,
        emergency_fund_transaction_id: activityId,
        emergencyFundTransactionId: activityId,
        emergency_fund_id: emergencyFund?.id || `emergency_fund:${localUserId}`,
        emergencyFundId: emergencyFund?.id || `emergency_fund:${localUserId}`,
        created_at: now,
        createdAt: now,
        updated_at: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local_only",
        source: "local",
      });

      await updateEmergencyFund({
        ...(emergencyFund || {}),
        savedAmount: nextSavedAmount,
        saved_amount: nextSavedAmount,
        currentAmount: nextSavedAmount,
        current_amount: nextSavedAmount,
        amount: nextSavedAmount,
        balance: nextSavedAmount,
        moneyLeft: nextSavedAmount,
        protectedBalance: nextSavedAmount,
        protected_balance: nextSavedAmount,
        reserveBalance: nextSavedAmount,
        reserve_balance: nextSavedAmount,
        targetAmount: target,
        target_amount: target,
        target,
        linkedWalletId: topUpWalletId,
        linked_wallet_id: topUpWalletId,
        linkedWalletName: reserveWalletName,
        linked_wallet_name: reserveWalletName,
        reserveWalletId: topUpWalletId,
        reserve_wallet_id: topUpWalletId,
        reserveWalletName,
        reserve_wallet_name: reserveWalletName,
        emergencyActivityLog: nextActivity,
        emergency_activity_log: nextActivity,
        activityLog: nextActivity,
        activity_log: nextActivity,
        lastTopUpAmount: amount,
        last_top_up_amount: amount,
        lastTopUpWalletId: topUpWalletId,
        last_top_up_wallet_id: topUpWalletId,
        lastReserveAllocationAt: now,
        last_reserve_allocation_at: now,
        updatedAt: now,
        updated_at: now,
      });

      await refreshData?.();
      setShowTopUpModal(false);
      setTopUpAmount("");
      setTopUpError("");
    } catch (error) {
      console.error("Unable to protect emergency fund allocation:", error);
      setTopUpError("CLARA could not protect this amount yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return {
    state: { isExpanded, editing, showModal, targetMonths, wallpaper, wallpaperOpacity, showWallpaperModal, draftWallpaper, draftOpacity, showTopUpModal, topUpAmount, topUpWalletId, topUpError, saving },
    computed: { safeWallets, effectiveExpense, safeMoneyLeft, storedSavedAmount, effectiveSavedAmount, sourceWalletMissing, needsWallet, emergencyWarningTitle, emergencyWarningMessage, target, months, pct, selectedWallet, selectedWalletBalance, selectedWalletSpendableBalance, linkedWallet, linkedWalletId, linkedWalletName, hasEmergencyFundReset, isEmergencyFundConfigured, isEmergencyFundUnconfigured, status, progression, milestone, themeClasses, resolvedWallpaperOpacity, retentionRate, emergencyAdvisor, validTargetMonths: VALID_TARGET_MONTHS },
    handlers: { setEditing, setShowModal, setShowWallpaperModal, setDraftWallpaper, setDraftOpacity, setShowTopUpModal, setTopUpAmount, setTopUpWalletId, setTopUpError, handleSaved, handleSetupComplete, changeTargetMonths, handleOrbPointerDown, handleOrbPointerUp, handleOrbPointerCancel, handleOrbClick, openWallpaperModal, handleWallpaperUpload, handleWallpaperSave, handleWallpaperRemove, openTopUpModal, handleTopUpSave },
    refs: { hasPrompted, autoPromptTimeoutRef, longPressTimeoutRef, longPressTriggeredRef, orbTapTimeoutRef, orbTapCountRef },
  };
}
