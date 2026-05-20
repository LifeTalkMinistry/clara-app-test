import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const STORAGE_PREFIX = "clara_schedule_events_v2";

const TYPES = [
  "Bill",
  "Payday",
  "Birthday",
  "Date Night",
  "Church",
  "School",
  "Health",
  "Work",
  "Family",
  "Relationship",
  "Travel",
  "Grocery",
  "Personal",
  "Celebration",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERSONAL_EVENT_TEMPLATES = [
  {
    id: "birthday",
    emoji: "🎂",
    title: "Birthday",
    type: "Birthday",
    note: "Gift, food, travel, or celebration spending may happen. CLARA should help you prepare instead of rushing later.",
  },
  {
    id: "date-night",
    emoji: "❤️",
    title: "Date night",
    type: "Date Night",
    note: "Relationship spending may be emotional. Set a loving but realistic budget before the day arrives.",
  },
  {
    id: "church-event",
    emoji: "⛪",
    title: "Church event",
    type: "Church",
    note: "Possible transport, food, offering, or group activity. Keep the day meaningful without pressure spending.",
  },
  {
    id: "family-gathering",
    emoji: "🏠",
    title: "Family gathering",
    type: "Family",
    note: "Family plans can affect food, travel, and contribution expectations. Prepare a clear spending boundary.",
  },
  {
    id: "grocery-day",
    emoji: "🛒",
    title: "Grocery day",
    type: "Grocery",
    note: "Plan the list first so groceries stay intentional and do not eat the flexible budget.",
  },
  {
    id: "school-activity",
    emoji: "🎓",
    title: "School activity",
    type: "School",
    note: "School-related days can create transport, food, supplies, or contribution costs. Prepare before it feels urgent.",
  },
  {
    id: "medical",
    emoji: "🏥",
    title: "Medical / health",
    type: "Health",
    note: "Health expenses may need protection. Keep this visible so emergency money is not surprised.",
  },
  {
    id: "travel",
    emoji: "✈️",
    title: "Travel / trip",
    type: "Travel",
    note: "Travel usually affects transport, food, and extra purchases. Plan the real cost, not only the ticket.",
  },
  {
    id: "celebration",
    emoji: "🎉",
    title: "Celebration",
    type: "Celebration",
    note: "Celebrations can become social-pressure spending. Decide what is enough before the moment arrives.",
  },
];

const PH_CONTEXTS = [
  {
    id: "new-year",
    month: 1,
    day: 1,
    emoji: "🎆",
    title: "New Year reset",
    type: "Holiday",
    note: "A restart day can affect food, travel, family plans, and recovery spending. Keep the first money decisions intentional.",
  },
  {
    id: "labor-day",
    month: 5,
    day: 1,
    emoji: "💼",
    title: "Labor Day context",
    type: "Holiday",
    note: "A work holiday can shift routine, rest, family time, and casual spending. Keep the day protected, not impulsive.",
  },
  {
    id: "back-to-school",
    month: 6,
    day: 1,
    emoji: "📚",
    title: "Back-to-school season",
    type: "School",
    note: "School opening can create supplies, uniform, tuition, transport, and allowance pressure. Prepare this as a protected cost.",
  },
  {
    id: "ber-months",
    month: 9,
    day: 1,
    emoji: "🎄",
    title: "BER months begin",
    type: "Holiday",
    note: "Christmas culture in the Philippines can start early. Watch gifts, food, reunions, travel, and emotional generosity.",
  },
  {
    id: "undas",
    month: 11,
    day: 1,
    emoji: "🕯️",
    title: "Undas context",
    type: "Holiday",
    note: "Undas can involve transport, flowers, candles, food, and family coordination. Prepare the expected contribution early.",
  },
  {
    id: "all-souls",
    month: 11,
    day: 2,
    emoji: "🕯️",
    title: "All Souls context",
    type: "Holiday",
    note: "Family visits and remembrance routines may still affect transport, food, and contribution spending.",
  },
  {
    id: "thirteenth-month",
    month: 12,
    day: 1,
    emoji: "🎁",
    title: "13th month pay planning",
    type: "Payday",
    note: "Extra income can disappear quickly through gifts, debt, food, and reward spending. Give the money a role before it arrives.",
  },
  {
    id: "christmas-eve",
    month: 12,
    day: 24,
    emoji: "🎄",
    title: "Christmas Eve pressure",
    type: "Holiday",
    note: "Last-minute gifts, food, travel, and family expectations can peak today. Protect essentials before emotional spending.",
  },
  {
    id: "christmas-day",
    month: 12,
    day: 25,
    emoji: "🎄",
    title: "Christmas Day context",
    type: "Holiday",
    note: "Christmas can increase gifts, food, travel, reunions, and family support. Keep generosity aligned with your budget.",
  },
  {
    id: "year-end",
    month: 12,
    day: 31,
    emoji: "🎇",
    title: "Year-end celebration pressure",
    type: "Holiday",
    note: "Food, celebration, travel, and year-end reward spending can rise quickly. Decide what is enough before the moment gets emotional.",
  },
];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateKeyFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
      emoji: "💳",
    },
    {
      id: "sample-payday",
      title: "Payday planning",
      date: toDateKey(addDays(today, 7)),
      time: "",
      type: "Payday",
      amount: "",
      note: "Plan before confidence spending starts.",
      emoji: "💸",
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

      return event?.id && event?.title && event?.date && !event?.autoContext && !isOldSampleCheckin;
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

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function createPhilippinesContextEvent({ id, date, emoji, title, type = "Holiday", note }) {
  return {
    id: `ph-context-${date}-${id}`,
    title,
    date,
    time: "",
    type,
    amount: "",
    note:
      note ||
      "Philippines context detected. CLARA is watching this day because routine, travel, food, family plans, or emotional spending may shift.",
    emoji,
    autoContext: true,
    sourceCountry: "Philippines",
  };
}

function buildPhilippinesContextEvents(year) {
  const fixedEvents = PH_CONTEXTS.map((context) =>
    createPhilippinesContextEvent({
      ...context,
      date: toDateKeyFromParts(year, context.month, context.day),
    })
  );

  const easterSunday = getEasterSunday(year);

  const holyWeekEvents = [
    {
      id: "holy-week-thursday",
      date: toDateKey(addDays(easterSunday, -3)),
      emoji: "🕊️",
      title: "Holy Week Thursday context",
      note: "Holy Week can shift work, travel, church, family, and food routines. Protect cash before the long break starts.",
    },
    {
      id: "holy-week-friday",
      date: toDateKey(addDays(easterSunday, -2)),
      emoji: "🕊️",
      title: "Holy Week Friday context",
      note: "Quiet days can still carry travel, food, family, or church-related costs. Keep the spending rhythm simple.",
    },
    {
      id: "holy-week-saturday",
      date: toDateKey(addDays(easterSunday, -1)),
      emoji: "🕊️",
      title: "Holy Week Saturday context",
      note: "Long-weekend spending can continue through food, travel, and family plans. Stay intentional before regular routine returns.",
    },
  ].map(createPhilippinesContextEvent);

  return [...fixedEvents, ...holyWeekEvents].sort((a, b) =>
    `${a.date} ${a.title}`.localeCompare(`${b.date} ${b.title}`)
  );
}

function getTypeEmoji(type) {
  if (type === "Bill") return "💳";
  if (type === "Payday") return "💸";
  if (type === "Birthday") return "🎂";
  if (type === "Date Night") return "❤️";
  if (type === "Church") return "⛪";
  if (type === "School") return "🎓";
  if (type === "Health") return "🏥";
  if (type === "Work") return "💼";
  if (type === "Family") return "🏠";
  if (type === "Relationship") return "❤️";
  if (type === "Travel") return "✈️";
  if (type === "Grocery") return "🛒";
  if (type === "Celebration") return "🎉";
  if (type === "Holiday") return "🇵🇭";
  return "✨";
}

function isMoneyEvent(event) {
  const type = String(event?.type || "").toLowerCase();
  const pressureTypes = new Set([
    "bill",
    "payday",
    "money",
    "holiday",
    "birthday",
    "date night",
    "travel",
    "medical",
    "health",
    "school",
    "family",
    "relationship",
    "celebration",
    "grocery",
    "church",
  ]);

  return Boolean(event?.amount) || Boolean(event?.autoContext) || pressureTypes.has(type);
}

function displayTitle(event) {
  const title = String(event?.title || "Schedule").trim();
  const lower = title.toLowerCase();
  const type = String(event?.type || "").toLowerCase();

  if (event?.autoContext) return title;
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

  if (event.autoContext) {
    return event.note || "CLARA is watching this date as automatic Philippines context.";
  }

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
    cells.push({
      day,
      key: toDateKey(new Date(year, month, day)),
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSameMonth(event, monthDate) {
  const eventDate = fromDateKey(event?.date);
  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}

function getSelectedAgenda({ selectedDate, todayKey, events }) {
  const userMoneyEvent = events.find((event) => !event.autoContext && isMoneyEvent(event));
  const contextEvent = events.find((event) => event.autoContext);
  const firstUserEvent = events.find((event) => !event.autoContext);
  const firstEvent = firstUserEvent || contextEvent;
  const isToday = selectedDate === todayKey;
  const dateLabel = isToday ? `Today • ${formatDate(selectedDate)}` : formatDate(selectedDate);

  if (userMoneyEvent || contextEvent) {
    const event = userMoneyEvent || contextEvent;
    const isContext = Boolean(event.autoContext);

    return {
      event,
      label: isContext ? "CLARA context" : isToday ? "Today impact" : "Money impact",
      dateLabel,
      badge: isContext ? "Auto" : "Watch",
      title: displayTitle(event),
      body: impactMessage(event),
      icon: CreditCard,
      clickable: true,
    };
  }

  if (firstEvent) {
    return {
      event: firstEvent,
      label: isToday ? "Today agenda" : "Selected agenda",
      dateLabel,
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
    dateLabel,
    badge: "Clear",
    title: isToday ? "No agenda today." : "No agenda on this day.",
    body: isToday
      ? "Nothing to watch out for today. You can breathe and keep your spending simple."
      : "No personal schedule is attached here yet. Double tap this day if it may affect your money or plans.",
    icon: CalendarDays,
    clickable: false,
  };
}

function getMonthlyInsight({ sortedEvents, monthDate, todayKey }) {
  const monthEvents = sortedEvents.filter((event) => isSameMonth(event, monthDate));
  const userMoneyEvents = monthEvents.filter((event) => !event.autoContext && isMoneyEvent(event));
  const contextEvents = monthEvents.filter((event) => event.autoContext);
  const nextMoneyEvent = sortedEvents.find((event) => event.date >= todayKey && isMoneyEvent(event));
  const paydayEvent = monthEvents.find((event) => String(event?.type || "").toLowerCase() === "payday");
  const relationshipEvent = monthEvents.find((event) => {
    const text = `${event?.title || ""} ${event?.type || ""} ${event?.note || ""}`.toLowerCase();
    return text.includes("date") || text.includes("relationship") || text.includes("partner") || text.includes("family");
  });

  if (userMoneyEvents.length >= 3) {
    return "Several personal money-impact moments this month. Give them space before optional spending.";
  }

  if (nextMoneyEvent) {
    return `Next pressure: ${displayTitle(nextMoneyEvent)} on ${formatDate(nextMoneyEvent.date)}. Keep it in mind before casual spending.`;
  }

  if (contextEvents.length) {
    return "Philippines context detected automatically. Prepare travel, food, gifts, or family costs before they become pressure.";
  }

  if (paydayEvent) {
    return "Payday is part of this month. Plan the first move before confidence spending starts.";
  }

  if (relationshipEvent) {
    return "Meaningful schedule detected. Make it intentional, not impulsive.";
  }

  if (monthEvents.length >= 6) {
    return "This month may feel crowded. Slow money decisions on busy weeks.";
  }

  if (monthEvents.length === 0) {
    return "Your month looks breathable. Add bills, payday, or expected costs when ready.";
  }

  return "Your schedule looks manageable. Nothing financially heavy right now.";
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
          <p className="mt-1 text-[11px] font-bold text-cyan-100/52">{agenda.dateLabel}</p>
          <h3 className="mt-2 text-lg font-black leading-tight text-white">{agenda.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{agenda.body}</p>
        </div>
      </div>
    </button>
  );
}

function CalendarMonth({ monthDate, cells, selectedDate, todayKey, byDate, onSelect, onPrev, onNext, onAdd, onQuickCreate }) {
  const [lastTap, setLastTap] = useState({ key: null, time: 0 });

  const handleDayTap = (dateKey) => {
    const now = Date.now();
    const isDoubleTap = lastTap.key === dateKey && now - lastTap.time <= 420;

    onSelect(dateKey);

    if (isDoubleTap) {
      setLastTap({ key: null, time: 0 });
      onQuickCreate(dateKey);
      return;
    }

    setLastTap({ key: dateKey, time: now });
  };

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
          <p className="mt-1 text-[10px] font-bold text-white/38">Tap to view • double tap to add</p>
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
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className="min-h-[48px]" />;

          const events = byDate[cell.key] || [];
          const hasContext = events.some((event) => event.autoContext);
          const hasMoney = events.some(isMoneyEvent);
          const hasAny = events.length > 0;
          const selected = cell.key === selectedDate;
          const today = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => handleDayTap(cell.key)}
              className={`relative flex min-h-[48px] flex-col items-center justify-center rounded-2xl border text-sm font-black transition duration-200 active:scale-[.96] ${
                selected
                  ? "z-10 scale-[1.04] border-cyan-200/70 bg-cyan-300/[.16] text-white shadow-[0_0_0_1px_rgba(103,232,249,.20),0_0_24px_rgba(34,211,238,.28),inset_0_0_18px_rgba(34,211,238,.12)]"
                  : today
                    ? "border-cyan-300/30 bg-cyan-300/[.07] text-white"
                    : hasContext
                      ? "border-fuchsia-300/20 bg-fuchsia-300/[.045] text-white/78"
                      : hasMoney
                        ? "border-fuchsia-300/20 bg-fuchsia-300/[.05] text-white/78"
                        : hasAny
                          ? "border-white/10 bg-white/[.035] text-white/62"
                          : "border-white/7 bg-white/[.018] text-white/38 hover:bg-white/[.04]"
              }`}
              aria-label={`Select ${cell.key}. Double tap to add an event.`}
            >
              {selected ? (
                <span className="pointer-events-none absolute inset-[-2px] rounded-[18px] border border-cyan-200/25" />
              ) : null}

              <span className="relative z-10">{cell.day}</span>

              {selected ? (
                <span className="absolute top-1.5 h-1 w-5 rounded-full bg-cyan-100/70 shadow-[0_0_10px_rgba(103,232,249,.55)]" />
              ) : null}

              {hasAny ? (
                <span
                  className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                    hasContext || hasMoney ? "bg-fuchsia-200" : "bg-cyan-200/75"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold text-white/38">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-200" /> Money impact
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-200/75" /> Schedule
        </span>
        <span className="ml-auto text-white/30">Double tap a day</span>
      </div>
    </section>
  );
}

function MonthlyInsightCard({ insight }) {
  return <p className="px-1 pb-1 text-[12px] font-semibold leading-5 text-white/48">{insight}</p>;
}

function QuickEventChooser({ date, onChooseTemplate, onBlankAdd }) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-[24px] border border-cyan-300/14 bg-cyan-300/[.04] p-4">
        <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-100/64">Selected day</p>
        <h4 className="mt-2 text-lg font-black text-white">What are you adding on {formatDate(date)}?</h4>
        <p className="mt-2 text-sm leading-6 text-white/56">
          Choose your personal event. Philippine holidays and seasonal pressure are already added by CLARA automatically.
        </p>
      </div>

      <div className="rounded-[22px] border border-fuchsia-300/14 bg-fuchsia-300/[.045] px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-100/62">CLARA context</p>
        <p className="mt-1 text-sm leading-6 text-white/58">
          No need to add holidays manually. CLARA marks Philippines context separately from your own schedule.
        </p>
      </div>

      <div className="grid max-h-[42vh] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
        {PERSONAL_EVENT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onChooseTemplate(template)}
            className="rounded-[22px] border border-white/9 bg-white/[.035] p-3 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/[.055] active:scale-[.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[.045] text-xl">
              {template.emoji}
            </span>
            <span className="mt-3 block text-sm font-black leading-tight text-white">{template.title}</span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[.13em] text-cyan-100/45">
              {template.type}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onBlankAdd}
        className="w-full rounded-2xl border border-dashed border-white/14 bg-white/[.025] px-4 py-3 text-sm font-black text-white/62"
      >
        I’ll describe my own event
      </button>
    </div>
  );
}

function Sheet({ event, mode, form, setForm, onSave, onRemove, onClose, onChooseTemplate, onBlankAdd }) {
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
  const choosing = mode === "quick";
  const viewing = mode === "event" && event;
  const viewingContext = Boolean(event?.autoContext);

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
              {choosing ? "Event type" : adding ? "Schedule" : viewingContext ? "CLARA context" : event?.type}
            </p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">
              {choosing ? "Choose an event" : adding ? "Add schedule" : displayTitle(event)}
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

        {choosing ? (
          <QuickEventChooser date={form.date} onChooseTemplate={onChooseTemplate} onBlankAdd={onBlankAdd} />
        ) : null}

        {adding ? (
          <form onSubmit={onSave} className="mt-5 space-y-3">
            {form.emoji ? (
              <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/[.045] px-4 py-3">
                <p className="text-xs font-bold text-cyan-100/62">
                  <span className="mr-2 text-lg">{form.emoji}</span>
                  CLARA will treat this as a {form.type.toLowerCase()} context for {formatDate(form.date)}.
                </p>
              </div>
            ) : null}

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
                onChange={(eventChange) =>
                  setForm((current) => ({
                    ...current,
                    type: eventChange.target.value,
                    emoji: current.emoji || getTypeEmoji(eventChange.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32"
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
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

            <button
              type="submit"
              className="w-full rounded-2xl border border-cyan-300/22 bg-cyan-300/[.09] px-4 py-3 text-sm font-black text-cyan-50"
            >
              Save schedule
            </button>
          </form>
        ) : null}

        {viewing ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3">
              <p className="text-xs font-bold text-cyan-100/60">
                {event?.emoji ? <span className="mr-2 text-base">{event.emoji}</span> : null}
                {formatDate(event.date)} {event.time ? `• ${event.time}` : ""}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/62">{event.note || impactMessage(event)}</p>
            </div>

            {viewingContext ? (
              <div className="rounded-2xl border border-fuchsia-400/14 bg-fuchsia-400/[.055] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-fuchsia-100/62">
                  Auto Philippines context
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">
                  This is automatically shown by CLARA and is not saved as your personal schedule.
                </p>
              </div>
            ) : null}

            {isMoneyEvent(event) ? (
              <div className="rounded-2xl border border-fuchsia-400/14 bg-fuchsia-400/[.055] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-fuchsia-100/62">Money impact</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">{impactMessage(event)}</p>
              </div>
            ) : null}

            {!viewingContext ? (
              <button
                type="button"
                onClick={() => onRemove(event.id)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-black text-white/58"
              >
                <Trash2 className="h-4 w-4" /> Remove schedule
              </button>
            ) : null}
          </div>
        ) : null}
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
  const [form, setForm] = useState({
    title: "",
    date: today,
    time: "",
    type: "Personal",
    amount: "",
    note: "",
    emoji: "✨",
  });

  useEffect(() => setEvents(readEvents(user)), [user?.id, user?.email]);
  useEffect(() => saveEvents(user, events), [events, user]);

  const contextYear = monthDate.getFullYear();
  const philippinesContextEvents = useMemo(() => buildPhilippinesContextEvents(contextYear), [contextYear]);
  const visibleEvents = useMemo(() => [...events, ...philippinesContextEvents], [events, philippinesContextEvents]);

  const sorted = useMemo(
    () =>
      [...visibleEvents].sort((a, b) =>
        `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`)
      ),
    [visibleEvents]
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

  const openQuickCreate = (date = selectedDate) => {
    setSelectedDate(date);
    setForm({
      title: "",
      date,
      time: "",
      type: "Personal",
      amount: "",
      note: "",
      emoji: "✨",
    });
    setSelectedEvent(null);
    setMode("quick");
  };

  const openAdd = (date = selectedDate) => {
    setForm({
      title: "",
      date,
      time: "",
      type: "Personal",
      amount: "",
      note: "",
      emoji: "✨",
    });
    setSelectedEvent(null);
    setMode("add");
  };

  const chooseTemplate = (template) => {
    setForm((current) => ({
      ...current,
      title: template.title,
      type: template.type,
      note: template.note,
      amount: template.amount || "",
      emoji: template.emoji,
    }));
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
        emoji: form.emoji || getTypeEmoji(form.type),
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
        onAdd={() => openQuickCreate(selectedDate)}
        onQuickCreate={openQuickCreate}
        onPrev={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        onNext={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
      />

      <MonthlyInsightCard insight={monthlyInsight} />

      <Sheet
        event={selectedEvent}
        mode={mode}
        form={form}
        setForm={setForm}
        onSave={save}
        onRemove={remove}
        onClose={close}
        onChooseTemplate={chooseTemplate}
        onBlankAdd={() => openAdd(form.date || selectedDate)}
      />
    </div>
  );
}
