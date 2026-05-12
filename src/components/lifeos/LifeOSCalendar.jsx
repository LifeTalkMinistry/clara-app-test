import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, Kicker } from "./LifeOSShared";

const STORAGE_KEY = "clara_lifeos_schedule_events_v1";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDateFromKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatReadableDate(dateKey) {
  return createDateFromKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getInitialEvents() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const billDate = new Date(today);
  billDate.setDate(today.getDate() + 3);

  return [
    {
      id: "sample-bill",
      date: toDateKey(billDate),
      time: "09:00",
      title: "Bill reminder",
      detail: "Review spending before this payment date.",
      type: "Money",
    },
    {
      id: "sample-checkin",
      date: todayKey,
      time: "20:00",
      title: "LifeOS check-in",
      detail: "Write what affected your spending decisions today.",
      type: "Personal",
    },
  ];
}

function loadStoredEvents() {
  if (typeof window === "undefined") return getInitialEvents();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialEvents();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getInitialEvents();

    return parsed.filter((item) => item?.id && item?.date && item?.title);
  } catch {
    return getInitialEvents();
  }
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [];

  for (let i = 0; i < startOffset; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    days.push({ day, dateKey: toDateKey(date) });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const eventTypes = ["Money", "Work", "Personal", "Family", "Growth"];

export default function LifeOSCalendar() {
  const todayKey = toDateKey(new Date());
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [events, setEvents] = useState(loadStoredEvents);
  const [form, setForm] = useState({ title: "", time: "", type: "Personal", detail: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Keep the calendar usable even if storage is unavailable.
    }
  }, [events]);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);

  const eventCountByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      acc[event.date] = (acc[event.date] || 0) + 1;
      return acc;
    }, {});
  }, [events]);

  const selectedEvents = useMemo(() => {
    return events
      .filter((event) => event.date === selectedDate)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  }, [events, selectedDate]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => event.date >= todayKey)
      .sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`))
      .slice(0, 3);
  }, [events, todayKey]);

  const changeMonth = (direction) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanTitle = form.title.trim();
    const cleanDetail = form.detail.trim();

    if (!cleanTitle) return;

    const newEvent = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: selectedDate,
      time: form.time,
      title: cleanTitle,
      detail: cleanDetail,
      type: form.type,
    };

    setEvents((current) => [...current, newEvent]);
    setForm({ title: "", time: "", type: "Personal", detail: "" });
  };

  const deleteEvent = (id) => {
    setEvents((current) => current.filter((event) => event.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-cyan-300/22 bg-[linear-gradient(135deg,rgba(17,94,89,.24),rgba(59,7,100,.32))]">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl border border-cyan-300/18 bg-cyan-300/[.06] text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,.12)]">
            <CalendarDays className="h-6 w-6" />
          </div>

          <div>
            <Kicker>Life schedule</Kicker>
            <h2 className="mt-3 text-xl font-black leading-tight text-white">
              Add what is coming, so CLARA can guide before pressure hits.
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Put schedules, bills, reminders, commitments, and details here. This is the timing layer of LifeOS.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-white/60 transition hover:bg-white/[.06] hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <Kicker>{formatMonth(monthDate)}</Kicker>
            <p className="mt-1 text-xs font-semibold text-white/45">Tap a date to add or view schedules</p>
          </div>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-white/60 transition hover:bg-white/[.06] hover:text-white active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-[.12em] text-white/34">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-11" />;
            }

            const selected = day.dateKey === selectedDate;
            const isToday = day.dateKey === todayKey;
            const count = eventCountByDate[day.dateKey] || 0;

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => setSelectedDate(day.dateKey)}
                aria-label={`Select ${day.dateKey}`}
                className={`relative grid h-11 place-items-center rounded-2xl border text-sm font-black transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${
                  selected
                    ? "border-cyan-300/60 bg-cyan-300/[.10] text-white shadow-[0_0_18px_rgba(34,211,238,.18),0_0_18px_rgba(236,72,153,.10)]"
                    : isToday
                      ? "border-pink-400/28 bg-pink-400/[.055] text-white/82"
                      : "border-white/8 bg-white/[.025] text-white/58 hover:border-cyan-300/20 hover:bg-white/[.045] hover:text-white"
                }`}
              >
                {day.day}
                {count ? (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {Array.from({ length: Math.min(count, 3) }).map((_, dotIndex) => (
                      <span key={dotIndex} className="h-1 w-1 rounded-full bg-cyan-200/80" />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="border-cyan-300/16 bg-[#060b1d]/62">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Kicker>Selected day</Kicker>
            <h3 className="mt-2 text-lg font-black text-white">{formatReadableDate(selectedDate)}</h3>
          </div>
          <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[.055] px-3 py-1 text-[11px] font-black uppercase tracking-[.14em] text-cyan-100/70">
            {selectedEvents.length} item{selectedEvents.length === 1 ? "" : "s"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Schedule title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Example: Pay electric bill"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/34 focus:bg-white/[.055]"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Time</span>
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/34 focus:bg-white/[.055]"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[150px_1fr]">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Type</span>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/34"
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Details</span>
              <input
                value={form.detail}
                onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="Add details CLARA should consider"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/34 focus:bg-white/[.055]"
              />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/24 bg-cyan-300/[.08] px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/[.12] active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            <Plus className="h-4 w-4" />
            Add schedule
          </button>
        </form>
      </Card>

      <Card>
        <Kicker>Schedule details</Kicker>
        <div className="mt-4 space-y-3">
          {selectedEvents.length ? (
            selectedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-[22px] border border-white/9 bg-white/[.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-300/16 bg-cyan-300/[.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-cyan-100/70">
                        {event.type}
                      </span>
                      {event.time ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/48">
                          <Clock3 className="h-3.5 w-3.5" />
                          {event.time}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-base font-black text-white">{event.title}</h3>
                    {event.detail ? (
                      <p className="mt-2 flex gap-2 text-sm leading-6 text-white/58">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100/56" />
                        {event.detail}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteEvent(event.id)}
                    aria-label={`Delete ${event.title}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-white/42 transition hover:border-pink-400/24 hover:bg-pink-400/[.07] hover:text-pink-100 active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[.025] p-4 text-sm leading-6 text-white/50">
              No schedule for this day yet. Add one above so CLARA can understand your timing pressure.
            </div>
          )}
        </div>
      </Card>

      <Card className="border-pink-400/16 bg-[linear-gradient(135deg,rgba(17,94,89,.12),rgba(59,7,100,.22))]">
        <Kicker>Upcoming</Kicker>
        <div className="mt-4 space-y-2.5">
          {upcomingEvents.length ? (
            upcomingEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedDate(event.date);
                  setMonthDate(createDateFromKey(event.date));
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[.026] px-3.5 py-3 text-left transition hover:border-cyan-300/20 hover:bg-white/[.045] active:scale-[.99]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/[.04] text-cyan-100/74">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{event.title}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-white/42">
                    {formatReadableDate(event.date)} {event.time ? `• ${event.time}` : ""}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm leading-6 text-white/50">No upcoming schedules yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
