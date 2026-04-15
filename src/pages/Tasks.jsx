import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ListChecks,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ChallengeModal from "../components/ChallengeModal";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import {
  buildProgramJourney,
  EXPERIENCE_TIER_LABELS,
  getProgramBubbleContent,
  summarizeCoachingRequests,
} from "@/lib/program-journey";

const sortTasks = (items = []) => {
  return [...items].sort((a, b) => {
    const weekDiff = Number(a.week || 0) - Number(b.week || 0);
    if (weekDiff !== 0) return weekDiff;

    const dayDiff = Number(a.day || 0) - Number(b.day || 0);
    if (dayDiff !== 0) return dayDiff;

    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
};

const normalizeTask = (task = {}) => {
  const week = Number(task.week ?? task.week_number ?? 1);
  const day = Number(task.day ?? task.day_number ?? 1);
  const sortOrder = Number(task.sort_order ?? 0);

  const isActive =
    typeof task.is_active === "boolean"
      ? task.is_active
      : task.status === "inactive"
        ? false
        : true;

  return {
    ...task,
    week,
    day,
    sort_order: sortOrder,
    week_number: week,
    day_number: day,
    is_active: isActive,
    difficulty_mode_enabled: !!task.difficulty_mode_enabled,
    main_action_instruction:
      task.main_action_instruction || task.main_instruction || task.description || "",
    main_why_it_matters: task.main_why_it_matters || task.why_it_matters || "",
    main_optional_guidance: task.main_optional_guidance || task.optional_guidance || "",
    main_points: Number(task.main_points ?? task.points ?? 10),
    easy_action_instruction: task.easy_action_instruction || "",
    easy_why_it_matters: task.easy_why_it_matters || "",
    easy_optional_guidance: task.easy_optional_guidance || "",
    easy_points: Number(task.easy_points ?? 5),
    medium_action_instruction: task.medium_action_instruction || "",
    medium_why_it_matters: task.medium_why_it_matters || "",
    medium_optional_guidance: task.medium_optional_guidance || "",
    medium_points: Number(task.medium_points ?? 10),
    hard_action_instruction: task.hard_action_instruction || "",
    hard_why_it_matters: task.hard_why_it_matters || "",
    hard_optional_guidance: task.hard_optional_guidance || "",
    hard_points: Number(task.hard_points ?? 20),
    proof_required: task.proof_required || "none",
    require_detailed_answer: !!task.require_detailed_answer,
    interview_candidate_task: !!task.interview_candidate_task,
  };
};

function StatusPill({ item }) {
  if (item.state === "active") {
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
        Active
      </span>
    );
  }

  if (item.state === "completed") {
    const text = item.submissionMeta.isApproved ? "Approved" : "Completed";
    const tone = item.submissionMeta.isApproved
      ? "border-sky-400/30 bg-sky-400/15 text-sky-100"
      : "border-white/10 bg-white/10 text-white/80";

    return (
      <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", tone)}>
        {text}
      </span>
    );
  }

  if (item.isBeyondTierLimit) {
    return (
      <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
        Upgrade
      </span>
    );
  }

  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
      Locked
    </span>
  );
}

function ProgramStateIcon({ item }) {
  if (item.state === "completed") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-emerald-300">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  }

  if (item.state === "active") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/15 text-emerald-200 shadow-[0_14px_30px_rgba(16,185,129,0.18)]">
        <Sparkles className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/40">
      <Lock className="h-4 w-4" />
    </div>
  );
}

