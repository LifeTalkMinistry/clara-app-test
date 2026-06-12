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

const CATEGORIES = {
  "Celebrations & Gifts": ["Birthday", "Wedding", "Anniversary", "Holiday", "Family Event"],
  "Personal Purchases": ["Gadget", "Clothing", "Furniture", "Vehicle"],
  Experiences: ["Travel", "Vacation", "Concert", "Retreat"],
  "Financial / Protection": ["Emergency Fund", "Insurance", "Investment", "Debt Payment"],
  "Health & Wellness": ["Medical", "Self-Care", "Gym", "Mental Health"],
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
const getGoalActivity = (goal) => {
  const source = goal?.savingsActivityLog || goal?.savings_activity_log || goal?.activityLog || goal?.activity_log || [];
  return Array.isArray(source) ? source.filter(Boolean) : [];
};
const getGoalSavedAmount = (goal) => firstNumber(goal?.saved_amount, goal?.savedAmount, goal?.current_amount, goal?.currentAmount, goal?.saved, goal?.amount_saved, goal?.amountSaved);
const getGoalTargetAmount = (goal) => firstNumber(goal?.target_amount, goal?.targetAmount, goal?.target, goal?.amount_target, goal?.amountTarget);
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
    transferBetweenWallets,
    refreshData,
  } = data || {};

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [walletSyncPrompt, setWalletSyncPrompt] = useState(null);
  const [walletSyncSaving, setWalletSyncSaving] = useState(false);

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
    const otherGoalProtectedInSameWallet = goals
      .filter((item) => String(item.id) !== String(goal.id))
      .filter((item) => walletId(item.wallet_id) === goalWalletId)
      .reduce((sum, item) => sum + toNumber(item.saved_amount), 0);
    const availableWalletBalanceForThisGoal = Math.max(walletBalance - otherGoalProtectedInSameWallet, 0);
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
    setWalletSyncPrompt({
      goal: normalizeGoal(goal),
      wallet: suggestion.wallet,
      amount: suggestion.suggestedAmount,
      walletBalance: suggestion.walletBalance,
      remainingGoalAmount: suggestion.remainingGoalAmount,
    });
  };

  const openAdd = () => {
    setDetailGoal(null);
    setForm(EMPTY_FORM);
    setEditId(null);
    setOpen(true);
  };
  const closeFormModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };
  const openEdit = (goal) => {
    setForm({
      title: goal.title || "",
      category: goal.category || "",
      subcategory: goal.subcategory || "",
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
      openAdd();
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
    if (!user?.id && !user?.email) return alert("No user found. Please log in again.");
    if (!form.title?.trim()) return alert("Please enter a goal title.");
    if (!form.target_amount || toNumber(form.target_amount) <= 0) return alert("Please enter a valid target amount.");
    if (form.wallet_id === "__no_wallets__") return alert("Please select a valid wallet.");
    try {
      setSaving(true);
      const now = new Date().toISOString();
      const existing = editId ? goals.find((goal) => String(goal.id) === String(editId)) : null;
      const payload = normalizeGoal({
        ...(existing || {}),
        id: editId || generateId(),
        title: form.title.trim(),
        category: form.category || "",
        subcategory: form.subcategory || "",
        target_amount: toNumber(form.target_amount),
        saved_amount: Math.max(0, toNumber(form.saved_amount)),
        current_amount: Math.max(0, toNumber(form.saved_amount)),
        savedAmount: Math.max(0, toNumber(form.saved_amount)),
        currentAmount: Math.max(0, toNumber(form.saved_amount)),
        planned_use_date: form.planned_use_date || "",
        reasons: form.reasons,
        emotional_value: form.emotional_value || "joy",
        flexibility: form.flexibility || "flexible",
        priority: form.priority || "medium",
        notes: form.notes || "",
        wallet_id: form.wallet_id && form.wallet_id !== "__no_wallets__" ? form.wallet_id : "",
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
      if (editId) await updateSavingsGoal(payload.id, payload);
      else await addSavingsGoal(payload);
      await refreshData?.();
      const suggestion = getWalletBalanceSyncSuggestion(payload);
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
      console.error("Failed to save savings goal:", error);
      alert(error?.message || "Failed to save goal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSavingsGoal(id);
      setDetailGoal((prev) => (String(prev?.id) === String(id) ? null : prev));
      await refreshData?.();
    } catch (error) {
      console.error("Failed to delete savings goal:", error);
      alert(error?.message || "Failed to delete goal.");
    }
  };

  const buildActivity = (goal, entry) => [entry, ...getGoalActivity(goal)].slice(0, 80);

  const handleConfirmWalletBalanceSync = async () => {
    if (!walletSyncPrompt || walletSyncSaving) return;

    const promptGoal = normalizeGoal(walletSyncPrompt.goal);
    const goal = goals.find((item) => String(item.id) === String(promptGoal.id)) || promptGoal;
    const suggestion = getWalletBalanceSyncSuggestion(goal);
    if (!suggestion) {
      setWalletSyncPrompt(null);
      return;
    }

    const amount = Math.min(toNumber(walletSyncPrompt.amount), toNumber(suggestion.suggestedAmount));
    if (amount <= 0) {
      setWalletSyncPrompt(null);
      return;
    }

    try {
      setWalletSyncSaving(true);
      const now = new Date().toISOString();
      const currentSaved = toNumber(goal.saved_amount);
      const target = toNumber(goal.target_amount);
      const nextSaved = Math.min(currentSaved + amount, target);
      const wallet = suggestion.wallet;
      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: buildActivity(goal, {
          id: `savings_wallet_sync_${Date.now()}`,
          type: "wallet_sync",
          title: "Wallet balance marked as savings",
          amount,
          storageWalletId: walletId(wallet),
          storage_wallet_id: walletId(wallet),
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
      await refreshData?.();
      setDetailGoal(updatedGoal);
      setWalletSyncPrompt(null);
    } catch (error) {
      console.error("Failed to sync wallet balance to savings goal:", error);
      alert(error?.message || "Failed to mark wallet money as saved.");
    } finally {
      setWalletSyncSaving(false);
    }
  };

  const handleAddSavings = async (goal, inputAmount, sourceWalletId, forcedAmount = null) => {
    const requestedAmount = toNumber(inputAmount);
    const safeAmount = forcedAmount != null ? toNumber(forcedAmount) : requestedAmount;
    if (!safeAmount || safeAmount <= 0) return alert("Please enter a valid amount.");
    const sourceWallet = activeWallets.find((wallet) => walletId(wallet) === String(sourceWalletId));
    if (!sourceWallet) return alert("Please choose a valid source wallet.");
    const currentSaved = toNumber(goal.saved_amount);
    const targetAmount = toNumber(goal.target_amount);
    const remaining = Math.max(targetAmount - currentSaved, 0);
    if (remaining <= 0) return alert("This goal is already fully funded.");
    const finalAmount = Math.min(safeAmount, remaining);
    const sourceBalance = walletBalances[walletId(sourceWallet)] ?? toNumber(sourceWallet.balance);
    if (finalAmount > sourceBalance) return alert("Not enough balance in the selected wallet.");
    const savedInWalletId = goal.wallet_id || walletId(sourceWallet);
    const savedInWallet = activeWallets.find((wallet) => walletId(wallet) === savedInWalletId) || sourceWallet;
    if (walletId(sourceWallet) !== walletId(savedInWallet)) {
      if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
      await transferBetweenWallets({
        from_wallet_id: walletId(sourceWallet),
        to_wallet_id: walletId(savedInWallet),
        amount: finalAmount,
        note: `Savings goal funding: ${goal.title}`,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
    }
    const now = new Date().toISOString();
    const nextSaved = Math.min(currentSaved + finalAmount, targetAmount);
    const updatedGoal = normalizeGoal({
      ...goal,
      wallet_id: walletId(savedInWallet),
      saved_amount: nextSaved,
      current_amount: nextSaved,
      savedAmount: nextSaved,
      currentAmount: nextSaved,
      savingsActivityLog: buildActivity(goal, {
        id: `savings_add_${Date.now()}`,
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
        note: walletId(sourceWallet) === walletId(savedInWallet) ? `Protected in ${walletName(savedInWallet)}` : `Moved from ${walletName(sourceWallet)} to ${walletName(savedInWallet)}`,
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
    await refreshData?.();
    setDetailGoal(updatedGoal);
    return updatedGoal;
  };

  const handleUseSavings = async (goal, amount, reason) => {
    const safeAmount = toNumber(amount);
    const cleanReason = String(reason || "").trim();
    if (!safeAmount || safeAmount <= 0) return alert("Please enter a valid amount.");
    if (safeAmount > toNumber(goal.saved_amount)) return alert("Amount cannot exceed current saved amount.");
    if (!cleanReason) return alert("Please enter a reason or purpose.");
    const now = new Date().toISOString();
    const nextSaved = Math.max(toNumber(goal.saved_amount) - safeAmount, 0);
    const updatedGoal = normalizeGoal({
      ...goal,
      saved_amount: nextSaved,
      current_amount: nextSaved,
      savedAmount: nextSaved,
      currentAmount: nextSaved,
      savingsActivityLog: buildActivity(goal, {
        id: `savings_use_${Date.now()}`,
        type: "use",
        title: "Savings used",
        amount: safeAmount,
        reason: cleanReason,
        note: cleanReason,
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
    await refreshData?.();
    setDetailGoal(updatedGoal);
    return updatedGoal;
  };

  if (accessLoading) return <FeaturePageLoader label="Preparing savings goals..." />;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return <div className="p-4 md:p-6 max-w-4xl mx-auto">
    <div className="mb-3"><Button type="button" variant="ghost" onClick={handleBack} className="h-9 rounded-xl px-3 text-muted-foreground hover:text-foreground hover:bg-muted/70"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></div>
    <PageHeader title="Savings Goals" subtitle="Plan and track what matters most" action={<Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />New Goal</Button>} />
    {goals.length > 0 && <div className="grid grid-cols-3 gap-3 mb-4"><StatCard label="Saved" value={fmt(totalSaved)} tone="green" /><StatCard label="Target" value={fmt(totalTarget)} tone="yellow" /><StatCard label="Goals" value={goals.length} /></div>}
    {data?.totalIncome > 0 && retentionNum < 15 && totalTarget > 0 && <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200 mb-4 text-sm"><AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" /><p className="text-orange-700">Your leftover rate is below 15%. Save when your rate improves — your goals are aspirational for now.</p></div>}
    {goals.length === 0 ? <EmptyState icon={Target} title="No savings goals yet" description="Create your first goal — a dream fund, emergency reserve, or any planned expense." /> : <div className="space-y-3">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} wallets={activeWallets} walletBalances={walletBalances} fmt={fmt} onOpen={setDetailGoal} />)}</div>}
    <GoalFormDialog open={open} editId={editId} form={form} setForm={setForm} saving={saving} onClose={closeFormModal} onSave={handleSave} wallets={activeWallets} walletBalances={walletBalances} subcats={form.category ? CATEGORIES[form.category] || [] : []} fmt={fmt} />
    {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} walletSyncSuggestion={getWalletBalanceSyncSuggestion(detailGoal)} onOpenWalletSyncPrompt={openWalletSyncPromptForGoal} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={handleDelete} onAddSavings={handleAddSavings} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}
    <WalletBalanceSyncPrompt prompt={walletSyncPrompt} fmt={fmt} saving={walletSyncSaving} onCancel={() => setWalletSyncPrompt(null)} onConfirm={handleConfirmWalletBalanceSync} />
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

function GoalFormDialog({ open, editId, form, setForm, saving, onClose, onSave, wallets, walletBalances, subcats, fmt }) {
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">{editId ? "Edit Savings Goal" : "New Savings Goal"}</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><FormInput label="Goal Title"><Input placeholder="e.g., Emergency Fund, Dream Vacation" className={inputDarkClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormInput><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><FormInput label="Category"><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{Object.keys(CATEGORIES).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></FormInput><FormInput label="Subcategory"><Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })} disabled={!form.category}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{subcats.map((subcat) => <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>)}</SelectContent></Select></FormInput></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><FormInput label="Target Amount"><Input type="number" className={inputDarkClass} value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /></FormInput><FormInput label="Already Saved"><Input type="number" className={inputDarkClass} value={form.saved_amount} onChange={(e) => setForm({ ...form, saved_amount: e.target.value })} /></FormInput></div><FormInput label="Saved in"><Select value={form.wallet_id} onValueChange={(v) => setForm({ ...form, wallet_id: v })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Select wallet..." /></SelectTrigger><SelectContent>{wallets.length === 0 ? <SelectItem value="__no_wallets__" disabled>No wallets available</SelectItem> : wallets.map((wallet) => <SelectItem key={walletId(wallet)} value={walletId(wallet)}>{wallet.icon ? `${wallet.icon} ` : ""}{walletName(wallet)} • {fmt(walletBalances[walletId(wallet)] || 0)}</SelectItem>)}</SelectContent></Select></FormInput><FormInput label="Planned Use Date"><input type="date" value={form.planned_use_date} onChange={(e) => setForm({ ...form, planned_use_date: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-[#0b1a2f] border border-white/10 text-white cursor-pointer outline-none focus:ring-1 focus:ring-green-500/60" /></FormInput><FormInput label="3 Reasons / Motivations"><div className="space-y-2">{form.reasons.map((reason, index) => <Input key={index} placeholder={`Reason ${index + 1}`} className={inputDarkClass} value={reason} onChange={(e) => { const next = [...form.reasons]; next[index] = e.target.value; setForm({ ...form, reasons: next }); }} />)}</div></FormInput><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><FormInput label="Emotional Value"><Select value={form.emotional_value} onValueChange={(v) => setForm({ ...form, emotional_value: v })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{EMOTIONAL_VALUES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></FormInput><FormInput label="Priority"><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></FormInput></div><FormInput label="Notes"><Textarea className={`${inputDarkClass} min-h-[92px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormInput></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={onClose} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={onSave} disabled={saving} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{saving ? "Saving..." : editId ? "Update Goal" : "Create Goal"}</Button></div></div></div></DialogContent></Dialog>;
}

function WalletBalanceSyncPrompt({ prompt, fmt, saving, onCancel, onConfirm }) {
  const goal = prompt?.goal || null;
  const wallet = prompt?.wallet || null;
  const amount = toNumber(prompt?.amount);
  const balance = toNumber(prompt?.walletBalance ?? wallet?.balance);

  return <Dialog open={Boolean(prompt)} onOpenChange={(value) => { if (!value && !saving) onCancel?.(); }}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Mark wallet money as saved?</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-green-300/15 bg-green-400/[0.07] p-4"><p className="text-sm leading-6 text-white/75">This goal is saved in <span className="font-bold text-white">{walletName(wallet)}</span>. That wallet already has <span className="font-bold text-green-100">{fmt(balance)}</span>.</p><p className="mt-3 text-lg font-heading font-bold leading-7 text-white">Mark {fmt(amount)} as saved for {goal?.title || "this goal"}?</p></div><p className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-white/55">This will not move money or create a transaction. It only protects the existing wallet balance for this goal.</p></div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={onCancel} disabled={saving} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Not now</Button><Button type="button" onClick={onConfirm} disabled={saving || amount <= 0} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{saving ? "Marking..." : "Mark as Saved"}</Button></div></div></div></DialogContent></Dialog>;
}

function FormInput({ label, children }) {
  return <div><Label className={labelDarkClass}>{label}</Label>{children}</div>;
}

function GoalDetail({ goal, wallets, walletBalances, walletSyncSuggestion, onOpenWalletSyncPrompt, onClose, onEdit, onDelete, onAddSavings, onUseSavings, totalIncome, fmt }) {
  const [addSavingsOpen, setAddSavingsOpen] = useState(false);
  const [useSavingsOpen, setUseSavingsOpen] = useState(false);
  const [overAmountOpen, setOverAmountOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [sourceWalletId, setSourceWalletId] = useState(goal?.wallet_id ? String(goal.wallet_id) : "");
  const [useAmount, setUseAmount] = useState("");
  const [useReason, setUseReason] = useState("");
  const [savingAmount, setSavingAmount] = useState(false);
  const saved = toNumber(goal?.saved_amount);
  const target = toNumber(goal?.target_amount);
  const remaining = Math.max(target - saved, 0);
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const assignedWallet = wallets.find((wallet) => walletId(wallet) === String(goal?.wallet_id));
  const sourceWallet = wallets.find((wallet) => walletId(wallet) === String(sourceWalletId));
  const assignedWalletBalance = assignedWallet ? walletBalances[walletId(assignedWallet)] ?? toNumber(assignedWallet.balance) : 0;
  const sourceWalletBalance = sourceWallet ? walletBalances[walletId(sourceWallet)] ?? toNumber(sourceWallet.balance) : 0;
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
      await onAddSavings(goal, amount, sourceWalletId, forcedAmount);
      setAmount("");
      setOverAmountOpen(false);
      setAddSavingsOpen(false);
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
      await onUseSavings(goal, useAmount, useReason);
      setUseAmount("");
      setUseReason("");
      setUseSavingsOpen(false);
    } finally {
      setSavingAmount(false);
    }
  };

  return <>
    <Dialog open={Boolean(goal)} onOpenChange={(value) => !value && onClose()}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">{goal?.title || "Savings Goal"}</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.category || "Uncategorized"}{goal?.subcategory ? ` • ${goal.subcategory}` : ""}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-start justify-between gap-3 mb-3"><div><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold">Progress</p><p className="text-2xl font-heading font-bold text-white">{pct.toFixed(0)}%</p></div><div className="text-right"><p className="text-[11px] text-white/50">Saved</p><p className="text-lg font-bold text-green-300">{fmt(saved)}</p></div></div><div className="h-3 rounded-full bg-white/10 overflow-hidden mb-3"><div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} /></div><div className="grid grid-cols-2 gap-3 text-sm"><InfoMini label="Target" value={fmt(target)} /><InfoMini label="Remaining" value={fmt(remaining)} /></div></div><InfoBlock title="Saved in">{assignedWallet ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 text-green-300" /></div><div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{assignedWallet.icon ? `${assignedWallet.icon} ` : ""}{walletName(assignedWallet)}</p><p className="text-xs text-white/45">Money lives here</p></div></div><p className="text-sm font-bold text-white shrink-0">{fmt(assignedWalletBalance)}</p></div>{walletSyncSuggestion?.suggestedAmount > 0 ? <Button type="button" onClick={() => onOpenWalletSyncPrompt?.(goal)} className="h-9 w-full rounded-xl bg-green-500/14 text-green-100 border border-green-300/20 hover:bg-green-500/20 hover:text-white text-xs font-bold">Mark {fmt(walletSyncSuggestion.suggestedAmount)} as saved</Button> : null}</div> : <p className="text-sm text-white/55">No saved-in wallet assigned. Edit this goal to assign one.</p>}</InfoBlock>{goal?.planned_use_date && <InfoBlock title="Planned Use Date"><p className="text-sm text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-green-300" />{goal.planned_use_date}</p></InfoBlock>}{cleanReasons.length > 0 && <InfoBlock title="Reasons / Motivations"><div className="space-y-2">{cleanReasons.map((reason, index) => <div key={`${reason}_${index}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80">{reason}</div>)}</div></InfoBlock>}{activity.length > 0 && <InfoBlock title="Goal Activity"><div className="space-y-2">{activity.slice(0, 4).map((entry) => <div key={entry.id || `${entry.type}-${entry.createdAt}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80"><div className="flex justify-between gap-3"><span>{entry.title || "Savings activity"}</span><span className={entry.type === "use" ? "text-amber-200" : "text-green-200"}>{entry.type === "use" ? "-" : "+"}{fmt(entry.amount)}</span></div>{entry.reason || entry.note ? <p className="mt-1 text-xs text-white/45">{entry.reason || entry.note}</p> : null}</div>)}</div></InfoBlock>}{goal?.notes && <InfoBlock title="Notes"><p className="text-sm text-white/75 whitespace-pre-wrap">{goal.notes}</p></InfoBlock>}{toNumber(totalIncome) > 0 && <div className="rounded-2xl border border-green-400/15 bg-green-400/[0.06] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-green-200/80 font-semibold mb-1">CLARA Note</p><p className="text-sm text-white/70">Add only what your wallet can safely support. Small, consistent top-ups are better than forcing a big amount.</p></div>}</div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => onEdit(goal)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"><Edit className="w-4 h-4 mr-2" />Edit</Button><Button type="button" onClick={() => { setAmount(""); setSourceWalletId(goal?.wallet_id || walletId(wallets?.[0])); setAddSavingsOpen(true); }} disabled={remaining <= 0} className="h-10 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50"><Plus className="w-4 h-4 mr-2" />Add Savings</Button><Button type="button" onClick={() => { setUseAmount(""); setUseReason(""); setUseSavingsOpen(true); }} disabled={saved <= 0} className="h-10 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"><MinusCircle className="w-4 h-4 mr-2" />Use Savings</Button><Button type="button" onClick={() => onDelete(goal.id)} variant="ghost" className="h-10 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"><Trash2 className="w-4 h-4 mr-2" />Delete</Button><Button type="button" onClick={onClose} variant="ghost" className="col-span-2 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white">Close</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={addSavingsOpen} onOpenChange={(value) => { setAddSavingsOpen(value); if (!value) setOverAmountOpen(false); }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Add Savings</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex justify-between gap-3 text-sm"><div><p className="text-white/45 text-[11px] uppercase font-semibold">Remaining</p><p className="font-bold text-white">{fmt(remaining)}</p></div><div className="text-right"><p className="text-white/45 text-[11px] uppercase font-semibold">Wallet Balance</p><p className="font-bold text-white">{fmt(sourceWalletBalance)}</p></div></div></div><FormInput label="Take from wallet"><Select value={sourceWalletId} onValueChange={setSourceWalletId}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Choose wallet..." /></SelectTrigger><SelectContent>{wallets.map((wallet) => <SelectItem key={walletId(wallet)} value={walletId(wallet)}>{wallet.icon ? `${wallet.icon} ` : ""}{walletName(wallet)} • {fmt(walletBalances[walletId(wallet)] || 0)}</SelectItem>)}</SelectContent></Select></FormInput><FormInput label="Amount to Add"><Input type="number" placeholder="Enter amount" className={inputDarkClass} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></FormInput><p className="text-xs text-white/50">This will use money from {sourceWallet ? walletName(sourceWallet) : "the selected wallet"}. The saved amount lives in {assignedWallet ? walletName(assignedWallet) : "the saved-in wallet"}.</p></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setAddSavingsOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSubmitAddSavings} disabled={savingAmount || !sourceWallet || remaining <= 0} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{savingAmount ? "Adding..." : "Add Savings"}</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={overAmountOpen} onOpenChange={setOverAmountOpen}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Too much savings amount</DialogTitle></DialogHeader><div className="px-4 sm:px-5 py-4"><div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] p-4 text-sm font-semibold leading-6 text-amber-50/90"><p>You entered <span className="font-black text-white">{fmt(requestedAddAmount)}</span>, but this goal only needs <span className="font-black text-white">{fmt(cappedAddAmount)}</span> more.</p><p className="mt-2">Please enter <span className="font-black text-white">{fmt(cappedAddAmount)}</span> or less to complete this goal.</p></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setOverAmountOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={() => runAddSavings(cappedAddAmount)} disabled={savingAmount} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{savingAmount ? "Adding..." : `Use ${fmt(cappedAddAmount)} only`}</Button></div></div></div></DialogContent></Dialog>
    <Dialog open={useSavingsOpen} onOpenChange={setUseSavingsOpen}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Use Savings</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] p-4 text-sm text-white/75">This will reduce your saved amount for this goal. Current saved: <span className="font-bold text-amber-100">{fmt(saved)}</span></div><FormInput label="Amount to use"><Input type="number" className={inputDarkClass} value={useAmount} onChange={(e) => setUseAmount(e.target.value)} autoFocus /></FormInput><FormInput label="Reason / purpose"><Input placeholder="What will you use it for?" className={inputDarkClass} value={useReason} onChange={(e) => setUseReason(e.target.value)} /></FormInput></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setUseSavingsOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSubmitUseSavings} disabled={savingAmount || saved <= 0} className="h-10 rounded-xl bg-amber-500 px-4 text-white font-semibold hover:bg-amber-600 disabled:opacity-50">{savingAmount ? "Saving..." : "Use Savings"}</Button></div></div></div></DialogContent></Dialog>
  </>;
}

function InfoMini({ label, value }) {
  return <div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] uppercase text-white/45 font-semibold">{label}</p><p className="font-bold text-white">{value}</p></div>;
}

function InfoBlock({ title, children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">{title}</p>{children}</div>;
}
