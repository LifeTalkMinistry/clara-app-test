import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  deleteDebtObligation,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligations,
  getDebtObligationMode,
  getDebtTitle,
  getMonthlyDebtPayment,
  summarizeDebtObligations,
  toDebtNumber,
  upsertDebtObligation,
} from "@/lib/debtObligationStore";
import { payDebtObligationFromWallet } from "@/lib/debtPaymentRepository";
import { getWalletOptions } from "@/lib/clara-buy-check-budget-intelligence";
import { DEBT_TYPES } from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const cleanMoney = (value = "") => String(value || "").replace(/[^0-9.]/g, "");

const OBLIGATION_COPY = Object.freeze({
  home: "What would you like to do with your bills and commitments?",
  name: "What bill or financial commitment should CLARA keep track of?",
  type: "Which category best describes this commitment?",
  mode: "Is this a regular recurring payment, or a balance you’re paying off?",
});

function fmt(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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

function chatMessage(role, text) {
  return {
    id: `debt-obligation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function Bubble({ role = "assistant", children, typing = false, elementRef = null }) {
  const assistant = role === "assistant";
  return (
    <div
      ref={elementRef}
      data-clara-conversation-role={role}
      className={`flex ${assistant ? "justify-start" : "justify-end"}`}
    >
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

function ChoiceButton({ children, onClick, disabled = false, secondary = false, danger = false }) {
  const tone = danger
    ? "border-rose-300/22 bg-rose-500/[0.09] text-rose-100 shadow-[0_12px_30px_rgba(120,20,45,0.16)]"
    : secondary
      ? "border-white/10 bg-white/[0.035] text-white/88"
      : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,0.96),rgba(13,79,198,0.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,0.22)]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative z-20 min-h-12 w-full touch-manipulation rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${tone}`}
    >
      {children}
    </button>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text", disabled = false }) {
  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="relative z-20 flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
    >
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        disabled={disabled}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/62 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !clean(value)}
        className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-full bg-[#1769ff] text-white shadow-[0_8px_22px_rgba(23,105,255,0.34)] transition active:scale-95 disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

const freshDraft = () => ({
  id: "",
  title: "",
  debtType: "installment",
  obligationMode: "balance",
  totalDebt: "",
  monthlyDebt: "",
  interestRate: "",
  dueDay: "",
});

function draftFromRecord(record = {}) {
  return {
    id: record.id || "",
    title: getDebtTitle(record),
    debtType: record.debtType || record.type || "installment",
    obligationMode: getDebtObligationMode(record),
    totalDebt: String(getDebtBalance(record) || ""),
    monthlyDebt: String(getMonthlyDebtPayment(record) || ""),
    interestRate: String(getDebtInterestRate(record) || ""),
    dueDay: String(getDebtDueDay(record) || ""),
  };
}

function summaryText(record = {}) {
  const mode = getDebtObligationMode(record);
  const parts = [getDebtTitle(record)];
  if (mode === "balance") parts.push(`${fmt(getDebtBalance(record))} remaining`);
  parts.push(`${fmt(getMonthlyDebtPayment(record))}/month`);
  const dueDay = getDebtDueDay(record);
  if (dueDay) parts.push(`due day ${dueDay}`);
  return parts.join(" • ");
}

function suggestedPayment(record = {}) {
  const mode = getDebtObligationMode(record);
  const monthly = Math.max(getMonthlyDebtPayment(record), 0);
  if (mode !== "balance") return monthly;
  const balance = Math.max(getDebtBalance(record), 0);
  if (balance <= 0) return 0;
  return Math.min(monthly > 0 ? monthly : balance, balance);
}

export default function ClaraDebtObligationOverlay({
  isActive = false,
  claraAssistantContext = {},
  onSetupResult,
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const localUserId = useMemo(
    () => getEffectiveDemoFinanceLocalUserId(String(user?.id || user?.email || "local-user")),
    [user?.id, user?.email]
  );

  const [phase, setPhase] = useState("opening");
  const [records, setRecords] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [interactionReady, setInteractionReady] = useState(false);
  const [draft, setDraft] = useState(freshDraft);
  const [input, setInput] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentWalletId, setPaymentWalletId] = useState("");
  const [paymentOrigin, setPaymentOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const viewportRef = useRef(null);
  const latestAssistantRef = useRef(null);
  const actionRef = useRef(null);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("home");
  const sequenceTokenRef = useRef(0);
  const previousActiveRef = useRef(false);

  const selectedRecord = useMemo(
    () => records.find((record) => String(record.id) === String(selectedId)) || null,
    [records, selectedId]
  );

  const paymentWalletOptions = useMemo(
    () => (paymentAmount > 0 ? getWalletOptions(claraAssistantContext, paymentAmount) : []),
    [claraAssistantContext, paymentAmount]
  );

  const selectedPaymentWallet = useMemo(
    () => paymentWalletOptions.find((wallet) => String(wallet.id) === String(paymentWalletId)) || null,
    [paymentWalletOptions, paymentWalletId]
  );

  const pressure = useMemo(
    () => summarizeDebtObligations(records, { income: Number(claraAssistantContext?.totalIncome) || 0 }),
    [records, claraAssistantContext?.totalIncome]
  );

  const pressureText = records.length
    ? `You have ${pressure.activeCount} active commitment${pressure.activeCount === 1 ? "" : "s"}. Total remaining balance: ${fmt(pressure.totalDebt)}. Monthly commitments: ${fmt(pressure.monthlyDebt)}. Current monthly commitment load: ${pressure.debtRatio.toFixed(0)}% (${pressure.riskLevel}).`
    : "You currently have no active bills, obligations, or debts recorded.";

  const append = (...nextMessages) => {
    setMessages((current) => [...current, ...nextMessages]);
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
    const replies = replyTexts.map((text) => clean(text)).filter(Boolean);
    const token = sequenceTokenRef.current;
    sequenceRef.current = replies;
    sequencePhaseRef.current = nextPhase;
    setPhase("responding");
    setInteractionReady(false);
    queueNextAssistantMessage(token, options.skipInitialDelay === true);
  };

  const reload = async (expectedToken = null) => {
    const next = await getDebtObligations(localUserId);
    if (expectedToken !== null && expectedToken !== sequenceTokenRef.current) return null;
    const normalized = Array.isArray(next) ? next : [];
    setRecords(normalized);
    return normalized;
  };

  const resetPaymentFields = () => {
    setPaymentAmount(0);
    setPaymentWalletId("");
    setPaymentOrigin("");
  };

  const resetDraft = () => {
    setDraft(freshDraft());
    setInput("");
    setSelectedId("");
    resetPaymentFields();
    setBusy(false);
    setError("");
  };

  const startOpeningConversation = async () => {
    cancelConversationPacing();
    const openingToken = sequenceTokenRef.current;
    resetDraft();
    setRecords([]);
    setMessages([]);
    setPhase("loading");
    try {
      const loaded = await reload(openingToken);
      if (loaded === null || openingToken !== sequenceTokenRef.current) return;
      runAssistantSequence(
        [`Hi ${firstName}! 👋`, "Let’s keep track of the bills and financial commitments you need to protect.", OBLIGATION_COPY.home],
        "home"
      );
    } catch (nextError) {
      if (openingToken !== sequenceTokenRef.current) return;
      const message = clean(nextError?.message || "I couldn’t load your obligations right now.");
      setError(message);
      runAssistantSequence([message], "home");
    }
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
    if (isActive && !previousActiveRef.current) void startOpeningConversation();
    if (!isActive && previousActiveRef.current) {
      cancelConversationPacing();
      resetDraft();
      setRecords([]);
      setMessages([]);
      setPhase("opening");
    }
    previousActiveRef.current = isActive;
  }, [isActive, localUserId, firstName]);

  useEffect(() => () => {
    sequenceTokenRef.current += 1;
    clearPacingTimers();
  }, []);

  const controlsReady = interactionReady && !pendingMessage && phase !== "responding" && !busy;
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((entry) => entry?.role === "assistant") || null,
    [messages]
  );
  const revealKey = controlsReady && latestAssistantMessage
    ? `${sequenceTokenRef.current}:${phase}:${latestAssistantMessage.id}`
    : null;

  useClaraConversationReveal({
    viewportRef,
    assistantRef: latestAssistantRef,
    actionRef,
    revealKey,
    enabled: isActive && controlsReady && Boolean(latestAssistantMessage),
    requireAction: true,
  });

  if (!isActive) return null;

  const closeChat = () => {
    cancelConversationPacing();
    resetDraft();
    setRecords([]);
    setMessages([]);
    setPhase("opening");
    onClose?.();
  };

  const completeSetupStep = (outcome) => {
    if (typeof onSetupResult !== "function") {
      closeChat();
      return;
    }
    cancelConversationPacing();
    onSetupResult({ status: "complete", outcome });
  };

  const goHome = (userLabel = "Back") => {
    resetDraft();
    append(chatMessage("user", userLabel));
    runAssistantSequence([OBLIGATION_COPY.home], "home");
  };

  const beginAdd = () => {
    resetDraft();
    append(chatMessage("user", "Add an obligation"));
    runAssistantSequence([OBLIGATION_COPY.name], "name");
  };

  const openView = () => {
    append(chatMessage("user", "View obligations"));
    runAssistantSequence(
      [records.length ? "Here are the active commitments I have recorded for you." : "You do not have any active bills or commitments recorded yet."],
      "view"
    );
  };

  const openManage = () => {
    if (!records.length) return;
    append(chatMessage("user", "Edit or delete an obligation"));
    runAssistantSequence(["Choose the bill or commitment you want to manage."], "manage");
  };

  const openPressure = () => {
    append(chatMessage("user", "Review commitment load"));
    runAssistantSequence([pressureText], "pressure");
  };

  const openPay = () => {
    if (!records.length) return;
    resetDraft();
    append(chatMessage("user", "Pay an obligation"));
    setPaymentOrigin("pay-select");
    runAssistantSequence(["Choose the bill or commitment you want to pay."], "pay-select");
  };

  const selectManagedRecord = (record) => {
    setSelectedId(String(record.id));
    append(chatMessage("user", getDebtTitle(record)));
    runAssistantSequence([`What would you like to do with ${getDebtTitle(record)}?`], "manage-action");
  };

  const beginPayment = (record, origin = "pay-select") => {
    if (!record?.id || !controlsReady) return;
    const suggested = suggestedPayment(record);
    setSelectedId(String(record.id));
    setPaymentAmount(0);
    setPaymentWalletId("");
    setPaymentOrigin(origin);
    setInput(suggested > 0 ? String(suggested) : "");
    setError("");
    append(chatMessage("user", origin === "manage-action" ? "Make a payment" : getDebtTitle(record)));
    runAssistantSequence(
      [
        suggested > 0
          ? `How much are you paying toward ${getDebtTitle(record)}? I prefilled the usual payment of ${fmt(suggested)}.`
          : `How much are you paying toward ${getDebtTitle(record)}?`,
      ],
      "pay-amount"
    );
  };

  const submitPaymentAmount = () => {
    if (!controlsReady || !selectedRecord) return;
    const value = toDebtNumber(input);
    if (value <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (getDebtObligationMode(selectedRecord) === "balance") {
      const balance = getDebtBalance(selectedRecord);
      if (value > balance) {
        setError(`Payment cannot exceed the remaining balance of ${fmt(balance)}.`);
        return;
      }
    }
    setPaymentAmount(value);
    setPaymentWalletId("");
    setInput("");
    setError("");
    append(chatMessage("user", fmt(value)));
    runAssistantSequence(["Which wallet are you paying from?"], "pay-wallet");
  };

  const choosePaymentWallet = (wallet) => {
    if (!controlsReady || !selectedRecord || !wallet?.id || !wallet?.enough) return;
    setPaymentWalletId(String(wallet.id));
    setError("");
    append(chatMessage("user", wallet.name));
    const mode = getDebtObligationMode(selectedRecord);
    const remaining = mode === "balance"
      ? Math.max(getDebtBalance(selectedRecord) - paymentAmount, 0)
      : null;
    runAssistantSequence(
      [
        mode === "balance"
          ? `Confirm ${fmt(paymentAmount)} to ${getDebtTitle(selectedRecord)} from ${wallet.name}? Remaining balance will be ${fmt(remaining)}.`
          : `Confirm ${fmt(paymentAmount)} to ${getDebtTitle(selectedRecord)} from ${wallet.name}?`,
      ],
      "pay-confirm"
    );
  };

  const confirmPayment = async () => {
    if (!controlsReady || !selectedRecord?.id || !selectedPaymentWallet || paymentAmount <= 0) return;
    const title = getDebtTitle(selectedRecord);
    const walletName = selectedPaymentWallet.name;
    cancelConversationPacing();
    const operationToken = sequenceTokenRef.current;
    setBusy(true);
    setError("");
    setPhase("paying");
    append(chatMessage("user", "Confirm payment"));
    try {
      const result = await payDebtObligationFromWallet(localUserId, selectedRecord.id, {
        amount: paymentAmount,
        walletId: selectedPaymentWallet.id,
        maxSpendable: selectedPaymentWallet.balance,
      });
      if (operationToken !== sequenceTokenRef.current) return;
      const loaded = await reload(operationToken);
      if (loaded === null || operationToken !== sequenceTokenRef.current) return;
      setBusy(false);
      setInput("");
      setSelectedId("");
      resetPaymentFields();
      const reply = result.completed
        ? `${fmt(result.amount)} was paid from ${walletName}. ${title} is now fully paid.`
        : result.mode === "balance"
          ? `${fmt(result.amount)} was paid from ${walletName}. ${fmt(result.balance)} remains on ${title}.`
          : `${fmt(result.amount)} was paid from ${walletName}. The payment is recorded for ${title}.`;
      runAssistantSequence([reply, "What would you like to do next?"], "home", { skipInitialDelay: true });
    } catch (nextError) {
      if (operationToken !== sequenceTokenRef.current) return;
      const message = clean(nextError?.message || "Unable to record this payment.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "pay-confirm", { skipInitialDelay: true });
    }
  };

  const backFromPaymentAmount = () => {
    setInput("");
    setPaymentAmount(0);
    setPaymentWalletId("");
    setError("");
    append(chatMessage("user", "Back"));
    if (paymentOrigin === "manage-action" && selectedRecord) {
      runAssistantSequence([`What would you like to do with ${getDebtTitle(selectedRecord)}?`], "manage-action");
      return;
    }
    setSelectedId("");
    setPaymentOrigin("pay-select");
    runAssistantSequence(["Choose the bill or commitment you want to pay."], "pay-select");
  };

  const beginEdit = (record) => {
    const nextDraft = draftFromRecord(record);
    setDraft(nextDraft);
    setInput(nextDraft.title);
    setError("");
    append(chatMessage("user", "Edit this obligation"));
    runAssistantSequence([`Let’s update ${nextDraft.title}. What should CLARA call this commitment?`], "name");
  };

  const submitName = () => {
    if (!controlsReady) return;
    const title = clean(input);
    if (!title) return;
    setDraft((current) => ({ ...current, title }));
    setInput("");
    setError("");
    append(chatMessage("user", title));
    runAssistantSequence([OBLIGATION_COPY.type], "type");
  };

  const chooseType = (value) => {
    if (!controlsReady) return;
    const label = DEBT_TYPES.find((item) => item.value === value)?.label || "Other";
    setDraft((current) => ({ ...current, debtType: value }));
    append(chatMessage("user", label));
    runAssistantSequence([OBLIGATION_COPY.mode], "mode");
  };

  const chooseMode = (mode) => {
    if (!controlsReady) return;
    setDraft((current) => ({ ...current, obligationMode: mode }));
    setInput(mode === "balance" ? draft.totalDebt || "" : draft.monthlyDebt || "");
    append(chatMessage("user", mode === "balance" ? "Balance I’m paying off" : "Regular recurring payment"));
    runAssistantSequence(
      [mode === "balance" ? "How much is the remaining balance?" : "About how much should CLARA plan for this each month?"],
      mode === "balance" ? "balance" : "monthly"
    );
  };

  const submitBalance = () => {
    if (!controlsReady) return;
    const value = toDebtNumber(input);
    if (value <= 0) {
      setError("Enter a remaining balance greater than zero.");
      return;
    }
    setDraft((current) => ({ ...current, totalDebt: String(value) }));
    setInput(draft.monthlyDebt || "");
    setError("");
    append(chatMessage("user", fmt(value)));
    runAssistantSequence(["How much do you usually pay toward it each month?"], "monthly");
  };

  const submitMonthly = () => {
    if (!controlsReady) return;
    const value = toDebtNumber(input);
    if (value <= 0) {
      setError("Enter a monthly amount greater than zero.");
      return;
    }
    setDraft((current) => ({ ...current, monthlyDebt: String(value) }));
    setError("");
    append(chatMessage("user", fmt(value)));
    if (draft.obligationMode === "balance") {
      setInput(draft.interestRate || "");
      runAssistantSequence(["What is the annual interest rate? Enter 0 if there is none."], "interest");
    } else {
      setInput(draft.dueDay || "");
      runAssistantSequence(["What day of the month is this usually due? You can skip this."], "due");
    }
  };

  const submitInterest = () => {
    if (!controlsReady) return;
    const value = Math.max(0, toDebtNumber(input));
    setDraft((current) => ({ ...current, interestRate: String(value) }));
    setInput(draft.dueDay || "");
    setError("");
    append(chatMessage("user", `${value}%`));
    runAssistantSequence(["What day of the month is this usually due? You can skip this."], "due");
  };

  const finishDue = (skip = false) => {
    if (!controlsReady) return;
    let dueDay = null;
    if (!skip && clean(input)) {
      const parsed = Number(input);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
        setError("Due day must be from 1 to 31.");
        return;
      }
      dueDay = parsed;
    }
    setDraft((current) => ({ ...current, dueDay: dueDay ? String(dueDay) : "" }));
    setInput("");
    setError("");
    append(chatMessage("user", dueDay ? `Day ${dueDay}` : "Skip due day"));
    runAssistantSequence(["Review this commitment before I save it."], "review");
  };

  const save = async () => {
    if (!controlsReady) return;
    const payload = {
      id: draft.id || undefined,
      title: draft.title,
      debtType: draft.debtType,
      obligationMode: draft.obligationMode,
      totalDebt: draft.obligationMode === "recurring" ? 0 : toDebtNumber(draft.totalDebt),
      monthlyDebt: toDebtNumber(draft.monthlyDebt),
      interestRate: draft.obligationMode === "recurring" ? 0 : toDebtNumber(draft.interestRate),
      dueDay: draft.dueDay ? Number(draft.dueDay) : null,
      dueDate: "",
      status: "active",
    };

    cancelConversationPacing();
    const operationToken = sequenceTokenRef.current;
    setBusy(true);
    setError("");
    setPhase("saving");
    append(chatMessage("user", "Save obligation"));
    try {
      await upsertDebtObligation(localUserId, payload);
      if (operationToken !== sequenceTokenRef.current) return;
      const loaded = await reload(operationToken);
      if (loaded === null || operationToken !== sequenceTokenRef.current) return;
      setBusy(false);
      setDraft(freshDraft());
      setInput("");
      setSelectedId("");
      runAssistantSequence([`${payload.title} is saved. What would you like to do next?`], "home", { skipInitialDelay: true });
    } catch (nextError) {
      if (operationToken !== sequenceTokenRef.current) return;
      const message = clean(nextError?.message || "Unable to save this obligation.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "review", { skipInitialDelay: true });
    }
  };

  const askDelete = () => {
    if (!selectedRecord || !controlsReady) return;
    append(chatMessage("user", "Delete this obligation"));
    runAssistantSequence(
      [`Delete ${getDebtTitle(selectedRecord)}? This removes it from your active Debt / Obligations records.`],
      "delete-confirm"
    );
  };

  const remove = async () => {
    if (!selectedRecord?.id || !controlsReady) return;
    const title = getDebtTitle(selectedRecord);
    cancelConversationPacing();
    const operationToken = sequenceTokenRef.current;
    setBusy(true);
    setError("");
    setPhase("deleting");
    append(chatMessage("user", "Yes, delete it"));
    try {
      await deleteDebtObligation(localUserId, selectedRecord.id);
      if (operationToken !== sequenceTokenRef.current) return;
      const loaded = await reload(operationToken);
      if (loaded === null || operationToken !== sequenceTokenRef.current) return;
      setBusy(false);
      setSelectedId("");
      runAssistantSequence([`${title} was removed. What would you like to do next?`], "home", { skipInitialDelay: true });
    } catch (nextError) {
      if (operationToken !== sequenceTokenRef.current) return;
      const message = clean(nextError?.message || "Unable to delete this obligation.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "manage-action", { skipInitialDelay: true });
    }
  };

  const backFromName = () => {
    if (draft.id && selectedRecord) {
      setInput("");
      append(chatMessage("user", "Back"));
      runAssistantSequence([`What would you like to do with ${getDebtTitle(selectedRecord)}?`], "manage-action");
      return;
    }
    goHome();
  };

  return (
    <div
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="debt-obligation"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-debt-obligation-chat="true"
      data-clara-debt-payment-flow="true"
      data-clara-conversation-pacing="masterclass"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <ClaraChatHeader
        title="Debt / Obligations"
        tagline="Bills · Commitments · Debt · Stay accountable"
        onClose={closeChat}
      />

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-h-full flex-col gap-3" data-clara-ai-message-stack="true">
          {messages.map((entry) => (
            <Bubble
              key={entry.id}
              role={entry.role}
              elementRef={entry.id === latestAssistantMessage?.id ? latestAssistantRef : null}
            >
              {entry.text}
            </Bubble>
          ))}
          {pendingMessage ? <Bubble role="assistant" typing>{typedText}</Bubble> : null}

          <div ref={actionRef} data-clara-conversation-action-region="true" className="contents">
            {phase === "home" && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2.5">
                <ChoiceButton onClick={beginAdd}>Add an obligation</ChoiceButton>
                <ChoiceButton onClick={openPay} disabled={!records.length}>Pay an obligation</ChoiceButton>
                <ChoiceButton onClick={openView}>View obligations</ChoiceButton>
                <ChoiceButton onClick={openManage} disabled={!records.length}>Edit or delete an obligation</ChoiceButton>
                <ChoiceButton onClick={openPressure}>Review commitment load</ChoiceButton>
                {typeof onSetupResult === "function" ? (
                  records.length ? (
                    <ChoiceButton onClick={() => completeSetupStep("configured")} secondary>Continue setup</ChoiceButton>
                  ) : (
                    <ChoiceButton onClick={() => completeSetupStep("none_confirmed")} secondary>I have no bills, obligations, or debts</ChoiceButton>
                  )
                ) : (
                  <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
                )}
              </div>
            ) : null}

            {phase === "view" && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                {records.map((record) => (
                  <article key={record.id} className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                    <p className="text-[12.5px] font-black leading-5 text-white/92">{getDebtTitle(record)}</p>
                    <p className="mt-1 text-[10.5px] font-semibold leading-5 text-white/48">{summaryText(record)}</p>
                  </article>
                ))}
                <ChoiceButton secondary onClick={() => goHome("Back")}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "pay-select" && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                {records.map((record) => (
                  <ChoiceButton key={record.id} onClick={() => beginPayment(record, "pay-select")}>
                    <span className="block text-left">{getDebtTitle(record)}</span>
                    <span className="mt-1 block text-left text-[10px] font-semibold text-white/55">{summaryText(record)}</span>
                  </ChoiceButton>
                ))}
                <ChoiceButton secondary onClick={() => goHome("Back")}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "pay-amount" && selectedRecord && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer
                  value={input}
                  onChange={(value) => { setInput(cleanMoney(value)); setError(""); }}
                  onSubmit={submitPaymentAmount}
                  placeholder="Payment amount"
                  inputMode="decimal"
                />
                <ChoiceButton secondary onClick={backFromPaymentAmount}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "pay-wallet" && selectedRecord && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2.5">
                {paymentWalletOptions.length ? paymentWalletOptions.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    disabled={!wallet.enough}
                    onClick={() => choosePaymentWallet(wallet)}
                    className="relative z-20 flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-[18px] border border-blue-200/12 bg-[#07142b]/88 px-4 py-3 text-left transition active:scale-[0.985] disabled:opacity-40"
                  >
                    <span>
                      <span className="block text-[13px] font-black text-white">{wallet.name}</span>
                      <span className="mt-0.5 block text-[10.5px] font-semibold text-slate-300/62">
                        {wallet.enough ? "Available to pay" : "Not enough spendable balance"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">{fmt(wallet.balance)}</span>
                  </button>
                )) : (
                  <Bubble role="assistant">There isn’t any spendable wallet money available for this payment. Protected money stays protected.</Bubble>
                )}
                <ChoiceButton secondary onClick={() => {
                  setPaymentWalletId("");
                  setInput(String(paymentAmount || suggestedPayment(selectedRecord) || ""));
                  append(chatMessage("user", "Back"));
                  runAssistantSequence([`How much are you paying toward ${getDebtTitle(selectedRecord)}?`], "pay-amount");
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "pay-confirm" && selectedRecord && selectedPaymentWallet && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                <article className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                  <div className="space-y-2 text-[11.5px] font-semibold leading-5 text-white/82">
                    <div><span className="text-white/42">Obligation:</span> {getDebtTitle(selectedRecord)}</div>
                    <div><span className="text-white/42">Payment:</span> {fmt(paymentAmount)}</div>
                    <div><span className="text-white/42">From:</span> {selectedPaymentWallet.name}</div>
                    {getDebtObligationMode(selectedRecord) === "balance" ? (
                      <div><span className="text-white/42">Remaining:</span> {fmt(Math.max(getDebtBalance(selectedRecord) - paymentAmount, 0))}</div>
                    ) : null}
                  </div>
                </article>
                <div className="grid grid-cols-2 gap-2.5">
                  <ChoiceButton onClick={confirmPayment} disabled={busy}>{busy ? "Paying..." : "Confirm payment"}</ChoiceButton>
                  <ChoiceButton secondary onClick={() => {
                    setPaymentWalletId("");
                    append(chatMessage("user", "Back"));
                    runAssistantSequence(["Which wallet are you paying from?"], "pay-wallet");
                  }}>Back</ChoiceButton>
                </div>
              </div>
            ) : null}

            {phase === "manage" && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                {records.map((record) => (
                  <ChoiceButton key={record.id} onClick={() => selectManagedRecord(record)}>
                    <span className="block text-left">{getDebtTitle(record)}</span>
                    <span className="mt-1 block text-left text-[10px] font-semibold text-white/55">{summaryText(record)}</span>
                  </ChoiceButton>
                ))}
                <ChoiceButton secondary onClick={() => goHome("Back")}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "manage-action" && selectedRecord && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                <article className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                  <p className="text-[12.5px] font-black leading-5 text-white/92">{getDebtTitle(selectedRecord)}</p>
                  <p className="mt-1 text-[10.5px] font-semibold leading-5 text-white/48">{summaryText(selectedRecord)}</p>
                </article>
                <ChoiceButton onClick={() => beginPayment(selectedRecord, "manage-action")}>Make a payment</ChoiceButton>
                <ChoiceButton onClick={() => beginEdit(selectedRecord)}>Edit this obligation</ChoiceButton>
                <ChoiceButton danger onClick={askDelete}>Delete this obligation</ChoiceButton>
                <ChoiceButton secondary onClick={() => {
                  append(chatMessage("user", "Back"));
                  runAssistantSequence(["Choose the bill or commitment you want to manage."], "manage");
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "delete-confirm" && selectedRecord && controlsReady ? (
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <ChoiceButton danger onClick={remove}>Yes, delete it</ChoiceButton>
                <ChoiceButton secondary onClick={() => {
                  append(chatMessage("user", "Cancel"));
                  runAssistantSequence([`What would you like to do with ${getDebtTitle(selectedRecord)}?`], "manage-action");
                }}>Cancel</ChoiceButton>
              </div>
            ) : null}

            {phase === "pressure" && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                <ChoiceButton secondary onClick={() => goHome("Back")}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "name" && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer value={input} onChange={(value) => { setInput(value); setError(""); }} onSubmit={submitName} placeholder="e.g. Electric bill, Rent, Loan" />
                <ChoiceButton secondary onClick={backFromName}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "type" && controlsReady ? (
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                {DEBT_TYPES.map((item) => (
                  <ChoiceButton key={item.value} onClick={() => chooseType(item.value)}>{item.label}</ChoiceButton>
                ))}
                <div className="col-span-2">
                  <ChoiceButton secondary onClick={() => {
                    setInput(draft.title || "");
                    append(chatMessage("user", "Back"));
                    runAssistantSequence([OBLIGATION_COPY.name], "name");
                  }}>Back</ChoiceButton>
                </div>
              </div>
            ) : null}

            {phase === "mode" && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                <ChoiceButton onClick={() => chooseMode("recurring")}>Regular recurring payment</ChoiceButton>
                <ChoiceButton onClick={() => chooseMode("balance")}>Balance I’m paying off</ChoiceButton>
                <ChoiceButton secondary onClick={() => {
                  append(chatMessage("user", "Back"));
                  runAssistantSequence([OBLIGATION_COPY.type], "type");
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "balance" && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer value={input} onChange={(value) => { setInput(cleanMoney(value)); setError(""); }} onSubmit={submitBalance} placeholder="Remaining balance" inputMode="decimal" />
                <ChoiceButton secondary onClick={() => {
                  setInput("");
                  append(chatMessage("user", "Back"));
                  runAssistantSequence([OBLIGATION_COPY.mode], "mode");
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "monthly" && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer value={input} onChange={(value) => { setInput(cleanMoney(value)); setError(""); }} onSubmit={submitMonthly} placeholder={draft.obligationMode === "balance" ? "Monthly payment" : "Expected monthly amount"} inputMode="decimal" />
                <ChoiceButton secondary onClick={() => {
                  append(chatMessage("user", "Back"));
                  if (draft.obligationMode === "balance") {
                    setInput(draft.totalDebt || "");
                    runAssistantSequence(["How much is the remaining balance?"], "balance");
                  } else {
                    setInput("");
                    runAssistantSequence([OBLIGATION_COPY.mode], "mode");
                  }
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "interest" && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer value={input} onChange={(value) => { setInput(cleanMoney(value)); setError(""); }} onSubmit={submitInterest} placeholder="Annual interest %" inputMode="decimal" />
                <ChoiceButton secondary onClick={() => {
                  setInput(draft.monthlyDebt || "");
                  append(chatMessage("user", "Back"));
                  runAssistantSequence(["How much do you usually pay toward it each month?"], "monthly");
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "due" && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer value={input} onChange={(value) => { setInput(String(value).replace(/[^0-9]/g, "").slice(0, 2)); setError(""); }} onSubmit={() => finishDue(false)} placeholder="Due day (1–31)" inputMode="numeric" />
                <ChoiceButton secondary onClick={() => finishDue(true)}>Skip due day</ChoiceButton>
                <ChoiceButton secondary onClick={() => {
                  append(chatMessage("user", "Back"));
                  if (draft.obligationMode === "balance") {
                    setInput(draft.interestRate || "");
                    runAssistantSequence(["What is the annual interest rate? Enter 0 if there is none."], "interest");
                  } else {
                    setInput(draft.monthlyDebt || "");
                    runAssistantSequence(["About how much should CLARA plan for this each month?"], "monthly");
                  }
                }}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "review" && controlsReady ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <article className="rounded-[21px] border border-blue-200/12 bg-[#07142b]/88 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                  <div className="space-y-2 text-[11.5px] font-semibold leading-5 text-white/82">
                    <div><span className="text-white/42">Name:</span> {draft.title}</div>
                    <div><span className="text-white/42">Category:</span> {DEBT_TYPES.find((item) => item.value === draft.debtType)?.label || draft.debtType}</div>
                    <div><span className="text-white/42">Payment type:</span> {draft.obligationMode === "recurring" ? "Regular recurring" : "Balance to pay off"}</div>
                    {draft.obligationMode === "balance" ? <div><span className="text-white/42">Remaining:</span> {fmt(draft.totalDebt)}</div> : null}
                    <div><span className="text-white/42">Monthly:</span> {fmt(draft.monthlyDebt)}</div>
                    {draft.obligationMode === "balance" ? <div><span className="text-white/42">Interest:</span> {toDebtNumber(draft.interestRate)}%</div> : null}
                    <div><span className="text-white/42">Due:</span> {draft.dueDay ? `Day ${draft.dueDay}` : "Not set"}</div>
                  </div>
                </article>
                <div className="grid grid-cols-2 gap-2.5">
                  <ChoiceButton onClick={save}>Save obligation</ChoiceButton>
                  <ChoiceButton secondary onClick={() => {
                    setInput(draft.dueDay || "");
                    append(chatMessage("user", "Back"));
                    runAssistantSequence(["What day of the month is this usually due? You can skip this."], "due");
                  }}>Back</ChoiceButton>
                </div>
              </div>
            ) : null}

            {error && phase !== "responding" ? (
              <p className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88" aria-live="polite">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
