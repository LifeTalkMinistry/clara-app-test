import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Target,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  Wallet,
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
  "Celebrations & Gifts": [
    "Birthday",
    "Wedding",
    "Anniversary",
    "Holiday",
    "Family Event",
  ],
  "Personal Purchases": ["Gadget", "Clothing", "Furniture", "Vehicle"],
  Experiences: ["Travel", "Vacation", "Concert", "Retreat"],
  "Financial / Protection": [
    "Emergency Fund",
    "Insurance",
    "Investment",
    "Debt Payment",
  ],
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

const selectDarkTriggerClass =
  "h-10 rounded-xl bg-[#0b1a2f] border-white/10 text-white";

const labelDarkClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 mb-1.5 block";

const formDialogClass =
  "w-[calc(100vw-1rem)] max-w-[28rem] sm:max-w-[34rem] max-h-[min(88dvh,46rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#061224] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:w-full [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";

const detailDialogClass =
  "w-[calc(100vw-1rem)] max-w-[27rem] sm:max-w-[32rem] max-h-[min(86dvh,42rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#041226] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:w-full [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/5 [&>button]:text-white/75 [&>button]:hover:bg-white/10 [&>button]:hover:text-white";

const generateId = () =>
  `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeGoal = (goal = {}) => ({
  ...goal,
  id: String(goal.id || generateId()),
  wallet_id: goal.wallet_id != null ? String(goal.wallet_id) : "",
  target_amount: toNumber(goal.target_amount),
  saved_amount: toNumber(goal.saved_amount),
  planned_use_date: goal.planned_use_date || "",
  reasons: Array.isArray(goal.reasons) ? goal.reasons : ["", "", ""],
  created_date: goal.created_date || goal.createdAt || new Date().toISOString(),
  updated_date: goal.updated_date || goal.updatedAt || new Date().toISOString(),
});

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
    refreshData,
  } = data || {};

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loading = Boolean(
    data?.loading || data?.isLoading || data?.financialDataLoading
  );

  const goals = useMemo(() => {
    return (Array.isArray(savingsGoals) ? savingsGoals : [])
      .filter((goal) => !goal?.deletedAt && !goal?.deleted_at)
      .map(normalizeGoal)
      .sort((a, b) => {
        const aTime = new Date(
          a.createdAt || a.created_date || a.updatedAt || 0
        ).getTime();
        const bTime = new Date(
          b.createdAt || b.created_date || b.updatedAt || 0
        ).getTime();
        return bTime - aTime;
      });
  }, [savingsGoals]);

  useEffect(() => {
    if (!detailGoal?.id) return;

    const freshGoal =
      goals.find((goal) => String(goal.id) === String(detailGoal.id)) || null;

    setDetailGoal(freshGoal);
  }, [goals, detailGoal?.id]);

  useEffect(() => {
    if (loading || routeActionHandledRef.current) return;

    const routeState = location.state || {};
    const requestedEditId = routeState?.editGoalId
      ? String(routeState.editGoalId)
      : "";
    const requestedFocusId = routeState?.focusGoalId
      ? String(routeState.focusGoalId)
      : "";

    if (routeState?.openCreateSavingsGoal) {
      routeActionHandledRef.current = true;
      openAdd();
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (requestedEditId) {
      const targetGoal =
        goals.find((goal) => String(goal.id) === requestedEditId) || null;

      if (targetGoal) {
        routeActionHandledRef.current = true;
        setDetailGoal(null);
        openEdit(targetGoal);
        navigate(location.pathname, { replace: true, state: null });
      }

      return;
    }

    if (requestedFocusId) {
      const targetGoal =
        goals.find((goal) => String(goal.id) === requestedFocusId) || null;

      if (targetGoal) {
        routeActionHandledRef.current = true;
        setDetailGoal(targetGoal);
        navigate(location.pathname, { replace: true, state: null });
      }
    }
  }, [goals, loading, location.pathname, location.state, navigate]);

  const walletBalances = useMemo(() => {
    const map = {};
    (Array.isArray(wallets) ? wallets : []).forEach((wallet) => {
      map[String(wallet.id)] = getWalletBalance(
        wallet,
        Array.isArray(walletTransactions) ? walletTransactions : [],
        Array.isArray(transfers) ? transfers : []
      );
    });
    return map;
  }, [transfers, walletTransactions, wallets]);

  const totalSaved = goals.reduce(
    (sum, goal) => sum + (Number(goal.saved_amount) || 0),
    0
  );

  const totalTarget = goals.reduce(
    (sum, goal) => sum + (Number(goal.target_amount) || 0),
    0
  );

  const retentionNum = parseFloat(data?.retentionRate || 0);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n) || 0);

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
      reasons:
        Array.isArray(goal.reasons) && goal.reasons.length >= 3
          ? goal.reasons
          : ["", "", ""],
      emotional_value: goal.emotional_value || "joy",
      flexibility: goal.flexibility || "flexible",
      priority: goal.priority || "medium",
      notes: goal.notes || "",
      wallet_id: goal.wallet_id ? String(goal.wallet_id) : "",
    });
    setEditId(goal.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!user?.id && !user?.email) {
      alert("No user found. Please log in again.");
      return;
    }

    if (!form.title?.trim()) {
      alert("Please enter a goal title.");
      return;
    }

    if (!form.target_amount || Number(form.target_amount) <= 0) {
      alert("Please enter a valid target amount.");
      return;
    }

    if (form.wallet_id === "__no_wallets__") {
      alert("Please select a valid wallet.");
      return;
    }

    try {
      setSaving(true);

      const now = new Date().toISOString();

      const existingGoal = editId
        ? goals.find((goal) => String(goal.id) === String(editId))
        : null;

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
        wallet_id:
          form.wallet_id && form.wallet_id !== "__no_wallets__"
            ? form.wallet_id
            : "",
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

      if (editId) {
        if (typeof updateSavingsGoal !== "function") {
          throw new Error("updateSavingsGoal is not available.");
        }

        await updateSavingsGoal(payload.id, payload);
      } else {
        if (typeof addSavingsGoal !== "function") {
          throw new Error("addSavingsGoal is not available.");
        }

        await addSavingsGoal(payload);
      }

      if (typeof refreshData === "function") {
        await refreshData();
      }

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
      if (typeof deleteSavingsGoal !== "function") {
        throw new Error("deleteSavingsGoal is not available.");
      }

      await deleteSavingsGoal(id);

      setDetailGoal((prev) => (String(prev?.id) === String(id) ? null : prev));

      if (typeof refreshData === "function") {
        await refreshData();
      }
    } catch (error) {
      console.error("Failed to delete savings goal:", error);
      alert(error?.message || "Failed to delete goal.");
    }
  };

  const handleAddSavings = async (goal, amount) => {
    if (!user?.id && !user?.email) {
      alert("No user found. Please log in again.");
      return;
    }

    try {
      const safeAmount = parseFloat(amount);

      if (!safeAmount || safeAmount <= 0) {
        alert("Please enter a valid amount.");
        return;
      }

      if (!goal.wallet_id) {
        alert("Please assign a wallet to this goal first.");
        return;
      }

      const sourceWallet = (wallets || []).find(
        (wallet) => String(wallet.id) === String(goal.wallet_id)
      );

      if (!sourceWallet) {
        alert("Selected wallet was not found.");
        return;
      }

      const currentWalletBalance =
        walletBalances[String(sourceWallet.id)] ?? Number(sourceWallet.balance || 0);

      const currentGoalSaved = Number(goal.saved_amount) || 0;
      const targetAmount = Number(goal.target_amount) || 0;
      const remaining = Math.max(targetAmount - currentGoalSaved, 0);

      if (remaining <= 0) {
        alert("This goal is already fully funded.");
        return;
      }

      const finalAmount = Math.min(safeAmount, remaining);

      if (finalAmount > currentWalletBalance) {
        alert("Not enough balance in the selected wallet.");
        return;
      }

      if (typeof updateSavingsGoal !== "function") {
        throw new Error("updateSavingsGoal is not available.");
      }

      const now = new Date().toISOString();
      const nextGoalSaved = Math.min(currentGoalSaved + finalAmount, targetAmount);

      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextGoalSaved,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });

      await updateSavingsGoal(goal.id, updatedGoal);

      if (typeof refreshData === "function") {
        await refreshData();
      }

      setDetailGoal(updatedGoal);
    } catch (error) {
      console.error("Failed to add savings:", error);
      alert(error?.message || "Failed to add savings.");
    }
  };

  const subcats = form.category ? CATEGORIES[form.category] || [] : [];

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing savings goals..." />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Savings Goals"
        subtitle="Plan and track what matters most"
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            New Goal
          </Button>
        }
      />

      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="grad-green rounded-2xl p-3 text-center">
            <p className="text-[10px] text-green-100 uppercase font-semibold">
              Saved
            </p>
            <p className="font-heading font-bold text-white text-lg">
              {fmt(totalSaved)}
            </p>
          </div>

          <div className="grad-yellow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-secondary-foreground/70 uppercase font-semibold">
              Target
            </p>
            <p className="font-heading font-bold text-secondary-foreground text-lg">
              {fmt(totalTarget)}
            </p>
          </div>

          <div className="rounded-2xl p-3 text-center border border-white/10 bg-[#0f1c33] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <p className="text-[10px] text-white/60 uppercase font-semibold tracking-[0.08em]">
              Goals
            </p>
            <p className="font-heading font-bold text-white text-lg">
              {goals.length}
            </p>
          </div>
        </div>
      )}

      {data?.totalIncome > 0 && retentionNum < 15 && totalTarget > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200 mb-4 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-orange-700">
            Your leftover rate is below 15%. Save when your rate improves — your
            goals are aspirational for now.
          </p>
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No savings goals yet"
          description="Create your first goal — a dream fund, emergency reserve, or any planned expense."
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const saved = Number(goal.saved_amount) || 0;
            const target = Number(goal.target_amount) || 0;
            const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
            const remaining = Math.max(target - saved, 0);
            const assignedWallet = (wallets || []).find(
              (wallet) => String(wallet.id) === String(goal.wallet_id)
            );

            return (
              <div
                key={goal.id}
                onClick={() => setDetailGoal(goal)}
                className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{goal.title}</p>
                      {goal.priority === "urgent" && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                          URGENT
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {goal.category}
                      {goal.subcategory ? ` • ${goal.subcategory}` : ""}
                    </p>

                    {assignedWallet ? (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        {assignedWallet.name} •{" "}
                        {fmt(walletBalances[String(assignedWallet.id)] || 0)}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-heading font-bold text-sm text-primary">
                      {fmt(saved)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {fmt(target)}
                    </p>
                  </div>
                </div>

                <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full progress-bar ${
                      pct >= 100 ? "bg-primary" : "bg-accent"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground gap-3">
                  <span>{pct.toFixed(0)}% funded</span>
                  {goal.planned_use_date ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {goal.planned_use_date}
                    </span>
                  ) : (
                    <span>No date</span>
                  )}
                  <span>{fmt(remaining)} left</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) closeFormModal();
          else setOpen(true);
        }}
      >
        <DialogContent className={formDialogClass}>
          <div className="flex max-h-[inherit] flex-col">
            <DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12">
              <DialogTitle className="text-white text-xl sm:text-2xl leading-tight">
                {editId ? "Edit Savings Goal" : "New Savings Goal"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
              <div className="space-y-4">
                <div>
                  <Label className={labelDarkClass}>Goal Title</Label>
                  <Input
                    placeholder="e.g., Emergency Fund, Dream Vacation"
                    className={inputDarkClass}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className={labelDarkClass}>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        setForm({ ...form, category: v, subcategory: "" })
                      }
                    >
                      <SelectTrigger className={selectDarkTriggerClass}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORIES).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className={labelDarkClass}>Subcategory</Label>
                    <Select
                      value={form.subcategory}
                      onValueChange={(v) => setForm({ ...form, subcategory: v })}
                      disabled={!form.category}
                    >
                      <SelectTrigger className={selectDarkTriggerClass}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subcats.map((subcat) => (
                          <SelectItem key={subcat} value={subcat}>
                            {subcat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className={labelDarkClass}>Target Amount</Label>
                    <Input
                      type="number"
                      placeholder="Target ₱"
                      className={inputDarkClass}
                      value={form.target_amount}
                      onChange={(e) =>
                        setForm({ ...form, target_amount: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label className={labelDarkClass}>Already Saved</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className={inputDarkClass}
                      value={form.saved_amount}
                      onChange={(e) =>
                        setForm({ ...form, saved_amount: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className={labelDarkClass}>Source Wallet</Label>
                  <Select
                    value={form.wallet_id}
                    onValueChange={(v) => setForm({ ...form, wallet_id: v })}
                  >
                    <SelectTrigger className={selectDarkTriggerClass}>
                      <SelectValue placeholder="Select wallet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(wallets || []).length === 0 ? (
                        <SelectItem value="__no_wallets__" disabled>
                          No wallets available
                        </SelectItem>
                      ) : (
                        wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={String(wallet.id)}>
                            {wallet.icon ? `${wallet.icon} ` : ""}
                            {wallet.name} •{" "}
                            {fmt(walletBalances[String(wallet.id)] || 0)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={labelDarkClass}>Planned Use Date</Label>
                  <input
                    type="date"
                    value={form.planned_use_date}
                    onChange={(e) =>
                      setForm({ ...form, planned_use_date: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#0b1a2f] border border-white/10 text-white cursor-pointer outline-none focus:ring-1 focus:ring-green-500/60"
                  />
                </div>

                <div>
                  <Label className={labelDarkClass}>3 Reasons / Motivations</Label>
                  <div className="space-y-2">
                    {form.reasons.map((reason, i) => (
                      <Input
                        key={i}
                        placeholder={`Reason ${i + 1}`}
                        className={inputDarkClass}
                        value={reason}
                        onChange={(e) => {
                          const updatedReasons = [...form.reasons];
                          updatedReasons[i] = e.target.value;
                          setForm({ ...form, reasons: updatedReasons });
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className={labelDarkClass}>Emotional Value</Label>
                    <Select
                      value={form.emotional_value}
                      onValueChange={(v) =>
                        setForm({ ...form, emotional_value: v })
                      }
                    >
                      <SelectTrigger className={selectDarkTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMOTIONAL_VALUES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className={labelDarkClass}>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v })}
                    >
                      <SelectTrigger className={selectDarkTriggerClass}>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className={labelDarkClass}>Flexibility</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className={`h-10 rounded-xl ${
                        form.flexibility === "flexible"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-transparent border border-white/20 text-white hover:bg-white/5"
                      }`}
                      onClick={() =>
                        setForm({ ...form, flexibility: "flexible" })
                      }
                    >
                      Flexible
                    </Button>

                    <Button
                      type="button"
                      className={`h-10 rounded-xl ${
                        form.flexibility === "must_have"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-transparent border border-white/20 text-white hover:bg-white/5"
                      }`}
                      onClick={() =>
                        setForm({ ...form, flexibility: "must_have" })
                      }
                    >
                      Must Have
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className={labelDarkClass}>Notes</Label>
                  <Textarea
                    placeholder="Notes"
                    className={`${inputDarkClass} min-h-[92px] sm:min-h-[100px]`}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#061224]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={closeFormModal}
                  variant="ghost"
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 rounded-xl bg-green-500 px-4 text-white font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editId ? "Update Goal" : "Create Goal"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {detailGoal && (
        <GoalDetail
          goal={detailGoal}
          wallets={wallets || []}
          walletBalances={walletBalances}
          onClose={() => setDetailGoal(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAddSavings={handleAddSavings}
          totalIncome={data?.totalIncome || 0}
          fmt={fmt}
        />
      )}
    </div>
  );
}

function GoalDetail({
  goal,
  wallets,
  walletBalances,
  onClose,
  onEdit,
  onDelete,
  onAddSavings,
  totalIncome,
  fmt,
}) {
  const [addAmount, setAddAmount] = useState("");

  const saved = Number(goal.saved_amount) || 0;
  const target = Number(goal.target_amount) || 0;
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const remaining = Math.max(target - saved, 0);

  const now = new Date();
  const plannedDate = goal.planned_use_date
    ? new Date(goal.planned_use_date)
    : null;

  const weeksLeft =
    plannedDate && !Number.isNaN(plannedDate.getTime())
      ? Math.max(
          1,
          Math.ceil(
            (plannedDate.getTime() - now.getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          )
        )
      : null;

  const weeklyTarget = remaining > 0 && weeksLeft ? remaining / weeksLeft : null;
  const monthlyTarget = weeklyTarget ? weeklyTarget * 4.3 : null;
  const impactOnRetention =
    totalIncome > 0 ? ((remaining / totalIncome) * 100).toFixed(1) : null;

  const emotionEmojis = {
    joy: "😄",
    security: "🛡️",
    experience: "🌟",
    milestone: "🏆",
  };

  const assignedWallet = wallets.find(
    (wallet) => String(wallet.id) === String(goal.wallet_id)
  );

  const walletBalance = assignedWallet
    ? Number(walletBalances[String(assignedWallet.id)] || 0)
    : 0;

  const quickAmounts = [500, 1000, 2000];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={detailDialogClass}>
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 sm:py-5">
            <DialogHeader className="mb-4 pr-12">
              <DialogTitle className="font-heading text-[1.65rem] sm:text-2xl text-white leading-tight">
                {goal.title}
              </DialogTitle>
              <p className="text-sm text-white/65 mt-1">
                {goal.category}
                {goal.subcategory ? ` • ${goal.subcategory}` : ""}
              </p>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-white/85 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  onClose();
                  onEdit(goal);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                onClick={() => {
                  onDelete(goal.id);
                  onClose();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>

            {assignedWallet ? (
              <div className="rounded-2xl border border-white/10 bg-[#0d1b34] p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">
                  Source Wallet
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-white/90 min-w-0">
                    <Wallet className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="font-medium truncate">
                      {assignedWallet.icon ? `${assignedWallet.icon} ` : ""}
                      {assignedWallet.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-400 shrink-0">
                    {fmt(walletBalance)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-[#0d1b34] p-4 mb-4">
              <div className="flex justify-between items-center mb-2 gap-3">
                <span className="text-sm font-semibold text-white">Progress</span>
                <span className="text-lg font-bold text-green-400">
                  {pct.toFixed(0)}%
                </span>
              </div>

              <div className="h-3.5 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    pct >= 100 ? "grad-green" : "bg-green-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between text-sm text-white/75 gap-3">
                <span>{fmt(saved)} saved</span>
                <span>{fmt(remaining)} remaining</span>
              </div>
            </div>

            {remaining > 0 && (
              <div className="mb-4 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="number"
                    placeholder={
                      assignedWallet
                        ? "Add savings amount"
                        : "Assign a wallet first"
                    }
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="flex-1 h-10 rounded-xl bg-[#081427] border-white/10 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-green-500/60"
                    disabled={!assignedWallet}
                  />

                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white px-5 disabled:opacity-50 sm:min-w-[92px]"
                    onClick={() => {
                      if (!addAmount) return;
                      onAddSavings(goal, parseFloat(addAmount));
                      setAddAmount("");
                    }}
                    disabled={
                      !addAmount ||
                      !assignedWallet ||
                      Number(addAmount) <= 0 ||
                      Number(addAmount) > walletBalance
                    }
                  >
                    Add
                  </Button>
                </div>

                {assignedWallet && (
                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setAddAmount(String(amount))}
                        className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition"
                      >
                        {fmt(amount)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {weeklyTarget ? (
                <div className="flex justify-between items-center gap-3 p-3 rounded-xl border border-white/10 bg-[#0d1b34] text-sm">
                  <span className="text-white/70">Suggested / week</span>
                  <span className="font-bold text-green-400 shrink-0">
                    {fmt(weeklyTarget)}
                  </span>
                </div>
              ) : null}

              {monthlyTarget ? (
                <div className="flex justify-between items-center gap-3 p-3 rounded-xl border border-white/10 bg-[#0d1b34] text-sm">
                  <span className="text-white/70">Suggested / month</span>
                  <span className="font-bold text-green-400 shrink-0">
                    {fmt(monthlyTarget)}
                  </span>
                </div>
              ) : null}

              {impactOnRetention ? (
                <div
                  className={`flex justify-between items-center gap-3 p-3 rounded-xl border text-sm ${
                    parseFloat(impactOnRetention) > 20
                      ? "bg-orange-500/10 border-orange-400/20"
                      : "bg-[#0d1b34] border-white/10"
                  }`}
                >
                  <span className="text-white/70">Impact on leftover %</span>
                  <span
                    className={`font-bold shrink-0 ${
                      parseFloat(impactOnRetention) > 20
                        ? "text-orange-300"
                        : "text-white"
                    }`}
                  >
                    {impactOnRetention}% of income
                  </span>
                </div>
              ) : null}
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1b34] border border-white/10 mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-white/60 mb-3">
                Why this matters {emotionEmojis[goal.emotional_value] || "✨"}
              </p>

              {Array.isArray(goal.reasons) &&
                goal.reasons.filter(Boolean).map((reason, i) => (
                  <p
                    key={i}
                    className="text-sm text-white/90 flex items-start gap-2 mb-2"
                  >
                    <span className="text-green-400 font-bold shrink-0">
                      {i + 1}.
                    </span>
                    <span>{reason}</span>
                  </p>
                ))}

              {goal.notes ? (
                <p className="text-sm text-white/65 mt-3 italic">{goal.notes}</p>
              ) : null}
            </div>

            {goal.planned_use_date ? (
              <p className="text-sm text-white/65 flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                Planned use: {goal.planned_use_date}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
