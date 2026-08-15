import { useCallback, useEffect, useMemo, useState } from "react";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";
import {
  getSupportDisplayState,
  isSupportRecordActive,
  normalizeSupportTier,
} from "@/lib/clara-support";
import { purchaseClaraSupport } from "@/lib/clara-support-billing";

const CANONICAL_ACCOUNT_PLANS = new Set([
  "free",
  "supporter",
  "builder",
  "champion",
]);

function normalizeAccountPlan(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CANONICAL_ACCOUNT_PLANS.has(normalized) ? normalized : null;
}

function normalizeAccountStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["active", "pending", "inactive"].includes(normalized)
    ? normalized
    : "inactive";
}

export default function useClaraSupport(user) {
  const [backendRecord, setBackendRecord] = useState(null);
  const [liveAccount, setLiveAccount] = useState(null);
  const [championCapacity, setChampionCapacity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purchaseTier, setPurchaseTier] = useState(null);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setBackendRecord(null);
      setLiveAccount(null);
      setChampionCapacity(null);
      return null;
    }

    const token = getStoredBackendToken();
    if (!token) {
      setBackendRecord(null);
      setLiveAccount(null);
      setChampionCapacity(null);
      return null;
    }

    setLoading(true);
    try {
      const result = await backendRequest("/api/support/status", { token });
      const membership = result?.membership || null;
      const accountPlan = normalizeAccountPlan(result?.accountPlan);
      setBackendRecord(membership);
      setLiveAccount(
        accountPlan
          ? {
              plan: accountPlan,
              status: normalizeAccountStatus(result?.accountStatus),
            }
          : null
      );
      setChampionCapacity(null);
      return membership;
    } catch (supportError) {
      console.warn("CLARA support state unavailable:", supportError?.message || supportError);
      setBackendRecord(null);
      setLiveAccount(null);
      setChampionCapacity(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const sync = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [refresh]);

  const snapshotPlan = normalizeAccountPlan(
    user?.plan || user?.plan_key || user?.subscription_plan
  );
  const snapshotStatus = normalizeAccountStatus(
    user?.status || user?.account_status || "active"
  );

  // The support-status response is the freshest account-plan authority because
  // the backend reconciles support expiry before returning it. The user snapshot
  // remains a startup/offline fallback only.
  const accountPlan = liveAccount?.plan || snapshotPlan;
  const accountStatus = liveAccount?.status || snapshotStatus;
  const accountTier = normalizeSupportTier(accountPlan);

  const record = useMemo(() => {
    if (!accountPlan || accountPlan === "free" || !accountTier) return null;

    const backendTier = normalizeSupportTier(
      backendRecord?.tier || backendRecord?.tierKey
    );
    const matchingBackendRecord = backendTier === accountTier ? backendRecord : null;

    return {
      ...(matchingBackendRecord || {}),
      tier: accountTier,
      tierKey: accountTier,
      status: accountStatus,
      active: accountStatus === "active",
      source: "account_plan",
    };
  }, [accountPlan, accountStatus, accountTier, backendRecord]);

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
    backendRecord,
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
