export const COACHING_ADMIN_STORAGE_KEY = "claraCoachingAdminMockState";

export const APPOINTMENT_STATUSES = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  RESCHEDULE_REQUESTED: "reschedule_requested",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  DECLINED: "declined",
});

export const STATUS_LABELS = Object.freeze({
  pending: "Pending review",
  confirmed: "Confirmed",
  reschedule_requested: "Reschedule requested",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  declined: "Declined",
});

export const STATUS_STYLES = Object.freeze({
  pending: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  confirmed: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  reschedule_requested: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  completed: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  cancelled: "border-rose-300/15 bg-rose-300/[0.08] text-rose-100/85",
  no_show: "border-red-300/20 bg-red-300/10 text-red-100",
  declined: "border-slate-300/15 bg-slate-300/[0.08] text-slate-200/80",
});

export const VALID_STATUS_TRANSITIONS = Object.freeze({
  pending: ["confirmed", "reschedule_requested", "declined"],
  confirmed: ["completed", "reschedule_requested", "cancelled", "no_show"],
  reschedule_requested: ["pending", "confirmed", "cancelled"],
  completed: ["pending"],
  cancelled: ["pending"],
  no_show: ["pending"],
  declined: ["pending"],
});

export const FOCUS_LABELS = Object.freeze({
  clara_setup: "Understanding or setting up CLARA",
  budget_cashflow: "Fixing my budget or monthly cash flow",
  impulsive_spending: "Controlling impulsive or emotional spending",
  betting_harm: "Betting is affecting my money",
  debt_bills: "Managing debt or overdue bills",
  upcoming_expense: "Preparing for an upcoming expense",
  savings: "Building savings or an emergency fund",
  income_stability: "Improving or stabilizing my income",
  urgent_problem: "Handling an urgent money problem",
  decision: "Making a financial decision",
  progress_accountability: "Reviewing my progress and accountability",
  other: "Something else",
});

export const APPROACH_LABELS = Object.freeze({
  gentle_supportive: "Gentle & Supportive",
  calm_honest: "Calm but Honest",
  direct_firm: "Direct & Firm",
  strong_accountability: "Strong Accountability",
  adaptive: "Adapt During the Session",
});

export const OUTCOME_LABELS = Object.freeze({
  clear_action: "Leave with one clear action",
  adjust_plan: "Create or adjust a financial plan",
  understand_pattern: "Understand a repeated money behavior",
  make_decision: "Make a confident financial decision",
  setup_feature: "Set up a CLARA feature correctly",
  review_progress: "Review my progress and next step",
  feel_control: "Feel more confident and in control",
});

export const EMOTION_LABELS = Object.freeze({
  calm: "Calm and in control",
  motivated: "Motivated but unsure",
  confused: "Confused",
  pressured: "Pressured",
  overwhelmed: "Overwhelmed",
  discouraged: "Discouraged",
  hopeful: "Hopeful and ready to improve",
});

export const DATA_CONSENT_LABELS = Object.freeze({
  allow: "Relevant CLARA information may be reviewed",
  answers_only: "Answers-only preparation",
});

export const SLOT_STATUS_LABELS = Object.freeze({
  available: "Available",
  pending: "Pending",
  booked: "Confirmed",
  blocked: "Blocked",
  hold: "Admin hold",
});

export const DAY_STATUS_STYLES = Object.freeze({
  available: "bg-emerald-400",
  attention: "bg-amber-400",
  confirmed: "bg-cyan-400",
  unavailable: "bg-rose-400",
  outside: "bg-slate-600",
});

export function formatDate(dateKey, options = {}) {
  if (!dateKey) return "—";
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatTime(value) {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(2026, 0, 1, hour, minute);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function isPriorityAppointment(appointment) {
  const flags = appointment?.specialFlags || {};
  return Boolean(flags.bettingRelated || flags.essentialMoneyRisk || flags.urgentConcern);
}
