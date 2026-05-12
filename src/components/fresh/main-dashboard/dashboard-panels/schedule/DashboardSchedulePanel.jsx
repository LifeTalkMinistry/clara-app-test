import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const STORAGE_PREFIX = "clara_schedule_events_v2";
const TYPES = ["Bill", "Payday", "Health", "Work", "Family", "Relationship", "Personal"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateKey(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(key) {
  return fromDateKey(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStorageKey(user) {
  return `${STORAGE_PREFIX}_${user?.id || user?.email || "guest"}`;
}

function seedEvents() {
  const today = new Date();

  return [
    {
      id: "sample-reset",
      title: "Spending reset",
      date: toDateKey(today),
      time: "",
      type: "Personal",
      amount: "",
      note: "Simple check-in. Keep today intentional.",
    },
    {
      id: "sample-bill",
      title: "Bill protection",
      date: toDateKey(addDays(today, 3)),
      time: "09:00",
      type: "Bill",
      amount: "",
      note: "Protect money before this payment date.",
    },
    {
      id: "sample-payday",
      title: "Payday planning",
      date: toDateKey(addDays(today, 7)),
      time: "",
      type: "Payday",
      amount: "",
      note: "Plan before confidence spending starts.",
    },
  ];
}

function readEvents(user) {
  if (typeof window === "undefined") return seedEvents();

  try {
    const raw = window.localStorage.getItem(getStorageKey(user));
    const legacy = window.localStorage.getItem("clara_lifeos_schedule_events_v1");
    const parsed = raw ? JSON.parse(raw) : legacy ? JSON.parse(legacy) : null;

    if (!Array.isArray(parsed) || parsed.length === 0) return seedEvents();
    return parsed.filter((event) => event?.id && event?.title && event?.date);
  } catch {
    return seedEvents();
  }
}

function saveEvents(user, events) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(user), JSON.stringify(events));
  } catch {
    // Local schedule memory is optional.
  }
}

function cleanMoney(value) {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function isMoneyEvent(event) {
  const type = String(event?.type || "").toLowerCase();
  return Boolean(event?.amount) || type === "bill" || type === "payday" || type === "money";
}

function displayTitle(event) {
  const title = String(event?.title || "Schedule").trim();
  const lower = title.toLowerCase();
  const type = String(event?.type || "").toLowerCase();

  if (lower.includes("lifeos check")) return "Spending reset";
  if (lower.includes("bill reminder")) return "Bill protection";
  if (lower.includes("rent")) return "Rent protection";
  if (lower.includes("payday")) return "Payday planning";
  if (lower.includes("grocery")) return "Grocery reset";
  if (type === "bill" && !lower.includes("protection")) return `${title} protection`;
  if (type === "payday" && !lower.includes("planning")) return `${title} planning`;

  return title;
}

function impactMessage(event) {
  if (!event) {
    return "No upcoming money-impact schedule yet. Add bills, payday, or expected costs so CLARA can warn you ahead.";
  }

  const amountText = event.amount ? ` Around ₱${event.amount} may be involved.` : "";
  return `${displayTitle(event)} is coming on ${formatDate(event.date)}.${amountText} Prepare before it affects optional spending.`;
}

function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ day, key: toDateKey(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function TypeIcon({ event }) {
  const type = String(event?.type || "").toLowerCase();
  const Icon = type === "payday" ? WalletCards : isMoneyEvent(event) ? CreditCard : CalendarDays;
  return <Icon className="h-4 w-4" />;
}

function Header({ monthLabel, onAdd }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,.74),rgba(16,24,55,.86)_48%,rgba(55,24,100,.78))] p-3.5 shadow-[0_16px_38px_rgba(0,0,0,.20)]">
      <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 -bottom-14 h-40 w-40 rounded-full bg-fuchsia-400/12 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-100/70">Schedule</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white">Your time affects your money.</h2>
          <p className="mt-1.5 max-w-[270px] text-xs leading-5 text-white/58">
            One month view. See what is coming before it becomes spending pressure.
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/18 bg-white/[.055] px-2.5 py-1.5 text-[11px] font-black text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,.65)]" />
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.08] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.12)] transition active:scale-95"
            aria-label="Add schedule"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ImpactCard({ event, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => event && onOpen(event)}
      className="relative w-full overflow-hidden rounded-[26px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,83,93,.28),rgba(18,24,63,.68)_50%,rgba(70,22,104,.42))] p-4 text-left shadow-[0_14px_34px_rgba(0,0,0,.18)] transition active:scale-[.99]"
    >
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-300/11 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-400/11 blur-3xl" />

      <div className="relative flex gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/18 bg-cyan-300/[.055] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.11)]">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-100/70">Money impact</p>
            <span className="rounded-full border border-white/12 bg-white/[.055] px-3 py-1 text-[10px] font-black uppercase tracking-[.13em] text-white/52">
              {event ? "Upcoming" : "Clear"}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black leading-tight text-white">
            {event ? displayTitle(event) : "No money-impact schedule ahead."}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{impactMessage(event)}</p>
        </div>
      </div>
    </button>
  );
}

