import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const CLARA_TIERS = ["free", "basic", "transformation", "elite", "student"];

const EMPTY = {
  name: "",
  plan_key: "basic",
  price: "",
  description: "",
  features: "",
  cta_label: "Enroll Now",
  is_active: true,
  is_popular: false,
  sort_order: 1,
};

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await API.get("/plans");
      setPlans(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;

    const featuresArray =
      typeof form.features === "string"
        ? form.features.split("\n").map(f => f.trim()).filter(Boolean)
        : form.features;

    const data = {
      ...form,
      price: parseFloat(form.price),
      sort_order: parseInt(form.sort_order) || 1,
      features: featuresArray,
    };

    try {
      if (editId) {
        const res = await API.put(`/plans/${editId}`, data);
        setPlans(prev => prev.map(p => p.id === editId ? res.data : p));
      } else {
        const res = await API.post("/plans", data);
        setPlans(prev => [...prev, res.data]);
      }

      setForm(EMPTY);
      setEditId(null);
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (plan) => {
    setForm({
      ...plan,
      features: Array.isArray(plan.features)
        ? plan.features.join("\n")
        : (plan.features || ""),
    });
    setEditId(plan.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await API.delete(`/plans/${id}`);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const toggleActive = async (plan) => {
    const res = await API.patch(`/plans/${plan.id}`, {
      is_active: !plan.is_active,
    });
    setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div>
      <div className="mb-4">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!v) {
              setForm(EMPTY);
              setEditId(null);
            }
            setOpen(v);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Plan
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Create"} Plan</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Plan Name"
              />

              <Select
                value={form.plan_key}
                onValueChange={(v) => setForm({ ...form, plan_key: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLARA_TIERS.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price"
              />

              <Textarea
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="Features (one per line)"
              />

              <Input
                value={form.cta_label}
                onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
              />

              <div className="flex gap-4">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) =>
                    setForm({ ...form, is_active: v })
                  }
                />
                <Label>Active</Label>

                <Switch
                  checked={form.is_popular}
                  onCheckedChange={(v) =>
                    setForm({ ...form, is_popular: v })
                  }
                />
                <Label>Popular</Label>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {plans.map(plan => (
          <div
            key={plan.id}
            className="flex items-center gap-3 p-4 bg-card rounded-xl border"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-muted-foreground">
                ₱{plan.price}
              </p>
            </div>

            <Switch
              checked={plan.is_active}
              onCheckedChange={() => toggleActive(plan)}
            />

            <Button size="icon" onClick={() => handleEdit(plan)}>
              <Edit className="w-4 h-4" />
            </Button>

            <Button size="icon" onClick={() => handleDelete(plan.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}