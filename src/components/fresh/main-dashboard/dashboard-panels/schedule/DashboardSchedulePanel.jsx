import { useEffect, useMemo, useRef, useState } from "react";
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
import { getIncomeSources } from "@/lib/incomeHubRepository";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { CLARA_MONEY_SCHEDULE_UPDATED_EVENT } from "@/lib/clara-money-schedule-repository";
import {
  buildStableIncomeScheduleProjection,
  isStableIncomeScheduleProjection,
  mergeScheduleEventsForRender,
} from "@/lib/stableIncomeScheduleProjection";
import {
  DEBT_OBLIGATION_SCHEDULE_SOURCE,
  SAVINGS_GOAL_SCHEDULE_SOURCE,
  isFinancialCardScheduleProjection,
} from "@/lib/financialCardScheduleProjection";
import {
  filterScheduleOwnedEvents,
  isDerivedScheduleProjection,
  mergeScheduleEventCollections,
} from "@/lib/scheduleEventOwnership";
import { loadFinancialCardScheduleProjections } from "./financialCardScheduleIntegration";

const STORAGE_PREFIX = "clara_schedule_events_v2";
const CLARA_SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
const INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated";
const FINANCIAL_CARD_SCHEDULE_UPDATE_EVENTS = [
  "clara-finance-updated",
  "clara:finance-data-updated",
  "clara-local-finance-updated",
  "clara:debt-obligations-updated",
  "clara:demo-data-loaded",
];
const TYPES = ["Bill", "Payday", "Health", "Work", "Family", "Relationship", "Personal"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PH_HOLIDAY_START_YEAR = 2026;
const PH_HOLIDAY_LOOKAHEAD_YEARS = 10;
const DOUBLE_TAP_DELAY_MS = 380;
const AGENDA_SWIPE_THRESHOLD_PX = 42;
const AGENDA_OPEN_SUPPRESSION_MS = 250;

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
  const k = year % 100 % 4;
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
  return `${STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function getLegacyStorageKey(user) {
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
    const storageKey = getStorageKey(user);
    const legacyOwnerStorageKey = getLegacyStorageKey(user);
    const raw =
      window.localStorage.getItem(storageKey) ||
      (legacyOwnerStorageKey !== storageKey
        ? window.localStorage.getItem(legacyOwnerStorageKey)
        : null);
    const legacy = window.localStorage.getItem("clara_lifeos_schedule_events_v1");
    const parsed = raw ? JSON.parse(raw) : legacy ? JSON.parse(legacy) : null;

    if (!Array.isArray(parsed)) return seedEvents();

    return filterScheduleOwnedEvents(parsed).filter((event) => {
      const title = String(event?.title || "").toLowerCase();
      const isOldSampleCheckin =
        event?.id === "sample-reset" ||
        event?.id === "sample-checkin" ||
        title.includes("lifeos check-in");

      return !isOldSampleCheckin;
    });
  } catch {
    return seedEvents();
  }
}

function saveEvents(user, events) {
  if (typeof window === "undefined") return;

  try {
    const persistedEvents = filterScheduleOwnedEvents(events);
    window.localStorage.setItem(
      getStorageKey(user),
      JSON.stringify(persistedEvents)
    );
    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, {
        detail: { ownerId: getRecurringCashFlowOwnerId(user), reason: "persist" },
      })
    );
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

function getEventIcon(event) {
  const type = String(event?.type || "").toLowerCase();
  const text = `${event?.title || ""} ${event?.note || ""}`.toLowerCase();

  if (type === "payday" || text.includes("payday") || text.includes("salary")) return "💰";
  if (type === "bill" || text.includes("bill") || text.includes("payment")) return "🧾";
  if (text.includes("church") || text.includes("ministry") || text.includes("service")) return "⛪";
  if (text.includes("outing") || text.includes("beach") || text.includes("resort")) return "🏖️";
  if (text.includes("rent") || text.includes("house") || text.includes("home")) return "🏠";
  if (text.includes("grocery") || text.includes("groceries") || text.includes("market")) return "🛒";
  if (type === "health" || text.includes("doctor") || text.includes("checkup") || text.includes("medicine")) return "🩺";
  if (type === "work" || text.includes("work") || text.includes("meeting") || text.includes("office") || text.includes("shift")) return "💼";
  if (type === "family" || text.includes("family") || text.includes("parent") || text.includes("sibling")) return "👨‍👩‍👧";
  if (type === "relationship" || text.includes("date") || text.includes("partner") || text.includes("relationship")) return "💞";
  if (text.includes("school") || text.includes("study") || text.includes("class")) return "📚";
  if (text.includes("travel") || text.includes("trip") || text.includes("commute")) return "🚗";
  if (isMoneyEvent(event)) return "💸";
  if (type === "personal") return "⭐";

  return "📅";
}

function getPrimaryCalendarEvent(events) {
  return events.find(isMoneyEvent) || events[0] || null;
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

function getFinancialCardSourcePresentation(event) {
  const source = String(event?.source || "").trim().toLowerCase();

  if (source === SAVINGS_GOAL_SCHEDULE_SOURCE) {
    return {
      label: "Savings Goal",
      ownerTitle: "Managed from Savings Goal",
      ownerCopy: "Update this date from your Savings Goal card.",
    };
  }

  if (source === DEBT_OBLIGATION_SCHEDULE_SOURCE) {
    return {
      label: "Debt / Obligation",
      ownerTitle: "Managed from Debt / Obligation",
      ownerCopy: "Update this date from your Debt / Obligation card.",
    };
  }

  return null;
}

function impactMessage(event) {
  if (!event) return "Nothing money-sensitive is attached to this day yet.";

  if (isStableIncomeScheduleProjection(event)) {
    return (
      event.note ||
      `${displayTitle(event)} is expected on ${formatDate(event.date)}. Actual received money remains owned by Income Hub.`
    );
  }

  const amountText = event.amount ? ` Around ₱${event.amount} may be involved.` : "";
  return `${displayTitle(event)} is scheduled on ${formatDate(event.date)}.${amountText} Prepare before it affects optional spending.`;
}

function holidayMessage(holiday) {
  if (!holiday) return "This is marked as a Philippine holiday.";
  return `${holiday.type}. ${holiday.note}`;
}

function sentenceCase(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`.replace(/([.!?])?$/, ".");
}

