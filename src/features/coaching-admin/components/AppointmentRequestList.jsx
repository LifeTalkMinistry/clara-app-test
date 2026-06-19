import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Filter, Search, SlidersHorizontal } from "lucide-react";
import { coachingRepository } from "../data";
import {
  APPROACH_LABELS,
  FOCUS_LABELS,
  formatDate,
  formatDateTime,
  formatTime,
  isPriorityAppointment,
} from "../constants";
import {
  AdminButton,
  FieldLabel,
  StatusBadge,
  inputClass,
  panelClass,
} from "./CoachingAdminUi";

const STATUS_FILTERS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["reschedule_requested", "Reschedule Requested"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["no_show", "No-Show"],
  ["declined", "Declined"],
];

const initialFilters = {
  status: "all",
  search: "",
  dateFrom: "",
  dateTo: "",
  coachId: "all",
  focus: "all",
  approach: "all",
  priorityOnly: false,
};

function RequestActions({ appointment, onOpen, onStatusChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <AdminButton onClick={() => onOpen(appointment.id)}>Open</AdminButton>
      {appointment.status === "pending" ? (
        <>
          <AdminButton variant="success" onClick={() => onStatusChange(appointment.id, "confirmed")}>
            Confirm
          </AdminButton>
          <AdminButton variant="ghost" onClick={() => onStatusChange(appointment.id, "reschedule_requested")}>
            Request Reschedule
          </AdminButton>
        </>
      ) : null}
      {appointment.status === "confirmed" ? (
        <AdminButton variant="danger" onClick={() => onStatusChange(appointment.id, "cancelled")}>
          Cancel
        </AdminButton>
      ) : null}
    </div>
  );
}

