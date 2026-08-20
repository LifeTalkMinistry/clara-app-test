import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CheckCircle2,
  MinusCircle,
  PencilLine,
  PlusCircle,
  X,
} from "lucide-react";
import {
  CLARA_MONEY_ROUTINE_WEEKDAYS,
  saveClaraMoneyRoutine,
} from "@/lib/clara-money-schedule-repository";

function cleanText(value) {
  return String(value || "").trim();
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
    id: `money-routine-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function createUiItem(label, amountCentavos) {
  return {
    id: `routine-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: cleanText(label),
    amountCentavos: Math.max(0, Math.round(Number(amountCentavos) || 0)),
  };
}

function parseAmountToCentavos(value) {
  const cleaned = String(value ?? "")
    .replace(/php/gi, "")
    .replace(/[₱,\s]/g, "")
    .replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;

  const parts = cleaned.split(".");
  const whole = Number(parts.shift() || 0);
  const fraction = Number(parts.join("").slice(0, 2).padEnd(2, "0") || 0);
  if (!Number.isFinite(whole) || !Number.isFinite(fraction)) return 0;
  return Math.max(0, Math.round(whole * 100 + fraction));
}

function formatMoneyCentavos(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0)) / 100;
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseRoutineExpenses(value) {
  const lines = String(value || "")
    .split(/\n|;/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

  const items = [];
  const invalidLines = [];

  lines.forEach((line) => {
    const match = line.match(
      /^(.*?)(?:\s*[-–—:=]\s*|\s+)(?:₱\s*|PHP\s*)?([0-9][0-9,]*(?:\.[0-9]{1,2})?)$/i
    );
    if (!match) {
      invalidLines.push(line);
      return;
    }

    const label = cleanText(match[1]);
    const amountCentavos = parseAmountToCentavos(match[2]);
    if (!label || amountCentavos <= 0) {
      invalidLines.push(line);
      return;
    }

    items.push(createUiItem(label, amountCentavos));
  });

  return { items, invalidLines };
}

function cloneItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item) =>
    createUiItem(item.label, item.amountCentavos)
  );
}

