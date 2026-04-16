import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIER_OPTIONS = ["entry", "core", "coaching"];

export const PROGRAM_DAY_BLANK = {
  title: "",
  short_label: "",
  theme: "",
  description: "",
  why_this_matters: "",
  task_instruction: "",
  reflection_prompt: "",
  journal_placeholder: "",
  question_1: "",
  question_2: "",
  question_3: "",
  completion_button_text: "Mark Complete",
  milestone_type: "",
  reward_title: "",
  reward_message: "",
  estimated_minutes: 10,
  tier_access: ["entry", "core", "coaching"],
  is_active: true,
  sort_order: 1,
  day: 1,
};

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function ProgramDayFormModal({
  open,
  onClose,
  initialValue,
  onSave,
}) {
  const [form, setForm] = useState({ ...PROGRAM_DAY_BLANK, ...(initialValue || {}) });

  useEffect(() => {
    if (open) {
      setForm({ ...PROGRAM_DAY_BLANK, ...(initialValue || {}) });
    }
  }, [initialValue, open]);

  const toggleTier = (tier) => {
    setForm((current) => {
      const exists = current.tier_access.includes(tier);
      return {
        ...current,
        tier_access: exists
          ? current.tier_access.filter((item) => item !== tier)
          : [...current.tier_access, tier],
      };
    });
  };

  const handleSave = () => {
    onSave({
      ...form,
      day: Number(form.day || 1),
      sort_order: Number(form.sort_order || form.day || 1),
      estimated_minutes: Number(form.estimated_minutes || 10),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[30px] border border-white/10 bg-[#071018]/95 text-white">
        <DialogHeader>
          <DialogTitle>{initialValue?.id ? `Edit Day ${initialValue.day}` : "Create Program Day"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Day">
              <Input
                value={form.day}
                type="number"
                min={1}
                max={30}
                onChange={(e) => setForm((current) => ({ ...current, day: e.target.value }))}
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>

            <Field label="Sort Order">
              <Input
                value={form.sort_order}
                type="number"
                min={1}
                onChange={(e) => setForm((current) => ({ ...current, sort_order: e.target.value }))}
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>

            <Field label="Estimated Minutes">
              <Input
                value={form.estimated_minutes}
                type="number"
                min={1}
                onChange={(e) =>
                  setForm((current) => ({ ...current, estimated_minutes: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>

            <Field label="Short Label">
              <Input
                value={form.short_label}
                onChange={(e) => setForm((current) => ({ ...current, short_label: e.target.value }))}
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Theme">
              <Input
                value={form.theme}
                onChange={(e) => setForm((current) => ({ ...current, theme: e.target.value }))}
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>

            <Field label="Milestone Type">
              <Select
                value={form.milestone_type || "none"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    milestone_type: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="checkpoint">Checkpoint</SelectItem>
                  <SelectItem value="midpoint">Midpoint</SelectItem>
                  <SelectItem value="graduation">Graduation</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              className="border-white/10 bg-white/5 text-white"
            />
          </Field>

          <Field label="Why This Matters">
            <Textarea
              rows={3}
              value={form.why_this_matters}
              onChange={(e) =>
                setForm((current) => ({ ...current, why_this_matters: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white"
            />
          </Field>

          <Field label="Task Instruction">
            <Textarea
              rows={3}
              value={form.task_instruction}
              onChange={(e) =>
                setForm((current) => ({ ...current, task_instruction: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white"
            />
          </Field>

          <Field label="Reflection Prompt">
            <Textarea
              rows={2}
              value={form.reflection_prompt}
              onChange={(e) =>
                setForm((current) => ({ ...current, reflection_prompt: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white"
            />
          </Field>

          <Field label="Journal Placeholder">
            <Textarea
              rows={2}
              value={form.journal_placeholder}
              onChange={(e) =>
                setForm((current) => ({ ...current, journal_placeholder: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((number) => (
              <Field label={`Question ${number}`} key={`question-${number}`}>
                <Textarea
                  rows={3}
                  value={form[`question_${number}`]}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      [`question_${number}`]: e.target.value,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                />
              </Field>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Completion Button Text">
              <Input
                value={form.completion_button_text}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    completion_button_text: e.target.value,
                  }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>

            <Field label="Reward Title">
              <Input
                value={form.reward_title}
                onChange={(e) =>
                  setForm((current) => ({ ...current, reward_title: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </Field>
          </div>

          <Field label="Reward Message">
            <Textarea
              rows={2}
              value={form.reward_message}
              onChange={(e) =>
                setForm((current) => ({ ...current, reward_message: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white"
            />
          </Field>

          <div className="space-y-3">
            <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
              Tier Access
            </Label>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map((tier) => {
                const active = form.tier_access.includes(tier);
                return (
                  <button
                    type="button"
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    className={`rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] ${
                      active
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-white/65"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Active day</p>
              <p className="text-xs text-white/60">Inactive days stay hidden from the live program.</p>
            </div>
            <Switch
              checked={!!form.is_active}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
            />
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSave}>
              Save Day
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
