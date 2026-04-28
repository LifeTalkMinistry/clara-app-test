import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Edit2,
  Camera,
  X,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
} from "lucide-react";

import SurvivalExpenseModal from "./SurvivalExpenseModal";
import useFinancialData from "../hooks/useFinancialData";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n) || 0);

const MILESTONES = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

const VALID_TARGET_MONTHS = [3, 6, 12];
const ORB_LONG_PRESS_MS = 520;
const ORB_DOUBLE_TAP_DELAY_MS = 340;

const MOTION_TRANSITION_KEY = "clara_motion_transition_origin";
const TRANSACTION_TRANSITION_KEY = "clara_transactions_transition_origin";
const MOTION_TARGET_KEY = "clara_motion_target_path";

function clampOpacity(value) {
  return Math.max(0, Math.min(Number(value) || 0.3, 0.5));
}

function getEmergencyValue(emergencyFund, keys, fallback = 0) {
  for (const key of keys) {
    const value = emergencyFund?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
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

function getStatus(months, targetMonths) {
  if (months >= targetMonths) {
    return {
      label: "Secure",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 to-green-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
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

function getProgression(months, targetMonths) {
  if (months >= targetMonths && targetMonths === 3) {
    return "You're safe. Now push to 6 months.";
  }

  if (months >= targetMonths && targetMonths === 6) {
    return "Strong position. Aim for full protection (12 months).";
  }

  if (months >= targetMonths) {
    return "You are financially protected. Maintain this discipline.";
  }

  if (months >= targetMonths * 0.66) {
    return "You're close. Stay consistent and finish this.";
  }

  if (months >= targetMonths * 0.33) {
    return "Good start. Build momentum.";
  }

  return "Start building your protection today.";
}

function getEmergencyThemeClasses(theme) {
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
    background:
      theme?.tokens?.gradientEmergency || "var(--theme-gradient-emergency)",
    outline: theme?.tokens?.border || "var(--theme-border)",
  };
}

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
  theme = null,
  onQuickExpense,
  onQuickAI,
}) {
  const navigate = useNavigate();

  const {
    emergencyFund,
    wallets = [],
    updateEmergencyFund,
    refreshData,
  } = useFinancialData();

  const safeWallets = Array.isArray(wallets) ? wallets : [];

  const [expanded, setExpanded] = useState(false);
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

  const emergencyTargetMonths = Number(
    getEmergencyValue(
      emergencyFund,
      ["targetMonths", "target_months", "months_target"],
      3
    )
  );

  const emergencySavedAmount = Number(
    getEmergencyValue(
      emergencyFund,
      ["savedAmount", "saved_amount", "amount", "balance", "moneyLeft"],
      moneyLeft
    )
  );

  const emergencySurvivalExpense = Number(
    getEmergencyValue(
      emergencyFund,
      [
        "survivalExpense",
        "survival_expense",
        "monthlyExpense",
        "monthly_expense",
      ],
      survivalExpense
    )
  );

  const emergencyWallpaper =
    getEmergencyValue(emergencyFund, ["wallpaper", "background", "image"], "") ||
    "";

  const emergencyWallpaperOpacity = clampOpacity(
    getEmergencyValue(
      emergencyFund,
      ["wallpaperOpacity", "wallpaper_opacity", "backgroundOpacity"],
      0.3
    )
  );

  useEffect(() => {
    if (VALID_TARGET_MONTHS.includes(emergencyTargetMonths)) {
      setTargetMonths(emergencyTargetMonths);
    } else {
      setTargetMonths(3);
    }

    setWallpaper(emergencyWallpaper);
    setWallpaperOpacity(emergencyWallpaperOpacity);
  }, [emergencyTargetMonths, emergencyWallpaper, emergencyWallpaperOpacity]);

  useEffect(() => {
    if (!topUpWalletId && safeWallets.length > 0) {
      setTopUpWalletId(
        String(safeWallets[0]?.id || safeWallets[0]?.wallet_id || "")
      );
    }
  }, [topUpWalletId, safeWallets]);

  useEffect(() => {
    return () => {
      if (autoPromptTimeoutRef.current) {
        window.clearTimeout(autoPromptTimeoutRef.current);
        autoPromptTimeoutRef.current = null;
      }

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (orbTapTimeoutRef.current) {
        window.clearTimeout(orbTapTimeoutRef.current);
        orbTapTimeoutRef.current = null;
      }
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

  const target = useMemo(
    () => effectiveExpense * targetMonths,
    [effectiveExpense, targetMonths]
  );

  const months = useMemo(
    () => (effectiveExpense > 0 ? safeMoneyLeft / effectiveExpense : 0),
    [safeMoneyLeft, effectiveExpense]
  );

  const pct = useMemo(
    () => (target > 0 ? Math.min((safeMoneyLeft / target) * 100, 100) : 0),
    [safeMoneyLeft, target]
  );

  const selectedWallet = useMemo(() => {
    return safeWallets.find((wallet) => {
      const id = String(wallet?.id || wallet?.wallet_id || "");
      return id === String(topUpWalletId);
    });
  }, [topUpWalletId, safeWallets]);

  const selectedWalletBalance = Number(
    selectedWallet?.balance ??
      selectedWallet?.current_balance ??
      selectedWallet?.amount ??
      0
  );

  const status = getStatus(months, targetMonths);
  const progression = getProgression(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);
  const themeClasses = getEmergencyThemeClasses(theme);

  const persistEmergencyFund = async (patch) => {
    if (typeof updateEmergencyFund !== "function") return;

    setSaving(true);

    try {
      await updateEmergencyFund({
        ...(emergencyFund || {}),
        ...patch,
      });

      if (typeof refreshData === "function") {
        await refreshData();
      }
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

    await persistEmergencyFund({
      targetMonths: next,
      target_months: next,
      months_target: next,
    });
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

    if (typeof onQuickExpense === "function") {
      onQuickExpense();
      return;
    }

    window.dispatchEvent(new CustomEvent("clara:open-manual-expense"));
  };

  const openQuickAI = () => {
    resetOrbTapState();

    if (typeof onQuickAI === "function") {
      onQuickAI();
      return;
    }

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

  const handleOrbPointerUp = () => {
    clearLongPressTimer();
  };

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
    orbTapTimeoutRef.current = window.setTimeout(() => {
      openQuickExpense();
    }, ORB_DOUBLE_TAP_DELAY_MS);
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
      if (typeof result === "string") {
        setDraftWallpaper(result);
      }
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
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setShowTopUpModal(false);
    setTopUpAmount("");
    setTopUpError("");
  };

  return (
    <>
      <SurvivalExpenseModal
        open={showModal || editing}
        initialValue={effectiveExpense}
        onSaved={handleSaved}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(false);
            setShowModal(false);
          }
        }}
      />

      {showTopUpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTopUpModal(false)}
          />

          <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className={`text-base font-semibold ${themeClasses.title}`}>
                  Add Emergency Fund
                </p>
                <p className={`mt-0.5 text-xs ${themeClasses.muted}`}>
                  Move money from a wallet into your protection fund
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Source Wallet
                </label>

                <select
                  value={topUpWalletId}
                  onChange={(e) => {
                    setTopUpWalletId(e.target.value);
                    setTopUpError("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-400/40"
                >
                  {safeWallets.map((wallet) => {
                    const id = String(wallet?.id || wallet?.wallet_id || "");
                    const name = wallet?.name || wallet?.title || "Wallet";
                    const balance = Number(
                      wallet?.balance ??
                        wallet?.current_balance ??
                        wallet?.amount ??
                        0
                    );

                    return (
                      <option key={id} value={id} className="bg-slate-950">
                        {name} — {fmt(balance)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  value={topUpAmount}
                  onChange={(e) => {
                    setTopUpAmount(e.target.value);
                    setTopUpError("");
                  }}
                  placeholder="0"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-emerald-400/40"
                />
              </div>

              {topUpError && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200">
                  {topUpError}
                </div>
              )}

              <button
                type="button"
                onClick={handleTopUpSave}
                disabled={saving || safeWallets.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : "Add to Emergency Fund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWallpaperModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWallpaperModal(false)}
          />

          <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className={`text-base font-semibold ${themeClasses.title}`}>
                  Emergency Background
                </p>
                <p className={`mt-0.5 text-xs ${themeClasses.muted}`}>
                  Upload photo and adjust opacity
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div className="relative h-48">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#08111d] via-[#111827] to-[#071520]" />

                  {draftWallpaper ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url("${draftWallpaper}")`,
                        opacity: clampOpacity(draftOpacity),
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.30),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

                  <div className="relative z-10 flex h-full items-end p-4">
                    <div>
                      <p className="text-lg font-bold text-white">
                        Emergency Fund
                      </p>
                      <p className="text-xs text-white/75">
                        Preview of your card background
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10">
                <Upload className="h-4 w-4" />
                <span>{draftWallpaper ? "Change photo" : "Upload photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWallpaperUpload}
                  className="hidden"
                />
              </label>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-white/65">
                    Background Opacity
                  </p>
                  <p className="text-[11px] font-semibold text-white/85">
                    {Math.round((Number(draftOpacity) || 0) * 100)}%
                  </p>
                </div>

                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={draftOpacity}
                  onChange={(e) => setDraftOpacity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleWallpaperRemove}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Remove
                </button>

                <button
                  type="button"
                  onClick={handleWallpaperSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        data-emergency-card="true"
        className={`relative mb-3 overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${themeClasses.border} ${status.ring}`}
        style={{
          borderColor: themeClasses.outline,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: themeClasses.background }}
        />

        {wallpaper ? (
          <div
            className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${wallpaper}")`,
              opacity: resolvedWallpaperOpacity,
            }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.30),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

        <div className="absolute right-4 top-[112px] z-20 sm:right-5 sm:top-[116px]">
          <button
            type="button"
            onPointerDown={handleOrbPointerDown}
            onPointerUp={handleOrbPointerUp}
            onPointerCancel={handleOrbPointerCancel}
            onPointerLeave={handleOrbPointerUp}
            onClick={handleOrbClick}
            className={`relative flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border backdrop-blur-xl transition hover:scale-[1.04] active:scale-95 ${themeClasses.glass}`}
            aria-label="Tap to log expense, double tap to open analytics, long press to open CLARA AI"
            title="Tap: Log expense • Double tap: Analytics • Long press: CLARA AI"
          >
            <span className="absolute inset-[-5px] rounded-full bg-emerald-400/20 blur-md animate-[emergencyOrbPulse_1.8s_ease-in-out_infinite]" />
            <span className="absolute inset-0 rounded-full bg-white/10 animate-[emergencyOrbBeat_1.8s_ease-in-out_infinite]" />
            <Sparkles className="relative z-10 h-4 w-4" />
          </button>
        </div>

        <style>{`
          @keyframes emergencyOrbPulse {
            0%, 100% {
              opacity: 0.35;
              transform: scale(0.96);
            }
            50% {
              opacity: 0.78;
              transform: scale(1.12);
            }
          }

          @keyframes emergencyOrbBeat {
            0%, 100% {
              opacity: 0.45;
              transform: scale(0.98);
            }
            45% {
              opacity: 0.95;
              transform: scale(1.04);
            }
          }
        `}</style>

        <div className="relative z-10 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${themeClasses.iconShell}`}
            >
              <Shield className={`h-4 w-4 ${themeClasses.iconColor}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={`text-base font-semibold tracking-tight ${themeClasses.title}`}
                  >
                    Emergency Fund
                  </p>
                  <p
                    className={`mt-0.5 text-[11px] font-medium ${themeClasses.body}`}
                  >
                    Protection based on your monthly survival expense
                  </p>
                </div>

                <div className="flex shrink-0 items-start">
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3 pr-14">
            {safeMoneyLeft <= 0 ? (
              <p className={`text-2xl font-bold ${themeClasses.title}`}>
                Start your fund
              </p>
            ) : (
              <p
                className={`text-[32px] font-bold leading-none ${status.text}`}
              >
                {months.toFixed(1)}
                <span className="ml-1.5 text-base font-semibold text-white/85">
                  months
                </span>
              </p>
            )}

            <p
              className={`mt-2 max-w-[28rem] text-xs font-medium leading-relaxed ${themeClasses.body}`}
            >
              {progression}
            </p>

            <p className={`text-[11px] mt-1 ${themeClasses.muted}`}>
              Your future stability depends on this.
            </p>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
              <span>Protection progress</span>
              <span>{pct.toFixed(0)}%</span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
              <div
                className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-40" />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
              <span>{fmt(safeMoneyLeft)}</span>
              <span>{fmt(target)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-sm transition hover:bg-white/10 ${themeClasses.glass}`}
          >
            <span className="font-medium">
              {expanded ? "Hide details" : "Show details"}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expanded && (
            <div
              className={`mt-3 space-y-3 rounded-2xl border p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${themeClasses.glass}`}
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">
                    Goal
                  </span>
                  <span className="text-[11px] font-semibold text-white/70">
                    {milestone?.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {VALID_TARGET_MONTHS.map((m) => {
                    const active = targetMonths === m;

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => changeTargetMonths(m)}
                        disabled={saving}
                        className={`relative rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
                          active
                            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="block">{m} Months</span>
                        {active && (
                          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Monthly
                  </p>
                  <p className="text-sm font-bold text-white">
                    {fmt(effectiveExpense)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Available
                  </p>
                  <p className="text-sm font-bold text-white">
                    {fmt(safeMoneyLeft)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Target
                  </p>
                  <p className="text-sm font-bold text-white">{fmt(target)}</p>
                </div>
              </div>

              {retentionRate != null && (
                <div className="flex items-center justify-between text-xs font-medium text-white/75">
                  <span>Retention Rate</span>
                  <span className="text-white/95">{retentionRate}%</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Expense
                </button>

                <button
                  type="button"
                  onClick={openWallpaperModal}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  <Camera className="h-4 w-4" />
                  Background
                </button>
              </div>

              <button
                type="button"
                onClick={openTopUpModal}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
              >
                <Plus className="h-4 w-4" />
                Add Fund
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
