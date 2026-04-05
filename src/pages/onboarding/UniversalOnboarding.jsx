import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const withTimeout = (promise, ms = 8000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out.")), ms)
    ),
  ]);
};

export default function UniversalOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const next = () => setStep((prev) => Math.min(prev + 1, 4));
  const back = () => setStep((prev) => Math.max(prev - 1, 1));

  const updateProfile = async (updates) => {
    if (!user?.id) {
      throw new Error("No logged-in user found.");
    }

    const payload = {
      id: user.id,
      ...updates,
    };

    const { error } = await withTimeout(
      supabase.from("profiles").upsert(payload, { onConflict: "id" }),
      8000
    );

    if (error) {
      console.error("Profile upsert error:", error);
      throw new Error(error.message || "Failed to save profile.");
    }

    return true;
  };

  const continueFree = async () => {
    if (saving) return;

    try {
      setSaving(true);

      await updateProfile({
        onboarding_completed: true,
        onboarding_step: 4,
        enrollment_status: "none",
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Continue Free error:", error);
      alert(error?.message || "Failed to continue.");
    } finally {
      setSaving(false);
    }
  };

  const goEnroll = async () => {
    if (saving) return;

    try {
      setSaving(true);

      await updateProfile({
        onboarding_completed: true,
        onboarding_step: 4,
        enrollment_status: "pending",
      });

      navigate("/tier-select", { replace: true });
    } catch (error) {
      console.error("Enroll error:", error);
      alert(error?.message || "Failed to continue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061018] text-white px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm text-white/60">Step {step} of 4</p>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0E7A39] to-[#FACC15] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Welcome to CLARA</h1>
            <p className="text-white/75">
              Build strong financial habits through guided action,
              accountability, and structure.
            </p>
            <button
              onClick={next}
              className="px-5 py-3 rounded-xl bg-[#0E7A39]"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">What CLARA does</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "30-Day Challenge",
                "Weekly Modules",
                "Daily Tasks",
                "Money Tracking Tools",
                "Coaching Support",
                "Certification",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={back} className="px-4 py-2 border rounded">
                Back
              </button>
              <button onClick={next} className="px-4 py-2 bg-green-600 rounded">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">How it works</h2>

            <ul className="text-white/75 space-y-2">
              <li>• Modules unlock weekly</li>
              <li>• Daily tasks in order</li>
              <li>• Track your progress</li>
              <li>• Complete missed tasks</li>
            </ul>

            <div className="flex gap-3">
              <button onClick={back} className="px-4 py-2 border rounded">
                Back
              </button>
              <button onClick={next} className="px-4 py-2 bg-green-600 rounded">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">Choose your path</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border p-4 rounded">
                <h3>Free Version</h3>
                <button onClick={continueFree} disabled={saving}>
                  {saving ? "Saving..." : "Continue Free"}
                </button>
              </div>

              <div className="border p-4 rounded">
                <h3>Enroll in CLARA</h3>
                <button onClick={goEnroll} disabled={saving}>
                  {saving ? "Saving..." : "Enroll Now"}
                </button>
              </div>
            </div>

            <button onClick={back} className="px-4 py-2 border rounded">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}