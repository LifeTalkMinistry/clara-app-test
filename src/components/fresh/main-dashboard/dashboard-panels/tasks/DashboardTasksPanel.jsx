import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Flag, ListChecks } from "lucide-react";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";
import { dashboardPanelCardClass } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

export default function DashboardTasksPanel({ onBack, activeTask, nextTask, tasks = [], submissions = [], programJourney }) {
  const completedSubmissionIds = useMemo(() => {
    return new Set((submissions || []).map((submission) => String(submission.task_id || submission.id || "")));
  }, [submissions]);

  const visibleTasks = useMemo(() => {
    const journeyTasks = Array.isArray(programJourney?.items) ? programJourney.items : [];
    const sourceTasks = journeyTasks.length > 0 ? journeyTasks : tasks;
    return (sourceTasks || []).slice(0, 6);
  }, [programJourney, tasks]);

  const highlightedTask = activeTask || nextTask || visibleTasks[0] || null;

  return (
    <DashboardPanelShell
      title="Tasks"
      subtitle="Today’s program focus and progress"
      icon={ListChecks}
      viewAllTo="/tasks"
      onBack={onBack}
    >
      {highlightedTask ? (
        <div className="overflow-hidden rounded-[30px] border border-amber-400/18 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_36%),linear-gradient(135deg,rgba(58,35,12,0.92),rgba(24,18,12,0.96))] p-5 shadow-[0_20px_60px_rgba(250,204,21,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/80">
                {highlightedTask.week ? `Week ${highlightedTask.week}` : "Current focus"}
                {highlightedTask.day ? ` • Day ${highlightedTask.day}` : ""}
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight text-white">{highlightedTask.title || "Your next task is ready"}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/68">
                {highlightedTask.description || highlightedTask.summary || "Open your full tasks page to continue your guided CLARA progress."}
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-amber-300/20 bg-amber-300/12 text-amber-100">
              <Flag className="h-6 w-6" />
            </div>
          </div>

          <Link to="/tasks" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(250,204,21,0.22)]">
            Continue task
          </Link>
        </div>
      ) : (
        <div className={`${dashboardPanelCardClass} text-center`}>
          <p className="text-sm font-semibold text-white">No task assigned yet</p>
          <p className="mt-1 text-xs text-white/55">Once your program starts, your tasks will appear here.</p>
        </div>
      )}

      {visibleTasks.length > 0 ? (
        <div className="space-y-3">
          {visibleTasks.map((task, index) => {
            const taskId = String(task.id || task.task_id || index);
            const done = completedSubmissionIds.has(taskId) || task.status === "completed" || task.completed === true;

            return (
              <Link key={taskId} to="/tasks" className={`${dashboardPanelCardClass} block transition hover:bg-white/[0.075]`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${done ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-200" : "border-white/15 bg-white/8 text-white/65"}`}>
                    {done ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{task.title || `Task ${index + 1}`}</p>
                    <p className="mt-1 truncate text-xs text-white/50">
                      {task.day ? `Day ${task.day}` : "Program task"}{done ? " • Completed" : " • Pending"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/35" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </DashboardPanelShell>
  );
}
