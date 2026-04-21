import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  CheckCircle2,
  MicVocal,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { TASK_REMINDER_EVENT } from "@/lib/task-reminders";
import { completeUserProgram } from "@/lib/program-access";

const DIFFICULTY_CONFIG = [
  {
    key: "easy",
    label: "Easy",
    color: "border-[#22c55e]/35 bg-[#22c55e]/10 hover:bg-[#22c55e]/15",
    selectedColor: "border-[#22c55e] bg-[#22c55e]/15 ring-2 ring-[#22c55e]/30",
    badge: "bg-[#22c55e]/15 text-[#86efac] border border-[#22c55e]/25",
    defaultPts: 5,
  },
  {
    key: "medium",
    label: "Medium",
    color: "border-[#facc15]/35 bg-[#facc15]/10 hover:bg-[#facc15]/15",
    selectedColor: "border-[#facc15] bg-[#facc15]/15 ring-2 ring-[#facc15]/30",
    badge: "bg-[#facc15]/15 text-[#fde047] border border-[#facc15]/25",
    defaultPts: 10,
  },
  {
    key: "hard",
    label: "Hard",
    color: "border-[#fb923c]/35 bg-[#fb923c]/10 hover:bg-[#fb923c]/15",
    selectedColor: "border-[#fb923c] bg-[#fb923c]/15 ring-2 ring-[#fb923c]/30",
    badge: "bg-[#fb923c]/15 text-[#fdba74] border border-[#fb923c]/25",
    defaultPts: 20,
  },
];

const REFLECTION_STEPS = [
  {
    id: "clarity",
    prompt: "How did today's step feel?",
    options: [
      { value: "clear", label: "Clear and manageable" },
      { value: "stretch", label: "A good stretch" },
      { value: "heavy", label: "Heavier than expected" },
    ],
  },
  {
    id: "insight",
    prompt: "What mattered most in this task?",
    options: [
      { value: "awareness", label: "It gave me awareness" },
      { value: "discipline", label: "It pushed discipline" },
      { value: "relief", label: "It reduced money stress" },
    ],
  },
];

function buildStructuredContent(form, task) {
  const chunks = [];

  if (form.journal_entry?.trim()) {
    chunks.push(`Journal:\n${form.journal_entry.trim()}`);
  }

  [
    [task.question_1, form.question_1_answer],
    [task.question_2, form.question_2_answer],
    [task.question_3, form.question_3_answer],
  ].forEach(([question, answer]) => {
    if (question && answer?.trim()) {
      chunks.push(`${question}\n${answer.trim()}`);
    }
  });

  return chunks.join("\n\n").trim();
}

