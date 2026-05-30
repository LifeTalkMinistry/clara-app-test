import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Target,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  Wallet,
  MinusCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const inputDarkClass =
  "h-10 rounded-xl bg-[#0b1a2f] border-white/10 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-green-500/60";
const selectDarkTriggerClass = "h-10 rounded-xl bg-[#0b1a2f] border-white/10 text-white";
const labelDarkClass = "text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 mb-1.5 block";
const formDialogClass =
  "w-[calc(100vw-1rem)] max-w-[28rem] sm:max-w-[34rem] max-h-[min(88dvh,46rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#061224] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:w-full [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";
const detailDialogClass =
  "w-[calc(100vw-1rem)] max-w-[27rem] sm:max-w-[32rem] max-h-[min(86dvh,42rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#041226] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:w-full [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";

const generateId = () => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const getGoalActivity = (goal) => {
  const source = goal?.savingsActivityLog || goal?.savings_activity_log || goal?.activityLog || goal?.activity_log || [];
  return Array.isArray(source) ? source.filter(Boolean) : [];
};
const normalizeGoal = (goal = {}) => ({
  ...goal,
  id: String(goal.id || generateId()),
  wallet_id: goal.wallet_id != null ? String(goal.wallet_id) : "",
  target_amount: toNumber(goal.target_amount),
  saved_amount: toNumber(goal.saved_amount),
  planned_use_date: goal.planned_use_date || "",
  reasons: Array.isArray(goal.reasons) ? goal.reasons : ["", "", ""],
  savingsActivityLog: getGoalActivity(goal),
  savings_activity_log: getGoalActivity(goal),
  created_date: goal.created_date || goal.createdAt || new Date().toISOString(),
  updated_date: goal.updated_date || goal.updatedAt || new Date().toISOString(),
});
const isActiveWallet = (wallet) => Boolean(wallet && wallet.id && !wallet.deletedAt && !wallet.deleted_at && !wallet.is_archived);

