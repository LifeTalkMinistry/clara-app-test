import React, { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthRedirector() {
  const { loading, authReady, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  const targetRoute = useMemo(() => {
    if (!authReady || loading) return null;
    if (!isAuthenticated) return "/login";
    if (!profile?.has_completed_onboarding) return "/onboarding";
    return "/dashboard";
  }, [authReady, loading, isAuthenticated, profile?.has_completed_onboarding]);

  useEffect(() => {
    if (!targetRoute) return;
    if (hasNavigatedRef.current) return;

    hasNavigatedRef.current = true;
    navigate(targetRoute, { replace: true });
  }, [targetRoute, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-black text-white">
      <p>Please wait...</p>
    </div>
  );
}