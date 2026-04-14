import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const EMPTY_FORM = {
  id: null,
  name: "",
  plan_key: "",
  price: "",
  sort_order: 1,
  description: "",
  features: "",
  cta_label: "",
  active: true,
  popular: false,
};

function normalizePlan(row) {
  return {
    id: row.id ?? null,
    name: row.name ?? "",
    plan_key: row.plan_key ?? "",
    price: row.price ?? "",
    sort_order: row.sort_order ?? 1,
    description: row.description ?? "",
    features: Array.isArray(row.features)
      ? row.features.join("\n")
      : typeof row.features === "string"
      ? row.features
      : "",
    cta_label: row.cta_label ?? "",
    active: !!row.active,
    popular: !!row.popular,
  };
}

function parseFeatures(featuresText) {
  return featuresText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [currentUser, setCurrentUser] = useState(null);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const aOrder = Number(a.sort_order ?? 9999);
      const bOrder = Number(b.sort_order ?? 9999);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [plans]);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user || null);
      await fetchPlans();
    } catch (error) {
      console.error("Failed to initialize AdminPlans:", error);
      alert(error.message || "Failed to load admin plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  async function fetchPlans() {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch plans:", error);
      throw error;
    }

    setPlans((data || []).map(normalizePlan));
  }

  function openCreateDialog() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(plan) {
    setForm(normalizePlan(plan));
    setDialogOpen(true);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm() {
    if (!form.name.trim()) return "Plan name is required.";
    if (!form.plan_key.trim()) return "Plan key is required.";
    if (form.price === "" || isNaN(Number(form.price))) return "Price must be a valid number.";
    if (form.sort_order === "" || isNaN(Number(form.sort_order))) return "Sort order must be a valid number.";
    return null;
  }

  async function handleSave(e) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    if (!currentUser?.email) {
      alert("No authenticated user found.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        plan_key: form.plan_key.trim().toLowerCase(),
        price: Number(form.price),
        sort_order: Number(form.sort_order),
        description: form.description.trim(),
        features: parseFeatures(form.features),
        cta_label: form.cta_label.trim(),
        active: !!form.active,
        popular: !!form.popular,
        created_by: currentUser.email,
      };

      if (form.id) {
        const { error } = await supabase
          .from("plans")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert([payload]);
        if (error) throw error;
      }

      await fetchPlans();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error("Failed to save plan:", error);
      alert(error.message || "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(planId) {
    const confirmed = window.confirm("Delete this plan?");
    if (!confirmed) return;

    setDeletingId(planId);

    try {
      const { error } = await supabase.from("plans").delete().eq("id", planId);
      if (error) throw error;

      setPlans((prev) => prev.filter((item) => item.id !== planId));
    } catch (error) {
      console.error("Failed to delete plan:", error);
      alert(error.message || "Failed to delete plan.");
    } finally {
      setDeletingId(null);
    }
  }

  async function togglePlanStatus(plan, field) {
    try {
      const nextValue = !plan[field];

      const { error } = await supabase
        .from("plans")
        .update({
          [field]: nextValue,
          created_by: currentUser?.email || plan.created_by || "",
        })
        .eq("id", plan.id);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id ? { ...item, [field]: nextValue } : item
        )
      );
    } catch (error) {
      console.error(`Failed to toggle ${field}:`, error);
      alert(error.message || `Failed to update ${field}.`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Plans</h2>
          <p className="text-sm text-muted-foreground">
            Manage CLARA pricing plans here.
          </p>
        </div>

        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Plan
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedPlans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No plans found yet.
            </CardContent>
          </Card>
        ) : (
          sortedPlans.map((plan) => (
            <Card key={plan.id} className="border border-white/10 bg-black/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Key: {plan.plan_key} • ₱{Number(plan.price || 0).toLocaleString()} • Order: {plan.sort_order}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(plan.id)}
                      disabled={deletingId === plan.id}
                    >
                      {deletingId === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {plan.description ? (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                ) : null}

                {plan.features ? (
                  <div className="text-sm whitespace-pre-line">
                    {plan.features}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`active-${plan.id}`}>Active</Label>
                    <Switch
                      id={`active-${plan.id}`}
                      checked={!!plan.active}
                      onCheckedChange={() => togglePlanStatus(plan, "active")}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor={`popular-${plan.id}`}>Popular</Label>
                    <Switch
                      id={`popular-${plan.id}`}
                      checked={!!plan.popular}
                      onCheckedChange={() => togglePlanStatus(plan, "popular")}
                    />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    CTA: {plan.cta_label || "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Plan" : "Add Plan"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="DIY"
                />
              </div>

              <div className="space-y-2">
                <Label>Plan Key</Label>
                <Input
                  value={form.plan_key}
                  onChange={(e) => updateField("plan_key", e.target.value)}
                  placeholder="basic"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="299"
                />
              </div>

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => updateField("sort_order", e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Short summary of the plan"
              />
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <Textarea
                rows={6}
                value={form.features}
                onChange={(e) => updateField("features", e.target.value)}
                placeholder={`Full access to modules\nDaily tasks\nDashboard tracking`}
              />
              <p className="text-xs text-muted-foreground">
                One feature per line.
              </p>
            </div>

            <div className="space-y-2">
              <Label>CTA Label</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => updateField("cta_label", e.target.value)}
                placeholder="Choose DIY"
              />
            </div>

            <div className="flex items-center gap-8 rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="form-active">Active</Label>
                <Switch
                  id="form-active"
                  checked={!!form.active}
                  onCheckedChange={(checked) => updateField("active", checked)}
                />
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="form-popular">Popular</Label>
                <Switch
                  id="form-popular"
                  checked={!!form.popular}
                  onCheckedChange={(checked) => updateField("popular", checked)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : form.id ? (
                "Update Plan"
              ) : (
                "Create Plan"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
