import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit,
  Eye,
  LockOpen,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ProgramDayFormModal, { PROGRAM_DAY_BLANK } from "@/components/ProgramDayFormModal";
import { normalizeProgramTask } from "@/lib/program-journey";
import {
  buildOfficialProgramTaskPayload,
  getOfficialProgramDay,
  OFFICIAL_30_DAY_PROGRAM,
} from "@/lib/defaultProgramDays";
import { overrideUserProgramDay, resetUserProgramProgress } from "@/lib/program-access";

const PROGRAM_LENGTH = OFFICIAL_30_DAY_PROGRAM.length;
const PLACEHOLDER_PATTERNS = [/sample/i, /placeholder/i, /dummy/i, /test/i, /todo/i, /tbd/i];

const normalizeText = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

function getTaskPreview(task) {
  return (
    normalizeText(task.short_label) ||
    normalizeText(task.description) ||
    normalizeText(task.task_instruction) ||
    "No preview text yet."
  );
}

function titleLooksGeneric(task) {
  const day = Number(task?.day || task?.day_number || 0);
  const title = normalizeLower(task?.title);
  if (!title) return true;

  return title === `day ${day}` || title === `day ${day}:` || title === "untitled day";
}

function hasPlaceholderLanguage(task) {
  return [
    task?.title,
    task?.short_label,
    task?.description,
    task?.task_instruction,
    task?.reflection_prompt,
    task?.journal_placeholder,
  ].some((value) => PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalizeText(value))));
}

function hasMeaningfulBody(task) {
  return [
    task?.description,
    task?.task_instruction,
    task?.why_this_matters,
    task?.reflection_prompt,
  ].some((value) => normalizeText(value));
}

function isPlaceholderTask(task, officialDay = getOfficialProgramDay(task?.day)) {
  if (!task) return false;
  if (hasPlaceholderLanguage(task)) return true;

  if (!hasMeaningfulBody(task) && titleLooksGeneric(task)) {
    return true;
  }

  if (
    officialDay &&
    normalizeLower(task.title) !== normalizeLower(officialDay.title) &&
    !hasMeaningfulBody(task) &&
    !normalizeText(task.short_label)
  ) {
    return true;
  }

  return false;
}

