import { useCallback, useMemo, useState } from "react";
import {
  CURRENT_PLAN_KEYS,
  getFeatureMode,
  isFeatureEnabled,
  sanitizePlanRow,
} from "@/lib/plan-config";

const LOCAL_PLANS = CURRENT_PLAN_KEYS.map((planKey) =>
  sanitizePlanRow({ plan_key: planKey })
);

export default function usePlanAccess() {
  const [plans] = useState(LOCAL_PLANS);

  const refreshPlans = useCallback(async () => {
    return LOCAL_PLANS;
  }, []);

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
    loading: false,
    refreshPlans,
    getPlan,
    getPlanFeatureMode,
    isPlanFeatureEnabled,
  };
}
