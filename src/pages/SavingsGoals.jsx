import { useState, useEffect } from "react";
import { Plus, Target, Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import useUserRole from "../hooks/useUserRole";

const EMPTY_FORM = {
  title: "",
  target_amount: "",
  saved_amount: "0",
  planned_use_date: "",
};

export default function SavingsGoals() {
  const { user } = useUserRole();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    fetch(`/api/goals?email=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => {
        setGoals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (goal) => {
    setForm({
      title: goal.title || "",
      target_amount: String(goal.target_amount ?? ""),
      saved_amount: String(goal.saved_amount ?? 0),
      planned_use_date: goal.planned_use_date || "",
    });
    setEditId(goal.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.target_amount) return;

    const payload = {
      ...form,
      title: form.title.trim(),
      target_amount: parseFloat(form.target_amount) || 0,
      saved_amount: parseFloat(form.saved_amount) || 0,
    };

    try {
      if (editId) {
        const res = await fetch(`/api/goals/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const updated = await res.json();
        setGoals((prev) => prev.map((g) => (g.id === editId ? updated : g)));
      } else {
        const res = await fetch(`/api/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            user_email: user.email,
          }),
        });

        const newGoal = await res.json();
        setGoals((prev) => [newGoal, ...prev]);
      }

      setOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error("Failed to save goal:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto text-white">
      <PageHeader
        title="Savings Goals"
        subtitle="Track your progress toward the things that matter most."
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        }
      />

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Target className="w-7 h-7 text-emerald-400" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            No goals yet
          </h3>

          <p className="text-sm text-white/60 max-w-md mx-auto mb-5">
            Create your first savings goal and start tracking your progress.
          </p>

          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Add Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const saved = Number(goal.saved_amount || 0);
            const target = Number(goal.target_amount || 0);
            const pct =
              target > 0 ? Math.min((saved / target) * 100, 100) : 0;

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-white/10 bg-[#0F172A] p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-white">{goal.title}</p>
                    <p className="text-sm text-white/60">
                      {fmt(saved)} / {fmt(target)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(goal)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-white/50">
                    {pct.toFixed(0)}% completed
                  </p>

                  {goal.planned_use_date && (
                    <p className="text-xs text-white/50 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {goal.planned_use_date}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0F172A] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Target</Label>
              <Input
                type="number"
                value={form.target_amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    target_amount: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Saved</Label>
              <Input
                type="number"
                value={form.saved_amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, saved_amount: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.planned_use_date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    planned_use_date: e.target.value,
                  }))
                }
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}