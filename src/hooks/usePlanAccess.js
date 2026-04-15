import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CURRENT_PLAN_KEYS,
  getFeatureMode,
  isFeatureEnabled,
  mergePlans,
  sanitizePlanRow,
} from "@/lib/plan-config";

const EMPTY_STATE = {
  plans: CURRENT_PLAN_KEYS.map((planKey) => sanitizePlanRow({ plan_key: planKey })),
  loading: true,
};

export default function usePlanAccess() {
  const [plans, setPlans] = useState(EMPTY_STATE.plans);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setPlans(mergePlans(data || []));
    } catch (error) {
      console.error("Failed to load plan access:", error);
      setPlans(EMPTY_STATE.plans);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();

    const channel = supabase
      .channel("clara-plan-access")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plans" },
        () => {
          loadPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPlans]);

  const plansByKey = useMemo(() => {
    return plans.reduce((acc, plan) => {
      acc[plan.plan_key] = plan;
      return acc;
    }, {});
  }, [plans]);

  const getPlan = useCallback(
    (planKey) => plansByKey[planKey] || sanitizePlanRow({ plan_key: planKey }),
    [plansByKey]
  );

  const getPlanFeatureMode = useCallback(
    (planKey, featureKey) => getFeatureMode(getPlan(planKey), featureKey),
    [getPlan]
  );

  const isPlanFeatureEnabled = useCallback(
    (planKey, featureKey) => isFeatureEnabled(getPlan(planKey), featureKey),
    [getPlan]
  );

  return {
    plans,
    plansByKey,
    loading,
    refreshPlans: loadPlans,
    getPlan,
    getPlanFeatureMode,
    isPlanFeatureEnabled,
  };
}
