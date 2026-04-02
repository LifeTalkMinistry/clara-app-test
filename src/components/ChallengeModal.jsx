import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicVocal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

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

function ProofSection({ task, form, setForm, onSubmit, submitting }) {
  const proof = task.proof_required || "none";
  const detailed = task.require_detailed_answer;

  const canSubmit = () => {
    if (proof === "none") return true;
    if (proof === "text_answer") return form.content?.trim().length > 0;
    if (proof === "amount_input") return form.amount !== "" && form.amount != null;
    if (proof === "screenshot_upload") return !!form.file_url;
    return false;
  };

  const inputClass =
    "border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]";
  const subtleLabel = "text-[11px] font-medium tracking-wide text-white/75";

  return (
    <div className="space-y-4">
      {proof === "none" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm text-white/70">
          <p className="mb-1 font-semibold text-white">🤝 Honor-Based Task</p>
          <p>This task runs on the honor system. Complete it honestly and mark it done.</p>
        </div>
      )}

      {proof === "text_answer" && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-white">
            {detailed
              ? "Please explain clearly how you completed this challenge."
              : "How did you complete this challenge?"}
          </Label>
          <Textarea
            className={inputClass}
            rows={detailed ? 5 : 3}
            placeholder={
              detailed
                ? "Be specific — what did you do, what was hard, what did you learn?"
                : "Write what you did today…"
            }
            value={form.content || ""}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
        </div>
      )}

      {proof === "amount_input" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white">Amount (₱)</Label>
            <Input
              className={inputClass}
              type="number"
              min={0}
              placeholder="e.g. 150"
              value={form.amount || ""}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className={subtleLabel}>Notes (optional)</Label>
            <Textarea
              className={inputClass}
              rows={2}
              placeholder="Any context about this amount…"
              value={form.content || ""}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
        </div>
      )}

      {proof === "screenshot_upload" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white">Upload Screenshot / Photo</Label>
            <Input
              className={inputClass}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setForm((f) => ({
                  ...f,
                  file_url: URL.createObjectURL(file),
                  file_name: file.name,
                  file_type: file.type,
                }));

                toast.success(`Selected: ${file.name}`);
              }}
            />
            {form.file_url && <p className="mt-1 text-xs text-[#86efac]">✓ File ready</p>}
          </div>
          <div className="space-y-2">
            <Label className={subtleLabel}>Additional notes (optional)</Label>
            <Textarea
              className={inputClass}
              rows={2}
              placeholder="Anything you want to add…"
              value={form.content || ""}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
        </div>
      )}

      <Button
        className="w-full bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_10px_30px_rgba(34,197,94,0.25)]"
        disabled={!canSubmit() || submitting}
        onClick={onSubmit}
      >
        {submitting ? "Submitting…" : proof === "none" ? "✅ Mark as Completed" : "Complete Challenge"}
      </Button>
    </div>
  );
}

