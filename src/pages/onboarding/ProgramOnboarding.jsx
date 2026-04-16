import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function ProgramOnboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const finishProgramOnboarding = async () => {
    if (!checked) return;

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          program_onboarding_completed: true,
          has_completed_program_onboarding: true,
        })
        .eq("id", user.id);

      if (error) {
        console.error(error.message);
        return;
      }

      await refreshProfile?.();
      navigate("/dashboard", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061018] text-white px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">
        <h1 className="text-3xl font-bold mb-4">Program Onboarding</h1>

        <p className="text-white/75 mb-6">
          This is your commitment step before entering the full CLARA program.
        </p>

        <div className="space-y-2 text-white/70 mb-6">
          <p>• Complete daily tasks in order</p>
          <p>• Stay consistent</p>
          <p>• Coaching is part of the process</p>
        </div>

        <label className="flex gap-3 mb-6">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>I commit to the CLARA program</span>
        </label>

        <button
          onClick={finishProgramOnboarding}
          disabled={!checked || saving}
          className="px-5 py-3 rounded-xl bg-green-600"
        >
          {saving ? "Saving..." : "Start Day 1"}
        </button>
      </div>
    </div>
  );
}
