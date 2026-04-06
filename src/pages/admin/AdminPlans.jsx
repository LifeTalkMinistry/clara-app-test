import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Star } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabaseClient";

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

function normalizeFeatures(features) {
  if (Array.isArray(features)) return features.filter(Boolean);

  if (typeof features === "string") {
    return features
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatPrice(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-PH");
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      setPlans([]);
    } else {
      setPlans(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const sortedPlans = useMemo(() => {
    return [...plans].sort(
      (a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)
    );
  }, [plans]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditId(null);
  };

  const handleOpenChange = (value) => {
    if (!value) resetForm();
    setOpen(value);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    if (form.price === "" || form.price === null) return;

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      plan_key: form.plan_key,
      price: Number(form.price || 0),
      description: form.description?.trim() || "",
      features: normalizeFeatures(form.features),
      cta_label: form.cta_label?.trim() || "Enroll Now",
      is_active: Boolean(form.is_active),
      is_popular: Boolean(form.is_popular),
      sort_order: Number(form.sort_order || 1),
      updated_at: new Date().toISOString(),
    };

    if (payload.is_popular) {
      await supabase
        .from("plans")
        .update({ is_popular: false, updated_at: new Date().toISOString() })
        .neq("id", editId || "00000000-0000-0000-0000-000000000000");
    }

    let error = null;

    if (editId) {
      const res = await supabase.from("plans").update(payload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("plans").insert(payload);
      error = res.error;
    }

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    await fetchPlans();
    resetForm();
    setOpen(false);
    setSaving(false);
  };

  const handleEdit = (plan) => {
    setForm({
      name: plan.name || "",
      plan_key: plan.plan_key || "basic",
      price: String(plan.price ?? ""),
      description: plan.description || "",
      features: Array.isArray(plan.features)
        ? plan.features.join("\n")
        : plan.features || "",
      cta_label: plan.cta_label || "Enroll Now",
      is_active: Boolean(plan.is_active),
      is_popular: Boolean(plan.is_popular),
      sort_order: Number(plan.sort_order || 1),
    });

    setEditId(plan.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await fetchPlans();
  };

  const toggleActive = async (plan) => {
    const { error } = await supabase
      .from("plans")
      .update({
        is_active: !plan.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await fetchPlans();
  };

  const togglePopular = async (plan) => {
    const makePopular = !plan.is_popular;

    await supabase
      .from("plans")
      .update({ is_popular: false, updated_at: new Date().toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { error } = await supabase
      .from("plans")
      .update({
        is_popular: makePopular,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await fetchPlans();
  };

  const movePlan = async (planId, direction) => {
    const current = [...sortedPlans];
    const index = current.findIndex((plan) => plan.id === planId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    const updates = current.map((plan, idx) => ({
      id: plan.id,
      sort_order: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const row of updates) {
      await supabase
        .from("plans")
        .update({
          sort_order: row.sort_order,
          updated_at: row.updated_at,
        })
        .eq("id", row.id);
    }

    await fetchPlans();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Plans</h3>
          <p className="text-sm text-muted-foreground">
            These plans control what users see in enrollment.
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Plan
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Plan" : "Create Plan"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Plan Name"
                />
              </div>

              <div className="space-y-2">
                <Label>Plan Key</Label>
                <Select
                  value={form.plan_key}
                  onValueChange={(value) =>
                    setForm({ ...form, plan_key: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLARA_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="2999"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Short plan description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <Textarea
                  value={form.features}
                  onChange={(e) =>
                    setForm({ ...form, features: e.target.value })
                  }
                  placeholder="One feature per line"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>CTA Label</Label>
                <Input
                  value={form.cta_label}
                  onChange={(e) =>
                    setForm({ ...form, cta_label: e.target.value })
                  }
                  placeholder="Enroll Now"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label>Active</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(value) =>
                      setForm({ ...form, is_active: value })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label>Popular</Label>
                  <Switch
                    checked={form.is_popular}
                    onCheckedChange={(value) =>
                      setForm({ ...form, is_popular: value })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {sortedPlans.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground text-center">
            No plans yet.
          </div>
        ) : (
          sortedPlans.map((plan, index) => (
            <div
              key={plan.id}
              className="rounded-2xl border bg-card p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{plan.name}</p>

                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                    {plan.plan_key}
                  </span>

                  {plan.is_popular && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 inline-flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Popular
                    </span>
                  )}

                  {!plan.is_active && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  ₱{formatPrice(plan.price)} • Sort #{plan.sort_order}
                </p>

                {plan.description ? (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {plan.description}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => movePlan(plan.id, "up")}
                  disabled={index === 0}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => movePlan(plan.id, "down")}
                  disabled={index === sortedPlans.length - 1}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>

                <div className="px-2">
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={() => toggleActive(plan)}
                  />
                </div>

                <Button
                  variant={plan.is_popular ? "default" : "outline"}
                  size="icon"
                  onClick={() => togglePopular(plan)}
                >
                  <Star className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleEdit(plan)}
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(plan.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}