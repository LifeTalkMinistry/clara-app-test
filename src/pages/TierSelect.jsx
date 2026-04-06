import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TierSelect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/enroll", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#eef7f4_0%,#f8fafc_35%,#f8fafc_100%)]">
      <div className="text-center px-6">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-600">Loading plans...</p>
      </div>
    </div>
  );
}