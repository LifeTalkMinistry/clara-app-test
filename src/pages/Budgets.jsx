import { useState, useEffect } from "react";
import { Plus, Target, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

// ❌ REMOVED base44

export default function Budgets() {
  const { user, isFree } = useUserRole();
  const data = useFinancialData(user?.email);

  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState([]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [form, setForm] = useState({
    month: currentMonth,
    total_budget: "",
    needs_pct: "50",
    wants_pct: "30",
    savings_pct: "20"
  });

  // ✅ TEMP LOCAL STORAGE (replace later with API)
  useEffect(() => {
    const saved = localStorage.getItem("budgets");
    if (saved) setBudgets(JSON.parse(saved));
  }, []);

  const saveBudgets = (updated) => {
    setBudgets(updated);
    localStorage.setItem("budgets", JSON.stringify(updated));
  };

  const handleSubmit = () => {
    if (!form.total_budget || isFree) return;

    const existing = budgets.find(b => b.month === form.month);

    if (existing) {
      const updated = budgets.map(b =>
        b.month === form.month
          ? {
              ...b,
              total_budget: parseFloat(form.total_budget),
              needs_pct: parseFloat(form.needs_pct),
              wants_pct: parseFloat(form.wants_pct),
              savings_pct: parseFloat(form.savings_pct),
            }
          : b
      );

      saveBudgets(updated);
    } else {
      const newBud = {
        ...form,
        id: Date.now(),
        total_budget: parseFloat(form.total_budget),
        needs_pct: parseFloat(form.needs_pct),
        wants_pct: parseFloat(form.wants_pct),
        savings_pct: parseFloat(form.savings_pct),
        tracking_start_date: new Date().toISOString()
      };

      saveBudgets([...budgets, newBud]);
    }

    setOpen(false);
  };

  const handleReset = () => {
    if (!currentBudget) return;

    const confirmReset = confirm("Reset tracking?");
    if (!confirmReset) return;

    const updated = budgets.map(b =>
      b.id === currentBudget.id
        ? { ...b, tracking_start_date: new Date().toISOString() }
        : b
    );

    saveBudgets(updated);
  };

  const currentBudget = budgets.find(b => b.month === currentMonth);

  const fmt = (n) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(n);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const needsBudget = currentBudget
    ? (currentBudget.total_budget * (currentBudget.needs_pct || 50) / 100)
    : 0;

  const wantsBudget = currentBudget
    ? (currentBudget.total_budget * (currentBudget.wants_pct || 30) / 100)
    : 0;

  const savingsBudget = currentBudget
    ? (currentBudget.total_budget * (currentBudget.savings_pct || 20) / 100)
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader title="Budgets" subtitle="Set your monthly spending limits" />

      {!isFree && !currentBudget && (
        <EmptyState
          icon={Target}
          title="No budget set"
          description="Set your monthly budget"
        />
      )}

      {!isFree && currentBudget && (
        <div className="bg-card p-4 rounded-xl">
          <p className="text-lg font-bold">{fmt(currentBudget.total_budget)}</p>
        </div>
      )}
    </div>
  );
}