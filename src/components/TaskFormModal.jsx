import { useState, useEffect } from "react";
import { Trash2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BLANK = {
  title: "",
  week: 1,
  day: 1,
  is_active: true,
  difficulty_mode_enabled: false,

  main_action_instruction: "",
  main_why_it_matters: "",
  main_optional_guidance: "",
  main_points: 10,

  easy_action_instruction: "",
  easy_why_it_matters: "",
  easy_optional_guidance: "",
  easy_points: 5,

  medium_action_instruction: "",
  medium_why_it_matters: "",
  medium_optional_guidance: "",
  medium_points: 10,

  hard_action_instruction: "",
  hard_why_it_matters: "",
  hard_optional_guidance: "",
  hard_points: 20,

  proof_required: "none",
  require_detailed_answer: false,
  interview_candidate_task: false,
};

export { BLANK as TASK_BLANK };

function SectionCard({ title, subtitle, children, accent }) {
  const accents = {
    green: "border-l-[#22c55e]",
    yellow: "border-l-[#facc15]",
    blue: "border-l-[#38bdf8]",
    orange: "border-l-[#fb923c]",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 border-l-4 bg-white/[0.04] p-4 space-y-3 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
        accents[accent] || "border-l-white/20"
      )}
    >
      <div>
        <p className="font-heading font-semibold text-sm text-white">{title}</p>
        {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, required = false, className = "" }) {
  return (
    <Label className={cn("text-[11px] font-medium tracking-wide text-white/80", className)}>
      {children} {required && <span className="text-[#facc15]">*</span>}
    </Label>
  );
}

function DifficultyBlock({ label, form, setForm, defaultPoints }) {
  const prefix = label.toLowerCase();

  const styles = {
    Easy: {
      wrap: "border-[#22c55e]/30 bg-[#22c55e]/10",
      badge: "bg-[#22c55e]/15 text-[#86efac] border border-[#22c55e]/25",
    },
    Medium: {
      wrap: "border-[#facc15]/30 bg-[#facc15]/10",
      badge: "bg-[#facc15]/15 text-[#fde047] border border-[#facc15]/25",
    },
    Hard: {
      wrap: "border-[#fb923c]/30 bg-[#fb923c]/10",
      badge: "bg-[#fb923c]/15 text-[#fdba74] border border-[#fb923c]/25",
    },
  };

  return (
    <div className={cn("rounded-2xl border p-4 space-y-3", styles[label]?.wrap)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-heading font-bold text-xs uppercase tracking-[0.14em] text-white">
          {label}
        </p>
        <span
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-full font-semibold",
            styles[label]?.badge
          )}
        >
          {form[`${prefix}_points`] || defaultPoints} pts
        </span>
      </div>

      <div className="space-y-1.5">
        <FieldLabel required>Action Instruction</FieldLabel>
        <Textarea
          rows={3}
          placeholder={`What the student must do (${label} level)`}
          value={form[`${prefix}_action_instruction`] || ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              [`${prefix}_action_instruction`]: e.target.value,
            }))
          }
          className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Why It Matters</FieldLabel>
        <Textarea
          rows={2}
          placeholder="Purpose behind this action"
          value={form[`${prefix}_why_it_matters`] || ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              [`${prefix}_why_it_matters`]: e.target.value,
            }))
          }
          className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Guidance / Example</FieldLabel>
        <Textarea
          rows={2}
          placeholder="Optional tip or example"
          value={form[`${prefix}_optional_guidance`] || ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              [`${prefix}_optional_guidance`]: e.target.value,
            }))
          }
          className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Points</FieldLabel>
        <Input
          type="number"
          min={0}
          value={form[`${prefix}_points`] ?? defaultPoints}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              [`${prefix}_points`]: parseInt(e.target.value, 10) || 0,
            }))
          }
          className="w-28 border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
        />
      </div>
    </div>
  );
}

