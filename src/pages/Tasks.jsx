import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";

export default function Tasks() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-4 md:px-6">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <PageHeader
        title="Tasks"
        subtitle="The old 30-day challenge system has been removed from CLARA."
      />

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.92)_100%)] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/15 text-emerald-200 shadow-[0_14px_30px_rgba(16,185,129,0.18)]">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75">
          Cleaned up
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">
          30-day challenge removed
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          This section no longer loads the challenge modal, task submissions, proof uploads,
          program unlocks, or 30-day journey logic. This keeps the app lighter while preserving
          the route safely.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
            <div>
              <p className="text-sm font-semibold text-white">No active task system</p>
              <p className="mt-1 text-xs leading-6 text-white/58">
                Future CLARA actions can be rebuilt later as a lighter daily strategy system,
                without restoring the heavy 30-day challenge flow.
              </p>
            </div>
          </div>
        </div>

        <Button className="mt-5 w-full" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </Button>
      </section>
    </div>
  );
}
