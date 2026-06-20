import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  FileLock2,
  Mail,
  Save,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { coachingRepository } from "../data";
import {
  APPROACH_LABELS,
  EMOTION_LABELS,
  FOCUS_LABELS,
  OUTCOME_LABELS,
  formatDate,
  formatDateTime,
  formatTime,
} from "../constants";
import {
  AdminButton,
  FieldLabel,
  StatusBadge,
  inputClass,
  panelClass,
} from "./CoachingAdminUi";

const NOTE_FIELDS = [
  ["preparationNotes", "Preparation Notes", "What should the coach review before the session?"],
  ["questionsToAsk", "Questions to Ask", "Key questions that can clarify the member's situation."],
  ["sensitivities", "Sensitivities or Boundaries", "Private reminders for a respectful session."],
  ["sessionNotes", "Session Notes", "Private notes captured during or after the call."],
  ["agreedAction", "Agreed Action", "The concrete action agreed with the member."],
  ["followUpNotes", "Follow-Up Notes", "What should be checked in the next follow-up?"],
];

function DetailItem({ label, value }) {
  return (
    <div className="rounded-[16px] border border-white/[0.065] bg-white/[0.03] p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-cyan-100/45">{label}</p>
      <p className="mt-1.5 break-words text-[11px] font-bold leading-relaxed text-white/78">{value || "—"}</p>
    </div>
  );
}

