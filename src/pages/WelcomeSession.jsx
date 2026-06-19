import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import { COACHING_FOCUS_OPTIONS as SESSION_FOCUS_OPTIONS } from "@/lib/coaching-focus-options";
import { buildWelcomeSessionSlots } from "@/lib/welcome-session-schedule";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DESIRED_OUTCOME_OPTIONS = [
  { value: "clear_action", label: "Leave with one clear action" },
  { value: "adjust_plan", label: "Create or adjust a financial plan" },
  { value: "understand_pattern", label: "Understand a repeated money behavior" },
  { value: "make_decision", label: "Make a confident financial decision" },
  { value: "setup_feature", label: "Set up a CLARA feature correctly" },
  { value: "review_progress", label: "Review my progress and next step" },
  { value: "feel_control", label: "Feel more confident and in control" },
];

const EMOTION_OPTIONS = [
  { value: "calm", label: "Calm and in control" },
  { value: "motivated", label: "Motivated but unsure" },
  { value: "confused", label: "Confused" },
  { value: "pressured", label: "Pressured" },
  { value: "overwhelmed", label: "Overwhelmed" },
  { value: "discouraged", label: "Discouraged" },
  { value: "hopeful", label: "Hopeful and ready to improve" },
];

const APPROACH_OPTIONS = [
  {
    value: "gentle_supportive",
    label: "Gentle & Supportive",
    description: "Help me feel understood first. Guide me patiently without too much pressure.",
  },
  {
    value: "calm_honest",
    label: "Calm but Honest",
    description: "Be considerate, but clearly explain what I may be doing wrong and what needs to change.",
    recommended: true,
  },
  {
    value: "direct_firm",
    label: "Direct & Firm",
    description: "Be straightforward. Challenge my excuses or contradictions and hold me accountable.",
  },
  {
    value: "strong_accountability",
    label: "Strong Accountability",
    description: "Do not sugarcoat things. Push me firmly toward a clear decision and action while remaining respectful.",
  },
  {
    value: "adaptive",
    label: "Adapt During the Session",
    description: "Start by understanding me, then adjust between gentle and direct depending on what I need.",
  },
];

const DATA_CONSENT_OPTIONS = [
  {
    value: "allow",
    label: "Yes, review relevant CLARA information",
    description: "Budget status, recent spending, wallets, goals, debt records, and previous actions when relevant.",
  },
  {
    value: "answers_only",
    label: "No, use only my check-in answers",
    description: "Your coach will prepare using only what you provide in this check-in.",
  },
];

const CHECK_IN_STEPS = [
  {
    key: "focus",
    eyebrow: "Session focus",
    title: "What would you like to focus on?",
    helper: "Choose the concern that matters most for this session.",
    type: "choice",
    options: SESSION_FOCUS_OPTIONS,
  },
  {
    key: "situation",
    eyebrow: "Current situation",
    title: "What is happening right now?",
    helper: "Briefly explain what made you choose this topic today.",
    type: "textarea",
  },
  {
    key: "outcome",
    eyebrow: "Desired result",
    title: "What would make this session successful?",
    helper: "Choose the result you most want by the end of the call.",
    type: "choice",
    options: DESIRED_OUTCOME_OPTIONS,
  },
  {
    key: "emotion",
    eyebrow: "Money state",
    title: "How are you feeling about money right now?",
    helper: "This helps your coach understand how much pressure you are carrying.",
    type: "choice",
    options: EMOTION_OPTIONS,
  },
  {
    key: "approach",
    eyebrow: "Coaching approach",
    title: "How should your coach approach you?",
    helper: "Choose the tone and level of accountability that will help you respond best.",
    type: "choice",
    options: APPROACH_OPTIONS,
  },
  {
    key: "dataConsent",
    eyebrow: "Preparation permission",
    title: "May your coach review relevant CLARA information?",
    helper: "Only information connected to your session concern should be reviewed.",
    type: "choice",
    options: DATA_CONSENT_OPTIONS,
  },
];

const INITIAL_ANSWERS = {
  focus: "",
  situation: "",
  outcome: "",
  emotion: "",
  approach: "calm_honest",
  dataConsent: "allow",
};

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || "Not answered";
}

function SummaryChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2 text-cyan-100/65">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[8px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-1.5 text-[15px] font-black text-white">{value}</p>
    </div>
  );
}