function totalItems(items = []) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + Math.max(0, Math.round(Number(item?.amountCentavos) || 0)),
    0
  );
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
      className={`min-h-12 w-full rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 ${
        secondary
          ? "border-white/10 bg-white/[0.035] text-white/88"
          : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,0.96),rgba(13,79,198,0.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,0.22)]"
      }`}
    >
      {children}
    </button>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
  inputMode = "text",
  multiline = false,
}) {
  const Input = multiline ? "textarea" : "input";

  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className={`flex gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)] ${
        multiline ? "items-end" : "items-center"
      }`}
    >
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        rows={multiline ? 4 : undefined}
        className={`min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55 ${
          multiline ? "min-h-[104px] resize-none py-2 leading-6" : "min-h-11"
        }`}
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

function ExpenseList({ items = [], totalLabel = "Daily total" }) {
  return (
    <section className="rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-[15px] border border-white/8 bg-white/[0.035] px-3.5 py-3"
            >
              <span className="min-w-0 truncate text-[12.5px] font-black text-white/90">
                {item.label}
              </span>
              <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">
                {formatMoneyCentavos(item.amountCentavos)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-white/48">No routine expenses on this day.</p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/36">
          {totalLabel}
        </span>
        <span className="text-[13px] font-black text-white">
          {formatMoneyCentavos(totalItems(items))}
        </span>
      </div>
    </section>
  );
}

export default function ClaraMoneyScheduleOverlay({
  isActive = false,
  claraAssistantContext = {},
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const [phase, setPhase] = useState("welcome");
  const [messages, setMessages] = useState([]);
  const [days, setDays] = useState([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [pendingItems, setPendingItems] = useState([]);
  const [editItems, setEditItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedRoutine, setSavedRoutine] = useState(null);
  const viewportRef = useRef(null);
  const previousActiveRef = useRef(false);

  const currentWeekday = CLARA_MONEY_ROUTINE_WEEKDAYS[dayIndex] || CLARA_MONEY_ROUTINE_WEEKDAYS[0];
  const configuredDays = days.slice(0, dayIndex);

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
    setPhase("welcome");
    setDays([]);
    setDayIndex(0);
    setDraftText("");
    setPendingItems([]);
    setEditItems([]);
    setSelectedItemId("");
    setAmountInput("");
    setError("");
    setBusy(false);
    setSavedRoutine(null);
    setMessages([
      chatMessage(
        "assistant",
        `Hi ${firstName}! Ready to help me understand your usual daily routine expenses?`
      ),
    ]);
  };

  useEffect(() => {
    if (isActive && !previousActiveRef.current) resetFlow();
    if (!isActive && previousActiveRef.current) resetFlow();
    previousActiveRef.current = isActive;
  }, [isActive, firstName]);

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

  const startSetup = () => {
    setError("");
    append(
      chatMessage("user", "Yes, I’m ready"),
      chatMessage(
        "assistant",
        "Great! Let’s start with Monday. Tell me what you normally need to spend on every Monday. Please leave out occasional or extra spending — only the things that are part of your usual routine."
      )
    );
    setPhase("day-entry");
  };

  const moveToNextDay = (items) => {
    const weekday = currentWeekday;
    const normalizedDay = {
      key: weekday.key,
      name: weekday.name,
      weekdayIndex: weekday.weekdayIndex,
      items: cloneItems(items),
    };
    const nextDays = [...days];
    nextDays[dayIndex] = normalizedDay;
    setDays(nextDays);
    setDraftText("");
    setPendingItems([]);
    setEditItems([]);
    setSelectedItemId("");
    setAmountInput("");
    setError("");

    if (dayIndex >= CLARA_MONEY_ROUTINE_WEEKDAYS.length - 1) {
      append(
        chatMessage(
          "assistant",
          "Sunday is done. I now have your normal Monday-to-Sunday routine. Review it once before I save it as your current weekly Money Schedule."
        )
      );
      setPhase("weekly-review");
      return;
    }

    const nextIndex = dayIndex + 1;
    const nextWeekday = CLARA_MONEY_ROUTINE_WEEKDAYS[nextIndex];
    append(
      chatMessage(
        "assistant",
        `${weekday.name} is done. Now let’s set up ${nextWeekday.name}. You can reuse a day you already finished, copy one and change it, or make ${nextWeekday.name} completely different.`
      )
    );
    setDayIndex(nextIndex);
    setPhase("day-choice");
  };

  const submitDayExpenses = () => {
    const parsed = parseRoutineExpenses(draftText);
    if (!parsed.items.length || parsed.invalidLines.length) {
      setError(
        "List each routine expense on its own line like “Transportation - 100” or “Coffee - 25”."
      );
      return;
    }

    setPendingItems(parsed.items);
    setError("");
    append(
      chatMessage("user", draftText),
      chatMessage(
        "assistant",
        `Here’s what I understood for ${currentWeekday.name}. Check it once before we continue.`
      )
    );
    setDraftText("");
    setPhase("day-review");
  };

  const confirmPendingDay = () => {
    append(chatMessage("user", "Looks right"));
    moveToNextDay(pendingItems);
  };

  const enterDayAgain = () => {
    append(
      chatMessage("user", "I need to change it"),
      chatMessage(
        "assistant",
        `No problem. Send the normal ${currentWeekday.name} expenses again, one item per line.`
      )
    );
    setPendingItems([]);
    setDraftText("");
    setError("");
    setPhase("day-entry");
  };

  const setNoRoutineExpenses = () => {
    append(
      chatMessage("user", `No routine expenses on ${currentWeekday.name}`),
      chatMessage("assistant", `Got it. I’ll keep ${currentWeekday.name} at ₱0 for your normal routine.`)
    );
    moveToNextDay([]);
  };

  const useSameDay = (sourceDay) => {
    append(
      chatMessage("user", `Same as ${sourceDay.name}`),
      chatMessage(
        "assistant",
        `Got it. ${currentWeekday.name} will use the same routine as ${sourceDay.name}.`
      )
    );
    moveToNextDay(sourceDay.items);
  };

  const chooseCopyAndChange = () => {
    append(
      chatMessage("user", "Copy a previous day and change it"),
      chatMessage("assistant", `Which day should I use as the starting point for ${currentWeekday.name}?`)
    );
    setPhase("copy-source");
  };

  const chooseCopySource = (sourceDay) => {
    const copied = cloneItems(sourceDay.items);
    setEditItems(copied);
    setError("");
    append(
      chatMessage("user", `Start from ${sourceDay.name}`),
      chatMessage(
        "assistant",
        `Done. I copied ${sourceDay.name}. Now tell me what needs to change for ${currentWeekday.name}.`
      )
    );
    setPhase("day-edit");
  };

  const chooseCompletelyDifferent = () => {
    setDraftText("");
    setError("");
    append(
      chatMessage("user", "Completely different setup"),
      chatMessage(
        "assistant",
        `Okay. Tell me the normal ${currentWeekday.name} expenses from scratch. Leave out occasional extras and list one routine expense per line.`
      )
    );
    setPhase("day-entry");
  };

  const startAddExpense = () => {
    setDraftText("");
    setError("");
    append(chatMessage("assistant", `What should I add to ${currentWeekday.name}?`));
    setPhase("edit-add");
  };

  const submitAddedExpense = () => {
    const parsed = parseRoutineExpenses(draftText);
    if (!parsed.items.length || parsed.invalidLines.length) {
      setError("Use the format “Expense - amount”, for example “Extra commute - 80”.");
      return;
    }

    setEditItems((current) => [...current, ...parsed.items]);
    append(
      chatMessage("user", draftText),
      chatMessage("assistant", "Added. You can make another change or finish this day.")
    );
    setDraftText("");
    setError("");
    setPhase("day-edit");
  };

  const startRemoveExpense = () => {
    if (!editItems.length) return;
    setError("");
    append(chatMessage("assistant", `Which ${currentWeekday.name} expense should I remove?`));
    setPhase("edit-remove");
  };

  const removeExpense = (item) => {
    setEditItems((current) => current.filter((candidate) => candidate.id !== item.id));
    append(
      chatMessage("user", `Remove ${item.label}`),
      chatMessage("assistant", `${item.label} removed from ${currentWeekday.name}.`)
    );
    setPhase("day-edit");
  };

  const startChangeAmount = () => {
    if (!editItems.length) return;
    setError("");
    append(chatMessage("assistant", "Which expense amount should I change?"));
    setPhase("edit-change-select");
  };

  const chooseAmountItem = (item) => {
    setSelectedItemId(item.id);
    setAmountInput("");
    setError("");
    append(
      chatMessage("user", item.label),
      chatMessage("assistant", `What should the usual amount for ${item.label} be on ${currentWeekday.name}?`)
    );
    setPhase("edit-change-amount");
  };

  const submitChangedAmount = () => {
    const amountCentavos = parseAmountToCentavos(amountInput);
    if (amountCentavos <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const item = editItems.find((candidate) => candidate.id === selectedItemId);
    setEditItems((current) =>
      current.map((candidate) =>
        candidate.id === selectedItemId ? { ...candidate, amountCentavos } : candidate
      )
    );
    append(
      chatMessage("user", formatMoneyCentavos(amountCentavos)),
      chatMessage(
        "assistant",
        `${item?.label || "That expense"} is now ${formatMoneyCentavos(amountCentavos)} on ${currentWeekday.name}.`
      )
    );
    setAmountInput("");
    setSelectedItemId("");
    setError("");
    setPhase("day-edit");
  };

  const finishEditedDay = () => {
    append(chatMessage("user", `Done with ${currentWeekday.name}`));
    moveToNextDay(editItems);
  };

  const saveRoutine = () => {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const routine = saveClaraMoneyRoutine({ user, days });
      setSavedRoutine(routine);
      append(
        chatMessage("user", "Save my routine"),
        chatMessage(
          "assistant",
          "Done. I now understand your normal Monday-to-Sunday routine expenses. I’ll treat this as your current weekly routine until you update it."
        )
      );
      setPhase("saved");
    } catch (nextError) {
      setError(cleanText(nextError?.message) || "I couldn’t save your routine. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const closeChat = () => onClose?.();

  const weeklyTotal = days.reduce((sum, day) => sum + totalItems(day?.items), 0);

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="money-schedule"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-money-schedule-chat="true"
      data-clara-money-routine-flow="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.94))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#8ffff8]/78">CLARA CHAT</p>
        <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Money Schedule</h1>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Daily routine · Monday to Sunday</p>
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

          {phase === "welcome" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <ChoiceButton onClick={startSetup}>Yes, let’s set it up</ChoiceButton>
              <ChoiceButton onClick={closeChat} secondary>Not now</ChoiceButton>
            </div>
          ) : null}

          {phase === "day-entry" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer
                value={draftText}
                onChange={setDraftText}
                onSubmit={submitDayExpenses}
                placeholder={"Transportation - 100\nCoffee - 25\nLunch - 120"}
                multiline
              />
              <ChoiceButton onClick={setNoRoutineExpenses} secondary>
                No routine expenses this day
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "day-review" ? (
            <>
              <ExpenseList items={pendingItems} />
              <div className="grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={confirmPendingDay}>Looks right</ChoiceButton>
                <ChoiceButton onClick={enterDayAgain} secondary>Change it</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "day-choice" ? (
            <div className="mt-1 grid gap-2.5">
              {configuredDays.map((day) => (
                <ChoiceButton key={day.key} onClick={() => useSameDay(day)}>
                  Same as {day.name}
                </ChoiceButton>
              ))}
              <ChoiceButton onClick={chooseCopyAndChange} secondary>
                Copy a day & change it
              </ChoiceButton>
              <ChoiceButton onClick={chooseCompletelyDifferent} secondary>
                Completely different setup
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "copy-source" ? (
            <div className="mt-1 grid gap-2.5">
              {configuredDays.map((day) => (
                <ChoiceButton key={day.key} onClick={() => chooseCopySource(day)}>
                  Start from {day.name}
                </ChoiceButton>
              ))}
            </div>
          ) : null}

          {phase === "day-edit" ? (
            <>
              <ExpenseList items={editItems} />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={startAddExpense}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985]"
                >
                  <PlusCircle className="h-4 w-4" /> Add
                </button>
                <button
                  type="button"
                  onClick={startRemoveExpense}
                  disabled={!editItems.length}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985] disabled:opacity-35"
                >
                  <MinusCircle className="h-4 w-4" /> Remove
                </button>
                <button
                  type="button"
                  onClick={startChangeAmount}
                  disabled={!editItems.length}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985] disabled:opacity-35"
                >
                  <PencilLine className="h-4 w-4" /> Change amount
                </button>
                <ChoiceButton onClick={finishEditedDay}>Done</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "edit-add" ? (
            <div className="mt-auto pt-3">
              <Composer
                value={draftText}
                onChange={setDraftText}
                onSubmit={submitAddedExpense}
                placeholder="Extra commute - 80"
                multiline
              />
            </div>
          ) : null}

          {phase === "edit-remove" ? (
            <div className="mt-1 grid gap-2">
              {editItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => removeExpense(item)}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-[17px] border border-red-200/10 bg-red-400/[0.035] px-4 text-left active:scale-[0.985]"
                >
                  <span className="text-[12.5px] font-black text-white/88">{item.label}</span>
                  <span className="text-[12px] font-black text-red-100/70">
                    {formatMoneyCentavos(item.amountCentavos)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {phase === "edit-change-select" ? (
            <div className="mt-1 grid gap-2">
              {editItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseAmountItem(item)}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-[17px] border border-blue-200/12 bg-white/[0.035] px-4 text-left active:scale-[0.985]"
                >
                  <span className="text-[12.5px] font-black text-white/88">{item.label}</span>
                  <span className="text-[12px] font-black text-[#8ffff8]/78">
                    {formatMoneyCentavos(item.amountCentavos)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {phase === "edit-change-amount" ? (
            <div className="mt-auto pt-3">
              <Composer
                value={amountInput}
                onChange={setAmountInput}
                onSubmit={submitChangedAmount}
                placeholder="New usual amount"
                inputMode="decimal"
              />
            </div>
          ) : null}

          {phase === "weekly-review" ? (
            <>
              <section className="mt-1 rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
                <div className="grid gap-2">
                  {days.map((day) => (
                    <div
                      key={day.key}
                      className="flex items-center justify-between gap-3 rounded-[15px] border border-white/8 bg-white/[0.035] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-black text-white/92">{day.name}</p>
                        <p className="mt-0.5 truncate text-[10.5px] font-semibold text-white/40">
                          {day.items.length
                            ? day.items.map((item) => item.label).join(" · ")
                            : "No routine expenses"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">
                        {formatMoneyCentavos(totalItems(day.items))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">
                    Normal weekly routine
                  </span>
                  <span className="text-[15px] font-black text-white">
                    {formatMoneyCentavos(weeklyTotal)}
                  </span>
                </div>
              </section>
              <div className="grid gap-2.5">
                <ChoiceButton onClick={saveRoutine} disabled={busy}>
                  {busy ? "Saving..." : "Save my routine"}
                </ChoiceButton>
                <ChoiceButton onClick={resetFlow} disabled={busy} secondary>
                  Start over
                </ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "saved" ? (
            <>
              <section className="mt-1 rounded-[22px] border border-emerald-300/16 bg-emerald-300/[0.045] p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-[#8ffff8]" />
                <p className="mt-2 text-[13px] font-black text-white">Daily routine saved</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/48">
                  Normal weekly routine · {formatMoneyCentavos(savedRoutine?.weeklyTotalCentavos || 0)}
                </p>
              </section>
              <div className="grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={resetFlow}>Update routine</ChoiceButton>
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
            </>
          ) : null}

          {error ? (
            <p
              className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88"
              aria-live="polite"
            >
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
