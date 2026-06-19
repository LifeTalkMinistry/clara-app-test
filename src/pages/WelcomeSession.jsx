import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  LockKeyhole,
  Sparkles,
  X,
} from "lucide-react";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import {
  buildWelcomeSessionSlots,
  WELCOME_SESSION_AVAILABLE_SLOT_COUNT,
  WELCOME_SESSION_FORM_URL,
} from "@/lib/welcome-session-schedule";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
}

function SummaryChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2 text-cyan-100/65">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[8px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-1.5 text-[15px] font-black text-white">{value}</p>
    </div>
  );
}

function WelcomeIntro() {
  return (
    <div className="relative grid h-full gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
      <div>
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.22),rgba(124,58,237,0.48))] shadow-[0_14px_34px_rgba(76,29,149,0.30)]">
            <CalendarDays className="h-6 w-6 text-cyan-50" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
              Personal onboarding
            </p>
            <h1 className="mt-1 text-[26px] font-black tracking-tight text-white sm:text-[32px]">
              Welcome Session
            </h1>
            <p className="mt-1 text-[12px] font-semibold text-slate-300/75 sm:text-[13px]">
              Your one-time 30-minute CLARA setup and coaching call.
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-[13px] font-semibold leading-relaxed text-slate-200/80 sm:text-[14px]">
          Choose an available schedule, then complete the Google Form so the session can be prepared around your actual CLARA setup and starting concern.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <SummaryChip icon={Clock3} label="Session" value="30 min" />
        <SummaryChip icon={Sparkles} label="Benefit" value="One time" />
        <SummaryChip
          icon={CalendarDays}
          label="Open"
          value={`${WELCOME_SESSION_AVAILABLE_SLOT_COUNT} slots`}
        />
      </div>
    </div>
  );
}

function AvailabilityPanel({
  selectedDateLabel,
  selectedDateSlots,
  selectedSlotId,
  onSelectSlot,
  onReset,
  onContinue,
  hasCommittedAccess,
  showMissingLinkMessage,
}) {
  const selectedSlot = selectedDateSlots.find((slot) => slot.id === selectedSlotId) || null;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.22),rgba(124,58,237,0.48))] shadow-[0_14px_34px_rgba(76,29,149,0.30)]">
            <Clock3 className="h-6 w-6 text-cyan-50" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
              Available times
            </p>
            <h1 className="mt-1 truncate text-[24px] font-black tracking-tight text-white sm:text-[30px]">
              {selectedDateLabel}
            </h1>
            <p className="mt-1 text-[11px] font-semibold text-slate-300/70 sm:text-[12px]">
              Select one preferred time below.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Back to Welcome Session overview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {selectedDateSlots.map((slot) => {
          const isAvailable = slot.status === "available";
          const isSelected = selectedSlotId === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!isAvailable || !hasCommittedAccess}
              onClick={() => onSelectSlot(slot.id)}
              className={`rounded-[18px] border px-3 py-3.5 text-left transition ${
                isSelected
                  ? "border-cyan-200/60 bg-cyan-200/[0.12] shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                  : isAvailable
                    ? "border-white/[0.09] bg-white/[0.045] hover:-translate-y-0.5 hover:border-cyan-100/30 hover:bg-white/[0.075] active:translate-y-0"
                    : "cursor-not-allowed border-white/[0.05] bg-black/[0.10] opacity-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Clock3 className={`h-4 w-4 ${isAvailable ? "text-cyan-100/80" : "text-slate-500/60"}`} />
                <span
                  className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] ${
                    isAvailable
                      ? "border-emerald-300/20 bg-emerald-300/[0.10] text-emerald-200"
                      : "border-rose-300/15 bg-rose-300/[0.08] text-rose-200/75"
                  }`}
                >
                  {isSelected ? "Selected" : isAvailable ? "Free" : "Occupied"}
                </span>
              </div>
              <p className="mt-3 text-[15px] font-black text-white/92">{slot.timeLabel}</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.10em] text-slate-400/60">
                30-minute session
              </p>
            </button>
          );
        })}
      </div>

      {!hasCommittedAccess ? (
        <button
          type="button"
          onClick={openCommittedVersionModal}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-violet-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.82),rgba(99,102,241,0.92))] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]"
        >
          <LockKeyhole className="h-3.5 w-3.5" />
          Unlock with Committed
        </button>
      ) : (
        <button
          type="button"
          disabled={!selectedSlot}
          onClick={onContinue}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.26)] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selectedSlot ? "Continue to appointment form" : "Choose a free time"}
          {selectedSlot ? <ExternalLink className="h-3.5 w-3.5" /> : null}
        </button>
      )}

      {showMissingLinkMessage ? (
        <p className="mt-2 rounded-[14px] border border-amber-200/15 bg-amber-100/[0.05] px-3 py-2 text-center text-[9px] font-bold leading-relaxed text-amber-100/90">
          The Google Form link is currently unavailable.
        </p>
      ) : null}

      <div className="mt-2.5 flex items-start gap-2 rounded-[15px] border border-amber-200/[0.08] bg-amber-100/[0.035] px-3 py-2.5">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/65" />
        <p className="text-[9px] font-semibold leading-relaxed text-slate-300/65">
          First come, first served. Your slot is confirmed only after the form is reviewed.
        </p>
      </div>
    </div>
  );
}