export default function ChallengeModal({ task, onClose, onSubmitted, user }) {
  const [difficulty, setDifficulty] = useState(null);
  const [started, setStarted] = useState(false);
  const [form, setForm] = useState({
    content: "",
    file_url: "",
    file_name: "",
    file_type: "",
    amount: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDifficulty(null);
    setStarted(false);
    setForm({
      content: "",
      file_url: "",
      file_name: "",
      file_type: "",
      amount: "",
    });
    setSubmitting(false);
  }, [task?.id]);

  if (!task) return null;

  const diffMode = task.difficulty_mode_enabled;

  const resolveContent = () => {
    if (!diffMode) {
      return {
        action: task.main_action_instruction,
        why: task.main_why_it_matters,
        guidance: task.main_optional_guidance,
        points: task.main_points || task.points || 0,
      };
    }

    if (!difficulty) return null;

    return {
      action: task[`${difficulty}_action_instruction`],
      why: task[`${difficulty}_why_it_matters`],
      guidance: task[`${difficulty}_optional_guidance`],
      points:
        task[`${difficulty}_points`] ||
        DIFFICULTY_CONFIG.find((d) => d.key === difficulty)?.defaultPts ||
        0,
    };
  };

  const content = resolveContent();
  const readyToStart = !diffMode || !!difficulty;

  const handleSubmit = async () => {
    setSubmitting(true);

    const submissionContent = form.amount
      ? `Amount: ₱${form.amount}${form.content ? `\n${form.content}` : ""}`
      : form.content || "Completed (honor system)";

    try {
      const response = await apiFetch("/api/task-submission", {
        method: "POST",
        body: JSON.stringify({
          user_id: user?.id || user?.email || "guest-user",
          task_id: task.id,
          task_title: task.title,
          student_name: user?.full_name?.trim() || user?.name || user?.email || "",
          student_email: user?.email || "",
          difficulty_selected: difficulty || null,
          content: submissionContent,
          file_url: form.file_url || null,
          file_name: form.file_name || null,
          file_type: form.file_type || null,
          status: "submitted",
          points_earned: content?.points || 0,
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      onSubmitted?.(response.submission || response);
      toast.success("Challenge submitted!");
      onClose?.();
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const proofLabel =
    {
      none: "None (Honor-Based)",
      text_answer: "Text Answer",
      amount_input: "Amount Input (₱)",
      screenshot_upload: "Screenshot Upload",
    }[task.proof_required || "none"];

  return (
    <Dialog open={!!task} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-lg overflow-hidden border border-white/10 bg-[#071018]/95 p-0 text-white shadow-[0_20px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="bg-[linear-gradient(135deg,#15803d_0%,#0f766e_55%,#0ea5e9_100%)] px-6 pb-5 pt-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
            Week {task.week}
            {task.day ? ` · Day ${task.day}` : ""}
          </p>

          <h2 className="font-heading break-words text-xl font-bold leading-tight text-white">
            {task.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {diffMode ? (
              <>
                <span className="rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                  Choose Difficulty
                </span>
                <span className="text-xs text-white/75">
                  {task.easy_points || 5} – {task.hard_points || 20} pts
                </span>
              </>
            ) : (
              <span className="rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                {content?.points || 0} pts
              </span>
            )}

            {task.interview_candidate_task && (
              <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/15 px-2.5 py-1 text-xs text-white">
                <MicVocal className="h-3 w-3" /> Integrity Mode
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto bg-[#0b1420] px-5 py-5">
          {task.interview_candidate_task && (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-xs text-sky-100">
              <strong>📋 Note:</strong> You may be asked during coaching or your weekly
              session to share how you completed this challenge. This supports CLARA&apos;s
              Integrity Mode.
            </div>
          )}

          {diffMode && !started && (
            <div className="space-y-3">
              <p className="font-heading text-sm font-semibold text-white">
                Choose Your Difficulty
              </p>

              {DIFFICULTY_CONFIG.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDifficulty(d.key)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all duration-200",
                    difficulty === d.key ? d.selectedColor : d.color
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-heading text-sm font-bold text-white">
                      {d.label}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", d.badge)}>
                      {task[`${d.key}_points`] || d.defaultPts} pts
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs leading-5 text-white/70">
                    {task[`${d.key}_action_instruction`] || "No description"}
                  </p>
                </button>
              ))}
            </div>
          )}

          {readyToStart && !started && content && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                <div className="space-y-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#86efac]">
                    Your Challenge
                  </p>
                  <p className="whitespace-pre-line break-words text-[14px] leading-7 text-white">
                    {content.action}
                  </p>
                </div>

                {content.why && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Why This Matters
                    </p>
                    <p className="whitespace-pre-line break-words text-[14px] leading-7 text-white/80">
                      {content.why}
                    </p>
                  </div>
                )}

                {content.guidance && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Guidance
                    </p>
                    <p className="whitespace-pre-line break-words text-[14px] leading-7 text-white/80">
                      {content.guidance}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
                <span className="font-semibold text-white/60">Proof Required</span>
                <span className="font-bold text-white">{proofLabel}</span>
              </div>

              <Button
                className="w-full bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_10px_30px_rgba(34,197,94,0.25)]"
                size="lg"
                onClick={() => setStarted(true)}
              >
                <Zap className="mr-2 h-4 w-4" /> Start Now
              </Button>
            </div>
          )}

          {started && content && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                <p className="mb-2 text-xs font-semibold text-[#86efac]">Your Challenge</p>
                <p className="whitespace-pre-line break-words text-[14px] leading-7 text-white">
                  {content.action}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                <p className="mb-3 font-heading text-sm font-semibold text-white">
                  Complete Challenge
                </p>
                <ProofSection
                  task={task}
                  form={form}
                  setForm={setForm}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}