export default function SavingsGoals() {
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
    refreshData,
  } = data || {};

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loading = Boolean(data?.loading || data?.isLoading || data?.financialDataLoading);
  const activeWallets = useMemo(() => (Array.isArray(wallets) ? wallets.filter(isActiveWallet) : []), [wallets]);
  const goals = useMemo(
    () =>
      (Array.isArray(savingsGoals) ? savingsGoals : [])
        .filter((goal) => !goal?.deletedAt && !goal?.deleted_at)
        .map(normalizeGoal)
        .sort((a, b) => new Date(b.createdAt || b.created_date || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.created_date || a.updatedAt || 0).getTime()),
    [savingsGoals]
  );

  useEffect(() => {
    if (!detailGoal?.id) return;
    setDetailGoal(goals.find((goal) => String(goal.id) === String(detailGoal.id)) || null);
  }, [goals, detailGoal?.id]);

  const walletBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      map[String(wallet.id)] = getWalletBalance(wallet, Array.isArray(walletTransactions) ? walletTransactions : [], Array.isArray(transfers) ? transfers : []);
    });
    return map;
  }, [activeWallets, transfers, walletTransactions]);

  const totalSaved = goals.reduce((sum, goal) => sum + (Number(goal.saved_amount) || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + (Number(goal.target_amount) || 0), 0);
  const retentionNum = parseFloat(data?.retentionRate || 0);
  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(Number(n) || 0);

  const handleBack = () => {
    if (window.history.length > 1) return navigate(-1);
    navigate("/dashboard", { replace: true });
  };
  const closeFormModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };
  const openAdd = () => {
    setDetailGoal(null);
    setForm(EMPTY_FORM);
    setEditId(null);
    setOpen(true);
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
    if (requestedEditId) {
      const targetGoal = goals.find((goal) => String(goal.id) === requestedEditId) || null;
      if (targetGoal) {
        routeActionHandledRef.current = true;
        setDetailGoal(null);
        openEdit(targetGoal);
        navigate(location.pathname, { replace: true, state: null });
      }
      return;
    }
    if (requestedFocusId) {
      const targetGoal = goals.find((goal) => String(goal.id) === requestedFocusId) || null;
      if (targetGoal) {
        routeActionHandledRef.current = true;
        setDetailGoal(targetGoal);
        navigate(location.pathname, { replace: true, state: null });
      }
    }
  }, [goals, loading, location.pathname, location.state, navigate]);

  const handleSave = async () => {
    if (saving) return;
    if (!user?.id && !user?.email) return alert("No user found. Please log in again.");
    if (!form.title?.trim()) return alert("Please enter a goal title.");
    if (!form.target_amount || Number(form.target_amount) <= 0) return alert("Please enter a valid target amount.");
    if (form.wallet_id === "__no_wallets__") return alert("Please select a valid wallet.");

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const existingGoal = editId ? goals.find((goal) => String(goal.id) === String(editId)) : null;
      const payload = normalizeGoal({
        ...(existingGoal || {}),
        id: editId || generateId(),
        title: form.title.trim(),
        category: form.category || "",
        subcategory: form.subcategory || "",
        target_amount: parseFloat(form.target_amount) || 0,
        saved_amount: Math.max(0, parseFloat(form.saved_amount) || 0),
        planned_use_date: form.planned_use_date || "",
        reasons: Array.isArray(form.reasons) ? form.reasons : ["", "", ""],
        emotional_value: form.emotional_value || "joy",
        flexibility: form.flexibility || "flexible",
        priority: form.priority || "medium",
        notes: form.notes || "",
        wallet_id: form.wallet_id && form.wallet_id !== "__no_wallets__" ? form.wallet_id : "",
        created_by: user?.email || null,
        user_email: user?.email || null,
        user_id: user?.id || null,
        created_date: existingGoal?.created_date || now,
        updated_date: now,
        createdAt: existingGoal?.createdAt || now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      if (editId) await updateSavingsGoal(payload.id, payload);
      else await addSavingsGoal(payload);
      await refreshData?.();
      setDetailGoal(payload);
      closeFormModal();
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

  const handleAddSavings = async (goal, amount, sourceWalletId) => {
    if (!user?.id && !user?.email) return alert("No user found. Please log in again.");
    const safeAmount = parseFloat(amount);
    if (!safeAmount || safeAmount <= 0) return alert("Please enter a valid amount.");
    const sourceWallet = activeWallets.find((wallet) => String(wallet.id) === String(sourceWalletId));
    if (!sourceWallet) return alert("Please choose a valid source wallet.");
    const currentWalletBalance = walletBalances[String(sourceWallet.id)] ?? Number(sourceWallet.balance || 0);
    const currentGoalSaved = Number(goal.saved_amount) || 0;
    const targetAmount = Number(goal.target_amount) || 0;
    const remaining = Math.max(targetAmount - currentGoalSaved, 0);
    if (remaining <= 0) return alert("This goal is already fully funded.");
    const finalAmount = Math.min(safeAmount, remaining);
    if (finalAmount > currentWalletBalance) return alert("Not enough balance in the selected wallet.");

    try {
      const now = new Date().toISOString();
      const nextGoalSaved = Math.min(currentGoalSaved + finalAmount, targetAmount);
      await addExpense?.({
        wallet_id: String(sourceWallet.id),
        amount: finalAmount,
        category: "Savings Goal",
        need_type: "other",
        planning_status: "planned",
        notes: `Added to savings goal: ${goal.title}`,
        date: now,
        created_at: now,
        updated_at: now,
        savings_goal_id: goal.id,
        savingsGoalId: goal.id,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      const storageWalletId = goal.wallet_id || String(sourceWallet.id);
      const updatedGoal = normalizeGoal({
        ...goal,
        wallet_id: storageWalletId,
        saved_amount: nextGoalSaved,
        savingsActivityLog: buildActivity(goal, {
          id: `savings_add_${Date.now()}`,
          type: "add",
          title: "Savings added",
          amount: finalAmount,
          sourceWalletId: String(sourceWallet.id),
          source_wallet_id: String(sourceWallet.id),
          sourceWalletName: sourceWallet.name,
          source_wallet_name: sourceWallet.name,
          note: `Added from ${sourceWallet.name}`,
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
    } catch (error) {
      console.error("Failed to add savings:", error);
      alert(error?.message || "Failed to add savings.");
      throw error;
    }
  };

  const handleUseSavings = async (goal, amount, reason) => {
    const safeAmount = parseFloat(amount);
    const cleanReason = String(reason || "").trim();
    if (!safeAmount || safeAmount <= 0) return alert("Please enter a valid amount.");
    if (safeAmount > Number(goal.saved_amount || 0)) return alert("Amount cannot exceed current saved amount.");
    if (!cleanReason) return alert("Please enter a reason or purpose.");
    try {
      const now = new Date().toISOString();
      const nextSaved = Math.max((Number(goal.saved_amount) || 0) - safeAmount, 0);
      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
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
    } catch (error) {
      console.error("Failed to use savings:", error);
      alert(error?.message || "Failed to use savings.");
      throw error;
    }
  };

  const subcats = form.category ? CATEGORIES[form.category] || [] : [];
  if (accessLoading) return <FeaturePageLoader label="Preparing savings goals..." />;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-3"><Button type="button" variant="ghost" onClick={handleBack} className="h-9 rounded-xl px-3 text-muted-foreground hover:text-foreground hover:bg-muted/70"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></div>
      <PageHeader title="Savings Goals" subtitle="Plan and track what matters most" action={<Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />New Goal</Button>} />

      {goals.length > 0 && <div className="grid grid-cols-3 gap-3 mb-4"><div className="grad-green rounded-2xl p-3 text-center"><p className="text-[10px] text-green-100 uppercase font-semibold">Saved</p><p className="font-heading font-bold text-white text-lg">{fmt(totalSaved)}</p></div><div className="grad-yellow rounded-2xl p-3 text-center"><p className="text-[10px] text-secondary-foreground/70 uppercase font-semibold">Target</p><p className="font-heading font-bold text-secondary-foreground text-lg">{fmt(totalTarget)}</p></div><div className="rounded-2xl p-3 text-center border border-white/10 bg-[#0f1c33] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"><p className="text-[10px] text-white/60 uppercase font-semibold tracking-[0.08em]">Goals</p><p className="font-heading font-bold text-white text-lg">{goals.length}</p></div></div>}

      {data?.totalIncome > 0 && retentionNum < 15 && totalTarget > 0 && <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200 mb-4 text-sm"><AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" /><p className="text-orange-700">Your leftover rate is below 15%. Save when your rate improves — your goals are aspirational for now.</p></div>}

      {goals.length === 0 ? <EmptyState icon={Target} title="No savings goals yet" description="Create your first goal — a dream fund, emergency reserve, or any planned expense." /> : <div className="space-y-3">{goals.map((goal) => { const saved = Number(goal.saved_amount) || 0; const target = Number(goal.target_amount) || 0; const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0; const remaining = Math.max(target - saved, 0); const assignedWallet = activeWallets.find((wallet) => String(wallet.id) === String(goal.wallet_id)); return <div key={goal.id} onClick={() => setDetailGoal(goal)} className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-all"><div className="flex items-start justify-between mb-2 gap-3"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-sm">{goal.title}</p>{goal.priority === "urgent" && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">URGENT</span>}</div><p className="text-xs text-muted-foreground">{goal.category}{goal.subcategory ? ` • ${goal.subcategory}` : ""}</p>{assignedWallet ? <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><Wallet className="w-3 h-3" />Saved in {assignedWallet.name} • {fmt(walletBalances[String(assignedWallet.id)] || 0)}</p> : null}</div><div className="text-right shrink-0"><p className="font-heading font-bold text-sm text-primary">{fmt(saved)}</p><p className="text-xs text-muted-foreground">of {fmt(target)}</p></div></div><div className="h-2.5 bg-muted rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full progress-bar ${pct >= 100 ? "bg-primary" : "bg-accent"}`} style={{ width: `${pct}%` }} /></div><div className="flex justify-between text-xs text-muted-foreground gap-3"><span>{pct.toFixed(0)}% funded</span>{goal.planned_use_date ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{goal.planned_use_date}</span> : <span>No date</span>}<span>{fmt(remaining)} left</span></div></div>; })}</div>}

      <Dialog open={open} onOpenChange={(value) => { if (!value) closeFormModal(); else setOpen(true); }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">{editId ? "Edit Savings Goal" : "New Savings Goal"}</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div><Label className={labelDarkClass}>Goal Title</Label><Input placeholder="e.g., Emergency Fund, Dream Vacation" className={inputDarkClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label className={labelDarkClass}>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{Object.keys(CATEGORIES).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div><div><Label className={labelDarkClass}>Subcategory</Label><Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })} disabled={!form.category}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{subcats.map((subcat) => <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label className={labelDarkClass}>Target Amount</Label><Input type="number" placeholder="Target ₱" className={inputDarkClass} value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /></div><div><Label className={labelDarkClass}>Already Saved</Label><Input type="number" placeholder="0" className={inputDarkClass} value={form.saved_amount} onChange={(e) => setForm({ ...form, saved_amount: e.target.value })} /></div></div><div><Label className={labelDarkClass}>Saved in</Label><Select value={form.wallet_id} onValueChange={(v) => setForm({ ...form, wallet_id: v })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Select wallet..." /></SelectTrigger><SelectContent>{activeWallets.length === 0 ? <SelectItem value="__no_wallets__" disabled>No wallets available</SelectItem> : activeWallets.map((wallet) => <SelectItem key={wallet.id} value={String(wallet.id)}>{wallet.icon ? `${wallet.icon} ` : ""}{wallet.name} • {fmt(walletBalances[String(wallet.id)] || 0)}</SelectItem>)}</SelectContent></Select></div><div><Label className={labelDarkClass}>Planned Use Date</Label><input type="date" value={form.planned_use_date} onChange={(e) => setForm({ ...form, planned_use_date: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-[#0b1a2f] border border-white/10 text-white cursor-pointer outline-none focus:ring-1 focus:ring-green-500/60" /></div><div><Label className={labelDarkClass}>3 Reasons / Motivations</Label><div className="space-y-2">{form.reasons.map((reason, i) => <Input key={i} placeholder={`Reason ${i + 1}`} className={inputDarkClass} value={reason} onChange={(e) => { const updatedReasons = [...form.reasons]; updatedReasons[i] = e.target.value; setForm({ ...form, reasons: updatedReasons }); }} />)}</div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label className={labelDarkClass}>Emotional Value</Label><Select value={form.emotional_value} onValueChange={(v) => setForm({ ...form, emotional_value: v })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue /></SelectTrigger><SelectContent>{EMOTIONAL_VALUES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div><Label className={labelDarkClass}>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div><div><Label className={labelDarkClass}>Flexibility</Label><div className="grid grid-cols-2 gap-2"><Button type="button" className={`h-10 rounded-xl ${form.flexibility === "flexible" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-transparent border border-white/20 text-white hover:bg-white/5"}`} onClick={() => setForm({ ...form, flexibility: "flexible" })}>Flexible</Button><Button type="button" className={`h-10 rounded-xl ${form.flexibility === "must_have" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-transparent border border-white/20 text-white hover:bg-white/5"}`} onClick={() => setForm({ ...form, flexibility: "must_have" })}>Must Have</Button></div></div><div><Label className={labelDarkClass}>Notes</Label><Textarea placeholder="Notes" className={`${inputDarkClass} min-h-[92px] sm:min-h-[100px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={closeFormModal} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSave} disabled={saving} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{saving ? "Saving..." : editId ? "Update Goal" : "Create Goal"}</Button></div></div></div></DialogContent></Dialog>

      {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={handleDelete} onAddSavings={handleAddSavings} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}
    </div>
  );
}

function GoalDetail({ goal, wallets, walletBalances, onClose, onEdit, onDelete, onAddSavings, onUseSavings, totalIncome, fmt }) {
  const [addSavingsOpen, setAddSavingsOpen] = useState(false);
  const [useSavingsOpen, setUseSavingsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [sourceWalletId, setSourceWalletId] = useState(goal?.wallet_id ? String(goal.wallet_id) : "");
  const [useAmount, setUseAmount] = useState("");
  const [useReason, setUseReason] = useState("");
  const [savingAmount, setSavingAmount] = useState(false);
  const saved = Number(goal?.saved_amount) || 0;
  const target = Number(goal?.target_amount) || 0;
  const remaining = Math.max(target - saved, 0);
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const assignedWallet = (wallets || []).find((wallet) => String(wallet.id) === String(goal?.wallet_id));
  const sourceWallet = (wallets || []).find((wallet) => String(wallet.id) === String(sourceWalletId));
  const assignedWalletBalance = assignedWallet ? walletBalances[String(assignedWallet.id)] ?? Number(assignedWallet.balance || 0) : 0;
  const sourceWalletBalance = sourceWallet ? walletBalances[String(sourceWallet.id)] ?? Number(sourceWallet.balance || 0) : 0;
  const cleanReasons = Array.isArray(goal?.reasons) ? goal.reasons.filter((reason) => String(reason || "").trim()) : [];
  const activity = getGoalActivity(goal);

  useEffect(() => {
    if (!sourceWalletId && assignedWallet?.id) setSourceWalletId(String(assignedWallet.id));
    else if (!sourceWalletId && wallets?.[0]?.id) setSourceWalletId(String(wallets[0].id));
  }, [assignedWallet?.id, sourceWalletId, wallets]);

  const handleOpenAddSavings = () => { setAmount(""); setSourceWalletId(goal?.wallet_id ? String(goal.wallet_id) : String(wallets?.[0]?.id || "")); setAddSavingsOpen(true); };
  const handleSubmitAddSavings = async () => { if (savingAmount) return; try { setSavingAmount(true); await onAddSavings(goal, amount, sourceWalletId); setAmount(""); setAddSavingsOpen(false); } finally { setSavingAmount(false); } };
  const handleOpenUseSavings = () => { setUseAmount(""); setUseReason(""); setUseSavingsOpen(true); };
  const handleSubmitUseSavings = async () => { if (savingAmount) return; try { setSavingAmount(true); await onUseSavings(goal, useAmount, useReason); setUseAmount(""); setUseReason(""); setUseSavingsOpen(false); } finally { setSavingAmount(false); } };

  return <>
    <Dialog open={Boolean(goal)} onOpenChange={(value) => !value && onClose()}><DialogContent className={detailDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">{goal?.title || "Savings Goal"}</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.category || "Uncategorized"}{goal?.subcategory ? ` • ${goal.subcategory}` : ""}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-start justify-between gap-3 mb-3"><div><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold">Progress</p><p className="text-2xl font-heading font-bold text-white">{pct.toFixed(0)}%</p></div><div className="text-right"><p className="text-[11px] text-white/50">Saved</p><p className="text-lg font-bold text-green-300">{fmt(saved)}</p></div></div><div className="h-3 rounded-full bg-white/10 overflow-hidden mb-3"><div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} /></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] uppercase text-white/45 font-semibold">Target</p><p className="font-bold text-white">{fmt(target)}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] uppercase text-white/45 font-semibold">Remaining</p><p className="font-bold text-white">{fmt(remaining)}</p></div></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">Saved in</p>{assignedWallet ? <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 text-green-300" /></div><div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{assignedWallet.icon ? `${assignedWallet.icon} ` : ""}{assignedWallet.name}</p><p className="text-xs text-white/45">Money lives here</p></div></div><p className="text-sm font-bold text-white shrink-0">{fmt(assignedWalletBalance)}</p></div> : <p className="text-sm text-white/55">No saved-in wallet assigned. Edit this goal to assign one.</p>}</div>{goal?.planned_use_date && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">Planned Use Date</p><p className="text-sm text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-green-300" />{goal.planned_use_date}</p></div>}{cleanReasons.length > 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">Reasons / Motivations</p><div className="space-y-2">{cleanReasons.map((reason, index) => <div key={`${reason}_${index}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80">{reason}</div>)}</div></div>}{activity.length > 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">Goal Activity</p><div className="space-y-2">{activity.slice(0, 4).map((entry) => <div key={entry.id || `${entry.type}-${entry.createdAt}`} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/80"><div className="flex justify-between gap-3"><span>{entry.title || "Savings activity"}</span><span className={entry.type === "use" ? "text-amber-200" : "text-green-200"}>{entry.type === "use" ? "-" : "+"}{fmt(entry.amount)}</span></div>{entry.reason || entry.note ? <p className="mt-1 text-xs text-white/45">{entry.reason || entry.note}</p> : null}</div>)}</div></div>}{goal?.notes && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-white/50 font-semibold mb-2">Notes</p><p className="text-sm text-white/75 whitespace-pre-wrap">{goal.notes}</p></div>}{Number(totalIncome) > 0 && <div className="rounded-2xl border border-green-400/15 bg-green-400/[0.06] p-4"><p className="text-[11px] uppercase tracking-[0.08em] text-green-200/80 font-semibold mb-1">CLARA Note</p><p className="text-sm text-white/70">Add only what your wallet can safely support. Small, consistent top-ups are better than forcing a big amount.</p></div>}</div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => onEdit(goal)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"><Edit className="w-4 h-4 mr-2" />Edit</Button><Button type="button" onClick={handleOpenAddSavings} disabled={remaining <= 0} className="h-10 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50"><Plus className="w-4 h-4 mr-2" />Add Savings</Button><Button type="button" onClick={handleOpenUseSavings} disabled={saved <= 0} className="h-10 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"><MinusCircle className="w-4 h-4 mr-2" />Use Savings</Button><Button type="button" onClick={() => onDelete(goal.id)} variant="ghost" className="h-10 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"><Trash2 className="w-4 h-4 mr-2" />Delete</Button><Button type="button" onClick={onClose} variant="ghost" className="col-span-2 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white">Close</Button></div></div></div></DialogContent></Dialog>

    <Dialog open={addSavingsOpen} onOpenChange={setAddSavingsOpen}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Add Savings</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title || "Savings Goal"}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex justify-between gap-3 text-sm"><div><p className="text-white/45 text-[11px] uppercase font-semibold">Remaining</p><p className="font-bold text-white">{fmt(remaining)}</p></div><div className="text-right"><p className="text-white/45 text-[11px] uppercase font-semibold">Wallet Balance</p><p className="font-bold text-white">{fmt(sourceWalletBalance)}</p></div></div></div><div><Label className={labelDarkClass}>Take from wallet</Label><Select value={sourceWalletId} onValueChange={setSourceWalletId}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Choose wallet..." /></SelectTrigger><SelectContent>{wallets.length ? wallets.map((wallet) => <SelectItem key={wallet.id} value={String(wallet.id)}>{wallet.icon ? `${wallet.icon} ` : ""}{wallet.name} • {fmt(walletBalances[String(wallet.id)] || 0)}</SelectItem>) : <SelectItem value="__no_wallets__" disabled>No wallets available</SelectItem>}</SelectContent></Select></div><div><Label className={labelDarkClass}>Amount to Add</Label><Input type="number" placeholder="Enter amount" className={inputDarkClass} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div><p className="text-xs text-white/50">This will add savings from {sourceWallet?.name || "the selected wallet"}. The goal remains saved in {assignedWallet?.name || "its saved-in wallet"}.</p></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setAddSavingsOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSubmitAddSavings} disabled={savingAmount || !sourceWallet || remaining <= 0} className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50">{savingAmount ? "Adding..." : "Add Savings"}</Button></div></div></div></DialogContent></Dialog>

    <Dialog open={useSavingsOpen} onOpenChange={setUseSavingsOpen}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Use Savings</DialogTitle><p className="text-xs text-white/50 mt-1">{goal?.title || "Savings Goal"}</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"><div className="space-y-4"><div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] p-4 text-sm text-white/75">This will reduce your saved amount for this goal. Current saved: <span className="font-bold text-amber-100">{fmt(saved)}</span></div><div><Label className={labelDarkClass}>Amount to use</Label><Input type="number" placeholder="Enter amount" className={inputDarkClass} value={useAmount} onChange={(e) => setUseAmount(e.target.value)} autoFocus /></div><div><Label className={labelDarkClass}>Reason / purpose</Label><Input placeholder="What will you use it for?" className={inputDarkClass} value={useReason} onChange={(e) => setUseReason(e.target.value)} /></div></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setUseSavingsOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={handleSubmitUseSavings} disabled={savingAmount || saved <= 0} className="h-10 rounded-xl bg-amber-500 px-4 text-white font-semibold hover:bg-amber-600 disabled:opacity-50">{savingAmount ? "Saving..." : "Use Savings"}</Button></div></div></div></DialogContent></Dialog>
  </>;
}
