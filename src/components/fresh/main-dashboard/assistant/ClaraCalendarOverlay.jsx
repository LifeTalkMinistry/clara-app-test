import { useMemo, useState } from "react";
import { ArrowUp, CalendarDays, X } from "lucide-react";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { filterScheduleOwnedEvents } from "@/lib/scheduleEventOwnership";

const STORAGE_PREFIX = "clara_schedule_events_v2";
const CALENDAR_UPDATED_EVENT = "clara:schedule-events-updated";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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
  return date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "No specific time";
  const [hour, minute] = String(value).split(":").map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function inferType(title) {
  const text = clean(title).toLowerCase();
  if (/bill|payment|rent|due|electric|water|internet/.test(text)) return "Bill";
  if (/payday|salary|sweldo|income/.test(text)) return "Payday";
  if (/doctor|dentist|checkup|hospital|medicine|gym|workout/.test(text)) return "Health";
  if (/work|meeting|shift|office|client/.test(text)) return "Work";
  if (/family|parent|mom|dad|mother|father|sibling/.test(text)) return "Family";
  if (/date|partner|wife|husband|girlfriend|boyfriend|anniversary/.test(text)) return "Relationship";
  return "Personal";
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

function Bubble({ role = "assistant", children }) {
  const user = role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[86%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,.2)] ${user ? "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white" : "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100"}`}>
        {children}
      </div>
    </div>
  );
}

function ChoiceButton({ children, onClick, secondary = false, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-12 w-full rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[.985] disabled:opacity-40 ${secondary ? "border-white/10 bg-white/[.035] text-white/88" : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,.96),rgba(13,79,198,.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,.22)]"}`}>
      {children}
    </button>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text" }) {
  return (
    <form data-clara-buy-check-react-form="true" onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }} className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,.28)]">
      <input autoFocus value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55" />
      <button type="submit" disabled={!clean(value)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white disabled:opacity-40" aria-label="Send">
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

export default function ClaraCalendarOverlay({ isActive = false, claraAssistantContext = {}, onClose }) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const [phase, setPhase] = useState("title");
  const [title, setTitle] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState("");
  const [moneyImpact, setMoneyImpact] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const inferredType = useMemo(() => inferType(title), [title]);
  if (!isActive) return null;

  const reset = () => {
    setPhase("title");
    setTitle("");
    setTitleInput("");
    setDate(todayKey());
    setTime("");
    setMoneyImpact(false);
    setAmountInput("");
    setSaved(false);
    setError("");
  };

  const submitTitle = () => {
    const next = clean(titleInput);
    if (!next) return;
    setTitle(next);
    setError("");
    setPhase("date");
  };

  const save = () => {
    if (!title || !date) return;
    const amount = Number(String(amountInput || "").replace(/[^0-9.]/g, ""));
    if (moneyImpact && (!Number.isFinite(amount) || amount <= 0)) {
      setError("Enter the expected amount, or choose No money impact.");
      return;
    }

    const event = {
      id: `orb-calendar-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      date,
      time,
      type: inferredType,
      amount: moneyImpact ? String(amount) : "",
      note: moneyImpact ? "Scheduled from CLARA Calendar chat with expected money impact." : "Scheduled from CLARA Calendar chat.",
      source: "calendar_chat",
      createdAt: new Date().toISOString(),
    };

    try {
      saveCalendarEvent(user, event);
      setSaved(true);
      setError("");
      setPhase("saved");
    } catch (nextError) {
      setError(clean(nextError?.message) || "CLARA couldn’t save that event yet.");
    }
  };

  return (
    <div className="fixed inset-0 z-[300] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white" data-clara-calendar-chat="true" data-clara-pause-overlay="true">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 min-h-16 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,.98),rgba(7,22,48,.98)_56%,rgba(7,31,38,.96))] px-14 shadow-[0_16px_38px_rgba(0,0,0,.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <h1 className="absolute inset-0 flex items-center justify-center px-16 text-center text-[17px] font-black tracking-[-.025em] text-white">Calendar</h1>
        <button type="button" onClick={onClose} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 active:scale-95" aria-label="Close Calendar">
          <X className="h-4 w-4" />
        </button>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-clara-ai-message-viewport="true">
        <div className="flex min-h-full flex-col gap-3" data-clara-ai-message-stack="true">
          <Bubble>Calendar is open, {firstName}. What do you want to schedule?</Bubble>

          {title ? <Bubble role="user">{title}</Bubble> : null}

          {phase === "title" ? (
            <div className="mt-auto pt-3">
              <Composer value={titleInput} onChange={setTitleInput} onSubmit={submitTitle} placeholder="e.g. Dentist, meeting, anniversary" />
            </div>
          ) : null}

          {phase === "date" ? (
            <>
              <Bubble>What date should I put it on?</Bubble>
              <div className="mt-auto grid gap-2.5 pt-3">
                <input type="date" min={todayKey()} value={date} onChange={(event) => setDate(event.target.value)} className="min-h-12 rounded-[18px] border border-blue-200/16 bg-[#07142b]/96 px-4 text-[16px] font-bold text-white outline-none" />
                <ChoiceButton onClick={() => date && setPhase("time")} disabled={!date}>Continue</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "time" ? (
            <>
              <Bubble>{formatDate(date)}. Does it have a specific time?</Bubble>
              <div className="mt-auto grid gap-2.5 pt-3">
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="min-h-12 rounded-[18px] border border-blue-200/16 bg-[#07142b]/96 px-4 text-[16px] font-bold text-white outline-none" />
                <ChoiceButton onClick={() => setPhase("money")}>{time ? `Use ${formatTime(time)}` : "No specific time"}</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "money" ? (
            <>
              <Bubble>Will this event likely affect your money?</Bubble>
              <div className="mt-auto grid gap-2.5 pt-3">
                <ChoiceButton onClick={() => { setMoneyImpact(true); setPhase("amount"); }}>Yes, add expected cost</ChoiceButton>
                <ChoiceButton onClick={() => { setMoneyImpact(false); setAmountInput(""); setPhase("confirm"); }} secondary>No money impact</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "amount" ? (
            <>
              <Bubble>About how much should CLARA expect?</Bubble>
              <div className="mt-auto pt-3">
                <Composer value={amountInput} onChange={(value) => setAmountInput(String(value).replace(/[^0-9.]/g, ""))} onSubmit={() => { if (Number(amountInput) > 0) setPhase("confirm"); }} placeholder="Expected amount" inputMode="decimal" />
              </div>
            </>
          ) : null}

          {phase === "confirm" ? (
            <>
              <Bubble>I’ll schedule “{title}” on {formatDate(date)}{time ? ` at ${formatTime(time)}` : ""}{moneyImpact ? ` with an expected ₱${Number(amountInput || 0).toLocaleString("en-PH")} impact` : ""}. Save it?</Bubble>
              <div className="mt-auto grid grid-cols-2 gap-2.5 pt-3">
                <ChoiceButton onClick={save}>Save event</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("date")} secondary>Change</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "saved" && saved ? (
            <>
              <div className="rounded-[22px] border border-cyan-200/14 bg-cyan-200/[.045] p-4 text-center">
                <CalendarDays className="mx-auto h-6 w-6 text-[#8ffff8]" />
                <p className="mt-2 text-[13px] font-black text-white">Scheduled</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/52">{title} · {formatDate(date)}{time ? ` · ${formatTime(time)}` : ""}</p>
              </div>
              <div className="mt-auto grid gap-2.5 pt-3">
                <ChoiceButton onClick={reset}>Schedule another</ChoiceButton>
                <ChoiceButton onClick={onClose} secondary>Done</ChoiceButton>
              </div>
            </>
          ) : null}

          {error ? <p className="rounded-[16px] border border-red-300/15 bg-red-500/[.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88">{error}</p> : null}
        </div>
      </main>
    </div>
  );
}
