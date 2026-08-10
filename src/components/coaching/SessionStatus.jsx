import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, ExternalLink, MessageSquareText, Pencil } from "lucide-react";
import { formatDateLabel, formatTimeLabel } from "@/lib/welcome-session-schedule";
import { SummaryChip } from "./SessionShared";

const STATUS_CONTENT = {
  requested: ["Waiting for Confirmation", "Your preferred schedule was sent to Max. We’ll update you here once it is confirmed."],
  confirmed: ["Your Session Is Confirmed", "Your appointment is confirmed. Use the meeting link below when available."],
  reschedule_requested: ["Reschedule Requested", "Your current appointment remains recorded while you wait for Max’s response."],
  declined: ["Request Not Approved", "This request was not approved. You may choose another real available schedule."],
  cancelled: ["Session Cancelled", "This appointment has been cancelled and its time may become available again."],
  completed: ["Session Completed", "Your coaching session has been marked completed."],
  no_show: ["Session Missed", "Please Message CLARA for support so Max can help with the next step."],
};

export function AppointmentStatus({ appointment, onCancel, onRequestReschedule, onEditDetails, onBookAgain, isActioning, detailsUpdated }) {
  const [title, message] = STATUS_CONTENT[appointment.status] || STATUS_CONTENT.requested;
  const canCancel = ["requested", "confirmed", "reschedule_requested"].includes(appointment.status);
  const canReschedule = ["requested", "confirmed"].includes(appointment.status);
  const canEdit = ["requested", "confirmed", "reschedule_requested"].includes(appointment.status);
  const canBookAgain = ["declined", "cancelled", "completed"].includes(appointment.status);
  const isCompleted = appointment.status === "completed";
  const userMessage = String(appointment.user_message || "").trim();
  return (
    <div className={`clara-coaching-brand-anchor clara-session-status-brand clara-appointment-status-${appointment.status} py-2 text-center sm:py-5`}>
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-200/20 bg-cyan-300/[0.08]"><CheckCircle2 className="h-7 w-7 text-cyan-100" /></span>
      <p className="mt-5 text-[9px] font-black uppercase tracking-[0.20em] text-cyan-200/65">Authoritative appointment status</p><h1 className="mt-1.5 text-[27px] font-black text-white">{title}</h1><p className="mx-auto mt-2 max-w-lg text-[11px] font-semibold text-slate-300/68">{message}</p>
      <div className="mx-auto mt-5 grid max-w-xl gap-2.5 sm:grid-cols-2"><SummaryChip icon={CalendarDays} label="Date" value={formatDateLabel(appointment.starts_at, true)} /><SummaryChip icon={Clock3} label="Manila time" value={formatTimeLabel(appointment.starts_at)} /></div>
      <div className="mx-auto mt-4 max-w-xl rounded-[18px] border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-left"><p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/55">Status</p><p className="mt-1.5 text-[13px] font-black capitalize text-white">{appointment.status.replaceAll("_", " ")}</p>{appointment.requested_at ? <p className="mt-1 text-[9px] font-semibold text-slate-400/65">Requested {formatDateLabel(appointment.requested_at, true)} at {formatTimeLabel(appointment.requested_at)}</p> : null}</div>
      {detailsUpdated ? <div className="mx-auto mt-3 max-w-xl rounded-[16px] border border-emerald-200/20 bg-emerald-300/[0.08] px-4 py-3 text-[10px] font-semibold text-emerald-100/85">Session details updated. Your appointment date, time, and status did not change.</div> : null}
      {userMessage ? <div className="mx-auto mt-4 max-w-xl rounded-[20px] border border-violet-200/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(139,92,246,0.10))] px-4 py-4 text-left"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-violet-100/15 bg-violet-200/[0.08]"><MessageSquareText className="h-4 w-4 text-violet-100" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/75">Message from Max</p><p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] font-semibold leading-relaxed text-white/90">{userMessage}</p></div></div></div> : null}
      {appointment.status === "confirmed" && appointment.meeting_link ? <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="mx-auto mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-emerald-200/20 bg-emerald-300/[0.10] px-5 text-[9px] font-black uppercase text-emerald-100">Open meeting link <ExternalLink className="h-3.5 w-3.5" /></a> : null}
      {isCompleted ? <div className="mx-auto mt-4 max-w-xl rounded-[20px] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.08))] px-4 py-4 text-left"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-cyan-100/15 bg-cyan-200/[0.08]"><CalendarPlus className="h-4 w-4 text-cyan-100" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Plan your next session</p><p className="mt-1.5 text-[11px] font-bold leading-relaxed text-white/90">Feel free to schedule your next monthly coaching appointment now.</p><p className="mt-1 text-[9px] font-semibold leading-relaxed text-slate-300/65">Booking early gives you a better chance to secure your preferred available date and time.</p></div></div></div> : null}
      <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2.5">{canEdit ? <button type="button" disabled={isActioning} onClick={onEditDetails} className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-cyan-100/25 bg-cyan-200/[0.10] px-4 text-[9px] font-black uppercase text-cyan-50 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Edit Session Details</button> : null}{canReschedule ? <button type="button" disabled={isActioning} onClick={onRequestReschedule} className="h-11 rounded-[16px] border border-orange-200/20 bg-orange-300/[0.08] px-4 text-[9px] font-black uppercase text-orange-100 disabled:opacity-50">Request Reschedule</button> : null}{canCancel ? <button type="button" disabled={isActioning} onClick={onCancel} className="h-11 rounded-[16px] border border-rose-200/20 bg-rose-300/[0.08] px-4 text-[9px] font-black uppercase text-rose-100 disabled:opacity-50">Cancel Session</button> : null}{canBookAgain ? <button type="button" onClick={onBookAgain} className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.84),rgba(99,102,241,0.92))] px-5 text-[9px] font-black uppercase text-white">{isCompleted ? <CalendarPlus className="h-3.5 w-3.5" /> : null}{isCompleted ? "Schedule Next Session" : "Choose Another Schedule"}</button> : null}</div>
    </div>
  );
}

export function RequestSuccess({ appointment, onHome }) {
  return (
    <div className="clara-coaching-brand-anchor clara-session-status-brand clara-appointment-status-requested py-3 text-center sm:py-6">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-200/20 bg-emerald-300/[0.10]"><CheckCircle2 className="h-7 w-7 text-emerald-200" /></span><h1 className="mt-5 text-[27px] font-black text-white">Session Request Sent</h1><p className="mx-auto mt-2 max-w-md text-[11px] font-semibold text-slate-300/68">Your preferred schedule has been submitted to Max. We’ll update you here once your session is confirmed.</p>
      <div className="mx-auto mt-5 max-w-md rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-left"><p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/55">Requested schedule</p><p className="mt-1.5 text-[13px] font-black text-white">{formatDateLabel(appointment.starts_at, true)}</p><p className="mt-1 text-[11px] font-bold text-slate-300/70">{formatTimeLabel(appointment.starts_at)}</p><p className="mt-3 text-[9px] font-black uppercase text-amber-200">Status: Waiting for confirmation</p></div>
      <button type="button" onClick={onHome} className="mx-auto mt-5 inline-flex h-11 items-center justify-center rounded-[16px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.84),rgba(99,102,241,0.92))] px-6 text-[9px] font-black uppercase text-white">Back to Home</button>
    </div>
  );
}