function MonthlyCoachingIntro() {
  return (
    <div className="relative grid h-full gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
      <div>
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.22),rgba(124,58,237,0.48))] shadow-[0_14px_34px_rgba(76,29,149,0.30)]">
            <CalendarDays className="h-6 w-6 text-cyan-50" />
          </div>
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-white sm:text-[34px]">
              Monthly Coaching
            </h1>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-300/75 sm:text-[13px]">
              One personal 30-minute coaching session is included with every active membership month.
            </p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-[11px] font-semibold leading-relaxed text-slate-300/62 sm:text-[12px]">
          Choose an available date and time, then complete your private coaching check-in.
        </p>
      </div>

      <div>
        <div className="grid grid-cols-3 gap-2.5">
          <SummaryChip icon={Clock3} label="Duration" value="30 min" />
          <SummaryChip icon={Sparkles} label="Access" value="Monthly" />
          <SummaryChip icon={CalendarDays} label="Schedule" value="Mon–Sat" />
        </div>
        <p className="mt-2.5 text-center text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/50">
          10:00 AM–3:00 PM · Sunday off
        </p>
      </div>
    </div>
  );
}

function AvailabilityPanel({
  selectedDateLabel,
  selectedDateSlots,
  selectedSlotId,
  onSelectSlot,
  onReset,
  onContinue,
  hasCommittedAccess,
}) {
  const selectedSlot = selectedDateSlots.find((slot) => slot.id === selectedSlotId) || null;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-black leading-tight tracking-tight text-white sm:text-[30px]">
            {selectedDateLabel}
          </h1>
          <p className="mt-1 text-[11px] font-semibold text-slate-300/70 sm:text-[12px]">
            Choose your preferred 30-minute time for this month’s coaching session.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Back to Monthly Coaching overview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {selectedDateSlots.map((slot) => {
          const isAvailable = slot.status === "available";
          const isSelected = selectedSlotId === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!isAvailable || !hasCommittedAccess}
              onClick={() => onSelectSlot(slot.id)}
              className={`rounded-[18px] border px-3 py-3.5 text-left transition ${
                isSelected
                  ? "border-cyan-200/60 bg-cyan-200/[0.12] shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                  : isAvailable
                    ? "border-white/[0.09] bg-white/[0.045] hover:-translate-y-0.5 hover:border-cyan-100/30 hover:bg-white/[0.075] active:translate-y-0"
                    : "cursor-not-allowed border-white/[0.05] bg-black/[0.10] opacity-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Clock3
                  className={`h-4 w-4 ${
                    isAvailable ? "text-cyan-100/80" : "text-slate-500/60"
                  }`}
                />
                <span
                  className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] ${
                    isAvailable
                      ? "border-emerald-300/20 bg-emerald-300/[0.10] text-emerald-200"
                      : "border-rose-300/15 bg-rose-300/[0.08] text-rose-200/75"
                  }`}
                >
                  {isSelected ? "Selected" : isAvailable ? "Free" : "Occupied"}
                </span>
              </div>
              <p className="mt-3 text-[15px] font-black text-white/92">{slot.timeLabel}</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.10em] text-slate-400/60">
                30-minute session
              </p>
            </button>
          );
        })}
      </div>

      {!hasCommittedAccess ? (
        <button
          type="button"
          onClick={openCommittedVersionModal}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-violet-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.82),rgba(99,102,241,0.92))] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]"
        >
          <LockKeyhole className="h-3.5 w-3.5" />
          Unlock monthly coaching
        </button>
      ) : (
        <button
          type="button"
          disabled={!selectedSlot}
          onClick={onContinue}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.26)] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selectedSlot ? "Continue to coaching check-in" : "Choose a free time"}
          {selectedSlot ? <ArrowRight className="h-3.5 w-3.5" /> : null}
        </button>
      )}

      <div className="mt-2.5 flex items-start gap-2 rounded-[15px] border border-amber-200/[0.08] bg-amber-100/[0.035] px-3 py-2.5">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/65" />
        <p className="text-[9px] font-semibold leading-relaxed text-slate-300/65">
          One session is included per active membership month. Booking is first come, first served and confirmed after review.
        </p>
      </div>
    </div>
  );
}