function CalendarMonth({ monthDate, cells, selectedDate, todayKey, byDate, onSelect, onPrev, onNext }) {
  return (
    <section className="rounded-[28px] border border-white/12 bg-white/[.03] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,.16)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onPrev} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] text-white/56 transition active:scale-95" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-white">{formatMonth(monthDate)}</p>
          <p className="mt-1 text-[10px] font-bold text-white/38">Tap a day to view or add</p>
        </div>
        <button type="button" onClick={onNext} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] text-white/56 transition active:scale-95" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[9px] font-black uppercase tracking-[.08em] text-white/34">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className="min-h-[48px]" />;

          const events = byDate[cell.key] || [];
          const hasMoney = events.some(isMoneyEvent);
          const hasAny = events.length > 0;
          const selected = cell.key === selectedDate;
          const today = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={`relative flex min-h-[48px] flex-col items-center justify-center rounded-2xl border text-sm font-black transition active:scale-[.96] ${
                selected
                  ? "border-cyan-300/55 bg-cyan-300/[.11] text-white shadow-[0_0_18px_rgba(34,211,238,.15)]"
                  : today
                    ? "border-cyan-300/30 bg-cyan-300/[.07] text-white"
                    : hasMoney
                      ? "border-fuchsia-300/20 bg-fuchsia-300/[.05] text-white/78"
                      : hasAny
                        ? "border-white/10 bg-white/[.035] text-white/62"
                        : "border-white/7 bg-white/[.018] text-white/38 hover:bg-white/[.04]"
              }`}
              aria-label={`Select ${cell.key}`}
            >
              {cell.day}
              {hasAny ? (
                <span className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${hasMoney ? "bg-fuchsia-200" : "bg-cyan-200/75"}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-white/38">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-fuchsia-200" /> Money impact</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-200/75" /> Schedule</span>
      </div>
    </section>
  );
}

function SelectedDay({ date, events, onAdd, onOpen }) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/[.028] p-4 shadow-[0_12px_28px_rgba(0,0,0,.13)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">Selected day</p>
          <p className="mt-1 text-sm font-black text-white">{formatDate(date)}</p>
        </div>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-300/[.07] px-3 py-2 text-xs font-black text-cyan-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {events.length ? events.map((event) => (
          <button key={event.id} type="button" onClick={() => onOpen(event)} className="group flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/[.035] px-3.5 py-3 text-left transition hover:border-cyan-300/20 hover:bg-white/[.052] active:scale-[.99]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[.045] text-cyan-100/75"><TypeIcon event={event} /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{displayTitle(event)}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-white/42">
                {event.time ? `${event.time} • ` : ""}{event.amount ? `₱${event.amount} impact` : event.type}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:text-cyan-100/60" />
          </button>
        )) : (
          <button type="button" onClick={onAdd} className="w-full rounded-[22px] border border-dashed border-white/12 bg-white/[.02] px-4 py-4 text-left text-sm leading-6 text-white/48">
            No schedule on this day. Add one if something may affect your money or plans.
          </button>
        )}
      </div>
    </section>
  );
}

