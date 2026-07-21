import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resolveAppFlow } from "@/lib/access-control";

export default function OnboardingRouteGate({ children }) {
  const location = useLocation();
  const { user, profile, loading, authReady } = useAuth();

  if (!authReady || loading || !user) return children;

  const flow = resolveAppFlow({
    ...(profile || user),
    id: profile?.id || user?.id,
    local_vault_id: profile?.local_vault_id || user?.local_vault_id || user?.id,
    account_id: profile?.account_id || user?.account_id,
    role: profile?.role || user?.role || "user",
  });

  if (flow === "universal_onboarding" && location.pathname !== "/onboarding") {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{ from: location, onboardingRequired: true }}
      />
    );
  }

  return children;
}