function ProofSection({ task, form, setForm, onSubmit, onSaveDraft, submitting, savingDraft, submitLabel }) {
  const proof = task.proof_required || "none";
  const detailed = task.require_detailed_answer;
  const hasGuidedQuestions =
    task.program_family === "reset_30" ||
    task.journal_placeholder ||
    task.question_1 ||
    task.question_2 ||
    task.question_3;

  const canSubmit = () => {
    const guidedContent = buildStructuredContent(form, task);

    if (proof === "none") {
      if (!hasGuidedQuestions) return true;
      return guidedContent.length > 0;
    }

    if (proof === "text_answer") return form.content?.trim().length > 0;
    if (proof === "amount_input") return form.amount !== "" && form.amount != null;
    if (proof === "screenshot_upload") {
      return !!form.file || !!form.existing_file_url;
    }
    return false;
  };

  const inputClass =
    "border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]";
  const subtleLabel = "text-[11px] font-medium tracking-wide text-white/75";

  return (
    <div className="space-y-4">
      {hasGuidedQuestions ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white">Journal</Label>
            <Textarea
              className={inputClass}
              rows={4}
              placeholder={task.journal_placeholder || "Write your thoughts here..."}
              value={form.journal_entry || ""}
              onChange={(e) => setForm((current) => ({ ...current, journal_entry: e.target.value }))}
            />
          </div>

          {[task.question_1, task.question_2, task.question_3].map((question, index) =>
            question ? (
              <div className="space-y-2" key={`${task.id}-question-${index + 1}`}>
                <Label className="text-sm font-semibold text-white">{question}</Label>
                <Textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Write your answer..."
                  value={form[`question_${index + 1}_answer`] || ""}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      [`question_${index + 1}_answer`]: e.target.value,
                    }))
                  }
                />
              </div>
            ) : null
          )}
        </div>
      ) : null}

      {proof === "none" && !hasGuidedQuestions ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm text-white/70">
          <p className="mb-1 font-semibold text-white">Honor-based task</p>
          <p>Complete it honestly, then mark it done.</p>
        </div>
      ) : null}

      {proof === "text_answer" ? (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-white">
            {detailed
              ? "Please explain clearly how you completed this task."
              : "How did you complete this task?"}
          </Label>
          <Textarea
            className={inputClass}
            rows={detailed ? 5 : 3}
            placeholder={
              detailed
                ? "Be specific: what did you do, what was hard, and what changed?"
                : "Write what you did today..."
            }
            value={form.content || ""}
            onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
          />
        </div>
      ) : null}

      {proof === "amount_input" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white">Amount (PHP)</Label>
            <Input
              className={inputClass}
              type="number"
              min={0}
              placeholder="e.g. 150"
              value={form.amount || ""}
              onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className={subtleLabel}>Notes (optional)</Label>
            <Textarea
              className={inputClass}
              rows={2}
              placeholder="Any context about this amount..."
              value={form.content || ""}
              onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
            />
          </div>
        </div>
      ) : null}

      {proof === "screenshot_upload" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white">Upload screenshot or photo</Label>
            <Input
              className={inputClass}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (!selectedFile) return;

                const previewUrl = URL.createObjectURL(selectedFile);
                setForm((current) => {
                  if (current.preview_url && current.preview_url.startsWith("blob:")) {
                    URL.revokeObjectURL(current.preview_url);
                  }

                  return {
                    ...current,
                    file: selectedFile,
                    preview_url: previewUrl,
                  };
                });
              }}
            />

            {form.file ? <p className="text-xs text-[#86efac]">New file ready</p> : null}
          </div>

          {(form.preview_url || form.existing_file_url) ? (
            <div className="space-y-2">
              <Label className={subtleLabel}>Preview</Label>
              <img
                src={form.preview_url || form.existing_file_url}
                alt="proof preview"
                className="w-full max-h-56 rounded-xl border border-white/10 object-contain bg-black/20"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
          disabled={savingDraft || submitting}
          onClick={onSaveDraft}
        >
          {savingDraft ? "Saving..." : "Save draft"}
        </Button>
        <Button
          className="w-full bg-[#22c55e] text-white shadow-[0_10px_30px_rgba(34,197,94,0.25)] hover:bg-[#16a34a]"
          disabled={!canSubmit() || submitting}
          onClick={onSubmit}
        >
          {submitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function ReflectionFlow({ task, answers, currentStep, onSelect, note, onNoteChange, onFinish, saving }) {
  const step = REFLECTION_STEPS[currentStep];
  const isLastQuestion = currentStep >= REFLECTION_STEPS.length;
  const finalPrompt = task.reflection_prompt || "What do you want to remember from this day?";
  const progress = Math.round(((currentStep + 1) / (REFLECTION_STEPS.length + 1)) * 100);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86efac]">
          Guided reflection
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-300 transition-all duration-300"
            style={{ width: `${Math.max(progress, 12)}%` }}
          />
        </div>
      </div>

      {!isLastQuestion && step ? (
        <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-lg font-semibold leading-tight text-white">{step.prompt}</p>
          <div className="space-y-3">
            {step.options.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => onSelect(step.id, option.value, option.label)}
                className={cn(
                  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-emerald-300/25 hover:bg-emerald-400/10",
                  answers[step.id]?.value === option.value &&
                    "border-emerald-300/30 bg-emerald-400/10 text-white"
                )}
              >
                <span className="text-sm font-medium text-white">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-lg font-semibold text-white">{finalPrompt}</p>
          <Textarea
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
            rows={4}
            placeholder="Write your reflection..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
          <Button className="w-full" disabled={saving} onClick={onFinish}>
            {saving ? "Saving reflection..." : "Finish day"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ChallengeModal({
  task,
  nextTask = null,
  onClose,
  onSubmitted,
  user,
  profile,
  programRecord,
  existingSubmission = null,
}) {
  const [difficulty, setDifficulty] = useState(null);
  const [phase, setPhase] = useState("overview");
  const [form, setForm] = useState({
    content: "",
    amount: "",
    file: null,
    preview_url: "",
    existing_file_url: "",
    journal_entry: "",
    question_1_answer: "",
    question_2_answer: "",
    question_3_answer: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [reflectionAnswers, setReflectionAnswers] = useState({});
  const [reflectionStep, setReflectionStep] = useState(0);
  const [reflectionNote, setReflectionNote] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);

  const submissionStatus = existingSubmission?.status || null;
  const isNeedsRevision = submissionStatus === "needs_revision";
  const isApproved = submissionStatus === "approved";
  const isSubmitted = submissionStatus === "submitted" || submissionStatus === "pending";
  const diffMode = !!task?.difficulty_mode_enabled;

  useEffect(() => {
    setDifficulty(null);
    setPhase(isNeedsRevision ? "proof" : "overview");
    setSubmittedRecord(null);
    setReflectionAnswers({});
    setReflectionStep(0);
    setReflectionNote(existingSubmission?.reflection || "");

    setForm((current) => {
      if (current.preview_url && current.preview_url.startsWith("blob:")) {
        URL.revokeObjectURL(current.preview_url);
      }

      return {
        content: existingSubmission?.content || "",
        amount: "",
        file: null,
        preview_url: "",
        existing_file_url:
          existingSubmission?.file_url ||
          existingSubmission?.proof_url ||
          existingSubmission?.image_url ||
          "",
        journal_entry: existingSubmission?.journal_entry || "",
        question_1_answer: existingSubmission?.question_1_answer || "",
        question_2_answer: existingSubmission?.question_2_answer || "",
        question_3_answer: existingSubmission?.question_3_answer || "",
      };
    });

    setSubmitting(false);
    setSavingReflection(false);
  }, [existingSubmission, isNeedsRevision, task?.id]);

  useEffect(() => {
    return () => {
      if (form.preview_url && form.preview_url.startsWith("blob:")) {
        URL.revokeObjectURL(form.preview_url);
      }
    };
  }, [form.preview_url]);

  const content = useMemo(() => {
    if (!task) return null;

    if (!diffMode) {
      return {
        action: task.task_instruction || task.main_action_instruction,
        why: task.why_this_matters || task.main_why_it_matters,
        guidance: task.main_optional_guidance,
        points: Number(task.main_points || task.points || 0),
      };
    }

    if (!difficulty) return null;

    return {
      action: task[`${difficulty}_action_instruction`],
      why: task[`${difficulty}_why_it_matters`],
      guidance: task[`${difficulty}_optional_guidance`],
      points: Number(
        task[`${difficulty}_points`] ||
          DIFFICULTY_CONFIG.find((item) => item.key === difficulty)?.defaultPts ||
          0
      ),
    };
  }, [diffMode, difficulty, task]);

  if (!task) return null;

  const uploadProofFile = async () => {
    if (!form.file) return form.existing_file_url || null;

    const safeEmail = (user?.email || "user").replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeName = (form.file?.name || "proof").replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `task-proofs/${safeEmail}/${task.id}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("task-proofs")
      .upload(filePath, form.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: form.file.type || "application/octet-stream",
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("task-proofs").getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      let uploadedFileUrl = null;
      if ((task.proof_required || "none") === "screenshot_upload") {
        uploadedFileUrl = await uploadProofFile();
      }

      const structuredContent = buildStructuredContent(form, task);
      const submissionContent = form.amount
        ? `Amount: PHP${form.amount}${form.content ? `\n${form.content}` : ""}`
        : structuredContent || form.content || "Completed (honor system)";

      const payload = {
        task_id: task.id,
        user_id: user?.id || null,
        created_by: user?.email || null,
        student_name: user?.full_name?.trim() || user?.name || user?.email || "Student",
        content: submissionContent,
        journal_entry: form.journal_entry || null,
        question_1_answer: form.question_1_answer || null,
        question_2_answer: form.question_2_answer || null,
        question_3_answer: form.question_3_answer || null,
        file_url: uploadedFileUrl,
        status: "submitted",
        points_earned: Number(content?.points || 0),
        admin_notes: null,
      };

      let result;

      if (existingSubmission?.id) {
        const { data, error } = await supabase
          .from("task_submissions")
          .update(payload)
          .eq("id", existingSubmission.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("task_submissions")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setSubmittedRecord(result);
      setPhase("reflection");
      toast.success(isNeedsRevision ? "Revision submitted" : "Day completed");
      window.dispatchEvent(
        new CustomEvent(TASK_REMINDER_EVENT, {
          detail: {
            taskId: task?.id,
            day: task?.day || task?.day_number || null,
          },
        })
      );
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error(error.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = async () => {
    try {
      setSavingDraft(true);
      const structuredContent = buildStructuredContent(form, task);
      const payload = {
        task_id: task.id,
        user_id: user?.id || null,
        created_by: user?.email || null,
        student_name: user?.full_name?.trim() || user?.name || user?.email || "Student",
        content: structuredContent || form.content || null,
        journal_entry: form.journal_entry || null,
        question_1_answer: form.question_1_answer || null,
        question_2_answer: form.question_2_answer || null,
        question_3_answer: form.question_3_answer || null,
        status: "draft",
        admin_notes: null,
      };

      if (existingSubmission?.id) {
        const { error } = await supabase
          .from("task_submissions")
          .update(payload)
          .eq("id", existingSubmission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("task_submissions").insert([payload]);
        if (error) throw error;
      }

      toast.success("Draft saved");
      await onSubmitted?.();
    } catch (error) {
      console.error("Draft save failed:", error);
      toast.error(error.message || "Could not save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleReflectionSelect = (questionId, value, label) => {
    setReflectionAnswers((current) => ({
      ...current,
      [questionId]: { value, label },
    }));
    setReflectionStep((current) => current + 1);
  };

  const handleFinishReflection = async () => {
    try {
      setSavingReflection(true);

      const reflectionText = [
        ...REFLECTION_STEPS.map((step) =>
          reflectionAnswers[step.id]?.label ? `${step.prompt}: ${reflectionAnswers[step.id].label}` : null
        ).filter(Boolean),
        reflectionNote ? `${task.reflection_prompt || "Reflection"}: ${reflectionNote.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      if (submittedRecord?.id) {
        const { error } = await supabase
          .from("task_submissions")
          .update({
            reflection: reflectionText || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", submittedRecord.id);

        if (error) throw error;
      }

      if (Number(task?.day || task?.day_number || 0) >= 30) {
        await completeUserProgram({
          supabase,
          userId: user?.id,
          profile: profile || user?.profile || user,
          programRecord,
        });
      }

      await onSubmitted?.();
      setPhase("success");
    } catch (error) {
      console.error("Reflection flow failed:", error);
      toast.error("We saved the task, but the reflection could not be stored.");
      await onSubmitted?.();
      setPhase("success");
    } finally {
      setSavingReflection(false);
    }
  };

  const proofLabel =
    {
      none: "Guided completion",
      text_answer: "Short written answer",
      amount_input: "Amount entry",
      screenshot_upload: "Screenshot upload",
    }[task.proof_required || "none"];

  const submitLabel = isNeedsRevision
    ? "Resubmit day"
    : task.completion_button_text || "Mark complete";

  return (
    <Dialog open={!!task} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#071018]/95 p-0 text-white shadow-[0_20px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_56%,#0ea5e9_100%)] px-6 pb-5 pt-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
            Day {task.day}
            {task.theme ? ` • ${task.theme}` : ""}
          </p>
          <h2 className="break-words text-2xl font-semibold leading-tight text-white">{task.title}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
              {task.estimated_minutes || 10} min
            </span>
            {task.milestone_type ? (
              <span className="rounded-full border border-amber-300/25 bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-100">
                {task.milestone_type}
              </span>
            ) : null}
            {task.interview_candidate_task ? (
              <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-xs text-white">
                <MicVocal className="h-3 w-3" /> Integrity mode
              </span>
            ) : null}
          </div>
        </div>

        <div className="max-h-[74vh] space-y-6 overflow-y-auto bg-[#0b1420] px-5 py-5">
          {isApproved && phase === "overview" ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
              This day is already complete. You can review the content anytime.
            </div>
          ) : null}

          {isSubmitted && !isNeedsRevision && phase === "overview" ? (
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-50">
              Your submission is already under review.
            </div>
          ) : null}

          {phase === "overview" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Description</p>
                <p className="mt-2 text-sm leading-7 text-white/72">{task.description}</p>
              </div>

              {diffMode ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">Choose your level for today</p>
                  {DIFFICULTY_CONFIG.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDifficulty(item.key)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all duration-200",
                        difficulty === item.key ? item.selectedColor : item.color
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-white">{item.label}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", item.badge)}>
                          {task[`${item.key}_points`] || item.defaultPts} pts
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 text-white/70">
                        {task[`${item.key}_action_instruction`] || "No description"}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}

              {(!diffMode || difficulty) && content && !isApproved && !isSubmitted ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#86efac]">Today's instruction</p>
                    <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-7 text-white">
                      {content.action}
                    </p>
                  </div>

                  {content.why ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Why this matters</p>
                      <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-7 text-white/80">
                        {content.why}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
                    <span className="font-semibold text-white/60">Completion flow</span>
                    <span className="font-bold text-white">{proofLabel}</span>
                  </div>

                  <Button size="lg" className="w-full" onClick={() => setPhase("proof")}>
                    <Zap className="mr-2 h-4 w-4" />
                    {isNeedsRevision ? "Revise now" : "Start day"}
                  </Button>
                </>
              ) : null}

              {(isApproved || (isSubmitted && !isNeedsRevision)) ? (
                <Button variant="outline" className="w-full" onClick={onClose}>
                  Close
                </Button>
              ) : null}
            </div>
          ) : null}

          {phase === "proof" && content && !isApproved && !isSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#86efac]">Complete today's work</p>
                <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-7 text-white">
                  {content.action}
                </p>
              </div>

              <ProofSection
                task={task}
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                onSaveDraft={saveDraft}
                submitting={submitting}
                savingDraft={savingDraft}
                submitLabel={submitLabel}
              />
            </div>
          ) : null}

          {phase === "reflection" ? (
            <ReflectionFlow
              task={task}
              answers={reflectionAnswers}
              currentStep={reflectionStep}
              note={reflectionNote}
              onNoteChange={setReflectionNote}
              onSelect={handleReflectionSelect}
              onFinish={handleFinishReflection}
              saving={savingReflection}
            />
          ) : null}

          {phase === "success" ? (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200">
                  {task.milestone_type ? <Trophy className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75">Day complete</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {task.reward_title || `Day ${task.day} Complete`}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {task.reward_message || "You moved your journey forward today."}
                </p>
              </div>

              {nextTask ? (
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Next day</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Day {nextTask.day}: {nextTask.title}
                  </h4>
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    {nextTask.short_label || nextTask.description}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" onClick={async () => { await onSubmitted?.(); onClose?.(); }}>
                  Back to program
                </Button>
                <Button variant="outline" className="flex-1" onClick={async () => { await onSubmitted?.(); onClose?.(); }}>
                  Keep exploring
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
