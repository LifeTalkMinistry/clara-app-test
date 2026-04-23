import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  CURRENT_PLAN_KEYS,
  FEATURE_DEFINITIONS,
  FEATURE_MODE_LABELS,
  mergePlans,
} from "@/lib/plan-config";

const PLAN_STYLES = {
  free: "border-white/10 bg-white/5",
  pro: "border-blue-500/40 bg-blue-500/5",
  core: "border-green-500/40 bg-green-500/5",
  lifeos: "border-purple-500/40 bg-purple-500/5",
};

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [savingMap, setSavingMap] = useState({});

  useEffect(() => {
    console.log("🔥 ENV CHECK:", {
      url: import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const merged = mergePlans(data || []).filter((plan) =>
        CURRENT_PLAN_KEYS.includes(plan.plan_key)
      );

      setPlans(merged);
      setNotice("");
    } catch (err) {
      console.error(err);
      setNotice("Failed to load plans.");
    }
  }, []);

  useEffect(() => {
    fetchPlans().finally(() => setLoading(false));
  }, [fetchPlans]);

  const sortedPlans = useMemo(() => {
    return [...plans].sort(
      (a, b) => Number(a.sort_order) - Number(b.sort_order)
    );
  }, [plans]);

  const updateFeature = async (plan, featureKey, value) => {
    const currentConfig = plan.access_config || {};

    const updatedConfig = {
      ...currentConfig,
      [featureKey]: value,
    };

    setSavingMap((prev) => ({ ...prev, [plan.id]: true }));

    try {
      const { error } = await supabase
        .from("plans")
        .update({
          access_config: updatedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, access_config: updatedConfig } : p
        )
      );
    } catch (err) {
      console.error("Update failed:", err);
      setNotice("Failed to save changes.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [plan.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Plans Control</h2>

      {notice && (
        <div className="p-3 rounded bg-red-500/20 text-red-200 text-sm">
          {notice}
        </div>
      )}

      <div className="grid gap-6">
        {sortedPlans.map((plan) => {
          const config = plan.access_config || {};
          const isSaving = savingMap[plan.id];

          return (
            <Card
              key={plan.plan_key}
              className={`rounded-2xl border backdrop-blur-md shadow-xl ${PLAN_STYLES[plan.plan_key]}`}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm opacity-60 mt-1">
                    PHP {plan.price}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isSaving && (
                    <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                  )}
                  <Badge variant="outline">{plan.product_id}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* AI CONTROL */}
                <div className="rounded-xl border border-white/10 p-4 bg-black/20">
                  <p className="text-xs uppercase opacity-60 mb-2">
                    AI Intelligence
                  </p>

                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm"
                    value={config.ai || "off"}
                    onChange={(e) =>
                      updateFeature(plan, "ai", e.target.value)
                    }
                  >
                    <option value="off">Off</option>
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="life_os">Life OS</option>
                  </select>
                </div>

                {/* FEATURES */}
                <div className="space-y-3">
                  <p className="text-xs uppercase opacity-60">
                    Feature Access Control
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {FEATURE_DEFINITIONS.filter(
                      (f) => f.key !== "ai"
                    ).map((feature) => (
                      <div
                        key={feature.key}
                        className="p-3 rounded-lg border border-white/10 bg-white/5"
                      >
                        <p className="text-xs opacity-60 mb-1">
                          {feature.label}
                        </p>

                        <select
                          className="w-full bg-black/40 border border-white/10 rounded-md p-1 text-xs"
                          value={config[feature.key] || "off"}
                          onChange={(e) =>
                            updateFeature(
                              plan,
                              feature.key,
                              e.target.value
                            )
                          }
                        >
                          <option value="off">Off</option>
                          <option value="limited">Limited</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STATUS */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs opacity-50">
                    Live configuration
                  </span>

                  <span className="text-xs text-green-400">
                    ● Active
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}