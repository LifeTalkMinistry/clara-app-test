import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  HeartHandshake,
  MessageCircle,
  PiggyBank,
  Plus,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const STORAGE_PREFIX = "clara_schedule_events_v1";

const EVENT_TYPES = ["Bill", "Payday", "Health", "Work", "Family", "Relationship", "Personal"];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDateFromKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
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

function formatShortDate(dateKey) {
  return createDateFromKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimelineDate(dateKey) {
  return createDateFromKey(dateKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
}

function getStorageKey(user) {
  return `${STORAGE_PREFIX}_${user?.id || user?.email || "guest"}`;
}

function getInitialEvents() {
  const today = new Date();

  return [
    {
      id: "sample-rest-day",
      title: "Rest Day",
      date: toDateKey(today),
      time: "",
      type: "Personal",
      amount: "",
      note: "Keep the day light and avoid emotional spending.",
    },
    {
      id: "sample-grocery-reset",
      title: "Grocery Window",
      date: toDateKey(addDays(today, 2)),
      time: "",
      type: "Personal",
      amount: "800",
      note: "Prepare food money before convenience spending starts.",
    },
    {
      id: "sample-payday",
      title: "Payday",
      date: toDateKey(addDays(today, 6)),
      time: "",
      type: "Payday",
      amount: "",
      note: "Plan before confidence spending begins.",
    },
    {
      id: "sample-rent-due",
      title: "Rent Due",
      date: toDateKey(addDays(today, 9)),
      time: "09:00",
      type: "Bill",
      amount: "",
      note: "Protect this before optional spending.",
    },
  ];
}

function readSchedule(user) {
  if (typeof window === "undefined") return getInitialEvents();

  try {
    const raw = window.localStorage.getItem(getStorageKey(user));
    const legacy = window.localStorage.getItem("clara_lifeos_schedule_events_v1");
    const parsed = raw ? JSON.parse(raw) : legacy ? JSON.parse(legacy) : null;

    if (!Array.isArray(parsed) || parsed.length === 0) return getInitialEvents();

    return parsed.filter((event) => event?.id && event?.title && event?.date);
  } catch {
    return getInitialEvents();
  }
}

function saveSchedule(user, events) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(user), JSON.stringify(events));
  } catch {
    // Local schedule memory is optional.
  }
}

function isMoneyEvent(event) {
  const type = String(event?.type || "").toLowerCase();
  return Boolean(event?.amount) || ["bill", "payday", "money"].includes(type);
}

function getDisplayEventTitle(event) {
  const title = String(event?.title || "Schedule").trim();
  const lower = title.toLowerCase();
  const type = String(event?.type || "").toLowerCase();

  if (lower.includes("lifeos check")) return "Spending reset";
  if (lower.includes("bill reminder")) return "Bill protection";
  if (lower.includes("rent")) return "Rent protection";
  if (lower.includes("payday")) return "Payday planning";
  if (lower.includes("grocery")) return "Grocery reset";
  if (lower.includes("rest")) return "Rest & recovery";
  if (type === "bill") return `${title} protection`;
  if (type === "payday") return `${title} planning`;

  return title;
}

function getEventMeaning(event) {
  const type = String(event?.type || "").toLowerCase();
  if (type === "bill" || type === "money") return "Protect money before this date.";
  if (type === "payday") return "Plan before confidence spending starts.";
  if (type === "health") return "Energy affects spending choices.";
  if (type === "relationship") return "Make it meaningful, not impulsive.";
  if (type === "family") return "Responsibility may affect flexibility.";
  if (event?.amount) return `Prepare around ₱${event.amount}.`;
  return event?.note || "A future moment CLARA should consider.";
}

function getScheduleClimate({ todayEvents, nextSevenDays }) {
  const todayMoneyEvents = todayEvents.filter(isMoneyEvent).length;
  const weekMoneyEvents = nextSevenDays.filter(isMoneyEvent).length;

  if (todayEvents.length >= 2 || todayMoneyEvents >= 1 || weekMoneyEvents >= 3) {
    return {
      label: "High Spending Risk",
      tone: "Pressure nearby",
      icon: CreditCard,
      body: "Money-sensitive moments are close together. Keep decisions planned, not emotional.",
      detail: [
        "Multiple commitments can make small spending feel harmless.",
        "Money-sensitive events deserve space before optional purchases.",
        "CLARA is using your schedule to warn before pressure becomes spending.",
      ],
    };
  }

  if (todayEvents.length === 0 && nextSevenDays.length <= 1) {
    return {
      label: "Steady Day",
      tone: "Calm timing",
      icon: Sparkles,
      body: "Your schedule looks light today. Keep your money rhythm simple.",
      detail: [
        "No heavy schedule pressure is visible today.",
        "Calm days are good for reviewing plans before stress arrives.",
        "Use this space to prepare, not to create new pressure.",
      ],
    };
  }

  return {
    label: "Focused Day",
    tone: "Stay aware",
    icon: CalendarDays,
    body: "There are moments to watch, but nothing needs to feel heavy right now.",
    detail: [
      "Your schedule has activity, but not enough to call it high pressure.",
      "This is a good time to reserve money calmly.",
      "A small preparation today can prevent stressful spending later.",
    ],
  };
}