function refineEventDescription(form) {
  const raw = `${form.note || form.title || ""}`
    .replace(/[₱$]?\s*\d+(?:,\d{3})*(?:\.\d+)?/g, "")
    .replace(/\b(maybe|probably|around|estimate|estimated|budget|cost|costs|expense|expenses|spend|spending)\b/gi, "")
    .replace(/\b(food|snacks|coffee|fare|gas|transport|transportation|contribution|offering|entrance fee|fee|payment)\b/gi, "")
    .replace(/\s+(and|or)\s*$/i, "")
    .replace(/[,.]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const fallback = form.title || form.type || "Personal schedule";
  return sentenceCase(raw || fallback);
}

function parseAmount(text) {
  const matches = String(text || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  return Math.round(Number(matches[matches.length - 1]) || 0);
}

function isNoAnswer(text) {
  return /\b(no|none|wala|nothing|nope|not really|skip)\b/i.test(String(text || ""));
}

function getRecommendedCap(total) {
  if (total <= 0) return 0;
  return Math.ceil((total + Math.min(Math.max(total * 0.1, 50), 300)) / 50) * 50;
}

function buildImpactSteps(form) {
  const text = `${form.title || ""} ${form.type || ""} ${form.note || ""}`.toLowerCase();
  const steps = [];

  const add = (key, label, question) => steps.push({ key, label, question });

  if (text.includes("church") || text.includes("ministry") || text.includes("service")) {
    add("transport", "Transportation", "Can you tell me your possible transportation expense for this church event?");
    add("food", "Food or snacks", "Will you possibly buy food, snacks, or drinks before or after the event? How much should we set?");
    add("contribution", "Contribution or offering", "Is there any contribution, offering, registration, or shared payment expected? How much?");
  } else if (text.includes("outing") || text.includes("beach") || text.includes("resort") || text.includes("trip")) {
    add("transport", "Transportation", "How much do you expect to spend on fare, gas, parking, or travel for this outing?");
    add("food", "Food and drinks", "How much should we set for food, drinks, or shared meals?");
    add("activity", "Entrance or activity fee", "Is there any entrance fee, activity fee, cottage fee, or shared payment? How much?");
  } else if (String(form.type || "").toLowerCase() === "bill" || text.includes("bill") || text.includes("payment")) {
    add("bill", "Main payment", "How much is the main bill or payment for this day?");
    add("fee", "Extra fees", "Any convenience fee, transfer fee, fare, or small extra cost connected to this payment?");
  } else if (String(form.type || "").toLowerCase() === "work" || text.includes("work") || text.includes("office") || text.includes("meeting")) {
    add("transport", "Transportation", "How much do you expect to spend on transportation for this work schedule?");
    add("food", "Meals or coffee", "How much should we set for meals, snacks, coffee, or convenience spending?");
    add("extra", "Work extras", "Any office contribution, supplies, or work-related extra expense?");
  } else if (String(form.type || "").toLowerCase() === "health" || text.includes("doctor") || text.includes("medicine") || text.includes("checkup")) {
    add("medical", "Medical cost", "How much should we set for consultation, medicine, lab, or health-related cost?");
    add("transport", "Transportation", "How much will transportation possibly cost for this health schedule?");
  } else if (String(form.type || "").toLowerCase() === "family" || text.includes("family") || text.includes("birthday") || text.includes("fiesta")) {
    add("gift", "Gift or contribution", "Is there a gift, contribution, or family share expected? How much?");
    add("transport", "Transportation", "How much should we set for transportation?");
    add("food", "Food", "Will you spend on food, snacks, or shared meals? How much?");
  } else if (String(form.type || "").toLowerCase() === "relationship" || text.includes("date") || text.includes("partner")) {
    add("transport", "Transportation", "How much do you expect to spend on transportation?");
    add("food", "Food or date activity", "How much should we set for food, drinks, movie, or activity?");
    add("gift", "Gift or extra", "Any gift, surprise, or extra spending you want to include?");
  } else {
    add("transport", "Transportation", "Can you tell me the possible transportation expense for this schedule?");
    add("food", "Food or snacks", "Will there be food, snacks, drinks, or convenience spending? How much should we set?");
    add("shared", "Contribution or fee", "Any contribution, fee, payment, or shared expense expected? How much?");
  }

  add("missed", "Possible overlooked spending", "Before we lock this in, is there anything else you might buy or any possible spending reason we may have missed?");
  return steps;
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
    const financialSource = getFinancialCardSourcePresentation(moneyEvent);

    return {
      event: moneyEvent,
      label: financialSource?.label || (isToday ? "Today impact" : "Money impact"),
      dateLabel,
      badge: holiday ? holiday.icon : "Watch",
      title: `${getEventIcon(moneyEvent)} ${displayTitle(moneyEvent)}`,
      body: holiday ? `${impactMessage(moneyEvent)} Also: ${holiday.title}.` : impactMessage(moneyEvent),
      icon: CreditCard,
      emoji: getEventIcon(moneyEvent),
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
      title: `${getEventIcon(firstEvent)} ${displayTitle(firstEvent)}`,
      body: "This schedule has no money impact yet. Add a ₱ impact if CLARA should watch it financially.",
      icon: CalendarDays,
      emoji: getEventIcon(firstEvent),
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

function getSelectedAgendas({ selectedDate, todayKey, events, holiday }) {
  const agendas = [];

  if (holiday) {
    agendas.push(
      getSelectedAgenda({
        selectedDate,
        todayKey,
        events: [],
        holiday,
      })
    );
  }

  events.forEach((event) => {
    agendas.push(
      getSelectedAgenda({
        selectedDate,
        todayKey,
        events: [event],
        holiday: null,
      })
    );
  });

  if (!agendas.length) {
    agendas.push(
      getSelectedAgenda({
        selectedDate,
        todayKey,
        events: [],
        holiday: null,
      })
    );
  }

  return agendas;
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

function AgendaCarousel({ agendas, selectedDate, onOpen }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef(null);
  const touchCurrentXRef = useRef(null);
  const suppressOpenUntilRef = useRef(0);
  const agendaSignature = agendas
    .map((agenda) => agenda.event?.id || agenda.title)
    .join("|");
  const count = agendas.length;
  const activeAgenda = agendas[Math.min(activeIndex, Math.max(count - 1, 0))];

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedDate, agendaSignature]);

  if (!activeAgenda) return null;

  if (count <= 1) {
    return <AgendaCard agenda={activeAgenda} onOpen={onOpen} />;
  }

  const moveBy = (direction) => {
    setActiveIndex((current) => (current + direction + count) % count);
  };

  const handleTouchStart = (touchEvent) => {
    const x = touchEvent.touches?.[0]?.clientX;
    touchStartXRef.current = Number.isFinite(x) ? x : null;
    touchCurrentXRef.current = touchStartXRef.current;
  };

  const handleTouchMove = (touchEvent) => {
    const x = touchEvent.touches?.[0]?.clientX;
    if (Number.isFinite(x)) touchCurrentXRef.current = x;
  };

  const handleTouchEnd = () => {
    const startX = touchStartXRef.current;
    const endX = touchCurrentXRef.current;
    touchStartXRef.current = null;
    touchCurrentXRef.current = null;

    if (!Number.isFinite(startX) || !Number.isFinite(endX)) return;

    const delta = endX - startX;
    if (Math.abs(delta) < AGENDA_SWIPE_THRESHOLD_PX) return;

    suppressOpenUntilRef.current = Date.now() + AGENDA_OPEN_SUPPRESSION_MS;
    moveBy(delta < 0 ? 1 : -1);
  };

  const handleOpen = (event) => {
    if (Date.now() < suppressOpenUntilRef.current) return;
    onOpen(event);
  };

  return (
    <div
      className="relative shrink-0 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AgendaCard agenda={activeAgenda} onOpen={handleOpen} />

      <button
        type="button"
        onClick={() => moveBy(-1)}
        className="absolute left-2 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#071026]/82 text-white/52 backdrop-blur-md transition hover:text-white/80 sm:flex"
        aria-label="Previous event"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => moveBy(1)}
        className="absolute right-2 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#071026]/82 text-white/52 backdrop-blur-md transition hover:text-white/80 sm:flex"
        aria-label="Next event"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="mt-1 flex h-4 items-center justify-center gap-2" aria-label={`${activeIndex + 1} of ${count} events`}>
        <div className="flex items-center gap-0.5">
          {agendas.map((agenda, index) => (
            <button
              key={agenda.event?.id || `${agenda.title}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="flex h-4 w-4 items-center justify-center"
              aria-label={`Show event ${index + 1} of ${count}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <span
                className={`block rounded-full transition-all ${
                  index === activeIndex
                    ? "h-1.5 w-4 bg-cyan-100/68"
                    : "h-1.5 w-1.5 bg-white/22"
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-[9px] font-black uppercase tracking-[.11em] text-white/32">
          {activeIndex + 1} of {count}
        </span>
      </div>
    </div>
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
          <p className="mt-0.5 text-[9px] font-bold text-white/30">Tap to view • double tap to add</p>
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
          const primaryEvent = getPrimaryCalendarEvent(events);
          const eventIcon = primaryEvent ? getEventIcon(primaryEvent) : "";
          const holiday = getHoliday(cell.key);
          const hasHoliday = Boolean(holiday);
          const hasMoney = events.some(isMoneyEvent);
          const hasAny = events.length > 0;
          const agendaCount = events.length + (hasHoliday ? 1 : 0);
          const selected = cell.key === selectedDate;
          const today = cell.key === todayKey;
          const displayIcon = eventIcon || holiday?.icon || "";

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={`relative flex h-full min-h-0 touch-manipulation flex-col items-center justify-center rounded-[clamp(0.78rem,3.5vw,1rem)] border text-[clamp(0.74rem,3.7vw,0.92rem)] font-black transition duration-200 active:scale-[.97] ${
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
              aria-label={`Select ${cell.key}${primaryEvent ? `, ${displayTitle(primaryEvent)}` : holiday ? `, ${holiday.title}` : ""}${agendaCount > 1 ? `, ${agendaCount} events` : ""}. Double tap to add a schedule.`}
              title={primaryEvent ? `${displayTitle(primaryEvent)}${agendaCount > 1 ? ` • ${agendaCount} events` : ""} • Double tap to add another schedule` : holiday ? `${holiday.title} • ${holiday.type}${agendaCount > 1 ? ` • ${agendaCount} events` : ""}` : "Double tap to add a schedule"}
            >
              {selected ? (
                <span className="pointer-events-none absolute inset-[-1px] rounded-[inherit] border border-cyan-100/14" />
              ) : null}
              {displayIcon ? (
                <>
                  <span className="absolute left-1.5 top-1 text-[8.5px] font-black leading-none text-white/38">{cell.day}</span>
                  <span className="relative z-10 text-[clamp(0.95rem,4.4vw,1.12rem)] leading-none" aria-hidden="true">
                    {displayIcon}
                  </span>
                  {eventIcon && hasHoliday ? (
                    <span className="absolute right-1.5 top-1 text-[8px] leading-none" aria-hidden="true">{holiday.icon}</span>
                  ) : null}
                </>
              ) : (
                <span className="relative z-10">{cell.day}</span>
              )}
              {selected ? (
                <span className="absolute top-1.5 h-1 w-5 rounded-full bg-cyan-100/50 shadow-[0_0_8px_rgba(103,232,249,.25)]" />
              ) : null}
              {agendaCount > 1 ? (
                <span className="absolute bottom-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white/10 bg-white/[.08] px-1 text-[8px] font-black leading-none text-white/60">
                  {agendaCount > 9 ? "9+" : agendaCount}
                </span>
              ) : hasAny ? (
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

function Sheet({ event, mode, form, setForm, onSave, onRemove, onClose, onRefineDescription, onStartImpact }) {
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
  const managedStableIncomeEvent =
    !adding && isStableIncomeScheduleProjection(event);
  const managedFinancialCardEvent =
    !adding && isFinancialCardScheduleProjection(event);
  const financialSource = managedFinancialCardEvent
    ? getFinancialCardSourcePresentation(event)
    : null;

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
              {adding ? "Schedule" : financialSource?.label || event?.type}
            </p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">
              {adding ? "Add schedule" : `${getEventIcon(event)} ${displayTitle(event)}`}
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
          <form onSubmit={onStartImpact} className="mt-5 space-y-3">
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
                value={form.amount ? `₱${form.amount}` : ""}
                readOnly
                placeholder="AI will calculate"
                className="w-full rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm font-bold text-cyan-50 outline-none placeholder:text-white/30"
              />
            </div>

            <div className="rounded-[22px] border border-white/8 bg-white/[.025] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Description</span>
                <button
                  type="button"
                  onClick={onRefineDescription}
                  className="rounded-full border border-cyan-300/18 bg-cyan-300/[.055] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-cyan-100/72"
                >
                  Refine with CLARA
                </button>
              </div>
              <textarea
                value={form.note}
                onChange={(eventChange) => setForm((current) => ({ ...current, note: eventChange.target.value }))}
                placeholder="Describe only the event. Example: Church outing after service with the youth group."
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
              />
            </div>

            <button type="submit" className="w-full rounded-2xl border border-cyan-300/24 bg-cyan-300/[.10] px-4 py-3 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.08)]">
              Calculate money impact
            </button>
            <button type="button" onClick={onSave} className="w-full rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black uppercase tracking-[.14em] text-white/38">
              Save without impact
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
            {managedStableIncomeEvent ? (
              <div className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[.035] px-4 py-3 text-center text-xs font-bold leading-5 text-cyan-50/62">
                Payday timing is managed in Income Hub.
              </div>
            ) : managedFinancialCardEvent ? (
              <div className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[.035] px-4 py-3 text-center text-cyan-50/62">
                <p className="text-xs font-black leading-5">{financialSource?.ownerTitle || "Managed from financial card"}</p>
                <p className="mt-1 text-[11px] font-bold leading-5 text-cyan-50/48">
                  {financialSource?.ownerCopy || "Update this date from its source financial card."}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(event.id)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-black text-white/58"
              >
                <Trash2 className="h-4 w-4" /> Remove schedule
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactAssistantModal({ session, input, setInput, onSend, onSave, onClose }) {
  if (!session) return null;
  const recommendedCap = getRecommendedCap(session.total);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="flex max-h-[86svh] w-full max-w-[520px] flex-col overflow-hidden rounded-[30px] border border-cyan-300/18 bg-[#071026]/98 shadow-[0_22px_90px_rgba(0,0,0,.62),0_0_42px_rgba(34,211,238,.12)] backdrop-blur-2xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className="border-b border-white/8 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.22em] text-cyan-100/70">CLARA impact coach</p>
              <h3 className="mt-3 text-xl font-black leading-tight text-white">Calculate money impact</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-[22px] border border-cyan-300/14 bg-cyan-300/[.055] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100/56">Running estimate</p>
            <p className="mt-1 text-2xl font-black text-white">₱{session.total.toLocaleString()}</p>
            {session.complete && recommendedCap ? (
              <p className="mt-1 text-xs font-bold text-white/48">Suggested cap: ₱{recommendedCap.toLocaleString()}</p>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {session.messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[84%] rounded-[22px] px-4 py-3 text-sm font-semibold leading-6 ${message.role === "user" ? "bg-cyan-300/[.12] text-cyan-50" : "border border-white/8 bg-white/[.035] text-white/64"}`}>
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 p-4">
          {session.items.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {session.items.map((item) => (
                <span key={`${item.label}-${item.amount}-${item.note}`} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white/44">
                  {item.label}: ₱{item.amount.toLocaleString()}
                </span>
              ))}
            </div>
          ) : null}

          {session.complete ? (
            <button
              type="button"
              onClick={() => onSave(recommendedCap || session.total)}
              className="w-full rounded-2xl border border-cyan-300/24 bg-cyan-300/[.11] px-4 py-3 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.09)]"
            >
              Save schedule with ₱{(recommendedCap || session.total).toLocaleString()} impact
            </button>
          ) : (
            <form onSubmit={onSend} className="flex gap-2">
              <input
                value={input}
                onChange={(eventChange) => setInput(eventChange.target.value)}
                placeholder="Reply with amount or details..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32"
              />
              <button
                type="submit"
                className="rounded-2xl border border-cyan-300/22 bg-cyan-300/[.09] px-4 py-3 text-sm font-black text-cyan-50"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardSchedulePanel() {
  const { user } = useUserRole() || {};
  const ownerId = useMemo(
    () => getRecurringCashFlowOwnerId(user),
    [user?.id, user?.email]
  );
  const today = toDateKey(new Date());
  const [events, setEvents] = useState(() => readEvents(user));
  const [incomeProjectedEvents, setIncomeProjectedEvents] = useState([]);
  const [financialProjectedEvents, setFinancialProjectedEvents] = useState([]);
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [lastDateTap, setLastDateTap] = useState({ date: "", time: 0 });
  const [mode, setMode] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [impactSession, setImpactSession] = useState(null);
  const [impactInput, setImpactInput] = useState("");
  const [form, setForm] = useState({ title: "", date: today, time: "", type: "Personal", amount: "", note: "" });
  const [pastRescheduleId, setPastRescheduleId] = useState("");
  const [pastRescheduleDate, setPastRescheduleDate] = useState("");

  useEffect(() => setEvents(readEvents(user)), [ownerId]);
  useEffect(() => saveEvents(user, events), [events, ownerId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let cancelled = false;
    let requestRevision = 0;

    const refreshIncomeProjection = async () => {
      const revision = ++requestRevision;

      try {
        const incomeSources = await getIncomeSources(ownerId);
        if (cancelled || revision !== requestRevision) return;
        setIncomeProjectedEvents(
          buildStableIncomeScheduleProjection(incomeSources)
        );
      } catch (error) {
        if (cancelled || revision !== requestRevision) return;
        console.warn(
          "CLARA Stable Income Calendar projection could not be refreshed:",
          error
        );
        setIncomeProjectedEvents([]);
      }
    };

    setIncomeProjectedEvents([]);
    refreshIncomeProjection();
    window.addEventListener(
      INCOME_HUB_UPDATED_EVENT,
      refreshIncomeProjection
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        INCOME_HUB_UPDATED_EVENT,
        refreshIncomeProjection
      );
    };
  }, [ownerId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let cancelled = false;
    let requestRevision = 0;

    const refreshFinancialProjection = async () => {
      const revision = ++requestRevision;

      try {
        const { savingsGoalEvents, debtEvents } =
          await loadFinancialCardScheduleProjections();
        if (cancelled || revision !== requestRevision) return;
        setFinancialProjectedEvents(
          mergeScheduleEventCollections(savingsGoalEvents, debtEvents)
        );
      } catch (error) {
        if (cancelled || revision !== requestRevision) return;
        console.warn(
          "CLARA Savings Goal / Debt Calendar projection could not be refreshed:",
          error
        );
        setFinancialProjectedEvents([]);
      }
    };

    setFinancialProjectedEvents([]);
    refreshFinancialProjection();
    FINANCIAL_CARD_SCHEDULE_UPDATE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, refreshFinancialProjection);
    });

    return () => {
      cancelled = true;
      FINANCIAL_CARD_SCHEDULE_UPDATE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, refreshFinancialProjection);
      });
    };
  }, [ownerId]);

  const renderEvents = useMemo(
    () =>
      mergeScheduleEventCollections(
        mergeScheduleEventsForRender(events, incomeProjectedEvents),
        financialProjectedEvents
      ),
    [events, incomeProjectedEvents, financialProjectedEvents]
  );

  const sorted = useMemo(
    () => [...renderEvents].sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`)),
    [renderEvents]
  );

  const byDate = useMemo(() => {
    return sorted.reduce((acc, event) => {
      acc[event.date] = [...(acc[event.date] || []), event];
      return acc;
    }, {});
  }, [sorted]);

  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const selectedEvents = byDate[selectedDate] || [];
  const unresolvedPastEvents = useMemo(
    () => events
      .filter((event) => {
        const date = String(event?.date || "").slice(0, 10);
        return Boolean(date && date < today);
      })
      .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || ""))),
    [events, today]
  );
  const unresolvedPastEvent = unresolvedPastEvents[0] || null;
  const selectedHoliday = getHoliday(selectedDate);
  const selectedAgendas = useMemo(
    () => getSelectedAgendas({ selectedDate, todayKey: today, events: selectedEvents, holiday: selectedHoliday }),
    [selectedDate, selectedEvents, selectedHoliday, today]
  );
  const monthlyInsight = useMemo(
    () => getMonthlyInsight({ sortedEvents: sorted, monthDate, todayKey: today }),
    [sorted, monthDate, today]
  );

  const openAdd = (date = selectedDate) => {
    setForm({ title: "", date, time: "", type: "Personal", amount: "", note: "" });
    setSelectedEvent(null);
    setImpactSession(null);
    setImpactInput("");
    setMode("add");
  };

  const handleDateSelect = (date) => {
    const now = Date.now();
    const isDoubleTap = lastDateTap.date === date && now - lastDateTap.time <= DOUBLE_TAP_DELAY_MS;

    setSelectedDate(date);

    if (isDoubleTap) {
      setLastDateTap({ date: "", time: 0 });
      openAdd(date);
      return;
    }

    setLastDateTap({ date, time: now });
  };

  const openEvent = (event) => {
    setSelectedEvent(event);
    setMode("event");
  };

  const beginPastReschedule = (event) => {
    const tomorrow = addDays(fromDateKey(today), 1);
    setPastRescheduleId(String(event?.id || ""));
    setPastRescheduleDate(tomorrow ? toDateKey(tomorrow) : today);
  };

  const applyPastReschedule = () => {
    if (!pastRescheduleId || !pastRescheduleDate || pastRescheduleDate <= today) return;
    setEvents((current) => {
      const next = current.map((event) =>
        String(event?.id) === String(pastRescheduleId)
          ? { ...event, date: pastRescheduleDate }
          : event
      );
      writeSchedule(user, next);
      return next;
    });
    setSelectedDate(pastRescheduleDate);
    setPastRescheduleId("");
    setPastRescheduleDate("");
  };

  const close = () => {
    setMode(null);
    setSelectedEvent(null);
    setImpactSession(null);
    setImpactInput("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleForecastCreateEvent = (browserEvent) => {
      const detail = browserEvent?.detail || {};
      const title = String(detail.title || "").trim();

      if (!title || isDerivedScheduleProjection(detail)) return;

      const nextEvent = {
        id: detail.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        date: detail.date || selectedDate || today,
        time: detail.time || "",
        type: detail.type || "Personal",
        amount: cleanMoney(detail.amount),
        note: String(detail.note || "").trim(),
        impactBreakdown: Array.isArray(detail.impactBreakdown)
          ? detail.impactBreakdown
          : [],
      };

      setEvents((current) => {
        if (current.some((event) => event.id === nextEvent.id)) return current;
        return [...current, nextEvent];
      });

      setMode(null);
      setSelectedEvent(null);
      setImpactSession(null);
      setImpactInput("");
    };

    window.addEventListener(CLARA_SCHEDULE_CREATE_EVENT, handleForecastCreateEvent);

    return () => {
      window.removeEventListener(CLARA_SCHEDULE_CREATE_EVENT, handleForecastCreateEvent);
    };
  }, [selectedDate, today]);

  const save = (submitEvent) => {
    submitEvent?.preventDefault?.();
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

  const saveWithImpact = (impactAmount) => {
    const cleanImpact = cleanMoney(impactAmount);
    setForm((current) => ({ ...current, amount: cleanImpact }));

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
        amount: cleanImpact,
        note: form.note.trim(),
      },
    ]);
    close();
  };

  const remove = (id) => {
    const target = renderEvents.find(
      (event) => String(event?.id) === String(id)
    );

    if (isDerivedScheduleProjection(target)) {
      close();
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== id));
    close();
  };

  const refineDescription = () => {
    setForm((current) => ({ ...current, note: refineEventDescription(current) }));
  };

  const startImpact = (submitEvent) => {
    submitEvent.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    const steps = buildImpactSteps(form);
    const eventLabel = form.note || form.title;
    const firstQuestion = steps[0]?.question || "What possible spending should we include for this day?";

    setImpactInput("");
    setImpactSession({
      steps,
      currentStep: 0,
      items: [],
      total: 0,
      complete: false,
      messages: [
        {
          role: "assistant",
          text: `Hi ${user?.display_name || user?.user_metadata?.full_name || "there"}! So you have ${eventLabel} — sounds good. Let's talk about the possible spending so you can set a clear limit for that day.`,
        },
        { role: "assistant", text: firstQuestion },
      ],
    });
  };

  const sendImpactReply = (submitEvent) => {
    submitEvent.preventDefault();
    const reply = impactInput.trim();
    if (!reply || !impactSession) return;

    const step = impactSession.steps[impactSession.currentStep];
    const amount = parseAmount(reply);
    const shouldAdd = amount > 0 && !isNoAnswer(reply);
    const nextItems = shouldAdd
      ? [...impactSession.items, { label: step?.label || "Extra", amount, note: reply }]
      : impactSession.items;
    const nextTotal = nextItems.reduce((sum, item) => sum + item.amount, 0);
    const nextStepIndex = impactSession.currentStep + 1;
    const isComplete = nextStepIndex >= impactSession.steps.length;
    const messages = [...impactSession.messages, { role: "user", text: reply }];

    if (shouldAdd) {
      messages.push({ role: "assistant", text: `Noted — ₱${amount.toLocaleString()} for ${step?.label?.toLowerCase() || "this part"}.` });
    } else {
      messages.push({ role: "assistant", text: `Got it — we will not add an amount for ${step?.label?.toLowerCase() || "that part"}.` });
    }

    if (isComplete) {
      const cap = getRecommendedCap(nextTotal);
      messages.push({
        role: "assistant",
        text: cap
          ? `So far, your planned impact is ₱${nextTotal.toLocaleString()}. I recommend setting the final spending cap at ₱${cap.toLocaleString()} so you have a small buffer without going too loose.`
          : "No amount has been added yet. You can still close this and enter a manual impact later.",
      });
    } else {
      messages.push({ role: "assistant", text: impactSession.steps[nextStepIndex].question });
    }

    setImpactSession({
      ...impactSession,
      currentStep: nextStepIndex,
      items: nextItems,
      total: nextTotal,
      complete: isComplete,
      messages,
    });
    setImpactInput("");
  };

  return (
    <div
      className="flex min-h-0 flex-col gap-[clamp(0.5rem,1.35svh,0.75rem)] overflow-hidden pb-1"
      style={{ height: "clamp(560px, calc(100svh - 126px), 720px)" }}
    >
      <AgendaCarousel agendas={selectedAgendas} selectedDate={selectedDate} onOpen={openEvent} />
      <CalendarMonth
        monthDate={monthDate}
        cells={cells}
        selectedDate={selectedDate}
        todayKey={today}
        byDate={byDate}
        onSelect={handleDateSelect}
        onAdd={() => openAdd(selectedDate)}
        onPrev={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        onNext={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
      />
      {unresolvedPastEvent ? (
        <section className="mx-4 mb-4 rounded-[22px] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(88,56,9,.34),rgba(27,16,4,.42))] p-4 shadow-[0_14px_34px_rgba(0,0,0,.22)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-100/60">Past schedule</p>
              <h3 className="mt-1 truncate text-[15px] font-black text-white">{getEventIcon(unresolvedPastEvent)} {displayTitle(unresolvedPastEvent)}</h3>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-white/55">This event has already passed. Remove it now or reschedule it.</p>
              {unresolvedPastEvents.length > 1 ? (
                <p className="mt-1 text-[10px] font-bold text-white/30">{unresolvedPastEvents.length} past schedules need review.</p>
              ) : null}
            </div>
          </div>

          {pastRescheduleId === String(unresolvedPastEvent.id) ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="date"
                min={(() => { const tomorrow = addDays(fromDateKey(today), 1); return tomorrow ? toDateKey(tomorrow) : today; })()}
                value={pastRescheduleDate}
                onChange={(event) => setPastRescheduleDate(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-[12px] font-bold text-white outline-none"
              />
              <button
                type="button"
                onClick={applyPastReschedule}
                disabled={!pastRescheduleDate || pastRescheduleDate <= today}
                className="min-h-11 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 text-[11px] font-black text-cyan-50 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => remove(unresolvedPastEvent.id)}
                className="min-h-11 rounded-xl border border-white/10 bg-white/[.035] px-3 text-[11px] font-black text-white/68"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => beginPastReschedule(unresolvedPastEvent)}
                className="min-h-11 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-3 text-[11px] font-black text-cyan-50"
              >
                Reschedule
              </button>
            </div>
          )}
        </section>
      ) : null}
      <MonthlyInsightCard insight={monthlyInsight} />
      <Sheet
        event={selectedEvent}
        mode={mode}
        form={form}
        setForm={setForm}
        onSave={save}
        onRemove={remove}
        onClose={close}
        onRefineDescription={refineDescription}
        onStartImpact={startImpact}
      />
      <ImpactAssistantModal
        session={impactSession}
        input={impactInput}
        setInput={setImpactInput}
        onSend={sendImpactReply}
        onSave={saveWithImpact}
        onClose={() => setImpactSession(null)}
      />
    </div>
  );
}
