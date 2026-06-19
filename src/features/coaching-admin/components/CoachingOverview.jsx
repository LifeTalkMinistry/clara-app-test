import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RotateCcw,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import {
  FOCUS_LABELS,
  formatDate,
  formatTime,
  isPriorityAppointment,
} from "../constants";
import { AdminButton, StatusBadge, panelClass } from "./CoachingAdminUi";

const metrics = [
  ["pending", "Pending Requests", Clock3],
  ["confirmed", "Confirmed", UserRoundCheck],
  ["today", "Today", CalendarClock],
  ["availableSlots", "Available Slots", CalendarCheck2],
  ["completedThisMonth", "Completed This Month", CheckCircle2],
  ["rescheduleRequests", "Reschedule Requests", RotateCcw],
  ["cancelledNoShow", "Cancelled / No-Show", XCircle],
];

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className={`${panelClass} min-h-[118px] p-4`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="text-[28px] font-black leading-none tracking-tight text-white">{value}</span>
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300/65">
        {label}
      </p>
    </div>
  );
}

function AttentionReason({ appointment }) {
  const flags = appointment.specialFlags || {};
  if (flags.essentialMoneyRisk) return "Essential-money risk detected";
  if (flags.bettingRelated) return "Private betting-related concern";
  if (flags.urgentConcern) return "Needs timely review";
  if (appointment.status === "reschedule_requested") return "A different time is needed";
  if (appointment.status === "completed" && !appointment.sessionOutcome?.trim()) {
    return "Completed session is missing outcome notes";
  }
  return appointment.status === "pending" ? "New coaching request" : "Session happening today";
}

export default function CoachingOverview({ overview, onOpenAppointment, onStatusChange }) {
  if (!overview) {
    return <div className={`${panelClass} p-6 text-sm font-semibold text-white/60`}>Loading overview...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {metrics.map(([key, label, Icon]) => (
          <MetricCard key={key} label={label} value={overview.metrics[key] || 0} icon={Icon} />
        ))}
      </div>

      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200/70">
              Operational queue
            </p>
            <h2 className="mt-1 text-xl font-black text-white">Attention Required</h2>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/55">
            {overview.attention.length} items
          </span>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {overview.attention.length === 0 ? (
            <div className="rounded-[20px] border border-emerald-300/15 bg-emerald-300/[0.06] p-5 text-[12px] font-semibold text-emerald-100/80">
              No coaching records currently require attention.
            </div>
          ) : (
            overview.attention.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-[21px] border border-white/[0.08] bg-white/[0.035] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[15px] font-black text-white">
                        {appointment.member?.displayName || "Unknown member"}
                      </h3>
                      {isPriorityAppointment(appointment) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.10] px-2 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-amber-100">
                          <AlertTriangle className="h-3 w-3" /> Priority
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-slate-300/65">
                      {formatDate(appointment.dateKey)} · {formatTime(appointment.startTime)}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                <p className="mt-3 text-[12px] font-semibold text-white/80">
                  <AttentionReason appointment={appointment} />
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-relaxed text-slate-300/58">
                  {FOCUS_LABELS[appointment.focus] || appointment.focus}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminButton onClick={() => onOpenAppointment(appointment.id)}>Review Request</AdminButton>
                  {appointment.status === "pending" ? (
                    <>
                      <AdminButton variant="success" onClick={() => onStatusChange(appointment.id, "confirmed")}>
                        Confirm
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        onClick={() => onStatusChange(appointment.id, "reschedule_requested")}
                      >
                        Request Reschedule
                      </AdminButton>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
