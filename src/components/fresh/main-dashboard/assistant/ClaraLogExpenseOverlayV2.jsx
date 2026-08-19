import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { addBuyCheckExpense } from "@/lib/clara-buy-check-expense-repository";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";
import {
  clean,
  dispatchFinanceUpdates,
  getPHDateString,
  getWalletOptions,
  normalizeExpenseCategory,
  normalizeNeedType,
} from "@/lib/clara-buy-check-budget-intelligence";
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

function money(value = 0) {
  const parsed = Number(value);
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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
    id: `log-expense-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function amountFromBudget(budget = {}) {
  return Number(
    budget?.amount ??
      budget?.budget_amount ??
      budget?.allocated_amount ??
      budget?.target_amount ??
      budget?.limit ??
      0
  ) || 0;
}

function titleFromBudget(budget = {}) {
  return clean(
    budget?.title ||
      budget?.name ||
      budget?.label ||
      budget?.category ||
      budget?.budget_name ||
      "Planned budget"
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

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text", disabled = false }) {
  return (
    <form
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
        disabled={disabled}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/62 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !clean(value)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white shadow-[0_8px_22px_rgba(23,105,255,0.34)] transition active:scale-95 disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

export default function ClaraLogExpenseOverlayV2({
  isActive = false,
  claraAssistantContext = {},
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const [phase, setPhase] = useState("opening");
  const [amountInput, setAmountInput] = useState("");
  const [amount, setAmount] = useState(0);
  const [itemInput, setItemInput] = useState("");
  const [item, setItem] = useState("");
  const [walletId, setWalletId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [interactionReady, setInteractionReady] = useState(false);
  const viewportRef = useRef(null);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("planning-choice");
  const sequenceTokenRef = useRef(0);
  const previousActiveRef = useRef(false);

  const walletOptions = useMemo(
    () => getWalletOptions(claraAssistantContext, amount),
    [claraAssistantContext, amount]
  );

  const plannedItems = useMemo(
    () =>
      (Array.isArray(claraAssistantContext?.budgets) ? claraAssistantContext.budgets : [])
        .filter((budget) => !budget?.deletedAt && !budget?.deleted_at && budget?.status !== "archived")
        .slice(0, 12),
    [claraAssistantContext?.budgets]
  );

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
    const replies = replyTexts.map((text) => String(text || "").trim()).filter(Boolean);
    const token = sequenceTokenRef.current;
    sequenceRef.current = replies;
    sequencePhaseRef.current = nextPhase;
    setPhase("responding");
    setInteractionReady(false);
    queueNextAssistantMessage(token, options.skipInitialDelay === true);
  };

  const resetFinancialFields = () => {
    setAmountInput("");
    setAmount(0);
    setItemInput("");
    setItem("");
    setWalletId("");
    setBusy(false);
    setError("");
  };

  const startOpeningConversation = () => {
    cancelConversationPacing();
    resetFinancialFields();
    setMessages([]);
    runAssistantSequence(
      [
        `Hi ${firstName}! 👋`,
        "Was this expense part of your scheduled budget, or was it unplanned spending?",
      ],
      "planning-choice"
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
      resetFinancialFields();
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
    if (
      !isActive ||
      phase !== "money-schedule-launch" ||
      !interactionReady ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      const requestId = `clara-log-expense-money-schedule-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      window.dispatchEvent(
        new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
          detail: {
            requestId,
            source: "log-expense-money-schedule-handoff",
            mode: "money-schedule",
            commandId: "money-schedule",
          },
        })
      );
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [interactionReady, isActive, phase]);

  if (!isActive) return null;

  const closeChat = () => {
    cancelConversationPacing();
    onClose?.();
  };

  const choosePlanned = () => {
    if (!interactionReady) return;
    setError("");
    append(chatMessage("user", "Scheduled / Planned"));
    runAssistantSequence(
      [
        "If this was already part of your planned budget or scheduled money setup, you don’t have to log it again. CLARA already has that plan accounted for, so logging it here could count it twice.",
        "I can remind you of the budget items you already set up. Want to see your current planned list?",
      ],
      "planned"
    );
  };

  const chooseUnplanned = () => {
    if (!interactionReady) return;
    setError("");
    append(chatMessage("user", "Unplanned Spending"));
    runAssistantSequence(
      ["Got it — this was unplanned spending. How much did you spend?"],
      "amount"
    );
  };

  const showCurrentPlannedList = () => {
    if (!interactionReady) return;
    setError("");
    append(chatMessage("user", "Show my planned list"));

    if (!plannedItems.length) {
      runAssistantSequence(
        [
          "I checked your current setup, and I don’t see an active planned budget or Money Schedule yet.",
          "Would you like to set up your Money Schedule now?",
        ],
        "money-schedule-offer"
      );
      return;
    }

    runAssistantSequence(
      ["Sure. Here’s the planned budget setup I currently have for you."],
      "planned-list"
    );
  };

  const openMoneySchedule = () => {
    if (!interactionReady) return;
    setError("");
    append(chatMessage("user", "Yes, set it up"));
    runAssistantSequence(
      ["Absolutely. I’ll open your Money Schedule so you can set it up now."],
      "money-schedule-launch"
    );
  };

  const skipMoneySchedule = () => {
    if (!interactionReady) return;
    setError("");
    append(chatMessage("user", "Not now"));
    runAssistantSequence(
      [
        "No problem. You can set up your Money Schedule anytime. I won’t log this expense again because you marked it as planned.",
      ],
      "planned-finished"
    );
  };

  const submitAmount = () => {
    if (!interactionReady) return;
    const parsed = Number(String(amountInput || "").replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    setAmount(parsed);
    setAmountInput("");
    setError("");
    append(chatMessage("user", money(parsed)));
    runAssistantSequence(["What was this expense for?"], "item");
  };

  const submitItem = () => {
    if (!interactionReady) return;
    const nextItem = clean(itemInput);
    if (!nextItem) return;
    setItem(nextItem);
    setItemInput("");
    setError("");
    append(chatMessage("user", nextItem));
    runAssistantSequence(["Which wallet did you use?"], "wallet");
  };

  const chooseWallet = (wallet) => {
    if (!interactionReady || !wallet?.id || !wallet?.enough) return;
    setWalletId(wallet.id);
    setError("");
    append(chatMessage("user", wallet.name));
    runAssistantSequence(
      [`Just to confirm — log ${money(amount)} for ${item} from ${wallet.name} as unplanned spending?`],
      "confirm"
    );
  };

  const logExpense = async () => {
    if (busy || !interactionReady) return;
    const wallet = walletOptions.find((option) => option.id === walletId);
    if (!wallet) {
      setError("Choose a wallet before logging this expense.");
      return;
    }

    cancelConversationPacing();
    setBusy(true);
    setError("");
    setPhase("saving");
    append(chatMessage("user", "Yes, log it"));
    const minimumReplyDelay = new Promise((resolve) => registerTimeout(resolve, getClaraReplyDelay()));

    try {
      const localUserId = clean(user?.id || user?.email || "local-user");
      const category = normalizeExpenseCategory(item);
      await addBuyCheckExpense(localUserId, {
        item,
        reason: item,
        amount,
        category,
        wallet_id: wallet.id,
        date: getPHDateString(),
        notes: item,
        need_type: normalizeNeedType(item, category),
        planning_status: "unplanned",
        unplanned_reason: `Logged through CLARA Orb — ${item}`,
        source: "local",
        syncStatus: "local_only",
      });

      await minimumReplyDelay;
      dispatchFinanceUpdates();
      setBusy(false);
      runAssistantSequence(
        [`${money(amount)} for ${item} has been logged as unplanned spending and deducted from ${wallet.name}.`],
        "done",
        { skipInitialDelay: true }
      );
    } catch (nextError) {
      await minimumReplyDelay;
      const message = clean(nextError?.message || "I couldn’t log that expense. Please try again.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "confirm", { skipInitialDelay: true });
    }
  };

  const resetFlow = () => {
    startOpeningConversation();
  };

  const controlsReady = interactionReady && !pendingMessage && phase !== "responding" && !busy;

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-layout-variant="log-expense"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-log-expense-chat="true"
      data-clara-conversation-pacing="masterclass"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#8ffff8]/78">CLARA CHAT</p>
        <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Log Expense</h1>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Check · Record · Stay accurate</p>
        <button
          type="button"
          onClick={closeChat}
          className="absolute inset-y-0 right-4 my-auto grid h-9 w-9 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
          aria-label="Close Log Expense"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-h-full flex-col gap-3">
          {messages.map((entry) => (
            <Bubble key={entry.id} role={entry.role}>{entry.text}</Bubble>
          ))}

          {pendingMessage ? (
            <Bubble role="assistant" typing>{typedText}</Bubble>
          ) : null}

          {phase === "planning-choice" && controlsReady ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton onClick={choosePlanned}>Scheduled / Planned</ChoiceButton>
              <ChoiceButton onClick={chooseUnplanned} secondary>Unplanned Spending</ChoiceButton>
            </div>
          ) : null}

          {phase === "planned" && controlsReady ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton onClick={showCurrentPlannedList}>Show my planned list</ChoiceButton>
              <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
            </div>
          ) : null}

          {phase === "money-schedule-offer" && controlsReady ? (
            <div className="mt-1 grid gap-2.5">
              <ChoiceButton onClick={openMoneySchedule}>Yes, set it up</ChoiceButton>
              <ChoiceButton onClick={skipMoneySchedule} secondary>Not now</ChoiceButton>
            </div>
          ) : null}

          {phase === "planned-finished" && controlsReady ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <ChoiceButton onClick={resetFlow}>Back to Log Expense</ChoiceButton>
              <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
            </div>
          ) : null}

          {phase === "planned-list" && controlsReady ? (
            <>
              <section className="mt-1 rounded-[22px] border border-blue-200/12 bg-[#07142b]/88 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8ffff8]/66">CURRENT PLANNED BUDGET</p>
                {plannedItems.length ? (
                  <div className="mt-3 grid gap-2">
                    {plannedItems.map((budget, index) => (
                      <div key={budget?.id || `${titleFromBudget(budget)}-${index}`} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-white/[0.035] px-3.5 py-3">
                        <span className="min-w-0 truncate text-[12.5px] font-black text-white/92">{titleFromBudget(budget)}</span>
                        {amountFromBudget(budget) > 0 ? <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">{money(amountFromBudget(budget))}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
              <div className="mt-1">
                <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
              </div>
            </>
          ) : null}

          {phase === "amount" && controlsReady ? (
            <div className="mt-auto pt-3">
              <Composer value={amountInput} onChange={setAmountInput} onSubmit={submitAmount} placeholder="Amount spent" inputMode="decimal" />
            </div>
          ) : null}

          {phase === "item" && controlsReady ? (
            <div className="mt-auto pt-3">
              <Composer value={itemInput} onChange={setItemInput} onSubmit={submitItem} placeholder="What was it for?" />
            </div>
          ) : null}

          {phase === "wallet" && controlsReady ? (
            <div className="mt-1 grid gap-2">
              {walletOptions.length ? walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  disabled={!wallet.enough}
                  onClick={() => chooseWallet(wallet)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-[18px] border border-blue-200/12 bg-[#07142b]/88 px-4 py-3 text-left transition active:scale-[0.985] disabled:opacity-40"
                >
                  <span>
                    <span className="block text-[13px] font-black text-white">{wallet.name}</span>
                    <span className="mt-0.5 block text-[10.5px] font-semibold text-slate-300/62">{wallet.enough ? "Available to spend" : "Not enough balance"}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">{money(wallet.balance)}</span>
                </button>
              )) : (
                <Bubble role="assistant">I can’t find a spendable wallet yet. Add or fund a wallet first, then come back here.</Bubble>
              )}
            </div>
          ) : null}

          {phase === "confirm" && controlsReady ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <ChoiceButton onClick={logExpense} disabled={busy}>{busy ? "Logging..." : "Yes, log it"}</ChoiceButton>
              <ChoiceButton onClick={() => setPhase("wallet")} disabled={busy} secondary>Back</ChoiceButton>
            </div>
          ) : null}

          {phase === "done" && controlsReady ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <ChoiceButton onClick={resetFlow}>Log another</ChoiceButton>
              <ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton>
            </div>
          ) : null}

          {error && phase !== "responding" ? (
            <p className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88" aria-live="polite">{error}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