function LockedTaskDialog({ lockedInfo, onClose }) {
  return (
    <Dialog open={!!lockedInfo} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="rounded-[28px] border border-white/10 bg-[#08111d] p-0 text-white">
        <div className="bg-[linear-gradient(135deg,#122033_0%,#102837_55%,#114839_100%)] px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            {lockedInfo?.eyebrow || "Program"}
          </p>
          <h3 className="mt-2 text-xl font-semibold">{lockedInfo?.title}</h3>
        </div>

        <div className="space-y-5 px-6 py-6">
          <p className="text-sm leading-7 text-white/72">{lockedInfo?.body}</p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-wide text-white/45">
              {lockedInfo?.metaLabel || "Day"}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{lockedInfo?.metaValue}</p>
          </div>

          <div className="flex gap-3">
            {lockedInfo?.href ? (
              <Button
                className="flex-1"
                onClick={() => {
                  lockedInfo.onNavigate?.(lockedInfo.href);
                  onClose?.();
                }}
              >
                {lockedInfo.ctaLabel || "Continue"}
              </Button>
            ) : null}

            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Tasks() {
  const { user, plan, isPaid, loading: accessLoading } = useUserRole();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [coachingRequests, setCoachingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tasksTable, setTasksTable] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null);

  const resolveTasksTable = useCallback(async () => {
    if (tasksTable) return tasksTable;

    const challengeCheck = await supabase.from("challenge_tasks").select("id").limit(1);
    if (!challengeCheck.error) {
      setTasksTable("challenge_tasks");
      return "challenge_tasks";
    }

    const tasksCheck = await supabase.from("tasks").select("id").limit(1);
    if (!tasksCheck.error) {
      setTasksTable("tasks");
      return "tasks";
    }

    throw new Error("Could not find challenge_tasks or tasks table.");
  }, [tasksTable]);

  const loadData = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      const table = await resolveTasksTable();

      const [tasksRes, subsRes, coachingRes] = await Promise.all([
        supabase
          .from(table)
          .select("*")
          .or("is_active.eq.true,status.eq.active")
          .order("week", { ascending: true })
          .order("day", { ascending: true })
          .order("sort_order", { ascending: true }),
        supabase
          .from("task_submissions")
          .select("*")
          .eq("created_by", user.email)
          .order("created_at", { ascending: false }),
        supabase
          .from("coaching_requests")
          .select("*")
          .or(`user_id.eq.${user.id},created_by.eq.${user.email}`)
          .order("created_at", { ascending: false }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (subsRes.error) throw subsRes.error;

      const normalizedTasks = Array.isArray(tasksRes.data)
        ? sortTasks(tasksRes.data.map(normalizeTask))
        : [];

      setTasks(normalizedTasks);
      setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
      setCoachingRequests(Array.isArray(coachingRes.data) ? coachingRes.data : []);
    } catch (err) {
      console.error("Failed loading tasks:", err);
      setTasks([]);
      setSubmissions([]);
      setCoachingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [resolveTasksTable, user?.email, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const journey = useMemo(
    () =>
      buildProgramJourney(tasks, submissions, {
        plan,
        profile: user?.profile || user,
      }),
    [plan, submissions, tasks, user]
  );

  const coachingSummary = useMemo(
    () => summarizeCoachingRequests(coachingRequests),
    [coachingRequests]
  );

  const bubble = useMemo(
    () =>
      getProgramBubbleContent(journey, {
        coachingSummary: journey.tier === "coaching" ? coachingSummary : null,
      }),
    [coachingSummary, journey]
  );

  const groupedTasks = useMemo(() => {
    return journey.items.reduce((groups, item) => {
      const key = `Week ${item.week}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [journey.items]);

  const selectedNextTask = useMemo(() => {
    if (!selected) return null;
    const current = journey.items.find((item) => item.id === selected.id);
    if (!current) return null;

    return journey.items.find((item) => item.index > current.index) || null;
  }, [journey.items, selected]);

  const handleTaskSelection = useCallback(
    (item) => {
      if (item.state === "locked") {
        const isUpgradeLock = item.isBeyondTierLimit;

        setLockedInfo({
          eyebrow: isUpgradeLock ? "Upgrade Path" : "Locked Until Ready",
          title: isUpgradeLock ? "Continue your reset" : "This day unlocks next",
          body: isUpgradeLock
            ? "You already have the tools. Upgrade to Core to continue the full guided 30-day reset."
            : item.lockedReason || "Complete your current guided day to unlock this next step.",
          metaLabel: "Selected day",
          metaValue: `Week ${item.week} • Day ${item.day} • ${item.title || "Program task"}`,
          ctaLabel: isUpgradeLock ? "View Upgrade" : "Open Program",
          href: isUpgradeLock ? "/enroll" : "/tasks",
          onNavigate: (href) => navigate(href),
        });
        return;
      }

      setSelected(item);
    },
    [navigate]
  );

  const handleSubmitted = useCallback(async () => {
    await loadData();
  }, [loadData]);

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing your program..." />;
  }

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto cursor-pointer" onClick={() => navigate("/enroll")}>
        <EmptyState
          icon={ListChecks}
          title="The guided system is available on paid plans"
          description="Unlock your financial tools and program path to start CLARA's guided experience."
        />
      </div>
    );
  }

  if (loading) {
    return <FeaturePageLoader label="Building your guided path..." />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-4 md:px-6">
      <PageHeader
        title="Program"
        subtitle={`${journey.completedCount} of ${journey.totalCount} days completed`}
      />

      <div className="space-y-4">
        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.92)_100%)] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                <ShieldCheck className="h-3.5 w-3.5" />
                {EXPERIENCE_TIER_LABELS[journey.tier]} Program
              </div>

              <h2 className="mt-4 text-2xl font-semibold leading-tight">
                {journey.activeItem
                  ? `Today's task is Day ${journey.activeItem.day}`
                  : journey.state === "starter_complete"
                    ? "Your starter path is complete"
                    : "Your guided path is visible from here"}
              </h2>

              <p className="mt-3 max-w-[42rem] text-sm leading-7 text-white/72">
                {journey.activeItem
                  ? journey.activeItem.title || "Open your focused task experience and continue your reset."
                  : bubble.body}
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3 self-stretch">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Progress</p>
                <p className="mt-2 text-2xl font-semibold text-white">{journey.percentComplete}%</p>
                <p className="mt-1 text-xs text-white/55">
                  {journey.accessibleCompletedCount} of {journey.accessibleTaskCount || journey.totalCount} unlocked days
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Current access</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {journey.tier === "entry" ? `${journey.starterDayLimit} days` : "30 days"}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {journey.tier === "entry" ? "Starter path unlocked" : "Full guided journey"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-300 transition-all duration-500"
              style={{ width: `${Math.max(journey.percentComplete, 4)}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (journey.activeItem) {
                  handleTaskSelection(journey.activeItem);
                  return;
                }

                navigate(bubble.href || "/tasks");
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
            >
              <Zap className="h-4 w-4" />
              {journey.activeItem ? "Open Today's Task" : bubble.ctaLabel}
            </button>

            {journey.tier === "entry" ? (
              <button
                type="button"
                onClick={() => navigate("/enroll")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                Continue Your Reset
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </section>

        {journey.tier === "coaching" && (
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[26px] border border-white/10 bg-[#0b1420] p-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Coaching status</p>
              <h3 className="mt-2 text-base font-semibold">
                {coachingSummary.hasPendingSession ? "Your support layer is active" : "Book your onboarding session"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/70">
                {coachingSummary.hasPendingSession
                  ? (coachingSummary.nextApproved || coachingSummary.pending)?.topic ||
                    "Your next coaching checkpoint is already in motion."
                  : "Add your first coaching session so your guided system and human support start together."}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-[#0b1420] p-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Session timeline</p>
              <h3 className="mt-2 text-base font-semibold">
                {coachingSummary.nextApproved
                  ? "Next session approved"
                  : coachingSummary.pending
                    ? "Session request pending"
                    : "No session scheduled yet"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/70">
                {coachingSummary.nextApproved
                  ? `${coachingSummary.nextApproved.date || "Date pending"} at ${coachingSummary.nextApproved.time || "TBD"}`
                  : coachingSummary.pending
                    ? "Your request is waiting for confirmation."
                    : "Use the coaching area when you want alignment, accountability, or a deeper review."}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-[#0b1420] p-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Completion layer</p>
              <h3 className="mt-2 text-base font-semibold">Final review and certification</h3>
              <p className="mt-2 text-sm leading-7 text-white/70">
                {coachingSummary.completedCount > 0
                  ? `${coachingSummary.completedCount} coaching session${coachingSummary.completedCount > 1 ? "s" : ""} completed so far.`
                  : "Your final review and certification surface here as you move through the full system."}
              </p>
            </div>
          </section>
        )}

        {journey.tier === "entry" && (
          <section className="rounded-[26px] border border-amber-400/20 bg-[linear-gradient(135deg,rgba(26,17,4,0.96)_0%,rgba(43,24,6,0.9)_100%)] p-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                  <Star className="h-3.5 w-3.5" />
                  Starter Path
                </div>
                <h3 className="mt-3 text-lg font-semibold">You have the tools. Now let's guide you.</h3>
                <p className="mt-2 text-sm leading-7 text-white/72">
                  Entry gives you a real guided start. When you're ready to continue the full reset, Core unlocks the remaining days.
                </p>
              </div>

              <Button onClick={() => navigate("/enroll")} className="shrink-0">
                Continue Your 30-Day Reset
              </Button>
            </div>
          </section>
        )}

        {journey.totalCount === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No program days are available yet"
            description="Your guided program will appear here as soon as your tasks are published."
          />
        ) : (
          <section className="space-y-5">
            {Object.entries(groupedTasks).map(([weekLabel, weekItems]) => (
              <div key={weekLabel} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {weekLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {weekItems.filter((item) => item.isCompleted).length} completed
                    </p>
                  </div>
                  <div className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                    {weekItems.length} day{weekItems.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-3">
                  {weekItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleTaskSelection(item)}
                      className={cn(
                        "group w-full rounded-[26px] border p-4 text-left transition duration-200",
                        item.state === "active" &&
                          "border-emerald-400/25 bg-[linear-gradient(135deg,rgba(6,20,18,0.98)_0%,rgba(13,38,36,0.94)_100%)] shadow-[0_18px_38px_rgba(16,185,129,0.12)]",
                        item.state === "completed" &&
                          "border-white/8 bg-[linear-gradient(135deg,rgba(13,20,31,0.98)_0%,rgba(17,24,39,0.94)_100%)]",
                        item.state === "locked" &&
                          "border-white/8 bg-[linear-gradient(135deg,rgba(10,15,24,0.96)_0%,rgba(14,18,28,0.94)_100%)] opacity-90"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <ProgramStateIcon item={item} />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                                Day {item.day}
                              </p>
                              <h3
                                className={cn(
                                  "mt-1 text-base font-semibold leading-tight",
                                  item.state === "locked" ? "text-white/78" : "text-white"
                                )}
                              >
                                {item.title || "Program task"}
                              </h3>
                            </div>

                            <StatusPill item={item} />
                          </div>

                          <p
                            className={cn(
                              "mt-3 text-sm leading-7",
                              item.state === "locked" ? "text-white/45" : "text-white/70"
                            )}
                          >
                            {item.main_action_instruction || "Open this day to view the guided instruction."}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/55">
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                              Week {item.week}
                            </span>
                            {item.submissionMeta.isUnderReview ? (
                              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-100/90">
                                Under review
                              </span>
                            ) : null}
                            {item.submissionMeta.needsRevision ? (
                              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                                Needs revision
                              </span>
                            ) : null}
                            {item.lockedReason ? (
                              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                                {item.lockedReason}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="hidden shrink-0 md:block">
                          <div
                            className={cn(
                              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
                              item.state === "active" &&
                                "bg-white text-slate-950 group-hover:translate-y-[-1px]",
                              item.state === "completed" &&
                                "border border-white/10 bg-white/5 text-white/80",
                              item.state === "locked" &&
                                "border border-white/10 bg-black/20 text-white/50"
                            )}
                          >
                            {item.state === "active" ? (
                              <>
                                Start
                                <ArrowRight className="h-4 w-4" />
                              </>
                            ) : item.state === "completed" ? (
                              <>
                                Review
                                <BadgeCheck className="h-4 w-4" />
                              </>
                            ) : (
                              <>
                                View Details
                                <Lock className="h-4 w-4" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <LockedTaskDialog lockedInfo={lockedInfo} onClose={() => setLockedInfo(null)} />

      <ChallengeModal
        task={selected}
        nextTask={selectedNextTask}
        onClose={() => setSelected(null)}
        onSubmitted={handleSubmitted}
        user={user}
        existingSubmission={selected ? journey.items.find((item) => item.id === selected.id)?.submission : null}
      />
    </div>
  );
}
