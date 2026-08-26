import { useCallback, useEffect, useMemo, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";
import { redeemBetaTesterCode } from "@/lib/beta-tester-access-client";

function normalizeTrial(trial) {
  if (!trial || typeof trial !== "object") {
    return {
      status: "not_started",
      started_at: null,
      expires_at: null,
      duration_days: 15,
      access_tier: "core",
    };
  }

  const status = ["not_started", "active", "expired"].includes(trial.status)
    ? trial.status
    : "not_started";

  return {
    status,
    started_at: trial.started_at || null,
    expires_at: trial.expires_at || null,
    duration_days: Number(trial.duration_days) || 15,
    access_tier: trial.access_tier || "core",
  };
}

export default function useClaraProductAccess() {
  const { isAdmin, isPaid, loading: roleLoading } = useUserRole();
  const [trial, setTrial] = useState(() => normalizeTrial(null));
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const refreshAccess = useCallback(async () => {
    if (roleLoading) return null;

    if (isAdmin || isPaid) {
      setChecking(false);
      setError("");
      return null;
    }

    const token = getStoredBackendToken();
    if (!token) {
      setChecking(false);
      setError("Sign in again so CLARA can verify your access.");
      return null;
    }

    setChecking(true);
    setError("");

    try {
      const user = await backendRequest("/api/users/me", { token });
      const nextTrial = normalizeTrial(user?.trial);
      setTrial(nextTrial);
      return nextTrial;
    } catch (accessError) {
      setError(
        accessError?.message || "CLARA could not verify your access right now."
      );
      return null;
    } finally {
      setChecking(false);
    }
  }, [isAdmin, isPaid, roleLoading]);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  const redeemTrialCode = useCallback(async (code) => {
    setError("");
    const response = await redeemBetaTesterCode(code);
    const nextTrial = normalizeTrial(response?.user?.trial);
    setTrial(nextTrial);
    return nextTrial;
  }, []);

  const hasProductAccess = useMemo(
    () => isAdmin || isPaid || trial.status === "active",
    [isAdmin, isPaid, trial.status]
  );

  return {
    isAdmin,
    isPaid,
    trial,
    checking: roleLoading || checking,
    error,
    hasProductAccess,
    refreshAccess,
    redeemTrialCode,
  };
}