export default function AppointmentRequestList({
  refreshToken,
  onOpenAppointment,
  onStatusChange,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [appointments, setAppointments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const [items, overview] = await Promise.all([
        coachingRepository.getAppointments(filters),
        coachingRepository.getOverview(),
      ]);
      if (!active) return;
      setAppointments(items);
      setCoaches(overview.coaches || []);
      setLoading(false);
    }, filters.search ? 180 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, refreshToken]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        if (key === "status") return value !== "all";
        if (key === "coachId" || key === "focus" || key === "approach") return value !== "all";
        return Boolean(value);
      }).length,
    [filters]
  );

  return (
    <section className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-white/[0.07] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">Coaching queue</p>
            <h2 className="mt-1 text-xl font-black text-white">Appointment Requests</h2>
          </div>
          <AdminButton variant="secondary" onClick={() => setShowAdvanced((current) => !current)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
          </AdminButton>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search member, email, appointment ID, or focus"
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => updateFilter("status", value)}
              className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.09em] transition ${
                filters.status === value
                  ? "border-cyan-200/35 bg-cyan-200/[0.12] text-cyan-50"
                  : "border-white/[0.08] bg-white/[0.035] text-white/50 hover:bg-white/[0.06] hover:text-white/75"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {showAdvanced ? (
          <div className="mt-4 grid gap-3 rounded-[20px] border border-white/[0.07] bg-black/[0.10] p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Date from</FieldLabel>
              <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Date to</FieldLabel>
              <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Coach</FieldLabel>
              <select value={filters.coachId} onChange={(event) => updateFilter("coachId", event.target.value)} className={inputClass}>
                <option value="all">All coaches</option>
                <option value="unassigned">Unassigned</option>
                {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.displayName}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Session focus</FieldLabel>
              <select value={filters.focus} onChange={(event) => updateFilter("focus", event.target.value)} className={inputClass}>
                <option value="all">All focus areas</option>
                {Object.entries(FOCUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Coaching approach</FieldLabel>
              <select value={filters.approach} onChange={(event) => updateFilter("approach", event.target.value)} className={inputClass}>
                <option value="all">All approaches</option>
                {Object.entries(APPROACH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-3 self-end rounded-[15px] border border-white/[0.08] bg-white/[0.035] px-3.5 text-[10px] font-black uppercase tracking-[0.09em] text-white/65">
              <input
                type="checkbox"
                checked={filters.priorityOnly}
                onChange={(event) => updateFilter("priorityOnly", event.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              Priority only
            </label>
            <AdminButton variant="ghost" className="self-end" onClick={() => setFilters(initialFilters)}>
              <Filter className="h-3.5 w-3.5" /> Reset filters
            </AdminButton>
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        {loading ? (
          <p className="py-10 text-center text-[12px] font-semibold text-white/45">Loading requests...</p>
        ) : appointments.length === 0 ? (
          <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-6 text-center text-[12px] font-semibold text-white/55">
            No appointments match the current filters.
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-[21px] border border-white/[0.075] bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-black text-white">{appointment.member?.displayName}</h3>
                        {isPriorityAppointment(appointment) ? (
                          <AlertTriangle className="h-4 w-4 text-amber-200" aria-label="Priority appointment" />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-[10px] font-semibold text-white/45">{appointment.member?.email}</p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div className="mt-3 grid gap-2 rounded-[16px] border border-white/[0.06] bg-black/[0.10] p-3 text-[10px] font-semibold text-white/60 sm:grid-cols-2">
                    <p><span className="text-white/35">Schedule:</span> {formatDate(appointment.dateKey)} · {formatTime(appointment.startTime)}</p>
                    <p><span className="text-white/35">Coach:</span> {appointment.coach?.displayName || "Unassigned"}</p>
                    <p><span className="text-white/35">Focus:</span> {FOCUS_LABELS[appointment.focus]}</p>
                    <p><span className="text-white/35">Approach:</span> {APPROACH_LABELS[appointment.coachingApproach]}</p>
                  </div>
                  <p className="mt-3 text-[9px] font-semibold text-white/35">Submitted {formatDateTime(appointment.submittedAt)}</p>
                  <div className="mt-4"><RequestActions appointment={appointment} onOpen={onOpenAppointment} onStatusChange={onStatusChange} /></div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-[8px] font-black uppercase tracking-[0.13em] text-white/35">
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Schedule</th>
                    <th className="px-3 py-2">Focus / Approach</th>
                    <th className="px-3 py-2">Coach</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="bg-white/[0.028] text-[11px] font-semibold text-white/70">
                      <td className="rounded-l-[17px] border-y border-l border-white/[0.065] px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-black text-white">{appointment.member?.displayName}</p>
                            <p className="mt-1 text-[9px] text-white/40">{appointment.member?.email}</p>
                          </div>
                          {isPriorityAppointment(appointment) ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" /> : null}
                        </div>
                      </td>
                      <td className="border-y border-white/[0.065] px-3 py-3.5">
                        {formatDate(appointment.dateKey)}<br />
                        <span className="text-white/40">{formatTime(appointment.startTime)}</span>
                      </td>
                      <td className="max-w-[220px] border-y border-white/[0.065] px-3 py-3.5">
                        <p className="line-clamp-2 text-white/75">{FOCUS_LABELS[appointment.focus]}</p>
                        <p className="mt-1 text-[9px] text-white/40">{APPROACH_LABELS[appointment.coachingApproach]}</p>
                      </td>
                      <td className="border-y border-white/[0.065] px-3 py-3.5">{appointment.coach?.displayName || "Unassigned"}</td>
                      <td className="border-y border-white/[0.065] px-3 py-3.5"><StatusBadge status={appointment.status} /></td>
                      <td className="border-y border-white/[0.065] px-3 py-3.5 text-[9px] text-white/45">{formatDateTime(appointment.submittedAt)}</td>
                      <td className="rounded-r-[17px] border-y border-r border-white/[0.065] px-3 py-3.5">
                        <RequestActions appointment={appointment} onOpen={onOpenAppointment} onStatusChange={onStatusChange} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
