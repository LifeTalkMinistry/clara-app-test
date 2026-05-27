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
const TYPES = ["Bill", "Payday", "Health", "Work", "Family", "Relationship", "Personal"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PH_HOLIDAY_START_YEAR = 2026;
const PH_HOLIDAY_LOOKAHEAD_YEARS = 10;

const CHINESE_NEW_YEAR_BY_YEAR = {
  2026: "02-17",
  2027: "02-06",
  2028: "01-26",
  2029: "02-13",
  2030: "02-03",
  2031: "01-23",
  2032: "02-11",
  2033: "01-31",
  2034: "02-19",
  2035: "02-08",
  2036: "01-28",
  2037: "02-15",
  2038: "02-04",
  2039: "01-24",
  2040: "02-12",
};

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

function dateKeyFromParts(year, monthDay) {
  return `${year}-${monthDay}`;
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

function getLastMondayOfAugust(year) {
  const date = new Date(year, 7, 31);

  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

function addHoliday(map, dateKey, holiday) {
  map[dateKey] = holiday;
}

function buildPhilippineHolidayMap() {
  const currentYear = new Date().getFullYear();
  const endYear = Math.max(currentYear + PH_HOLIDAY_LOOKAHEAD_YEARS, 2036);
  const holidays = {};

  for (let year = PH_HOLIDAY_START_YEAR; year <= endYear; year += 1) {
    addHoliday(holidays, dateKeyFromParts(year, "01-01"), {
      title: "New Year's Day",
      type: "Regular holiday",
      icon: "🎆",
      note: "Start clean. Keep celebration spending intentional so the year begins with breathing room.",
    });

    if (CHINESE_NEW_YEAR_BY_YEAR[year]) {
      addHoliday(holidays, dateKeyFromParts(year, CHINESE_NEW_YEAR_BY_YEAR[year]), {
        title: "Chinese New Year",
        type: "Special non-working day",
        icon: "🐉",
        note: "A holiday can invite food, travel, and family spending. Decide the limit before the celebration starts.",
      });
    }

    addHoliday(holidays, dateKeyFromParts(year, "02-25"), {
      title: "EDSA People Power Revolution Anniversary",
      type: "Common national observance",
      icon: "🕊️",
      note: "A national remembrance day. Keep the calendar aware, but treat it differently from non-working holidays unless officially declared.",
    });

    const easterSunday = getEasterSunday(year);
    addHoliday(holidays, toDateKey(addDays(easterSunday, -3)), {
      title: "Maundy Thursday",
      type: "Regular holiday",
      icon: "✝️",
      note: "Holy Week can affect travel, food, and family plans. Prepare early and avoid last-minute spending pressure.",
    });
    addHoliday(holidays, toDateKey(addDays(easterSunday, -2)), {
      title: "Good Friday",
      type: "Regular holiday",
      icon: "✝️",
      note: "A quiet holiday. Keep spending simple and protect money meant for essentials after the break.",
    });
    addHoliday(holidays, toDateKey(addDays(easterSunday, -1)), {
      title: "Black Saturday",
      type: "Special non-working day",
      icon: "🕯️",
      note: "Part of the long Holy Week pause. Watch convenience spending during travel or family gatherings.",
    });

    addHoliday(holidays, dateKeyFromParts(year, "04-09"), {
      title: "Araw ng Kagitingan",
      type: "Regular holiday",
      icon: "🎖️",
      note: "A national holiday that may change routines. Plan meals, transport, or errands before the day arrives.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "05-01"), {
      title: "Labor Day",
      type: "Regular holiday",
      icon: "🛠️",
      note: "A work-related holiday. Rest well, but keep reward spending aligned with your budget.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "06-12"), {
      title: "Independence Day",
      type: "Regular holiday",
      icon: "🇵🇭",
      note: "A national celebration. Enjoy it without letting celebration spending quietly take over the month.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "08-21"), {
      title: "Ninoy Aquino Day",
      type: "Special non-working day",
      icon: "🎗️",
      note: "A pause in the month can shift plans. Keep optional spending intentional.",
    });
    addHoliday(holidays, toDateKey(getLastMondayOfAugust(year)), {
      title: "National Heroes Day",
      type: "Regular holiday",
      icon: "🏅",
      note: "A long-weekend type of holiday for many people. Prepare before food, travel, or leisure spending increases.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "11-01"), {
      title: "All Saints' Day",
      type: "Special non-working day",
      icon: "🕯️",
      note: "Family visits and memorial traditions can involve transport, food, and flowers. Plan the spending ahead.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "11-02"), {
      title: "All Souls' Day",
      type: "Special non-working day",
      icon: "🕯️",
      note: "A family-centered holiday. Keep meaningful spending prepared, not rushed.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "11-30"), {
      title: "Bonifacio Day",
      type: "Regular holiday",
      icon: "⚔️",
      note: "A national holiday that may create a long-weekend mood. Check your budget before saying yes to plans.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "12-08"), {
      title: "Feast of the Immaculate Conception of Mary",
      type: "Special non-working day",
      icon: "🙏",
      note: "December spending can build quickly. Use this reminder to keep gifts, food, and travel within plan.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "12-24"), {
      title: "Christmas Eve",
      type: "Special non-working day",
      icon: "🎄",
      note: "The most tempting spending window of the year. Pause before extra purchases and protect January money.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "12-25"), {
      title: "Christmas Day",
      type: "Regular holiday",
      icon: "🎁",
      note: "Celebrate warmly, but do not let generosity become financial pressure you carry into next month.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "12-30"), {
      title: "Rizal Day",
      type: "Regular holiday",
      icon: "🖋️",
      note: "A year-end national holiday. Review your money before the New Year mood begins.",
    });
    addHoliday(holidays, dateKeyFromParts(year, "12-31"), {
      title: "Last Day of the Year",
      type: "Special non-working day",
      icon: "🎆",
      note: "Year-end spending can feel emotional. Decide your celebration limit before the countdown.",
    });
  }

  return holidays;
}

const PH_HOLIDAYS = buildPhilippineHolidayMap();

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

function getHoliday(key) {
  return PH_HOLIDAYS[key] || null;
}

function getHolidaysForMonth(monthDate) {
  return Object.entries(PH_HOLIDAYS)
    .filter(([dateKey]) => {
      const date = fromDateKey(dateKey);
      return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
    })
    .map(([date, holiday]) => ({ ...holiday, date }))
    .sort((a, b) => a.date.localeCompare(b.date));
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

function holidayMessage(holiday) {
  if (!holiday) return "This is marked as a Philippine holiday.";
  return `${holiday.type}. ${holiday.note}`;
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

  while (cells.length < 42) cells.push(null);
  return cells.slice(0, 42);
}

function isSameMonth(event, monthDate) {
  const eventDate = fromDateKey(event?.date);
  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}

function getSelectedAgenda({ selectedDate, todayKey, events, holiday }) {
  const moneyEvent = events.find(isMoneyEvent);
  const firstEvent = events[0];
  const isToday = selectedDate === todayKey;
  const dateLabel = isToday ? `Today • ${formatDate(selectedDate)}` : formatDate(selectedDate);

  if (moneyEvent) {
    return {
      event: moneyEvent,
      label: isToday ? "Today impact" : "Money impact",
      dateLabel,
      badge: holiday ? holiday.icon : "Watch",
      title: displayTitle(moneyEvent),
      body: holiday ? `${impactMessage(moneyEvent)} Also: ${holiday.title}.` : impactMessage(moneyEvent),
      icon: CreditCard,
      clickable: true,
    };
  }

  if (holiday) {
    return {
      event: null,
      label: "Philippine holiday",
      dateLabel,
      badge: holiday.type.includes("working") ? "Workday" : "Holiday",
      title: `${holiday.icon} ${holiday.title}`,
      body: holidayMessage(holiday),
      icon: CalendarDays,
      emoji: holiday.icon,
      clickable: false,
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
      : "No schedule is attached here yet. Add one if this day may affect your money or plans.",
    icon: CalendarDays,
    clickable: false,
  };
}

function getMonthlyInsight({ sortedEvents, monthDate, todayKey }) {
  const monthEvents = sortedEvents.filter((event) => isSameMonth(event, monthDate));
  const moneyEvents = monthEvents.filter(isMoneyEvent);
  const nextMoneyEvent = sortedEvents.find((event) => event.date >= todayKey && isMoneyEvent(event));
  const monthHolidays = getHolidaysForMonth(monthDate);
  const nextHoliday = monthHolidays.find((holiday) => holiday.date >= todayKey) || monthHolidays[0];
  const paydayEvent = monthEvents.find((event) => String(event?.type || "").toLowerCase() === "payday");
  const relationshipEvent = monthEvents.find((event) => {
    const text = `${event?.title || ""} ${event?.type || ""} ${event?.note || ""}`.toLowerCase();
    return text.includes("date") || text.includes("relationship") || text.includes("partner") || text.includes("family");
  });

  if (moneyEvents.length >= 3) {
    return `Several money-impact moments this month. Give them space before optional spending.`;
  }

  if (nextMoneyEvent) {
    return `Next pressure: ${displayTitle(nextMoneyEvent)} on ${formatDate(nextMoneyEvent.date)}. Keep it in mind before casual spending.`;
  }

  if (nextHoliday) {
    return `${nextHoliday.icon} ${nextHoliday.title} is marked this month. Holidays can trigger reward spending, travel, food, or family costs.`;
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
      className="relative flex min-h-[clamp(106px,17svh,132px)] w-full shrink-0 overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(145deg,rgba(8,13,34,.86),rgba(14,24,54,.72)_48%,rgba(45,24,82,.34))] p-[clamp(0.82rem,2svh,1rem)] text-left shadow-[0_18px_45px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.04)] transition active:scale-[.99] disabled:cursor-default"
    >
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-44 w-44 rounded-full bg-cyan-300/[.055] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-fuchsia-400/[.06] blur-3xl" />

      <div className="relative flex h-full w-full items-center gap-3.5">
        <div className="flex h-[clamp(40px,6.2svh,48px)] w-[clamp(40px,6.2svh,48px)] shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/[.035] text-cyan-100/70 shadow-[0_0_18px_rgba(34,211,238,.07)]">
          {agenda.emoji ? (
            <span className="text-xl leading-none" aria-hidden="true">{agenda.emoji}</span>
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-100/55">{agenda.label}</p>
            <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1 text-[10px] font-black uppercase tracking-[.13em] text-white/48">
              {agenda.badge}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold text-white/42">{agenda.dateLabel}</p>
          <h3 className="mt-[clamp(0.32rem,0.9svh,0.5rem)] text-[clamp(1rem,4.4vw,1.16rem)] font-black leading-tight text-white/92">{agenda.title}</h3>
          <p className="mt-[clamp(0.3rem,0.8svh,0.5rem)] line-clamp-2 text-[clamp(0.76rem,3.1vw,0.86rem)] font-semibold leading-[1.55] text-white/54">{agenda.body}</p>
        </div>
      </div>
    </button>
  );
}

function CalendarMonth({ monthDate, cells, selectedDate, todayKey, byDate, onSelect, onPrev, onNext, onAdd }) {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(145deg,rgba(8,13,34,.72),rgba(12,22,50,.56)_52%,rgba(36,21,70,.26))] p-[clamp(0.68rem,1.75svh,0.9rem)] shadow-[0_18px_45px_rgba(0,0,0,.22),inset_0_1px_0_rgba(255,255,255,.035)]">
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-cyan-300/[.045] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-violet-500/[.07] blur-3xl" />

      <div className="relative z-10 mb-[clamp(0.45rem,1.25svh,0.75rem)] flex shrink-0 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="flex h-[clamp(32px,5.5svh,38px)] w-[clamp(32px,5.5svh,38px)] items-center justify-center rounded-2xl border border-white/8 bg-white/[.025] text-white/42 transition hover:bg-white/[.04] hover:text-white/62 active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="text-[clamp(0.82rem,3.5vw,0.92rem)] font-black text-white/88">{formatMonth(monthDate)}</p>
          <p className="mt-0.5 text-[9px] font-bold text-white/30">Tap a day to view or add</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[clamp(32px,5.5svh,38px)] w-[clamp(32px,5.5svh,38px)] items-center justify-center rounded-2xl border border-white/8 bg-white/[.03] text-cyan-100/56 transition hover:bg-white/[.045] hover:text-cyan-50 active:scale-95"
            aria-label="Add schedule"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex h-[clamp(32px,5.5svh,38px)] w-[clamp(32px,5.5svh,38px)] items-center justify-center rounded-2xl border border-white/8 bg-white/[.025] text-white/42 transition hover:bg-white/[.04] hover:text-white/62 active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 grid shrink-0 grid-cols-7 gap-[clamp(0.22rem,0.72svh,0.38rem)] text-center text-[8.5px] font-black uppercase tracking-[.08em] text-white/30">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="relative z-10 mt-[clamp(0.35rem,1svh,0.55rem)] grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-[clamp(0.25rem,0.78svh,0.42rem)]">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className="min-h-0" />;

          const events = byDate[cell.key] || [];
          const holiday = getHoliday(cell.key);
          const hasHoliday = Boolean(holiday);
          const hasMoney = events.some(isMoneyEvent);
          const hasAny = events.length > 0;
          const selected = cell.key === selectedDate;
          const today = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={`relative flex h-full min-h-0 flex-col items-center justify-center rounded-[clamp(0.78rem,3.5vw,1rem)] border text-[clamp(0.74rem,3.7vw,0.92rem)] font-black transition duration-200 active:scale-[.97] ${
                selected
                  ? "z-10 scale-[1.025] border-cyan-100/28 bg-cyan-200/[.075] text-white shadow-[0_0_0_1px_rgba(103,232,249,.10),0_0_18px_rgba(34,211,238,.12),inset_0_0_14px_rgba(34,211,238,.055)]"
                  : today
                    ? "border-cyan-200/16 bg-cyan-300/[.035] text-white/72"
                    : hasHoliday
                      ? "border-amber-200/18 bg-amber-300/[.035] text-white/80 hover:bg-amber-300/[.055]"
                      : hasMoney
                        ? "border-fuchsia-200/14 bg-fuchsia-300/[.03] text-white/66"
                        : hasAny
                          ? "border-white/8 bg-white/[.03] text-white/58"
                          : "border-white/6 bg-white/[.022] text-white/36 hover:bg-white/[.035] hover:text-white/56"
              }`}
              aria-label={`Select ${cell.key}${holiday ? `, ${holiday.title}` : ""}`}
              title={holiday ? `${holiday.title} • ${holiday.type}` : undefined}
            >
              {selected ? (
                <span className="pointer-events-none absolute inset-[-1px] rounded-[inherit] border border-cyan-100/14" />
              ) : null}
              {hasHoliday ? (
                <>
                  <span className="absolute left-1.5 top-1 text-[8.5px] font-black leading-none text-white/38">{cell.day}</span>
                  <span className="relative z-10 text-[clamp(0.95rem,4.4vw,1.12rem)] leading-none" aria-hidden="true">
                    {holiday.icon}
                  </span>
                </>
              ) : (
                <span className="relative z-10">{cell.day}</span>
              )}
              {selected ? (
                <span className="absolute top-1.5 h-1 w-5 rounded-full bg-cyan-100/50 shadow-[0_0_8px_rgba(103,232,249,.25)]" />
              ) : null}
              {hasAny ? (
                <span className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${hasMoney ? "bg-fuchsia-200/70" : "bg-cyan-200/55"}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative z-10 mt-[clamp(0.45rem,1.15svh,0.75rem)] flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] font-bold text-white/30">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-200/70" /> Holiday</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-fuchsia-200/65" /> Money impact</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-200/55" /> Schedule</span>
      </div>
    </section>
  );
}

function MonthlyInsightCard({ insight }) {
  return (
    <div className="shrink-0 rounded-[20px] border border-white/7 bg-white/[.028] px-3.5 py-[clamp(0.5rem,1.3svh,0.7rem)] shadow-[inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-xl">
      <p className="line-clamp-2 text-[clamp(0.68rem,2.8vw,0.76rem)] font-semibold leading-5 text-white/46">
        {insight}
      </p>
    </div>
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
  const selectedHoliday = getHoliday(selectedDate);
  const selectedAgenda = useMemo(
    () => getSelectedAgenda({ selectedDate, todayKey: today, events: selectedEvents, holiday: selectedHoliday }),
    [selectedDate, selectedEvents, selectedHoliday, today]
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
    <div
      className="flex min-h-0 flex-col gap-[clamp(0.5rem,1.35svh,0.75rem)] overflow-hidden pb-1"
      style={{ height: "clamp(560px, calc(100svh - 126px), 720px)" }}
    >
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