function getCreateDaySeed(dayNumber) {
  const officialDay = getOfficialProgramDay(dayNumber);
  if (!officialDay) {
    return {
      ...PROGRAM_DAY_BLANK,
      day: dayNumber,
      sort_order: dayNumber,
    };
  }

  return {
    ...PROGRAM_DAY_BLANK,
    ...officialDay,
    id: undefined,
    day: dayNumber,
    day_number: dayNumber,
    sort_order: dayNumber,
  };
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [programUsers, setProgramUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);
  const [editDay, setEditDay] = useState(PROGRAM_DAY_BLANK);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const loadData = useCallback(async (soft = false) => {
    try {
      if (soft) setRefreshing(true);
      else setLoading(true);

      const [taskRows, submissionRows, userProgramRows, profileRows] = await Promise.all([
        supabase.from("challenge_tasks").select("*").order("sort_order", { ascending: true }),
        supabase.from("task_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("user_programs").select("*").order("updated_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name,email,plan"),
      ]);

      if (taskRows.error) throw taskRows.error;
      if (submissionRows.error) throw submissionRows.error;
      if (userProgramRows.error) throw userProgramRows.error;
      if (profileRows.error) throw profileRows.error;

      const profileMap = new Map((profileRows.data || []).map((profile) => [profile.id, profile]));

      setTasks(
        (taskRows.data || [])
          .map(normalizeProgramTask)
          .sort((a, b) => {
            const dayDiff = Number(a.day || 0) - Number(b.day || 0);
            if (dayDiff !== 0) return dayDiff;
            return Number(a.sort_order || 0) - Number(b.sort_order || 0);
          })
      );
      setSubmissions(submissionRows.data || []);
      setProgramUsers(
        (userProgramRows.data || []).map((row) => ({
          ...row,
          profile: profileMap.get(row.user_id) || null,
        }))
      );
    } catch (error) {
      console.error("Failed to load admin program data:", error);
      alert(error.message || "Failed to load program manager.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const programTaskIds = useMemo(() => tasks.map((task) => task.id).filter(Boolean), [tasks]);

  const {
    stats,
    tasksByDay,
    missingOfficialDays,
    placeholderTasks,
    duplicateDays,
    nextSuggestedDay,
  } = useMemo(() => {
    const byDay = new Map();
    const duplicateCounts = new Map();

    for (const task of tasks) {
      const day = Number(task.day);
      if (!byDay.has(day)) byDay.set(day, task);
      duplicateCounts.set(day, (duplicateCounts.get(day) || 0) + 1);
    }

    const officialPresence = OFFICIAL_30_DAY_PROGRAM.filter((day) => byDay.has(day.day)).length;
    const missingDays = OFFICIAL_30_DAY_PROGRAM.filter((day) => !byDay.has(day.day)).map((day) => day.day);
    const flaggedPlaceholderTasks = tasks.filter((task) =>
      isPlaceholderTask(task, getOfficialProgramDay(task.day))
    );

    const duplicateDayNumbers = [...duplicateCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([day]) => day)
      .sort((a, b) => a - b);

    return {
      tasksByDay: byDay,
      missingOfficialDays: missingDays,
      placeholderTasks: flaggedPlaceholderTasks,
      duplicateDays: duplicateDayNumbers,
      nextSuggestedDay: missingDays[0] || Math.min(Math.max(tasks.length + 1, 1), PROGRAM_LENGTH),
      stats: {
        activeTasks: tasks.filter((task) => task.is_active).length,
        milestoneTasks: tasks.filter((task) => !!task.milestone_type).length,
        activeUsers: programUsers.filter((user) => user.is_active !== false).length,
        officialPresence,
      },
    };
  }, [programUsers, tasks]);

  useEffect(() => {
    setReviewNotes(selectedSubmission?.admin_notes || "");
  }, [selectedSubmission]);

  const handleSaveDay = async (nextDay) => {
    const normalizedDay = Number(nextDay.day || 1);
    const duplicate = tasks.find(
      (task) => Number(task.day) === normalizedDay && task.id !== nextDay.id
    );

    if (duplicate) {
      alert(`Day ${normalizedDay} already exists. Edit the existing day or choose another day number.`);
      return;
    }

    const officialTemplate = getOfficialProgramDay(normalizedDay);
    const payload = officialTemplate
      ? buildOfficialProgramTaskPayload(officialTemplate, nextDay)
      : buildOfficialProgramTaskPayload({
          ...PROGRAM_DAY_BLANK,
          ...nextDay,
          day: normalizedDay,
          day_number: normalizedDay,
          sort_order: Number(nextDay.sort_order || normalizedDay),
          week: Math.ceil(normalizedDay / 7),
          week_number: Math.ceil(normalizedDay / 7),
          program_family: "reset_30",
          program_template_key: `day_${String(normalizedDay).padStart(2, "0")}`,
        });

    try {
      if (nextDay.id) {
        const { error } = await supabase.from("challenge_tasks").update(payload).eq("id", nextDay.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("challenge_tasks").insert([payload]);
        if (error) throw error;
      }

      setEditOpen(false);
      await loadData(true);
    } catch (error) {
      console.error("Failed to save program day:", error);
      alert(error.message || "Failed to save program day.");
    }
  };

  const handleRestoreOfficialProgram = async () => {
    const confirmed = window.confirm(
      "Restore the official CLARA 30-day content?\n\nMissing official days will be inserted. Sample or placeholder rows will be replaced with the official content for that day. Existing real program days will stay untouched."
    );
    if (!confirmed) return;

    try {
      setRestoring(true);

      const updates = [];
      const inserts = [];

      for (const officialDay of OFFICIAL_30_DAY_PROGRAM) {
        const existing = tasksByDay.get(Number(officialDay.day));
        const payload = buildOfficialProgramTaskPayload(officialDay);

        if (!existing) {
          inserts.push(payload);
          continue;
        }

        if (isPlaceholderTask(existing, officialDay)) {
          updates.push({ id: existing.id, payload });
        }
      }

      for (const update of updates) {
        const { error } = await supabase.from("challenge_tasks").update(update.payload).eq("id", update.id);
        if (error) throw error;
      }

      if (inserts.length) {
        const { error } = await supabase.from("challenge_tasks").insert(inserts);
        if (error) throw error;
      }

      await loadData(true);

      if (!updates.length && !inserts.length) {
        alert("The official 30-day program is already loaded. No placeholder rows needed replacement.");
      } else {
        alert(
          `Official CLARA content restored.\nInserted: ${inserts.length}\nReplaced placeholder rows: ${updates.length}`
        );
      }
    } catch (error) {
      console.error("Failed to restore official program days:", error);
      alert(error.message || "Failed to restore official program content.");
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!task?.id) return;

    const confirmed = window.confirm(
      `Delete Day ${task.day}: ${task.title || "Untitled Day"}?\n\nThis removes the day from the program manager until you restore or recreate it.`
    );
    if (!confirmed) return;

    try {
      setDeleteLoadingId(task.id);
      const { error } = await supabase.from("challenge_tasks").delete().eq("id", task.id);
      if (error) throw error;
      await loadData(true);
    } catch (error) {
      console.error("Failed to delete program day:", error);
      alert(error.message || "Failed to delete program day.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const toggleDay = async (task) => {
    try {
      const { error } = await supabase
        .from("challenge_tasks")
        .update({
          is_active: !task.is_active,
          status: task.is_active ? "inactive" : "active",
        })
        .eq("id", task.id);

      if (error) throw error;
      await loadData(true);
    } catch (error) {
      console.error("Failed to toggle program day:", error);
      alert(error.message || "Failed to update day status.");
    }
  };

  const handleResetUser = async (programUser) => {
    const confirmed = window.confirm(
      `Reset ${programUser.profile?.full_name || programUser.user_email || "this user"} back to Day 1?`
    );
    if (!confirmed) return;

    try {
      await resetUserProgramProgress({
        supabase,
        userId: programUser.user_id,
        programTaskIds,
      });
      await loadData(true);
    } catch (error) {
      console.error("Failed to reset program progress:", error);
      alert(error.message || "Failed to reset progress.");
    }
  };

  const handleUnlockOverride = async (programUser) => {
    const currentValue = Number(programUser.current_day_override || programUser.manual_unlock_until || 1);
    const nextValue = window.prompt("Unlock through which day?", String(currentValue || 1));
    if (!nextValue) return;

    try {
      await overrideUserProgramDay({
        supabase,
        userId: programUser.user_id,
        unlockUntil: Number(nextValue),
      });
      await loadData(true);
    } catch (error) {
      console.error("Failed to override program day:", error);
      alert(error.message || "Failed to override unlock day.");
    }
  };

  const handleSubmissionReview = async (status) => {
    if (!selectedSubmission) return;

    try {
      setReviewLoading(true);
      const { error } = await supabase
        .from("task_submissions")
        .update({
          status,
          admin_notes: reviewNotes?.trim() || null,
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      setSelectedSubmission(null);
      setReviewNotes("");
      await loadData(true);
    } catch (error) {
      console.error("Failed to review submission:", error);
      alert(error.message || "Failed to review submission.");
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProgramDayFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialValue={editDay}
        onSave={handleSaveDay}
      />

      <Dialog open={!!previewTask} onOpenChange={(next) => !next && setPreviewTask(null)}>
        <DialogContent className="max-w-2xl rounded-[28px] border border-white/10 bg-[#071018]/95 text-white">
          <DialogHeader>
            <DialogTitle>{previewTask?.title}</DialogTitle>
          </DialogHeader>

          {previewTask ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Description</p>
                <p className="mt-2 text-sm leading-7 text-white/78">
                  {previewTask.description || "No description yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Instruction</p>
                <p className="mt-2 text-sm leading-7 text-white/78">
                  {previewTask.task_instruction || "No instruction yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Reflection Prompt</p>
                <p className="mt-2 text-sm leading-7 text-white/78">
                  {previewTask.reflection_prompt || "No reflection prompt yet."}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSubmission} onOpenChange={(next) => !next && setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl rounded-[28px] border border-white/10 bg-[#071018]/95 text-white">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>

          {selectedSubmission ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Student</p>
                <p className="mt-2 text-sm text-white/80">
                  {selectedSubmission.student_name || selectedSubmission.created_by || "Unknown Student"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Content</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                  {selectedSubmission.content || selectedSubmission.reflection || "No content"}
                </p>
              </div>

              <textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white"
                placeholder="Feedback for the student"
              />

              <div className="flex flex-wrap gap-2">
                <Button disabled={reviewLoading} onClick={() => handleSubmissionReview("approved")}>
                  {reviewLoading ? "Saving..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  disabled={reviewLoading}
                  onClick={() => handleSubmissionReview("needs_revision")}
                >
                  Needs Revision
                </Button>
                <Button
                  variant="destructive"
                  disabled={reviewLoading}
                  onClick={() => handleSubmissionReview("rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            Active Days {stats.activeTasks}
          </Badge>
          <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-300">
            Milestones {stats.milestoneTasks}
          </Badge>
          <Badge variant="outline">Active Users {stats.activeUsers}</Badge>
          <Badge variant="outline">Official Days {stats.officialPresence}/{PROGRAM_LENGTH}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button variant="outline" onClick={handleRestoreOfficialProgram} disabled={restoring}>
            <Sparkles className={`mr-2 h-4 w-4 ${restoring ? "animate-pulse" : ""}`} />
            {stats.officialPresence === 0 ? "Load Default 30-Day Program" : "Restore Official 30-Day Content"}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditDay(getCreateDaySeed(nextSuggestedDay));
              setEditOpen(true);
            }}
          >
            Create Day
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="mb-4">
          <TabsTrigger value="templates">Program Days ({stats.officialPresence}/{PROGRAM_LENGTH})</TabsTrigger>
          <TabsTrigger value="users">Program Users ({programUsers.length})</TabsTrigger>
          <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-white/78">
                <p className="text-base font-semibold text-white">The official 30-day program has not been loaded yet.</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Load the default CLARA 30-day program to insert the real Day 1 to Day 30 content, then edit any day from here.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={handleRestoreOfficialProgram} disabled={restoring}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Load Default 30-Day Program
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditDay(getCreateDaySeed(1));
                      setEditOpen(true);
                    }}
                  >
                    Create Day 1 Manually
                  </Button>
                </div>
              </div>
            ) : null}

            {tasks.length > 0 && (missingOfficialDays.length > 0 || placeholderTasks.length > 0 || duplicateDays.length > 0) ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/76">
                <p className="font-semibold text-white">Official program content needs cleanup.</p>
                <div className="mt-2 space-y-1 leading-6">
                  {missingOfficialDays.length > 0 ? (
                    <p>Missing official days: {missingOfficialDays.join(", ")}.</p>
                  ) : null}
                  {placeholderTasks.length > 0 ? (
                    <p>
                      Placeholder or sample rows detected on day{placeholderTasks.length > 1 ? "s" : ""}:{" "}
                      {placeholderTasks.map((task) => task.day).join(", ")}.
                    </p>
                  ) : null}
                  {duplicateDays.length > 0 ? (
                    <p>Duplicate day numbers detected: {duplicateDays.join(", ")}.</p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleRestoreOfficialProgram} disabled={restoring}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Restore Official 30-Day Content
                  </Button>
                  <Button
                    onClick={() => {
                      setEditDay(getCreateDaySeed(nextSuggestedDay));
                      setEditOpen(true);
                    }}
                  >
                    Add Day {nextSuggestedDay}
                  </Button>
                </div>
              </div>
            ) : null}

            {tasks.map((task) => {
              const officialDay = getOfficialProgramDay(task.day);
              const flaggedPlaceholder = isPlaceholderTask(task, officialDay);

              return (
                <div
                  key={task.id}
                  className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        Day {task.day}: {task.title}
                      </p>
                      {task.milestone_type ? (
                        <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-300">
                          <Trophy className="mr-1 h-3 w-3" />
                          {task.milestone_type}
                        </Badge>
                      ) : null}
                      <Badge variant="outline">{task.theme || "No theme"}</Badge>
                      <Badge variant="outline">{task.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge variant="outline">
                        {Array.isArray(task.tier_access) && task.tier_access.length
                          ? task.tier_access.join(", ")
                          : "All paid tiers"}
                      </Badge>
                      {flaggedPlaceholder ? (
                        <Badge className="border border-rose-500/30 bg-rose-500/15 text-rose-200">
                          Needs restore
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {getTaskPreview(task)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewTask(task)}>
                      <Eye className="mr-1 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditDay(task);
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={task.is_active ? "destructive" : "outline"}
                      onClick={() => toggleDay(task)}
                    >
                      {task.is_active ? (
                        <PowerOff className="mr-1 h-4 w-4" />
                      ) : (
                        <Power className="mr-1 h-4 w-4" />
                      )}
                      {task.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleteLoadingId === task.id}
                      onClick={() => handleDeleteTask(task)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {deleteLoadingId === task.id ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-3">
            {programUsers.map((programUser) => (
              <div
                key={programUser.id}
                className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">
                      {programUser.profile?.full_name || programUser.user_email || "Unknown User"}
                    </p>
                    <Badge variant="outline">{programUser.profile?.plan || programUser.assigned_tier}</Badge>
                    <Badge variant="outline">Start {programUser.program_start_date}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Unlock override: {programUser.current_day_override || programUser.manual_unlock_until || "auto only"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleUnlockOverride(programUser)}>
                    <LockOpen className="mr-1 h-4 w-4" />
                    Override Day
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleResetUser(programUser)}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Reset Progress
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions">
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {submission.student_name || submission.created_by || "Unknown Student"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {submission.content || submission.reflection || "No content"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {String(submission.status || "submitted").replaceAll("_", " ")}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setSelectedSubmission(submission)}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
