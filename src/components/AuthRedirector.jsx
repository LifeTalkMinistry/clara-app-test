import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthRedirector() {
  const { loading, authReady, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady || loading) return;

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!profile?.has_completed_onboarding) {
      navigate("/onboarding", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [authReady, loading, isAuthenticated, profile, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-black text-white">
      <p>Please wait...</p>
    </div>
  );
}