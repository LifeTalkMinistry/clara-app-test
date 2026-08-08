import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSupportDisplayState, isSupportRecordActive } from "@/lib/clara-support";
import { purchaseClaraSupport } from "@/lib/clara-support-billing";

export default function useClaraSupport(user) {
  const [record, setRecord] = useState(null);
  const [championCapacity, setChampionCapacity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purchaseTier, setPurchaseTier] = useState(null);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setRecord(null);
      setChampionCapacity(null);
      return null;
    }

    setLoading(true);
    try {
      const [supportResult, capacityResult] = await Promise.all([
        supabase
          .from("support_subscriptions")
          .select("id,user_id,tier,amount_php,payment_date,support_start_at,support_expires_at,renewal_at,status,custom_amount_php,product_id,created_at,updated_at")
          .eq("user_id", user.id)
          .order("support_expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("support_program_config")
          .select("champion_slot_cap,champion_slots_used")
          .eq("id", "default")
          .maybeSingle(),
      ]);

      if (supportResult.error) {
        console.warn("CLARA support state unavailable:", supportResult.error.message);
        setRecord(null);
      } else {
        setRecord(supportResult.data || null);
      }

      if (capacityResult.error) {
        console.warn("CLARA support capacity unavailable:", capacityResult.error.message);
        setChampionCapacity(null);
      } else {
        setChampionCapacity(capacityResult.data || null);
      }

      return supportResult.data || null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const support = useMemo(() => getSupportDisplayState(record), [record]);
  const isActive = useMemo(() => isSupportRecordActive(record), [record]);

  const startSupport = useCallback(async (tierKey) => {
    if (!user?.id || purchaseTier) return null;
    clearError();
    setPurchaseTier(tierKey);
    try {
      const result = await purchaseClaraSupport({ tierKey, user });
      if (result?.status === "active") await refresh();
      return result;
    } catch (purchaseError) {
      setError(purchaseError?.message || "Support payment could not be completed.");
      throw purchaseError;
    } finally {
      setPurchaseTier(null);
    }
  }, [clearError, purchaseTier, refresh, user]);

  return {
    record,
    support,
    isActive,
    championCapacity,
    loading,
    purchaseTier,
    error,
    refresh,
    startSupport,
    clearError,
  };
}