function Section({ eyebrow, title, icon: Icon, children, className = "" }) {
  return (
    <section className={`${panelClass} p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/50">{eyebrow}</p>
          <h3 className="mt-1 text-[17px] font-black text-white">{title}</h3>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PrivatePriorityPanel({ appointment }) {
  const flags = appointment.specialFlags || {};
  const items = [];
  if (flags.bettingRelated) items.push("Betting-related money concern");
  if (flags.essentialMoneyRisk) items.push("Essential-money risk");
  if (flags.urgentConcern) items.push("Urgent financial problem");
  if (!items.length) return null;

  return (
    <Section eyebrow="Admin only" title="Private Priority Information" icon={ShieldAlert} className="border-amber-300/15">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2.5 rounded-[15px] border border-amber-300/12 bg-amber-300/[0.06] px-3.5 py-3 text-[11px] font-bold text-amber-50/85">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            {item}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold leading-relaxed text-white/45">
        These flags describe member-provided concerns for preparation only. They are not clinical diagnoses and should be handled calmly and without shame-based language.
      </p>
    </Section>
  );
}

function AppointmentActions({ appointment, onStatusChange }) {
  const actions = [];

  if (appointment.status === "pending") {
    actions.push(["Confirm Appointment", "confirmed", "success"]);
    actions.push(["Request Different Time", "reschedule_requested", "secondary"]);
    actions.push(["Decline Request", "declined", "danger"]);
  }
  if (appointment.status === "confirmed") {
    actions.push(["Mark Completed", "completed", "success"]);
    actions.push(["Reschedule", "reschedule_requested", "secondary"]);
    actions.push(["Cancel", "cancelled", "danger"]);
    actions.push(["Mark No-Show", "no_show", "danger"]);
  }
  if (appointment.status === "reschedule_requested") {
    actions.push(["Return to Pending", "pending", "secondary"]);
    actions.push(["Confirm Current Time", "confirmed", "success"]);
    actions.push(["Cancel", "cancelled", "danger"]);
  }
  if (["completed", "cancelled", "no_show", "declined"].includes(appointment.status)) {
    actions.push(["Reopen Request", "pending", "secondary"]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(([label, status, variant]) => (
        <AdminButton key={status} variant={variant} onClick={() => onStatusChange(appointment.id, status)}>
          {label}
        </AdminButton>
      ))}
    </div>
  );
}

export default function AppointmentDetail({
  appointmentId,
  refreshToken,
  onClose,
  onChanged,
  onStatusChange,
}) {
  const [appointment, setAppointment] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [notes, setNotes] = useState({});
  const [savedNotes, setSavedNotes] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!appointmentId) return;
    const [item, overview] = await Promise.all([
      coachingRepository.getAppointmentById(appointmentId),
      coachingRepository.getOverview(),
    ]);
    setAppointment(item);
    setCoaches(overview.coaches || []);
    const nextNotes = {
      preparationNotes: item?.preparationNotes || "",
      questionsToAsk: item?.questionsToAsk || "",
      sensitivities: item?.sensitivities || "",
      sessionNotes: item?.sessionNotes || "",
      agreedAction: item?.agreedAction || "",
      followUpNotes: item?.followUpNotes || "",
      sessionOutcome: item?.sessionOutcome || "",
      followUpNeeded: Boolean(item?.followUpNeeded),
    };
    setNotes(nextNotes);
    setSavedNotes(nextNotes);
  };

  useEffect(() => {
    load();
  }, [appointmentId, refreshToken]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(notes) !== JSON.stringify(savedNotes),
    [notes, savedNotes]
  );

  const saveNotes = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      await coachingRepository.saveInternalNotes(appointment.id, notes);
      await coachingRepository.saveSessionOutcome(appointment.id, notes);
      setSavedNotes(notes);
      toast.success("Private coaching notes saved.");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to save notes.");
    } finally {
      setSaving(false);
    }
  };

  const assignCoach = async (coachId) => {
    if (!appointment) return;
    try {
      await coachingRepository.assignCoach(appointment.id, coachId);
      toast.success(coachId ? "Coach assignment updated." : "Coach unassigned.");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to assign coach.");
    }
  };

  if (!appointmentId) return null;

  return (
    <div className="fixed inset-0 z-[280] bg-slate-950/72 backdrop-blur-sm">
      <aside className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.13),transparent_32%),linear-gradient(150deg,#041326,#070d1d_58%,#120b27)] xl:left-auto xl:w-[min(980px,76vw)] xl:border-l xl:border-white/[0.08] xl:shadow-[-30px_0_90px_rgba(0,0,0,0.42)]">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-slate-950/78 px-4 py-3 backdrop-blur-2xl sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/50">Private admin record</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[18px] font-black text-white">
                  {appointment?.member?.displayName || "Loading appointment..."}
                </h2>
                {appointment ? <StatusBadge status={appointment.status} /> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-white/65 hover:bg-white/[0.09] hover:text-white"
              aria-label="Close appointment detail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {!appointment ? (
          <div className="p-8 text-center text-sm font-semibold text-white/55">Loading appointment...</div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-4 p-4 pb-28 sm:p-6 sm:pb-32">
            <div className="grid gap-4 lg:grid-cols-2">
              <Section eyebrow="Member profile" title="Member Summary" icon={UserRound}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <DetailItem label="Name" value={appointment.member?.displayName} />
                  <DetailItem label="Email" value={appointment.member?.email} />
                  <DetailItem label="Membership plan" value={appointment.member?.membershipPlan} />
                  <DetailItem label="Membership status" value={appointment.member?.membershipStatus} />
                  <DetailItem label="Active month" value={appointment.member?.membershipMonth} />
                  <DetailItem label="Previous sessions" value={String(appointment.member?.previousSessionCount ?? 0)} />
                  <DetailItem label="Last session" value={appointment.member?.lastSessionDate ? formatDate(appointment.member.lastSessionDate) : "No previous session"} />
                  <div>
                    <FieldLabel>Assigned coach</FieldLabel>
                    <select value={appointment.coachId || ""} onChange={(event) => assignCoach(event.target.value)} className={inputClass}>
                      <option value="">Unassigned</option>
                      {coaches.filter((coach) => coach.active).map((coach) => (
                        <option key={coach.id} value={coach.id}>{coach.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Section>

              <Section eyebrow="Request record" title="Appointment Details" icon={CalendarClock}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <DetailItem label="Date" value={formatDate(appointment.dateKey, { weekday: "long" })} />
                  <DetailItem label="Time" value={`${formatTime(appointment.startTime)}–${formatTime(appointment.endTime)}`} />
                  <DetailItem label="Duration" value={`${appointment.durationMinutes} minutes`} />
                  <DetailItem label="Timezone" value={appointment.timezone} />
                  <DetailItem label="Submitted" value={formatDateTime(appointment.submittedAt)} />
                  <DetailItem label="Confirmed" value={formatDateTime(appointment.confirmedAt)} />
                  <DetailItem label="Appointment ID" value={appointment.id} />
                  <DetailItem label="Last updated" value={formatDateTime(appointment.updatedAt)} />
                </div>
              </Section>
            </div>

            <Section eyebrow="Member-provided answers" title="Coaching Check-In" icon={Mail}>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <DetailItem label="Session focus" value={FOCUS_LABELS[appointment.focus]} />
                <DetailItem label="Desired result" value={OUTCOME_LABELS[appointment.desiredOutcome]} />
                <DetailItem label="Emotional money state" value={EMOTION_LABELS[appointment.emotionalState]} />
                <DetailItem label="Preferred coaching approach" value={APPROACH_LABELS[appointment.coachingApproach]} />
                <div className="rounded-[16px] border border-white/[0.065] bg-white/[0.03] p-3 sm:col-span-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.13em] text-cyan-100/45">Current situation</p>
                  <p className="mt-2 whitespace-pre-wrap text-[12px] font-semibold leading-relaxed text-white/78">{appointment.currentSituation}</p>
                </div>
              </div>
            </Section>

            <PrivatePriorityPanel appointment={appointment} />

            <Section eyebrow="Never shown to members" title="Internal Coach Notes" icon={FileLock2}>
              <div className="grid gap-3 lg:grid-cols-2">
                {NOTE_FIELDS.map(([key, label, placeholder]) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <textarea
                      value={notes[key] || ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))}
                      rows={4}
                      placeholder={placeholder}
                      className={`${inputClass} min-h-[112px] resize-y py-3 leading-relaxed`}
                    />
                  </div>
                ))}
                <div className="lg:col-span-2">
                  <FieldLabel>Session Outcome</FieldLabel>
                  <textarea
                    value={notes.sessionOutcome || ""}
                    onChange={(event) => setNotes((current) => ({ ...current, sessionOutcome: event.target.value }))}
                    rows={4}
                    placeholder="Summarize the result of the session without adding unsupported conclusions."
                    className={`${inputClass} min-h-[112px] resize-y py-3 leading-relaxed`}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[17px] border border-white/[0.07] bg-black/[0.10] p-3.5">
                <label className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.09em] text-white/65">
                  <input
                    type="checkbox"
                    checked={Boolean(notes.followUpNeeded)}
                    onChange={(event) => setNotes((current) => ({ ...current, followUpNeeded: event.target.checked }))}
                    className="h-4 w-4 accent-cyan-400"
                  />
                  Follow-up needed
                </label>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-bold ${hasUnsavedChanges ? "text-amber-200" : "text-emerald-200/70"}`}>
                    {hasUnsavedChanges ? "Unsaved changes" : `Saved · ${formatDateTime(appointment.updatedAt)}`}
                  </span>
                  <AdminButton variant="primary" onClick={saveNotes} disabled={!hasUnsavedChanges || saving}>
                    <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Notes"}
                  </AdminButton>
                </div>
              </div>
            </Section>
          </div>
        )}

        {appointment ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-slate-950/88 px-4 py-3 backdrop-blur-2xl xl:left-auto xl:w-[min(980px,76vw)] sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/35">Administrative actions</p>
              <AppointmentActions appointment={appointment} onStatusChange={onStatusChange} />
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
