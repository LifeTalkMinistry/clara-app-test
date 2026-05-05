import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const MOTION_TRANSITION_KEY = "clara_motion_transition_origin";
const TRANSACTION_TRANSITION_KEY = "clara_transactions_transition_origin";
const MOTION_TARGET_KEY = "clara_motion_target_path";

export function clampOpacity(value) {
  return Math.max(0, Math.min(Number(value) || 0.3, 0.5));
}

function getEmergencyValue(emergencyFund, keys, fallback = 0) {
  for (const key of keys) {
    const value = emergencyFund?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function storeAnalyticsTransitionOrigin(element) {
  if (!element || typeof window === "undefined") return;

  try {
    const card = element.closest?.("[data-emergency-card]") || element;
    const rect = card.getBoundingClientRect();

    const payload = JSON.stringify({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });

    sessionStorage.setItem(MOTION_TRANSITION_KEY, payload);
    sessionStorage.setItem(TRANSACTION_TRANSITION_KEY, payload);
    sessionStorage.setItem(MOTION_TARGET_KEY, "/analytics");
  } catch (error) {
    console.warn("Unable to store analytics transition origin:", error);
  }
}

export function getStatus(months, targetMonths) {
  if (months >= targetMonths) {
    return {
      label: "Secure",
      text: "text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 to-green-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 to-green-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (months >= targetMonths * 0.33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "from-amber-400 to-yellow-300",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.16)]",
    };
  }

  return {
    label: "At Risk",
    text: "text-rose-300",
    badge: "bg-rose-500/15 text-rose-300 border border-rose-400/25",
    bar: "from-rose-400 to-pink-300",
    ring: "shadow-[0_0_24px_rgba(244,63,94,0.16)]",
  };
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
    glass: isLight
      ? "border-slate-300/45 bg-white/70 text-slate-800"
      : "border-white/10 bg-black/15 text-white/85",
    iconShell: isLight
      ? "border-cyan-300/40 bg-cyan-500/10 shadow-[0_0_18px_rgba(14,165,233,0.10)]"
      : "border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
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

  const { emergencyFund, wallets = [], updateEmergencyFund, refreshData } = useFinancialData();
  const safeWallets = Array.isArray(wallets) ? wallets : [];

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
  const emergencySavedAmount = Number(getEmergencyValue(emergencyFund, ["savedAmount", "saved_amount", "amount", "balance", "moneyLeft"], moneyLeft));
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
  const safeMoneyLeft = Number(emergencySavedAmount) || Number(moneyLeft) || 0;

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

  const selectedWallet = useMemo(() => safeWallets.find((wallet) => String(wallet?.id || wallet?.wallet_id || "") === String(topUpWalletId)), [topUpWalletId, safeWallets]);
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

    await persistEmergencyFund({
      survivalExpense: num,
      survival_expense: num,
      monthlyExpense: num,
      monthly_expense: num,
    });

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

    await persistEmergencyFund({
      wallpaper: draftWallpaper || "",
      background: draftWallpaper || "",
      image: draftWallpaper || "",
      wallpaperOpacity: safeOpacity,
      wallpaper_opacity: safeOpacity,
      backgroundOpacity: safeOpacity,
    });

    setShowWallpaperModal(false);
  };

  const handleWallpaperRemove = () => {
    setDraftWallpaper("");
    setDraftOpacity(0.3);
  };

  const openTopUpModal = () => {
    setTopUpAmount("");
    setTopUpError("");
    setShowTopUpModal(true);
  };

  const handleTopUpSave = async () => {
    const amount = Number(topUpAmount);

    if (!amount || amount <= 0) {
      setTopUpError("Enter a valid amount.");
      return;
    }

    if (!topUpWalletId) {
      setTopUpError("Choose a wallet first.");
      return;
    }

    if (selectedWalletBalance < amount) {
      setTopUpError("This wallet does not have enough balance.");
      return;
    }

    const nextSavedAmount = safeMoneyLeft + amount;
    const now = new Date().toISOString();

    await persistEmergencyFund({
      savedAmount: nextSavedAmount,
      saved_amount: nextSavedAmount,
      amount: nextSavedAmount,
      balance: nextSavedAmount,
      moneyLeft: nextSavedAmount,
      lastTopUpAmount: amount,
      last_top_up_amount: amount,
      lastTopUpWalletId: topUpWalletId,
      last_top_up_wallet_id: topUpWalletId,
      updatedAt: now,
      updated_at: now,
    });

    setShowTopUpModal(false);
    setTopUpAmount("");
    setTopUpError("");
  };

  return {
    state: {
      isExpanded,
      editing,
      showModal,
      targetMonths,
      wallpaper,
      wallpaperOpacity,
      showWallpaperModal,
      draftWallpaper,
      draftOpacity,
      showTopUpModal,
      topUpAmount,
      topUpWalletId,
      topUpError,
      saving,
    },
    computed: {
      safeWallets,
      effectiveExpense,
      safeMoneyLeft,
      target,
      months,
      pct,
      selectedWallet,
      selectedWalletBalance,
      status,
      progression,
      milestone,
      themeClasses,
      resolvedWallpaperOpacity,
      retentionRate,
      validTargetMonths: VALID_TARGET_MONTHS,
    },
    handlers: {
      setEditing,
      setShowModal,
      setShowWallpaperModal,
      setDraftWallpaper,
      setDraftOpacity,
      setShowTopUpModal,
      setTopUpAmount,
      setTopUpWalletId,
      setTopUpError,
      handleSaved,
      changeTargetMonths,
      handleOrbPointerDown,
      handleOrbPointerUp,
      handleOrbPointerCancel,
      handleOrbClick,
      openWallpaperModal,
      handleWallpaperUpload,
      handleWallpaperSave,
      handleWallpaperRemove,
      openTopUpModal,
      handleTopUpSave,
    },
    refs: {
      hasPrompted,
      autoPromptTimeoutRef,
      longPressTimeoutRef,
      longPressTriggeredRef,
      orbTapTimeoutRef,
      orbTapCountRef,
    },
  };
}
