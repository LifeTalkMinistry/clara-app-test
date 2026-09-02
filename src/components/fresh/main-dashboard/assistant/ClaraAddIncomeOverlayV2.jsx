import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import {
  INCOME_SOURCE_CATEGORIES,
  INCOME_SOURCE_STABILITY,
  addMoneyToIncomeSource,
  appendIncomeSourceActivity,
  getIncomeHubLocalUserId,
  getIncomeSources,
  transferIncomeSourceToWallet,
  upsertIncomeSource,
} from "@/lib/incomeHubRepository";
import {
  getWalletId,
  getWalletName,
  isActiveWalletForMoneySemantics,
} from "@/lib/clara-wallet-money-semantics";
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

const clean = (value) => String(value ?? "").trim();
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function money(value = 0) {
  const parsed = Number(value);
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function parseMoney(value) {
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function isStableIncome(value) {
  return clean(value).toLowerCase() === "stable";
}

function validDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 0;
}

function parseTwiceMonthlyDays(value) {
  const days = String(value ?? "")
    .split(/[\s,;/]+/)
    .map(validDay)
    .filter(Boolean);
  const unique = [...new Set(days)].sort((a, b) => a - b);
  return unique.length >= 2 ? unique.slice(0, 2) : [];
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
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function chatMessage(role, text) {
  return {
    id: `add-income-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function Bubble({ role, children, typing = false, elementRef = null }) {
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

function ChoiceButton({ children, onClick, disabled = false, secondary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative z-20 min-h-12 w-full touch-manipulation rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${
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
  type = "text",
  pattern,
  disabled = false,
}) {
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
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        pattern={pattern}
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

export default function ClaraAddIncomeOverlayV2({
  isActive = false,
  claraAssistantContext = {},
  resumeState = null,
  onOpenWalletChat,
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);

  const [phase, setPhase] = useState("opening");
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [amount, setAmount] = useState(0);
  const [transferAmountInput, setTransferAmountInput] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [interactionReady, setInteractionReady] = useState(false);

  const [sourceNameInput, setSourceNameInput] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceCategory, setSourceCategory] = useState("Salary");
  const [sourceStability, setSourceStability] = useState("Stable");
  const [stableAmountInput, setStableAmountInput] = useState("");
  const [stableMinimum, setStableMinimum] = useState(0);
  const [scheduleInput, setScheduleInput] = useState("");

  const viewportRef = useRef(null);
  const latestAssistantRef = useRef(null);
  const actionRef = useRef(null);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("source");
  const sequenceTokenRef = useRef(0);
  const previousActiveRef = useRef(false);

  const selectedSource = useMemo(
    () => sources.find((source) => String(source?.id) === String(selectedSourceId)) || null,
    [sources, selectedSourceId]
  );

  const wallets = useMemo(
    () =>
      (Array.isArray(claraAssistantContext?.wallets) ? claraAssistantContext.wallets : [])
        .filter(isActiveWalletForMoneySemantics)
        .map((wallet) => ({
          id: getWalletId(wallet),
          name: getWalletName(wallet) || "Wallet",
        }))
        .filter((wallet) => wallet.id),
    [claraAssistantContext?.wallets]
  );

  const resumedWallet = useMemo(() => {
    const wallet = resumeState?.wallet;
    const id = getWalletId(wallet);
    if (!id) return null;
    return {
      id,
      name: getWalletName(wallet) || "Wallet",
    };
  }, [resumeState?.wallet]);

  const selectedWallet = useMemo(
    () =>
      wallets.find((wallet) => String(wallet.id) === String(selectedWalletId)) ||
      (resumedWallet && String(resumedWallet.id) === String(selectedWalletId)
        ? resumedWallet
        : null),
    [wallets, selectedWalletId, resumedWallet]
  );

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

  const resetCreateSourceDraft = () => {
    setSourceNameInput("");
    setSourceName("");
    setSourceCategory("Salary");
    setSourceStability("Stable");
    setStableAmountInput("");
    setStableMinimum(0);
    setScheduleInput("");
  };

  const resetTransferDraft = () => {
    setSelectedWalletId("");
    setTransferAmountInput("");
    setTransferAmount(0);
  };

  const askTransferAmount = (walletName, options = {}) => {
    setTransferAmountInput("");
    setTransferAmount(0);
    const prefix = options.walletCreated ? `Wallet created — ${walletName} is ready.` : null;
    runAssistantSequence(
      [prefix, `How much of the ${money(amount)} would you like to transfer to ${walletName}?`],
      "transfer-amount-choice",
      { skipInitialDelay: options.skipInitialDelay === true }
    );
  };

  const loadSourcesAndStart = async ({ ignoreResume = false } = {}) => {
    cancelConversationPacing();
    setPhase("loading");
    setSources([]);
    setSelectedSourceId("");
    setAmountInput("");
    setAmount(0);
    resetTransferDraft();
    setBusy(false);
    setError("");
    setMessages([]);
    resetCreateSourceDraft();

    try {
      const records = await getIncomeSources(localUserId);
      const nextSources = Array.isArray(records) ? records : [];
      setSources(nextSources);

      if (!ignoreResume && resumeState?.reason === "transfer-after-wallet") {
        const resumedAmount = Number(resumeState?.amount) || 0;
        const resumedSourceId = String(resumeState?.sourceId || "");
        const resumedSource = nextSources.find(
          (source) => String(source?.id) === resumedSourceId
        );

        if (resumedAmount > 0 && resumedSource) {
          setSelectedSourceId(String(resumedSource.id));
          setAmount(resumedAmount);

          if (resumeState?.cancelled) {
            setMessages([
              chatMessage(
                "assistant",
                `No wallet was created. Your ${money(resumedAmount)} is still safely in ${resumedSource.name} in Income Hub.`
              ),
              chatMessage("assistant", "You can create a wallet later and transfer it when you’re ready."),
            ]);
            setPhase("done");
            setInteractionReady(true);
            return;
          }

          if (resumedWallet?.id) {
            setSelectedWalletId(String(resumedWallet.id));
            setMessages([
              chatMessage("assistant", `Wallet created — ${resumedWallet.name} is ready.`),
              chatMessage(
                "assistant",
                `How much of the ${money(resumedAmount)} would you like to transfer to ${resumedWallet.name}?`
              ),
            ]);
            setPhase("transfer-amount-choice");
            setInteractionReady(true);
            return;
          }

          setMessages([
            chatMessage("assistant", `You’re back. I kept your ${money(resumedAmount)} transfer ready.`),
            chatMessage("assistant", "Which wallet should receive this money?"),
          ]);
          setPhase("transfer-wallet");
          setInteractionReady(true);
          return;
        }
      }

      if (nextSources.length === 0) {
        runAssistantSequence(
          [
            `Hi ${firstName}! 👋`,
            "You don’t have an Income Source yet, so let’s create your first one right here.",
            "Choose the type of income you receive.",
          ],
          "create-source-choice"
        );
        return;
      }

      runAssistantSequence(
        [`Hi ${firstName}! 👋`, "What would you like to do with Income Hub?"],
        "income-home"
      );
    } catch (nextError) {
      const message = clean(nextError?.message || "I couldn’t load your Income Hub yet.");
      setError(message);
      runAssistantSequence([message], "error", { skipInitialDelay: true });
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
    if (isActive && !previousActiveRef.current) loadSourcesAndStart();
    if (!isActive && previousActiveRef.current) {
      cancelConversationPacing();
      setSources([]);
      setSelectedSourceId("");
      setAmountInput("");
      setAmount(0);
      resetTransferDraft();
      setMessages([]);
      setBusy(false);
      setError("");
      setPhase("opening");
      resetCreateSourceDraft();
    }
    previousActiveRef.current = isActive;
  }, [isActive, localUserId, firstName]);

  useEffect(
    () => () => {
      sequenceTokenRef.current += 1;
      clearPacingTimers();
    },
    []
  );

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
    onClose?.();
  };

  const saveNewSource = async (recurrence, overrides = {}) => {
    const nextName = clean(overrides.name ?? sourceName);
    const nextCategory = clean(overrides.category ?? sourceCategory) || "Other Income";
    const nextStability = clean(overrides.stability ?? sourceStability) || "Irregular";
    const stable = isStableIncome(nextStability);
    const minimum = stable ? Number(overrides.minimum ?? stableMinimum) : 0;

    if (!nextName) {
      setError("Choose an income source first.");
      return;
    }
    if (stable && (!(minimum > 0) || !recurrence)) {
      setError("Stable income needs a reliable minimum and payday schedule.");
      return;
    }

    cancelConversationPacing();
    setBusy(true);
    setError("");
    setPhase("saving-source");

    try {
      const timestamp = new Date().toISOString();
      const activityLog = appendIncomeSourceActivity({}, {
        type: "source_created",
        sourceName: nextName,
        createdAt: timestamp,
      });
      const saved = await upsertIncomeSource(localUserId, {
        name: nextName,
        category: INCOME_SOURCE_CATEGORIES.includes(nextCategory) ? nextCategory : "Other Income",
        stability: INCOME_SOURCE_STABILITY.includes(nextStability) ? nextStability : "Irregular",
        minimumStableIncome: stable ? minimum : null,
        minimum_stable_income: stable ? minimum : null,
        minimumExpectedIncome: stable ? minimum : null,
        minimum_expected_income: stable ? minimum : null,
        expectedAmount: stable ? minimum : null,
        expected_amount: stable ? minimum : null,
        totalMoneyIn: 0,
        total_money_in: 0,
        totalMoneyOut: 0,
        total_money_out: 0,
        currentBalance: 0,
        current_balance: 0,
        usualIncomeDateEnabled: stable,
        usual_income_date_enabled: stable,
        incomeRecurrence: stable ? recurrence : null,
        income_recurrence: stable ? recurrence : null,
        useForBudgetTiming: stable,
        use_for_budget_timing: stable,
        incomeActivityLog: activityLog,
        income_activity_log: activityLog,
        lastActivityAt: timestamp,
        last_activity_at: timestamp,
      });

      setSources([saved]);
      setSelectedSourceId(String(saved.id));
      resetTransferDraft();
      setBusy(false);
      runAssistantSequence(
        [
          `${saved.name} is now set up as your income source.`,
          "Would you like to add money now, create another income source, or are you done?",
        ],
        "source-created-choice",
        { skipInitialDelay: true }
      );
    } catch (nextError) {
      const message = clean(nextError?.message || "I couldn’t create that income source. Please try again.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "create-source-choice", { skipInitialDelay: true });
    }
  };

  const chooseInitialSourceCategory = (category) => {
    if (!interactionReady) return;
    setSourceCategory(category);
    setSourceName("");
    setSourceNameInput("");
    setError("");
    append(chatMessage("user", category));
    runAssistantSequence(
      [
        category === "Other Income"
          ? "What should we call this income source?"
          : `What should we call this ${category.toLowerCase()} source? For example: UnifyCX, My Business, or Client Work.`,
      ],
      "create-source-name"
    );
  };

  const submitSourceName = () => {
    if (!interactionReady) return;
    const nextName = clean(sourceNameInput);
    if (!nextName) return;
    setSourceName(nextName);
    setSourceNameInput("");
    setError("");
    append(chatMessage("user", nextName));
    runAssistantSequence(["How predictable is this income?"], "create-source-stability");
  };

  const chooseSourceStability = (stability) => {
    if (!interactionReady) return;
    setSourceStability(stability);
    setError("");
    append(chatMessage("user", stability));

    if (!isStableIncome(stability)) {
      void saveNewSource(null, { stability });
      return;
    }

    runAssistantSequence(["What is the lowest amount you can reliably expect on each payday?"], "create-stable-minimum");
  };

  const submitStableMinimum = () => {
    if (!interactionReady) return;
    const parsed = parseMoney(stableAmountInput);
    if (!(parsed > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setStableMinimum(parsed);
    setStableAmountInput("");
    setError("");
    append(chatMessage("user", money(parsed)));
    runAssistantSequence(["How often do you usually get paid?"], "create-schedule-type");
  };

  const chooseScheduleType = (type) => {
    if (!interactionReady) return;
    setScheduleInput("");
    setError("");

    if (type === "weekly") {
      append(chatMessage("user", "Every week"));
      runAssistantSequence(["Which day of the week?"], "create-weekday");
      return;
    }
    if (type === "biweekly") {
      append(chatMessage("user", "Every 2 weeks"));
      runAssistantSequence(["When is your next payday?"], "create-biweekly-date");
      return;
    }
    if (type === "twice_monthly") {
      append(chatMessage("user", "Twice a month"));
      runAssistantSequence(["Which two dates do you usually get paid? Example: 15, 30"], "create-twice-days");
      return;
    }

    append(chatMessage("user", "Once a month"));
    runAssistantSequence(["What day of the month?"], "create-monthly-day");
  };

  const chooseWeekday = (dayOfWeek) => {
    if (!interactionReady) return;
    append(chatMessage("user", WEEKDAYS[dayOfWeek]));
    void saveNewSource({ type: "weekly", startDate: localDateKey(), dayOfWeek });
  };

  const submitBiweeklyDate = () => {
    if (!interactionReady) return;
    const nextDate = clean(scheduleInput);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      setError("Choose a valid payday date.");
      return;
    }
    setError("");
    append(chatMessage("user", nextDate));
    void saveNewSource({ type: "biweekly", startDate: nextDate });
  };

  const submitTwiceMonthlyDays = () => {
    if (!interactionReady) return;
    const days = parseTwiceMonthlyDays(scheduleInput);
    if (days.length < 2) {
      setError("Enter two valid dates, for example 15, 30.");
      return;
    }
    setError("");
    append(chatMessage("user", `${days[0]} and ${days[1]}`));
    void saveNewSource({ type: "twice_monthly", startDate: localDateKey(), days });
  };

  const submitMonthlyDay = () => {
    if (!interactionReady) return;
    const dayOfMonth = validDay(scheduleInput);
    if (!dayOfMonth) {
      setError("Enter a day from 1 to 31.");
      return;
    }
    setError("");
    append(chatMessage("user", String(dayOfMonth)));
    void saveNewSource({ type: "monthly", startDate: localDateKey(), dayOfMonth });
  };

  const addMoneyAfterSourceCreation = () => {
    if (!interactionReady || !selectedSource) return;
    setError("");
    append(chatMessage("user", "Add money now"));
    runAssistantSequence(["How much money came in?"], "amount");
  };

  const beginAddMoney = () => {
    if (!interactionReady || !sources.length) return;
    setError("");
    resetTransferDraft();
    append(chatMessage("user", "Add money"));

    if (sources.length === 1) {
      setSelectedSourceId(String(sources[0].id));
      runAssistantSequence(
        [`Let’s add income to ${sources[0].name}.`, "How much money came in?"],
        "amount"
      );
      return;
    }

    setSelectedSourceId("");
    runAssistantSequence(["Which income source did this money come from?"], "source");
  };

  const beginCreateAnotherSource = () => {
    if (!interactionReady) return;
    resetCreateSourceDraft();
    setSelectedSourceId("");
    setAmountInput("");
    setAmount(0);
    resetTransferDraft();
    setError("");
    append(chatMessage("user", "Create another income source"));
    runAssistantSequence(
      ["Let’s create another Income Source.", "Choose the type of income you receive."],
      "create-source-choice"
    );
  };

  const chooseSource = (source) => {
    if (!interactionReady || !source?.id) return;
    setSelectedSourceId(String(source.id));
    resetTransferDraft();
    setError("");
    append(chatMessage("user", source.name));
    runAssistantSequence(["How much money came in?"], "amount");
  };

  const submitAmount = () => {
    if (!interactionReady) return;
    const parsed = parseMoney(amountInput);
    if (!(parsed > 0)) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!selectedSource) {
      setError("Choose an income source first.");
      return;
    }

    setAmount(parsed);
    resetTransferDraft();
    setAmountInput("");
    setError("");
    append(chatMessage("user", money(parsed)));
    runAssistantSequence(
      [
        `Just to confirm — add ${money(parsed)} to ${selectedSource.name} in Income Hub?`,
        "This records the income in its source first. It will only become wallet money after you transfer it to a wallet.",
      ],
      "confirm"
    );
  };

  const saveIncome = async () => {
    if (busy || !interactionReady || !selectedSource || amount <= 0) return;

    cancelConversationPacing();
    setBusy(true);
    setError("");
    setPhase("saving");
    append(chatMessage("user", "Yes, add it"));

    const minimumReplyDelay = new Promise((resolve) => registerTimeout(resolve, getClaraReplyDelay()));

    try {
      const updatedSource = await addMoneyToIncomeSource(localUserId, selectedSource.id, amount);
      await minimumReplyDelay;
      setSources((current) =>
        current.map((source) =>
          String(source?.id) === String(updatedSource?.id) ? updatedSource : source
        )
      );
      setBusy(false);
      runAssistantSequence(
        [
          `${money(amount)} has been added to ${selectedSource.name}.`,
          "It’s now in Income Hub. You can transfer this money to one of your wallets now.",
        ],
        "done",
        { skipInitialDelay: true }
      );
    } catch (nextError) {
      await minimumReplyDelay;
      const message = clean(nextError?.message || "I couldn’t add that income. Please try again.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "confirm", { skipInitialDelay: true });
    }
  };

  const beginTransfer = () => {
    if (!interactionReady || !selectedSource || amount <= 0) return;
    resetTransferDraft();
    setError("");
    append(chatMessage("user", "Transfer to Wallet"));

    if (!wallets.length) {
      if (typeof onOpenWalletChat === "function") {
        cancelConversationPacing();
        onOpenWalletChat({
          intent: "create",
          sourceId: selectedSource.id,
          sourceName: selectedSource.name,
          amount,
        });
        return;
      }
      runAssistantSequence(
        ["Wallet chat is unavailable right now. Your money is still safely in Income Hub."],
        "done"
      );
      return;
    }

    if (wallets.length === 1) {
      setSelectedWalletId(String(wallets[0].id));
      askTransferAmount(wallets[0].name);
      return;
    }

    runAssistantSequence(["Which wallet should receive this money?"], "transfer-wallet");
  };

  const chooseTransferWallet = (wallet) => {
    if (!interactionReady || !wallet?.id) return;
    setSelectedWalletId(String(wallet.id));
    setTransferAmount(0);
    setTransferAmountInput("");
    setError("");
    append(chatMessage("user", wallet.name));
    askTransferAmount(wallet.name);
  };

  const chooseTransferAll = () => {
    if (!interactionReady || !selectedWallet || amount <= 0) return;
    setTransferAmount(amount);
    setTransferAmountInput("");
    setError("");
    append(chatMessage("user", `Transfer all ${money(amount)}`));
    runAssistantSequence(
      [`Transfer ${money(amount)} from ${selectedSource?.name || "Income Hub"} to ${selectedWallet.name}?`],
      "transfer-confirm"
    );
  };

  const chooseCustomTransfer = () => {
    if (!interactionReady || !selectedWallet || amount <= 0) return;
    setTransferAmount(0);
    setTransferAmountInput("");
    setError("");
    append(chatMessage("user", "Transfer a certain amount"));
    runAssistantSequence(
      [`Enter the amount you want to transfer. You can transfer up to ${money(amount)} from this income.`],
      "transfer-custom-amount"
    );
  };

  const submitCustomTransferAmount = () => {
    if (!interactionReady || !selectedWallet) return;
    const parsed = parseMoney(transferAmountInput);
    if (!(parsed > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (parsed > amount) {
      setError(`You can transfer up to ${money(amount)} from this income.`);
      return;
    }

    setTransferAmount(parsed);
    setTransferAmountInput("");
    setError("");
    append(chatMessage("user", money(parsed)));
    runAssistantSequence(
      [`Transfer ${money(parsed)} from ${selectedSource?.name || "Income Hub"} to ${selectedWallet.name}?`],
      "transfer-confirm"
    );
  };

  const confirmTransfer = async () => {
    if (
      busy ||
      !interactionReady ||
      !selectedSource ||
      !selectedWallet ||
      transferAmount <= 0 ||
      transferAmount > amount
    ) {
      return;
    }

    cancelConversationPacing();
    setBusy(true);
    setError("");
    setPhase("transferring");
    append(chatMessage("user", "Yes, transfer it"));

    const minimumReplyDelay = new Promise((resolve) => registerTimeout(resolve, getClaraReplyDelay()));

    try {
      const result = await transferIncomeSourceToWallet(localUserId, {
        sourceId: selectedSource.id,
        destinationWalletId: selectedWallet.id,
        amount: transferAmount,
        date: localDateKey(),
        notes: `Transferred through CLARA Add Income chat to ${selectedWallet.name}`,
      });
      await minimumReplyDelay;
      if (result?.source) {
        setSources((current) =>
          current.map((source) =>
            String(source?.id) === String(result.source.id) ? result.source : source
          )
        );
      }
      setBusy(false);
      runAssistantSequence(
        [`Done — ${money(transferAmount)} has been transferred to ${selectedWallet.name}.`],
        "transferred",
        { skipInitialDelay: true }
      );
    } catch (nextError) {
      await minimumReplyDelay;
      const message = clean(nextError?.message || "I couldn’t transfer that income. Please try again.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "transfer-confirm", { skipInitialDelay: true });
    }
  };

  const restart = () => loadSourcesAndStart({ ignoreResume: true });

  return (
    <div
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="add-income"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-add-income-chat="true"
      data-clara-conversation-pacing="masterclass"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <ClaraChatHeader
        title="Add Income"
        tagline="Record · Transfer · Keep income accurate"
        onClose={closeChat}
      />

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div data-clara-ai-message-stack="true" className="flex min-h-full flex-col gap-3">
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

          <div
            ref={actionRef}
            data-clara-conversation-action-region="true"
            className="contents"
          >
            {phase === "income-home" && controlsReady ? (
              <div className="mt-1 grid gap-2.5" data-clara-income-home="true">
                <ChoiceButton onClick={beginAddMoney}>Add money</ChoiceButton>
                <ChoiceButton onClick={beginCreateAnotherSource} secondary>Create another income source</ChoiceButton>
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
            ) : null}

            {phase === "create-source-choice" && controlsReady ? (
              <div className="relative z-20 mt-1 grid grid-cols-2 gap-2" data-clara-income-source-first-choice="true">
                {INCOME_SOURCE_CATEGORIES.map((category) => (
                  <ChoiceButton key={category} onClick={() => chooseInitialSourceCategory(category)} secondary>
                    {category}
                  </ChoiceButton>
                ))}
              </div>
            ) : null}

            {phase === "create-source-name" && controlsReady ? (
              <div className="mt-auto pt-3" data-clara-income-source-custom-name="true">
                <Composer
                  value={sourceNameInput}
                  onChange={setSourceNameInput}
                  onSubmit={submitSourceName}
                  placeholder="Income source name"
                  inputMode="text"
                />
              </div>
            ) : null}

            {phase === "create-source-stability" && controlsReady ? (
              <div className="relative z-20 mt-1 grid grid-cols-2 gap-2">
                {INCOME_SOURCE_STABILITY.map((stability) => (
                  <ChoiceButton key={stability} onClick={() => chooseSourceStability(stability)} secondary>
                    {stability}
                  </ChoiceButton>
                ))}
              </div>
            ) : null}

            {phase === "create-stable-minimum" && controlsReady ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={stableAmountInput}
                  onChange={setStableAmountInput}
                  onSubmit={submitStableMinimum}
                  placeholder="Lowest reliable amount"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]{0,2}"
                />
              </div>
            ) : null}

            {phase === "create-schedule-type" && controlsReady ? (
              <div className="relative z-20 mt-1 grid grid-cols-2 gap-2">
                <ChoiceButton onClick={() => chooseScheduleType("weekly")} secondary>Every week</ChoiceButton>
                <ChoiceButton onClick={() => chooseScheduleType("biweekly")} secondary>Every 2 weeks</ChoiceButton>
                <ChoiceButton onClick={() => chooseScheduleType("twice_monthly")} secondary>Twice a month</ChoiceButton>
                <ChoiceButton onClick={() => chooseScheduleType("monthly")} secondary>Once a month</ChoiceButton>
              </div>
            ) : null}

            {phase === "create-weekday" && controlsReady ? (
              <div className="relative z-20 mt-1 grid grid-cols-2 gap-2">
                {WEEKDAYS.map((weekday, index) => (
                  <ChoiceButton key={weekday} onClick={() => chooseWeekday(index)} secondary>{weekday}</ChoiceButton>
                ))}
              </div>
            ) : null}

            {phase === "create-biweekly-date" && controlsReady ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={scheduleInput}
                  onChange={setScheduleInput}
                  onSubmit={submitBiweeklyDate}
                  placeholder="Next payday"
                  type="date"
                  inputMode="text"
                />
              </div>
            ) : null}

            {phase === "create-twice-days" && controlsReady ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={scheduleInput}
                  onChange={setScheduleInput}
                  onSubmit={submitTwiceMonthlyDays}
                  placeholder="15, 30"
                  inputMode="text"
                />
              </div>
            ) : null}

            {phase === "create-monthly-day" && controlsReady ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={scheduleInput}
                  onChange={setScheduleInput}
                  onSubmit={submitMonthlyDay}
                  placeholder="Day of month"
                  inputMode="numeric"
                  pattern="[0-9]{1,2}"
                />
              </div>
            ) : null}

            {phase === "source-created-choice" && controlsReady ? (
              <div className="mt-1 grid gap-2.5" data-clara-income-source-created-choice="true">
                <ChoiceButton onClick={addMoneyAfterSourceCreation}>Add money now</ChoiceButton>
                <ChoiceButton onClick={beginCreateAnotherSource} secondary>Create another income source</ChoiceButton>
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
            ) : null}

            {phase === "source" && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => chooseSource(source)}
                    className="relative z-20 flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-[18px] border border-blue-200/12 bg-[#07142b]/88 px-4 py-3 text-left transition active:scale-[0.985]"
                  >
                    <span>
                      <span className="block text-[13px] font-black text-white">{source.name}</span>
                      <span className="mt-0.5 block text-[10.5px] font-semibold text-slate-300/62">
                        {source.category || "Income"} · {source.stability || "Irregular"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-black text-[#8ffff8]/72">Choose</span>
                  </button>
                ))}
              </div>
            ) : null}

            {phase === "amount" && controlsReady ? (
              <div className="mt-auto pt-3">
                <Composer
                  value={amountInput}
                  onChange={setAmountInput}
                  onSubmit={submitAmount}
                  placeholder="Amount received"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]{0,2}"
                />
              </div>
            ) : null}

            {phase === "confirm" && controlsReady ? (
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={saveIncome} disabled={busy}>{busy ? "Adding..." : "Yes, add it"}</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("amount")} disabled={busy} secondary>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "done" && controlsReady ? (
              <div className="mt-1 grid gap-2.5">
                <ChoiceButton onClick={beginTransfer}>Transfer to Wallet</ChoiceButton>
                <div className="grid grid-cols-2 gap-2.5">
                  <ChoiceButton onClick={restart} secondary>Add another</ChoiceButton>
                  <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
                </div>
              </div>
            ) : null}

            {phase === "transfer-wallet" && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2">
                {wallets.map((wallet) => (
                  <ChoiceButton key={wallet.id} onClick={() => chooseTransferWallet(wallet)} secondary>
                    {wallet.name}
                  </ChoiceButton>
                ))}
                <ChoiceButton onClick={() => setPhase("done")} secondary>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "transfer-amount-choice" && controlsReady ? (
              <div className="mt-1 grid grid-cols-2 gap-2.5" data-clara-transfer-amount-choice="true">
                <ChoiceButton onClick={chooseTransferAll}>Transfer all {money(amount)}</ChoiceButton>
                <ChoiceButton onClick={chooseCustomTransfer} secondary>Transfer a certain amount</ChoiceButton>
              </div>
            ) : null}

            {phase === "transfer-custom-amount" && controlsReady ? (
              <div className="mt-auto pt-3" data-clara-transfer-custom-amount="true">
                <Composer
                  value={transferAmountInput}
                  onChange={setTransferAmountInput}
                  onSubmit={submitCustomTransferAmount}
                  placeholder={`Amount up to ${money(amount)}`}
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]{0,2}"
                />
                <div className="mt-2">
                  <ChoiceButton onClick={() => setPhase("transfer-amount-choice")} secondary>Back</ChoiceButton>
                </div>
              </div>
            ) : null}

            {phase === "transfer-confirm" && controlsReady ? (
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={confirmTransfer} disabled={busy}>{busy ? "Transferring..." : "Yes, transfer it"}</ChoiceButton>
                <ChoiceButton onClick={() => setPhase("transfer-amount-choice")} disabled={busy} secondary>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "transferred" && controlsReady ? (
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <ChoiceButton onClick={restart}>Add another</ChoiceButton>
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
            ) : null}

            {(phase === "no-wallet" || phase === "error") && controlsReady ? (
              <div className="mt-1">
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
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
        </div>
      </main>
    </div>
  );
}
