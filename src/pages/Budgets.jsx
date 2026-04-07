import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Target, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const STORAGE_KEYS = {
  budgets: "clara_budgets",
  expenses: "clara_expenses",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const isOwnedByUser = (item, user) => {
  if (!item || !user) return false;

  const userEmail = normalizeText(user.email);
  const userId = normalizeText(user.id);

  const values = [
    item?.created_by,
    item?.email,
    item?.user_email,
    item?.userEmail,
    item?.owner_email,
    item?.user_id,
    item?.userId,
    item?.created_by_id,
    item?.owner_id,
  ]
    .filter(Boolean)
    .map(normalizeText);

  return values.includes(userEmail) || values.includes(userId);
};

const getItemDate = (item) => {
  const raw =
    item?.date ||
    item?.expense_date ||
    item?.created_at ||
    item?.timestamp ||
    item?.transaction_date ||
    item?.datetime;

  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const getExpenseAmount = (item) => {
  return Math.abs(
    toNumber(
      item?.amount ??
        item?.value ??
        item?.spent ??
        item?.expense_amount ??
        item?.transaction_amount ??
        item?.total ??
        0
    )
  );
};

const getExpenseType = (item) => {
  return normalizeText(
    item?.type ||
      item?.category ||
      item?.category_type ||
      item?.classification ||
      item?.expense_type ||
      item?.bucket ||
      item?.budget_type ||
      item?.label
  );
};

const getMonthKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function Budgets() {
  const { user, isFree } = useUserRole();

  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [resetting, setResetting] = useState(false);

  const now = new Date();
  const currentMonth = getMonthKey(now);

  const [form, setForm] = useState({
    month: currentMonth,
    total_budget: "",
    needs_pct: "50",
    wants_pct: "30",
    savings_pct: "20",
  });

  const refreshPageData = useCallback(() => {
    if (!user) {
      setBudgets([]);
      setExpenses([]);
      return;
    }

    const allBudgets = getStoredData(STORAGE_KEYS.budgets);
    const allExpenses = getStoredData(STORAGE_KEYS.expenses);

    const userBudgets = allBudgets.filter((item) => isOwnedByUser(item, user));
    const userExpenses = allExpenses.filter((item) => isOwnedByUser(item, user));

    setBudgets(userBudgets);
    setExpenses(userExpenses);
  }, [user]);

  useEffect(() => {
    refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    const onRefresh = () => refreshPageData();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshPageData();
      }
    };

    window.addEventListener("storage", onRefresh);
    window.addEventListener("focus", onRefresh);
    window.addEventListener("clara-expenses-updated", onRefresh);
    window.addEventListener("clara-budgets-updated", onRefresh);
    window.addEventListener("clara-finance-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onRefresh);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("clara-expenses-updated", onRefresh);
      window.removeEventListener("clara-budgets-updated", onRefresh);
      window.removeEventListener("clara-finance-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshPageData]);

  const currentBudget = useMemo(() => {
    return budgets.find((b) => b.month === currentMonth) || null;
  }, [budgets, currentMonth]);

  useEffect(() => {
    if (currentBudget) {
      setForm({
        month: currentBudget.month || currentMonth,
        total_budget: String(currentBudget.total_budget ?? ""),
        needs_pct: String(currentBudget.needs_pct ?? 50),
        wants_pct: String(currentBudget.wants_pct ?? 30),
        savings_pct: String(currentBudget.savings_pct ?? 20),
      });
    } else {
      setForm({
        month: currentMonth,
        total_budget: "",
        needs_pct: "50",
        wants_pct: "30",
        savings_pct: "20",
      });
    }
  }, [currentBudget, currentMonth]);

  const financials = useMemo(() => {
    const result = {
      totalSpent: 0,
      needsSpent: 0,
      wantsSpent: 0,
      savingsSpent: 0,
    };

    const trackingStart = currentBudget?.tracking_start_date
      ? new Date(currentBudget.tracking_start_date)
      : null;

    expenses.forEach((item) => {
      const d = getItemDate(item);
      if (!d) return;

      if (getMonthKey(d) !== currentMonth) return;

      if (trackingStart && !Number.isNaN(trackingStart.getTime()) && d < trackingStart) {
        return;
      }

      const amount = getExpenseAmount(item);
      const type = getExpenseType(item);

      result.totalSpent += amount;

      if (type === "needs" || type === "need") {
        result.needsSpent += amount;
      } else if (type === "wants" || type === "want") {
        result.wantsSpent += amount;
      } else if (type === "savings" || type === "saving") {
        result.savingsSpent += amount;
      }
    });

    return result;
  }, [expenses, currentBudget, currentMonth]);

  const handleSubmit = () => {
    if (!form.total_budget || isFree || !user?.email) return;

    const totalBudget = toNumber(form.total_budget);
    const needsPct = toNumber(form.needs_pct);
    const wantsPct = toNumber(form.wants_pct);
    const savingsPct = toNumber(form.savings_pct);

    if (totalBudget <= 0) {
      alert("Please enter a valid total budget.");
      return;
    }

    if (needsPct + wantsPct + savingsPct !== 100) {
      alert("Needs, Wants, and Savings must total exactly 100%.");
      return;
    }

    const allBudgets = getStoredData(STORAGE_KEYS.budgets);
    const existing = allBudgets.find(
      (b) => isOwnedByUser(b, user) && b.month === form.month
    );

    if (existing) {
      const updatedBudget = {
        ...existing,
        total_budget: totalBudget,
        needs_pct: needsPct,
        wants_pct: wantsPct,
        savings_pct: savingsPct,
        updated_at: new Date().toISOString(),
      };

      setStoredData(
        STORAGE_KEYS.budgets,
        allBudgets.map((item) => (item.id === existing.id ? updatedBudget : item))
      );
    } else {
      const newBudget = {
        id: generateId(),
        created_by: user.email,
        email: user.email,
        user_email: user.email,
        userEmail: user.email,
        user_id: user.id ?? "",
        userId: user.id ?? "",
        month: form.month,
        total_budget: totalBudget,
        needs_pct: needsPct,
        wants_pct: wantsPct,
        savings_pct: savingsPct,
        tracking_start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      setStoredData(STORAGE_KEYS.budgets, [...allBudgets, newBudget]);
    }

    refreshPageData();
    window.dispatchEvent(new Event("clara-budgets-updated"));
    window.dispatchEvent(new Event("clara-finance-updated"));
    setOpen(false);
  };

  const handleReset = () => {
    if (!currentBudget || !user?.email || resetting) return;

    const confirmReset = window.confirm(
      "Reset tracking? Old expenses before today will no longer count for this month."
    );
    if (!confirmReset) return;

    try {
      setResetting(true);

      const allBudgets = getStoredData(STORAGE_KEYS.budgets);

      const updatedBudget = {
        ...currentBudget,
        tracking_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setStoredData(
        STORAGE_KEYS.budgets,
        allBudgets.map((item) => (item.id === currentBudget.id ? updatedBudget : item))
      );

      refreshPageData();
      window.dispatchEvent(new Event("clara-budgets-updated"));
      window.dispatchEvent(new Event("clara-expenses-updated"));
      window.dispatchEvent(new Event("clara-finance-updated"));
    } finally {
      setTimeout(() => setResetting(false), 150);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(toNumber(n));

  const totalBudget = toNumber(currentBudget?.total_budget);
  const needsBudget = currentBudget
    ? (totalBudget * toNumber(currentBudget.needs_pct || 50)) / 100
    : 0;
  const wantsBudget = currentBudget
    ? (totalBudget * toNumber(currentBudget.wants_pct || 30)) / 100
    : 0;
  const savingsBudget = currentBudget
    ? (totalBudget * toNumber(currentBudget.savings_pct || 20)) / 100
    : 0;

  const totalSpent = toNumber(financials.totalSpent);
  const needsSpent = toNumber(financials.needsSpent);
  const wantsSpent = toNumber(financials.wantsSpent);
  const savingsSpent = toNumber(financials.savingsSpent);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Budgets"
        subtitle="Set your monthly spending limits"
        action={
          isFree ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">
              <Lock className="w-3.5 h-3.5" /> Upgrade to use budgets
            </div>
          ) : (
            <div className="flex gap-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {currentBudget ? "Edit" : "Set"} Budget
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {currentBudget ? "Edit" : "Set"} Monthly Budget
                    </DialogTitle>
                    <DialogDescription>
                      Set your total monthly budget and category split.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Month</Label>
                      <Input
                        type="month"
                        value={form.month}
                        onChange={(e) =>
                          setForm({ ...form, month: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label>Total Budget (₱)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.total_budget}
                        onChange={(e) =>
                          setForm({ ...form, total_budget: e.target.value })
                        }
                      />
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-3">50/30/20 SPLIT</p>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Needs %</Label>
                          <Input
                            type="number"
                            value={form.needs_pct}
                            onChange={(e) =>
                              setForm({ ...form, needs_pct: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Wants %</Label>
                          <Input
                            type="number"
                            value={form.wants_pct}
                            onChange={(e) =>
                              setForm({ ...form, wants_pct: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Savings %</Label>
                          <Input
                            type="number"
                            value={form.savings_pct}
                            onChange={(e) =>
                              setForm({ ...form, savings_pct: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-3">
                        Total must equal 100%
                      </p>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full"
                      disabled={!form.total_budget}
                    >
                      Save Budget
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {currentBudget && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={resetting}
                >
                  <RotateCcw
                    className={`w-4 h-4 mr-1 ${resetting ? "animate-spin" : ""}`}
                  />
                  {resetting ? "Resetting..." : "Reset"}
                </Button>
              )}
            </div>
          )
        }
      />

      {!isFree && !currentBudget && (
        <EmptyState
          icon={Target}
          title="No budget set"
          description="Set your monthly budget to start tracking against your spending goals."
        />
      )}

      {!isFree && currentBudget && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">MONTHLY BUDGET</p>
                <p className="font-heading text-2xl font-bold">
                  {fmt(totalBudget)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">SPENT</p>
                <p className="font-heading text-2xl font-bold text-destructive">
                  {fmt(totalSpent)}
                </p>
              </div>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  totalSpent > totalBudget ? "bg-destructive" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {fmt(Math.max(0, totalBudget - totalSpent))} remaining
            </p>
          </div>

          {[
            {
              label: "Needs",
              budget: needsBudget,
              spent: needsSpent,
              color: "bg-primary",
            },
            {
              label: "Wants",
              budget: wantsBudget,
              spent: wantsSpent,
              color: "bg-secondary",
            },
            {
              label: "Savings",
              budget: savingsBudget,
              spent: savingsSpent,
              color: "bg-accent",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">
                  {fmt(item.spent)} / {fmt(item.budget)}
                </span>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.spent > item.budget ? "bg-destructive" : item.color
                  }`}
                  style={{
                    width: `${
                      item.budget > 0
                        ? Math.min((item.spent / item.budget) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}