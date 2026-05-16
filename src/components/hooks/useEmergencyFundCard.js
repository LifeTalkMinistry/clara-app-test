import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import useFinancialData from "../../hooks/useFinancialData";

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
    const cleaned = value.replace(/[₱,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEmergencyValue(emergencyFund, keys, fallback = 0) {
  for (const key of keys) {
    const value = emergencyFund?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function getRecordDate(row) {
  const value = row?.createdAt || row?.created_at || row?.created_date || row?.date || row?.transaction_date || row?.updatedAt || row?.updated_at;
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isIncomeRecord(row) {
  const type = String(row?.type || row?.transaction_type || "").trim().toLowerCase();
  const category = String(row?.category || row?.category_name || "").trim().toLowerCase();
  const sourceType = String(row?.source_type || row?.sourceType || "").trim().toLowerCase();
  return INCOME_TYPES.has(type) || INCOME_TYPES.has(sourceType) || category.includes("income") || category.includes("salary") || sourceType.includes("salary");
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

function normalizeWallet(wallet = {}) {
  const id = String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.uuid || "");
  const balance = toNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.amount ??
      wallet?.wallet_balance ??
      wallet?.money ??
      0
  );

  return {
    ...wallet,
    id,
    wallet_id: id,
    name:
      wallet?.name ||
      wallet?.title ||
      wallet?.wallet_name ||
      wallet?.label ||
      "Wallet",
    balance,
  };
}

function buildEmergencyAdvisor({ incomeRows = [], effectiveExpense = 0, amountNeeded = 0, targetMonths = 3 } = {}) {
  const now = Date.now();
  const startTime = now - INCOME_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const buckets = new Map();
  let total = 0;
  let count = 0;

  (Array.isArray(incomeRows) ? incomeRows : []).forEach((row) => {
    if (!row || row.deletedAt || row.deleted_at) return;
    if (!isIncomeRecord(row)) return;

    const amount = toNumber(row.amount ?? row.value ?? row.total ?? row.income_amount);
    if (amount <= 0) return;

    const date = getRecordDate(row);
    if (!date || date.getTime() < startTime || date.getTime() > now) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) || 0) + amount);
    total += amount;
    count += 1;
  });

  const monthlyValues = Array.from(buckets.values()).filter((value) => value > 0);
  const activeMonths = monthlyValues.length;
  const averageMonthlyIncome = total > 0 ? total / Math.min(3, Math.max(activeMonths, 1)) : 0;
  const deviation = standardDeviation(monthlyValues);
  const variationRatio = averageMonthlyIncome > 0 ? deviation / averageMonthlyIncome : 0;
  const stability =
    count < 2 || averageMonthlyIncome <= 0
      ? "unknown"
      : variationRatio <= 0.25
        ? "stable"
        : variationRatio <= 0.55
          ? "mixed"
          : "irregular";

  const rate = stability === "stable" ? 0.15 : stability === "mixed" ? 0.1 : stability === "irregular" ? 0.07 : 0.05;
  const monthlyRoomAfterSurvival = Math.max(averageMonthlyIncome - toNumber(effectiveExpense), 0);
  const incomeBased = averageMonthlyIncome * rate;
  const pressureBased = monthlyRoomAfterSurvival * 0.35;
  const conservative = Math.min(incomeBased, pressureBased > 0 ? pressureBased : incomeBased);
  const recommendedMonthlyAmount = Math.min(Math.max(toNumber(amountNeeded), 0), roundFriendly(conservative));
  const estimatedMonthsToTarget = recommendedMonthlyAmount > 0 && amountNeeded > 0 ? Math.ceil(amountNeeded / recommendedMonthlyAmount) : 0;

  let tone = "CLARA needs more income history before giving a precise pace.";
  if (stability === "stable") tone = "Your income pattern looks stable enough for a consistent protection pace.";
  if (stability === "mixed") tone = "Your income pattern moves a bit, so CLARA is keeping this pace flexible.";
  if (stability === "irregular") tone = "Your income changes often, so CLARA is choosing a gentler protection pace.";

  return {
    lookbackDays: INCOME_LOOKBACK_DAYS,
    incomeEntryCount: count,
    activeIncomeMonths: activeMonths,
    averageMonthlyIncome,
    monthlyIncomeValues: monthlyValues,
    stability,
    variationRatio,
    monthlyRoomAfterSurvival,
    recommendedMonthlyAmount,
    estimatedMonthsToTarget,
    selectedTargetMonths: targetMonths,
    hasIncomeSignal: averageMonthlyIncome > 0 && count > 0,
    tone,
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
  if (months >= targetMonths) {
    return { label: "Secure", text: "text-emerald-300", badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25", bar: "from-emerald-400 to-green-300", ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]" };
  }
  if (months >= targetMonths * 0.66) {
    return { label: "Stable", text: "text-emerald-300", badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25", bar: "from-emerald-400 to-green-300", ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]" };
  }
  if (months >= targetMonths * 0.33) {
    return { label: "Building", text: "text-amber-300", badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25", bar: "from-amber-400 to-yellow-300", ring: "shadow-[0_0_24px_rgba(251,191,36,0.16)]" };
  }
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
  const {
    emergencyFund,
    wallets = [],
    walletTransactions = [],
    incomes = [],
    updateEmergencyFund,
    updateWallet,
    refreshData,
  } = useFinancialData(user);

  const safeWallets = useMemo(
    () => (Array.isArray(wallets) ? wallets.map(normalizeWallet).filter((wallet) => wallet.id && !wallet.deletedAt && !wallet.deleted_at) : []),
    [wallets]
  );
  const incomeRows = useMemo(
    () => [
      ...(Array.isArray(walletTransactions) ? walletTransactions : []),
      ...(Array.isArray(incomes) ? incomes : []),
    ],
    [walletTransactions, incomes]
  );

  const isExpanded = Boolean(expanded);
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetMonths, setTargetMonths] = useState(3);
  const [wallpaper, setWallpaper] = useState("");
  const [wallpaperOpacity, setWallpaperOpacity] = useState(0.3);
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

  const emergencyTargetMonths = Number(getEmergencyValue(emergencyFund, ["targetMonths", "target_months", "months_target"], 3));
  const emergencySavedAmount = Number(getEmergencyValue(emergencyFund, ["protectedBalance", "protected_balance", "reserveBalance", "reserve_balance", "savedAmount", "saved_amount", "amount", "balance", "moneyLeft"], 0));
  const emergencySurvivalExpense = Number(getEmergencyValue(emergencyFund, ["survivalExpense", "survival_expense", "monthlyExpense", "monthly_expense"], survivalExpense));
  const emergencyWallpaper = getEmergencyValue(emergencyFund, ["wallpaper", "background", "image"], "") || "";
  const emergencyWallpaperOpacity = clampOpacity(getEmergencyValue(emergencyFund, ["wallpaperOpacity", "wallpaper_opacity", "backgroundOpacity"], 0.3));

  useEffect(() => {
    setTargetMonths(VALID_TARGET_MONTHS.includes(emergencyTargetMonths) ? emergencyTargetMonths : 3);
    setWallpaper(emergencyWallpaper);
    setWallpaperOpacity(emergencyWallpaperOpacity);
  }, [emergencyTargetMonths, emergencyWallpaper, emergencyWallpaperOpacity]);

  useEffect(() => {
    if (!topUpWalletId && safeWallets.length > 0) {
      setTopUpWalletId(String(safeWallets[0]?.id || safeWallets[0]?.wallet_id || ""));
    }
  }, [topUpWalletId, safeWallets]);

  useEffect(() => {
    return () => {
      if (autoPromptTimeoutRef.current) window.clearTimeout(autoPromptTimeoutRef.current);
      if (longPressTimeoutRef.current) window.clearTimeout(longPressTimeoutRef.current);
      if (orbTapTimeoutRef.current) window.clearTimeout(orbTapTimeoutRef.current);
    };
  }, []);

  const propExpense = Number(survivalExpense) || 0;
  const effectiveExpense = emergencySurvivalExpense || propExpense;
  const safeMoneyLeft = Number(emergencySavedAmount) || 0;

  useEffect(() => {
    if (autoPromptTimeoutRef.current) {
      window.clearTimeout(autoPromptTimeoutRef.current);
      autoPromptTimeoutRef.current = null;
    }
    if (!canAutoPrompt) return;
    if (hasPrompted.current) return;

    const hasValue = effectiveExpense > 0;
    const alreadySetup = hasSurvivalSetup || hasValue;
    if (alreadySetup) {
      hasPrompted.current = true;
      return;
    }

    autoPromptTimeoutRef.current = window.setTimeout(() => {
      if (hasPrompted.current) return;
      setShowModal(true);
      hasPrompted.current = true;
      autoPromptTimeoutRef.current = null;
    }, 350);

    return () => {
      if (autoPromptTimeoutRef.current) {
        window.clearTimeout(autoPromptTimeoutRef.current);
        autoPromptTimeoutRef.current = null;
      }
    };
  }, [canAutoPrompt, hasSurvivalSetup, effectiveExpense]);

  const target = useMemo(() => effectiveExpense * targetMonths, [effectiveExpense, targetMonths]);
  const months = useMemo(() => (effectiveExpense > 0 ? safeMoneyLeft / effectiveExpense : 0), [safeMoneyLeft, effectiveExpense]);
  const pct = useMemo(() => (target > 0 ? Math.min((safeMoneyLeft / target) * 100, 100) : 0), [safeMoneyLeft, target]);
  const amountNeeded = Math.max(target - safeMoneyLeft, 0);
  const emergencyAdvisor = useMemo(
    () => buildEmergencyAdvisor({ incomeRows, effectiveExpense, amountNeeded, targetMonths }),
    [incomeRows, effectiveExpense, amountNeeded, targetMonths]
  );

  const selectedWallet = useMemo(
    () => safeWallets.find((wallet) => String(wallet?.id || wallet?.wallet_id || "") === String(topUpWalletId)),
    [topUpWalletId, safeWallets]
  );
  const selectedWalletBalance = Number(selectedWallet?.balance ?? selectedWallet?.current_balance ?? selectedWallet?.amount ?? 0);

  const status = getStatus(months, targetMonths);
  const progression = getProgression(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);
  const themeClasses = getEmergencyThemeClasses(theme);

  const persistEmergencyFund = async (patch) => {
    if (typeof updateEmergencyFund !== "function") return;
    setSaving(true);
    try {
      await updateEmergencyFund({ ...(emergencyFund || {}), ...patch });
      if (typeof refreshData === "function") await refreshData();
    } catch (error) {
      console.error("Unable to update emergency fund:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleSaved = async (val) => {
    const num = Number(val) || 0;
    setEditing(false);
    setShowModal(false);
    hasPrompted.current = true;
    await persistEmergencyFund({ survivalExpense: num, survival_expense: num, monthlyExpense: num, monthly_expense: num });
    onSurvivalSaved?.(num);
  };

  const changeTargetMonths = async (next) => {
    if (!VALID_TARGET_MONTHS.includes(next)) return;
    setTargetMonths(next);
    await persistEmergencyFund({ targetMonths: next, target_months: next, months_target: next });
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
    const sourceElement = event?.currentTarget || event?.target || null;
    resetOrbTapState();
    storeAnalyticsTransitionOrigin(sourceElement);
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
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setDraftWallpaper(result);
    };
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
    if (!safeWallets.length && typeof refreshData === "function") {
      try {
        await refreshData();
      } catch (error) {
        console.warn("Unable to refresh wallets before emergency top-up:", error);
      }
    }
    setShowTopUpModal(true);
  };

  const handleTopUpSave = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) {
      setTopUpError("Enter a valid amount.");
      return;
    }
    if (!topUpWalletId) {
      setTopUpError("Choose one source wallet first.");
      return;
    }
    if (!selectedWallet) {
      setTopUpError("This source wallet was not found. Refresh and try again.");
      return;
    }
    if (typeof updateWallet !== "function" || typeof updateEmergencyFund !== "function") {
      setTopUpError("Emergency reserve transfer is not ready yet. Try again after refresh.");
      return;
    }
    if (selectedWalletBalance < amount) {
      setTopUpError("This wallet does not have enough spendable balance.");
      return;
    }

    const nextWalletBalance = Math.max(selectedWalletBalance - amount, 0);
    const nextSavedAmount = safeMoneyLeft + amount;
    const now = new Date().toISOString();
    const reserveWalletName = selectedWallet?.name || selectedWallet?.title || "Wallet";

    setSaving(true);
    try {
      await updateWallet(topUpWalletId, {
        balance: nextWalletBalance,
        current_balance: nextWalletBalance,
        wallet_balance: nextWalletBalance,
        available_balance: nextWalletBalance,
        updatedAt: now,
        updated_at: now,
        lastProtectedReserveAmount: amount,
        last_protected_reserve_amount: amount,
        lastProtectedReserveAt: now,
        last_protected_reserve_at: now,
      });

      await updateEmergencyFund({
        ...(emergencyFund || {}),
        savedAmount: nextSavedAmount,
        saved_amount: nextSavedAmount,
        amount: nextSavedAmount,
        balance: nextSavedAmount,
        moneyLeft: nextSavedAmount,
        protectedBalance: nextSavedAmount,
        protected_balance: nextSavedAmount,
        reserveBalance: nextSavedAmount,
        reserve_balance: nextSavedAmount,
        reserveWalletId: topUpWalletId,
        reserve_wallet_id: topUpWalletId,
        reserveWalletName,
        reserve_wallet_name: reserveWalletName,
        lastTopUpAmount: amount,
        last_top_up_amount: amount,
        lastTopUpWalletId: topUpWalletId,
        last_top_up_wallet_id: topUpWalletId,
        lastReserveTransferAt: now,
        last_reserve_transfer_at: now,
        updatedAt: now,
        updated_at: now,
      });

      if (typeof refreshData === "function") await refreshData();
      setShowTopUpModal(false);
      setTopUpAmount("");
      setTopUpError("");
    } catch (error) {
      console.error("Unable to reserve emergency fund top-up:", error);
      setTopUpError("CLARA could not move this money into protected reserve yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return {
    state: { isExpanded, editing, showModal, targetMonths, wallpaper, wallpaperOpacity, showWallpaperModal, draftWallpaper, draftOpacity, showTopUpModal, topUpAmount, topUpWalletId, topUpError, saving },
    computed: { safeWallets, effectiveExpense, safeMoneyLeft, target, months, pct, selectedWallet, selectedWalletBalance, status, progression, milestone, themeClasses, resolvedWallpaperOpacity, retentionRate, emergencyAdvisor, validTargetMonths: VALID_TARGET_MONTHS },
    handlers: { setEditing, setShowModal, setShowWallpaperModal, setDraftWallpaper, setDraftOpacity, setShowTopUpModal, setTopUpAmount, setTopUpWalletId, setTopUpError, handleSaved, changeTargetMonths, handleOrbPointerDown, handleOrbPointerUp, handleOrbPointerCancel, handleOrbClick, openWallpaperModal, handleWallpaperUpload, handleWallpaperSave, handleWallpaperRemove, openTopUpModal, handleTopUpSave },
    refs: { hasPrompted, autoPromptTimeoutRef, longPressTimeoutRef, longPressTriggeredRef, orbTapTimeoutRef, orbTapCountRef },
  };
}
