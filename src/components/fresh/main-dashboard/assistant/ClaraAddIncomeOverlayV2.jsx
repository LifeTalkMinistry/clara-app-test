import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import {
  addMoneyToIncomeSource,
  getIncomeHubLocalUserId,
  getIncomeSources,
} from "@/lib/incomeHubRepository";
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

const clean = (value) => String(value ?? "").trim();

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
    id: `add-income-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
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

function Composer({ value, onChange, onSubmit, placeholder, disabled = false }) {
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
        inputMode="decimal"
        pattern="[0-9]*[.]?[0-9]{0,2}"
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
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);

  const [phase, setPhase] = useState("opening");
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [amount, setAmount] = useState(0);
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
  const sequencePhaseRef = useRef("source");
  const sequenceTokenRef = useRef(0);
  const previousActiveRef = useRef(false);

  const selectedSource = useMemo(
    () => sources.find((source) => String(source?.id) === String(selectedSourceId)) || null,
    [sources, selectedSourceId]
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
    const replies = replyTexts.map((text) => clean(text)).filter(Boolean);
    const token = sequenceTokenRef.current;
    sequenceRef.current = replies;
    sequencePhaseRef.current = nextPhase;
    setPhase("responding");
    setInteractionReady(false);
    queueNextAssistantMessage(token, options.skipInitialDelay === true);
  };

  const loadSourcesAndStart = async () => {
    cancelConversationPacing();
    setPhase("loading");
    setSources([]);
    setSelectedSourceId("");
    setAmountInput("");
    setAmount(0);
    setBusy(false);
    setError("");
    setMessages([]);

    try {
      const records = await getIncomeSources(localUserId);
      const nextSources = Array.isArray(records) ? records : [];
      setSources(nextSources);

      if (nextSources.length === 0) {
        runAssistantSequence(
          [
            `Hi ${firstName}! 👋`,
            "I can add income here, but you don’t have an Income Source yet.",
            "Create your income source first, then come back here and I’ll record the money through this chat.",
          ],
          "no-source"
        );
        return;
      }

      if (nextSources.length === 1) {
        setSelectedSourceId(String(nextSources[0].id));
        runAssistantSequence(
          [
            `Hi ${firstName}! 👋`,
            `Let’s add income to ${nextSources[0].name}.`,
            "How much money came in?",
          ],
          "amount"
        );
        return;
      }

      runAssistantSequence(
        [`Hi ${firstName}! 👋`, "Which income source did this money come from?"],
        "source"
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
    if (isActive && !previousActiveRef.current) loadSourcesAndStart();
    if (!isActive && previousActiveRef.current) {
      cancelConversationPacing();
      setSources([]);
      setSelectedSourceId("");
      setAmountInput("");
      setAmount(0);
      setMessages([]);
      setBusy(false);
      setError("");
      setPhase("opening");
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

  if (!isActive) return null;

  const closeChat = () => {
    cancelConversationPacing();
    onClose?.();
  };

  const chooseSource = (source) => {
    if (!interactionReady || !source?.id) return;
    setSelectedSourceId(String(source.id));
    setError("");
    append(chatMessage("user", source.name));
    runAssistantSequence(["How much money came in?"], "amount");
  };

  const submitAmount = () => {
    if (!interactionReady) return;
    const parsed = Number(String(amountInput || "").replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!selectedSource) {
      setError("Choose an income source first.");
      return;
    }

    setAmount(parsed);
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

    const minimumReplyDelay = new Promise((resolve) =>
      registerTimeout(resolve, getClaraReplyDelay())
    );

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
          "It’s now in Income Hub and ready to be transferred to a wallet when you’re ready.",
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

  const restart = () => loadSourcesAndStart();
  const controlsReady = interactionReady && !pendingMessage && phase !== "responding" && !busy;

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

      <header className="relative z-20 mx-1 min-h-[64px] shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <h1 className="absolute inset-0 flex items-center justify-center px-[76px] text-center text-[16px] font-black leading-none tracking-[-0.02em] text-white">
          Add Income
        </h1>
        <button
          type="button"
          onClick={closeChat}
          className="absolute inset-y-0 right-[6px] z-30 my-auto grid h-9 w-9 touch-manipulation place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
          aria-label="Close Add Income"
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
            <Bubble key={entry.id} role={entry.role}>
              {entry.text}
            </Bubble>
          ))}
          {pendingMessage ? (
            <Bubble role="assistant" typing>
              {typedText}
            </Bubble>
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
                  <span className="shrink-0 text-[11px] font-black text-[#8ffff8]/72">
                    Choose
                  </span>
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
              />
            </div>
          ) : null}

          {phase === "confirm" && controlsReady ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <ChoiceButton onClick={saveIncome} disabled={busy}>
                {busy ? "Adding..." : "Yes, add it"}
              </ChoiceButton>
              <ChoiceButton onClick={() => setPhase("amount")} disabled={busy} secondary>
                Back
              </ChoiceButton>
            </div>
          ) : null}

          {phase === "done" && controlsReady ? (
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <ChoiceButton onClick={restart}>Add another</ChoiceButton>
              <ChoiceButton onClick={closeChat} secondary>
                Done
              </ChoiceButton>
            </div>
          ) : null}

          {(phase === "no-source" || phase === "error") && controlsReady ? (
            <div className="mt-1">
              <ChoiceButton onClick={closeChat} secondary>
                Done
              </ChoiceButton>
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
      </main>
    </div>
  );
}
