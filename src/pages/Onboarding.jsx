import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!user || saving) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ has_completed_onboarding: true })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await refreshProfile();
    navigate("/dashboard", { replace: true });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to CLARA</h1>
        <p className="text-white/70 mb-6">
          Finish your onboarding here. When done, continue to your dashboard.
        </p>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-60 px-5 py-3 font-semibold"
        >
          {saving ? "Saving..." : "Finish Onboarding"}
        </button>
      </div>
    </div>
  );
}