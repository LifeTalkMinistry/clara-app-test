import { ArrowRight, ChevronLeft, ChevronRight, Clock3, Lock, X } from "lucide-react";
import { useCommittedMembershipState } from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import { LoadingPanel, NoticePanel } from "./SessionShared";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CREATOR_FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=61590352695488";

export function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
}

export function MonthCalendar({
  slots,
  slotsByDate,
  availabilityLoading,
  loadError,
  loadAvailability,
  monthIndex,
  setMonthIndex,
  monthOptions,
  selectedMonthKey,
  selectedMonth,
  calendarDays,
  todayKey,
  onDateSelect,
  isCommitmentSession,
}) {
  const membership = useCommittedMembershipState();
  const lockedPreview = !membership.hasMonthlyCoachingAccess;
  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(selectedMonth);

  return (
    <section className="clara-coaching-calendar-brand relative mt-3 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[rgba(5,18,38,0.76)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-5">
      <div
        aria-hidden={lockedPreview ? "true" : undefined}
        className={lockedPreview ? "pointer-events-none select-none blur-[1.6px] opacity-[0.48]" : ""}
      >
        {availabilityLoading ? <LoadingPanel /> : null}
        {!availabilityLoading && loadError && !slots.length ? (
          <NoticePanel
            danger
            title="Availability could not be loaded"
            message="CLARA will not show fake schedules. Retry to request the current backend-controlled availability."
            actionLabel="Retry"
            onAction={loadAvailability}
          />
        ) : null}
        {!availabilityLoading && !loadError && !slots.length ? (
          <NoticePanel
            title="No appointments are currently available"
            message="Max has no bookable schedules inside the current booking window. Please check again later."
            actionLabel="Check again"
            onAction={loadAvailability}
          />
        ) : null}
        {!availabilityLoading && slots.length ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.20em] text-cyan-200/70">
                  {isCommitmentSession ? "One-on-one session calendar" : "Monthly coaching calendar"}
                </p>
                <h2 className="mt-1 text-[20px] font-black text-white">{monthLabel}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
                  disabled={lockedPreview || monthIndex === 0}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 disabled:opacity-25"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setMonthIndex((value) => Math.min(monthOptions.length - 1, value + 1))
                  }
                  disabled={lockedPreview || monthIndex >= monthOptions.length - 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 disabled:opacity-25"
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
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const dateSlots = slotsByDate.get(dateKey) || [];
                const isCurrentMonth =
                  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` ===
                  selectedMonthKey;
                const isToday = dateKey === todayKey;
                const isClickable = dateSlots.length > 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onDateSelect(dateKey)}
                    disabled={lockedPreview || !isClickable}
                    className={`relative aspect-square min-h-[42px] rounded-[16px] border text-center transition sm:min-h-[54px] ${
                      isClickable
                        ? "cursor-pointer border-white/[0.09] bg-white/[0.045] text-white/90 hover:-translate-y-0.5 hover:border-cyan-100/35 hover:bg-white/[0.09]"
                        : "cursor-default border-transparent bg-transparent text-slate-500/45"
                    } ${!isCurrentMonth ? "opacity-35" : ""}`}
                  >
                    <span className={`text-[11px] font-black sm:text-[13px] ${isToday ? "text-cyan-200" : ""}`}>
                      {date.getDate()}
                    </span>
                    {isClickable ? (
                      <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-300" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[18px] border border-white/[0.06] bg-black/[0.10] px-3.5 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300/70">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Backend available
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300/70">
                <span className="h-2 w-2 rounded-full bg-slate-500/60" />
                Unavailable
              </div>
              <p className="ml-auto text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200/55">
                Asia/Manila · Live API
              </p>
            </div>
          </>
        ) : null}
      </div>

      {lockedPreview ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020817]/18 p-4 sm:p-6">
          <div className="w-full max-w-[390px] rounded-[26px] border border-[#ff4d55]/20 bg-[linear-gradient(155deg,rgba(3,18,38,0.98),rgba(8,20,45,0.99)_56%,rgba(31,12,48,0.98))] px-5 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_38px_rgba(255,77,85,0.06),inset_0_1px_0_rgba(255,255,255,0.07)] sm:px-6 sm:py-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-[18px] border border-[#ff4d55]/18 bg-[#ff4d55]/[0.07] text-[#ff9ca1] shadow-[0_0_24px_rgba(255,77,85,0.07)]">
              <Lock className="h-5 w-5" />
            </div>

            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.20em] text-[#ff959a]/80">
              Don&apos;t Do It Alone
            </p>
            <h3 className="mt-1.5 text-[22px] font-black tracking-[-0.025em] text-white">
              Monthly Coaching is included
            </h3>
            <p className="mx-auto mt-2.5 max-w-[330px] text-[12px] font-semibold leading-[1.65] text-slate-200/72">
              Monthly Coaching belongs to CLARA&apos;s human-accountability tier. Activate Don&apos;t Do It Alone to book one dedicated 30-minute conversation each month.
            </p>

            <a
              href={CREATOR_FACEBOOK_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-[#ff8b91]/24 bg-[linear-gradient(105deg,rgba(37,99,235,0.94),rgba(85,77,224,0.95)_52%,rgba(218,48,88,0.90))] px-5 text-[11px] font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] transition active:scale-[0.99]"
            >
              Choose Don&apos;t Do It Alone
              <ArrowRight className="h-4 w-4" />
            </a>

            <p className="mt-3 text-[9px] font-bold leading-4 text-white/40">
              ₱299/month · includes one 30-minute human accountability session each month.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function TimePicker({
  selectedDateLabel,
  selectedDateSlots,
  selectedSlotId,
  onSelectSlot,
  onReset,
  onContinue,
}) {
  const membership = useCommittedMembershipState();
  const selectedSlot =
    selectedDateSlots.find((slot) => slot.id === selectedSlotId) || null;

  // Defense-in-depth: booking controls exist only for the tier that explicitly
  // includes Monthly Coaching. Lower CLARA tiers can preview but cannot book.
  if (!membership.hasMonthlyCoachingAccess) return null;

  return (
    <div className="clara-coaching-brand-anchor clara-session-timepicker-brand relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-black leading-tight tracking-tight text-white sm:text-[30px]">
            {selectedDateLabel}
          </h1>
          <p className="mt-1 text-[11px] font-semibold text-slate-300/70">
            Choose your preferred 30-minute session.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-white/65"
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
              disabled={!isAvailable}
              onClick={() => onSelectSlot(slot.id)}
              className={`rounded-[18px] border px-3 py-3.5 text-left transition ${
                isSelected
                  ? "border-cyan-200/60 bg-cyan-200/[0.12]"
                  : "border-white/[0.09] bg-white/[0.045] hover:border-cyan-100/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Clock3 className="h-4 w-4 text-cyan-100/80" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.10] px-2 py-0.5 text-[7px] font-black uppercase text-emerald-200">
                  {isSelected ? "Selected" : "Available"}
                </span>
              </div>
              <p className="mt-3 text-[15px] font-black text-white/92">{slot.timeLabel}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selectedSlot}
        onClick={onContinue}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white disabled:opacity-40"
      >
        Continue to private check-in
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