export default function TaskFormModal({
  open,
  onClose,
  editId,
  initialForm,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({ ...BLANK, ...(initialForm || {}) });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ ...BLANK, ...(initialForm || {}) });
      setErrors({});
    }
  }, [initialForm, open, editId]);

  const validate = () => {
    const e = {};

    if (!form.title?.trim()) e.title = "Title is required";
    if (!form.week) e.week = "Week is required";
    if (!form.day) e.day = "Day is required";

    if (!form.difficulty_mode_enabled && !form.main_action_instruction?.trim()) {
      e.main_action = "Action instruction is required";
    }

    if (form.difficulty_mode_enabled) {
      if (!form.easy_action_instruction?.trim()) e.easy = "Easy action required";
      if (!form.medium_action_instruction?.trim()) e.medium = "Medium action required";
      if (!form.hard_action_instruction?.trim()) e.hard = "Hard action required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data = {
      ...form,
      week: parseInt(form.week, 10),
      day: parseInt(form.day, 10),
      main_points: parseInt(form.main_points, 10) || 0,
      easy_points: parseInt(form.easy_points, 10) || 5,
      medium_points: parseInt(form.medium_points, 10) || 10,
      hard_points: parseInt(form.hard_points, 10) || 20,
      points: form.difficulty_mode_enabled
        ? parseInt(form.hard_points, 10) || 20
        : parseInt(form.main_points, 10) || 0,
    };

    onSave(data);
  };

  const handleDuplicate = () => {
    onSave({ ...form, title: `${form.title} (copy)` }, true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 bg-[#071018]/95 text-white backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.65)] rounded-3xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="font-heading text-xl text-white">
            {editId ? "Edit Task" : "Create Task"}
          </DialogTitle>
          <p className="text-sm text-white/55">
            Build a task that feels clean, clear, and aligned with the CLARA flow.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2 pb-2">
          <SectionCard
            title="Basic Info"
            subtitle="Identify where this task appears in the 30-day flow"
            accent="green"
          >
            <div className="space-y-1.5">
              <FieldLabel required>Title</FieldLabel>
              <Input
                value={form.title || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g. Skip one daily unnecessary purchase"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
              />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel required>Week</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={form.week || 1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, week: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                />
                <p className="text-[10px] text-white/45">
                  Weekly group this task belongs to
                </p>
                {errors.week && <p className="text-xs text-red-400">{errors.week}</p>}
              </div>

              <div className="space-y-1.5">
                <FieldLabel required>Day</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.day || 1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, day: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                />
                <p className="text-[10px] text-white/45">
                  Day in the 30-day challenge flow
                </p>
                {errors.day && <p className="text-xs text-red-400">{errors.day}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Switch
                checked={!!form.is_active}
                onCheckedChange={(value) =>
                  setForm((prev) => ({ ...prev, is_active: value }))
                }
              />
              <div>
                <FieldLabel className="text-white">Active</FieldLabel>
                <p className="text-[10px] text-white/50">
                  Students can see and submit this task
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Task Setup"
            subtitle="Define what students need to do"
            accent="yellow"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
              <Switch
                checked={!!form.difficulty_mode_enabled}
                onCheckedChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    difficulty_mode_enabled: value,
                  }))
                }
              />
              <div>
                <FieldLabel className="text-white">Enable Difficulty Mode</FieldLabel>
                <p className="text-[10px] text-white/50">
                  Students choose Easy / Medium / Hard for the same task
                </p>
              </div>
            </div>

            {!form.difficulty_mode_enabled ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <FieldLabel required>Main Action Instruction</FieldLabel>
                  <Textarea
                    rows={4}
                    placeholder="Describe exactly what the student must do today"
                    value={form.main_action_instruction || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        main_action_instruction: e.target.value,
                      }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                  />
                  {errors.main_action && (
                    <p className="text-xs text-red-400 mt-1">{errors.main_action}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Why It Matters</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Explain the purpose behind this action"
                    value={form.main_why_it_matters || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        main_why_it_matters: e.target.value,
                      }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Guidance / Example</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Optional tip, story, or example"
                    value={form.main_optional_guidance || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        main_optional_guidance: e.target.value,
                      }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>Points</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={form.main_points ?? 10}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        main_points: e.target.value,
                      }))
                    }
                    className="w-28 border-white/10 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/75 bg-[#facc15]/10 border border-[#facc15]/20 rounded-xl px-3 py-2.5">
                  Students choose <strong>one difficulty</strong> per day. These are not
                  separate days — they are options within the same task.
                </p>

                <DifficultyBlock
                  label="Easy"
                  form={form}
                  setForm={setForm}
                  defaultPoints={5}
                />
                {errors.easy && <p className="text-xs text-red-400">{errors.easy}</p>}

                <DifficultyBlock
                  label="Medium"
                  form={form}
                  setForm={setForm}
                  defaultPoints={10}
                />
                {errors.medium && <p className="text-xs text-red-400">{errors.medium}</p>}

                <DifficultyBlock
                  label="Hard"
                  form={form}
                  setForm={setForm}
                  defaultPoints={20}
                />
                {errors.hard && <p className="text-xs text-red-400">{errors.hard}</p>}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Proof & Accountability"
            subtitle="Define how students demonstrate task completion"
            accent="blue"
          >
            <div className="space-y-1.5">
              <FieldLabel>Proof Required</FieldLabel>
              <Select
                value={form.proof_required || "none"}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, proof_required: value }))
                }
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white focus:ring-1 focus:ring-[#22c55e]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0b1522] text-white">
                  <SelectItem value="none">None — Honor system</SelectItem>
                  <SelectItem value="text_answer">Text Answer</SelectItem>
                  <SelectItem value="amount_input">Amount Input (₱)</SelectItem>
                  <SelectItem value="screenshot_upload">Screenshot Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
              <Switch
                checked={!!form.require_detailed_answer}
                onCheckedChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    require_detailed_answer: value,
                  }))
                }
              />
              <div>
                <FieldLabel className="text-white">Require Detailed Answer</FieldLabel>
                <p className="text-[10px] text-white/50">
                  Students must provide a longer written explanation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
              <Switch
                checked={!!form.interview_candidate_task}
                onCheckedChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    interview_candidate_task: value,
                  }))
                }
              />
              <div>
                <FieldLabel className="text-white">Interview Candidate Task</FieldLabel>
                <p className="text-[10px] text-white/50">
                  This task may be selected for random accountability interviews during
                  weekly support sessions. Supports CLARA&apos;s Integrity Mode.
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={handleSave}
              className="flex-1 min-w-[140px] bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-[0_10px_30px_rgba(34,197,94,0.25)]"
            >
              {editId ? "Update Task" : "Create Task"}
            </Button>

            {editId && (
              <Button
                variant="outline"
                onClick={handleDuplicate}
                className="gap-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>

            {editId && (
              <Button
                variant="outline"
                onClick={() => onDelete(editId)}
                className="border-red-400/30 bg-red-500/5 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
