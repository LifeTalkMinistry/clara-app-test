import { CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminTasks() {
  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.92)_100%)] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/15 text-emerald-200 shadow-[0_14px_30px_rgba(16,185,129,0.18)]">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75">
          Removed
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">
          30-day challenge manager removed
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          The old admin task manager, challenge day editor, task submissions, program unlocks,
          and restore-default 30-day content tools have been removed from the active bundle.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
            <div>
              <p className="text-sm font-semibold text-white">Admin tasks are inactive</p>
              <p className="mt-1 text-xs leading-6 text-white/58">
                A lighter CLARA daily strategy or assignment system can be built later without
                restoring the heavy 30-day challenge architecture.
              </p>
            </div>
          </div>
        </div>

        <Button className="mt-5" disabled>
          Challenge system removed
        </Button>
      </section>
    </div>
  );
}
