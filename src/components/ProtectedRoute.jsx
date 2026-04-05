import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { loading, authReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!authReady || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}