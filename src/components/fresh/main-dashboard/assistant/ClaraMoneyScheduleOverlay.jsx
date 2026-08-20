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
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

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

function sanitizeMoneyInput(value) {
  const cleaned = String(value ?? "")
    .replace(/php/gi, "")
    .replace(/[₱,\s]/g, "")
    .replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  const parts = cleaned.split(".");
  const whole = parts.shift() || "0";
  const fraction = parts.join("").slice(0, 2);
  return fraction ? `${whole}.${fraction}` : whole;
}

function formatMoneyCentavos(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0)) / 100;
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatEditableAmount(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0)) / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
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

function Bubble({ role, children, typing = false }) {
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
        {typing ? (
          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-cyan-100/75" />
        ) : null}
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
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55"
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

function ExpenseList({
  items = [],
  totalLabel = "Daily total",
  amountEditMode = false,
  editingItemId = "",
  inlineAmountInput = "",
  onStartAmountEdit,
  onInlineAmountChange,
  onCommitAmountEdit,
  onCancelAmountEdit,
}) {
  return (
    <section className="rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => {
            const editingAmount = amountEditMode && editingItemId === item.id;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[15px] border border-white/8 bg-white/[0.035] px-3.5 py-3"
              >
                <span className="min-w-0 truncate text-[12.5px] font-black text-white/90">
                  {item.label}
                </span>

                {editingAmount ? (
                  <div
                    className="flex min-w-[92px] shrink-0 items-center justify-end gap-1 rounded-[12px] border border-cyan-200/24 bg-cyan-200/[0.055] px-2 py-1"
                    data-clara-money-routine-inline-amount="true"
                  >
                    <span className="text-[12px] font-black text-[#8ffff8]/82">₱</span>
                    <input
                      autoFocus
                      value={inlineAmountInput}
                      onChange={(event) => onInlineAmountChange?.(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={() => onCommitAmountEdit?.(item, { revertInvalid: true })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onCommitAmountEdit?.(item);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelAmountEdit?.();
                        }
                      }}
                      inputMode="decimal"
                      aria-label={`Edit ${item.label} amount`}
                      className="w-[62px] bg-transparent text-right text-[12px] font-black text-white outline-none"
                    />
                  </div>
                ) : amountEditMode ? (
                  <button
                    type="button"
                    onClick={() => onStartAmountEdit?.(item)}
                    className="flex shrink-0 items-center justify-end gap-1.5 rounded-[12px] px-1 py-1 text-[#8ffff8]/82 transition active:scale-95"
                    aria-label={`Change ${item.label} amount`}
                  >
                    <span className="text-[12px] font-black">
                      {formatMoneyCentavos(item.amountCentavos)}
                    </span>
                    <PencilLine className="h-3.5 w-3.5 text-cyan-100/72" />
                  </button>
                ) : (
                  <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">
                    {formatMoneyCentavos(item.amountCentavos)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-white/48">No routine expenses added yet.</p>
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
  const [phase, setPhase] = useState("opening");
  const [messages, setMessages] = useState([]);
  const [days, setDays] = useState([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [amountEditMode, setAmountEditMode] = useState(false);
  const [inlineEditingItemId, setInlineEditingItemId] = useState("");
  const [inlineAmountInput, setInlineAmountInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedRoutine, setSavedRoutine] = useState(null);
  const [editReturnContext, setEditReturnContext] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [interactionReady, setInteractionReady] = useState(false);
  const viewportRef = useRef(null);
  const previousActiveRef = useRef(false);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("welcome");
  const sequenceTokenRef = useRef(0);

  const currentWeekday =
    CLARA_MONEY_ROUTINE_WEEKDAYS[dayIndex] || CLARA_MONEY_ROUTINE_WEEKDAYS[0];
  const configuredDays = days.slice(0, dayIndex);

  const scrollToLatest = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  };

  const appendUser = (text) => {
    if (!cleanText(text)) return;
    setMessages((current) => [...current, chatMessage("user", text)]);
    scrollToLatest();
  };

  const registerTimeout = (callback, delay) => {
    const id = window.setTimeout(() => {
      timerIdsRef.current.delete(id);
      callback();
    }, delay);
    timerIdsRef.current.add(id);
    return id;
  };

  const clearPacingTimers = () => {
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    typingTimerRef.current = null;
    timerIdsRef.current.forEach((id) => window.clearTimeout(id));
    timerIdsRef.current.clear();
  };

  const cancelConversationPacing = () => {
    sequenceTokenRef.current += 1;
    clearPacingTimers();
    sequenceRef.current = [];
    setPendingMessage(null);
    setTypedText("");
    setInteractionReady(false);
  };

  const queueNextAssistantMessage = (token, skipDelay = false) => {
    if (token !== sequenceTokenRef.current) return;
    const nextText = sequenceRef.current.shift();

    if (!nextText) {
      setPendingMessage(null);
      setTypedText("");
      setPhase(sequencePhaseRef.current);
      registerTimeout(() => {
        if (token === sequenceTokenRef.current) setInteractionReady(true);
      }, getClaraReadDelay());
      return;
    }

    const show = () => {
      if (token !== sequenceTokenRef.current) return;
      setTypedText("");
      setPendingMessage(chatMessage("assistant", nextText));
      scrollToLatest();
    };

    if (skipDelay) show();
    else registerTimeout(show, getClaraReplyDelay());
  };

  const runAssistantSequence = (replyTexts, nextPhase, options = {}) => {
    cancelConversationPacing();
    const replies = replyTexts.map((text) => cleanText(text)).filter(Boolean);
    const token = sequenceTokenRef.current;
    sequenceRef.current = replies;
    sequencePhaseRef.current = nextPhase;
    setPhase("responding");
    setInteractionReady(false);
    queueNextAssistantMessage(token, options.skipInitialDelay === true);
  };

  const resetInlineAmountEditing = ({ keepMode = false } = {}) => {
    if (!keepMode) setAmountEditMode(false);
    setInlineEditingItemId("");
    setInlineAmountInput("");
  };

  const resetRoutineFields = () => {
    setDays([]);
    setDayIndex(0);
    setDraftText("");
    setEditItems([]);
    resetInlineAmountEditing();
    setError("");
    setBusy(false);
    setSavedRoutine(null);
    setEditReturnContext(null);
  };

  const startOpeningConversation = () => {
    cancelConversationPacing();
    resetRoutineFields();
    setMessages([]);
    runAssistantSequence(
      [`Hi ${firstName}! Ready to help me understand your usual daily routine expenses?`],
      "welcome",
      { skipInitialDelay: true }
    );
  };

  useEffect(() => {
    if (!pendingMessage) return undefined;
    const token = sequenceTokenRef.current;
    const plan = getClaraTypingPlan(pendingMessage.text);
    let index = 0;

    setTypedText("");
    typingTimerRef.current = window.setInterval(() => {
      if (token !== sequenceTokenRef.current) return;
      index = Math.min(plan.source.length, index + plan.charsPerTick);
      setTypedText(plan.source.slice(0, index));
      scrollToLatest();

      if (index >= plan.source.length) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        const completedMessage = pendingMessage;
        setMessages((current) => [...current, completedMessage]);
        setPendingMessage(null);
        setTypedText("");
        scrollToLatest();
        queueNextAssistantMessage(token);
      }
    }, plan.tickMs);

    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, [pendingMessage]);

  useEffect(() => {
    if (isActive && !previousActiveRef.current) startOpeningConversation();
    if (!isActive && previousActiveRef.current) {
      cancelConversationPacing();
      resetRoutineFields();
      setMessages([]);
      setPhase("opening");
    }
    previousActiveRef.current = isActive;
  }, [isActive, firstName]);

  useEffect(
    () => () => {
      sequenceTokenRef.current += 1;
      clearPacingTimers();
    },
    []
  );

  useEffect(() => {
    if (!isActive || typeof window === "undefined") return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (inlineEditingItemId) {
          resetInlineAmountEditing({ keepMode: true });
          return;
        }
        cancelConversationPacing();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, onClose, inlineEditingItemId]);

  useEffect(() => {
    scrollToLatest();
  }, [messages, pendingMessage, phase]);

  if (!isActive) return null;

  const startSetup = () => {
    if (!interactionReady) return;
    setEditItems([]);
    resetInlineAmountEditing();
    setError("");
    appendUser("Yes, I’m ready");
    runAssistantSequence(
      [
        "Great! Let’s start with Monday.",
        "We’ll build Monday one routine expense at a time. Tap Add whenever you want to add something you normally need on Monday, then press Done when the day is complete.",
        "Please leave out occasional or extra spending — only include things that are part of your usual routine.",
      ],
      "day-edit"
    );
  };

  const moveToNextDay = (items, leadReplies = []) => {
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
    setEditItems([]);
    resetInlineAmountEditing();
    setError("");

    if (dayIndex >= CLARA_MONEY_ROUTINE_WEEKDAYS.length - 1) {
      runAssistantSequence(
        [
          ...leadReplies,
          "Sunday is done. I now have your normal Monday-to-Sunday routine.",
          "Review it once before I save it as your current weekly Money Schedule.",
        ],
        "weekly-review"
      );
      return;
    }

    const nextIndex = dayIndex + 1;
    const nextWeekday = CLARA_MONEY_ROUTINE_WEEKDAYS[nextIndex];
    setDayIndex(nextIndex);
    runAssistantSequence(
      [
        ...leadReplies,
        `${weekday.name} is done. Now let’s set up ${nextWeekday.name}.`,
        `You can reuse a day you already finished, copy one and change it, make ${nextWeekday.name} completely different, or go back and edit a completed day.`,
      ],
      "day-choice"
    );
  };

  const useSameDay = (sourceDay) => {
    if (!interactionReady) return;
    appendUser(`Same as ${sourceDay.name}`);
    moveToNextDay(sourceDay.items, [
      `Got it. ${currentWeekday.name} will use the same routine as ${sourceDay.name}.`,
    ]);
  };

  const chooseCopyAndChange = () => {
    if (!interactionReady) return;
    appendUser("Copy a previous day and change it");
    runAssistantSequence(
      [`Which day should I use as the starting point for ${currentWeekday.name}?`],
      "copy-source"
    );
  };

  const chooseCopySource = (sourceDay) => {
    if (!interactionReady) return;
    setEditItems(cloneItems(sourceDay.items));
    resetInlineAmountEditing();
    setError("");
    appendUser(`Start from ${sourceDay.name}`);
    runAssistantSequence(
      [
        `Done. I copied ${sourceDay.name}.`,
        `Now use Add, Remove, or Change amount for anything that is different on ${currentWeekday.name}.`,
      ],
      "day-edit"
    );
  };

  const chooseCompletelyDifferent = () => {
    if (!interactionReady) return;
    setDraftText("");
    setEditItems([]);
    resetInlineAmountEditing();
    setError("");
    appendUser("Completely different setup");
    runAssistantSequence(
      [
        `Okay. ${currentWeekday.name} will start empty.`,
        `Use Add to build the normal ${currentWeekday.name} routine one expense at a time, then press Done when you’re finished.`,
      ],
      "day-edit"
    );
  };

  const openPreviousDayPicker = () => {
    if (!interactionReady || !configuredDays.length) return;
    appendUser("Edit a previous day");
    runAssistantSequence(
      ["Sure. Which completed day would you like to edit?"],
      "edit-previous-source"
    );
  };

  const choosePreviousDayToEdit = (sourceDay, returnPhase = "day-choice") => {
    if (!interactionReady) return;
    const targetIndex = days.findIndex((day) => day?.key === sourceDay?.key);
    if (targetIndex < 0) return;

    const returnDayIndex = dayIndex;
    setEditReturnContext({
      returnDayIndex,
      returnPhase,
    });
    setDayIndex(targetIndex);
    setDraftText("");
    setEditItems(cloneItems(sourceDay.items));
    resetInlineAmountEditing();
    setError("");
    appendUser(`Edit ${sourceDay.name}`);
    runAssistantSequence(
      [
        `Here’s your current ${sourceDay.name} routine.`,
        "Use Add, Remove, or Change amount for anything you want to correct, then press Done editing.",
      ],
      "day-edit"
    );
  };

  const cancelPreviousDayPicker = () => {
    if (!interactionReady) return;
    appendUser(`Keep setting up ${currentWeekday.name}`);
    runAssistantSequence(
      [`No problem. Let’s continue with ${currentWeekday.name}.`],
      "day-choice"
    );
  };

  const startAddExpense = () => {
    if (!interactionReady) return;
    setDraftText("");
    resetInlineAmountEditing();
    setError("");
    appendUser("Add something");
    runAssistantSequence(
      [`What should I add to ${currentWeekday.name}? You can say something like “Transportation 100”.`],
      "edit-add"
    );
  };

  const submitAddedExpense = () => {
    if (!interactionReady) return;
    const parsed = parseRoutineExpenses(draftText);
    if (!parsed.items.length || parsed.invalidLines.length) {
      setError("Use the format “Expense amount”, for example “Transportation 100”.");
      return;
    }

    const submittedText = draftText;
    setEditItems((current) => [...current, ...parsed.items]);
    setDraftText("");
    setError("");
    appendUser(submittedText);
    runAssistantSequence(
      [
        editReturnContext
          ? "Updated. You can make another correction or press Done editing."
          : "Added. You can add another expense, remove one, change an amount, or press Done for this day.",
      ],
      "day-edit"
    );
  };

  const startRemoveExpense = () => {
    if (!interactionReady || !editItems.length) return;
    resetInlineAmountEditing();
    setError("");
    appendUser("Remove something");
    runAssistantSequence(
      [`Which ${currentWeekday.name} expense should I remove?`],
      "edit-remove"
    );
  };

  const removeExpense = (item) => {
    if (!interactionReady) return;
    setEditItems((current) => current.filter((candidate) => candidate.id !== item.id));
    appendUser(`Remove ${item.label}`);
    runAssistantSequence(
      [`${item.label} removed from ${currentWeekday.name}.`],
      "day-edit"
    );
  };

  const startChangeAmount = () => {
    if (!interactionReady || !editItems.length) return;
    setError("");
    setAmountEditMode((current) => !current);
    setInlineEditingItemId("");
    setInlineAmountInput("");
  };

  const startInlineAmountEdit = (item) => {
    if (!interactionReady || !amountEditMode) return;
    setInlineEditingItemId(item.id);
    setInlineAmountInput(formatEditableAmount(item.amountCentavos));
    setError("");
  };

  const changeInlineAmountInput = (value) => {
    setInlineAmountInput(sanitizeMoneyInput(value));
    if (error) setError("");
  };

  const commitInlineAmountEdit = (item, options = {}) => {
    const amountCentavos = parseAmountToCentavos(inlineAmountInput);
    if (amountCentavos <= 0) {
      if (options.revertInvalid) {
        setInlineEditingItemId("");
        setInlineAmountInput("");
        setError("");
        return false;
      }
      setError("Enter an amount greater than zero.");
      return false;
    }

    setEditItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, amountCentavos } : candidate
      )
    );
    setInlineEditingItemId("");
    setInlineAmountInput("");
    setError("");
    return true;
  };

  const cancelInlineAmountEdit = () => {
    setInlineEditingItemId("");
    setInlineAmountInput("");
    setError("");
  };

  const materializeInlineAmount = (items = editItems) => {
    if (!inlineEditingItemId) return items;
    const amountCentavos = parseAmountToCentavos(inlineAmountInput);
    if (amountCentavos <= 0) return items;
    return items.map((candidate) =>
      candidate.id === inlineEditingItemId ? { ...candidate, amountCentavos } : candidate
    );
  };

  const finishPreviousDayEdit = (finalItems = editItems) => {
    const context = editReturnContext;
    if (!context) return false;

    const editedWeekday = currentWeekday;
    const editedDayIndex = dayIndex;
    const nextItems = cloneItems(finalItems);
    const returnDayIndex = context.returnDayIndex;
    const returnWeekday = CLARA_MONEY_ROUTINE_WEEKDAYS[returnDayIndex];

    setDays((current) => {
      const nextDays = [...current];
      const existingDay = nextDays[editedDayIndex] || {};
      nextDays[editedDayIndex] = {
        ...existingDay,
        key: editedWeekday.key,
        name: editedWeekday.name,
        weekdayIndex: editedWeekday.weekdayIndex,
        items: nextItems,
      };
      return nextDays;
    });

    appendUser(`Done editing ${editedWeekday.name}`);
    setEditReturnContext(null);
    setDayIndex(returnDayIndex);
    setDraftText("");
    setEditItems([]);
    resetInlineAmountEditing();
    setError("");

    if (context.returnPhase === "weekly-review") {
      runAssistantSequence(
        [`${editedWeekday.name} updated. Your weekly review is refreshed.`],
        "weekly-review"
      );
    } else {
      runAssistantSequence(
        [
          `${editedWeekday.name} updated.`,
          `Now let’s continue setting up ${returnWeekday?.name || "your current day"}.`,
        ],
        "day-choice"
      );
    }

    return true;
  };

  const finishEditedDay = () => {
    if (!interactionReady) return;
    const finalItems = materializeInlineAmount(editItems);
    if (finishPreviousDayEdit(finalItems)) return;

    appendUser(`Done with ${currentWeekday.name}`);
    moveToNextDay(
      finalItems,
      finalItems.length
        ? []
        : [`Got it. I’ll keep ${currentWeekday.name} at ₱0 because you didn’t add any routine expenses.`]
    );
  };

  const saveRoutine = () => {
    if (busy || !interactionReady) return;
    setBusy(true);
    setError("");

    try {
      const routine = saveClaraMoneyRoutine({ user, days });
      setSavedRoutine(routine);
      setBusy(false);
      appendUser("Save my routine");
      runAssistantSequence(
        [
          "Done. I now understand your normal Monday-to-Sunday routine expenses.",
          "I’ll treat this as your current weekly routine until you update it.",
        ],
        "saved"
      );
    } catch (nextError) {
      setBusy(false);
      setError(cleanText(nextError?.message) || "I couldn’t save your routine. Please try again.");
    }
  };

  const resetFlow = () => startOpeningConversation();

  const closeChat = () => {
    cancelConversationPacing();
    onClose?.();
  };

  const weeklyTotal = days.reduce((sum, day) => sum + totalItems(day?.items), 0);
  const controlsReady = interactionReady && !pendingMessage && phase !== "responding" && !busy;

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="money-schedule"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-money-schedule-chat="true"
      data-clara-money-routine-flow="true"
      data-clara-conversation-pacing="masterclass"
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

          {pendingMessage ? <Bubble role="assistant" typing>{typedText}</Bubble> : null}

          {phase === "welcome" && controlsReady ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <ChoiceButton onClick={startSetup}>Yes, let’s set it up</ChoiceButton>
              <ChoiceButton onClick={closeChat} secondary>Not now</ChoiceButton>
            </div>
          ) : null}

          {phase === "day-choice" && controlsReady ? (
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
              <ChoiceButton onClick={openPreviousDayPicker} secondary>
                Edit a previous day
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "copy-source" && controlsReady ? (
            <div className="mt-1 grid gap-2.5">
              {configuredDays.map((day) => (
                <ChoiceButton key={day.key} onClick={() => chooseCopySource(day)}>
                  Start from {day.name}
                </ChoiceButton>
              ))}
            </div>
          ) : null}

          {phase === "edit-previous-source" && controlsReady ? (
            <div className="mt-1 grid gap-2.5" data-clara-money-routine-edit-previous="true">
              {configuredDays.map((day) => (
                <ChoiceButton key={day.key} onClick={() => choosePreviousDayToEdit(day)}>
                  Edit {day.name}
                </ChoiceButton>
              ))}
              <ChoiceButton onClick={cancelPreviousDayPicker} secondary>
                Back to {currentWeekday.name}
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "day-edit" && controlsReady ? (
            <>
              <ExpenseList
                items={editItems}
                amountEditMode={amountEditMode}
                editingItemId={inlineEditingItemId}
                inlineAmountInput={inlineAmountInput}
                onStartAmountEdit={startInlineAmountEdit}
                onInlineAmountChange={changeInlineAmountInput}
                onCommitAmountEdit={commitInlineAmountEdit}
                onCancelAmountEdit={cancelInlineAmountEdit}
              />
              <div className="grid grid-cols-2 gap-2.5" data-clara-money-routine-day-controls="true">
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
                  aria-pressed={amountEditMode}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.985] disabled:opacity-35 ${
                    amountEditMode
                      ? "border-cyan-200/28 bg-cyan-200/[0.09] text-cyan-50"
                      : "border-blue-300/18 bg-white/[0.04] text-white/88"
                  }`}
                >
                  <PencilLine className="h-4 w-4" />
                  {amountEditMode ? "Done changing" : "Change amount"}
                </button>
                <ChoiceButton onClick={finishEditedDay}>
                  {editReturnContext ? "Done editing" : "Done"}
                </ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "edit-add" && controlsReady ? (
            <div className="mt-auto pt-3">
              <Composer
                value={draftText}
                onChange={setDraftText}
                onSubmit={submitAddedExpense}
                placeholder="Transportation 100"
              />
            </div>
          ) : null}

          {phase === "edit-remove" && controlsReady ? (
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

          {phase === "weekly-review" && controlsReady ? (
            <>
              <section className="mt-1 rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
                <div className="grid gap-2">
                  {days.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => choosePreviousDayToEdit(day, "weekly-review")}
                      className="flex items-center justify-between gap-3 rounded-[15px] border border-white/8 bg-white/[0.035] px-3.5 py-3 text-left transition active:scale-[0.99]"
                      aria-label={`Edit ${day.name} routine`}
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-black text-white/92">{day.name}</p>
                        <p className="mt-0.5 truncate text-[10.5px] font-semibold text-white/40">
                          {day.items.length
                            ? day.items.map((item) => item.label).join(" · ")
                            : "No routine expenses"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block text-[12px] font-black text-[#8ffff8]/82">
                          {formatMoneyCentavos(totalItems(day.items))}
                        </span>
                        <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[0.12em] text-white/34">
                          Edit
                        </span>
                      </div>
                    </button>
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

          {phase === "saved" && controlsReady ? (
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

          {error && phase !== "responding" ? (
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
