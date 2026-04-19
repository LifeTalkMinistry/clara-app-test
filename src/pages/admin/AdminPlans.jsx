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

function isMissingAccessConfigError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("access_config") && message.includes("plans");
}

function stripAccessConfig(payload) {
  const { access_config, ...rest } = payload;
  return rest;
}

function getEnforcedFeatureMode(planKey, featureKey, requestedMode) {
  const normalizedPlanKey = String(planKey || "").trim().toLowerCase();
  const normalizedMode = String(requestedMode || "").trim().toLowerCase();

  // Feed should always stay available as the daily engagement layer.
  if (featureKey === "feed") {
    return "full";
  }

  // Community should stay premium-only and separate from Feed.
  if (featureKey === "community" && normalizedPlanKey === "free") {
    return "off";
  }

  return normalizedMode;
}

function getSelectableModes(planKey, feature) {
  const normalizedPlanKey = String(planKey || "").trim().toLowerCase();

  if (feature.key === "feed") {
    return ["full"];
  }

  if (feature.key === "community" && normalizedPlanKey === "free") {
    return ["off"];
  }

  return feature.modes;
}

function getFeatureAdminHint(planKey, featureKey) {
  const normalizedPlanKey = String(planKey || "").trim().toLowerCase();

  if (featureKey === "feed") {
    return "Feed is locked to Full because it is your daily engagement layer.";
  }

  if (featureKey === "community" && normalizedPlanKey === "free") {
    return "Community stays Off for Free so it remains a premium-only space.";
  }

  return "";
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingPlanKey, setEditingPlanKey] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [supportsAccessConfig, setSupportsAccessConfig] = useState(true);
  const [notice, setNotice] = useState("");

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const orderDiff =
        Number(a.sort_order || 9999) - Number(b.sort_order || 9999);
      if (orderDiff !== 0) return orderDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [plans]);

  const setSchemaFallbackNotice = useCallback(() => {
    setNotice(
      "Plan access is currently using built-in safe defaults. Apply the access_config migration to persist per-plan feature toggles."
    );
  }, []);

  const detectAccessConfigSupport = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("plans")
        .select("id, access_config")
        .limit(1);

      if (error) {
        if (isMissingAccessConfigError(error)) {
          setSupportsAccessConfig(false);
          setSchemaFallbackNotice();
          return false;
        }

        throw error;
      }

      setSupportsAccessConfig(true);
      return true;
    } catch (error) {
      if (isMissingAccessConfigError(error)) {
        setSupportsAccessConfig(false);
        setSchemaFallbackNotice();
        return false;
      }

      console.error("Failed to detect access_config support:", error);
      return true;
    }
  }, [setSchemaFallbackNotice]);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    setPlans(
      mergePlans(data || []).filter((plan) =>
        CURRENT_PLAN_KEYS.includes(plan.plan_key)
      )
    );
  }, []);

  const ensureCurrentPlans = useCallback(
    async (canPersistAccessConfig) => {
      const { data, error } = await supabase.from("plans").select("*");
      if (error) throw error;

      const merged = mergePlans(data || []);
      const existingKeys = new Set(
        (data || []).map((row) =>
          String(row.plan_key || "").trim().toLowerCase()
        )
      );
      const missingPlans = merged.filter(
        (plan) => !existingKeys.has(plan.plan_key)
      );

      if (missingPlans.length === 0) return;

      const payload = missingPlans.map((plan) => ({
        ...(canPersistAccessConfig
          ? getPlanDefaults(plan.plan_key)
          : stripAccessConfig(getPlanDefaults(plan.plan_key))),
        created_by: currentUser?.email || "",
      }));

      const { error: insertError } = await supabase.from("plans").insert(payload);

      if (!insertError) return;

      if (isMissingAccessConfigError(insertError)) {
        setSupportsAccessConfig(false);
        setSchemaFallbackNotice();

        const retryPayload = missingPlans.map((plan) => ({
          ...stripAccessConfig(getPlanDefaults(plan.plan_key)),
          created_by: currentUser?.email || "",
        }));

        const { error: retryError } = await supabase
          .from("plans")
          .insert(retryPayload);
        if (retryError) throw retryError;
        return;
      }

      throw insertError;
    },
    [currentUser?.email, setSchemaFallbackNotice]
  );

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user || null);
    } catch (error) {
      console.error("Failed to initialize admin plans:", error);
      setNotice(
        "Plan admin is available, but the current session could not be fully initialized."
      );
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
        const canPersistAccessConfig = await detectAccessConfigSupport();
        await ensureCurrentPlans(canPersistAccessConfig);
        await fetchPlans();
      } catch (error) {
        console.error("Failed to prepare plans:", error);
        setNotice(
          "Plans loaded with fallback defaults. Some admin changes may stay read-only until the database migration is applied."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    boot();

    const channel = supabase
      .channel("admin-plans-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plans" },
        () => {
          fetchPlans().catch((error) => {
            console.error("Failed to refresh plans after change:", error);
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Admin plans realtime unavailable:", status);
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser, detectAccessConfigSupport, ensureCurrentPlans, fetchPlans]);

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
      setNotice("");
    } catch (error) {
      console.error("Failed to save plan details:", error);
      setNotice(
        "Plan details could not be saved right now. The page is still available and your current plan data remains visible."
      );
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
        prev.map((item) =>
          item.id === plan.id ? { ...item, [field]: nextValue } : item
        )
      );
      setNotice("");
    } catch (error) {
      console.error(`Failed to toggle ${field}:`, error);
      setNotice(
        `Could not update ${field} right now. The current plan data is still loaded.`
      );
    }
  }

  async function updateAccessMode(plan, featureKey, nextMode) {
    if (!supportsAccessConfig) {
      setSchemaFallbackNotice();
      return;
    }

    try {
      const enforcedMode = getEnforcedFeatureMode(
        plan.plan_key,
        featureKey,
        nextMode
      );

      const nextAccessConfig = normalizeAccessConfig(
        {
          ...plan.access_config,
          [featureKey]: enforcedMode,
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
      setNotice("");
    } catch (error) {
      console.error("Failed to update access mode:", error);

      if (isMissingAccessConfigError(error)) {
        setSupportsAccessConfig(false);
        setSchemaFallbackNotice();
        await fetchPlans();
        return;
      }

      setNotice(
        "Plan access could not be saved right now. Current gating is still using the last available plan data."
      );
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Plans</h2>
        <p className="text-sm text-muted-foreground">
          Manage the current CLARA plans and feature access from one source of
          truth.
        </p>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-5">
        {sortedPlans.map((plan) => {
          const unlockedFeatures = getFeatureSummary(plan);

          return (
            <Card
              key={plan.plan_key}
              className="border border-white/10 bg-black/20"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Key: {plan.plan_key} - PHP{" "}
                      {Number(plan.price || 0).toLocaleString()} - Order:{" "}
                      {plan.sort_order}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {plan.description || "No description yet."}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Pencil className="h-4 w-4" />
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
                    CTA: {plan.cta_label || "-"}
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
                        className="border border-white/10 bg-white/10 text-white"
                      >
                        {feature.label}:{" "}
                        {FEATURE_MODE_LABELS[feature.mode] || feature.mode}
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
                      {supportsAccessConfig
                        ? "Changes save immediately and update live app gating without a redeploy."
                        : "Access controls are showing safe defaults. Apply the migration to save per-plan toggles to Supabase."}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {FEATURE_DEFINITIONS.map((feature) => {
                      const selectableModes = getSelectableModes(
                        plan.plan_key,
                        feature
                      );
                      const adminHint = getFeatureAdminHint(
                        plan.plan_key,
                        feature.key
                      );

                      return (
                        <div
                          key={`${plan.plan_key}-${feature.key}`}
                          className="rounded-xl border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">
                                {feature.label}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {feature.description}
                              </p>
                              {adminHint ? (
                                <p className="mt-2 text-[11px] leading-5 text-amber-300/90">
                                  {adminHint}
                                </p>
                              ) : null}
                            </div>

                            <select
                              value={plan.access_config?.[feature.key] || "off"}
                              onChange={(e) =>
                                updateAccessMode(plan, feature.key, e.target.value)
                              }
                              disabled={!supportsAccessConfig}
                              className="min-w-[120px] rounded-lg border border-white/10 bg-[#0b1626] px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {selectableModes.map((mode) => (
                                <option key={mode} value={mode}>
                                  {FEATURE_MODE_LABELS[mode] || mode}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
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
            <DialogTitle>
              Edit {PLAN_LABELS[editingPlanKey] || "Plan"}
            </DialogTitle>
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
                placeholder={
                  "Dashboard access\nFeed access\nExpense tracking\nStarter program access"
                }
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
                placeholder="Unlock Entry"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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