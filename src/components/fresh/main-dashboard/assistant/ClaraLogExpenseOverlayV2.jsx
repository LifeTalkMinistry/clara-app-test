import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import { addBuyCheckExpense } from "@/lib/clara-buy-check-expense-repository";
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
import {
  getWalletId,
  getWalletName,
  isActiveWalletForMoneySemantics,
} from "@/lib/clara-wallet-money-semantics";

function money(value = 0) {
  const parsed = Number(value);
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function firstNameFromUser(user = {}) {
  const raw = clean(
    user?.firstName || user?.first_name || user?.displayName || user?.display_name ||
      user?.name || user?.fullName || user?.full_name || ""
  );
  if (raw) return raw.split(" ")[0];
  const email = clean(user?.email);
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function chatMessage(role, text) {
  return { id: `log-expense-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text };
}

function Bubble({ role, children, typing = false, elementRef = null }) {
  const assistant = role === "assistant";
  return (
    <div
      ref={elementRef}
      data-clara-conversation-role={role}
      className={`flex ${assistant ? "justify-start" : "justify-end"}`}
    >
      <div className={`max-w-[86%] rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,0.20)] ${assistant ? "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100" : "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white"}`}>
        <span className="whitespace-pre-wrap">{children}</span>
        {typing ? <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-cyan-100/75" /> : null}
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
      className={`relative z-20 min-h-12 w-full touch-manipulation rounded-[18px] border px-4 text-[13px] font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${secondary ? "border-white/10 bg-white/[0.035] text-white/88" : "border-blue-300/25 bg-[linear-gradient(135deg,rgba(23,105,255,0.96),rgba(13,79,198,0.96))] text-white shadow-[0_12px_30px_rgba(23,105,255,0.22)]"}`}
    >
      {children}
    </button>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text", disabled = false }) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }} className="relative z-20 flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
      <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} inputMode={inputMode} disabled={disabled} className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/62 disabled:opacity-50" />
      <button type="submit" disabled={disabled || !clean(value)} className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-full bg-[#1769ff] text-white shadow-[0_8px_22px_rgba(23,105,255,0.34)] transition active:scale-95 disabled:opacity-40" aria-label="Send"><ArrowUp className="h-4 w-4" /></button>
    </form>
  );
}

export default function ClaraLogExpenseOverlayV2({
  isActive = false,
  claraAssistantContext = {},
  resumeState = null,
  onOpenWalletChat,
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
  const latestAssistantRef = useRef(null);
  const actionRef = useRef(null);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("amount");
  const sequenceTokenRef = useRef(0);
  const previousActiveRef = useRef(false);

  const walletOptions = useMemo(() => getWalletOptions(claraAssistantContext, amount), [claraAssistantContext, amount]);
  const activeWallets = useMemo(
    () => (Array.isArray(claraAssistantContext?.wallets) ? claraAssistantContext.wallets : [])
      .filter(isActiveWalletForMoneySemantics)
      .map((wallet) => ({ id: getWalletId(wallet), name: getWalletName(wallet) || "Wallet" }))
      .filter((wallet) => wallet.id),
    [claraAssistantContext?.wallets]
  );

  const append = (...nextMessages) => {
    setMessages((current) => [...current, ...nextMessages]);
  };

  const registerTimeout = (callback, delay) => {
    const id = window.setTimeout(() => { timerIdsRef.current.delete(id); callback(); }, delay);
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
      registerTimeout(() => { if (token === sequenceTokenRef.current) setInteractionReady(true); }, getClaraReadDelay());
      return;
    }
    const show = () => {
      if (token !== sequenceTokenRef.current) return;
      setTypedText("");
      setPendingMessage(chatMessage("assistant", nextText));
    };
    if (skipDelay) show(); else registerTimeout(show, getClaraReplyDelay());
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
    const resumedAmount = Number(resumeState?.amount) || 0;
    const resumedItem = clean(resumeState?.item);
    if (resumedAmount > 0 && resumedItem) {
      setAmount(resumedAmount);
      setItem(resumedItem);
      setMessages([
        chatMessage("assistant", `You’re back. I kept ${money(resumedAmount)} for ${resumedItem}.`),
        chatMessage("assistant", "Which wallet did you use?"),
      ]);
      setPhase("wallet");
      setInteractionReady(true);
      return;
    }
    setMessages([]);
    runAssistantSequence([
      `Hi ${firstName}! 👋`,
      "Quick note: Anything you log here will be treated as unplanned spending. Your planned routine expenses are already covered by Money Schedule.",
      "How much did you spend?",
    ], "amount");
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
      resetFinancialFields();
      setMessages([]);
      setPhase("opening");
    }
    previousActiveRef.current = isActive;
  }, [isActive, firstName]);

  useEffect(() => () => { sequenceTokenRef.current += 1; clearPacingTimers(); }, []);

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

  const closeChat = () => { cancelConversationPacing(); onClose?.(); };

  const submitAmount = () => {
    if (!interactionReady) return;
    const parsed = Number(String(amountInput || "").replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) { setError("Enter a valid amount greater than zero."); return; }
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
    runAssistantSequence([`Just to confirm — log ${money(amount)} for ${item} from ${wallet.name} as unplanned spending?`], "confirm");
  };

  const openWalletChat = (detail) => {
    if (typeof onOpenWalletChat !== "function") {
      setError("Wallet chat is not available yet. Please close and try again.");
      return;
    }
    onOpenWalletChat({ ...detail, amount, item });
  };

  const createWalletAndReturn = () => openWalletChat({ intent: "create" });
  const fundWalletAndReturn = (wallet) => {
    if (!wallet?.id) return;
    openWalletChat({ intent: "fund", walletId: wallet.id, walletName: wallet.name });
  };

  const logExpense = async () => {
    if (busy || !interactionReady) return;
    const wallet = walletOptions.find((option) => option.id === walletId);
    if (!wallet) { setError("Choose a wallet before logging this expense."); return; }
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
      runAssistantSequence([`${money(amount)} for ${item} has been logged as unplanned spending and deducted from ${wallet.name}.`], "done", { skipInitialDelay: true });
    } catch (nextError) {
      await minimumReplyDelay;
      const message = clean(nextError?.message || "I couldn’t log that expense. Please try again.");
      setBusy(false);
      setError(message);
      runAssistantSequence([message], "confirm", { skipInitialDelay: true });
    }
  };

  const resetFlow = () => startOpeningConversation();

  return (
    <div className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white" data-clara-ai-layout-variant="log-expense" data-clara-pause-overlay="true" data-clara-buy-check-react-owner="true" data-clara-log-expense-chat="true" data-clara-conversation-pacing="masterclass">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />
      <ClaraChatHeader
        title="Log Expense"
        tagline="Check · Record · Stay accurate"
        onClose={closeChat}
      />
      <main ref={viewportRef} data-clara-ai-message-viewport="true" className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-full flex-col gap-3">
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
            {phase === "amount" && controlsReady ? <div className="mt-auto pt-3"><Composer value={amountInput} onChange={setAmountInput} onSubmit={submitAmount} placeholder="Amount spent" inputMode="decimal" /></div> : null}
            {phase === "item" && controlsReady ? <div className="mt-auto pt-3"><Composer value={itemInput} onChange={setItemInput} onSubmit={submitItem} placeholder="What was it for?" /></div> : null}
            {phase === "wallet" && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2">
                {walletOptions.length ? walletOptions.map((wallet) => (
                  <button key={wallet.id} type="button" disabled={!wallet.enough} onClick={() => chooseWallet(wallet)} className="relative z-20 flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-[18px] border border-blue-200/12 bg-[#07142b]/88 px-4 py-3 text-left transition active:scale-[0.985] disabled:opacity-40">
                    <span><span className="block text-[13px] font-black text-white">{wallet.name}</span><span className="mt-0.5 block text-[10.5px] font-semibold text-slate-300/62">{wallet.enough ? "Available to spend" : "Not enough balance"}</span></span>
                    <span className="shrink-0 text-[12px] font-black text-[#8ffff8]/82">{money(wallet.balance)}</span>
                  </button>
                )) : activeWallets.length ? (
                  <>
                    <Bubble role="assistant">I can see your wallet setup, but there isn’t any spendable money available yet. Add money to a wallet and we can continue.</Bubble>
                    {activeWallets.map((wallet) => <ChoiceButton key={wallet.id} onClick={() => fundWalletAndReturn(wallet)}>Add money to {wallet.name}</ChoiceButton>)}
                    <ChoiceButton onClick={closeChat} secondary>Not now</ChoiceButton>
                  </>
                ) : (
                  <>
                    <Bubble role="assistant">It looks like you don’t have a wallet yet. You’ll need one before I can log this expense. Want to create one now?</Bubble>
                    <ChoiceButton onClick={createWalletAndReturn}>Create a Wallet</ChoiceButton>
                    <ChoiceButton onClick={closeChat} secondary>Not now</ChoiceButton>
                  </>
                )}
              </div>
            ) : null}
            {phase === "confirm" && controlsReady ? <div className="mt-1 grid grid-cols-2 gap-2.5"><ChoiceButton onClick={logExpense} disabled={busy}>{busy ? "Logging..." : "Yes, log it"}</ChoiceButton><ChoiceButton onClick={() => setPhase("wallet")} disabled={busy} secondary>Back</ChoiceButton></div> : null}
            {phase === "done" && controlsReady ? <div className="mt-1 grid grid-cols-2 gap-2.5"><ChoiceButton onClick={resetFlow}>Log another</ChoiceButton><ChoiceButton onClick={closeChat} secondary>Done</ChoiceButton></div> : null}
            {error && phase !== "responding" ? <p className="rounded-[16px] border border-red-300/15 bg-red-500/[0.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88" aria-live="polite">{error}</p> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
