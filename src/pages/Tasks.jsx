import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  normalizeProgramTask,
  summarizeCoachingRequests,
} from "@/lib/program-journey";
import {
  ensureUserProgramAccess,
  startUserChallenge,
  syncChallengeDaySummary,
  fetchUserProgramRecord,
} from "@/lib/program-access";

function StatusPill({ item }) {
  const base = "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide";

  if (item.state === "active") {
    return <span className={`${base} border border-emerald-400/30 bg-emerald-400/15 text-emerald-100`}>Today</span>;
  }

  if (item.state === "available") {
    return <span className={`${base} border border-sky-400/20 bg-sky-400/10 text-sky-100`}>Unlocked</span>;
  }

  if (item.state === "completed") {
    return <span className={`${base} border border-white/10 bg-white/10 text-white/80`}>Completed</span>;
  }

  if (item.isProProgramBlocked) {
    return <span className={`${base} border border-amber-400/20 bg-amber-400/10 text-amber-100`}>Upgrade</span>;
  }

  return <span className={`${base} border border-white/10 bg-white/5 text-white/55`}>Locked</span>;
}

function ProgramStateIcon({ item }) {
  if (item.isCompleted) {
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

  if (item.milestone_type) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-100">
        <Trophy className="h-5 w-5" />
      </div>
    );
  }

  if (item.state === "available") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-100">
        <Zap className="h-5 w-5" />
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
            <p className="text-xs uppercase tracking-wide text-white/45">{lockedInfo?.metaLabel || "Day"}</p>
            <p className="mt-2 text-sm font-semibold text-white">{lockedInfo?.metaValue}</p>
          </div>
          <div className="flex gap-3">
            {lockedInfo?.href ? (
              <Button className="flex-1" onClick={() => lockedInfo.onNavigate?.(lockedInfo.href)}>
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
  const { user, plan, access, getFeatureAccessMode, loading: accessLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const tasksMode = getFeatureAccessMode("tasks");
  const hasFullTaskAccess = access.tasksFull;
  const hasTaskPreview = access.tasksPreview;

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [programRecord, setProgramRecord] = useState(null);
  const [coachingRequests, setCoachingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tasksTable, setTasksTable] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null);
  const [startingChallenge, setStartingChallenge] = useState(false);

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
    if (!user?.id || !user?.email) return;

    try {
      setLoading(true);
      const table = await resolveTasksTable();

      const [tasksRes, subsRes, coachingRes, nextProgramRecord] = await Promise.all([
        supabase
          .from(table)
          .select("*")
          .order("sort_order", { ascending: true })
          .order("day", { ascending: true }),
        hasFullTaskAccess
          ? supabase
              .from("task_submissions")
              .select("*")
              .or(`created_by.eq.${user.email},user_id.eq.${user.id}`)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        hasFullTaskAccess
          ? supabase
              .from("coaching_requests")
              .select("*")
              .or(`user_id.eq.${user.id},created_by.eq.${user.email}`)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        hasFullTaskAccess
          ? fetchUserProgramRecord({ supabase, userId: user.id })
          : Promise.resolve(null),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (subsRes.error) throw subsRes.error;

      const normalizedTasks = Array.isArray(tasksRes.data)
        ? tasksRes.data.map(normalizeProgramTask)
        : [];

      const ensuredProgram =
        nextProgramRecord ||
        (hasFullTaskAccess
          ? await ensureUserProgramAccess({
              supabase,
              user,
              profile: user?.profile || user,
              tasks: normalizedTasks,
            })
          : null);
      const syncedProgram =
        ensuredProgram?.challenge_started
          ? await syncChallengeDaySummary({
              supabase,
              userId: user.id,
              programRecord: ensuredProgram,
            })
          : ensuredProgram;

      setTasks(normalizedTasks);
      setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
      setCoachingRequests(Array.isArray(coachingRes.data) ? coachingRes.data : []);
      setProgramRecord(syncedProgram || null);
    } catch (error) {
      console.error("Failed loading program tasks:", error);
      setTasks([]);
      setSubmissions([]);
      setProgramRecord(null);
      setCoachingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [hasFullTaskAccess, resolveTasksTable, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const journey = useMemo(
    () =>
      buildProgramJourney(tasks, submissions, {
        plan,
        profile: user?.profile || user,
        programRecord,
      }),
    [plan, programRecord, submissions, tasks, user]
  );

  const coachingSummary = useMemo(
    () => summarizeCoachingRequests(coachingRequests),
    [coachingRequests]
  );

  const groupedTasks = useMemo(() => {
    return journey.items.reduce((groups, item) => {
      const key = item.theme || `Week ${item.week}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [journey.items]);

  const selectedNextTask = useMemo(() => {
    if (!selected) return null;
    return journey.items.find((item) => item.day > selected.day && item.isTierAllowed) || null;
  }, [journey.items, selected]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("open") !== "today") return;
    if (loading) return;

    if (journey.todayItem) {
      setSelected(journey.todayItem);
    }

    navigate("/tasks", { replace: true });
  }, [journey.todayItem, loading, location.search, navigate]);

  const handleTaskSelection = useCallback(
    (item) => {
      if (item.state === "locked") {
        setLockedInfo({
          eyebrow: item.isProProgramBlocked ? "Upgrade" : "Locked",
          title: item.isProProgramBlocked ? "Continue your full 30-day journey" : "This day unlocks later",
          body:
            item.lockedReason ||
            (item.isProProgramBlocked
              ? "Upgrade to Core to continue beyond your starter path."
              : "This day will unlock automatically as your program progresses."),
          metaLabel: "Selected day",
          metaValue: `Day ${item.day} • ${item.title}`,
          ctaLabel: item.isProProgramBlocked ? "View Upgrade" : "Open Program",
          href: item.isProProgramBlocked ? "/enroll" : "/tasks",
          onNavigate: (href) => navigate(href),
        });
        return;
      }

      setSelected(item);
    },
    [navigate]
  );

  const handleStartChallenge = useCallback(async () => {
    if (!user?.id) return;

    try {
      setStartingChallenge(true);
      const nextRecord = await startUserChallenge({
        supabase,
        user,
        profile: user?.profile || user,
        programRecord,
      });
      setProgramRecord(nextRecord);
      await loadData();
    } catch (error) {
      console.error("Failed to start challenge:", error);
    } finally {
      setStartingChallenge(false);
    }
  }, [loadData, programRecord, user]);

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing your program..." />;
  }

  if (!hasTaskPreview) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto cursor-pointer" onClick={() => navigate("/enroll")}>
        <EmptyState
          icon={ListChecks}
          title="The guided program is locked"
          description="Turn on task access for this plan or upgrade to begin the 30-day system."
        />
      </div>
    );
  }

  if (loading) {
    return <FeaturePageLoader label="Building your 30-day journey..." />;
  }

  if (!hasFullTaskAccess) {
    const previewItems = tasks.slice(0, 3);

    return (
      <div className="mx-auto max-w-4xl px-4 pb-12 pt-4 md:px-6">
        <PageHeader
          title="Program Preview"
          subtitle={tasksMode === "preview" ? "Sample the first few guided tasks" : "Program access"}
        />

        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100/70">Preview Mode</p>
          <h2 className="mt-2 text-xl font-semibold">Your plan includes a task preview</h2>
          <p className="mt-2 text-sm leading-7 text-white/75">
            Browse the first few CLARA tasks here. Upgrade any time to unlock the full guided flow, progress tracking, and submissions.
          </p>
          <Button className="mt-4" onClick={() => navigate("/enroll")}>
            Unlock Full Program
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {previewItems.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-white/10 bg-[#0b1420] p-4 text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Day {item.day}</p>
              <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-white/70">
                {item.task_instruction || item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bubble = getProgramBubbleContent(journey, {
    coachingSummary: journey.tier === "coaching" ? coachingSummary : null,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-4 md:px-6">
      <PageHeader
        title="Program"
        subtitle={
          journey.challengeStarted
            ? `Day ${journey.unlockedDay} of ${journey.totalCount || 30} unlocked`
            : "Available when you start the challenge"
        }
      />

      <div className="space-y-4">
        {!journey.challengeStarted ? (
          <section className="rounded-[30px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.92)_100%)] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">
                  30-Day Challenge
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Start when you are ready</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                  Day 1 opens immediately. After that, each next day unlocks at 6:00 AM Manila time based on your challenge start date.
                </p>
              </div>
              <Button onClick={handleStartChallenge} disabled={startingChallenge} className="shrink-0">
                <Zap className="mr-2 h-4 w-4" />
                {startingChallenge ? "Starting..." : "Start Challenge"}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.92)_100%)] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                <ShieldCheck className="h-3.5 w-3.5" />
                {EXPERIENCE_TIER_LABELS[journey.tier]} Program
              </div>

              <h2 className="mt-4 text-2xl font-semibold leading-tight">
                {journey.todayItem
                  ? `Today is Day ${journey.todayItem.day}`
                  : "Your guided path is visible from here"}
              </h2>

              <p className="mt-3 max-w-[42rem] text-sm leading-7 text-white/72">
                {journey.todayItem?.description || bubble.body}
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3 self-stretch">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Progress</p>
                <p className="mt-2 text-2xl font-semibold text-white">{journey.percentComplete}%</p>
                <p className="mt-1 text-xs text-white/55">
                  {journey.accessibleCompletedCount} of {journey.accessibleTaskCount || journey.totalCount} completed
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Program start</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {programRecord?.program_start_date || "Not started"}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {journey.challengeStarted
                    ? "Next days unlock at 6:00 AM"
                    : "Waiting for Start Challenge"}
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

          {journey.todayItem ? (
            <div className="mt-5 rounded-[26px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Today's Mission</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{journey.todayItem.title}</h3>
              <p className="mt-2 text-sm leading-7 text-white/70">
                {journey.todayItem.task_instruction || journey.todayItem.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => handleTaskSelection(journey.todayItem)}>
                  <Zap className="mr-2 h-4 w-4" />
                  Start Day {journey.todayItem.day}
                </Button>
                {journey.todayItem.milestone_type ? (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100">
                    Milestone day
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {journey.tier === "coaching" ? (
          <section className="rounded-[26px] border border-white/10 bg-[#0b1420] p-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Life OS support</p>
            <h3 className="mt-2 text-base font-semibold">
              {coachingSummary.hasPendingSession ? "Your support layer is active" : "Your personal support surfaces live here"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-white/70">
              {coachingSummary.hasPendingSession
                ? "Continue the daily system while your next coaching checkpoint stays in motion."
                : "This is where CLARA pairs the guided system with your deeper accountability layer."}
            </p>
          </section>
        ) : null}

        <section className="space-y-5">
          {Object.entries(groupedTasks).map(([groupLabel, items]) => (
            <div key={groupLabel} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {groupLabel}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {items.filter((item) => item.isCompleted).length} completed
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleTaskSelection(item)}
                    className={cn(
                      "group w-full rounded-[26px] border p-4 text-left transition duration-200",
                      item.state === "active" &&
                        "border-emerald-400/25 bg-[linear-gradient(135deg,rgba(6,20,18,0.98)_0%,rgba(13,38,36,0.94)_100%)] shadow-[0_18px_38px_rgba(16,185,129,0.12)]",
                      item.state === "available" &&
                        "border-sky-400/15 bg-[linear-gradient(135deg,rgba(9,18,32,0.98)_0%,rgba(10,27,42,0.94)_100%)]",
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
                            <h3 className={cn("mt-1 text-base font-semibold leading-tight", item.state === "locked" ? "text-white/78" : "text-white")}>
                              {item.title}
                            </h3>
                          </div>

                          <StatusPill item={item} />
                        </div>

                        <p className={cn("mt-3 text-sm leading-7", item.state === "locked" ? "text-white/45" : "text-white/70")}>
                          {item.short_label || item.task_instruction || item.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/55">
                          {item.theme ? (
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{item.theme}</span>
                          ) : null}
                          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                            {item.estimated_minutes} min
                          </span>
                          {item.milestone_type ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                              {item.milestone_type}
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
                        <div className={cn(
                          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
                          item.state === "active" && "bg-white text-slate-950",
                          item.state === "available" && "border border-white/10 bg-white/5 text-white/80",
                          item.state === "completed" && "border border-white/10 bg-white/5 text-white/80",
                          item.state === "locked" && "border border-white/10 bg-black/20 text-white/50"
                        )}>
                          {item.state === "locked" ? (
                            <>
                              View
                              <Lock className="h-4 w-4" />
                            </>
                          ) : item.state === "completed" ? (
                            <>
                              Review
                              <BadgeCheck className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Open
                              <ArrowRight className="h-4 w-4" />
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
      </div>

      <LockedTaskDialog lockedInfo={lockedInfo} onClose={() => setLockedInfo(null)} />

      <ChallengeModal
        task={selected}
        nextTask={selectedNextTask}
        onClose={() => setSelected(null)}
        onSubmitted={loadData}
        user={user}
        profile={user?.profile || user}
        programRecord={programRecord}
        existingSubmission={selected ? journey.items.find((item) => item.id === selected.id)?.submission : null}
      />
    </div>
  );
}
