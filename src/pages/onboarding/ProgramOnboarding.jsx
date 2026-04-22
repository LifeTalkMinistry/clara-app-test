import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";

export default function ProgramOnboarding() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const plan = normalizePlanKey(profile?.plan || "free");
  const activated = Boolean(profile?.is_activated || profile?.activated_at);
  const isCore = plan === "core_599";
  const isLifeOS = plan === "coaching_1299";

  const copy = useMemo(() => {
    if (isLifeOS && !activated) {
      return {
        title: "Life OS Preview",
        body: "This is CLARA's premium decision layer. Advanced intelligence stays locked until your activation code connects the physical kit to this account.",
        points: ["Decision system positioning", "Advanced AI preview", "Full Life OS unlock after activation"],
        cta: "Continue in Preview",
      };
    }

    if (isCore && !activated) {
      return {
        title: "CORE Pre-Activation",
        body: "Your Core kit and activation step are still coming. For now, CLARA gives partial access, a clear system intro, and an AI preview.",
        points: ["Core intro", "Kit is coming", "Partial access explained"],
        cta: "Enter Partial Access",
      };
    }

    if (isCore || isLifeOS) {
      return {
        title: "System Activated",
        body: "Your upgraded CLARA layer is unlocked. Start with one guided action so daily spending intelligence can begin with fresh data.",
        points: ["Full CLARA introduction", "AI and daily spending intelligence", "Guided first action"],
        cta: "Start Guided Action",
      };
    }

    return {
      title: "PRO Quick Start",
      body: "Start simple. Create or choose a wallet, log your first expense, then return to the dashboard to see CLARA organize your money.",
      points: ["First expense guide", "Wallet intro", "Dashboard overview"],
      cta: "Start PRO",
    };
  }, [activated, isCore, isLifeOS]);

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
          activation_onboarding_completed: activated || (!isCore && !isLifeOS),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile?.();
      navigate(activated ? "/expenses" : "/dashboard", { replace: true });
    } catch (error) {
      console.error("Program onboarding error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#061018] px-6 py-10 text-white">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
          {PLAN_LABELS[plan] || "CLARA"}
        </div>

        <h1 className="mb-4 text-3xl font-bold">{copy.title}</h1>

        <p className="mb-6 text-white/75">{copy.body}</p>

        <div className="mb-6 space-y-2 text-white/70">
          {copy.points.map((point) => (
            <p key={point}>- {point}</p>
          ))}
        </div>

        {(isCore || isLifeOS) && !activated ? (
          <button
            type="button"
            onClick={() => navigate("/activation")}
            className="mb-5 rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-sm font-semibold text-yellow-100"
          >
            Enter activation code
          </button>
        ) : null}

        <label className="mb-6 flex gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>I understand this CLARA access stage</span>
        </label>

        <button
          onClick={finishProgramOnboarding}
          disabled={!checked || saving}
          className="rounded-xl bg-green-600 px-5 py-3 disabled:opacity-50"
        >
          {saving ? "Saving..." : copy.cta}
        </button>
      </div>
    </div>
  );
}
