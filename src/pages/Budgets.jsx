import { useState, useEffect } from "react";
import { Plus, Target, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

const STORAGE_KEYS = {
  budgets: "clara_budgets",
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

export default function Budgets() {
  const { user, isFree } = useUserRole();
  const data = useFinancialData(user?.email);
  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState([]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const [form, setForm] = useState({
    month: currentMonth,
    total_budget: "",
    needs_pct: "50",
    wants_pct: "30",
    savings_pct: "20",
  });

  useEffect(() => {
    if (!user?.email) return;

    const allBudgets = getStoredData(STORAGE_KEYS.budgets);
    const userBudgets = allBudgets.filter(
      (item) => item.created_by === user.email
    );

    setBudgets(userBudgets);
  }, [user?.email]);

  const currentBudget = budgets.find((b) => b.month === currentMonth);

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

  const handleSubmit = async () => {
    if (!form.total_budget || isFree || !user?.email) return;

    const allBudgets = getStoredData(STORAGE_KEYS.budgets);
    const existing = budgets.find((b) => b.month === form.month);

    if (existing) {
      const updatedBudget = {
        ...existing,
        total_budget: parseFloat(form.total_budget),
        needs_pct: parseFloat(form.needs_pct),
        wants_pct: parseFloat(form.wants_pct),
        savings_pct: parseFloat(form.savings_pct),
        updated_at: new Date().toISOString(),
      };

      const updatedAllBudgets = allBudgets.map((item) =>
        item.id === existing.id ? updatedBudget : item
      );

      setStoredData(STORAGE_KEYS.budgets, updatedAllBudgets);
      setBudgets(updatedAllBudgets.filter((item) => item.created_by === user.email));
    } else {
      const newBudget = {
        id: generateId(),
        created_by: user.email,
        month: form.month,
        total_budget: parseFloat(form.total_budget),
        needs_pct: parseFloat(form.needs_pct),
        wants_pct: parseFloat(form.wants_pct),
        savings_pct: parseFloat(form.savings_pct),
        tracking_start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const updatedAllBudgets = [...allBudgets, newBudget];
      setStoredData(STORAGE_KEYS.budgets, updatedAllBudgets);
      setBudgets(updatedAllBudgets.filter((item) => item.created_by === user.email));
    }

    setOpen(false);
  };

  const handleReset = async () => {
    if (!currentBudget || !user?.email) return;

    const confirmReset = window.confirm(
      "Reset tracking? Old expenses will not be counted."
    );
    if (!confirmReset) return;

    const allBudgets = getStoredData(STORAGE_KEYS.budgets);

    const updatedBudget = {
      ...currentBudget,
      tracking_start_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedAllBudgets = allBudgets.map((item) =>
      item.id === currentBudget.id ? updatedBudget : item
    );

    setStoredData(STORAGE_KEYS.budgets, updatedAllBudgets);
    setBudgets(updatedAllBudgets.filter((item) => item.created_by === user.email));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n || 0);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const needsBudget = currentBudget
    ? (currentBudget.total_budget * (currentBudget.needs_pct || 50)) / 100
    : 0;

  const wantsBudget = currentBudget
    ? (currentBudget.total_budget * (currentBudget.wants_pct || 30)) / 100
    : 0;

  const savingsBudget = currentBudget
    ? (currentBudget.total_budget * (currentBudget.savings_pct || 20)) / 100
    : 0;

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
                <Button size="sm" variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
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
                  {fmt(currentBudget.total_budget)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">SPENT</p>
                <p className="font-heading text-2xl font-bold text-destructive">
                  {fmt(data.thisMonthSpent)}
                </p>
              </div>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  data.thisMonthSpent > currentBudget.total_budget
                    ? "bg-destructive"
                    : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    (data.thisMonthSpent / currentBudget.total_budget) * 100,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {fmt(Math.max(0, currentBudget.total_budget - data.thisMonthSpent))}{" "}
              remaining
            </p>
          </div>

          {[
            {
              label: "Needs",
              budget: needsBudget,
              spent: data.needsSpent,
              color: "bg-primary",
            },
            {
              label: "Wants",
              budget: wantsBudget,
              spent: data.wantsSpent,
              color: "bg-secondary",
            },
            {
              label: "Savings",
              budget: savingsBudget,
              spent: data.savingsSpent,
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
                  className={`h-full ${
                    item.spent > item.budget ? "bg-destructive" : item.color
                  } rounded-full`}
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