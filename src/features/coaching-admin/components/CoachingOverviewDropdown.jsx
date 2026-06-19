import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
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
import { AdminButton, StatusBadge } from "./CoachingAdminUi";

const primaryMetrics = [
  ["pending", "Pending", Clock3],
  ["today", "Today", CalendarClock],
  ["confirmed", "Confirmed", UserRoundCheck],
  ["rescheduleRequests", "Reschedule", RotateCcw],
];

const secondaryMetrics = [
  ["availableSlots", "Available slots", CalendarCheck2],
  ["completedThisMonth", "Completed this month", CheckCircle2],
  ["cancelledNoShow", "Cancelled / no-show", XCircle],
];

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

function PrimaryMetric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.035] px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[24px] font-black leading-none text-white">{value}</span>
      </div>
      <p className="mt-3 text-[10px] font-bold text-slate-300/70">{label}</p>
    </div>
  );
}

function DisclosureSection({ title, eyebrow, count, children, defaultOpen = false }) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-[22px] border border-white/[0.08] bg-[rgba(5,18,38,0.72)] shadow-[0_16px_42px_rgba(0,0,0,0.20)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden sm:px-5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.17em] text-cyan-200/55">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-[17px] font-black text-white">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof count === "number" ? (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[9px] font-black text-white/60">
              {count}
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

export default function CoachingOverviewDropdown({ overview, onOpenAppointment, onStatusChange }) {
  if (!overview) {
    return (
      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5 text-sm font-semibold text-white/60">
        Loading coaching overview...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DisclosureSection title="Quick summary" eyebrow="Overview" defaultOpen>
        <div className="grid grid-cols-2 gap-2.5">
          {primaryMetrics.map(([key, label, Icon]) => (
            <PrimaryMetric
              key={key}
              label={label}
              value={overview.metrics[key] || 0}
              icon={Icon}
            />
          ))}
        </div>

        <div className="mt-3 divide-y divide-white/[0.06] rounded-[17px] border border-white/[0.07] bg-black/[0.10] px-3.5">
          {secondaryMetrics.map(([key, label, Icon]) => (
            <div key={key} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-cyan-100/60" />
                <span className="truncate text-[11px] font-semibold text-slate-300/70">{label}</span>
              </div>
              <span className="text-[14px] font-black text-white">{overview.metrics[key] || 0}</span>
            </div>
          ))}
        </div>
      </DisclosureSection>

      <DisclosureSection
        title="Attention required"
        eyebrow="Operational queue"
        count={overview.attention.length}
        defaultOpen
      >
        <div className="space-y-2.5">
          {overview.attention.length === 0 ? (
            <div className="rounded-[17px] border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-[11px] font-semibold text-emerald-100/80">
              No coaching records currently require attention.
            </div>
          ) : (
            overview.attention.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[14px] font-black text-white">
                        {appointment.member?.displayName || "Unknown member"}
                      </h3>
                      {isPriorityAppointment(appointment) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.10] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] text-amber-100">
                          <AlertTriangle className="h-2.5 w-2.5" /> Priority
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-slate-300/55">
                      {formatDate(appointment.dateKey)} · {formatTime(appointment.startTime)}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} className="shrink-0" />
                </div>

                <p className="mt-3 text-[11px] font-bold text-white/78">
                  <AttentionReason appointment={appointment} />
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-relaxed text-slate-300/52">
                  {FOCUS_LABELS[appointment.focus] || appointment.focus}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminButton className="min-h-9 px-3 text-[9px]" onClick={() => onOpenAppointment(appointment.id)}>
                    Review
                  </AdminButton>
                  {appointment.status === "pending" ? (
                    <>
                      <AdminButton
                        className="min-h-9 px-3 text-[9px]"
                        variant="success"
                        onClick={() => onStatusChange(appointment.id, "confirmed")}
                      >
                        Confirm
                      </AdminButton>
                      <AdminButton
                        className="min-h-9 px-3 text-[9px]"
                        variant="ghost"
                        onClick={() => onStatusChange(appointment.id, "reschedule_requested")}
                      >
                        Reschedule
                      </AdminButton>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </DisclosureSection>
    </div>
  );
}
