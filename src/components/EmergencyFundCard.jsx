import { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield,
  Edit2,
  Camera,
  X,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import SurvivalExpenseModal from "./SurvivalExpenseModal";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

const MILESTONES = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

const VALID_TARGET_MONTHS = [3, 6, 12];

const EMERGENCY_TARGET_MONTHS_KEY = "clara_emergency_target_months";
const EMERGENCY_WALLPAPER_KEY = "clara_wallpaper";
const EMERGENCY_WALLPAPER_OPACITY_KEY = "clara_wallpaper_opacity";

function getStoredTargetMonths() {
  try {
    const saved = Number(localStorage.getItem(EMERGENCY_TARGET_MONTHS_KEY));
    if (VALID_TARGET_MONTHS.includes(saved)) return saved;
    return 3;
  } catch {
    return 3;
  }
}

function setStoredTargetMonths(value) {
  try {
    localStorage.setItem(EMERGENCY_TARGET_MONTHS_KEY, String(value));
  } catch {}
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

function getStoredWallpaper() {
  try {
    return localStorage.getItem(EMERGENCY_WALLPAPER_KEY) || "";
  } catch {
    return "";
  }
}

function getStoredWallpaperOpacity() {
  try {
    const saved = Number(localStorage.getItem(EMERGENCY_WALLPAPER_OPACITY_KEY));
    if (Number.isNaN(saved)) return 0.3;
    return Math.max(0, Math.min(saved, 0.5));
  } catch {
    return 0.3;
  }
}

function saveWallpaperToStorage(url, opacity) {
  try {
    if (url) {
      localStorage.setItem(EMERGENCY_WALLPAPER_KEY, url);
    } else {
      localStorage.removeItem(EMERGENCY_WALLPAPER_KEY);
    }

    localStorage.setItem(
      EMERGENCY_WALLPAPER_OPACITY_KEY,
      String(Math.max(0, Math.min(Number(opacity) || 0.3, 0.5)))
    );
  } catch {}
}

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetMonths, setTargetMonths] = useState(getStoredTargetMonths());

  const [wallpaper, setWallpaper] = useState(getStoredWallpaper());
  const [wallpaperOpacity, setWallpaperOpacity] = useState(
    getStoredWallpaperOpacity()
  );

  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [draftWallpaper, setDraftWallpaper] = useState(getStoredWallpaper());
  const [draftOpacity, setDraftOpacity] = useState(getStoredWallpaperOpacity());

  const hasPrompted = useRef(false);
  const autoPromptTimeoutRef = useRef(null);

  const propExpense = Number(survivalExpense) || 0;
  const effectiveExpense = propExpense;
  const safeMoneyLeft = Number(moneyLeft) || 0;

  useEffect(() => {
    setStoredTargetMonths(targetMonths);
  }, [targetMonths]);

  useEffect(() => {
    return () => {
      if (autoPromptTimeoutRef.current) {
        window.clearTimeout(autoPromptTimeoutRef.current);
        autoPromptTimeoutRef.current = null;
      }
    };
  }, []);

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

  const status = getStatus(months, targetMonths);
  const progression = getProgression(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);

  const handleSaved = (val) => {
    const num = Number(val) || 0;

    setEditing(false);
    setShowModal(false);
    hasPrompted.current = true;

    onSurvivalSaved?.(num);
  };

  const changeTargetMonths = (next) => {
    if (!VALID_TARGET_MONTHS.includes(next)) return;
    setTargetMonths(next);
    setStoredTargetMonths(next);
  };

  const resolvedWallpaperOpacity = Math.max(
    0,
    Math.min(Number(wallpaperOpacity) || 0.3, 0.5)
  );

  const openWallpaperModal = () => {
    setDraftWallpaper(wallpaper || "");
    setDraftOpacity(
      Math.max(0, Math.min(Number(wallpaperOpacity) || 0.3, 0.5))
    );
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

  const handleWallpaperSave = () => {
    const safeOpacity = Math.max(0, Math.min(Number(draftOpacity) || 0.3, 0.5));
    setWallpaper(draftWallpaper || "");
    setWallpaperOpacity(safeOpacity);
    saveWallpaperToStorage(draftWallpaper || "", safeOpacity);
    setShowWallpaperModal(false);
  };

  const handleWallpaperRemove = () => {
    setDraftWallpaper("");
    setDraftOpacity(0.3);
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

      {showWallpaperModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWallpaperModal(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#08111d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className="text-base font-semibold text-white">
                  Emergency Background
                </p>
                <p className="mt-0.5 text-xs text-white/60">
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
                        opacity: Math.max(
                          0,
                          Math.min(Number(draftOpacity) || 0.3, 0.5)
                        ),
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
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`relative mb-3 overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-200 ${status.ring}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#08111d] via-[#111827] to-[#071520]" />

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

        <div className="relative z-10 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.12)] backdrop-blur-sm">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold tracking-tight text-white">
                    Emergency Fund
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/75">
                    Protection based on your monthly survival expense
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}
                >
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            {safeMoneyLeft <= 0 ? (
              <p className="text-2xl font-bold text-white/95">
                Start your fund
              </p>
            ) : (
              <p className={`text-[32px] font-bold leading-none ${status.text}`}>
                {months.toFixed(1)}
                <span className="ml-1.5 text-base font-semibold text-white/85">
                  months
                </span>
              </p>
            )}

            <p className="mt-2 max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">
              {progression}
            </p>

            <p className="text-[11px] text-white/60 mt-1">
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
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
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
            <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
                        className={`relative rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-200 ${
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
