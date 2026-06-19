import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Eye,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { coachingRepository } from "../data";
import {
  DAY_STATUS_STYLES,
  SLOT_STATUS_LABELS,
  formatDate,
  formatTime,
} from "../constants";
import { AdminButton, StatusBadge, panelClass } from "./CoachingAdminUi";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getDaySummary(dateKey, monthData) {
  const slots = monthData?.slots?.filter((slot) => slot.dateKey === dateKey) || [];
  const appointments = monthData?.appointments?.filter((item) => item.dateKey === dateKey) || [];
  const blocked = Boolean(monthData?.dateBlocks?.[dateKey]);

  if (blocked) return { status: "unavailable", count: appointments.length, slots };
  if (slots.some((slot) => slot.status === "pending")) {
    return { status: "attention", count: appointments.length, slots };
  }
  if (slots.some((slot) => slot.status === "booked")) {
    return { status: "confirmed", count: appointments.length, slots };
  }
  if (slots.some((slot) => slot.status === "available")) {
    return { status: "available", count: appointments.length, slots };
  }
  return { status: "unavailable", count: appointments.length, slots };
}

function CalendarDay({ date, selectedMonthKey, selectedDateKey, todayKey, monthData, onSelect }) {
  const dateKey = dateKeyFromDate(date);
  const inMonth = dateKey.startsWith(selectedMonthKey);
  const summary = getDaySummary(dateKey, monthData);
  const selectable = inMonth && (summary.slots.length > 0 || monthData?.dateBlocks?.[dateKey]);

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => onSelect(dateKey)}
      className={`relative min-h-[70px] rounded-[17px] border p-2 text-left transition sm:min-h-[82px] sm:p-2.5 ${
        selectedDateKey === dateKey
          ? "border-cyan-200/45 bg-cyan-200/[0.10] shadow-[0_0_24px_rgba(34,211,238,0.10)]"
          : inMonth
            ? "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.13] hover:bg-white/[0.05]"
            : "border-transparent bg-transparent opacity-30"
      } disabled:cursor-default`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
            todayKey === dateKey ? "bg-white text-slate-950" : "text-white/80"
          }`}
        >
          {date.getDate()}
        </span>
        {inMonth ? (
          <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${DAY_STATUS_STYLES[summary.status]}`} />
        ) : null}
      </div>
      {inMonth && summary.count ? (
        <span className="absolute bottom-2.5 right-2.5 text-[9px] font-black text-white/45">
          {summary.count}
        </span>
      ) : null}
    </button>
  );
}

function SlotActions({ slot, onOpenAppointment, onStatusChange, onSlotUpdate }) {
  const appointment = slot.appointment;

  if (slot.status === "available") {
    return (
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="ghost" onClick={() => onSlotUpdate(slot, "blocked")}>Block Slot</AdminButton>
        <AdminButton variant="secondary" onClick={() => onSlotUpdate(slot, "hold")}>Create Admin Hold</AdminButton>
      </div>
    );
  }

  if (["blocked", "hold"].includes(slot.status)) {
    return <AdminButton variant="success" onClick={() => onSlotUpdate(slot, "available")}>Reopen Slot</AdminButton>;
  }

  if (!appointment) return null;

  if (["pending", "reschedule_requested"].includes(appointment.status)) {
    return (
      <div className="flex flex-wrap gap-2">
        <AdminButton onClick={() => onOpenAppointment(appointment.id)}>Review Request</AdminButton>
        <AdminButton variant="success" onClick={() => onStatusChange(appointment.id, "confirmed")}>Confirm</AdminButton>
        {appointment.status === "pending" ? (
          <AdminButton variant="ghost" onClick={() => onStatusChange(appointment.id, "reschedule_requested")}>
            Request Reschedule
          </AdminButton>
        ) : null}
      </div>
    );
  }

  if (appointment.status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-2">
        <AdminButton onClick={() => onOpenAppointment(appointment.id)}>Open Appointment</AdminButton>
        <AdminButton variant="ghost" onClick={() => onStatusChange(appointment.id, "reschedule_requested")}>Reschedule</AdminButton>
        <AdminButton variant="danger" onClick={() => onStatusChange(appointment.id, "cancelled")}>Cancel</AdminButton>
      </div>
    );
  }

  return <AdminButton onClick={() => onOpenAppointment(appointment.id)}>Open Appointment</AdminButton>;
}

