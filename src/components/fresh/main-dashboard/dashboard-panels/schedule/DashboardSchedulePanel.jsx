import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Sparkles,
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

    const cleaned = parsed.filter((event) => {
      const title = String(event?.title || "").toLowerCase();
      const isOldSampleCheckin =
        event?.id === "sample-reset" ||
        event?.id === "sample-checkin" ||
        title.includes("lifeos check-in");

      return event?.id && event?.title && event?.date && !isOldSampleCheckin;
    });

    return cleaned.length ? cleaned : seedEvents();
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

  if (lower.includes("bill reminder")) return "Bill protection";
  if (lower.includes("rent")) return "Rent protection";
  if (lower.includes("payday")) return "Payday planning";
  if (lower.includes("grocery")) return "Grocery reset";
  if (type === "bill" && !lower.includes("protection")) return `${title} protection`;
  if (type === "payday" && !lower.includes("planning")) return `${title} planning`;

  return title;
}

function impactMessage(event) {
  if (!event) return "Nothing money-sensitive is attached to this day yet.";

  const amountText = event.amount ? ` Around ₱${event.amount} may be involved.` : "";
  return `${displayTitle(event)} is scheduled on ${formatDate(event.date)}.${amountText} Prepare before it affects optional spending.`;
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

function isSameMonth(event, monthDate) {
  const eventDate = fromDateKey(event?.date);
  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}

function getSelectedAgenda({ selectedDate, todayKey, events }) {
  const moneyEvent = events.find(isMoneyEvent);
  const firstEvent = events[0];
  const isToday = selectedDate === todayKey;

  if (moneyEvent) {
    return {
      event: moneyEvent,
      label: isToday ? "Today impact" : "Money impact",
      badge: "Watch",
      title: displayTitle(moneyEvent),
      body: impactMessage(moneyEvent),
      icon: CreditCard,
      clickable: true,
    };
  }

  if (firstEvent) {
    return {
      event: firstEvent,
      label: isToday ? "Today agenda" : "Selected agenda",
      badge: "Planned",
      title: displayTitle(firstEvent),
      body: "This schedule has no money impact yet. Add a ₱ impact if CLARA should watch it financially.",
      icon: CalendarDays,
      clickable: true,
    };
  }

  return {
    event: null,
    label: isToday ? "Today agenda" : "Selected day",
    badge: "Clear",
    title: isToday ? "No agenda today." : "No agenda on this day.",
    body: isToday
      ? "Nothing to watch out for today. You can breathe and keep your spending simple."
      : "No schedule is attached here yet. Add one if this day may affect your money or plans.",
    icon: CalendarDays,
    clickable: false,
  };
}

function getMonthlyInsight({ sortedEvents, monthDate, todayKey }) {
  const monthEvents = sortedEvents.filter((event) => isSameMonth(event, monthDate));
  const moneyEvents = monthEvents.filter(isMoneyEvent);
  const nextMoneyEvent = sortedEvents.find((event) => event.date >= todayKey && isMoneyEvent(event));
  const paydayEvent = monthEvents.find((event) => String(event?.type || "").toLowerCase() === "payday");
  const relationshipEvent = monthEvents.find((event) => {
    const text = `${event?.title || ""} ${event?.type || ""} ${event?.note || ""}`.toLowerCase();
    return text.includes("date") || text.includes("relationship") || text.includes("partner") || text.includes("family");
  });

  if (moneyEvents.length >= 3) {
    return {
      icon: CreditCard,
      badge: "Heavy month",
      title: "Several money-impact moments.",
      body: `CLARA sees ${moneyEvents.length} money-sensitive schedules. Give them space before optional spending.`,
    };
  }

  if (nextMoneyEvent) {
    return {
      icon: CreditCard,
      badge: "Prepare early",
      title: `Next pressure: ${displayTitle(nextMoneyEvent)}.`,
      body: `Scheduled for ${formatDate(nextMoneyEvent.date)}. Keep it in mind before casual spending.`,
    };
  }

  if (paydayEvent) {
    return {
      icon: WalletCards,
      badge: "Payday rhythm",
      title: "Payday is part of this month.",
      body: "Plan the first move before confidence spending starts.",
    };
  }

  if (relationshipEvent) {
    return {
      icon: CalendarDays,
      badge: "Intentional time",
      title: "Meaningful schedule detected.",
      body: "Make it intentional, not impulsive.",
    };
  }

  if (monthEvents.length >= 6) {
    return {
      icon: CalendarDays,
      badge: "Busy month",
      title: "This month may feel crowded.",
      body: "Slow money decisions on busy weeks.",
    };
  }

  if (monthEvents.length === 0) {
    return {
      icon: Sparkles,
      badge: "Breathing room",
      title: "Your month looks breathable.",
      body: "Add bills, payday, or expected costs when ready.",
    };
  }

  return {
    icon: Sparkles,
    badge: "Light month",
    title: "Your schedule looks manageable.",
    body: "Nothing financially heavy right now.",
  };
}

function AgendaCard({ agenda, onOpen }) {
  const Icon = agenda.icon;

  return (
    <button
      type="button"
      onClick={() => agenda.event && onOpen(agenda.event)}
      disabled={!agenda.clickable}
      className="relative w-full overflow-hidden rounded-[26px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,83,93,.28),rgba(18,24,63,.68)_50%,rgba(70,22,104,.42))] p-4 text-left shadow-[0_14px_34px_rgba(0,0,0,.18)] transition active:scale-[.99] disabled:cursor-default"
    >
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-300/11 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-400/11 blur-3xl" />

      <div className="relative flex gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/18 bg-cyan-300/[.055] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.11)]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-100/70">{agenda.label}</p>
            <span className="rounded-full border border-white/12 bg-white/[.055] px-3 py-1 text-[10px] font-black uppercase tracking-[.13em] text-white/52">
              {agenda.badge}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black leading-tight text-white">{agenda.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{agenda.body}</p>
        </div>
      </div>
    </button>
  );
}

function CalendarMonth({ monthDate, cells, selectedDate, todayKey, byDate, onSelect, onPrev, onNext, onAdd }) {
  return (
    <section className="rounded-[28px] border border-white/12 bg-white/[.03] p-3.5 shadow-[0_14px_34px_rgba(0,0,0,.16)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] text-white/56 transition active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="text-sm font-black text-white">{formatMonth(monthDate)}</p>
          <p className="mt-1 text-[10px] font-bold text-white/38">Tap a day to view or add</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/[.07] text-cyan-50 transition active:scale-95"
            aria-label="Add schedule"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] text-white/56 transition active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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

function MonthlyInsightCard({ insight }) {
  const Icon = insight.icon;

  return (
    <section className="rounded-[20px] border border-white/8 bg-white/[.022] px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,.10)]">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.035] text-cyan-100/62">
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/34">CLARA observation</p>
            <span className="rounded-full border border-white/8 bg-white/[.035] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.1em] text-white/38">
              {insight.badge}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-white/58">
            <span className="font-black text-white/78">{insight.title}</span> {insight.body}
          </p>
        </div>
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[30px] border border-cyan-300/18 bg-[#071026]/96 p-5 shadow-[0_22px_80px_rgba(0,0,0,.55),0_0_38px_rgba(34,211,238,.10)] backdrop-blur-2xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.22em] text-cyan-100/70">
              {adding ? "Schedule" : event?.type}
            </p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">
              {adding ? "Add schedule" : displayTitle(event)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {adding ? (
          <form onSubmit={onSave} className="mt-5 space-y-3">
            <input
              value={form.title}
              onChange={(eventChange) => setForm((current) => ({ ...current, title: eventChange.target.value }))}
              placeholder="Schedule title"
              className="w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(eventChange) => setForm((current) => ({ ...current, date: eventChange.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32"
              />
              <input
                type="time"
                value={form.time}
                onChange={(eventChange) => setForm((current) => ({ ...current, time: eventChange.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.type}
                onChange={(eventChange) => setForm((current) => ({ ...current, type: eventChange.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32"
              >
                {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <input
                value={form.amount}
                onChange={(eventChange) => setForm((current) => ({ ...current, amount: eventChange.target.value }))}
                inputMode="numeric"
                placeholder="₱ impact"
                className="w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
              />
            </div>
            <textarea
              value={form.note}
              onChange={(eventChange) => setForm((current) => ({ ...current, note: eventChange.target.value }))}
              placeholder="Details CLARA should consider"
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
            />
            <button type="submit" className="w-full rounded-2xl border border-cyan-300/22 bg-cyan-300/[.09] px-4 py-3 text-sm font-black text-cyan-50">
              Save schedule
            </button>
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
            <button
              type="button"
              onClick={() => onRemove(event.id)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-black text-white/58"
            >
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

  const sorted = useMemo(
    () => [...events].sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`)),
    [events]
  );

  const byDate = useMemo(() => {
    return sorted.reduce((acc, event) => {
      acc[event.date] = [...(acc[event.date] || []), event];
      return acc;
    }, {});
  }, [sorted]);

  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const selectedEvents = byDate[selectedDate] || [];
  const selectedAgenda = useMemo(
    () => getSelectedAgenda({ selectedDate, todayKey: today, events: selectedEvents }),
    [selectedDate, selectedEvents, today]
  );
  const monthlyInsight = useMemo(
    () => getMonthlyInsight({ sortedEvents: sorted, monthDate, todayKey: today }),
    [sorted, monthDate, today]
  );

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
      <AgendaCard agenda={selectedAgenda} onOpen={openEvent} />
      <CalendarMonth
        monthDate={monthDate}
        cells={cells}
        selectedDate={selectedDate}
        todayKey={today}
        byDate={byDate}
        onSelect={setSelectedDate}
        onAdd={() => openAdd(selectedDate)}
        onPrev={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        onNext={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
      />
      <MonthlyInsightCard insight={monthlyInsight} />
      <Sheet event={selectedEvent} mode={mode} form={form} setForm={setForm} onSave={save} onRemove={remove} onClose={close} />
    </div>
  );
}