function getGuidance({ climate, nextMoneyEvent }) {
  if (nextMoneyEvent) {
    return `Prepare for ${getDisplayEventTitle(nextMoneyEvent)}. Keep money intentional before ${formatShortDate(nextMoneyEvent.date)}.`;
  }

  if (climate.label === "High Spending Risk") {
    return "Delay unnecessary spending today. Let your schedule breathe first.";
  }

  if (climate.label === "Steady Day") {
    return "Good day to review upcoming plans before they become pressure.";
  }

  return "Lower pressure before the next commitment. Spend with timing in mind.";
}

function TypeIcon({ type, className = "h-4 w-4" }) {
  const normalized = String(type || "").toLowerCase();
  const Icon = normalized === "bill" || normalized === "money"
    ? CreditCard
    : normalized === "payday"
      ? WalletCards
      : normalized === "health"
        ? HeartHandshake
        : normalized === "relationship"
          ? HeartHandshake
          : normalized === "family"
            ? PiggyBank
            : CalendarDays;

  return <Icon className={className} />;
}

function ScheduleHeader({ monthLabel, onAdd }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.74),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-3.5 shadow-[0_16px_38px_rgba(0,0,0,0.20)]">
      <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 -bottom-14 h-38 w-38 rounded-full bg-fuchsia-400/12 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Schedule</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white">Your time affects your money.</h2>
          <p className="mt-1.5 max-w-[260px] text-xs leading-5 text-white/58">
            See upcoming moments before they become spending pressure.
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/18 bg-white/[0.055] px-2.5 py-1.5 text-[11px] font-black text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,.65)]" />
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.12)] transition active:scale-95"
            aria-label="Add schedule"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ScheduleTabs({ activeTab, setActiveTab }) {
  return (
    <div className="grid grid-cols-2 rounded-[22px] border border-white/12 bg-white/[0.03] p-0.5 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
      {["today", "upcoming"].map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-[18px] px-4 py-2 text-xs font-black capitalize transition active:scale-[0.99] ${
              active
                ? "border border-cyan-300/22 bg-cyan-300/[0.095] text-white shadow-[0_0_18px_rgba(34,211,238,0.11),0_0_14px_rgba(236,72,153,0.07)]"
                : "text-white/42 hover:bg-white/[0.04] hover:text-white/70"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function MiniCalendarStrip({ days, eventsByDate, todayKey, onSelectDate }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.028] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">7-day view</p>
        <p className="text-[11px] font-bold text-white/38">Dots mean something is coming</p>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const isToday = dateKey === todayKey;
          const count = eventsByDate[dateKey] || 0;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-2xl border transition active:scale-[0.96] ${
                isToday
                  ? "border-cyan-300/32 bg-cyan-300/[0.08] text-white shadow-[0_0_16px_rgba(34,211,238,.11)]"
                  : count
                    ? "border-fuchsia-300/18 bg-fuchsia-300/[0.045] text-white/72"
                    : "border-white/8 bg-white/[0.02] text-white/42 hover:bg-white/[0.04]"
              }`}
              aria-label={`Open ${dateKey}`}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.08em]">{formatDayLabel(date)}</span>
              <span className="mt-1 text-sm font-black">{date.getDate()}</span>
              {count ? (
                <span className="absolute bottom-1.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                    <span key={index} className="h-1 w-1 rounded-full bg-cyan-200/80" />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TodayClimateCard({ climate, onOpen }) {
  const Icon = climate.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-[26px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,83,93,.32),rgba(18,24,63,.70)_50%,rgba(70,22,104,.44))] p-4 text-left shadow-[0_16px_38px_rgba(0,0,0,0.22)] transition hover:border-cyan-300/30 hover:bg-white/[0.04] active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-300/11 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-400/11 blur-3xl motion-safe:animate-pulse" />

      <div className="relative flex items-center justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Today climate</p>
        <span className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/52">
          {climate.tone}
        </span>
      </div>

      <div className="relative mt-4 flex items-start gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/18 bg-cyan-300/[0.055] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.11)] transition group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black leading-tight text-white">{climate.label}</h3>
          <p className="mt-2 text-sm leading-6 text-white/58">{climate.body}</p>
          <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/62">
            Understand timing
            <ChevronRight className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>
    </button>
  );
}

function EventStrip({ events, onOpen, onAdd }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Coming up</p>
        <button type="button" onClick={onAdd} className="text-xs font-black text-cyan-100/62">Add</button>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 pb-1">
          {events.slice(0, 8).map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpen(event)}
              className="min-w-[146px] rounded-[22px] border border-white/10 bg-white/[0.033] p-3.5 text-left shadow-[0_12px_26px_rgba(0,0,0,0.13)] transition hover:border-cyan-300/22 hover:bg-white/[0.052] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-cyan-100/75">
                  <TypeIcon type={event.type} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">{formatShortDate(event.date)}</span>
              </div>
              <p className="mt-3 truncate text-sm font-black text-white">{getDisplayEventTitle(event)}</p>
              <p className="mt-1 truncate text-xs font-semibold text-white/42">{event.amount ? `₱${event.amount} impact` : getEventMeaning(event)}</p>
            </button>
          ))}

          {events.length === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="min-w-[180px] rounded-[24px] border border-dashed border-white/14 bg-white/[0.025] p-4 text-left text-sm leading-6 text-white/50"
            >
              Add your first schedule so CLARA can see what is coming.
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GuidanceCard({ guidance, onAsk }) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-fuchsia-400/16 bg-[linear-gradient(135deg,rgba(8,83,93,.18),rgba(36,17,78,.50),rgba(72,12,105,.32))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
      <div className="pointer-events-none absolute -right-12 -bottom-16 h-36 w-36 rounded-full bg-fuchsia-400/12 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Daily guidance</p>
          <h3 className="mt-2.5 text-lg font-black leading-tight text-white">Prepare before pressure.</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{guidance}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/[0.055] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,.12)]">
          <MessageCircle className="h-5 w-5" />
        </div>
      </div>

      <button
        type="button"
        onClick={onAsk}
        className="relative mt-4 rounded-2xl border border-cyan-300/22 bg-cyan-300/[0.075] px-4 py-2.5 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.10)] transition active:scale-[0.98]"
      >
        Ask CLARA
      </button>
    </section>
  );
}

function Timeline({ events, onOpen, onAdd }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Upcoming timeline</p>
          <p className="mt-1 text-xs text-white/42">Future moments that may affect spending.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.07] px-3 py-2 text-xs font-black text-cyan-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="relative space-y-3 pl-4">
        <div className="absolute bottom-4 left-[7px] top-4 w-px bg-gradient-to-b from-cyan-300/45 via-white/12 to-fuchsia-400/35" />
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpen(event)}
            className="group relative w-full rounded-[24px] border border-white/10 bg-white/[0.033] p-4 text-left shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition hover:border-cyan-300/22 hover:bg-white/[0.055] active:scale-[0.99]"
          >
            <span className="absolute -left-[21px] top-6 h-3.5 w-3.5 rounded-full border border-cyan-200/60 bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,.45)]" />
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-cyan-100/75">
                <TypeIcon type={event.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-white">{getDisplayEventTitle(event)}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:text-cyan-100/65" />
                </div>
                <p className="mt-1 text-xs font-bold text-cyan-100/58">
                  {formatTimelineDate(event.date)} {event.time ? `• ${event.time}` : ""}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                  {event.note || getEventMeaning(event)}
                </p>
              </div>
            </div>
          </button>
        ))}

        {events.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="relative w-full rounded-[24px] border border-dashed border-white/12 bg-white/[0.025] p-4 text-left text-sm leading-6 text-white/50"
          >
            <span className="absolute -left-[21px] top-6 h-3.5 w-3.5 rounded-full border border-white/20 bg-white/20" />
            Add one upcoming moment to begin your schedule awareness.
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DetailSheet({ event, climate, mode, form, setForm, onSave, onDelete, onClose }) {
  useEffect(() => {
    if (!mode) return undefined;
    const onKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  const isAdd = mode === "add";
  const isClimate = mode === "climate";
  const title = isAdd ? "Add schedule" : isClimate ? climate.label : getDisplayEventTitle(event);

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
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
              {isAdd ? "Schedule" : isClimate ? "Today climate" : event?.type}
            </p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isAdd ? (
          <form onSubmit={onSave} className="mt-5 space-y-3">
            <input
              value={form.title}
              onChange={(eventChange) => setForm((current) => ({ ...current, title: eventChange.target.value }))}
              placeholder="Schedule title"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
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
                {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <input
                value={form.amount}
                onChange={(eventChange) => setForm((current) => ({ ...current, amount: eventChange.target.value }))}
                inputMode="numeric"
                placeholder="₱ impact"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
              />
            </div>
            <textarea
              value={form.note}
              onChange={(eventChange) => setForm((current) => ({ ...current, note: eventChange.target.value }))}
              placeholder="Details CLARA should consider"
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
            />
            <button type="submit" className="w-full rounded-2xl border border-cyan-300/22 bg-cyan-300/[0.09] px-4 py-3 text-sm font-black text-cyan-50">
              Save schedule
            </button>
          </form>
        ) : isClimate ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm leading-6 text-white/62">{climate.body}</p>
            {climate.detail.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm leading-5 text-white/68">
                {item}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
              <p className="text-xs font-bold text-cyan-100/60">{formatTimelineDate(event.date)} {event.time ? `• ${event.time}` : ""}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{event.note || getEventMeaning(event)}</p>
            </div>
            {event.amount ? (
              <div className="rounded-2xl border border-fuchsia-400/14 bg-fuchsia-400/[0.055] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-100/62">Money impact</p>
                <p className="mt-1 text-lg font-black text-white">₱{event.amount}</p>
              </div>
            ) : null}
            <button type="button" onClick={() => onDelete(event.id)} className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-white/58">
              Remove schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLifeOSPanel() {
  const { user } = useUserRole() || {};
  const todayKey = toDateKey(new Date());

  const [activeTab, setActiveTab] = useState("today");
  const [events, setEvents] = useState(() => readSchedule(user));
  const [sheetMode, setSheetMode] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({
    title: "",
    date: todayKey,
    time: "",
    type: "Personal",
    amount: "",
    note: "",
  });

  useEffect(() => {
    setEvents(readSchedule(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    saveSchedule(user, events);
  }, [events, user]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`));
  }, [events]);

  const todayEvents = useMemo(() => sortedEvents.filter((event) => event.date === todayKey), [sortedEvents, todayKey]);
  const upcomingEvents = useMemo(() => sortedEvents.filter((event) => event.date >= todayKey), [sortedEvents, todayKey]);
  const nextSevenDays = useMemo(() => {
    const endKey = toDateKey(addDays(new Date(), 7));
    return upcomingEvents.filter((event) => event.date <= endKey);
  }, [upcomingEvents]);
  const visibleDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(), index)), []);
  const eventsByDate = useMemo(() => {
    return sortedEvents.reduce((acc, event) => {
      acc[event.date] = (acc[event.date] || 0) + 1;
      return acc;
    }, {});
  }, [sortedEvents]);

  const climate = useMemo(() => getScheduleClimate({ todayEvents, nextSevenDays }), [todayEvents, nextSevenDays]);
  const nextMoneyEvent = useMemo(() => upcomingEvents.find(isMoneyEvent), [upcomingEvents]);
  const guidance = useMemo(() => getGuidance({ climate, nextMoneyEvent }), [climate, nextMoneyEvent]);

  const openAddSheet = (dateKey = todayKey) => {
    setForm({ title: "", date: dateKey, time: "", type: "Personal", amount: "", note: "" });
    setSelectedEvent(null);
    setSheetMode("add");
  };

  const openDateFromStrip = (dateKey) => {
    const firstEvent = sortedEvents.find((event) => event.date === dateKey);
    if (firstEvent) {
      setSelectedEvent(firstEvent);
      setSheetMode("event");
      return;
    }
    openAddSheet(dateKey);
  };

  const openEventSheet = (event) => {
    setSelectedEvent(event);
    setSheetMode("event");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setSelectedEvent(null);
  };

  const saveEvent = (submitEvent) => {
    submitEvent.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        date: form.date || todayKey,
        time: form.time,
        type: form.type,
        amount: form.amount.replace(/[^0-9.]/g, ""),
        note: form.note.trim(),
      },
    ]);
    closeSheet();
  };

  const deleteEvent = (eventId) => {
    setEvents((current) => current.filter((event) => event.id !== eventId));
    closeSheet();
  };

  return (
    <div className="space-y-3.5">
      <ScheduleHeader monthLabel={formatMonth(new Date())} onAdd={() => openAddSheet()} />
      <ScheduleTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <MiniCalendarStrip days={visibleDays} eventsByDate={eventsByDate} todayKey={todayKey} onSelectDate={openDateFromStrip} />

      {activeTab === "today" ? (
        <div className="space-y-4">
          <TodayClimateCard climate={climate} onOpen={() => setSheetMode("climate")} />
          <EventStrip events={upcomingEvents} onOpen={openEventSheet} onAdd={() => openAddSheet()} />
          <GuidanceCard guidance={guidance} onAsk={() => setSheetMode("climate")} />
        </div>
      ) : (
        <Timeline events={upcomingEvents} onOpen={openEventSheet} onAdd={() => openAddSheet()} />
      )}

      <DetailSheet
        event={selectedEvent}
        climate={climate}
        mode={sheetMode}
        form={form}
        setForm={setForm}
        onSave={saveEvent}
        onDelete={deleteEvent}
        onClose={closeSheet}
      />
    </div>
  );
}
