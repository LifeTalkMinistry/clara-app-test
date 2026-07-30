import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Target, AlertTriangle, Calendar, Edit, Trash2, Wallet, MinusCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";
import { getWalletBalance } from "@/utils/financialEngine";

const OTHER_OPTION = "__other__";

const CATEGORIES = {
  "Celebrations & Gifts": [
    "Birthday",
    "Wedding",
    "Anniversary",
    "Holiday",
    "Family Event",
    "Special Occasion",
  ],
  "Personal Purchases": [
    "Gadget / Electronics",
    "Clothing / Accessories",
    "Furniture / Appliances",
    "Vehicle / Transport",
    "Hobby / Collection",
    "Personal Upgrade",
  ],
  Experiences: [
    "Travel",
    "Vacation",
    "Concert / Event",
    "Retreat",
    "Recreation / Adventure",
    "Staycation",
  ],
  "Financial / Protection": [
    "Emergency Fund",
    "Insurance",
    "Investment",
    "Debt Payment",
    "Retirement",
    "Tax / Legal",
  ],
  "Health & Wellness": [
    "Medical",
    "Dental / Vision",
    "Medicine / Treatment",
    "Self-Care",
    "Fitness / Gym",
    "Mental Health",
  ],
  "Education & Growth": [
    "Tuition / School Fees",
    "Course / Certification",
    "Books / Learning Materials",
    "Training / Workshop",
    "Study Equipment",
    "Skill Development",
  ],
  "Home & Family": [
    "Home Improvement",
    "Rent / Moving",
    "Household Appliance",
    "Child / Family Needs",
    "Family Support",
    "Pet Care",
  ],
  "Career & Business": [
    "Business Capital",
    "Equipment / Tools",
    "Professional Fees",
    "Job Transition",
    "Side Hustle",
    "Marketing / Expansion",
  ],
  "Faith & Community": [
    "Church Project",
    "Ministry / Mission",
    "Donation / Outreach",
    "Community Event",
    "Retreat / Conference",
    "Volunteer Activity",
  ],
};

const EMOTIONAL_VALUES = [
  { value: "joy", label: "Joy 😄" },
  { value: "security", label: "Security 🛡️" },
  { value: "experience", label: "Experience 🌟" },
  { value: "milestone", label: "Milestone 🏆" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent 🔥" },
];

const EMPTY_FORM = {
  title: "",
  category: "",
  subcategory: "",
  custom_category: "",
  custom_subcategory: "",
  target_amount: "",
  saved_amount: "0",
  planned_use_date: "",
  reasons: ["", "", ""],
  emotional_value: "joy",
  flexibility: "flexible",
  priority: "medium",
  notes: "",
  wallet_id: "",
};

const inputDarkClass = "h-10 rounded-xl bg-[#0b1a2f] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-green-500/60";
const selectDarkTriggerClass = "h-10 rounded-xl bg-[#0b1a2f] border-white/10 text-white";
const labelDarkClass = "text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 mb-1.5 block";
const formDialogClass = "w-[calc(100vw-1rem)] max-w-[28rem] sm:max-w-[34rem] max-h-[min(88dvh,46rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#061224] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:w-full [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";
const detailDialogClass = "w-[calc(100vw-1rem)] max-w-[27rem] sm:max-w-[32rem] max-h-[min(86dvh,42rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#041226] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:w-full [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";

const generateId = () => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const firstNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = toNumber(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};
const isActiveWallet = (wallet) => Boolean(wallet && walletId(wallet) && !wallet.deletedAt && !wallet.deleted_at && !wallet.is_archived);
const walletId = (wallet) => {
  if (typeof wallet === "string" || typeof wallet === "number") return String(wallet).trim();
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || "").trim();
};
const walletName = (wallet) => String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet").trim();
const getCategoryFormValues = (goal = {}) => {
  const storedCategory = String(goal?.category || "").trim();
  const categoryIsPreset = Boolean(
    storedCategory && Object.prototype.hasOwnProperty.call(CATEGORIES, storedCategory),
  );
  const category = categoryIsPreset ? storedCategory : storedCategory ? OTHER_OPTION : "";
  const storedSubcategory = String(goal?.subcategory || "").trim();
  const presetSubcategories = categoryIsPreset ? CATEGORIES[storedCategory] || [] : [];
  const subcategoryIsPreset = Boolean(
    storedSubcategory && presetSubcategories.includes(storedSubcategory),
  );

  return {
    category,
    custom_category: category === OTHER_OPTION ? storedCategory : "",
    subcategory: categoryIsPreset
      ? subcategoryIsPreset
        ? storedSubcategory
        : storedSubcategory
? OTHER_OPTION
: ""
      : "",
    custom_subcategory: storedSubcategory && !subcategoryIsPreset ? storedSubcategory : "",
  };
};
const getGoalActivity = (goal) => {
  const source = goal?.savingsActivityLog || goal?.savings_activity_log || goal?.activityLog || goal?.activity_log || [];
  return Array.isArray(source) ? source.filter(Boolean) : [];
};
const getWalletSyncHandledWalletId = (goal = {}) => {
  const explicit = walletId(
    goal?.wallet_sync_prompt_wallet_id ||
      goal?.walletSyncPromptWalletId ||
      goal?.wallet_sync_handled_wallet_id ||
      goal?.walletSyncHandledWalletId ||
      "",
  );
  if (explicit) return explicit;

  const priorSync = getGoalActivity(goal).find((entry) => {
    const type = String(entry?.type || "").trim().toLowerCase();
    const linkedWalletId = walletId(entry?.storageWalletId || entry?.storage_wallet_id || "");
    return type === "wallet_sync" && linkedWalletId;
  });
  return priorSync ? walletId(priorSync?.storageWalletId || priorSync?.storage_wallet_id || "") : "";
};
const walletSyncHandledForAssignedWallet = (goal = {}) => {
  const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
  return Boolean(assignedWalletId && getWalletSyncHandledWalletId(goal) === assignedWalletId);
};
const getGoalSavedAmount = (goal) => firstNumber(goal?.saved_amount, goal?.savedAmount, goal?.current_amount, goal?.currentAmount, goal?.saved, goal?.amount_saved, goal?.amountSaved);
const getGoalTargetAmount = (goal) => firstNumber(goal?.target_amount, goal?.targetAmount, goal?.target, goal?.amount_target, goal?.amountTarget);
const getWalletEmergencyProtectedAmount = (wallet = {}) => firstNumber(
  wallet?.emergencyProtectedAmount,
  wallet?.emergency_protected_amount,
  wallet?.protectedEmergencyAmount,
  wallet?.protected_emergency_amount,
);
const toMinorUnits = (value) => Math.round(toNumber(value) * 100);
const hasEnoughMoney = (available, requested) => toMinorUnits(available) >= toMinorUnits(requested);
const normalizeGoal = (goal = {}) => {
  const savedAmount = getGoalSavedAmount(goal);
  const targetAmount = getGoalTargetAmount(goal);
  const activity = getGoalActivity(goal);
  return {
    ...goal,
    id: String(goal.id || generateId()),
    wallet_id: goal.wallet_id != null ? String(goal.wallet_id) : goal.walletId != null ? String(goal.walletId) : "",
    target_amount: targetAmount,
    targetAmount,
    saved_amount: savedAmount,
    savedAmount,
    current_amount: savedAmount,
    currentAmount: savedAmount,
    planned_use_date: goal.planned_use_date || goal.plannedUseDate || "",
    reasons: Array.isArray(goal.reasons)
      ? goal.reasons
      : [goal.reason_one || goal.reasonOne || "", goal.reason_two || goal.reasonTwo || "", goal.reason_three || goal.reasonThree || ""],
    savingsActivityLog: activity,
    savings_activity_log: activity,
    activityLog: activity,
    activity_log: activity,
    created_date: goal.created_date || goal.createdAt || new Date().toISOString(),
    updated_date: goal.updated_date || goal.updatedAt || new Date().toISOString(),
  };
};

