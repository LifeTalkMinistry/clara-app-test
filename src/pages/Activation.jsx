import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useUserRole from "@/hooks/useUserRole";
import { validateActivationCode, formatActivationCode } from "@/lib/activation";

export default function Activation() {
  const navigate = useNavigate();
  const { user, planLabel, isPreActivation, refreshUser, loading } = useUserRole();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setSaving(true);
      await validateActivationCode({ code, user, plan: user?.plan });
      await refreshUser?.();
      navigate("/program-onboarding", {
        replace: true,
        state: { activated: true },
      });
    } catch (err) {
      console.error("Activation failed:", err);
      setError(err?.message || "Activation failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-300" />
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 pb-8 pt-4 md:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(7,16,32,0.98),rgba(12,40,52,0.96)_48%,rgba(69,49,18,0.86))] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.36)] md:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
            <KeyRound className="h-3.5 w-3.5" />
            CLARA Activation
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                Activate your {planLabel} system.
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Committed accounts begin with a premium preview. Enter the kit
                activation code to unlock the full decision system, AI depth,
                and guided first action across devices.
              </p>

              {!isPreActivation ? (
                <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />
                    <div>
                      <p className="font-semibold">System activated</p>
                      <p className="mt-1 text-sm text-white/65">
                        Your account already has activated access.
                      </p>
                    </div>
                  </div>
                  <Link to="/dashboard" className="mt-4 block">
                    <Button className="w-full rounded-2xl bg-white text-slate-950 hover:bg-white/90">
                      Return to Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <Input
                    value={code}
                    onChange={(event) => setCode(formatActivationCode(event.target.value))}
                    placeholder="CORE-XXXX-XXXX"
                    className="h-12 rounded-2xl border-white/10 bg-black/25 text-white placeholder:text-white/35"
                  />
                  {error ? <p className="text-sm text-rose-200">{error}</p> : null}
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                  >
                    {saving ? "Activating..." : "Activate System"}
                  </Button>
                </form>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                {isPreActivation ? <Lock className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
              </div>
              <h2 className="mt-5 text-xl font-bold">
                {isPreActivation ? "Preview mode" : "Full intelligence"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {isPreActivation
                  ? "You can explore the foundation while your physical kit and activation step are completed."
                  : "Dashboard, analytics, AI, customization, and guided actions now stay unlocked from Supabase."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
