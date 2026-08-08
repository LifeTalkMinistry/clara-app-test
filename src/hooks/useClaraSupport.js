import { useCallback, useEffect, useMemo, useState } from "react";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";
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

    const token = getStoredBackendToken();
    if (!token) {
      setRecord(null);
      setChampionCapacity(null);
      return null;
    }

    setLoading(true);
    try {
      const result = await backendRequest("/api/support/status", { token });
      const membership = result?.membership || null;
      setRecord(membership);
      setChampionCapacity(null);
      return membership;
    } catch (supportError) {
      console.warn("CLARA support state unavailable:", supportError?.message || supportError);
      setRecord(null);
      setChampionCapacity(null);
      return null;
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
