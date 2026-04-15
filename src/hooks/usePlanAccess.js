import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CURRENT_PLAN_KEYS,
  getFeatureMode,
  isFeatureEnabled,
  mergePlans,
  sanitizePlanRow,
} from "@/lib/plan-config";

const EMPTY_PLANS = CURRENT_PLAN_KEYS.map((planKey) =>
  sanitizePlanRow({ plan_key: planKey })
);

const PLAN_ACCESS_CHANNEL = "clara-plan-access";

let sharedPlans = EMPTY_PLANS;
let sharedLoading = true;
let sharedInitialized = false;
let sharedChannel = null;
let sharedFetchPromise = null;
const subscribers = new Set();

function notifySubscribers() {
  const snapshot = {
    plans: sharedPlans,
    loading: sharedLoading,
  };

  subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("Plan access subscriber error:", error);
    }
  });
}

async function fetchPlans() {
  if (sharedFetchPromise) {
    return sharedFetchPromise;
  }

  sharedFetchPromise = (async () => {
    sharedLoading = true;
    notifySubscribers();

    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      sharedPlans = mergePlans(data || []);
    } catch (error) {
      console.error("Failed to load plan access:", error);
      sharedPlans = EMPTY_PLANS;
    } finally {
      sharedLoading = false;
      notifySubscribers();
      sharedFetchPromise = null;
    }

    return sharedPlans;
  })();

  return sharedFetchPromise;
}

function ensureRealtimeSubscription() {
  if (sharedChannel) return;

  try {
    sharedChannel = supabase
      .channel(PLAN_ACCESS_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plans" },
        () => {
          fetchPlans().catch((error) => {
            console.error("Failed to refresh plan access after realtime event:", error);
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Plan access realtime unavailable:", status);
        }
      });
  } catch (error) {
    console.error("Plan access realtime setup failed:", error);
    sharedChannel = null;
  }
}

function releaseRealtimeSubscription() {
  if (!sharedChannel || subscribers.size > 0) return;

  try {
    supabase.removeChannel(sharedChannel);
  } catch (error) {
    console.error("Failed to remove plan access realtime channel:", error);
  } finally {
    sharedChannel = null;
  }
}

export default function usePlanAccess() {
  const [state, setState] = useState({
    plans: sharedPlans,
    loading: sharedLoading,
  });

  const refreshPlans = useCallback(async () => {
    await fetchPlans();
  }, []);

  useEffect(() => {
    const handleUpdate = (nextState) => {
      setState(nextState);
    };

    subscribers.add(handleUpdate);
    handleUpdate({
      plans: sharedPlans,
      loading: sharedLoading,
    });

    if (!sharedInitialized) {
      sharedInitialized = true;
      fetchPlans().catch((error) => {
        console.error("Initial plan access fetch failed:", error);
      });
    }

    // Realtime is best-effort only. UI should already be usable from fetch data.
    ensureRealtimeSubscription();

    return () => {
      subscribers.delete(handleUpdate);
      releaseRealtimeSubscription();
    };
  }, []);

  const plansByKey = useMemo(() => {
    return state.plans.reduce((acc, plan) => {
      acc[plan.plan_key] = plan;
      return acc;
    }, {});
  }, [state.plans]);

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
    plans: state.plans,
    plansByKey,
    loading: state.loading,
    refreshPlans,
    getPlan,
    getPlanFeatureMode,
    isPlanFeatureEnabled,
  };
}
