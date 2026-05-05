import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import useFinancialData from "../hooks/useFinancialData";
import { getWalletBalance } from "@/utils/financialEngine";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const CATEGORIES = [
  "Emergency Buffer",
  "Family",
  "Travel",
  "Gadget",
  "Education",
  "Health",
  "Business",
  "Investment Prep",
  "Other",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const safeNumber = (value) => {
  const num = Number(String(value ?? "").replace(/[₱,\s,]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const clampOpacity = (value) => Math.max(0, Math.min(Number(value) || 0.3, 0.5));

const getSaved = (goal) =>
  safeNumber(
    goal?.saved_amount ??
      goal?.current_amount ??
      goal?.saved ??
      goal?.progress_amount ??
      goal?.amount_saved
  );

const getTarget = (goal) =>
  safeNumber(
    goal?.target_amount ?? goal?.goal_amount ?? goal?.target ?? goal?.amount
  );

const getTitle = (goal) =>
  goal?.title || goal?.name || goal?.goal_name || "Savings Goal";

const normalizeGoal = (goal = {}) => ({
  ...goal,
  id: String(goal?.id || createId()),
  title: getTitle(goal),
  target_amount: getTarget(goal),
  saved_amount: getSaved(goal),
  wallet_id: goal?.wallet_id || goal?.walletId || "",
  category: goal?.category || "Other",
  priority: goal?.priority || "medium",
  planned_use_date: goal?.planned_use_date || goal?.due_date || goal?.target_date || "",
  notes: goal?.notes || "",
  reasons: Array.isArray(goal?.reasons) ? goal.reasons : ["", "", ""],
  wallpaper: goal?.wallpaper || goal?.background || goal?.image || "",
  wallpaperOpacity: clampOpacity(
    goal?.wallpaperOpacity ?? goal?.wallpaper_opacity ?? goal?.backgroundOpacity ?? 0.3
  ),
});

function getSavingsStatus(progress, goalCount = 0) {
  if (!goalCount) {
    return {
      label: "Start",
      text: "text-cyan-300",
      badge: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/25",
      bar: "from-cyan-400 via-emerald-300 to-lime-300",
      ring: "shadow-[0_0_24px_rgba(34,211,238,0.14)]",
    };
  }

  if (progress >= 100) {
    return {
      label: "Reached",
      text: "text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 via-lime-300 to-cyan-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (progress >= 66) {
    return {
      label: "Close",
      text: "text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 via-lime-300 to-cyan-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    };
  }

  if (progress >= 33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "from-amber-400 via-yellow-300 to-lime-300",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.15)]",
    };
  }

  return {
    label: "Starting",
    text: "text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/25",
    bar: "from-cyan-400 via-emerald-300 to-lime-300",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.14)]",
  };
}

function getSavingsMessage(goalCount, progress) {
  if (!goalCount) return "Start one goal so your extra money gets a clear destination.";
  if (progress >= 100) return "You already hit the target. Protect it or move to the next one.";
  if (progress >= 66) return "You’re getting close. Stay steady and finish this.";
  if (progress >= 33) return "You’ve started strong. Keep feeding the goal.";
  return "Even small consistent deposits build real progress.";
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-emerald-400/40";

const selectClass =
  "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-400/40";

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="theme-modal-card relative z-10 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-white">{title}</p>
            {subtitle ? <p className="mt-0.5 text-xs text-white/55">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function WallpaperModal({ draft, setDraft, onClose, onSave, title = "Savings Background" }) {
  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, image: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell title={title} subtitle="Upload photo and adjust opacity" onClose={onClose}>
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <div className="relative h-48">
          <div className="absolute inset-0 bg-gradient-to-br from-[#07182a] via-[#0a2735] to-[#08151f]" />
          {draft.image ? (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${draft.image})`, opacity: clampOpacity(draft.opacity) }}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.12),transparent_24%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
          <div className="relative z-10 flex h-full items-end p-4">
            <div>
              <p className="text-lg font-bold text-white">Savings Goals</p>
              <p className="text-xs text-white/75">Preview of your card background</p>
            </div>
          </div>
        </div>
      </div>

      <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10">
        <Upload className="h-4 w-4" />
        <span>{draft.image ? "Change photo" : "Upload photo"}</span>
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </label>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-white/65">Background Opacity</p>
          <p className="text-[11px] font-semibold text-white/85">{Math.round(clampOpacity(draft.opacity) * 100)}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.05"
          value={clampOpacity(draft.opacity)}
          onChange={(event) => setDraft((current) => ({ ...current, opacity: Number(event.target.value) }))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDraft({ image: "", opacity: 0.3 })}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <Check className="h-4 w-4" />
          Save
        </button>
      </div>
    </ModalShell>
  );
}

export default function SavingsCard({
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveSavingsGoal,
  onDeleteSavingsGoal,
  onAddSavings,
  theme = null,
}) {
  const finance = useFinancialData();
  const {
    wallets = [],
    walletTransactions = [],
    transfers = [],
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    refreshData,
  } = finance || {};

  const [localExpanded, setLocalExpanded] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [wallpaperModalOpen, setWallpaperModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wallpaper, setWallpaper] = useState({ image: "", opacity: 0.3 });
  const [draftWallpaper, setDraftWallpaper] = useState({ image: "", opacity: 0.3 });
  const fileRestoreRef = useRef(null);

  const normalizedGoals = useMemo(() => {
    const source = Array.isArray(savingsGoals) ? savingsGoals : [];
    return source.filter((goal) => !goal?.deleted_at && !goal?.deletedAt).map(normalizeGoal);
  }, [savingsGoals]);

  const safeWallets = Array.isArray(wallets) ? wallets.filter(Boolean) : [];

  const walletBalances = useMemo(() => {
    const map = {};
    safeWallets.forEach((wallet) => {
      map[String(wallet.id || wallet.wallet_id)] = getWalletBalance(
        wallet,
        Array.isArray(walletTransactions) ? walletTransactions : [],
        Array.isArray(transfers) ? transfers : []
      );
    });
    return map;
  }, [safeWallets, walletTransactions, transfers]);

  const computedSaved = normalizedGoals.reduce((sum, goal) => sum + getSaved(goal), 0);
  const computedTarget = normalizedGoals.reduce((sum, goal) => sum + getTarget(goal), 0);
  const finalSaved = totalSavingsSaved || computedSaved;
  const finalTarget = totalSavingsTarget || computedTarget;
  const overallProgress = finalTarget > 0 ? Math.min(100, (finalSaved / finalTarget) * 100) : 0;
  const status = getSavingsStatus(overallProgress, normalizedGoals.length);
  const message = getSavingsMessage(normalizedGoals.length, overallProgress);
  const isLight = theme?.isLight === true;
  const isExpanded = expanded || localExpanded;
  const mainGoal = primarySavingsGoal ? normalizeGoal(primarySavingsGoal) : normalizedGoals[0] || null;

  const [goalForm, setGoalForm] = useState({
    title: "",
    category: "Other",
    target_amount: "",
    saved_amount: "0",
    wallet_id: "",
    planned_use_date: "",
    priority: "medium",
    notes: "",
  });

  const [topUpForm, setTopUpForm] = useState({ goal_id: "", wallet_id: "", amount: "" });

  useEffect(() => {
    const candidate = mainGoal;
    if (!candidate) return;
    const nextWallpaper = {
      image: candidate.wallpaper || "",
      opacity: clampOpacity(candidate.wallpaperOpacity),
    };
    setWallpaper(nextWallpaper);
  }, [mainGoal?.id, mainGoal?.wallpaper, mainGoal?.wallpaperOpacity]);

  const persistGoal = async (payload, id = null) => {
    if (id) {
      if (typeof updateSavingsGoal === "function") return updateSavingsGoal(id, payload);
      return onSaveSavingsGoal?.(payload);
    }

    if (typeof addSavingsGoal === "function") return addSavingsGoal(payload);
    return onSaveSavingsGoal?.(payload);
  };

  const refresh = async () => {
    if (typeof refreshData === "function") await refreshData();
  };

  const openCreateGoal = () => {
    setError("");
    setSelectedGoal(null);
    setGoalForm({
      title: "",
      category: "Other",
      target_amount: "",
      saved_amount: "0",
      wallet_id: safeWallets[0] ? String(safeWallets[0].id || safeWallets[0].wallet_id) : "",
      planned_use_date: "",
      priority: "medium",
      notes: "",
    });
    setGoalModalOpen(true);
  };

  const openEditGoal = (goal) => {
    const normalized = normalizeGoal(goal);
    setError("");
    setSelectedGoal(normalized);
    setGoalForm({
      title: normalized.title,
      category: normalized.category || "Other",
      target_amount: String(normalized.target_amount || ""),
      saved_amount: String(normalized.saved_amount || 0),
      wallet_id: normalized.wallet_id ? String(normalized.wallet_id) : "",
      planned_use_date: normalized.planned_use_date || "",
      priority: normalized.priority || "medium",
      notes: normalized.notes || "",
    });
    setGoalModalOpen(true);
  };

  const saveGoal = async () => {
    const title = goalForm.title.trim();
    const target = safeNumber(goalForm.target_amount);
    const saved = safeNumber(goalForm.saved_amount);

    if (!title) return setError("Enter a goal title.");
    if (target <= 0) return setError("Enter a valid target amount.");

    setSaving(true);
    setError("");

    try {
      const now = new Date().toISOString();
      const id = selectedGoal?.id || createId();
      const payload = normalizeGoal({
        ...(selectedGoal || {}),
        id,
        title,
        category: goalForm.category || "Other",
        target_amount: target,
        saved_amount: Math.min(Math.max(saved, 0), target),
        wallet_id: goalForm.wallet_id || "",
        planned_use_date: goalForm.planned_use_date || "",
        priority: goalForm.priority || "medium",
        notes: goalForm.notes || "",
        updated_at: now,
        updatedAt: now,
        updated_date: now,
        created_at: selectedGoal?.created_at || now,
        createdAt: selectedGoal?.createdAt || now,
        created_date: selectedGoal?.created_date || now,
        syncStatus: "local_only",
        source: "local",
      });

      await persistGoal(payload, selectedGoal?.id || null);
      await refresh();
      setGoalModalOpen(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error("Unable to save savings goal:", err);
      setError(err?.message || "Unable to save savings goal.");
    } finally {
      setSaving(false);
    }
  };

  const openTopUp = (goal = mainGoal) => {
    const normalized = goal ? normalizeGoal(goal) : null;
    setError("");
    setSelectedGoal(normalized);
    setTopUpForm({
      goal_id: normalized?.id || "",
      wallet_id: normalized?.wallet_id || (safeWallets[0] ? String(safeWallets[0].id || safeWallets[0].wallet_id) : ""),
      amount: "",
    });
    setTopUpModalOpen(true);
  };

  const saveTopUp = async () => {
    const goal = normalizedGoals.find((item) => String(item.id) === String(topUpForm.goal_id)) || selectedGoal;
    const amount = safeNumber(topUpForm.amount);
    const walletId = topUpForm.wallet_id || goal?.wallet_id || "";

    if (!goal) return setError("Choose a savings goal first.");
    if (amount <= 0) return setError("Enter a valid amount.");
    if (!walletId) return setError("Choose a source wallet first.");

    const walletBalance = walletBalances[String(walletId)] ?? 0;
    if (amount > walletBalance) return setError("This wallet does not have enough balance.");

    const currentSaved = getSaved(goal);
    const target = getTarget(goal);
    const nextSaved = target > 0 ? Math.min(currentSaved + amount, target) : currentSaved + amount;

    setSaving(true);
    setError("");

    try {
      const now = new Date().toISOString();
      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        wallet_id: walletId,
        last_top_up_amount: amount,
        lastTopUpAmount: amount,
        updated_at: now,
        updatedAt: now,
        updated_date: now,
        syncStatus: "local_only",
        source: "local",
      });

      if (typeof updateSavingsGoal === "function") await updateSavingsGoal(goal.id, updatedGoal);
      else await onAddSavings?.(updatedGoal, amount);

      await refresh();
      setTopUpModalOpen(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error("Unable to add savings:", err);
      setError(err?.message || "Unable to add savings.");
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async (goal) => {
    const normalized = normalizeGoal(goal);
    setSaving(true);
    setError("");

    try {
      if (typeof deleteSavingsGoal === "function") await deleteSavingsGoal(normalized.id);
      else await onDeleteSavingsGoal?.(normalized.id);
      await refresh();
    } catch (err) {
      console.error("Unable to delete savings goal:", err);
      setError(err?.message || "Unable to delete savings goal.");
    } finally {
      setSaving(false);
    }
  };

  const openWallpaper = () => {
    setDraftWallpaper(wallpaper || { image: "", opacity: 0.3 });
    setWallpaperModalOpen(true);
  };

  const saveWallpaper = async () => {
    const next = { image: draftWallpaper.image || "", opacity: clampOpacity(draftWallpaper.opacity) };
    setWallpaper(next);
    setWallpaperModalOpen(false);

    if (!mainGoal?.id || typeof updateSavingsGoal !== "function") return;

    try {
      await updateSavingsGoal(mainGoal.id, {
        ...mainGoal,
        wallpaper: next.image,
        background: next.image,
        image: next.image,
        wallpaperOpacity: next.opacity,
        wallpaper_opacity: next.opacity,
        backgroundOpacity: next.opacity,
      });
      await refresh();
    } catch (err) {
      console.error("Unable to save savings wallpaper:", err);
    }
  };

  const handleToggleDetails = () => {
    if (typeof onToggleDetails === "function") onToggleDetails();
    else setLocalExpanded((current) => !current);
  };

  const previewGoals = isExpanded ? normalizedGoals : mainGoal ? [mainGoal] : normalizedGoals.slice(0, 1);
  const surfaceStyle = {
    background: theme?.tokens?.gradientCard || "var(--theme-gradient-card)",
    borderColor: theme?.tokens?.border || "var(--theme-border)",
  };

  return (
    <>
      <div
        className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${status.ring}`}
        style={surfaceStyle}
      >
        <div className="absolute inset-0" style={{ background: theme?.tokens?.gradientCard || "var(--theme-gradient-card)" }} />
        {wallpaper.image ? (
          <div
            className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${wallpaper.image})`, opacity: clampOpacity(wallpaper.opacity) }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

        <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
          <div className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.12)] backdrop-blur-sm">
              <Target className="h-4 w-4 text-emerald-300" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-base font-semibold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>Savings Goals</p>
                  <p className={`mt-0.5 text-[11px] font-medium ${isLight ? "text-slate-600" : "text-white/75"}`}>
                    Build dedicated money for what matters next
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openWallpaper}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
                    aria-label="Change savings photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}>
                    {normalizedGoals.length ? `${normalizedGoals.length} Goal${normalizedGoals.length > 1 ? "s" : ""}` : "No Goals"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <p className={`text-[32px] font-bold leading-none ${status.text}`}>{fmt(finalSaved)}</p>
            <p className={`mt-2 max-w-[28rem] text-xs font-medium leading-relaxed ${isLight ? "text-slate-700" : "text-white/82"}`}>{message}</p>
            <p className={`mt-1 text-[11px] ${isLight ? "text-slate-500" : "text-white/60"}`}>Target: {fmt(finalTarget)}</p>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
              <span>Overall progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
              <div className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`} style={{ width: `${overallProgress}%` }}>
                <div className="absolute inset-0 bg-white/20 opacity-40" />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
              <span>{fmt(finalSaved)}</span>
              <span>{fmt(finalTarget)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              disabled={financeActionLoading || saving}
              onClick={openCreateGoal}
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Goal
            </button>
            <button
              type="button"
              disabled={financeActionLoading || saving || normalizedGoals.length === 0}
              onClick={() => openTopUp(mainGoal)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm font-semibold text-white/85 backdrop-blur-sm transition hover:bg-white/10 disabled:opacity-50"
            >
              <PiggyBank className="h-4 w-4" />
              Add Savings
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleDetails}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
          >
            <span className="font-medium">{isExpanded ? "Hide details" : "Show details"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          </div>

          {isExpanded && (
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Goals</p><p className="text-sm font-bold text-white">{normalizedGoals.length}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Saved</p><p className="text-sm font-bold text-white">{fmt(finalSaved)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Target</p><p className="text-sm font-bold text-white">{fmt(finalTarget)}</p></div>
              </div>

              {previewGoals.length ? (
                <div className="space-y-2">
                  {previewGoals.map((goal, index) => {
                    const saved = getSaved(goal);
                    const target = getTarget(goal);
                    const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
                    const wallet = safeWallets.find((item) => String(item.id || item.wallet_id) === String(goal.wallet_id));
                    return (
                      <div key={goal.id || `${goal.title}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-[2px]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{getTitle(goal)}</p>
                            <p className="mt-1 text-xs text-white/55">{fmt(saved)} / {fmt(target)}</p>
                            {wallet ? <p className="mt-1 flex items-center gap-1 text-[11px] text-white/45"><Wallet className="h-3 w-3" />{wallet.name || wallet.title || "Wallet"}</p> : null}
                          </div>
                          <p className="shrink-0 text-sm font-bold text-white">{Math.round(progress)}%</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-cyan-300" style={{ width: `${progress}%` }} /></div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => openTopUp(goal)} className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/15">Add Savings</button>
                          <button type="button" onClick={() => openEditGoal(goal)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10">Edit Goal</button>
                          <button type="button" onClick={() => removeGoal(goal)} disabled={saving} className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50" aria-label="Delete goal"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center">
                  <PiggyBank className="mx-auto h-8 w-8 text-white/30" />
                  <p className="mt-3 text-sm font-semibold text-white">No savings goals yet</p>
                  <p className="mt-2 text-sm leading-6 text-white/60">Start one goal so your extra money gets a clear destination.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {goalModalOpen && (
        <ModalShell title={selectedGoal ? "Edit Savings Goal" : "New Savings Goal"} subtitle="Set a target, wallet, and purpose" onClose={() => setGoalModalOpen(false)}>
          <div className="space-y-4">
            {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Goal Title</label><input className={inputClass} value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="e.g., New phone, travel fund" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Target</label><input type="number" className={inputClass} value={goalForm.target_amount} onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })} placeholder="0" /></div>
              <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Saved</label><input type="number" className={inputClass} value={goalForm.saved_amount} onChange={(e) => setGoalForm({ ...goalForm, saved_amount: e.target.value })} placeholder="0" /></div>
            </div>
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Category</label><select className={selectClass} value={goalForm.category} onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}>{CATEGORIES.map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}</select></div>
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Source Wallet</label><select className={selectClass} value={goalForm.wallet_id} onChange={(e) => setGoalForm({ ...goalForm, wallet_id: e.target.value })}><option value="" className="bg-slate-950">No wallet selected</option>{safeWallets.map((wallet) => <option key={wallet.id || wallet.wallet_id} value={String(wallet.id || wallet.wallet_id)} className="bg-slate-950">{wallet.name || wallet.title || "Wallet"} — {fmt(walletBalances[String(wallet.id || wallet.wallet_id)] || 0)}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Use Date</label><input type="date" className={inputClass} value={goalForm.planned_use_date} onChange={(e) => setGoalForm({ ...goalForm, planned_use_date: e.target.value })} /></div>
              <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Priority</label><select className={selectClass} value={goalForm.priority} onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value })}>{PRIORITIES.map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}</select></div>
            </div>
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Notes</label><textarea className={`${inputClass} min-h-[90px]`} value={goalForm.notes} onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })} placeholder="Why this goal matters" /></div>
            <button type="button" onClick={saveGoal} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"><Check className="h-4 w-4" />{saving ? "Saving..." : "Save Goal"}</button>
          </div>
        </ModalShell>
      )}

      {topUpModalOpen && (
        <ModalShell title="Add Savings" subtitle="Move money into a selected goal" onClose={() => setTopUpModalOpen(false)}>
          <div className="space-y-4">
            {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Goal</label><select className={selectClass} value={topUpForm.goal_id} onChange={(e) => { const goal = normalizedGoals.find((item) => String(item.id) === e.target.value); setTopUpForm({ ...topUpForm, goal_id: e.target.value, wallet_id: goal?.wallet_id || topUpForm.wallet_id }); }}>{normalizedGoals.map((goal) => <option key={goal.id} value={goal.id} className="bg-slate-950">{goal.title} — {fmt(getSaved(goal))}/{fmt(getTarget(goal))}</option>)}</select></div>
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Source Wallet</label><select className={selectClass} value={topUpForm.wallet_id} onChange={(e) => setTopUpForm({ ...topUpForm, wallet_id: e.target.value })}><option value="" className="bg-slate-950">Choose wallet</option>{safeWallets.map((wallet) => <option key={wallet.id || wallet.wallet_id} value={String(wallet.id || wallet.wallet_id)} className="bg-slate-950">{wallet.name || wallet.title || "Wallet"} — {fmt(walletBalances[String(wallet.id || wallet.wallet_id)] || 0)}</option>)}</select></div>
            <div><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Amount</label><input type="number" className={inputClass} value={topUpForm.amount} onChange={(e) => setTopUpForm({ ...topUpForm, amount: e.target.value })} placeholder="0" /></div>
            <button type="button" onClick={saveTopUp} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"><Check className="h-4 w-4" />{saving ? "Saving..." : "Add to Goal"}</button>
          </div>
        </ModalShell>
      )}

      {wallpaperModalOpen ? <WallpaperModal draft={draftWallpaper} setDraft={setDraftWallpaper} onClose={() => setWallpaperModalOpen(false)} onSave={saveWallpaper} /> : null}
    </>
  );
}
