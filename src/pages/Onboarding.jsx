import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshProfile, loading: authLoading } = useAuth();

  const [activeAction, setActiveAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isBusy = authLoading || activeAction !== null;

  const content = useMemo(
    () => ({
      badge: "Welcome to CLARA",
      title: "Start your financial journey the",
      titleHighlight: "right way",
      intro:
        "Before you enter the app, choose how you want to begin. You can stay on the free version for expense tracking, or enroll in the CLARA program and choose your plan.",
      choosePathEyebrow: "Choose your path",
      choosePathTitle: "How do you want to continue?",
      choosePathDescription:
        "You can start free right now, or go to the enrollment page and choose your plan.",
      footerNote:
        "You can stay free for now, then enroll later when you're ready.",
    }),
    []
  );

  const getFriendlyError = useCallback((error) => {
    const raw = error?.message?.toLowerCase?.() || "";

    if (raw.includes("jwt") || raw.includes("auth")) {
      return "Your session may have expired. Please log in again.";
    }

    if (raw.includes("permission") || raw.includes("row-level security")) {
      return "You don’t have permission to update this profile.";
    }

    if (raw.includes("network") || raw.includes("fetch")) {
      return "Network issue detected. Please try again.";
    }

    return error?.message || "Something went wrong. Please try again.";
  }, []);

  const updateProfileAndContinue = useCallback(
    async ({ actionKey, payload, destination }) => {
      if (!user?.id || isBusy) return false;

      if (!payload?.has_completed_onboarding) {
        setErrorMessage("Invalid onboarding request.");
        return false;
      }

      setActiveAction(actionKey);
      setErrorMessage("");

      try {
        const sanitizedPayload = {
          has_completed_onboarding: true,
          plan: String(payload.plan || "free").trim(),
          role: String(payload.role || "free_user").trim(),
        };

        const { error } = await supabase
          .from("profiles")
          .update(sanitizedPayload)
          .eq("id", user.id);

        if (error) {
          throw error;
        }

        await refreshProfile?.(user.id);
        navigate(destination, { replace: true });
        return true;
      } catch (error) {
        console.error(`Onboarding ${actionKey} error:`, error);
        setErrorMessage(getFriendlyError(error));
        return false;
      } finally {
        setActiveAction(null);
      }
    },
    [user?.id, isBusy, refreshProfile, navigate, getFriendlyError]
  );

  const handleStayFree = useCallback(() => {
    return updateProfileAndContinue({
      actionKey: "free",
      payload: {
        has_completed_onboarding: true,
        plan: "free",
        role: "free_user",
      },
      destination: "/dashboard",
    });
  }, [updateProfileAndContinue]);

  const handleEnroll = useCallback(() => {
    return updateProfileAndContinue({
      actionKey: "enroll",
      payload: {
        has_completed_onboarding: true,
        plan: "free",
        role: "free_user",
      },
      destination: "/enroll",
    });
  }, [updateProfileAndContinue]);

  return (
    <div className="min-h-screen bg-[#06110d] text-white px-4 py-8 md:px-6">
      <div className="max-w-5xl mx-auto min-h-[calc(100vh-4rem)] flex items-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden shadow-2xl">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6 md:p-8 lg:p-10 bg-gradient-to-br from-emerald-950 via-[#0b1f19] to-slate-950">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300 mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                {content.badge}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
                {content.title}{" "}
                <span className="text-yellow-300">{content.titleHighlight}</span>
              </h1>

              <p className="text-white/70 text-sm md:text-base leading-relaxed mb-8 max-w-xl">
                {content.intro}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Free Access</p>
                    <p className="text-sm text-white/65">
                      Use expense tracking and explore the app with limited access.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <ShieldCheck className="w-5 h-5 text-yellow-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Enroll in CLARA</p>
                    <p className="text-sm text-white/65">
                      Unlock premium learning, coaching flow, assignments, deeper
                      support, and accountability.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 lg:p-10 bg-white">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 mb-2">
                  {content.choosePathEyebrow}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                  {content.choosePathTitle}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {content.choosePathDescription}
                </p>
              </div>

              {errorMessage ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="rounded-[24px] border-2 border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">Stay Free</p>
                      <p className="text-sm text-slate-600">
                        Start with limited access
                      </p>
                    </div>
                    <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                      FREE
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700 mb-5">
                    <li>• Access expense tracking</li>
                    <li>• View-only limited app access</li>
                    <li>• Good if you want to explore first</li>
                  </ul>

                  <button
                    type="button"
                    onClick={handleStayFree}
                    disabled={isBusy}
                    className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 font-semibold text-white transition"
                  >
                    {activeAction === "free" ? "Saving..." : "Continue with Free Access"}
                  </button>
                </div>

                <div className="rounded-[24px] border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        Enroll in CLARA
                      </p>
                      <p className="text-sm text-slate-600">
                        Choose your tier and submit payment
                      </p>
                    </div>
                    <div className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-900">
                      PREMIUM
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700 mb-5">
                    <li>• Choose from available plans</li>
                    <li>• Unlock premium modules and accountability</li>
                    <li>• Continue to the enrollment tier page</li>
                  </ul>

                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={isBusy}
                    className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 font-semibold text-white transition inline-flex items-center justify-center gap-2"
                  >
                    {activeAction === "enroll"
                      ? "Preparing..."
                      : "Enroll and Choose a Plan"}
                    {activeAction !== "enroll" && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                {content.footerNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}