export default function CoachingAdminCalendar({
  refreshToken,
  onChanged,
  onOpenAppointment,
  onStatusChange,
  onViewRequests,
}) {
  const initialDate = new Date();
  const [monthDate, setMonthDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [monthData, setMonthData] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(dateKeyFromDate(initialDate));
  const [daySlots, setDaySlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedMonthKey = monthKeyFromDate(monthDate);
  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const todayKey = dateKeyFromDate(new Date());

  const loadMonth = async () => {
    setLoading(true);
    const data = await coachingRepository.getAvailability(selectedMonthKey);
    setMonthData(data);
    setLoading(false);
  };

  const loadDay = async (dateKey = selectedDateKey) => {
    if (!dateKey) return;
    const slots = await coachingRepository.getAppointmentsForDate(dateKey);
    setDaySlots(slots);
  };

  useEffect(() => {
    loadMonth();
  }, [selectedMonthKey, refreshToken]);

  useEffect(() => {
    loadDay();
  }, [selectedDateKey, refreshToken]);

  const moveMonth = (amount) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + amount, 1);
    setMonthDate(next);
    setSelectedDateKey(`${monthKeyFromDate(next)}-01`);
  };

  const updateSlot = async (slot, status) => {
    try {
      await coachingRepository.updateAvailability(slot.dateKey, slot.id, status, {
        reason: status === "hold" ? "Admin hold" : "Blocked by admin",
      });
      toast.success(status === "available" ? "Slot reopened." : "Slot availability updated.");
      await Promise.all([loadMonth(), loadDay(slot.dateKey)]);
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to update the slot.");
    }
  };

  const toggleDateBlock = async () => {
    const isBlocked = Boolean(monthData?.dateBlocks?.[selectedDateKey]);
    try {
      if (isBlocked) {
        await coachingRepository.unblockDate(selectedDateKey);
        toast.success("Date reopened.");
      } else {
        await coachingRepository.blockDate(selectedDateKey, "Blocked by coaching admin");
        toast.success("Entire date blocked.");
      }
      await Promise.all([loadMonth(), loadDay(selectedDateKey)]);
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to update the date.");
    }
  };

  const copyDaySchedule = async () => {
    const lines = daySlots.map((slot) => {
      const member = slot.appointment?.member?.displayName;
      return `${formatTime(slot.startTime)} — ${SLOT_STATUS_LABELS[slot.status] || slot.status}${member ? ` · ${member}` : ""}`;
    });
    try {
      await navigator.clipboard.writeText(`${formatDate(selectedDateKey)}\n${lines.join("\n")}`);
      toast.success("Day schedule copied.");
    } catch {
      toast.error("Clipboard access is unavailable.");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">Monthly operations</p>
            <h2 className="mt-1 text-xl font-black text-white">
              {new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(monthDate)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
              {day}
            </div>
          ))}
          {calendarDays.map((date) => (
            <CalendarDay
              key={date.toISOString()}
              date={date}
              selectedMonthKey={selectedMonthKey}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
              monthData={monthData}
              onSelect={setSelectedDateKey}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4">
          {[
            ["available", "Available"],
            ["attention", "Pending / partial"],
            ["confirmed", "Confirmed"],
            ["unavailable", "Blocked / unavailable"],
          ].map(([status, label]) => (
            <span key={status} className="inline-flex items-center gap-2 text-[9px] font-bold text-white/50">
              <span className={`h-2.5 w-2.5 rounded-full ${DAY_STATUS_STYLES[status]}`} />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className={`${panelClass} min-w-0 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-100/55">Selected day</p>
            <h2 className="mt-1 text-xl font-black text-white">{formatDate(selectedDateKey, { weekday: "long" })}</h2>
          </div>
          {monthData?.dateBlocks?.[selectedDateKey] ? (
            <span className="rounded-full border border-rose-300/20 bg-rose-300/[0.09] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-rose-100">
              Date blocked
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-2.5">
          {loading ? (
            <p className="py-8 text-center text-[12px] font-semibold text-white/45">Loading schedule...</p>
          ) : daySlots.length === 0 ? (
            <div className="rounded-[19px] border border-white/[0.07] bg-white/[0.03] p-5 text-[12px] font-semibold text-white/55">
              No generated slots for this date.
            </div>
          ) : (
            daySlots.map((slot) => (
              <article key={slot.id} className="rounded-[19px] border border-white/[0.075] bg-white/[0.03] p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-black text-white">{formatTime(slot.startTime)}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-300/55">
                      {SLOT_STATUS_LABELS[slot.status] || slot.status}
                      {slot.appointment?.member?.displayName ? ` · ${slot.appointment.member.displayName}` : ""}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold text-white/35">
                      Coach: {slot.coach?.displayName || "Unassigned"}
                    </p>
                  </div>
                  {slot.appointment ? <StatusBadge status={slot.appointment.status} /> : null}
                </div>
                {slot.blockReason ? (
                  <p className="mt-2 rounded-[12px] border border-white/[0.06] bg-black/[0.12] px-3 py-2 text-[9px] font-semibold text-white/50">
                    {slot.blockReason}
                  </p>
                ) : null}
                <div className="mt-3">
                  <SlotActions
                    slot={slot}
                    onOpenAppointment={onOpenAppointment}
                    onStatusChange={onStatusChange}
                    onSlotUpdate={updateSlot}
                  />
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 grid gap-2 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
          <AdminButton
            variant={monthData?.dateBlocks?.[selectedDateKey] ? "success" : "danger"}
            onClick={toggleDateBlock}
          >
            {monthData?.dateBlocks?.[selectedDateKey] ? <Unlock className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
            {monthData?.dateBlocks?.[selectedDateKey] ? "Reopen Entire Date" : "Block Entire Date"}
          </AdminButton>
          <AdminButton onClick={copyDaySchedule}>
            <Clipboard className="h-3.5 w-3.5" /> Copy Day Schedule
          </AdminButton>
          <AdminButton variant="ghost" onClick={onViewRequests} className="sm:col-span-2">
            <Eye className="h-3.5 w-3.5" /> View All Requests
          </AdminButton>
        </div>
      </section>
    </div>
  );
}