function ChoiceList({ options, value, onChange }) {
  return (
    <div className="mt-5 space-y-2.5">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex w-full items-start gap-3 rounded-[18px] border px-4 py-3.5 text-left transition ${
              isSelected
                ? "border-cyan-200/55 bg-cyan-200/[0.10] shadow-[0_0_24px_rgba(34,211,238,0.09)]"
                : "border-white/[0.08] bg-white/[0.035] hover:border-cyan-100/20 hover:bg-white/[0.06]"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                isSelected
                  ? "border-cyan-200/65 bg-cyan-200/20 text-cyan-50"
                  : "border-white/15 bg-white/[0.03] text-transparent"
              }`}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-black text-white/92">{option.label}</span>
                {option.recommended ? (
                  <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.08] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-cyan-100/75">
                    Recommended
                  </span>
                ) : null}
              </span>
              {option.description ? (
                <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-slate-300/62">
                  {option.description}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.035] px-3.5 py-3">
      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/55">
        {label}
      </p>
      <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-white/85">{value}</p>
    </div>
  );
}

function CoachingCheckInPanel({
  selectedDateLabel,
  selectedSlot,
  questionIndex,
  answers,
  onAnswer,
  onBack,
  onNext,
  onConfirm,
}) {
  const isReview = questionIndex >= CHECK_IN_STEPS.length;
  const step = CHECK_IN_STEPS[questionIndex];
  const progress = isReview ? 100 : ((questionIndex + 1) / CHECK_IN_STEPS.length) * 100;
  const currentAnswer = step ? answers[step.key] : "";
  const canContinue = isReview
    ? true
    : step.type === "textarea"
      ? String(currentAnswer || "").trim().length >= 3
      : Boolean(currentAnswer);

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-[9px] font-black uppercase tracking-[0.11em] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/55">
            Coaching Check-In
          </p>
          <p className="mt-0.5 text-[9px] font-bold text-white/55">
            {isReview ? "Review" : `${questionIndex + 1} of ${CHECK_IN_STEPS.length}`}
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.85),rgba(129,140,248,0.92))] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isReview ? (
        <div className="mt-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-cyan-100/15 bg-cyan-100/[0.06]">
              <ShieldCheck className="h-5 w-5 text-cyan-100/80" />
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/65">
                Review your check-in
              </p>
              <h1 className="mt-1 text-[23px] font-black leading-tight text-white">
                Ready for your coach
              </h1>
              <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-300/65">
                Make sure this reflects what you need before completing your request.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <ReviewRow label="Schedule" value={`${selectedDateLabel} · ${selectedSlot.timeLabel}`} />
            <ReviewRow label="Focus" value={getOptionLabel(SESSION_FOCUS_OPTIONS, answers.focus)} />
            <ReviewRow label="Desired result" value={getOptionLabel(DESIRED_OUTCOME_OPTIONS, answers.outcome)} />
            <ReviewRow label="Money state" value={getOptionLabel(EMOTION_OPTIONS, answers.emotion)} />
            <ReviewRow label="Coaching approach" value={getOptionLabel(APPROACH_OPTIONS, answers.approach)} />
            <ReviewRow label="Data permission" value={getOptionLabel(DATA_CONSENT_OPTIONS, answers.dataConsent)} />
            <ReviewRow label="Current situation" value={answers.situation} />
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.90),rgba(99,102,241,0.95))] px-4 text-[10px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)]"
          >
            Complete coaching check-in
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/65">
            {step.eyebrow}
          </p>
          <h1 className="mt-1.5 text-[23px] font-black leading-tight tracking-tight text-white sm:text-[27px]">
            {step.title}
          </h1>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-300/65">
            {step.helper}
          </p>

          {step.type === "choice" ? (
            <ChoiceList
              options={step.options}
              value={currentAnswer}
              onChange={(value) => onAnswer(step.key, value)}
            />
          ) : (
            <div className="mt-5">
              <textarea
                value={currentAnswer}
                onChange={(event) => onAnswer(step.key, event.target.value)}
                maxLength={600}
                rows={6}
                placeholder="Example: My salary keeps disappearing before the next payday, and I cannot identify where I lose control."
                className="w-full resize-none rounded-[20px] border border-white/[0.09] bg-black/[0.14] px-4 py-4 text-[12px] font-semibold leading-relaxed text-white outline-none placeholder:text-slate-400/40 focus:border-cyan-200/35 focus:bg-white/[0.04]"
              />
              <p className="mt-1.5 text-right text-[8px] font-bold text-slate-400/45">
                {String(currentAnswer || "").length}/600
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!canContinue}
            onClick={onNext}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.26)] transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {questionIndex === CHECK_IN_STEPS.length - 1 ? "Review check-in" : "Continue"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function CheckInCompletePanel({ selectedDateLabel, selectedSlot, onReview, onHome }) {
  return (
    <div className="py-3 text-center sm:py-6">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-200/20 bg-emerald-300/[0.10] shadow-[0_0_36px_rgba(52,211,153,0.14)]">
        <CheckCircle2 className="h-7 w-7 text-emerald-200" />
      </span>
      <p className="mt-5 text-[9px] font-black uppercase tracking-[0.20em] text-cyan-200/65">
        Monthly Coaching
      </p>
      <h1 className="mt-1.5 text-[27px] font-black tracking-tight text-white">
        Check-In Complete
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[11px] font-semibold leading-relaxed text-slate-300/68">
        Your coach now has a clearer picture of your concern, preferred approach, and desired result.
      </p>

      <div className="mx-auto mt-5 max-w-md rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-left">
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/55">
          Selected schedule
        </p>
        <p className="mt-1.5 text-[13px] font-black text-white">{selectedDateLabel}</p>
        <p className="mt-1 text-[11px] font-bold text-slate-300/70">{selectedSlot.timeLabel}</p>
      </div>

      <div className="mx-auto mt-4 max-w-md rounded-[18px] border border-amber-200/[0.10] bg-amber-100/[0.04] px-3.5 py-3 text-left">
        <p className="text-[9px] font-semibold leading-relaxed text-slate-300/65">
          First-draft mode: this check-in is saved on this device. Live submission, slot reservation, and coach assignment will be connected through Supabase.
        </p>
      </div>

      <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onReview}
          className="inline-flex h-11 items-center justify-center rounded-[16px] border border-white/[0.09] bg-white/[0.045] px-3 text-[9px] font-black uppercase tracking-[0.10em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          Review answers
        </button>
        <button
          type="button"
          onClick={onHome}
          className="inline-flex h-11 items-center justify-center rounded-[16px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.84),rgba(99,102,241,0.92))] px-3 text-[9px] font-black uppercase tracking-[0.10em] text-white"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function WelcomeSession() {
  const navigate = useNavigate();
  const hasCommittedAccess = useCommittedFeatureAccess();
  const slots = useMemo(() => buildWelcomeSessionSlots(), []);

  const slotsByDate = useMemo(() => {
    const map = new Map();
    slots.forEach((slot) => {
      const current = map.get(slot.dateKey) || [];
      current.push(slot);
      map.set(slot.dateKey, current);
    });
    return map;
  }, [slots]);

  const monthOptions = useMemo(() => {
    const months = new Map();
    slots.forEach((slot) => {
      if (!months.has(slot.monthKey)) {
        months.set(slot.monthKey, new Date(slot.date.getFullYear(), slot.date.getMonth(), 1));
      }
    });
    return Array.from(months.entries()).map(([key, date]) => ({ key, date }));
  }, [slots]);

  const firstAvailableSlot = slots.find((slot) => slot.status === "available") || slots[0];
  const [monthIndex, setMonthIndex] = useState(() => {
    const index = monthOptions.findIndex((month) => month.key === firstAvailableSlot?.monthKey);
    return Math.max(index, 0);
  });
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [view, setView] = useState("calendar");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);

  const selectedMonth = monthOptions[monthIndex]?.date || new Date();
  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);
  const selectedDateSlots = slotsByDate.get(selectedDateKey) || [];
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;
  const todayKey = toDateKey(new Date());

  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(selectedMonth);
  const selectedDateLabel = selectedDateSlots[0]?.fullDateLabel || "Choose a date";

  const resetToCalendar = () => {
    setView("calendar");
    setSelectedDateKey("");
    setSelectedSlotId("");
    setQuestionIndex(0);
  };

  const moveMonth = (direction) => {
    const nextIndex = Math.min(Math.max(monthIndex + direction, 0), monthOptions.length - 1);
    if (nextIndex === monthIndex) return;
    setMonthIndex(nextIndex);
    resetToCalendar();
  };

  const handleDateSelect = (dateKey) => {
    const dateSlots = slotsByDate.get(dateKey) || [];
    const hasAvailableSlot = dateSlots.some((slot) => slot.status === "available");
    if (!hasAvailableSlot) return;

    setSelectedDateKey(dateKey);
    setSelectedSlotId("");
    setView("times");
  };

  const startCheckIn = () => {
    if (!selectedSlot || selectedSlot.status !== "available") return;
    setQuestionIndex(0);
    setView("checkin");
  };

  const handleCheckInBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex((current) => current - 1);
      return;
    }
    setView("times");
  };

  const handleCheckInNext = () => {
    setQuestionIndex((current) => Math.min(current + 1, CHECK_IN_STEPS.length));
  };

  const handleConfirmCheckIn = () => {
    if (!selectedSlot) return;

    const payload = {
      version: 2,
      status: "draft_local",
      createdAt: new Date().toISOString(),
      schedule: {
        slotId: selectedSlot.id,
        date: selectedSlot.fullDateLabel,
        time: selectedSlot.timeLabel,
      },
      answers,
    };

    try {
      localStorage.setItem("claraMonthlyCoachingCheckInDraft", JSON.stringify(payload));
    } catch {
      // The completion screen can still be shown when browser storage is unavailable.
    }

    setView("complete");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden px-3 pb-3 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-[100px]" />
        <div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-violet-500/[0.10] blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-3 py-2.5 sm:py-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.045] px-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-cyan-100/20 hover:bg-white/[0.075] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>

          <div className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/75">
            Personal CLARA Support
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[30px] border border-cyan-100/15 bg-[linear-gradient(145deg,rgba(5,28,46,0.94),rgba(8,18,43,0.95)_50%,rgba(35,14,72,0.94))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.14),transparent_38%),radial-gradient(circle_at_100%_10%,rgba(139,92,246,0.16),transparent_40%)]" />

          {view === "calendar" ? <MonthlyCoachingIntro /> : null}

          {view === "times" ? (
            <AvailabilityPanel
              selectedDateLabel={selectedDateLabel}
              selectedDateSlots={selectedDateSlots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={setSelectedSlotId}
              onReset={resetToCalendar}
              onContinue={startCheckIn}
              hasCommittedAccess={hasCommittedAccess}
            />
          ) : null}

          {view === "checkin" && selectedSlot ? (
            <CoachingCheckInPanel
              selectedDateLabel={selectedDateLabel}
              selectedSlot={selectedSlot}
              questionIndex={questionIndex}
              answers={answers}
              onAnswer={(key, value) => setAnswers((current) => ({ ...current, [key]: value }))}
              onBack={handleCheckInBack}
              onNext={handleCheckInNext}
              onConfirm={handleConfirmCheckIn}
            />
          ) : null}

          {view === "complete" && selectedSlot ? (
            <CheckInCompletePanel
              selectedDateLabel={selectedDateLabel}
              selectedSlot={selectedSlot}
              onReview={() => {
                setQuestionIndex(CHECK_IN_STEPS.length);
                setView("checkin");
              }}
              onHome={() => navigate("/dashboard")}
            />
          ) : null}
        </section>

        {view === "calendar" ? (
          <section className="mt-3 rounded-[28px] border border-white/[0.08] bg-[rgba(5,18,38,0.76)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.20em] text-cyan-200/70">
                  Monthly coaching calendar
                </p>
                <h2 className="mt-1 text-[20px] font-black text-white">{monthLabel}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  disabled={monthIndex === 0}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                  aria-label="Previous appointment month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  disabled={monthIndex >= monthOptions.length - 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                  aria-label="Next appointment month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="pb-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-slate-400/70"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((date) => {
                const dateKey = toDateKey(date);
                const dateSlots = slotsByDate.get(dateKey) || [];
                const isCurrentMonth = toMonthKey(date) === toMonthKey(selectedMonth);
                const isToday = dateKey === todayKey;
                const availableCount = dateSlots.filter((slot) => slot.status === "available").length;
                const hasAppointments = dateSlots.length > 0;
                const isClickable = availableCount > 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleDateSelect(dateKey)}
                    disabled={!isClickable}
                    className={`relative aspect-square min-h-[42px] rounded-[16px] border text-center transition sm:min-h-[54px] ${
                      isClickable
                        ? "cursor-pointer border-white/[0.09] bg-white/[0.045] text-white/90 hover:-translate-y-0.5 hover:border-cyan-100/35 hover:bg-white/[0.09] active:translate-y-0"
                        : hasAppointments
                          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.025] text-white/55"
                          : "cursor-default border-transparent bg-transparent text-slate-500/45"
                    } ${!isCurrentMonth ? "opacity-35" : ""}`}
                    aria-label={`${date.toDateString()}${
                      availableCount
                        ? `, ${availableCount} available appointment`
                        : ", no available appointment"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-black sm:text-[13px] ${
                        isToday ? "text-cyan-200" : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                        isClickable ? "bg-emerald-300" : "bg-rose-300/70"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[18px] border border-white/[0.06] bg-black/[0.10] px-3.5 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300/70">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Available
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300/70">
                <span className="h-2 w-2 rounded-full bg-rose-300/65" />
                Unavailable
              </div>
              <p className="ml-auto text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200/55">
                Updated manually
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