export default function SavingsGoalsIntegrated() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeActionHandledRef = useRef(false);
  const { user, loading: accessLoading } = useUserRole();
  const data = useFinancialData(user);
  const {
    savingsGoals = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addExpense,
    deleteExpense,
    transferBetweenWallets,
  } = data || {};

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [walletSyncPrompt, setWalletSyncPrompt] = useState(null);
  const [walletSyncSaving, setWalletSyncSaving] = useState(false);
  const [walletSyncError, setWalletSyncError] = useState("");
  const [formError, setFormError] = useState("");
  const [deletePrompt, setDeletePrompt] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loading = Boolean(data?.loading || data?.isLoading || data?.financialDataLoading);
  const activeWallets = useMemo(() => (Array.isArray(wallets) ? wallets.filter(isActiveWallet) : []), [wallets]);
  const goals = useMemo(
    () =>
      (Array.isArray(savingsGoals) ? savingsGoals : [])
        .filter((goal) => !goal?.deletedAt && !goal?.deleted_at)
        .map(normalizeGoal)
        .sort((a, b) => new Date(b.updatedAt || b.updated_date || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.updated_date || a.createdAt || 0).getTime()),
    [savingsGoals]
  );

  const walletBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      map[walletId(wallet)] = getWalletBalance(wallet, Array.isArray(walletTransactions) ? walletTransactions : [], Array.isArray(transfers) ? transfers : []);
    });
    return map;
  }, [activeWallets, transfers, walletTransactions]);

  const protectedSavingsByWallet = useMemo(() => {
    const map = {};
    goals.forEach((goal) => {
      const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
      if (!assignedWalletId) return;
      map[assignedWalletId] = (map[assignedWalletId] || 0) + Math.max(getGoalSavedAmount(goal), 0);
    });
    return map;
  }, [goals]);

  const walletAvailableBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      const id = walletId(wallet);
      const rawBalance = Math.max(toNumber(walletBalances[id] ?? wallet?.balance), 0);
      const emergencyProtected = Math.min(getWalletEmergencyProtectedAmount(wallet), rawBalance);
      const savingsProtected = Math.min(
        Math.max(protectedSavingsByWallet[id] || 0, 0),
        Math.max(rawBalance - emergencyProtected, 0),
      );
      map[id] = Math.max(rawBalance - emergencyProtected - savingsProtected, 0);
    });
    return map;
  }, [activeWallets, protectedSavingsByWallet, walletBalances]);

  useEffect(() => {
    if (!detailGoal?.id) return;
    const freshGoal = goals.find((goal) => String(goal.id) === String(detailGoal.id));
    if (!freshGoal) return;
    const freshTime = new Date(freshGoal.updatedAt || freshGoal.updated_date || 0).getTime();
    const currentTime = new Date(detailGoal.updatedAt || detailGoal.updated_date || 0).getTime();
    if (freshTime >= currentTime || getGoalSavedAmount(freshGoal) !== getGoalSavedAmount(detailGoal)) setDetailGoal(freshGoal);
  }, [goals, detailGoal?.id, detailGoal?.updatedAt, detailGoal?.updated_date]);

  const fmt = (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(Number(n) || 0);
  const totalSaved = goals.reduce((sum, goal) => sum + toNumber(goal.saved_amount), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + toNumber(goal.target_amount), 0);
  const retentionNum = parseFloat(data?.retentionRate || 0);

  const getWalletBalanceSyncSuggestion = (rawGoal) => {
    const goal = normalizeGoal(rawGoal);
    const goalWalletId = walletId(goal.wallet_id);
    if (!goalWalletId) return null;

    const wallet = activeWallets.find((item) => walletId(item) === goalWalletId);
    if (!wallet) return null;

    const targetAmount = toNumber(goal.target_amount);
    const savedAmount = toNumber(goal.saved_amount);
    const remainingGoalAmount = Math.max(targetAmount - savedAmount, 0);
    if (targetAmount <= 0 || remainingGoalAmount <= 0) return null;

    const walletBalance = toNumber(walletBalances[goalWalletId] ?? getWalletBalance(wallet, Array.isArray(walletTransactions) ? walletTransactions : [], Array.isArray(transfers) ? transfers : []));
    const availableWalletBalanceForThisGoal = Math.max(
      toNumber(walletAvailableBalances[goalWalletId]),
      0,
    );
    const suggestedAmount = Math.min(remainingGoalAmount, availableWalletBalanceForThisGoal);

    if (suggestedAmount <= 0) return null;

    return {
      wallet,
      walletId: goalWalletId,
      walletBalance,
      suggestedAmount,
      remainingGoalAmount,
    };
  };

  const openWalletSyncPromptForGoal = (goal) => {
    const suggestion = getWalletBalanceSyncSuggestion(goal);
    if (!suggestion) return;
    setWalletSyncError("");
    setWalletSyncPrompt({
      goal: normalizeGoal(goal),
      wallet: suggestion.wallet,
      amount: suggestion.suggestedAmount,
      walletBalance: suggestion.walletBalance,
      remainingGoalAmount: suggestion.remainingGoalAmount,
    });
  };

  const openAdd = (starterTitle = "") => {
    setDetailGoal(null);
    setForm({ ...EMPTY_FORM, title: String(starterTitle || "") });
    setEditId(null);
    setFormError("");
    setOpen(true);
  };
  const closeFormModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };
  const openEdit = (goal) => {
    setFormError("");
    const categoryFormValues = getCategoryFormValues(goal);
    setForm({
      title: goal.title || "",
      ...categoryFormValues,
      target_amount: String(goal.target_amount ?? ""),
      saved_amount: String(goal.saved_amount ?? 0),
      planned_use_date: goal.planned_use_date || "",
      reasons: Array.isArray(goal.reasons) && goal.reasons.length >= 3 ? goal.reasons : ["", "", ""],
      emotional_value: goal.emotional_value || "joy",
      flexibility: goal.flexibility || "flexible",
      priority: goal.priority || "medium",
      notes: goal.notes || "",
      wallet_id: goal.wallet_id ? String(goal.wallet_id) : "",
    });
    setEditId(goal.id);
    setOpen(true);
  };

  useEffect(() => {
    if (loading || routeActionHandledRef.current) return;
    const routeState = location.state || {};
    if (routeState?.openCreateSavingsGoal) {
      routeActionHandledRef.current = true;
      openAdd(routeState?.starterTitle || "");
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    const requestedEditId = routeState?.editGoalId ? String(routeState.editGoalId) : "";
    const requestedFocusId = routeState?.focusGoalId ? String(routeState.focusGoalId) : "";
    const target = goals.find((goal) => String(goal.id) === (requestedEditId || requestedFocusId));
    if (target && requestedEditId) {
      routeActionHandledRef.current = true;
      openEdit(target);
      navigate(location.pathname, { replace: true, state: null });
    } else if (target && requestedFocusId) {
      routeActionHandledRef.current = true;
      setDetailGoal(target);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [goals, loading, location.pathname, location.state, navigate]);

  const handleBack = () => {
    if (window.history.length > 1) return navigate(-1);
    navigate("/dashboard", { replace: true });
  };

  const handleSave = async () => {
    if (saving) return;
    setFormError("");

    if (!user?.id && !user?.email) return setFormError("No user was found. Please log in again.");
    if (!form.title?.trim()) return setFormError("Enter a goal title.");

    const resolvedCategory = form.category === OTHER_OPTION
      ? String(form.custom_category || "").trim()
      : String(form.category || "").trim();
    const resolvedSubcategory = form.category === OTHER_OPTION || form.subcategory === OTHER_OPTION
      ? String(form.custom_subcategory || "").trim()
      : String(form.subcategory || "").trim();

    if (form.category === OTHER_OPTION && !resolvedCategory) {
      return setFormError("Type your specific category.");
    }
    if (form.subcategory === OTHER_OPTION && !resolvedSubcategory) {
      return setFormError("Type your specific subcategory.");
    }

    const existing = editId ? goals.find((goal) => String(goal.id) === String(editId)) : null;
    const currentSavedAmount = existing ? getGoalSavedAmount(existing) : 0;
    const nextTargetAmount = toNumber(form.target_amount);
    const nextSavedAmount = existing ? currentSavedAmount : Math.max(0, toNumber(form.saved_amount));
    if (nextTargetAmount <= 0) return setFormError("Enter a valid target amount.");
    if (nextSavedAmount > nextTargetAmount) return setFormError("Target Amount cannot be lower than the current saved balance.");
    if (form.wallet_id === "__no_wallets__") return setFormError("Choose a valid wallet.");
    const previousWalletId = walletId(existing?.wallet_id || existing?.walletId || "");
    const nextWalletId = walletId(form.wallet_id && form.wallet_id !== "__no_wallets__" ? form.wallet_id : "");
    const previousWallet = activeWallets.find((wallet) => walletId(wallet) === previousWalletId) || null;
    const nextWallet = activeWallets.find((wallet) => walletId(wallet) === nextWalletId) || null;
    const walletChanged = Boolean(existing && previousWalletId !== nextWalletId);

    if (nextSavedAmount > 0 && !nextWallet) {
      return setFormError("Choose an available wallet before marking money as saved.");
    }

    const nextWalletAvailable = nextWallet ? toNumber(walletAvailableBalances[nextWalletId]) : 0;
    let transferAmount = 0;

    if (!existing && nextSavedAmount > 0 && !hasEnoughMoney(nextWalletAvailable, nextSavedAmount)) {
      return setFormError("This wallet does not have enough unprotected money for the Already Saved amount.");
    }

    if (existing && !walletChanged) {
      const increase = Math.max(nextSavedAmount - currentSavedAmount, 0);
      if (increase > 0 && !hasEnoughMoney(nextWalletAvailable, increase)) {
        return setFormError("This wallet does not have enough unprotected money for that savings increase.");
      }
    }

    if (walletChanged) {
      transferAmount = Math.min(currentSavedAmount, nextSavedAmount);
      const extraProtectionNeeded = Math.max(nextSavedAmount - currentSavedAmount, 0);

      if (transferAmount > 0 && !previousWallet) {
        return setFormError("The current saved-in wallet is unavailable. Reduce Already Saved to ₱0 before changing wallets.");
      }
      if (transferAmount > 0 && !hasEnoughMoney(walletBalances[previousWalletId] || 0, transferAmount)) {
        return setFormError("The current saved-in wallet no longer contains enough money to move this goal.");
      }
      if (extraProtectionNeeded > 0 && !hasEnoughMoney(nextWalletAvailable, extraProtectionNeeded)) {
        return setFormError("The new wallet does not have enough unprotected money for the increased saved amount.");
      }
    }

    let movedSavedMoney = false;
    const moveId = `savings_goal_wallet_move_${Date.now()}`;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const payload = normalizeGoal({
        ...(existing || {}),
        id: editId || generateId(),
        title: form.title.trim(),
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        target_amount: nextTargetAmount,
        saved_amount: nextSavedAmount,
        current_amount: nextSavedAmount,
        savedAmount: nextSavedAmount,
        currentAmount: nextSavedAmount,
        planned_use_date: form.planned_use_date || "",
        reasons: form.reasons,
        emotional_value: form.emotional_value || "joy",
        flexibility: form.flexibility || "flexible",
        priority: form.priority || "medium",
        notes: form.notes || "",
        wallet_id: nextWalletId,
        created_by: user?.email || null,
        user_email: user?.email || null,
        user_id: user?.id || null,
        created_date: existing?.created_date || now,
        updated_date: now,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });

      if (transferAmount > 0) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({
          id: moveId,
          transfer_group_id: moveId,
          from_wallet_id: previousWalletId,
          to_wallet_id: nextWalletId,
          amount: transferAmount,
          notes: `Savings goal moved from ${walletName(previousWallet)} to ${walletName(nextWallet)}: ${payload.title}.`,
          source_type: "savings_goal_storage_move",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        movedSavedMoney = true;
      }

      if (editId) await updateSavingsGoal(payload.id, payload);
      else await addSavingsGoal(payload);

      const assignedWalletChanged = Boolean(existing && previousWalletId !== nextWalletId);
      const alreadyHandledThisWallet = walletSyncHandledForAssignedWallet(payload);
      const shouldAskWalletSync = Boolean(
        nextWalletId &&
          (!existing || assignedWalletChanged || !alreadyHandledThisWallet),
      );
      const suggestion = shouldAskWalletSync ? getWalletBalanceSyncSuggestion(payload) : null;

      setDetailGoal(payload);
      closeFormModal();
      if (suggestion) {
        setWalletSyncPrompt({
          goal: payload,
          wallet: suggestion.wallet,
          amount: suggestion.suggestedAmount,
          walletBalance: suggestion.walletBalance,
          remainingGoalAmount: suggestion.remainingGoalAmount,
        });
      }
    } catch (error) {
      if (movedSavedMoney && typeof transferBetweenWallets === "function") {
        try {
          await transferBetweenWallets({
            from_wallet_id: nextWalletId,
            to_wallet_id: previousWalletId,
            amount: transferAmount,
            notes: "Savings goal wallet move rollback after the goal could not be saved.",
            source_type: "savings_goal_storage_move_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) {
          console.error("Failed to roll back savings goal wallet move:", rollbackError);
        }
      }
      console.error("Failed to save savings goal:", error);
      setFormError(error?.message || "CLARA could not save this goal yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (goal) => {
    setDeletePrompt(normalizeGoal(goal));
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deletePrompt?.id || deleteSaving) return;
    try {
      setDeleteSaving(true);
      setDeleteError("");
      await deleteSavingsGoal(deletePrompt.id);
      setDetailGoal((previous) => (String(previous?.id) === String(deletePrompt.id) ? null : previous));
      setDeletePrompt(null);
    } catch (error) {
      console.error("Failed to delete savings goal:", error);
      setDeleteError(error?.message || "CLARA could not delete this goal yet. Try again.");
    } finally {
      setDeleteSaving(false);
    }
  };

  const buildActivity = (goal, entry) => [entry, ...getGoalActivity(goal)].slice(0, 80);

  const handleDismissWalletBalanceSync = async () => {
    if (!walletSyncPrompt || walletSyncSaving) return;
    const promptGoal = normalizeGoal(walletSyncPrompt.goal);
    const goal = goals.find((item) => String(item.id) === String(promptGoal.id)) || promptGoal;
    const handledWalletId = walletId(walletSyncPrompt.wallet || goal.wallet_id || goal.walletId || "");
    if (!handledWalletId) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    try {
      setWalletSyncSaving(true);
      setWalletSyncError("");
      const now = new Date().toISOString();
      const updatedGoal = normalizeGoal({
        ...goal,
        wallet_sync_prompt_wallet_id: handledWalletId,
        walletSyncPromptWalletId: handledWalletId,
        wallet_sync_prompt_decision: "dismissed",
        walletSyncPromptDecision: "dismissed",
        wallet_sync_prompt_updated_at: now,
        walletSyncPromptUpdatedAt: now,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      setWalletSyncPrompt(null);
    } catch (error) {
      console.error("Failed to remember wallet savings prompt decision:", error);
      setWalletSyncError(error?.message || "CLARA could not save this choice yet. Try again.");
    } finally {
      setWalletSyncSaving(false);
    }
  };

  const handleConfirmWalletBalanceSync = async () => {
    if (!walletSyncPrompt || walletSyncSaving) return;

    const promptGoal = normalizeGoal(walletSyncPrompt.goal);
    const goal = goals.find((item) => String(item.id) === String(promptGoal.id)) || promptGoal;
    const promptWalletId = walletId(walletSyncPrompt.wallet || goal.wallet_id || goal.walletId || "");

    // Protect against a stale or duplicated prompt adding the same wallet balance twice.
    if (promptWalletId && getWalletSyncHandledWalletId(goal) === promptWalletId) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    const suggestion = getWalletBalanceSyncSuggestion(goal);
    if (!suggestion) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    const amount = Math.min(toNumber(walletSyncPrompt.amount), toNumber(suggestion.suggestedAmount));
    if (amount <= 0) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    try {
      setWalletSyncSaving(true);
      setWalletSyncError("");
      const now = new Date().toISOString();
      const currentSaved = toNumber(goal.saved_amount);
      const target = toNumber(goal.target_amount);
      const nextSaved = Math.min(currentSaved + amount, target);
      const wallet = suggestion.wallet;
      const handledWalletId = walletId(wallet);
      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        wallet_sync_prompt_wallet_id: handledWalletId,
        walletSyncPromptWalletId: handledWalletId,
        wallet_sync_prompt_decision: "accepted",
        walletSyncPromptDecision: "accepted",
        wallet_sync_prompt_updated_at: now,
        walletSyncPromptUpdatedAt: now,
        savingsActivityLog: buildActivity(goal, {
          id: `savings_wallet_sync_${Date.now()}`,
          type: "wallet_sync",
          title: "Wallet balance marked as savings",
          amount,
          storageWalletId: handledWalletId,
          storage_wallet_id: handledWalletId,
          storageWalletName: walletName(wallet),
          storage_wallet_name: walletName(wallet),
          note: `Marked existing ${walletName(wallet)} balance as protected savings`,
          createdAt: now,
          created_at: now,
        }),
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
      updatedGoal.activityLog = updatedGoal.savingsActivityLog;
      updatedGoal.activity_log = updatedGoal.savingsActivityLog;

      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      setWalletSyncPrompt(null);
    } catch (error) {
      console.error("Failed to sync wallet balance to savings goal:", error);
      setWalletSyncError(error?.message || "CLARA could not mark this wallet money as saved yet. Try again.");
    } finally {
      setWalletSyncSaving(false);
    }
  };

  const handleAddSavings = async (goal, inputAmount, sourceWalletId, forcedAmount = null) => {
    const requestedAmount = toNumber(inputAmount);
    const safeAmount = forcedAmount != null ? toNumber(forcedAmount) : requestedAmount;
    if (!safeAmount || safeAmount <= 0) throw new Error("Enter a valid amount.");

    const sourceWallet = activeWallets.find((wallet) => walletId(wallet) === String(sourceWalletId));
    if (!sourceWallet) throw new Error("Choose a valid source wallet.");

    const currentSaved = toNumber(goal.saved_amount);
    const targetAmount = toNumber(goal.target_amount);
    const remaining = Math.max(targetAmount - currentSaved, 0);
    if (remaining <= 0) throw new Error("This goal is already fully funded.");

    const finalAmount = Math.min(safeAmount, remaining);
    const sourceAvailable = toNumber(walletAvailableBalances[walletId(sourceWallet)]);
    if (!hasEnoughMoney(sourceAvailable, finalAmount)) {
      throw new Error("The selected wallet does not have enough unprotected money.");
    }

    const assignedWalletId = walletId(goal.wallet_id || goal.walletId || "");
    const savedInWallet = assignedWalletId
      ? activeWallets.find((wallet) => walletId(wallet) === assignedWalletId) || null
      : sourceWallet;
    if (!savedInWallet) throw new Error("The saved-in wallet is unavailable. Edit this goal and choose a valid wallet first.");

    const now = new Date().toISOString();
    const activityId = `savings_add_${Date.now()}`;
    const shouldMoveMoney = walletId(sourceWallet) !== walletId(savedInWallet);
    let movedWalletMoney = false;

    try {
      if (shouldMoveMoney) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({
          id: activityId,
          transfer_group_id: activityId,
          from_wallet_id: walletId(sourceWallet),
          to_wallet_id: walletId(savedInWallet),
          amount: finalAmount,
          notes: `Savings goal funding: ${goal.title}.`,
          source_type: "savings_goal_funding",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        movedWalletMoney = true;
      }

      const nextSaved = Math.min(currentSaved + finalAmount, targetAmount);
      const updatedGoal = normalizeGoal({
        ...goal,
        wallet_id: walletId(savedInWallet),
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: buildActivity(goal, {
          id: activityId,
          type: "add",
          title: "Savings added",
          amount: finalAmount,
          sourceWalletId: walletId(sourceWallet),
          source_wallet_id: walletId(sourceWallet),
          sourceWalletName: walletName(sourceWallet),
          source_wallet_name: walletName(sourceWallet),
          storageWalletId: walletId(savedInWallet),
          storage_wallet_id: walletId(savedInWallet),
          storageWalletName: walletName(savedInWallet),
          storage_wallet_name: walletName(savedInWallet),
          note: shouldMoveMoney ? `Moved from ${walletName(sourceWallet)} to ${walletName(savedInWallet)}` : `Protected in ${walletName(savedInWallet)}`,
          createdAt: now,
          created_at: now,
        }),
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
      updatedGoal.activityLog = updatedGoal.savingsActivityLog;
      updatedGoal.activity_log = updatedGoal.savingsActivityLog;
      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      return updatedGoal;
    } catch (error) {
      if (movedWalletMoney && typeof transferBetweenWallets === "function") {
        try {
          await transferBetweenWallets({
            from_wallet_id: walletId(savedInWallet),
            to_wallet_id: walletId(sourceWallet),
            amount: finalAmount,
            notes: "Savings funding rollback after the goal could not be updated.",
            source_type: "savings_goal_funding_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) {
          console.error("Failed to roll back savings funding:", rollbackError);
        }
      }
      throw error;
    }
  };

  const getGoalWalletCapacity = (rawGoal) => {
    const goal = normalizeGoal(rawGoal);
    const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
    if (!assignedWalletId) return 0;
    const wallet = activeWallets.find((item) => walletId(item) === assignedWalletId);
    if (!wallet) return 0;
    const rawBalance = Math.max(toNumber(walletBalances[assignedWalletId] ?? wallet?.balance), 0);
    const emergencyProtected = Math.min(getWalletEmergencyProtectedAmount(wallet), rawBalance);
    const currentSaved = Math.max(getGoalSavedAmount(goal), 0);
    const allSavingsProtected = Math.max(toNumber(protectedSavingsByWallet[assignedWalletId]), 0);
    const otherGoalProtection = Math.max(allSavingsProtected - currentSaved, 0);
    return Math.max(rawBalance - emergencyProtected - otherGoalProtection, 0);
  };

  const handleReleaseSavings = async (goal, amount, reason) => {
    const safeAmount = toNumber(amount);
    const cleanReason = String(reason || "").trim();
    const currentSaved = getGoalSavedAmount(goal);
    if (!safeAmount || safeAmount <= 0) throw new Error("Enter a valid amount to release.");
    if (safeAmount > currentSaved) throw new Error("Release amount cannot exceed the current saved balance.");
    if (!cleanReason) throw new Error("Explain why this money is being released.");

    const now = new Date().toISOString();
    const nextSaved = Math.max(currentSaved - safeAmount, 0);
    const updatedGoal = normalizeGoal({
      ...goal,
      saved_amount: nextSaved,
      current_amount: nextSaved,
      savedAmount: nextSaved,
      currentAmount: nextSaved,
      savingsActivityLog: buildActivity(goal, {
        id: `savings_release_${Date.now()}`,
        type: "release",
        title: "Savings released",
        amount: safeAmount,
        reason: cleanReason,
        note: "Protection removed; wallet balance was not changed",
        createdAt: now,
        created_at: now,
      }),
      updated_date: now,
      updatedAt: now,
      syncStatus: "local_only",
      source: "local",
    });
    updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
    updatedGoal.activityLog = updatedGoal.savingsActivityLog;
    updatedGoal.activity_log = updatedGoal.savingsActivityLog;
    await updateSavingsGoal(goal.id, updatedGoal);
    setDetailGoal(updatedGoal);
    return updatedGoal;
  };

  const handleCorrectSavingsBalance = async (goal, correctedAmount, reason) => {
    const nextSaved = Math.max(0, toNumber(correctedAmount));
    const cleanReason = String(reason || "").trim();
    const currentSaved = getGoalSavedAmount(goal);
    const target = getGoalTargetAmount(goal);
    const walletCapacity = getGoalWalletCapacity(goal);
    const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");

    if (!cleanReason) throw new Error("Explain why this balance correction is needed.");
    if (nextSaved > target) throw new Error("Corrected savings cannot exceed the goal target.");
    if (nextSaved > 0 && !assignedWalletId) throw new Error("Assign a saved-in wallet before keeping a saved balance.");
    if (nextSaved > walletCapacity) throw new Error(`This wallet can safely support only ${fmt(walletCapacity)} for this goal.`);
    if (toMinorUnits(nextSaved) === toMinorUnits(currentSaved)) throw new Error("Enter a different corrected balance.");

    const now = new Date().toISOString();
    const updatedGoal = normalizeGoal({
      ...goal,
      saved_amount: nextSaved,
      current_amount: nextSaved,
      savedAmount: nextSaved,
      currentAmount: nextSaved,
      savingsActivityLog: buildActivity(goal, {
        id: `savings_correction_${Date.now()}`,
        type: "correction",
        title: "Saved balance corrected",
        amount: Math.abs(nextSaved - currentSaved),
        previousAmount: currentSaved,
        previous_amount: currentSaved,
        correctedAmount: nextSaved,
        corrected_amount: nextSaved,
        reason: cleanReason,
        note: "Record correction only; no wallet transaction was created",
        createdAt: now,
        created_at: now,
      }),
      updated_date: now,
      updatedAt: now,
      syncStatus: "local_only",
      source: "local",
    });
    updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
    updatedGoal.activityLog = updatedGoal.savingsActivityLog;
    updatedGoal.activity_log = updatedGoal.savingsActivityLog;
    await updateSavingsGoal(goal.id, updatedGoal);
    setDetailGoal(updatedGoal);
    return updatedGoal;
  };

  const handleUseSavings = async (goal, amount, reason) => {
    const safeAmount = toNumber(amount);
    const cleanReason = String(reason || "").trim();
    if (!safeAmount || safeAmount <= 0) throw new Error("Enter a valid amount.");
    if (safeAmount > toNumber(goal.saved_amount)) throw new Error("Amount cannot exceed the current saved amount.");
    if (!cleanReason) throw new Error("Enter a reason or purpose.");

    const assignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
    const assignedWallet = activeWallets.find((wallet) => walletId(wallet) === assignedWalletId) || null;
    if (!assignedWallet) throw new Error("The saved-in wallet is unavailable. Choose a valid wallet before using this goal.");
    if (!hasEnoughMoney(walletBalances[assignedWalletId] || 0, safeAmount)) {
      throw new Error("The saved-in wallet does not contain enough money for this use.");
    }
    if (typeof addExpense !== "function" || typeof deleteExpense !== "function") {
      throw new Error("Savings usage logging is not available yet.");
    }

    const now = new Date().toISOString();
    const activityId = `savings_use_${Date.now()}`;
    const expenseId = `savings_use_expense_${Date.now()}`;
    const nextSaved = Math.max(toNumber(goal.saved_amount) - safeAmount, 0);
    let expenseCreated = false;

    try {
      await addExpense({
        id: expenseId,
        wallet_id: assignedWalletId,
        amount: safeAmount,
        category: "Savings Goal Used",
        need_type: "other",
        planning_status: "planned",
        notes: `Used savings for ${goal.title}: ${cleanReason}`,
        date: now,
        created_at: now,
        updated_at: now,
        source_type: "savings_goal_usage",
        usage_goal_id: goal.id,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      expenseCreated = true;

      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: buildActivity(goal, {
          id: activityId,
          type: "use",
          title: "Savings used",
          amount: safeAmount,
          reason: cleanReason,
          note: `Paid from ${walletName(assignedWallet)}`,
          storageWalletId: assignedWalletId,
          storage_wallet_id: assignedWalletId,
          createdAt: now,
          created_at: now,
        }),
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
      updatedGoal.activityLog = updatedGoal.savingsActivityLog;
      updatedGoal.activity_log = updatedGoal.savingsActivityLog;
      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      return updatedGoal;
    } catch (error) {
      if (expenseCreated) {
        try {
          await deleteExpense(expenseId);
        } catch (rollbackError) {
          console.error("Failed to roll back savings usage expense:", rollbackError);
        }
      }
      throw error;
    }
  };

  if (accessLoading) return <FeaturePageLoader label="Preparing savings goals..." />;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return <div className="p-4 md:p-6 max-w-4xl mx-auto">
    <div className="mb-3"><Button type="button" variant="ghost" onClick={handleBack} className="h-9 rounded-xl px-3 text-muted-foreground hover:text-foreground hover:bg-muted/70"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></div>
    <PageHeader title="Savings Goals" subtitle="Plan and track what matters most" action={<Button size="sm" onClick={() => openAdd()}><Plus className="w-4 h-4 mr-1" />New Goal</Button>} />
    {goals.length > 0 && <div className="grid grid-cols-3 gap-3 mb-4"><StatCard label="Saved" value={fmt(totalSaved)} tone="green" /><StatCard label="Target" value={fmt(totalTarget)} tone="yellow" /><StatCard label="Goals" value={goals.length} /></div>}
    {data?.totalIncome > 0 && retentionNum < 15 && totalTarget > 0 && <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200 mb-4 text-sm"><AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" /><p className="text-orange-700">Your leftover rate is below 15%. Save when your rate improves — your goals are aspirational for now.</p></div>}
    {goals.length === 0 ? <EmptyState icon={Target} title="No savings goals yet" description="Create your first goal — a dream fund, emergency reserve, or any planned expense." /> : <div className="space-y-3">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} wallets={activeWallets} walletBalances={walletBalances} fmt={fmt} onOpen={setDetailGoal} />)}</div>}
    <GoalFormDialog open={open} editId={editId} form={form} setForm={setForm} saving={saving} error={formError} onClose={closeFormModal} onSave={handleSave} onManageBalance={() => { const goal = goals.find((item) => String(item.id) === String(editId)); closeFormModal(); if (goal) setDetailGoal(goal); }} wallets={activeWallets} walletBalances={walletBalances} subcats={form.category ? CATEGORIES[form.category] || [] : []} fmt={fmt} />
    {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} walletAvailableBalances={walletAvailableBalances} walletCapacity={getGoalWalletCapacity(detailGoal)} walletSyncSuggestion={getWalletBalanceSyncSuggestion(detailGoal)} onOpenWalletSyncPrompt={openWalletSyncPromptForGoal} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={requestDelete} onAddSavings={handleAddSavings} onReleaseSavings={handleReleaseSavings} onCorrectSavingsBalance={handleCorrectSavingsBalance} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}
    <SavingsDeleteConfirmDialog goal={deletePrompt} wallets={activeWallets} saving={deleteSaving} error={deleteError} fmt={fmt} onClose={() => { if (!deleteSaving) { setDeletePrompt(null); setDeleteError(""); } }} onConfirm={confirmDelete} />
    <WalletBalanceSyncPrompt prompt={walletSyncPrompt} fmt={fmt} saving={walletSyncSaving} error={walletSyncError} onCancel={handleDismissWalletBalanceSync} onConfirm={handleConfirmWalletBalanceSync} />
  </div>;
}

function StatCard({ label, value, tone }) {
  const cls = tone === "green" ? "grad-green text-white" : tone === "yellow" ? "grad-yellow text-secondary-foreground" : "border border-white/10 bg-[#0f1c33] text-white";
  return <div className={`${cls} rounded-2xl p-3 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]`}><p className="text-[10px] uppercase font-semibold opacity-70">{label}</p><p className="font-heading font-bold text-lg">{value}</p></div>;
}

function GoalCard({ goal, wallets, walletBalances, fmt, onOpen }) {
  const saved = toNumber(goal.saved_amount);
  const target = toNumber(goal.target_amount);
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const remaining = Math.max(target - saved, 0);
  const assignedWallet = wallets.find((wallet) => walletId(wallet) === String(goal.wallet_id));
  return <div onClick={() => onOpen(goal)} className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-all"><div className="flex items-start justify-between mb-2 gap-3"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-sm">{goal.title}</p>{goal.priority === "urgent" && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">URGENT</span>}</div><p className="text-xs text-muted-foreground">{goal.category}{goal.subcategory ? ` • ${goal.subcategory}` : ""}</p>{assignedWallet ? <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><Wallet className="w-3 h-3" />Saved in {walletName(assignedWallet)} • {fmt(walletBalances[walletId(assignedWallet)] || 0)}</p> : null}</div><div className="text-right shrink-0"><p className="font-heading font-bold text-sm text-primary">{fmt(saved)}</p><p className="text-xs text-muted-foreground">of {fmt(target)}</p></div></div><div className="h-2.5 bg-muted rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full progress-bar ${pct >= 100 ? "bg-primary" : "bg-accent"}`} style={{ width: `${pct}%` }} /></div><div className="flex justify-between text-xs text-muted-foreground gap-3"><span>{pct.toFixed(0)}% funded</span>{goal.planned_use_date ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{goal.planned_use_date}</span> : <span>No date</span>}<span>{fmt(remaining)} left</span></div></div>;
}

function GoalFormDialog({ open, editId, form, setForm, saving, error, onClose, onSave, onManageBalance, wallets, walletBalances, subcats, fmt }) {
  const isCustomCategory = form.category === OTHER_OPTION;
  const hasPresetCategory = Boolean(form.category && !isCustomCategory);
  const isCustomSubcategory = form.subcategory === OTHER_OPTION;
  const saveTapLockRef = useRef(0);

  const submitGoal = () => {
    const now = Date.now();
    if (saving || now - saveTapLockRef.current < 600) return;
    saveTapLockRef.current = now;
    onSave();
  };

  const updateCategory = (value) => {
    setForm({
      ...form,
      category: value,
      subcategory: "",
      custom_category: value === OTHER_OPTION ? form.custom_category || "" : "",
      custom_subcategory: "",
    });
  };

  const updateSubcategory = (value) => {
    setForm({
      ...form,
      subcategory: value,
      custom_subcategory: value === OTHER_OPTION ? form.custom_subcategory || "" : "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose(); }}>
      <DialogContent className={formDialogClass}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submitGoal();
          }}
          className="flex max-h-[inherit] min-h-0 flex-col"
        >
<DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12">
  <DialogTitle className="text-white text-xl sm:text-2xl leading-tight">
    {editId ? "Edit Savings Goal" : "New Savings Goal"}
  </DialogTitle>
</DialogHeader>

<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 pb-6">
  <div className="space-y-4">
    <FormInput label="Goal Title">
      <Input
        placeholder="e.g., Emergency Fund, Dream Vacation"
        className={inputDarkClass}
        value={form.title}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
      />
    </FormInput>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormInput label="Category">
        <div className="space-y-2">
          <Select value={form.category} onValueChange={updateCategory}>
            <SelectTrigger className={selectDarkTriggerClass}>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(CATEGORIES).map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
              <SelectItem value={OTHER_OPTION}>Other — type your own</SelectItem>
            </SelectContent>
          </Select>
          {isCustomCategory ? (
            <Input
              autoFocus
              placeholder="Type your specific category"
              className={inputDarkClass}
              value={form.custom_category || ""}
              onChange={(event) => setForm({ ...form, custom_category: event.target.value })}
            />
          ) : null}
        </div>
      </FormInput>

      {isCustomCategory ? (
        <FormInput label="Specific Detail">
          <Input
            placeholder="Optional: describe it more specifically"
            className={inputDarkClass}
            value={form.custom_subcategory || ""}
            onChange={(event) => setForm({ ...form, custom_subcategory: event.target.value })}
          />
        </FormInput>
      ) : (
        <FormInput label="Subcategory">
          <div className="space-y-2">
            <Select
              value={form.subcategory}
              onValueChange={updateSubcategory}
              disabled={!hasPresetCategory}
            >
              <SelectTrigger className={selectDarkTriggerClass}>
                <SelectValue placeholder="Select subcategory..." />
              </SelectTrigger>
              <SelectContent>
                {subcats.map((subcat) => (
                  <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                ))}
                {hasPresetCategory ? (
                  <SelectItem value={OTHER_OPTION}>Other — type your own</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            {isCustomSubcategory ? (
              <Input
                autoFocus
                placeholder="Type your specific subcategory"
                className={inputDarkClass}
                value={form.custom_subcategory || ""}
                onChange={(event) => setForm({ ...form, custom_subcategory: event.target.value })}
              />
            ) : null}
          </div>
        </FormInput>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormInput label="Target Amount">
        <Input type="number" className={inputDarkClass} value={form.target_amount} onChange={(event) => setForm({ ...form, target_amount: event.target.value })} />
      </FormInput>
      {editId ? (
        <FormInput label="Protected Savings">
          <div className="rounded-xl border border-green-300/15 bg-green-400/[0.07] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3"><p className="font-bold text-green-100">{fmt(form.saved_amount)}</p><span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/55">Managed</span></div>
            <p className="mt-1 text-[11px] leading-4 text-white/50">Use Add, Release, Use, or Correct so CLARA can update protection and history safely.</p>
            <Button type="button" onClick={onManageBalance} className="mt-2 h-8 w-full rounded-lg border border-green-300/20 bg-green-500/12 text-xs font-bold text-green-100 hover:bg-green-500/20">Manage Saved Amount</Button>
          </div>
        </FormInput>
      ) : (
        <FormInput label="Already Saved"><Input type="number" className={inputDarkClass} value={form.saved_amount} onChange={(event) => setForm({ ...form, saved_amount: event.target.value })} /></FormInput>
      )}
    </div>

    <FormInput label="Saved in">
      <Select value={form.wallet_id} onValueChange={(value) => setForm({ ...form, wallet_id: value })}>
        <SelectTrigger className={selectDarkTriggerClass}>
          <SelectValue placeholder="Select wallet..." />
        </SelectTrigger>
        <SelectContent>
          {wallets.length === 0 ? (
            <SelectItem value="__no_wallets__" disabled>No wallets available</SelectItem>
          ) : wallets.map((wallet) => (
            <SelectItem key={walletId(wallet)} value={walletId(wallet)}>
              {wallet.icon ? `${wallet.icon} ` : ""}{walletName(wallet)} • {fmt(walletBalances[walletId(wallet)] || 0)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormInput>

    <FormInput label="Planned Use Date">
      <input
        type="date"
        value={form.planned_use_date}
        onChange={(event) => setForm({ ...form, planned_use_date: event.target.value })}
        className="w-full h-10 px-3 rounded-xl bg-[#0b1a2f] border border-white/10 text-white cursor-pointer outline-none focus:ring-1 focus:ring-green-500/60"
      />
    </FormInput>

    <FormInput label="3 Reasons / Motivations">
      <div className="space-y-2">
        {form.reasons.map((reason, index) => (
          <Input
            key={index}
            placeholder={`Reason ${index + 1}`}
            className={inputDarkClass}
            value={reason}
            onChange={(event) => {
              const next = [...form.reasons];
              next[index] = event.target.value;
              setForm({ ...form, reasons: next });
            }}
          />
        ))}
      </div>
    </FormInput>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormInput label="Emotional Value">
        <Select value={form.emotional_value} onValueChange={(value) => setForm({ ...form, emotional_value: value })}>
          <SelectTrigger className={selectDarkTriggerClass}><SelectValue /></SelectTrigger>
          <SelectContent>
            {EMOTIONAL_VALUES.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormInput>
      <FormInput label="Priority">
        <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
          <SelectTrigger className={selectDarkTriggerClass}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormInput>
    </div>

    <FormInput label="Notes">
      <Textarea className={`${inputDarkClass} min-h-[92px]`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
    </FormInput>

  </div>
</div>

<div className="relative z-[80] shrink-0 border-t border-white/10 bg-[#061224] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 pointer-events-auto touch-manipulation [transform:translateZ(0)]">
  {error ? (
    <div role="alert" aria-live="assertive" className="mb-2 rounded-xl border border-rose-300/25 bg-rose-400/[0.12] px-3 py-2.5 text-sm font-semibold text-rose-100">
      {error}
    </div>
  ) : null}
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button type="button" onClick={onClose} disabled={saving} variant="ghost" className="relative z-[1] h-11 touch-manipulation rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50 pointer-events-auto">Cancel</Button>
    <Button
      type="submit"
      data-savings-goal-submit
      onPointerUp={(event) => {
        if (event.pointerType === "touch") {
          event.preventDefault();
          submitGoal();
        }
      }}
      disabled={saving}
      className="relative z-[1] h-11 touch-manipulation rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50 pointer-events-auto"
    >
      {saving ? "Saving..." : editId ? "Update Goal" : "Create Goal"}
    </Button>
  </div>
</div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WalletBalanceSyncPrompt({ prompt, fmt, saving, error, onCancel, onConfirm }) {
  const goal = prompt?.goal || null;
  const wallet = prompt?.wallet || null;
  const amount = toNumber(prompt?.amount);
  const balance = toNumber(prompt?.walletBalance ?? wallet?.balance);

  return <Dialog open={Boolean(prompt)} onOpenChange={(value) => { if (!value && !saving) onCancel?.(); }}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Mark wallet money as saved?</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-green-300/15 bg-green-400/[0.07] p-4"><p className="text-sm leading-6 text-white/75">This goal is saved in <span className="font-bold text-white">{walletName(wallet)}</span>. That wallet already has <span className="font-bold text-green-100">{fmt(balance)}</span>.</p><p className="mt-3 text-lg font-heading font-bold leading-7 text-white">Mark {fmt(amount)} as saved for {goal?.title || "this goal"}?</p></div><p className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-white/55">This will not move money or create a transaction. It only protects the existing wallet balance for this goal. CLARA will only ask again if you change the saved-in wallet.</p>{error ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{error}</div> : null}</div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={onCancel} disabled={saving} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Not now</Button><Button type="button" onClick={onConfirm} disabled={saving || amount <= 0} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{saving ? "Marking..." : "Mark as Saved"}</Button></div></div></div></DialogContent></Dialog>;
}

function FormInput({ label, children }) {
  return <div><Label className={labelDarkClass}>{label}</Label>{children}</div>;
}

function GoalDetail({ goal, wallets, walletBalances, walletAvailableBalances, walletCapacity, walletSyncSuggestion, onOpenWalletSyncPrompt, onClose, onEdit, onDelete, onAddSavings, onReleaseSavings, onCorrectSavingsBalance, onUseSavings, totalIncome, fmt }) {
  const [addSavingsOpen, setAddSavingsOpen] = useState(false);
  const [useSavingsOpen, setUseSavingsOpen] = useState(false);
  const [overAmountOpen, setOverAmountOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [sourceWalletId, setSourceWalletId] = useState(goal?.wallet_id ? String(goal.wallet_id) : "");
  const [useAmount, setUseAmount] = useState("");
  const [useReason, setUseReason] = useState("");
  const [savingAmount, setSavingAmount] = useState(false);
  const [addError, setAddError] = useState("");
  const [useError, setUseError] = useState("");
  const [releaseSavingsOpen, setReleaseSavingsOpen] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseError, setReleaseError] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctedAmount, setCorrectedAmount] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const saved = toNumber(goal?.saved_amount);
  const target = toNumber(goal?.target_amount);
  const remaining = Math.max(target - saved, 0);
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const assignedWallet = wallets.find((wallet) => walletId(wallet) === String(goal?.wallet_id));
  const sourceWallet = wallets.find((wallet) => walletId(wallet) === String(sourceWalletId));
  const assignedWalletBalance = assignedWallet ? walletBalances[walletId(assignedWallet)] ?? toNumber(assignedWallet.balance) : 0;
  const safeWalletCapacity = Math.max(toNumber(walletCapacity), 0);
  const hasBalanceMismatch = Boolean(
    assignedWallet && toMinorUnits(saved) > toMinorUnits(safeWalletCapacity),
  );
  const sourceWalletBalance = sourceWallet ? walletAvailableBalances[walletId(sourceWallet)] ?? 0 : 0;
  const cleanReasons = Array.isArray(goal?.reasons) ? goal.reasons.filter((reason) => String(reason || "").trim()) : [];
  const activity = getGoalActivity(goal);
  const requestedAddAmount = toNumber(amount);
  const cappedAddAmount = requestedAddAmount > 0 ? Math.min(requestedAddAmount, remaining) : 0;
  const addExceedsRemaining = requestedAddAmount > remaining && remaining > 0;

  useEffect(() => {
    if (!sourceWalletId && assignedWallet?.id) setSourceWalletId(walletId(assignedWallet));
    else if (!sourceWalletId && wallets?.[0]?.id) setSourceWalletId(walletId(wallets[0]));
  }, [assignedWallet, sourceWalletId, wallets]);

  const runAddSavings = async (forcedAmount = null) => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setAddError("");
      await onAddSavings(goal, amount, sourceWalletId, forcedAmount);
      setAmount("");
      setOverAmountOpen(false);
      setAddSavingsOpen(false);
    } catch (error) {
      console.error("Failed to add savings:", error);
      setAddError(error?.message || "CLARA could not add this savings amount yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };
  const handleSubmitAddSavings = async () => {
    if (addExceedsRemaining) {
      setOverAmountOpen(true);
      return;
    }
    await runAddSavings();
  };
  const handleSubmitUseSavings = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setUseError("");
      await onUseSavings(goal, useAmount, useReason);
      setUseAmount("");
      setUseReason("");
      setUseSavingsOpen(false);
    } catch (error) {
      console.error("Failed to use savings:", error);
      setUseError(error?.message || "CLARA could not use this savings amount yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };

  const handleSubmitReleaseSavings = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setReleaseError("");
      await onReleaseSavings(goal, releaseAmount, releaseReason);
      setReleaseAmount("");
      setReleaseReason("");
      setReleaseSavingsOpen(false);
    } catch (error) {
      console.error("Failed to release savings:", error);
      setReleaseError(error?.message || "CLARA could not release this savings amount yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };

  const handleSubmitCorrection = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setCorrectionError("");
      await onCorrectSavingsBalance(goal, correctedAmount, correctionReason);
      setCorrectedAmount("");
      setCorrectionReason("");
      setCorrectionOpen(false);
    } catch (error) {
      console.error("Failed to correct savings balance:", error);
      setCorrectionError(error?.message || "CLARA could not correct this savings balance yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };

  return <>
    <Dialog open={Boolean(goal)} onOpenChange={(value) => !value && !savingAmount && onClose()}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">{goal?.title || "Savings Goal"}</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.category || "Uncategorized"}{goal?.subcategory ? ` • ${goal.subcategory}` : ""}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-start justify-between gap-3 mb-3"><div><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold">Progress</p><p className="text-2xl font-heading font-bold text-white">{pct.toFixed(0)}%</p></div><div className="text-right"><p className="text-[11px] text-white/50">Saved</p><p className="text-lg font-bold text-green-300">{fmt(saved)}</p></div></div><div className="h-3 rounded-full bg-white/10 overflow-hidden mb-3"><div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} /></div><div className="grid grid-cols-2 gap-3 text-sm"><InfoMini label="Target" value={fmt(target)} /><InfoMini label="Remaining" value={fmt(remaining)} /></div></div>{hasBalanceMismatch ? <div className="rounded-2xl border border-rose-300/25 bg-rose-400/[0.1] p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" /><div><p className="text-sm font-bold text-rose-50">Savings balance needs correction</p><p className="mt-1 text-xs leading-5 text-rose-100/70">This goal records {fmt(saved)}, but this wallet can safely support only {fmt(safeWalletCapacity)} after other protected money.</p></div></div><Button type="button" onClick={() => { setCorrectedAmount(String(Math.min(saved, safeWalletCapacity))); setCorrectionReason(""); setCorrectionError(""); setCorrectionOpen(true); }} className="mt-3 h-9 w-full rounded-xl border border-rose-200/20 bg-rose-400/15 text-xs font-bold text-rose-50 hover:bg-rose-400/20">Correct Balance</Button></div> : null}<InfoBlock title="Saved in">{assignedWallet ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 text-green-300" /></div><div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{assignedWallet.icon ? `${assignedWallet.icon} ` : ""}{walletName(assignedWallet)}</p><p className="text-xs text-white/45">Money lives here</p></div></div><p className="text-sm font-bold text-white shrink-0">{fmt(assignedWalletBalance)}</p></div>{walletSyncSuggestion?.suggestedAmount > 0 ? <Button type="button" onClick={() => onOpenWalletSyncPrompt?.(goal)} className="h-9 w-full rounded-xl bg-green-500/14 text-green-100 border border-green-300/20 hover:bg-green-500/20 hover:text-white text-xs font-bold">Mark {fmt(walletSyncSuggestion.suggestedAmount)} as saved</Button> : null}</div> : <p className="text-sm text-white/55">No saved-in wallet assigned. Edit this goal to assign one.</p>}</InfoBlock>{goal?.planned_use_date && <InfoBlock title="Planned Use Date"><p className="text-sm text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-green-300" />{goal.planned_use_date}</p></InfoBlock>}{cleanReasons.length > 0 && <InfoBlock title="Reasons / Motivations"><div className="space-y-2">{cleanReasons.map((reason, index) => <div key={`${reason}_${index}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80">{reason}</div>)}</div></InfoBlock>}{activity.length > 0 && <InfoBlock title="Goal Activity"><div className="space-y-2">{activity.slice(0, 4).map((entry) => <div key={entry.id || `${entry.type}-${entry.createdAt}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80"><div className="flex justify-between gap-3"><span>{entry.title || "Savings activity"}</span><span className={entry.type === "use" || entry.type === "release" ? "text-amber-200" : entry.type === "correction" ? "text-sky-200" : "text-green-200"}>{entry.type === "correction" ? `${fmt(entry.previousAmount ?? entry.previous_amount)} → ${fmt(entry.correctedAmount ?? entry.corrected_amount)}` : `${entry.type === "use" || entry.type === "release" ? "-" : "+"}${fmt(entry.amount)}`}</span></div>{entry.reason || entry.note ? <p className="mt-1 text-xs text-white/45">{entry.reason || entry.note}</p> : null}</div>)}</div></InfoBlock>}{goal?.notes && <InfoBlock title="Notes"><p className="text-sm text-white/75 whitespace-pre-wrap">{goal.notes}</p></InfoBlock>}{toNumber(totalIncome) > 0 && <div className="rounded-2xl border border-green-400/15 bg-green-400/[0.06] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-green-200/80 font-semibold mb-1">CLARA Note</p><p className="text-sm text-white/70">Add only what your wallet can safely support. Small, consistent top-ups are better than forcing a big amount.</p></div>}</div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => onEdit(goal)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"><Edit className="w-4 h-4 mr-2" />Edit</Button><Button type="button" onClick={() => { setAmount(""); setAddError(""); setSourceWalletId(goal?.wallet_id || walletId(wallets?.[0])); setAddSavingsOpen(true); }} disabled={remaining <= 0} className="h-10 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50"><Plus className="w-4 h-4 mr-2" />Add Savings</Button><Button type="button" onClick={() => { setUseAmount(""); setUseReason(""); setUseError(""); setUseSavingsOpen(true); }} disabled={saved <= 0 || !assignedWallet} className="h-10 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"><MinusCircle className="w-4 h-4 mr-2" />Use Savings</Button><Button type="button" onClick={() => { setReleaseAmount(""); setReleaseReason(""); setReleaseError(""); setReleaseSavingsOpen(true); }} disabled={saved <= 0} className="h-10 rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15 disabled:opacity-50">Release Savings</Button><Button type="button" onClick={() => { setCorrectedAmount(String(saved)); setCorrectionReason(""); setCorrectionError(""); setCorrectionOpen(true); }} className="h-10 rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15">Correct Balance</Button><Button type="button" onClick={() => onDelete(goal)} variant="ghost" className="h-10 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"><Trash2 className="w-4 h-4 mr-2" />Delete</Button><Button type="button" onClick={onClose} variant="ghost" className="col-span-2 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white">Close</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={addSavingsOpen} onOpenChange={(value) => { if (savingAmount) return; setAddSavingsOpen(value); if (!value) { setOverAmountOpen(false); setAddError(""); } }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Add Savings</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex justify-between gap-3 text-sm"><div><p className="text-white/45 text-[11px] uppercase font-semibold">Remaining</p><p className="font-bold text-white">{fmt(remaining)}</p></div><div className="text-right"><p className="text-white/45 text-[11px] uppercase font-semibold">Available to Save</p><p className="font-bold text-white">{fmt(sourceWalletBalance)}</p></div></div></div><FormInput label="Take from wallet"><Select value={sourceWalletId} onValueChange={setSourceWalletId}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Choose wallet..." /></SelectTrigger><SelectContent>{wallets.map((wallet) => <SelectItem key={walletId(wallet)} value={walletId(wallet)}>{wallet.icon ? `${wallet.icon} ` : ""}{walletName(wallet)} • {fmt(walletBalances[walletId(wallet)] || 0)}</SelectItem>)}</SelectContent></Select></FormInput><FormInput label="Amount to Add"><Input type="number" placeholder="Enter amount" className={inputDarkClass} value={amount} onChange={(e) => { setAmount(e.target.value); setAddError(""); }} autoFocus /></FormInput>{addError ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{addError}</div> : null}<p className="text-xs text-white/50">This will use money from {sourceWallet ? walletName(sourceWallet) : "the selected wallet"}. The saved amount lives in {assignedWallet ? walletName(assignedWallet) : "the saved-in wallet"}.</p></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setAddSavingsOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={handleSubmitAddSavings} disabled={savingAmount || !sourceWallet || remaining <= 0 || requestedAddAmount <= 0} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{savingAmount ? "Adding..." : "Add Savings"}</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={overAmountOpen} onOpenChange={(value) => { if (!savingAmount) setOverAmountOpen(value); }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Too much savings amount</DialogTitle></DialogHeader><div className="px-4 sm:px-5 py-4"><div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] p-4 text-sm font-semibold leading-6 text-amber-50/90"><p>You entered <span className="font-black text-white">{fmt(requestedAddAmount)}</span>, but this goal only needs <span className="font-black text-white">{fmt(cappedAddAmount)}</span> more.</p><p className="mt-2">Please enter <span className="font-black text-white">{fmt(cappedAddAmount)}</span> or less to complete this goal.</p></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setOverAmountOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={() => runAddSavings(cappedAddAmount)} disabled={savingAmount} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{savingAmount ? "Adding..." : `Use ${fmt(cappedAddAmount)} only`}</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={useSavingsOpen} onOpenChange={(value) => { if (!savingAmount) { setUseSavingsOpen(value); if (!value) setUseError(""); } }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Use Savings</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] p-4 text-sm text-white/75">This records a real expense from {assignedWallet ? walletName(assignedWallet) : "the saved-in wallet"} and reduces this goal. Current saved: <span className="font-bold text-amber-100">{fmt(saved)}</span></div><FormInput label="Amount to use"><Input type="number" className={inputDarkClass} value={useAmount} onChange={(e) => { setUseAmount(e.target.value); setUseError(""); }} autoFocus /></FormInput><FormInput label="Reason / purpose"><Input placeholder="What will you use it for?" className={inputDarkClass} value={useReason} onChange={(e) => { setUseReason(e.target.value); setUseError(""); }} /></FormInput>{useError ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{useError}</div> : null}</div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setUseSavingsOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={handleSubmitUseSavings} disabled={savingAmount || saved <= 0 || !assignedWallet} className="h-10 rounded-xl bg-amber-500 px-4 text-white font-semibold hover:bg-amber-600 disabled:opacity-50">{savingAmount ? "Saving..." : "Use Savings"}</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={releaseSavingsOpen} onOpenChange={(value) => { if (!savingAmount) { setReleaseSavingsOpen(value); if (!value) setReleaseError(""); } }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Release Savings</DialogTitle><p className="mt-1 text-xs text-white/50">{goal?.title}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"><div className="space-y-4"><div className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.07] p-4 text-sm leading-6 text-white/75">This removes protection from part of the saved amount. It does not spend or move wallet money. The released amount becomes normally spendable again.</div><FormInput label="Amount to release"><Input type="number" className={inputDarkClass} value={releaseAmount} onChange={(event) => { setReleaseAmount(event.target.value); setReleaseError(""); }} autoFocus /></FormInput><FormInput label="Reason"><Input placeholder="Why are you releasing this money?" className={inputDarkClass} value={releaseReason} onChange={(event) => { setReleaseReason(event.target.value); setReleaseError(""); }} /></FormInput>{releaseError ? <div role="alert" className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{releaseError}</div> : null}<p className="text-xs text-white/45">Current protected savings: {fmt(saved)}</p></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 py-3 sm:px-5"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setReleaseSavingsOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80">Cancel</Button><Button type="button" onClick={handleSubmitReleaseSavings} disabled={savingAmount || saved <= 0} className="h-10 rounded-xl bg-sky-500 px-4 font-semibold text-white hover:bg-sky-600 disabled:opacity-50">{savingAmount ? "Releasing..." : "Release Savings"}</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={correctionOpen} onOpenChange={(value) => { if (!savingAmount) { setCorrectionOpen(value); if (!value) setCorrectionError(""); } }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Correct Saved Balance</DialogTitle><p className="mt-1 text-xs text-white/50">Record repair only</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"><div className="space-y-4"><div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.07] p-4 text-sm leading-6 text-white/75">Use this only when CLARA's recorded saved amount is incorrect. This does not add money, move money, or create an expense.</div><div className="grid grid-cols-2 gap-3"><InfoMini label="Recorded" value={fmt(saved)} /><InfoMini label="Wallet can support" value={fmt(safeWalletCapacity)} /></div><FormInput label="Correct saved balance"><Input type="number" className={inputDarkClass} value={correctedAmount} onChange={(event) => { setCorrectedAmount(event.target.value); setCorrectionError(""); }} autoFocus /></FormInput><FormInput label="Correction reason"><Input placeholder="What caused the mismatch?" className={inputDarkClass} value={correctionReason} onChange={(event) => { setCorrectionReason(event.target.value); setCorrectionError(""); }} /></FormInput>{correctionError ? <div role="alert" className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{correctionError}</div> : null}</div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 py-3 sm:px-5"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setCorrectionOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80">Cancel</Button><Button type="button" onClick={handleSubmitCorrection} disabled={savingAmount} className="h-10 rounded-xl bg-violet-500 px-4 font-semibold text-white hover:bg-violet-600 disabled:opacity-50">{savingAmount ? "Correcting..." : "Apply Correction"}</Button></div></div></div></DialogContent></Dialog>
  </>;
}


function SavingsDeleteConfirmDialog({ goal, wallets, saving, error, fmt, onClose, onConfirm }) {
  if (!goal) return null;
  const saved = getGoalSavedAmount(goal);
  const assignedWallet = wallets.find((wallet) => walletId(wallet) === walletId(goal?.wallet_id || goal?.walletId || ""));

  return <Dialog open={Boolean(goal)} onOpenChange={(value) => { if (!value && !saving) onClose?.(); }}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Delete Savings Goal?</DialogTitle></DialogHeader><div className="space-y-4 px-4 sm:px-5 py-4"><div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm font-semibold leading-6 text-rose-50/90">This removes <span className="font-black text-white">{goal.title || "this goal"}</span> and its private activity log.</div><p className="text-sm font-semibold leading-6 text-white/65">{saved > 0 ? `${fmt(saved)} will remain in ${assignedWallet ? walletName(assignedWallet) : "its wallet"} and become normally spendable again.` : "No wallet money will be removed."}</p>{error ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{error}</div> : null}</div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick={onClose} disabled={saving} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={onConfirm} disabled={saving} className="h-10 rounded-xl border border-rose-300/20 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20 disabled:opacity-50">{saving ? "Deleting..." : "Delete Goal"}</Button></div></div></div></DialogContent></Dialog>;
}

function InfoMini({ label, value }) {
  return <div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] uppercase text-white/45 font-semibold">{label}</p><p className="font-bold text-white">{value}</p></div>;
}

function InfoBlock({ title, children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">{title}</p>{children}</div>;
}
