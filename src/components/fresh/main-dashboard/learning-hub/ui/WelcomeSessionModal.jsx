import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  Check,
  CircleAlert,
  ExternalLink,
  LockKeyhole,
  X,
} from "lucide-react";

const GOOGLE_FORM_URL = (
  import.meta.env.VITE_CLARA_WELCOME_SESSION_FORM_URL || ""
).trim();

const SLOT_PATTERN = [
  { weekOffset: 0, timeLabel: "10:00 AM", status: "occupied" },
  { weekOffset: 0, timeLabel: "10:30 AM", status: "available" },
  { weekOffset: 1, timeLabel: "10:00 AM", status: "available" },
  { weekOffset: 1, timeLabel: "10:30 AM", status: "occupied" },
  { weekOffset: 2, timeLabel: "10:00 AM", status: "available" },
];

function getNextSaturday(fromDate = new Date()) {
  const nextSaturday = new Date(fromDate);
  nextSaturday.setHours(12, 0, 0, 0);
  const day = nextSaturday.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);
  return nextSaturday;
}

function buildWelcomeSessionSlots() {
  const firstSaturday = getNextSaturday();

  return SLOT_PATTERN.map((slot, index) => {
    const date = new Date(firstSaturday);
    date.setDate(firstSaturday.getDate() + slot.weekOffset * 7);

    return {
      ...slot,
      id: `${date.toISOString().slice(0, 10)}-${slot.timeLabel.replace(/\W/g, "")}-${index}`,
      dateLabel: new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        weekday: "short",
      }).format(date),
      fullDateLabel: new Intl.DateTimeFormat("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        weekday: "long",
      }).format(date),
    };
  });
}

export const WELCOME_SESSION_AVAILABLE_SLOT_COUNT = SLOT_PATTERN.filter(
  (slot) => slot.status === "available",
).length;

function Rule({ children }) {
  return (
    <li className="flex items-start gap-2.5 text-[12px] font-semibold leading-relaxed text-slate-200/80">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/75" />
      <span>{children}</span>
    </li>
  );
}

export default function WelcomeSessionModal({
  open,
  onClose,
  hasCommittedAccess,
  onUpgrade,
}) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [showMissingLinkMessage, setShowMissingLinkMessage] = useState(false);
  const closeButtonRef = useRef(null);
  const slots = useMemo(() => buildWelcomeSessionSlots(), []);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSelectedSlotId("");
      setShowMissingLinkMessage(false);
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const handleContinue = () => {
    if (!selectedSlot) return;

    if (!GOOGLE_FORM_URL) {
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
      // The form can still open even when session storage is unavailable.
    }

    window.open(GOOGLE_FORM_URL, "_blank", "noopener,noreferrer");
  };

  const modal = (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/82 px-3 py-3 backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-welcome-session-title"
        className="relative max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(155deg,rgba(4,25,42,0.98),rgba(8,17,43,0.98)_52%,rgba(31,12,70,0.98))] p-5 text-white shadow-[0_36px_110px_rgba(0,0,0,0.78),0_0_55px_rgba(34,211,238,0.12)] sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
          <div className="absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -right-16 top-6 h-48 w-48 rounded-full bg-violet-500/12 blur-3xl" />
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/65 transition hover:bg-white/[0.10] hover:text-white"
          aria-label="Close Welcome Session"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 pr-10">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.24),rgba(124,58,237,0.46))] shadow-[0_14px_34px_rgba(76,29,149,0.32)]">
              {hasCommittedAccess ? (
                <CalendarClock className="h-6 w-6 text-cyan-50" />
              ) : (
                <LockKeyhole className="h-6 w-6 text-cyan-50" />
              )}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
                CLARA Human Support
              </p>
              <h2
                id="clara-welcome-session-title"
                className="mt-1 text-[21px] font-black tracking-tight text-white"
              >
                Welcome Session
              </h2>
              <p className="mt-0.5 text-[12px] font-semibold text-slate-300/75">
                One-time 30-minute setup and onboarding call
              </p>
            </div>
          </div>
        </div>

        {!hasCommittedAccess ? (
          <div className="relative z-10 mt-6">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[13px] font-bold leading-relaxed text-slate-100/90">
                The Welcome Session is included once for first-time CLARA Committed members.
              </p>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-300/70">
                Upgrade to unlock the guided setup call, feature walkthrough, and simple coaching on where to begin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose?.();
                onUpgrade?.();
              }}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[18px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.92))] px-4 text-[12px] font-black uppercase tracking-[0.12em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)]"
            >
              Unlock with Committed
            </button>
          </div>
        ) : (
          <div className="relative z-10 mt-5">
            <p className="text-[13px] font-semibold leading-relaxed text-slate-200/84">
              Choose a free slot, then complete the Google Form so we can understand your setup needs before the call.
            </p>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <ul className="space-y-2.5">
                <Rule>Included once for first-time Committed members.</Rule>
                <Rule>Available slots are first come, first served.</Rule>
                <Rule>Your appointment is confirmed only after review.</Rule>
              </ul>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
                  Appointment schedule
                </p>
                <p className="mt-1 text-[12px] font-semibold text-slate-300/70">
                  {WELCOME_SESSION_AVAILABLE_SLOT_COUNT} free slots currently shown
                </p>
              </div>
              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                Updated manually
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {slots.map((slot) => {
                const isAvailable = slot.status === "available";
                const isSelected = slot.id === selectedSlotId;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setShowMissingLinkMessage(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left transition ${
                      isSelected
                        ? "border-cyan-200/55 bg-cyan-200/12 shadow-[0_0_24px_rgba(34,211,238,0.10)]"
                        : isAvailable
                          ? "border-cyan-100/14 bg-white/[0.045] hover:border-cyan-100/28 hover:bg-white/[0.075]"
                          : "cursor-not-allowed border-white/[0.06] bg-black/10 opacity-58"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-black text-white/92">
                        {slot.dateLabel}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-300/68">
                        {slot.timeLabel}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${
                        isAvailable
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                          : "border-rose-300/15 bg-rose-300/10 text-rose-200/80"
                      }`}
                    >
                      {isSelected ? "Selected" : isAvailable ? "Free" : "Occupied"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-[18px] border border-amber-200/10 bg-amber-100/[0.045] px-3.5 py-3">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/70" />
              <p className="text-[10px] font-semibold leading-relaxed text-slate-300/72">
                Selecting a slot does not reserve it yet. Complete the form and wait for your confirmation.
              </p>
            </div>

            {showMissingLinkMessage ? (
              <p className="mt-3 rounded-[16px] border border-amber-200/12 bg-amber-100/[0.05] px-3 py-2.5 text-center text-[10px] font-bold leading-relaxed text-amber-100/85">
                The Google Form link still needs to be added to VITE_CLARA_WELCOME_SESSION_FORM_URL.
              </p>
            ) : null}

            <button
              type="button"
              disabled={!selectedSlot}
              onClick={handleContinue}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.92))] px-4 text-[11px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {selectedSlot ? "Continue to appointment form" : "Choose a free slot"}
              {selectedSlot ? <ExternalLink className="h-3.5 w-3.5" /> : null}
            </button>
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
