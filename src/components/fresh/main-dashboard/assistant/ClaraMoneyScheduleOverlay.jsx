import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CheckCircle2,
  MinusCircle,
  PencilLine,
  PlusCircle,
} from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import {
  CLARA_MONEY_ROUTINE_WEEKDAYS,
  readClaraMoneyRoutine,
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

function basisDayKeyFrom(day = {}) {
  return cleanText(day?.basisDayKey || day?.basis_day_key).toLowerCase();
}

function findDependentDayIndexes(days = [], sourceDayKey = "") {
  const sourceKey = cleanText(sourceDayKey).toLowerCase();
  if (!sourceKey) return [];

  const dependentKeys = new Set();
  let changed = true;

  while (changed) {
    changed = false;
    days.forEach((day) => {
      if (!day?.key || dependentKeys.has(day.key)) return;
      const basisKey = basisDayKeyFrom(day);
      if (!basisKey) return;
      if (basisKey === sourceKey || dependentKeys.has(basisKey)) {
        dependentKeys.add(day.key);
        changed = true;
      }
    });
  }

  return days
    .map((day, index) => (day?.key && dependentKeys.has(day.key) ? index : -1))
    .filter((index) => index >= 0);
}

function findNextMissingDayIndex(days = [], startIndex = 0) {
  for (let index = Math.max(0, startIndex); index < CLARA_MONEY_ROUTINE_WEEKDAYS.length; index += 1) {
    if (!days[index]) return index;
  }
  return -1;
}

function joinDayNames(names = []) {
  const cleanNames = names.map((name) => cleanText(name)).filter(Boolean);
  if (!cleanNames.length) return "";
  if (cleanNames.length === 1) return cleanNames[0];
  if (cleanNames.length === 2) return `${cleanNames[0]} and ${cleanNames[1]}`;
  return `${cleanNames.slice(0, -1).join(", ")}, and ${cleanNames[cleanNames.length - 1]}`;
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
  itemEditMode = false,
  editingItemId = "",
  editingField = "",
  inlineLabelInput = "",
  inlineAmountInput = "",
  onStartLabelEdit,
  onStartAmountEdit,
  onInlineLabelChange,
  onInlineAmountChange,
  onCommitLabelEdit,
  onCommitAmountEdit,
  onCancelInlineEdit,
}) {
  return (
    <section className="rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => {
            const editingLabel =
              itemEditMode && editingItemId === item.id && editingField === "label";
            const editingAmount =
              itemEditMode && editingItemId === item.id && editingField === "amount";

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[15px] border border-white/8 bg-white/[0.035] px-3.5 py-3"
              >
                {editingLabel ? (
                  <div
                    className="min-w-0 flex-1 rounded-[12px] border border-cyan-200/24 bg-cyan-200/[0.055] px-2.5 py-1"
                    data-clara-money-routine-inline-label="true"
                  >
                    <input
                      autoFocus
                      value={inlineLabelInput}
                      onChange={(event) => onInlineLabelChange?.(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={() => onCommitLabelEdit?.(item, { revertInvalid: true })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onCommitLabelEdit?.(item);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelInlineEdit?.();
                        }
                      }}
                      aria-label={`Edit ${item.label} name`}
                      className="w-full bg-transparent text-[12.5px] font-black text-white outline-none"
                    />
                  </div>
                ) : itemEditMode ? (
                  <button
                    type="button"
                    onClick={() => onStartLabelEdit?.(item)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[12px] py-1 text-left text-white/90 transition active:scale-[0.99]"
                    aria-label={`Change ${item.label} name`}
                  >
                    <span className="min-w-0 truncate text-[12.5px] font-black">{item.label}</span>
                    <PencilLine className="h-3.5 w-3.5 shrink-0 text-cyan-100/72" />
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-black text-white/90">
                    {item.label}
                  </span>
                )}

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
                          onCancelInlineEdit?.();
                        }
                      }}
                      inputMode="decimal"
                      aria-label={`Edit ${item.label} amount`}
                      className="w-[62px] bg-transparent text-right text-[12px] font-black text-white outline-none"
                    />
                  </div>
                ) : itemEditMode ? (
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

function WeeklyReviewDayCard({
  day,
  editingDayKey,
  editingItemId,
  editingField,
  inlineLabelInput,
  inlineAmountInput,
  onRequestEdit,
  onLabelChange,
  onAmountChange,
  onCommitLabel,
  onCommitAmount,
  onCancelEdit,
}) {
  return (
    <article
      className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3"
      data-clara-money-routine-review-day={day.key}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2.5">
        <span className="text-[13px] font-black text-white/94">{day.name}</span>
        <span className="text-[13px] font-black text-white">
          {formatMoneyCentavos(totalItems(day.items))}
        </span>
      </div>

      {day.items.length ? (
        <div className="mt-2 grid gap-1.5">
          {day.items.map((item) => {
            const editingLabel =
              editingDayKey === day.key &&
              editingItemId === item.id &&
              editingField === "label";
            const editingAmount =
              editingDayKey === day.key &&
              editingItemId === item.id &&
              editingField === "amount";

            return (
              <div
                key={item.id}
                className="flex min-h-9 items-center justify-between gap-2 rounded-[12px] px-1.5"
                data-clara-money-routine-review-item="true"
              >
                {editingLabel ? (
                  <div
                    className="min-w-0 flex-1 rounded-[10px] border border-cyan-200/24 bg-cyan-200/[0.055] px-2 py-1"
                    data-clara-money-routine-review-inline-label="true"
                  >
                    <input
                      autoFocus
                      value={inlineLabelInput}
                      onChange={(event) => onLabelChange?.(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={() => onCommitLabel?.(day, item, { revertInvalid: true })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onCommitLabel?.(day, item);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelEdit?.();
                        }
                      }}
                      aria-label={`Edit ${day.name} ${item.label} name`}
                      className="w-full bg-transparent text-[11.5px] font-black text-white outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestEdit?.(day, item, "label")}
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-white/78 transition active:scale-[0.99]"
                    aria-label={`Edit ${day.name} ${item.label} name`}
                  >
                    <span className="min-w-0 truncate text-[11.5px] font-bold">{item.label}</span>
                    <PencilLine className="h-3 w-3 shrink-0 text-cyan-100/58" />
                  </button>
                )}

                <span className="shrink-0 text-[10px] font-bold text-white/22">—</span>

                {editingAmount ? (
                  <div
                    className="flex w-[82px] shrink-0 items-center justify-end gap-1 rounded-[10px] border border-cyan-200/24 bg-cyan-200/[0.055] px-2 py-1"
                    data-clara-money-routine-review-inline-amount="true"
                  >
                    <span className="text-[11px] font-black text-[#8ffff8]/82">₱</span>
                    <input
                      autoFocus
                      value={inlineAmountInput}
                      onChange={(event) => onAmountChange?.(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={() => onCommitAmount?.(day, item, { revertInvalid: true })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onCommitAmount?.(day, item);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelEdit?.();
                        }
                      }}
                      inputMode="decimal"
                      aria-label={`Edit ${day.name} ${item.label} amount`}
                      className="w-full bg-transparent text-right text-[11.5px] font-black text-white outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestEdit?.(day, item, "amount")}
                    className="flex shrink-0 items-center justify-end gap-1.5 py-1 text-[#8ffff8]/78 transition active:scale-95"
                    aria-label={`Edit ${day.name} ${item.label} amount`}
                  >
                    <span className="text-[11.5px] font-black">
                      {formatMoneyCentavos(item.amountCentavos)}
                    </span>
                    <PencilLine className="h-3 w-3 text-cyan-100/58" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-white/36">No routine expenses.</p>
      )}
    </article>
  );
}

export default function ClaraMoneyScheduleOverlay({
  isActive = false,
  claraAssistantContext = {},
  onSetupResult,
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const [phase, setPhase] = useState("opening");
  const [messages, setMessages] = useState([]);
  const [days, setDays] = useState([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [currentBasisDayKey, setCurrentBasisDayKey] = useState("");
  const [draftText, setDraftText] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addAmountInput, setAddAmountInput] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [itemEditMode, setItemEditMode] = useState(false);
  const [inlineEditingItemId, setInlineEditingItemId] = useState("");
  const [inlineEditingField, setInlineEditingField] = useState("");
  const [inlineLabelInput, setInlineLabelInput] = useState("");
  const [inlineAmountInput, setInlineAmountInput] = useState("");
  const [reviewEditingDayKey, setReviewEditingDayKey] = useState("");
  const [pendingReviewBasisEdit, setPendingReviewBasisEdit] = useState(null);
  const [reviewInvalidationNotice, setReviewInvalidationNotice] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedRoutine, setSavedRoutine] = useState(null);
  const [editReturnContext, setEditReturnContext] = useState(null);
  const [pendingBasisEdit, setPendingBasisEdit] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [interactionReady, setInteractionReady] = useState(false);
  const viewportRef = useRef(null);
  const stackRef = useRef(null);
  const previousActiveRef = useRef(false);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("welcome");
  const sequenceTokenRef = useRef(0);

  const currentWeekday =
    CLARA_MONEY_ROUTINE_WEEKDAYS[dayIndex] || CLARA_MONEY_ROUTINE_WEEKDAYS[0];
  const configuredDays = days.slice(0, dayIndex).filter(Boolean);

  const appendUser = (text) => {
    if (!cleanText(text)) return;
    setMessages((current) => [...current, chatMessage("user", text)]);
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

  const resetInlineItemEditing = ({ keepMode = false } = {}) => {
    if (!keepMode) setItemEditMode(false);
    setInlineEditingItemId("");
    setInlineEditingField("");
    setInlineLabelInput("");
    setInlineAmountInput("");
  };

  const resetReviewInlineEditing = () => {
    setReviewEditingDayKey("");
    setInlineEditingItemId("");
    setInlineEditingField("");
    setInlineLabelInput("");
    setInlineAmountInput("");
    setError("");
  };

  const resetAddExpenseDraft = () => {
    setAddItemOpen(false);
    setDraftText("");
    setAddAmountInput("");
  };

  const resetRoutineFields = () => {
    setDays([]);
    setDayIndex(0);
    setCurrentBasisDayKey("");
    resetAddExpenseDraft();
    setEditItems([]);
    resetInlineItemEditing();
    setReviewEditingDayKey("");
    setPendingReviewBasisEdit(null);
    setReviewInvalidationNotice(null);
    setError("");
    setBusy(false);
    setSavedRoutine(null);
    setEditReturnContext(null);
    setPendingBasisEdit(null);
  };

  const startOpeningConversation = () => {
    cancelConversationPacing();
    resetRoutineFields();
    setMessages([]);

    const existingRoutine = readClaraMoneyRoutine(user);
    if (existingRoutine?.active && Array.isArray(existingRoutine.days)) {
      setDays(existingRoutine.days);
      setSavedRoutine(existingRoutine);
      runAssistantSequence(
        [
          `Hi ${firstName}! Your Money Schedule is already set up.`,
          "Here’s your current Monday-to-Sunday routine. If something changed, you can edit only that day.",
        ],
        "saved",
        { skipInitialDelay: true }
      );
      return;
    }

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

      if (index >= plan.source.length) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        const completedMessage = pendingMessage;
        setMessages((current) => [...current, completedMessage]);
        setPendingMessage(null);
        setTypedText("");
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
          if (phase === "weekly-review") resetReviewInlineEditing();
          else resetInlineItemEditing({ keepMode: true });
          return;
        }
        cancelConversationPacing();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, onClose, inlineEditingItemId, phase]);

  const controlsReady = interactionReady && !pendingMessage && phase !== "responding" && !busy;
  const latestAssistantMessage = [...messages].reverse().find((entry) => entry?.role === "assistant") || null;
  const revealKey = controlsReady && latestAssistantMessage
    ? `${sequenceTokenRef.current}:${phase}:${latestAssistantMessage.id}`
    : null;

  useClaraConversationReveal({
    viewportRef,
    assistantRef: stackRef,
    actionRef: stackRef,
    assistantRefMode: "latest-assistant",
    actionRefMode: "last-child",
    revealKey,
    enabled: isActive,
    requireAction: true,
    behavior: "smooth",
  });

  if (!isActive) return null;

  const startSetup = () => {
    if (!interactionReady) return;
    setEditItems([]);
    setCurrentBasisDayKey("");
    resetAddExpenseDraft();
    resetInlineItemEditing();
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

  const moveToNextDay = (items, leadReplies = [], options = {}) => {
    const weekday = currentWeekday;
    const basisDayKey = cleanText(options.basisDayKey ?? currentBasisDayKey).toLowerCase() || null;
    const normalizedDay = {
      key: weekday.key,
      name: weekday.name,
      weekdayIndex: weekday.weekdayIndex,
      basisDayKey,
      items: cloneItems(items),
    };
    const nextDays = [...days];
    nextDays[dayIndex] = normalizedDay;
    setDays(nextDays);
    resetAddExpenseDraft();
    setEditItems([]);
    setCurrentBasisDayKey("");
    resetInlineItemEditing();
    setReviewInvalidationNotice(null);
    setError("");

    const nextIndex = findNextMissingDayIndex(nextDays, dayIndex + 1);
    if (nextIndex < 0) {
      runAssistantSequence(
        [
          ...leadReplies,
          `${weekday.name} is done. I now have your normal Monday-to-Sunday routine.`,
          "Review it once before I save it as your current weekly Money Schedule.",
        ],
        "weekly-review"
      );
      return;
    }

    const nextWeekday = CLARA_MONEY_ROUTINE_WEEKDAYS[nextIndex];
    const skippedNames = nextDays
      .slice(dayIndex + 1, nextIndex)
      .filter(Boolean)
      .map((day) => day.name);
    setDayIndex(nextIndex);

    const dayChoiceReplies = [
      ...leadReplies,
      skippedNames.length
        ? `${weekday.name} is done. ${joinDayNames(skippedNames)} ${skippedNames.length === 1 ? "is" : "are"} already set, so now let’s set up ${nextWeekday.name}.`
        : `${weekday.name} is done. Now let’s set up ${nextWeekday.name}.`,
    ];

    if (dayIndex === 0) {
      dayChoiceReplies.push(
        `You can reuse a day you already finished, copy one and change it, make ${nextWeekday.name} completely different, or go back and edit a completed day.`
      );
    }

    runAssistantSequence(dayChoiceReplies, "day-choice");
  };

  const useSameDay = (sourceDay) => {
    if (!interactionReady) return;
    appendUser(`Same as ${sourceDay.name}`);
    moveToNextDay(
      sourceDay.items,
      [`Got it. ${currentWeekday.name} will use the same routine as ${sourceDay.name}.`],
      { basisDayKey: sourceDay.key }
    );
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
    resetAddExpenseDraft();
    setEditItems(cloneItems(sourceDay.items));
    setCurrentBasisDayKey(sourceDay.key);
    resetInlineItemEditing();
    setError("");
    appendUser(`Start from ${sourceDay.name}`);
    runAssistantSequence(
      [
        `Done. I copied ${sourceDay.name}.`,
        `Now use Add, Remove, or Edit item for anything that is different on ${currentWeekday.name}.`,
      ],
      "day-edit"
    );
  };

  const chooseCompletelyDifferent = () => {
    if (!interactionReady) return;
    resetAddExpenseDraft();
    setEditItems([]);
    setCurrentBasisDayKey("");
    resetInlineItemEditing();
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

  const openSavedDayPicker = () => {
    if (!interactionReady || !days.some(Boolean)) return;
    appendUser("Edit a day");
    runAssistantSequence(
      ["Sure. Which day would you like to update?"],
      "saved-day-picker"
    );
  };

  const cancelSavedDayPicker = () => {
    if (!interactionReady) return;
    appendUser("Back");
    runAssistantSequence(
      ["No problem. Your current Money Schedule is unchanged."],
      "saved"
    );
  };

  const beginPreviousDayEdit = ({
    sourceDay,
    returnPhase = "day-choice",
    returnDayIndex = dayIndex,
    invalidatedDayIndexes = [],
    invalidatedDayNames = [],
  }) => {
    const targetIndex = days.findIndex((day) => day?.key === sourceDay?.key);
    if (targetIndex < 0) return;

    setEditReturnContext({
      returnDayIndex,
      returnPhase,
      invalidatedDayIndexes,
      invalidatedDayNames,
    });
    setDayIndex(targetIndex);
    setCurrentBasisDayKey(basisDayKeyFrom(sourceDay));
    resetAddExpenseDraft();
    setEditItems(cloneItems(sourceDay.items));
    resetInlineItemEditing();
    setError("");
  };

  const choosePreviousDayToEdit = (sourceDay, returnPhase = "day-choice") => {
    if (!interactionReady) return;
    const targetIndex = days.findIndex((day) => day?.key === sourceDay?.key);
    if (targetIndex < 0) return;

    const dependentIndexes = findDependentDayIndexes(days, sourceDay.key);
    const dependentNames = dependentIndexes
      .map((index) => days[index]?.name)
      .filter(Boolean);
    const returnDayIndex = dayIndex;

    appendUser(`Edit ${sourceDay.name}`);

    if (dependentIndexes.length) {
      setPendingBasisEdit({
        sourceDay,
        returnPhase,
        returnDayIndex,
        dependentIndexes,
        dependentNames,
      });
      runAssistantSequence(
        [
          `Heads up — ${sourceDay.name} was used as the basis for ${joinDayNames(dependentNames)}.`,
          `If you continue editing ${sourceDay.name}, ${dependentNames.length === 1 ? "that day will" : "those days will"} be deleted and you’ll need to recreate ${dependentNames.length === 1 ? "it" : "them"} afterward.`,
        ],
        "basis-edit-warning"
      );
      return;
    }

    beginPreviousDayEdit({ sourceDay, returnPhase, returnDayIndex });
    runAssistantSequence(
      [
        `Here’s your current ${sourceDay.name} routine.`,
        "Use Add, Remove, or Edit item for anything you want to correct, then press Done editing.",
      ],
      "day-edit"
    );
  };

  const continueBasisDayEdit = () => {
    if (!interactionReady || !pendingBasisEdit) return;
    const context = pendingBasisEdit;
    const dependentIndexSet = new Set(context.dependentIndexes);
    const nextDays = [...days];
    context.dependentIndexes.forEach((index) => {
      nextDays[index] = undefined;
    });
    setDays(nextDays);
    setPendingBasisEdit(null);
    appendUser(`Continue editing ${context.sourceDay.name}`);
    beginPreviousDayEdit({
      sourceDay: context.sourceDay,
      returnPhase: context.returnPhase,
      returnDayIndex: context.returnDayIndex,
      invalidatedDayIndexes: [...dependentIndexSet],
      invalidatedDayNames: context.dependentNames,
    });
    runAssistantSequence(
      [
        `${joinDayNames(context.dependentNames)} ${context.dependentNames.length === 1 ? "has" : "have"} been cleared because ${context.dependentNames.length === 1 ? "it was" : "they were"} based on ${context.sourceDay.name}.`,
        `Here’s your current ${context.sourceDay.name} routine. Make your changes, then press Done editing.`,
      ],
      "day-edit"
    );
  };

  const cancelBasisDayEdit = () => {
    if (!interactionReady || !pendingBasisEdit) return;
    const context = pendingBasisEdit;
    setPendingBasisEdit(null);
    appendUser("Cancel");
    runAssistantSequence(
      [`No changes made. ${context.sourceDay.name} and the days based on it will stay as they are.`],
      context.returnPhase
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
    if (!interactionReady || addItemOpen) return;
    setDraftText("");
    setAddAmountInput("");
    setAddItemOpen(true);
    resetInlineItemEditing();
    setError("");
  };

  const cancelAddExpense = () => {
    resetAddExpenseDraft();
    setError("");
  };

  const submitAddedExpense = () => {
    if (!interactionReady || !addItemOpen) return;
    const label = cleanText(draftText);
    const amountCentavos = parseAmountToCentavos(addAmountInput);

    if (!label) {
      setError("Type the item name first.");
      return;
    }
    if (amountCentavos <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setEditItems((current) => [...current, createUiItem(label, amountCentavos)]);
    resetAddExpenseDraft();
    setError("");
  };

  const startRemoveExpense = () => {
    if (!interactionReady || !editItems.length || addItemOpen) return;
    resetInlineItemEditing();
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

  const toggleItemEditMode = () => {
    if (!interactionReady || !editItems.length || addItemOpen) return;
    setError("");
    setItemEditMode((current) => !current);
    setInlineEditingItemId("");
    setInlineEditingField("");
    setInlineLabelInput("");
    setInlineAmountInput("");
  };

  const startInlineLabelEdit = (item) => {
    if (!interactionReady || !itemEditMode) return;
    setInlineEditingItemId(item.id);
    setInlineEditingField("label");
    setInlineLabelInput(item.label);
    setInlineAmountInput("");
    setError("");
  };

  const startInlineAmountEdit = (item) => {
    if (!interactionReady || !itemEditMode) return;
    setInlineEditingItemId(item.id);
    setInlineEditingField("amount");
    setInlineLabelInput("");
    setInlineAmountInput(formatEditableAmount(item.amountCentavos));
    setError("");
  };

  const changeInlineLabelInput = (value) => {
    setInlineLabelInput(String(value ?? ""));
    if (error) setError("");
  };

  const changeInlineAmountInput = (value) => {
    setInlineAmountInput(sanitizeMoneyInput(value));
    if (error) setError("");
  };

  const commitInlineLabelEdit = (item, options = {}) => {
    const label = cleanText(inlineLabelInput);
    if (!label) {
      if (options.revertInvalid) {
        setInlineEditingItemId("");
        setInlineEditingField("");
        setInlineLabelInput("");
        setError("");
        return false;
      }
      setError("Item name cannot be empty.");
      return false;
    }

    setEditItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, label } : candidate
      )
    );
    setInlineEditingItemId("");
    setInlineEditingField("");
    setInlineLabelInput("");
    setError("");
    return true;
  };

  const commitInlineAmountEdit = (item, options = {}) => {
    const amountCentavos = parseAmountToCentavos(inlineAmountInput);
    if (amountCentavos <= 0) {
      if (options.revertInvalid) {
        setInlineEditingItemId("");
        setInlineEditingField("");
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
    setInlineEditingField("");
    setInlineAmountInput("");
    setError("");
    return true;
  };

  const cancelInlineEdit = () => {
    setInlineEditingItemId("");
    setInlineEditingField("");
    setInlineLabelInput("");
    setInlineAmountInput("");
    setError("");
  };

  const materializeInlineEdit = (items = editItems) => {
    if (!inlineEditingItemId || !inlineEditingField) return items;

    if (inlineEditingField === "label") {
      const label = cleanText(inlineLabelInput);
      if (!label) return items;
      return items.map((candidate) =>
        candidate.id === inlineEditingItemId ? { ...candidate, label } : candidate
      );
    }

    const amountCentavos = parseAmountToCentavos(inlineAmountInput);
    if (amountCentavos <= 0) return items;
    return items.map((candidate) =>
      candidate.id === inlineEditingItemId ? { ...candidate, amountCentavos } : candidate
    );
  };

  const beginReviewInlineEdit = (day, item, field) => {
    setReviewEditingDayKey(day.key);
    setInlineEditingItemId(item.id);
    setInlineEditingField(field);
    setInlineLabelInput(field === "label" ? item.label : "");
    setInlineAmountInput(field === "amount" ? formatEditableAmount(item.amountCentavos) : "");
    setError("");
  };

  const requestReviewInlineEdit = (day, item, field) => {
    if (!interactionReady || pendingReviewBasisEdit) return;

    const dependentIndexes = findDependentDayIndexes(days, day.key);
    if (dependentIndexes.length) {
      const dependentNames = dependentIndexes
        .map((index) => days[index]?.name)
        .filter(Boolean);
      resetReviewInlineEditing();
      setPendingReviewBasisEdit({
        sourceDayKey: day.key,
        sourceDayName: day.name,
        itemId: item.id,
        field,
        dependentIndexes,
        dependentNames,
      });
      return;
    }

    beginReviewInlineEdit(day, item, field);
  };

  const continueReviewBasisEdit = () => {
    if (!pendingReviewBasisEdit) return;
    const context = pendingReviewBasisEdit;
    const nextDays = [...days];
    context.dependentIndexes.forEach((index) => {
      nextDays[index] = undefined;
    });
    setDays(nextDays);
    setPendingReviewBasisEdit(null);
    setReviewInvalidationNotice({
      sourceDayName: context.sourceDayName,
      dependentNames: context.dependentNames,
    });

    const sourceDay = nextDays.find((day) => day?.key === context.sourceDayKey);
    const item = sourceDay?.items?.find((candidate) => candidate.id === context.itemId);
    if (sourceDay && item) beginReviewInlineEdit(sourceDay, item, context.field);
  };

  const cancelReviewBasisEdit = () => {
    setPendingReviewBasisEdit(null);
    resetReviewInlineEditing();
  };

  const commitReviewLabelEdit = (day, item, options = {}) => {
    const label = cleanText(inlineLabelInput);
    if (!label) {
      if (options.revertInvalid) {
        resetReviewInlineEditing();
        return false;
      }
      setError("Item name cannot be empty.");
      return false;
    }

    setDays((current) =>
      current.map((candidateDay) =>
        candidateDay?.key === day.key
          ? {
              ...candidateDay,
              items: candidateDay.items.map((candidate) =>
                candidate.id === item.id ? { ...candidate, label } : candidate
              ),
            }
          : candidateDay
      )
    );
    resetReviewInlineEditing();
    return true;
  };

  const commitReviewAmountEdit = (day, item, options = {}) => {
    const amountCentavos = parseAmountToCentavos(inlineAmountInput);
    if (amountCentavos <= 0) {
      if (options.revertInvalid) {
        resetReviewInlineEditing();
        return false;
      }
      setError("Enter an amount greater than zero.");
      return false;
    }

    setDays((current) =>
      current.map((candidateDay) =>
        candidateDay?.key === day.key
          ? {
              ...candidateDay,
              items: candidateDay.items.map((candidate) =>
                candidate.id === item.id ? { ...candidate, amountCentavos } : candidate
              ),
            }
          : candidateDay
      )
    );
    resetReviewInlineEditing();
    return true;
  };

  const recreateMissingDayFromReview = (index) => {
    if (!interactionReady) return;
    const weekday = CLARA_MONEY_ROUTINE_WEEKDAYS[index];
    if (!weekday) return;

    setPendingReviewBasisEdit(null);
    setReviewInvalidationNotice(null);
    resetReviewInlineEditing();
    setDayIndex(index);
    setCurrentBasisDayKey("");
    resetAddExpenseDraft();
    setEditItems([]);
    setError("");
    runAssistantSequence(
      [
        `Let’s recreate ${weekday.name}.`,
        `Choose a completed day to reuse, copy one and change it, or make ${weekday.name} completely different.`,
      ],
      "day-choice"
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
    const nextDays = [...days];
    const existingDay = nextDays[editedDayIndex] || {};
    nextDays[editedDayIndex] = {
      ...existingDay,
      key: editedWeekday.key,
      name: editedWeekday.name,
      weekdayIndex: editedWeekday.weekdayIndex,
      basisDayKey: currentBasisDayKey || null,
      items: nextItems,
    };
    setDays(nextDays);

    appendUser(`Done editing ${editedWeekday.name}`);
    setEditReturnContext(null);
    resetAddExpenseDraft();
    setEditItems([]);
    setCurrentBasisDayKey("");
    resetInlineItemEditing();
    setError("");

    if (context.invalidatedDayIndexes?.length) {
      const nextMissingIndex = findNextMissingDayIndex(nextDays, 0);
      if (nextMissingIndex >= 0) {
        const nextWeekday = CLARA_MONEY_ROUTINE_WEEKDAYS[nextMissingIndex];
        setDayIndex(nextMissingIndex);
        runAssistantSequence(
          [
            `${editedWeekday.name} updated.`,
            `${joinDayNames(context.invalidatedDayNames)} ${context.invalidatedDayNames.length === 1 ? "was" : "were"} deleted because ${context.invalidatedDayNames.length === 1 ? "it was" : "they were"} based on the old ${editedWeekday.name} setup.`,
            `Let’s recreate ${nextWeekday.name} now.`,
          ],
          "day-choice"
        );
        return true;
      }
    }

    setDayIndex(returnDayIndex);
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
    if (addItemOpen) {
      setError("Add this item or cancel the add section before finishing the day.");
      return;
    }
    const finalItems = materializeInlineEdit(editItems);
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
    if (busy || !interactionReady || reviewEditingDayKey) return;
    if (findNextMissingDayIndex(days, 0) >= 0) {
      setError("Recreate every cleared day before saving your routine.");
      return;
    }

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

  const completeSetupWithRoutine = () => {
    if (typeof onSetupResult === "function") {
      cancelConversationPacing();
      onSetupResult({ status: "complete", outcome: "configured" });
      return;
    }
    closeChat();
  };

  const confirmNoRoutine = () => {
    if (!interactionReady || typeof onSetupResult !== "function") return;
    appendUser("I don’t have routine spending");
    cancelConversationPacing();
    onSetupResult({ status: "complete", outcome: "none_confirmed" });
  };

  const weeklyTotal = days.reduce((sum, day) => sum + totalItems(day?.items), 0);
  const routineComplete = findNextMissingDayIndex(days, 0) < 0;

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="money-schedule"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-money-schedule-chat="true"
      data-clara-money-routine-flow="true"
      data-clara-conversation-pacing="masterclass"
      data-clara-conversation-reveal-owner="semantic"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <ClaraChatHeader
        title="Money Schedule"
        tagline="Daily routine · Monday to Sunday"
        onClose={closeChat}
      />

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={stackRef} data-clara-ai-message-stack="true" className="flex min-h-full flex-col gap-3">
          {messages.map((entry) => (
            <Bubble key={entry.id} role={entry.role}>{entry.text}</Bubble>
          ))}

          {pendingMessage ? <Bubble role="assistant" typing>{typedText}</Bubble> : null}

          {phase === "welcome" && controlsReady ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <ChoiceButton onClick={startSetup}>Yes, let’s set it up</ChoiceButton>
              {typeof onSetupResult === "function" ? (
                <ChoiceButton onClick={confirmNoRoutine} secondary>I don’t have routine spending</ChoiceButton>
              ) : null}
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

          {phase === "saved-day-picker" && controlsReady ? (
            <div className="mt-1 grid gap-2.5" data-clara-money-routine-saved-day-picker="true">
              {days.filter(Boolean).map((day) => (
                <ChoiceButton
                  key={day.key}
                  onClick={() => choosePreviousDayToEdit(day, "weekly-review")}
                >
                  Edit {day.name}
                </ChoiceButton>
              ))}
              <ChoiceButton onClick={cancelSavedDayPicker} secondary>
                Back
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "basis-edit-warning" && controlsReady && pendingBasisEdit ? (
            <div className="mt-1 grid gap-2.5" data-clara-money-routine-basis-warning="true">
              <ChoiceButton onClick={continueBasisDayEdit}>
                Continue editing {pendingBasisEdit.sourceDay.name}
              </ChoiceButton>
              <ChoiceButton onClick={cancelBasisDayEdit} secondary>
                Cancel
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "day-edit" && controlsReady ? (
            <>
              <ExpenseList
                items={editItems}
                itemEditMode={itemEditMode}
                editingItemId={inlineEditingItemId}
                editingField={inlineEditingField}
                inlineLabelInput={inlineLabelInput}
                inlineAmountInput={inlineAmountInput}
                onStartLabelEdit={startInlineLabelEdit}
                onStartAmountEdit={startInlineAmountEdit}
                onInlineLabelChange={changeInlineLabelInput}
                onInlineAmountChange={changeInlineAmountInput}
                onCommitLabelEdit={commitInlineLabelEdit}
                onCommitAmountEdit={commitInlineAmountEdit}
                onCancelInlineEdit={cancelInlineEdit}
              />

              {addItemOpen ? (
                <form
                  data-clara-money-routine-inline-add="true"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitAddedExpense();
                  }}
                  className="rounded-[18px] border border-white/10 bg-[#030711]/96 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
                    <label className="min-w-0">
                      <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/36">
                        Item
                      </span>
                      <input
                        autoFocus
                        value={draftText}
                        onChange={(event) => {
                          setDraftText(event.target.value);
                          if (error) setError("");
                        }}
                        placeholder="Transportation"
                        className="h-10 w-full rounded-[12px] border border-white/10 bg-black/25 px-3 text-[12px] font-bold text-white outline-none placeholder:text-white/28 focus:border-cyan-200/24"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/36">
                        Amount
                      </span>
                      <div className="flex h-10 items-center rounded-[12px] border border-white/10 bg-black/25 px-2.5 focus-within:border-cyan-200/24">
                        <span className="mr-1 text-[11px] font-black text-[#8ffff8]/72">₱</span>
                        <input
                          value={addAmountInput}
                          onChange={(event) => {
                            setAddAmountInput(sanitizeMoneyInput(event.target.value));
                            if (error) setError("");
                          }}
                          inputMode="decimal"
                          placeholder="0"
                          className="min-w-0 flex-1 bg-transparent text-right text-[12px] font-black text-white outline-none placeholder:text-white/28"
                        />
                      </div>
                    </label>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={cancelAddExpense}
                      className="min-h-10 rounded-[13px] border border-white/10 bg-white/[0.03] px-3 text-[10.5px] font-black text-white/64 active:scale-[0.985]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!cleanText(draftText) || parseAmountToCentavos(addAmountInput) <= 0}
                      className="min-h-10 rounded-[13px] bg-[#1769ff] px-3 text-[10.5px] font-black text-white active:scale-[0.985] disabled:opacity-35"
                    >
                      Add item
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5" data-clara-money-routine-day-controls="true">
                <button
                  type="button"
                  onClick={startAddExpense}
                  disabled={addItemOpen}
                  aria-pressed={addItemOpen}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.985] disabled:opacity-45 ${
                    addItemOpen
                      ? "border-cyan-200/24 bg-cyan-200/[0.07] text-cyan-50"
                      : "border-blue-300/18 bg-white/[0.04] text-white/88"
                  }`}
                >
                  <PlusCircle className="h-4 w-4" /> Add
                </button>
                <button
                  type="button"
                  onClick={startRemoveExpense}
                  disabled={!editItems.length || addItemOpen}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-blue-300/18 bg-white/[0.04] px-3 text-[12px] font-black text-white/88 active:scale-[0.985] disabled:opacity-35"
                >
                  <MinusCircle className="h-4 w-4" /> Remove
                </button>
                <button
                  type="button"
                  onClick={toggleItemEditMode}
                  disabled={!editItems.length || addItemOpen}
                  aria-pressed={itemEditMode}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-[18px] border px-3 text-[12px] font-black active:scale-[0.985] disabled:opacity-35 ${
                    itemEditMode
                      ? "border-cyan-200/28 bg-cyan-200/[0.09] text-cyan-50"
                      : "border-blue-300/18 bg-white/[0.04] text-white/88"
                  }`}
                >
                  <PencilLine className="h-4 w-4" />
                  {itemEditMode ? "Done editing items" : "Edit item"}
                </button>
                <ChoiceButton onClick={finishEditedDay} disabled={addItemOpen}>
                  {editReturnContext ? "Done editing" : "Done"}
                </ChoiceButton>
              </div>
            </>
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
              <section
                className="mt-1 rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5"
                data-clara-money-routine-weekly-review="true"
              >
                {pendingReviewBasisEdit ? (
                  <div
                    className="mb-3 rounded-[16px] border border-amber-200/18 bg-amber-300/[0.055] p-3"
                    data-clara-money-routine-review-basis-warning="true"
                  >
                    <p className="text-[11.5px] font-black leading-5 text-amber-50/92">
                      {pendingReviewBasisEdit.sourceDayName} is the basis for {joinDayNames(pendingReviewBasisEdit.dependentNames)}.
                    </p>
                    <p className="mt-1 text-[10.5px] font-semibold leading-4 text-white/52">
                      Continuing will delete {pendingReviewBasisEdit.dependentNames.length === 1 ? "that copied day" : "those copied days"}. You’ll need to recreate {pendingReviewBasisEdit.dependentNames.length === 1 ? "it" : "them"} before saving.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={continueReviewBasisEdit}
                        className="min-h-10 rounded-[13px] bg-amber-200/14 px-3 text-[10.5px] font-black text-amber-50 active:scale-[0.985]"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={cancelReviewBasisEdit}
                        className="min-h-10 rounded-[13px] border border-white/10 bg-white/[0.035] px-3 text-[10.5px] font-black text-white/72 active:scale-[0.985]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {reviewInvalidationNotice ? (
                  <div className="mb-3 rounded-[16px] border border-cyan-200/14 bg-cyan-200/[0.04] px-3 py-2.5">
                    <p className="text-[10.5px] font-bold leading-4 text-white/58">
                      {joinDayNames(reviewInvalidationNotice.dependentNames)} {reviewInvalidationNotice.dependentNames.length === 1 ? "was" : "were"} cleared because {reviewInvalidationNotice.dependentNames.length === 1 ? "it was" : "they were"} based on {reviewInvalidationNotice.sourceDayName}. Recreate {reviewInvalidationNotice.dependentNames.length === 1 ? "that day" : "those days"} below before saving.
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-2.5">
                  {CLARA_MONEY_ROUTINE_WEEKDAYS.map((weekday, index) => {
                    const day = days[index];
                    if (!day) {
                      return (
                        <div
                          key={weekday.key}
                          className="rounded-[18px] border border-dashed border-amber-200/18 bg-amber-300/[0.03] px-3.5 py-3"
                          data-clara-money-routine-review-missing-day={weekday.key}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-black text-white/82">{weekday.name}</span>
                            <span className="text-[9.5px] font-black uppercase tracking-[0.1em] text-amber-100/62">
                              Needs recreation
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => recreateMissingDayFromReview(index)}
                            className="mt-2 min-h-9 w-full rounded-[12px] border border-amber-100/14 bg-amber-200/[0.06] px-3 text-[10.5px] font-black text-amber-50/88 active:scale-[0.99]"
                          >
                            Recreate {weekday.name}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <WeeklyReviewDayCard
                        key={day.key}
                        day={day}
                        editingDayKey={reviewEditingDayKey}
                        editingItemId={inlineEditingItemId}
                        editingField={inlineEditingField}
                        inlineLabelInput={inlineLabelInput}
                        inlineAmountInput={inlineAmountInput}
                        onRequestEdit={requestReviewInlineEdit}
                        onLabelChange={changeInlineLabelInput}
                        onAmountChange={changeInlineAmountInput}
                        onCommitLabel={commitReviewLabelEdit}
                        onCommitAmount={commitReviewAmountEdit}
                        onCancelEdit={resetReviewInlineEditing}
                      />
                    );
                  })}
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
                <ChoiceButton
                  onClick={saveRoutine}
                  disabled={busy || !routineComplete || Boolean(reviewEditingDayKey)}
                >
                  {busy
                    ? "Saving..."
                    : !routineComplete
                      ? "Recreate missing days first"
                      : "Save my routine"}
                </ChoiceButton>
                <ChoiceButton onClick={resetFlow} disabled={busy} secondary>
                  {savedRoutine ? "Discard changes" : "Start over"}
                </ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "saved" && controlsReady ? (
            <>
              <section
                className="mt-1 rounded-[22px] border border-emerald-300/16 bg-emerald-300/[0.045] p-4"
                data-clara-money-routine-current-schedule="true"
              >
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-[#8ffff8]" />
                  <p className="mt-2 text-[13px] font-black text-white">Current Money Schedule</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-white/48">
                    Normal weekly routine · {formatMoneyCentavos(savedRoutine?.weeklyTotalCentavos || weeklyTotal)}
                  </p>
                </div>
                <div className="mt-3 grid gap-1.5 border-t border-white/8 pt-3">
                  {days.filter(Boolean).map((day) => (
                    <div
                      key={day.key}
                      className="flex items-center justify-between gap-3 rounded-[12px] bg-white/[0.025] px-3 py-2"
                    >
                      <span className="text-[11.5px] font-black text-white/72">{day.name}</span>
                      <span className="text-[11.5px] font-black text-[#8ffff8]/78">
                        {formatMoneyCentavos(totalItems(day.items))}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <div className="grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={openSavedDayPicker}>Edit a day</ChoiceButton>
                <ChoiceButton onClick={completeSetupWithRoutine} secondary>Done</ChoiceButton>
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