function Sheet({ event, mode, form, setForm, onSave, onRemove, onClose }) {
  useEffect(() => {
    if (!mode) return undefined;
    const onKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;
  const adding = mode === "add";

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[520px] rounded-[30px] border border-cyan-300/18 bg-[#071026]/96 p-5 shadow-[0_22px_80px_rgba(0,0,0,.55),0_0_38px_rgba(34,211,238,.10)] backdrop-blur-2xl" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.22em] text-cyan-100/70">{adding ? "Schedule" : event?.type}</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{adding ? "Add schedule" : displayTitle(event)}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        {adding ? (
          <form onSubmit={onSave} className="mt-5 space-y-3">
            <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Schedule title" className="w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32" />
              <input type="time" value={form.time} onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32">
                {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <input value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} inputMode="numeric" placeholder="₱ impact" className="w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32" />
            </div>
            <textarea value={form.note} onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))} placeholder="Details CLARA should consider" rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32" />
            <button type="submit" className="w-full rounded-2xl border border-cyan-300/22 bg-cyan-300/[.09] px-4 py-3 text-sm font-black text-cyan-50">Save schedule</button>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3">
              <p className="text-xs font-bold text-cyan-100/60">{formatDate(event.date)} {event.time ? `• ${event.time}` : ""}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{event.note || impactMessage(event)}</p>
            </div>
            {isMoneyEvent(event) ? (
              <div className="rounded-2xl border border-fuchsia-400/14 bg-fuchsia-400/[.055] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-fuchsia-100/62">Money impact</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">{impactMessage(event)}</p>
              </div>
            ) : null}
            <button type="button" onClick={() => onRemove(event.id)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-black text-white/58">
              <Trash2 className="h-4 w-4" /> Remove schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardSchedulePanel() {
  const { user } = useUserRole() || {};
  const today = toDateKey(new Date());
  const [events, setEvents] = useState(() => readEvents(user));
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ title: "", date: today, time: "", type: "Personal", amount: "", note: "" });

  useEffect(() => setEvents(readEvents(user)), [user?.id, user?.email]);
  useEffect(() => saveEvents(user, events), [events, user]);

  const sorted = useMemo(() => [...events].sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`)), [events]);
  const byDate = useMemo(() => {
    return sorted.reduce((acc, event) => {
      acc[event.date] = [...(acc[event.date] || []), event];
      return acc;
    }, {});
  }, [sorted]);
  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const selectedEvents = byDate[selectedDate] || [];
  const nextMoneyEvent = useMemo(() => sorted.find((event) => event.date >= today && isMoneyEvent(event)), [sorted, today]);

  const openAdd = (date = selectedDate) => {
    setForm({ title: "", date, time: "", type: "Personal", amount: "", note: "" });
    setSelectedEvent(null);
    setMode("add");
  };

  const openEvent = (event) => {
    setSelectedEvent(event);
    setMode("event");
  };

  const close = () => {
    setMode(null);
    setSelectedEvent(null);
  };

  const save = (submitEvent) => {
    submitEvent.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        date: form.date || selectedDate,
        time: form.time,
        type: form.type,
        amount: cleanMoney(form.amount),
        note: form.note.trim(),
      },
    ]);
    close();
  };

  const remove = (id) => {
    setEvents((current) => current.filter((event) => event.id !== id));
    close();
  };

  return (
    <div className="space-y-3.5">
      <Header monthLabel={formatMonth(monthDate)} onAdd={() => openAdd()} />
      <ImpactCard event={nextMoneyEvent} onOpen={openEvent} />
      <CalendarMonth
        monthDate={monthDate}
        cells={cells}
        selectedDate={selectedDate}
        todayKey={today}
        byDate={byDate}
        onSelect={setSelectedDate}
        onPrev={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        onNext={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
      />
      <SelectedDay date={selectedDate} events={selectedEvents} onAdd={() => openAdd(selectedDate)} onOpen={openEvent} />
      <Sheet event={selectedEvent} mode={mode} form={form} setForm={setForm} onSave={save} onRemove={remove} onClose={close} />
    </div>
  );
}
