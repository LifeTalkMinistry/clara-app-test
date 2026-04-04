import { useState, useEffect } from "react";
import {
  Plus, Target, AlertTriangle, Calendar, Edit, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

const STORAGE_KEY = "clara_savings_goals";

const safeRead = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const safeWrite = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const EMPTY_FORM = {
  title: "", target_amount: "", saved_amount: "0",
  planned_use_date: "", reasons: ["", "", ""],
  priority: "medium", notes: ""
};

export default function SavingsGoals() {
  const { user } = useUserRole();
  const data = useFinancialData(user?.email);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const stored = safeRead();
    setGoals(stored);
    setLoading(false);
  }, []);

  const saveGoals = (updated) => {
    setGoals(updated);
    safeWrite(updated);
  };

  const handleSave = () => {
    if (!form.title || !form.target_amount) return;

    const payload = {
      ...form,
      id: editId || Date.now(),
      target_amount: parseFloat(form.target_amount),
      saved_amount: parseFloat(form.saved_amount) || 0,
      created_by: user?.email
    };

    let updated;

    if (editId) {
      updated = goals.map(g => g.id === editId ? payload : g);
    } else {
      updated = [payload, ...goals];
    }

    saveGoals(updated);
    setOpen(false);
    setEditId(null);
  };

  const handleDelete = (id) => {
    const updated = goals.filter(g => g.id !== id);
    saveGoals(updated);
  };

  const handleAddSavings = (goal, amount) => {
    const updated = goals.map(g => {
      if (g.id === goal.id) {
        return {
          ...g,
          saved_amount: Math.min(
            (g.saved_amount || 0) + amount,
            g.target_amount
          )
        };
      }
      return g;
    });

    saveGoals(updated);
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n || 0);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Savings Goals"
        subtitle="Plan and track what matters most"
        action={
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" />
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = goal.target_amount > 0
              ? (goal.saved_amount / goal.target_amount) * 100
              : 0;

            return (
              <div key={goal.id} className="p-4 border rounded-xl bg-card">
                <div className="flex justify-between">
                  <p className="font-semibold">{goal.title}</p>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => {
                      setForm(goal);
                      setEditId(goal.id);
                      setOpen(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(goal.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {fmt(goal.saved_amount)} / {fmt(goal.target_amount)}
                </p>

                <div className="h-2 bg-muted rounded mt-2">
                  <div
                    className="h-full bg-primary rounded"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add amount"
                    type="number"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddSavings(goal, parseFloat(e.target.value));
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "New"} Goal</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Goal title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <Input
              type="number"
              placeholder="Target amount"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
            />

            <Textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <Button onClick={handleSave} className="w-full">
              Save Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}