export default function WelcomeSession() {
  const navigate = useNavigate();
  const hasCommittedAccess = useCommittedFeatureAccess();
  const slots = useMemo(() => buildWelcomeSessionSlots(), []);

  const slotsByDate = useMemo(() => {
    const map = new Map();
    slots.forEach((slot) => {
      const current = map.get(slot.dateKey) || [];
      current.push(slot);
      map.set(slot.dateKey, current);
    });
    return map;
  }, [slots]);

  const monthOptions = useMemo(() => {
    const months = new Map();
    slots.forEach((slot) => {
      if (!months.has(slot.monthKey)) {
        months.set(slot.monthKey, new Date(slot.date.getFullYear(), slot.date.getMonth(), 1));
      }
    });
    return Array.from(months.entries()).map(([key, date]) => ({ key, date }));
  }, [slots]);

  const firstAvailableSlot = slots.find((slot) => slot.status === "available") || slots[0];
  const [monthIndex, setMonthIndex] = useState(() => {
    const index = monthOptions.findIndex((month) => month.key === firstAvailableSlot?.monthKey);
    return Math.max(index, 0);
  });
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [showAvailability, setShowAvailability] = useState(false);
  const [showMissingLinkMessage, setShowMissingLinkMessage] = useState(false);

  const selectedMonth = monthOptions[monthIndex]?.date || new Date();
  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);
  const selectedDateSlots = slotsByDate.get(selectedDateKey) || [];
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;
  const todayKey = toDateKey(new Date());

  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(selectedMonth);

  const selectedDateLabel = selectedDateSlots[0]?.fullDateLabel || "Choose a date";

  const resetAvailability = () => {
    setShowAvailability(false);
    setSelectedDateKey("");
    setSelectedSlotId("");
    setShowMissingLinkMessage(false);
  };

  const moveMonth = (direction) => {
    const nextIndex = Math.min(Math.max(monthIndex + direction, 0), monthOptions.length - 1);
    if (nextIndex === monthIndex) return;
    setMonthIndex(nextIndex);
    resetAvailability();
  };

  const handleDateSelect = (dateKey) => {
    const dateSlots = slotsByDate.get(dateKey) || [];
    const hasAvailableSlot = dateSlots.some((slot) => slot.status === "available");
    if (!hasAvailableSlot) return;

    setSelectedDateKey(dateKey);
    setSelectedSlotId("");
    setShowMissingLinkMessage(false);
    setShowAvailability(true);
  };

  const handleContinue = () => {
    if (!selectedSlot || selectedSlot.status !== "available") return;

    if (!WELCOME_SESSION_FORM_URL) {
      setShowMissingLinkMessage(true);
      return;
    }

    try {
      sessionStorage.setItem(
        "claraWelcomeSessionPreferredSlot",
        JSON.stringify({
          id: selectedSlot.id,
          date: selectedSlot.fullDateLabel,
          time: selectedSlot.timeLabel,
        }),
      );
    } catch {
      // The Google Form can still open when browser storage is unavailable.
    }

    window.open(WELCOME_SESSION_FORM_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden px-3 pb-3 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-[100px]" />
        <div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-violet-500/[0.10] blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-3 py-2.5 sm:py-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.045] px-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-cyan-100/20 hover:bg-white/[0.075] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>

          <div className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/75">
            CLARA Human Support
          </div>
        </header>

        <section className="relative min-h-[300px] overflow-hidden rounded-[30px] border border-cyan-100/15 bg-[linear-gradient(145deg,rgba(5,28,46,0.94),rgba(8,18,43,0.95)_50%,rgba(35,14,72,0.94))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.08)] sm:min-h-[280px] sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.14),transparent_38%),radial-gradient(circle_at_100%_10%,rgba(139,92,246,0.16),transparent_40%)]" />

          {showAvailability ? (
            <AvailabilityPanel
              selectedDateLabel={selectedDateLabel}
              selectedDateSlots={selectedDateSlots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={(slotId) => {
                setSelectedSlotId(slotId);
                setShowMissingLinkMessage(false);
              }}
              onReset={resetAvailability}
              onContinue={handleContinue}
              hasCommittedAccess={hasCommittedAccess}
              showMissingLinkMessage={showMissingLinkMessage}
            />
          ) : (
            <WelcomeIntro />
          )}
        </section>

        <section className="mt-3 rounded-[28px] border border-white/[0.08] bg-[rgba(5,18,38,0.76)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.20em] text-cyan-200/70">
                Appointment calendar
              </p>
              <h2 className="mt-1 text-[20px] font-black text-white">{monthLabel}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                disabled={monthIndex === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Previous appointment month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                disabled={monthIndex >= monthOptions.length - 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Next appointment month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-slate-400/70"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const dateSlots = slotsByDate.get(dateKey) || [];
              const isCurrentMonth = toMonthKey(date) === toMonthKey(selectedMonth);
              const isSelected = showAvailability && dateKey === selectedDateKey;
              const isToday = dateKey === todayKey;
              const availableCount = dateSlots.filter((slot) => slot.status === "available").length;
              const hasAppointments = dateSlots.length > 0;
              const isClickable = availableCount > 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleDateSelect(dateKey)}
                  disabled={!isClickable}
                  className={`relative aspect-square min-h-[42px] rounded-[16px] border text-center transition sm:min-h-[54px] ${
                    isSelected
                      ? "border-cyan-200/65 bg-[linear-gradient(145deg,rgba(34,211,238,0.20),rgba(99,102,241,0.24))] text-white shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                      : isClickable
                        ? "cursor-pointer border-white/[0.09] bg-white/[0.045] text-white/90 hover:-translate-y-0.5 hover:border-cyan-100/35 hover:bg-white/[0.09] active:translate-y-0"
                        : hasAppointments
                          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.025] text-white/55"
                          : "cursor-default border-transparent bg-transparent text-slate-500/45"
                  } ${!isCurrentMonth ? "opacity-35" : ""}`}
                  aria-label={`${date.toDateString()}${availableCount ? `, ${availableCount} available appointment` : ", no available appointment"}`}
                >
                  <span className={`text-[11px] font-black sm:text-[13px] ${isToday ? "text-cyan-200" : ""}`}>
                    {date.getDate()}
                  </span>

                  {hasAppointments ? (
                    <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1">
                      {dateSlots.map((slot) => (
                        <span
                          key={slot.id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            slot.status === "available" ? "bg-emerald-300" : "bg-rose-300/65"
                          }`}
                        />
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[18px] border border-white/[0.06] bg-black/[0.10] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300/70">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Tap a free date
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300/70">
              <span className="h-2 w-2 rounded-full bg-rose-300/65" />
              Occupied
            </div>
            <p className="ml-auto text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200/55">
              Updated manually
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
