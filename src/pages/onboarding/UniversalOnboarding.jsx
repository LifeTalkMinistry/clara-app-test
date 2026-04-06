import { useEffect, useMemo, useState } from "react";
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
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState("");

  const invalidStoredNames = ["Recovered User", "No name"];

  const needsNameFix = useMemo(() => {
    const storedName = profile?.full_name?.trim();
    return !storedName || invalidStoredNames.includes(storedName);
  }, [profile]);

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      if (!user?.id) {
        if (alive) setLoadingProfile(false);
        return;
      }

      try {
        const existingProfile = await refreshProfile(user.id);

        if (!alive) return;

        setProfile(existingProfile || null);

        const safeName =
          existingProfile?.full_name &&
          !invalidStoredNames.includes(existingProfile.full_name.trim())
            ? existingProfile.full_name
            : "";

        setFullName(safeName);
      } catch (error) {
        console.error("Failed to load onboarding profile:", error);
      } finally {
        if (alive) setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, [user?.id, refreshProfile]);

  const next = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      if (needsNameFix && !fullName.trim()) {
        setNameError("Please enter your real name before continuing.");
        return;
      }

      setNameError("");
      setStep(4);
    }
  };

  const back = () => setStep((prev) => Math.max(prev - 1, 1));

  const updateProfile = async (updates) => {
    if (!user?.id) {
      throw new Error("No logged-in user found.");
    }

    const payload = {
      id: user.id,
      email: user.email || profile?.email || null,
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

  const saveNameIfNeeded = async () => {
    const cleanedName = fullName.trim();

    if (needsNameFix) {
      if (!cleanedName) {
        throw new Error("Please enter your real name.");
      }

      await updateProfile({
        full_name: cleanedName,
      });

      const { error: authUpdateError } = await withTimeout(
        supabase.auth.updateUser({
          data: {
            full_name: cleanedName,
          },
        }),
        8000
      );

      if (authUpdateError) {
        console.error("Auth metadata update error:", authUpdateError);
      }

      setProfile((prev) => ({
        ...(prev || {}),
        full_name: cleanedName,
        email: user?.email || prev?.email || null,
      }));
    }
  };

  const continueFree = async () => {
    if (saving) return;

    try {
      setSaving(true);
      setNameError("");

      await saveNameIfNeeded();

      await updateProfile({
        onboarding_completed: true,
        onboarding_step: 4,
        has_completed_onboarding: true,
        enrollment_status: "none",
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Continue Free error:", error);
      setNameError(error?.message || "Failed to continue.");
    } finally {
      setSaving(false);
    }
  };

  const goEnroll = async () => {
    if (saving) return;

    try {
      setSaving(true);
      setNameError("");

      await saveNameIfNeeded();

      await updateProfile({
        onboarding_completed: true,
        onboarding_step: 4,
        has_completed_onboarding: true,
        enrollment_status: "pending",
      });

      navigate("/tier-select", { replace: true });
    } catch (error) {
      console.error("Enroll error:", error);
      setNameError(error?.message || "Failed to continue.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#061018] text-white px-6 py-10 flex items-center justify-center">
        Loading onboarding...
      </div>
    );
  }

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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-white">
                {needsNameFix ? "Complete your profile" : "Your profile name"}
              </p>

              <input
                type="text"
                placeholder="Enter your real name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError("");
                }}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
              />

              {needsNameFix ? (
                <p className="text-sm text-yellow-300">
                  Please enter the real name you want CLARA to use in your
                  profile and admin records.
                </p>
              ) : (
                <p className="text-sm text-white/60">
                  You can keep this name or change it before continuing.
                </p>
              )}

              {nameError && (
                <p className="text-sm text-red-400">{nameError}</p>
              )}
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

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">Choose your path</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border p-4 rounded space-y-3">
                <h3 className="text-lg font-semibold">Free Version</h3>
                <button
                  onClick={continueFree}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-black rounded disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Continue Free"}
                </button>
              </div>

              <div className="border p-4 rounded space-y-3">
                <h3 className="text-lg font-semibold">Enroll in CLARA</h3>
                <button
                  onClick={goEnroll}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 rounded disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Enroll Now"}
                </button>
              </div>
            </div>

            {nameError && <p className="text-sm text-red-400">{nameError}</p>}

            <button onClick={back} className="px-4 py-2 border rounded">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}