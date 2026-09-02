import { useMemo, useRef, useState } from "react";
import { ArrowUp, CalendarDays } from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { filterScheduleOwnedEvents } from "@/lib/scheduleEventOwnership";

const STORAGE_PREFIX = "clara_schedule_events_v2";
const CALENDAR_UPDATED_EVENT = "clara:schedule-events-updated";
const TYPE_OPTIONS = ["Event", "Appointment", "Reminder", "Work", "Family", "Personal"];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMoney(value = "") {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function moneyNumber(value) {
  const parsed = Number(cleanMoney(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function firstNameFromUser(user = {}) {
  const raw = clean(
    user?.firstName ||
      user?.first_name ||
      user?.displayName ||
      user?.display_name ||
      user?.name ||
      user?.fullName ||
      user?.full_name ||
      ""
  );
  if (raw) return raw.split(" ")[0];
  const email = clean(user?.email);
  return email.includes("@") ? email.split("@")[0] : "there";
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(dateKey) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "No specific time";
  const [hour, minute] = String(value).split(":").map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function getStorageKey(user) {
  return `${STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function readStoredEvents(user) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getStorageKey(user)) || "[]");
    return Array.isArray(parsed) ? filterScheduleOwnedEvents(parsed) : [];
  } catch {
    return [];
  }
}

function saveCalendarEvent(user, event) {
  if (typeof window === "undefined") return;
  const current = readStoredEvents(user);
  const next = [...current, event];
  window.localStorage.setItem(getStorageKey(user), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT, { detail: { event } }));
  window.dispatchEvent(new Event("clara-finance-updated"));
}

function Bubble({ role = "assistant", children, elementRef = null }) {
  const user = role === "user";
  return (
    <div ref={elementRef} data-clara-conversation-role={role} className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,.2)] ${
          user
            ? "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white"
            : "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ChoiceButton({ children, onClick, secondary = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 w-full rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[.985] disabled:opacity-40 ${
        secondary
          ? "border-white/10 bg-white/[.035] text-white/88"
          : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,.96),rgba(13,79,198,.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,.22)]"
      }`}
    >
      {children}
    </button>
  );
}

function TypeReplyButton({ children, onClick, secondary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 py-2 text-[12px] font-black transition active:scale-[.97] ${
        secondary
          ? "border-white/12 bg-white/[.04] text-white/78"
          : "border-blue-300/24 bg-[#0a1933]/96 text-white/92 shadow-[0_8px_20px_rgba(0,0,0,.18)]"
      }`}
    >
      {children}
    </button>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text" }) {
  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,.28)]"
    >
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55"
      />
      <button
        type="submit"
        disabled={!clean(value)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

export default function ClaraCalendarOverlay({ isActive = false, claraAssistantContext = {}, onClose }) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const viewportRef = useRef(null);
  const latestAssistantRef = useRef(null);
  const actionRef = useRef(null);

  const greeting = `Calendar is open, ${firstName}. What do you want to schedule?`;
  const [phase, setPhase] = useState("title");
  const [messages, setMessages] = useState(() => [{ role: "assistant", text: greeting }]);
  const [title, setTitle] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState("");
  const [type, setType] = useState("");
  const [otherTypeInput, setOtherTypeInput] = useState("");
  const [affectsMoney, setAffectsMoney] = useState(false);
  const [direction, setDirection] = useState("out");
  const [amountKnown, setAmountKnown] = useState(true);
  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const appendExchange = (userText, assistantText) => {
    setMessages((current) => [
      ...current,
      ...(userText ? [{ role: "user", text: userText }] : []),
      ...(assistantText ? [{ role: "assistant", text: assistantText }] : []),
    ]);
  };

  const latestAssistantIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") return index;
    }
    return -1;
  }, [messages]);

  const revealKey = isActive && latestAssistantIndex >= 0
    ? `${phase}:${messages.length}:${saved ? "saved" : "active"}`
    : null;

  useClaraConversationReveal({
    viewportRef,
    assistantRef: latestAssistantRef,
    actionRef,
    revealKey,
    enabled: Boolean(revealKey),
    requireAction: true,
  });

  if (!isActive) return null;

  const reset = () => {
    setPhase("title");
    setMessages([{ role: "assistant", text: greeting }]);
    setTitle("");
    setTitleInput("");
    setDate(todayKey());
    setTime("");
    setType("");
    setOtherTypeInput("");
    setAffectsMoney(false);
    setDirection("out");
    setAmountKnown(true);
    setAmountInput("");
    setNote("");
    setNoteInput("");
    setSaved(false);
    setError("");
  };

  const submitTitle = () => {
    const next = clean(titleInput);
    if (!next) return;
    setTitle(next);
    setTitleInput("");
    setError("");
    appendExchange(next, "What date should I put it on?");
    setPhase("date");
  };

  const chooseDate = () => {
    if (!date) return;
    appendExchange(formatDate(date), "What time?");
    setPhase("time");
  };

  const chooseTime = () => {
    appendExchange(time ? formatTime(time) : "No specific time", "What type of schedule is this?");
    setPhase("type");
  };

  const chooseType = (nextType) => {
    setType(nextType);
    setOtherTypeInput("");
    setError("");
    appendExchange(nextType, "Does this affect your money?\nCLARA will never guess an amount.");
    setPhase("money");
  };

  const chooseOtherType = () => {
    setType("");
    setOtherTypeInput("");
    setError("");
    appendExchange("Other", "Sure. What type of schedule is it?");
    setPhase("other-type");
  };

  const submitOtherType = () => {
    const nextType = clean(otherTypeInput);
    if (!nextType) return;
    setType(nextType);
    setOtherTypeInput("");
    setError("");
    appendExchange(nextType, "Does this affect your money?\nCLARA will never guess an amount.");
    setPhase("money");
  };

  const chooseMoneyImpact = (nextAffectsMoney) => {
    setAffectsMoney(nextAffectsMoney);
    setAmountInput("");
    if (nextAffectsMoney) {
      appendExchange("Yes", "Is this money out or money in?");
      setPhase("direction");
      return;
    }
    appendExchange("No", "Notes · optional");
    setPhase("notes");
  };

  const chooseDirection = (nextDirection) => {
    setDirection(nextDirection);
    setAmountKnown(true);
    appendExchange(nextDirection === "in" ? "Money in" : "Money out", "Amount");
    setPhase("amount");
  };

  const submitAmount = () => {
    const amount = moneyNumber(amountInput);
    if (amount <= 0) {
      setError("Enter the amount, or choose “Not sure yet”.");
      return;
    }
    setAmountKnown(true);
    setError("");
    appendExchange(`₱${amount.toLocaleString("en-PH")}`, "Notes · optional");
    setPhase("notes");
  };

  const chooseUnknownAmount = () => {
    setAmountKnown(false);
    setAmountInput("");
    setError("");
    appendExchange("Not sure yet", "Notes · optional");
    setPhase("notes");
  };

  const save = (noteOverride = note, userNoteText = "") => {
    if (!title || !date || !type) return;

    const amount = moneyNumber(amountInput);
    if (affectsMoney && amountKnown && amount <= 0) {
      setError("Enter the amount, or choose “Not sure yet”.");
      setPhase("amount");
      return;
    }

    const amountValue = affectsMoney && amountKnown ? cleanMoney(amountInput) : "";
    const impactBreakdown = affectsMoney
      ? [
          {
            label: direction === "in" ? "Money in" : "Money out",
            amount: amountKnown ? amount : 0,
            direction,
            scheduleType: type,
            pendingAmount: !amountKnown,
            source: "manual",
          },
        ]
      : [];

    const event = {
      id: `orb-calendar-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      date,
      time,
      type,
      amount: amountValue,
      note: clean(noteOverride),
      impactBreakdown,
      source: "calendar_chat",
      createdAt: new Date().toISOString(),
    };

    try {
      saveCalendarEvent(user, event);
      setNote(clean(noteOverride));
      setNoteInput("");
      setSaved(true);
      setError("");
      appendExchange(
        userNoteText,
        `Done. I scheduled “${title}” for ${formatDate(date)}${time ? ` at ${formatTime(time)}` : ""}.`
      );
      setPhase("saved");
    } catch (nextError) {
      setError(clean(nextError?.message) || "CLARA couldn’t save that schedule yet.");
    }
  };

  const submitNote = () => {
    const nextNote = clean(noteInput);
    if (!nextNote) return;
    save(nextNote, nextNote);
  };

  const skipNoteAndSave = () => {
    save("", "Skip note");
  };

  return (
    <div
      className="fixed inset-0 z-[300] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-calendar-chat="true"
      data-clara-pause-overlay="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <ClaraChatHeader
        title="Calendar"
        tagline="Plan · Schedule · Stay ahead"
        onClose={onClose}
      />

      <main
        ref={viewportRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-clara-ai-message-viewport="true"
      >
        <div className="flex min-h-full flex-col gap-3" data-clara-ai-message-stack="true">
          {messages.map((message, index) => (
            <Bubble
              key={`${message.role}-${index}-${message.text}`}
              role={message.role}
              elementRef={index === latestAssistantIndex ? latestAssistantRef : null}
            >
              {message.text}
            </Bubble>
          ))}

          <div ref={actionRef} data-clara-conversation-action-region="true" className="contents">
            {phase === "title" ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={titleInput}
                  onChange={setTitleInput}
                  onSubmit={submitTitle}
                  placeholder="e.g. Dentist, meeting, anniversary"
                />
              </div>
            ) : null}

            {phase === "date" ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="min-h-12 rounded-[18px] border border-blue-200/16 bg-[#07142b]/96 px-4 text-[16px] font-bold text-white outline-none"
                />
                <ChoiceButton onClick={chooseDate} disabled={!date}>
                  Send date
                </ChoiceButton>
              </div>
            ) : null}

            {phase === "time" ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="min-h-12 rounded-[18px] border border-blue-200/16 bg-[#07142b]/96 px-4 text-[16px] font-bold text-white outline-none"
                />
                <ChoiceButton onClick={chooseTime}>
                  {time ? `Send ${formatTime(time)}` : "No specific time"}
                </ChoiceButton>
              </div>
            ) : null}

            {phase === "type" ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {TYPE_OPTIONS.map((option) => (
                  <TypeReplyButton key={option} onClick={() => chooseType(option)}>
                    {option}
                  </TypeReplyButton>
                ))}
                <TypeReplyButton onClick={chooseOtherType} secondary>
                  Other
                </TypeReplyButton>
              </div>
            ) : null}

            {phase === "other-type" ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={otherTypeInput}
                  onChange={setOtherTypeInput}
                  onSubmit={submitOtherType}
                  placeholder="Type the schedule type..."
                />
              </div>
            ) : null}

            {phase === "money" ? (
              <div className="mt-auto grid grid-cols-2 gap-2.5 pt-3">
                <ChoiceButton onClick={() => chooseMoneyImpact(false)}>No</ChoiceButton>
                <ChoiceButton onClick={() => chooseMoneyImpact(true)} secondary>
                  Yes
                </ChoiceButton>
              </div>
            ) : null}

            {phase === "direction" ? (
              <div className="mt-auto grid grid-cols-2 gap-2.5 pt-3">
                <ChoiceButton onClick={() => chooseDirection("out")}>Money out</ChoiceButton>
                <ChoiceButton onClick={() => chooseDirection("in")} secondary>
                  Money in
                </ChoiceButton>
              </div>
            ) : null}

            {phase === "amount" ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer
                  value={amountInput}
                  onChange={(value) => {
                    setAmountKnown(true);
                    setAmountInput(cleanMoney(value));
                  }}
                  onSubmit={submitAmount}
                  placeholder="0"
                  inputMode="decimal"
                />
                <ChoiceButton onClick={chooseUnknownAmount} secondary>
                  Not sure yet
                </ChoiceButton>
              </div>
            ) : null}

            {phase === "notes" ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer
                  value={noteInput}
                  onChange={setNoteInput}
                  onSubmit={submitNote}
                  placeholder="Add a note for yourself..."
                />
                <ChoiceButton onClick={skipNoteAndSave} secondary>
                  Skip note & save
                </ChoiceButton>
              </div>
            ) : null}

            {phase === "saved" && saved ? (
              <>
                <div className="rounded-[22px] border border-cyan-200/14 bg-cyan-200/[.045] p-4 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-[#8ffff8]" />
                  <p className="mt-2 text-[13px] font-black text-white">Scheduled</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-white/52">
                    {title} · {formatDate(date)}{time ? ` · ${formatTime(time)}` : ""} · {type}
                  </p>
                  {affectsMoney ? (
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-white/42">
                      {direction === "in" ? "Money in" : "Money out"}: {amountKnown ? `₱${moneyNumber(amountInput).toLocaleString("en-PH")}` : "amount pending"}
                    </p>
                  ) : null}
                </div>
                <div className="mt-auto grid gap-2.5 pt-3">
                  <ChoiceButton onClick={reset}>Schedule another</ChoiceButton>
                  <ChoiceButton onClick={onClose} secondary>
                    Done
                  </ChoiceButton>
                </div>
              </>
            ) : null}

            {error ? (
              <p className="rounded-[16px] border border-red-300/15 bg-red-500/[.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
