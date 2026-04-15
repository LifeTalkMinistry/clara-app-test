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
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";
import {
  CURRENT_PLAN_KEYS,
  FEATURE_DEFINITIONS,
  FEATURE_MODE_LABELS,
  PLAN_LABELS,
  getFeatureSummary,
  getPlanDefaults,
  mergePlans,
  normalizeAccessConfig,
  sanitizePlanRow,
} from "@/lib/plan-config";

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

function parseFeatures(featuresText) {
  return String(featuresText || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildForm(plan) {
  return {
    id: plan.id ?? null,
    name: plan.name ?? "",
    plan_key: plan.plan_key ?? "",
    price: String(plan.price ?? 0),
    sort_order: Number(plan.sort_order ?? 1),
    description: plan.description ?? "",
    features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
    cta_label: plan.cta_label ?? "",
    active: !!plan.active,
    popular: !!plan.popular,
  };
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingPlanKey, setEditingPlanKey] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const orderDiff = Number(a.sort_order || 9999) - Number(b.sort_order || 9999);
      if (orderDiff !== 0) return orderDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [plans]);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    setPlans(mergePlans(data || []).filter((plan) => CURRENT_PLAN_KEYS.includes(plan.plan_key)));
  }, []);

  const ensureCurrentPlans = useCallback(async () => {
    const { data, error } = await supabase.from("plans").select("*");
    if (error) throw error;

    const merged = mergePlans(data || []);
    const existingKeys = new Set((data || []).map((row) => String(row.plan_key || "").trim().toLowerCase()));
    const missingPlans = merged.filter((plan) => !existingKeys.has(plan.plan_key));

    if (missingPlans.length === 0) return;

    const payload = missingPlans.map((plan) => ({
      ...getPlanDefaults(plan.plan_key),
      created_by: currentUser?.email || "",
    }));

    const { error: insertError } = await supabase.from("plans").insert(payload);
    if (insertError) throw insertError;
  }, [currentUser?.email]);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user || null);
    } catch (error) {
      console.error("Failed to initialize admin plans:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;

    const boot = async () => {
      try {
        setLoading(true);
        await ensureCurrentPlans();
        await fetchPlans();
      } catch (error) {
        console.error("Failed to prepare plans:", error);
        alert(error.message || "Failed to load plans.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    boot();

    const channel = supabase
      .channel("admin-plans-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, () => {
        fetchPlans().catch((error) => {
          console.error("Failed to refresh plans after change:", error);
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser, ensureCurrentPlans, fetchPlans]);

  function openEditDialog(plan) {
    const normalized = sanitizePlanRow(plan);
    setEditingPlanKey(normalized.plan_key);
    setForm(buildForm(normalized));
    setDialogOpen(true);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function updatePlan(planId, payload) {
    const { error } = await supabase.from("plans").update(payload).eq("id", planId);
    if (error) throw error;
  }

  async function handleSave(e) {
    e.preventDefault();

    const normalizedPlanKey = editingPlanKey || form.plan_key;
    const payload = {
      name: form.name.trim() || PLAN_LABELS[normalizedPlanKey],
      price: Number(form.price || 0),
      sort_order: Number(form.sort_order || 1),
      description: form.description.trim(),
      features: parseFeatures(form.features),
      cta_label: form.cta_label.trim(),
      active: !!form.active,
      popular: !!form.popular,
      created_by: currentUser?.email || "",
    };

    try {
      setSaving(true);
      if (!form.id) throw new Error("Plan record not found.");
      await updatePlan(form.id, payload);
      await fetchPlans();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingPlanKey("");
    } catch (error) {
      console.error("Failed to save plan details:", error);
      alert(error.message || "Failed to save plan details.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePlanField(plan, field) {
    try {
      const nextValue = !plan[field];
      await updatePlan(plan.id, {
        [field]: nextValue,
        created_by: currentUser?.email || "",
      });
      setPlans((prev) =>
        prev.map((item) => (item.id === plan.id ? { ...item, [field]: nextValue } : item))
      );
    } catch (error) {
      console.error(`Failed to toggle ${field}:`, error);
      alert(error.message || `Failed to update ${field}.`);
    }
  }

  async function updateAccessMode(plan, featureKey, nextMode) {
    try {
      const nextAccessConfig = normalizeAccessConfig(
        {
          ...plan.access_config,
          [featureKey]: nextMode,
        },
        plan.plan_key
      );

      await updatePlan(plan.id, {
        access_config: nextAccessConfig,
        created_by: currentUser?.email || "",
      });

      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id ? { ...item, access_config: nextAccessConfig } : item
        )
      );
    } catch (error) {
      console.error("Failed to update access mode:", error);
      alert(error.message || "Failed to update plan access.");
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
      <div>
        <h2 className="text-2xl font-bold">Plans</h2>
        <p className="text-sm text-muted-foreground">
          Manage the current CLARA plans and feature access from one source of truth.
        </p>
      </div>

      <div className="grid gap-5">
        {sortedPlans.map((plan) => {
          const unlockedFeatures = getFeatureSummary(plan);

          return (
            <Card key={plan.plan_key} className="border border-white/10 bg-black/20">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Key: {plan.plan_key} • ₱{Number(plan.price || 0).toLocaleString()} • Order: {plan.sort_order}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {plan.description || "No description yet."}
                    </p>
                  </div>

                  <Button variant="outline" size="icon" onClick={() => openEditDialog(plan)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`active-${plan.plan_key}`}>Active</Label>
                    <Switch
                      id={`active-${plan.plan_key}`}
                      checked={!!plan.active}
                      onCheckedChange={() => togglePlanField(plan, "active")}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor={`popular-${plan.plan_key}`}>Popular</Label>
                    <Switch
                      id={`popular-${plan.plan_key}`}
                      checked={!!plan.popular}
                      onCheckedChange={() => togglePlanField(plan, "popular")}
                    />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    CTA: {plan.cta_label || "—"}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Included Features
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {unlockedFeatures.map((feature) => (
                      <Badge
                        key={`${plan.plan_key}-${feature.key}`}
                        variant="secondary"
                        className="bg-white/10 text-white border border-white/10"
                      >
                        {feature.label}: {FEATURE_MODE_LABELS[feature.mode] || feature.mode}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#07111d]/70 p-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Access Control
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Changes save immediately and update live app gating without a redeploy.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {FEATURE_DEFINITIONS.map((feature) => (
                      <div
                        key={`${plan.plan_key}-${feature.key}`}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{feature.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>

                          <select
                            value={plan.access_config?.[feature.key] || "off"}
                            onChange={(e) => updateAccessMode(plan, feature.key, e.target.value)}
                            className="min-w-[120px] rounded-lg border border-white/10 bg-[#0b1626] px-3 py-2 text-sm text-white outline-none"
                          >
                            {feature.modes.map((mode) => (
                              <option key={mode} value={mode}>
                                {FEATURE_MODE_LABELS[mode] || mode}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {PLAN_LABELS[editingPlanKey] || "Plan"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Entry"
                />
              </div>

              <div className="space-y-2">
                <Label>Plan Key</Label>
                <Input value={editingPlanKey} disabled />
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
              <Label>Included Features</Label>
              <Textarea
                rows={6}
                value={form.features}
                onChange={(e) => updateField("features", e.target.value)}
                placeholder={"Dashboard access\nExpense tracking\nStarter program access"}
              />
              <p className="text-xs text-muted-foreground">One feature per line.</p>
            </div>

            <div className="space-y-2">
              <Label>CTA Label</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => updateField("cta_label", e.target.value)}
                placeholder="Unlock Entry"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Plan Details"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
