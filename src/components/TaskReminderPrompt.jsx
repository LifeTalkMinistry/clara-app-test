import { useMemo, useState } from "react";
import { BellRing, Clock3, Sparkles, X } from "lucide-react";
import { formatReminderTime } from "@/lib/task-reminders";

export default function TaskReminderPrompt({
  visible,
  task,
  reminderWindow,
  nextReminderWindow,
  snoozeChoices = [],
  loading = false,
  onOpen,
  onDismiss,
  onSnooze,
}) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const nextLabel = useMemo(() => {
    if (nextReminderWindow?.label) return nextReminderWindow.label;
    if (reminderWindow?.time) return formatReminderTime(reminderWindow.time);
    return "";
  }, [nextReminderWindow?.label, reminderWindow?.time]);

  if (!visible || !task) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[72] px-4 md:bottom-8 md:left-auto md:right-5 md:max-w-[360px] md:px-0">
      <div className="pointer-events-auto overflow-hidden rounded-[30px] border border-emerald-300/15 bg-[linear-gradient(180deg,rgba(5,14,24,0.96)_0%,rgba(6,18,29,0.95)_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        <div className="absolute inset-x-8 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.28),transparent_70%)] blur-2xl" />
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/12 text-emerald-200 shadow-[0_14px_30px_rgba(16,185,129,0.16)]">
              <BellRing className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                  Today&apos;s Task
                </span>
                {reminderWindow?.label ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
                    <Clock3 className="h-3.5 w-3.5" />
                    {reminderWindow.label}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-base font-semibold leading-tight text-white">
                {task.title || `Continue Day ${task.day}`}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {task.task_instruction ||
                  task.main_action_instruction ||
                  "Your next guided step is ready whenever you are."}
              </p>

              {nextLabel ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-200/80" />
                  Returns next at {nextLabel} if you skip this window
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpen}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#10b981,#0f766e)] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open Today&apos;s Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowSnoozeOptions((current) => !current)}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/82 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Later
                </button>
              </div>

              {showSnoozeOptions ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Snooze reminder
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {snoozeChoices.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => {
                          setShowSnoozeOptions(false);
                          onSnooze?.(choice.value);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/75 transition hover:border-emerald-300/25 hover:bg-emerald-400/10 hover:text-white"
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onDismiss}
              disabled={loading}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/50 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Dismiss task reminder"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
