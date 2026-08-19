import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, CalendarDays, CheckCircle2, X } from "lucide-react";
import { appendClaraMoneyScheduleEvent } from "@/lib/clara-money-schedule-repository";

const SCHEDULE_TYPES = ["Bill", "Payday", "Health", "Work", "Family", "Relationship", "Personal"];

function cleanText(value) {
  return String(value || "").trim();
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function cleanAmount(value) {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  const decimals = rest.join("").slice(0, 2);
  return decimals ? `${whole || "0"}.${decimals}` : whole;
}

function formatMoney(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Amount pending";
  return `₱${parsed.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  const match = cleanText(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return cleanText(value) || "No date";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function firstNameFromUser(user = {}) {
  const raw = cleanText(
    user?.firstName ||
      user?.first_name ||
      user?.displayName ||
      user?.display_name ||
      user?.name ||
      user?.fullName ||
      user?.full_name
  );
  if (raw) return raw.split(" ")[0];
  const email = cleanText(user?.email);
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function chatMessage(role, text) {
  return {
    id: `money-schedule-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function Bubble({ role, children }) {
  const assistant = role === "assistant";
  return (
    <div className={`flex ${assistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[86%] rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,0.20)] ${
          assistant
            ? "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100"
            : "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white"
        }`}
      >
        <span className="whitespace-pre-wrap">{children}</span>
      </div>
    </div>
  );
}

function ChoiceButton({ children, onClick, disabled = false, secondary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 w-full rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${
        secondary
          ? "border-white/10 bg-white/[0.035] text-white/88"
          : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,0.96),rgba(13,79,198,0.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,0.22)]"
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
      className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/62"
      />
      <button
        type="submit"
        disabled={!cleanText(value)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white shadow-[0_8px_22px_rgba(23,105,255,0.34)] transition active:scale-95 disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/7 py-2.5 last:border-b-0">
      <span className="text-[10px] font-black uppercase tracking-[0.13em] text-white/36">{label}</span>
      <span className="max-w-[68%] text-right text-[12px] font-black leading-5 text-white/86">{value}</span>
    </div>
  );
}

export default function ClaraMoneyScheduleOverlay({
  isActive = false,
  claraAssistantContext = {},
  onClose,
}) {
  const navigate = useNavigate();
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const [phase, setPhase] = useState("title");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState(() => ({
    title: "",
    date: todayKey(),
    time: "",
    direction: "out",
    amountKnown: true,
    amount: "",
    type: "Personal",
    note: "",
  }));
  const [titleInput, setTitleInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedEvent, setSavedEvent] = useState(null);
  const viewportRef = useRef(null);
  const previousActiveRef = useRef(false);

  const scrollToLatest = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  };

  const append = (...nextMessages) => {
    setMessages((current) => [...current, ...nextMessages]);
    scrollToLatest();
  };

  const resetFlow = () => {
    setPhase("title");
    setDraft({
      title: "",
      date: todayKey(),
      time: "",
      direction: "out",
      amountKnown: true,
      amount: "",
      type: "Personal",
      note: "",
    });
    setTitleInput("");
    setAmountInput("");
    setError("");
    setBusy(false);
    setSavedEvent(null);
    setMessages([
      chatMessage(
        "assistant",
        `Hi ${firstName}! Let’s plan a money event before it reaches you. What are you expecting to pay for or receive?`
      ),
    ]);
  };

  useEffect(() => {
    if (isActive && !previousActiveRef.current) resetFlow();
    previousActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isActive || typeof window === "undefined") return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, onClose]);

  useEffect(() => {
    scrollToLatest();
  }, [messages, phase]);

  if (!isActive) return null;

  const submitTitle = () => {
    const title = cleanText(titleInput);
    if (!title) return;
    setDraft((current) => ({ ...current, title }));
    setTitleInput("");
    setError("");
    append(
      chatMessage("user", title),
      chatMessage("assistant", "When should this happen? Add the date, and time too if it matters.")
    );
    setPhase("date");
  };

  const submitDate = () => {
    if (!draft.date) {
      setError("Choose a date before continuing.");
      return;
    }
    setError("");
    append(
      chatMessage("user", `${formatDate(draft.date)}${draft.time ? ` at ${draft.time}` : ""}`),
      chatMessage("assistant", "Will this bring money in, or take money out?")
    );
    setPhase("direction");
  };

  const chooseDirection = (direction) => {
    const normalized = direction === "in" ? "in" : "out";
    setDraft((current) => ({
      ...current,
      direction: normalized,
      type: normalized === "in" && current.type === "Personal" ? "Payday" : current.type,
    }));
    setError("");
    append(
      chatMessage("user", normalized === "in" ? "Money in" : "Money out"),
      chatMessage("assistant", `How much do you expect ${normalized === "in" ? "to receive" : "to spend"}?`)
    );
    setPhase("amount");
  };

  const submitAmount = () => {
    const amount = cleanAmount(amountInput);
    if (!amount || Number(amount) <= 0) {
      setError("Enter the expected amount, or choose “Not sure yet”.");
      return;
    }
    setDraft((current) => ({ ...current, amountKnown: true, amount }));
    setAmountInput("");
    setError("");
    append(
      chatMessage("user", formatMoney(amount)),
      chatMessage("assistant", "Good. Add a category and any detail you want CLARA to remember.")
    );
    setPhase("details");
  };

  const markAmountPending = () => {
    setDraft((current) => ({ ...current, amountKnown: false, amount: "" }));
    setAmountInput("");
    setError("");
    append(
      chatMessage("user", "Not sure yet"),
      chatMessage("assistant", "That’s okay. I’ll mark the amount as pending. Add a category and any useful detail.")
    );
    setPhase("details");
  };

  const reviewSchedule = () => {
    setError("");
    append(
      chatMessage("user", draft.note ? `${draft.type} — ${draft.note}` : draft.type),
      chatMessage("assistant", "Here’s your Money Schedule. Check it once before I save it to your Calendar.")
    );
    setPhase("review");
  };

  const saveSchedule = () => {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const event = appendClaraMoneyScheduleEvent({ user, draft });
      setSavedEvent(event);
      append(
        chatMessage("user", "Save Money Schedule"),
        chatMessage("assistant", "Done. I added it to your Calendar so CLARA can see this money event when helping you make decisions.")
      );
      setPhase("saved");
    } catch (nextError) {
      setError(cleanText(nextError?.message) || "I couldn’t save that Money Schedule. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openCalendar = () => {
    onClose?.();
    navigate("/community?view=schedule");
  };

  const closeChat = () => onClose?.();
  const amountSummary = draft.amountKnown ? formatMoney(draft.amount) : "Amount pending";

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="money-schedule"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-money-schedule-chat="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(245,200,75,0.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(34,28,14,0.92))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8,#f5c84b)]" />
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#8ffff8]/78">CLARA CHAT</p>
        <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Money Schedule</h1>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Plan · Prepare · Protect</p>
        <button
          type="button"
          onClick={closeChat}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
          aria-label="Close Money Schedule"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div data-clara-ai-message-stack="true" className="flex min-h-full flex-col gap-3">
          {messages.map((entry) => (
            <Bubble key={entry.id} role={entry.role}>{entry.text}</Bubble>
          ))}

          {phase === "title" ? (
            <div className="mt-auto pt-3">
              <Composer value={titleInput} onChange={setTitleInput} onSubmit={submitTitle} placeholder="e.g. Rent, dentist, salary" />
            </div>
          ) : null}

          {phase === "date" ? (
            <form
              data-clara-buy-check-react-form="true"
              onSubmit={(event) => {
                event.preventDefault();
                submitDate();
              }}
              className="mt-1 grid gap-2.5 rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                    className="min-w-0 rounded-[16px] border border-white/10 bg-[#09182f] px-3 py-3 text-[12px] font-black text-white outline-none focus:border-blue-300/40"
                  />
                </label>
                <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Time · optional
                  <input
                    type="time"
                    value={draft.time}
                    onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
                    className="min-w-0 rounded-[16px] border border-white/10 bg-[#09182f] px-3 py-3 text-[12px] font-black text-white outline-none focus:border-blue-300/40"
                  />
                </label>
              </div>
              <ChoiceButton onClick={submitDate}>Continue</ChoiceButton>
            </form>
          ) : null}

          {phase === "direction" ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <ChoiceButton onClick={() => chooseDirection("out")}>Money out</ChoiceButton>
              <ChoiceButton onClick={() => chooseDirection("in")} secondary>Money in</ChoiceButton>
            </div>
          ) : null}

          {phase === "amount" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer
                value={amountInput}
                onChange={(value) => setAmountInput(cleanAmount(value))}
                onSubmit={submitAmount}
                placeholder="Expected amount"
                inputMode="decimal"
              />
              <ChoiceButton onClick={markAmountPending} secondary>Not sure yet</ChoiceButton>
            </div>
          ) : null}

          {phase === "details" ? (
            <div className="mt-1 grid gap-2.5 rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
              <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                Category
                <select
                  value={draft.type}
                  onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                  className="rounded-[16px] border border-white/10 bg-[#09182f] px-3 py-3 text-[12px] font-black text-white outline-none focus:border-blue-300/40"
                >
                  {SCHEDULE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                Note · optional
                <textarea
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Anything CLARA should remember?"
                  rows={2}
                  className="resize-none rounded-[16px] border border-white/10 bg-[#09182f] px-3 py-3 text-[12px] font-semibold leading-5 text-white outline-none placeholder:text-white/25 focus:border-blue-300/40"
                />
              </label>
              <ChoiceButton onClick={reviewSchedule}>Review Money Schedule</ChoiceButton>
            </div>
          ) : null}

          {phase === "review" ? (
            <>
              <section className="mt-1 rounded-[22px] border border-[#f5c84b]/18 bg-[linear-gradient(145deg,rgba(7,20,43,.95),rgba(24,23,31,.94))] p-4 shadow-[0_14px_34px_rgba(0,0,0,.22)]">
                <div className="mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#f5c84b]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#ffe69a]/72">Ready to schedule</p>
                </div>
                <ReviewRow label="Event" value={draft.title} />
                <ReviewRow label="When" value={`${formatDate(draft.date)}${draft.time ? ` · ${draft.time}` : ""}`} />
                <ReviewRow label="Impact" value={`${draft.direction === "in" ? "Money in" : "Money out"} · ${amountSummary}`} />
                <ReviewRow label="Category" value={draft.type} />
                {draft.note ? <ReviewRow label="Note" value={draft.note} /> : null}
              </section>
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={saveSchedule} disabled={busy}>{busy ? "Saving..." : "Save"}</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("details")} disabled={busy} secondary>Edit</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "saved" ? (
            <>
              <section className="mt-1 rounded-[22px] border border-emerald-300/16 bg-emerald-300/[0.045] p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-[#8ffff8]" />
                <p className="mt-2 text-[13px] font-black text-white">Money Schedule saved</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/48">
                  {savedEvent?.title} · {formatDate(savedEvent?.date)}
                </p>
              </section>
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={openCalendar}>Open Calendar</ChoiceButton>
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88" aria-live="polite">{error}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
