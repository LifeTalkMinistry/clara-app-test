import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import ClaraChatHeader from "./ClaraChatHeader";
import useClaraConversationReveal from "./useClaraConversationReveal";
import {
  getWalletCurrentBalance,
  getWalletId,
  getWalletName,
  isActiveWalletForMoneySemantics,
  isMoneyLentWallet,
} from "@/lib/clara-wallet-money-semantics";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { WEEKLY_MONEY_CHECK_UPDATED_EVENT } from "@/lib/weeklyMoneyCheckState";
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

const SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";
const FLOW_VERSION = "weekly-money-check-chat-v5-confirm-first-money-lent";
const DIFFERENCE_EPSILON = 0.009;
const BELOW_MEANS_BADGE_ID = "below_your_means";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

function parseMoney(value) {
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value = 0) {
  const parsed = Number(value);
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getFirstName(user = {}) {
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

function sessionStorageKey(user) {
  return `${SESSION_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function writeWeeklySession(user, nextSession) {
  if (typeof window === "undefined" || !window.localStorage) return nextSession;
  const next = {
    ...(nextSession || {}),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(sessionStorageKey(user), JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(WEEKLY_MONEY_CHECK_UPDATED_EVENT, {
      detail: { type: "session_updated", session: next },
    })
  );
  return next;
}

function chatMessage(role, text) {
  return {
    id: `weekly-check-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text: String(text || "").trim(),
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

function ChoiceButton({ children, onClick, disabled = false, secondary = false }) {
  const tone = secondary
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

function getDirectionChoices(snapshot) {
  const difference = Number(snapshot?.difference) || 0;

  if (snapshot?.isMoneyLent) {
    if (difference > 0) {
      return [
        { id: "lent_more", label: "They borrowed more" },
        { id: "lent_adjustment", label: "The amount changed" },
        { id: "other", label: "Something else" },
        { id: "unknown", label: "I’m not sure" },
      ];
    }
    return [
      { id: "lent_repayment", label: "They paid me back" },
      { id: "lent_adjustment", label: "The amount changed" },
      { id: "other", label: "Something else" },
      { id: "unknown", label: "I’m not sure" },
    ];
  }

  if (difference > 0) {
    return [
      { id: "money_in", label: "Money came in" },
      { id: "transfer_in", label: "I transferred money here" },
      { id: "refund", label: "Refund or reimbursement" },
      { id: "other", label: "Something else" },
      { id: "unknown", label: "I’m not sure" },
    ];
  }

  return [
    { id: "spent", label: "I spent it" },
    { id: "transfer_out", label: "I transferred money" },
    { id: "cash_withdrawal", label: "I withdrew cash" },
    { id: "other", label: "Something else" },
    { id: "unknown", label: "I’m not sure" },
  ];
}

function getMismatchIndexes(snapshots = []) {
  return snapshots
    .map((snapshot, index) => ({ snapshot, index }))
    .filter(({ snapshot }) => Math.abs(Number(snapshot?.difference) || 0) > DIFFERENCE_EPSILON)
    .map(({ index }) => index);
}

function getWeeklyFlow(transactionHubSnapshot) {
  const records = Array.isArray(transactionHubSnapshot?.thisWeekTransactions)
    ? transactionHubSnapshot.thisWeekTransactions
    : [];
  let moneyIn = 0;
  let moneyOut = 0;

  records.forEach((record) => {
    const amount = Math.abs(Number(record?.amount) || 0);
    if (record?.group === "income") moneyIn += amount;
    if (record?.group === "expense" || record?.group === "savings") moneyOut += amount;
  });

  const canJudgeBelowMeans = moneyIn > DIFFERENCE_EPSILON;
  return {
    records,
    moneyIn,
    moneyOut,
    netFlow: moneyIn - moneyOut,
    canJudgeBelowMeans,
    belowMeansAchieved: canJudgeBelowMeans && moneyOut <= moneyIn + DIFFERENCE_EPSILON,
  };
}

function getWalletKnownActivity(records = [], walletName = "") {
  const target = clean(walletName).toLowerCase();
  const activity = { incoming: 0, outgoing: 0 };
  if (!target) return activity;

  records.forEach((record) => {
    const amount = Math.abs(Number(record?.amount) || 0);
    const group = clean(record?.group);
    const wallet = clean(record?.walletName).toLowerCase();
    const fromWallet = clean(record?.fromWalletName).toLowerCase();
    const toWallet = clean(record?.toWalletName).toLowerCase();

    if (group === "transfer") {
      if (fromWallet === target) activity.outgoing += amount;
      if (toWallet === target) activity.incoming += amount;
      return;
    }
    if (wallet !== target) return;
    if (group === "expense" || group === "savings") activity.outgoing += amount;
    if (group === "income") activity.incoming += amount;
  });

  return activity;
}

function enrichSnapshotsWithKnownActivity(snapshots, weeklyRecords) {
  return snapshots.map((snapshot) => ({
    ...snapshot,
    knownActivity: getWalletKnownActivity(weeklyRecords, snapshot.walletName),
  }));
}

function buildOverviewCopy(firstName, snapshots, weeklyFlow) {
  const heldActualTotal = snapshots
    .filter((snapshot) => !snapshot?.isMoneyLent)
    .reduce((sum, snapshot) => sum + (Number(snapshot?.actualBalance) || 0), 0);
  const moneyLentActualTotal = snapshots
    .filter((snapshot) => snapshot?.isMoneyLent)
    .reduce((sum, snapshot) => sum + (Number(snapshot?.actualBalance) || 0), 0);
  const positionCopy = moneyLentActualTotal > DIFFERENCE_EPSILON
    ? `Your confirmed money currently in your wallets is ${money(heldActualTotal)}. You also have ${money(moneyLentActualTotal)} still owed to you as Money Lent.`
    : `Your confirmed money currently in your wallets is ${money(heldActualTotal)}.`;

  if (weeklyFlow.belowMeansAchieved) {
    const cushion = Math.max(0, weeklyFlow.moneyIn - weeklyFlow.moneyOut);
    return `I’ve finished comparing the wallets, ${firstName}. ${positionCopy} For this week, ${money(weeklyFlow.moneyIn)} came in and ${money(weeklyFlow.moneyOut)} went out, leaving ${money(cushion)} of room.`;
  }

  if (weeklyFlow.canJudgeBelowMeans) {
    const overBy = Math.max(0, weeklyFlow.moneyOut - weeklyFlow.moneyIn);
    return `I’ve finished comparing the wallets, ${firstName}. ${positionCopy} This week’s recorded money-out is ${money(overBy)} above recorded money-in, so I’ll focus on making the differences clear rather than judging the number by itself.`;
  }

  return `I’ve finished comparing the wallets, ${firstName}. ${positionCopy} I don’t have enough money-in recorded this week to make a fair Below Your Means call, so I won’t invent one.`;
}

function buildConcernCopy(snapshot) {
  const difference = Number(snapshot?.difference) || 0;
  const amount = money(Math.abs(difference));

  if (snapshot?.isMoneyLent) {
    if (difference < 0) {
      return `${snapshot.walletName} now owes you ${amount} less than CLARA had recorded. What changed?`;
    }
    return `${snapshot.walletName} now owes you ${amount} more than CLARA had recorded. What changed?`;
  }

  const activity = snapshot?.knownActivity || {};
  const pieces = [];
  if ((Number(activity.outgoing) || 0) > DIFFERENCE_EPSILON) {
    pieces.push(`${money(activity.outgoing)} already recorded going out`);
  }
  if ((Number(activity.incoming) || 0) > DIFFERENCE_EPSILON) {
    pieces.push(`${money(activity.incoming)} already recorded coming in`);
  }
  const known = pieces.length
    ? `I already accounted for ${pieces.join(" and ")}.`
    : "I checked the activity already logged for this wallet first.";

  if (difference < 0) {
    return `Your ${snapshot.walletName} is still ${amount} lower than CLARA can explain. ${known} What happened to the remaining ${amount}?`;
  }
  return `Your ${snapshot.walletName} is still ${amount} higher than CLARA can explain. ${known} Where did the remaining ${amount} come from?`;
}

function walletConfirmationQuestion(snapshot) {
  const recorded = money(snapshot?.recordedBalance);
  if (snapshot?.isMoneyLent) {
    return `CLARA has ${recorded} recorded as still owed to you by ${snapshot.walletName}. Is that still correct?`;
  }
  return `CLARA has ${recorded} recorded in ${snapshot.walletName}. Is that still correct?`;
}

function walletExactAmountQuestion(snapshot) {
  if (snapshot?.isMoneyLent) {
    return `Okay. How much does ${snapshot.walletName} still owe you right now?`;
  }
  return `Okay. What is the exact ${snapshot.walletName} balance right now?`;
}

function walletConfirmedCopy(snapshot, actualBalance) {
  if (snapshot?.isMoneyLent) {
    return `Got it — ${money(actualBalance)} is still owed to you by ${snapshot.walletName}.`;
  }
  return `Got it — ${snapshot.walletName} is ${money(actualBalance)}.`;
}

function mergeTrailingAssistant(messages = [], text = "") {
  const list = Array.isArray(messages) ? messages : [];
  const last = list[list.length - 1];
  if (last?.role !== "assistant") return [...list, chatMessage("assistant", text)];
  return [
    ...list.slice(0, -1),
    { ...last, text: `${String(last.text || "").trim()}\n\n${String(text || "").trim()}` },
  ];
}

export default function ClaraWeeklyMoneyCheckOverlayV2({
  isActive = false,
  claraAssistantContext = {},
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = getFirstName(user);
  const activeWallets = useMemo(
    () =>
      (Array.isArray(claraAssistantContext?.wallets) ? claraAssistantContext.wallets : [])
        .filter(isActiveWalletForMoneySemantics)
        .map((wallet) => ({
          walletId: getWalletId(wallet),
          walletName: getWalletName(wallet) || "wallet",
          recordedBalance: getWalletCurrentBalance(wallet),
          isMoneyLent: isMoneyLentWallet(wallet),
        })),
    [claraAssistantContext?.wallets]
  );
  const weeklyFlow = useMemo(
    () => getWeeklyFlow(claraAssistantContext?.transactionHubSnapshot),
    [claraAssistantContext?.transactionHubSnapshot]
  );

  const [phase, setPhase] = useState("opening");
  const [messages, setMessages] = useState([]);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [interactionReady, setInteractionReady] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [reviewWalletIndex, setReviewWalletIndex] = useState(-1);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const viewportRef = useRef(null);
  const latestAssistantRef = useRef(null);
  const actionRef = useRef(null);
  const timerIdsRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const sequenceRef = useRef([]);
  const sequencePhaseRef = useRef("wallet_confirm");
  const sequenceTokenRef = useRef(0);
  const sequenceCompleteRef = useRef(null);
  const pendingReviewRef = useRef(null);
  const previousActiveRef = useRef(false);

  const currentSnapshot = snapshots[currentWalletIndex] || null;
  const currentReviewSnapshot = reviewWalletIndex >= 0 ? snapshots[reviewWalletIndex] : null;

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
    sequenceCompleteRef.current = null;
    pendingReviewRef.current = null;
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
      const completed = sequenceCompleteRef.current;
      sequenceCompleteRef.current = null;
      registerTimeout(() => {
        if (token !== sequenceTokenRef.current) return;
        if (completed) completed();
        else setInteractionReady(true);
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
    const replies = replyTexts.map((text) => String(text || "").trim()).filter(Boolean);
    const token = sequenceTokenRef.current;
    sequenceRef.current = replies;
    sequencePhaseRef.current = nextPhase;
    sequenceCompleteRef.current = typeof options.onComplete === "function" ? options.onComplete : null;
    setPhase("responding");
    setInteractionReady(false);
    queueNextAssistantMessage(token, options.skipInitialDelay === true);
  };

  const buildSession = (next = {}) => ({
    conversationVersion: FLOW_VERSION,
    status: next.status || "in_progress",
    startedAt: next.startedAt || new Date().toISOString(),
    completedAt: next.completedAt ?? null,
    phase: next.phase ?? phase,
    conversationMessages: next.messages ?? messages,
    walletSnapshots: next.snapshots ?? snapshots,
    currentWalletIndex: next.currentWalletIndex ?? currentWalletIndex,
    reviewWalletIndex: next.reviewWalletIndex ?? reviewWalletIndex,
    checkedWallets: next.checkedWallets ?? snapshots.filter((snapshot) => snapshot.actualBalance !== null).length,
    totalWallets: next.totalWallets ?? snapshots.length,
    ...(next.extra || {}),
  });

  const persist = (next = {}) => writeWeeklySession(user, buildSession(next));

  const resetLocalState = () => {
    setPhase("opening");
    setMessages([]);
    setPendingMessage(null);
    setTypedText("");
    setInteractionReady(false);
    setSnapshots([]);
    setCurrentWalletIndex(0);
    setReviewWalletIndex(-1);
    setInput("");
    setError("");
  };

  const startOpeningConversation = () => {
    cancelConversationPacing();
    resetLocalState();

    if (!activeWallets.length) {
      writeWeeklySession(user, {
        conversationVersion: FLOW_VERSION,
        status: "idle",
        startedAt: null,
        completedAt: null,
        phase: "no_wallets",
        conversationMessages: [],
        walletSnapshots: [],
        currentWalletIndex: 0,
        reviewWalletIndex: -1,
        checkedWallets: 0,
        totalWallets: 0,
      });
      runAssistantSequence(
        [
          `Hi ${firstName}! 👋`,
          "Weekly Cross-Check is open.",
          "I can’t find an active wallet to check yet. Add a wallet first, then come back here.",
        ],
        "no_wallets"
      );
      return;
    }

    const nextSnapshots = activeWallets.map((wallet) => ({
      ...wallet,
      actualBalance: null,
      difference: null,
      explanation: null,
      knownActivity: null,
      checkedAt: null,
    }));
    const startedAt = new Date().toISOString();
    setSnapshots(nextSnapshots);
    setCurrentWalletIndex(0);
    writeWeeklySession(user, {
      conversationVersion: FLOW_VERSION,
      status: "in_progress",
      startedAt,
      completedAt: null,
      phase: "wallet_confirm",
      conversationMessages: [],
      walletSnapshots: nextSnapshots,
      currentWalletIndex: 0,
      reviewWalletIndex: -1,
      checkedWallets: 0,
      totalWallets: nextSnapshots.length,
    });
    runAssistantSequence(
      [
        `Hi ${firstName}! 👋`,
        "Weekly Cross-Check is open.",
        "I’ll show what CLARA currently has for each wallet. If it’s right, just tap Yes. If not, tell me the exact amount.",
        walletConfirmationQuestion(nextSnapshots[0]),
      ],
      "wallet_confirm"
    );
  };

  const markCompleted = (nextSnapshots, nextMessages = messages) => {
    const mismatchIndexes = getMismatchIndexes(nextSnapshots);
    const unexplainedAmount = mismatchIndexes.reduce((sum, index) => {
      const snapshot = nextSnapshots[index];
      return snapshot?.explanation?.kind === "unknown"
        ? sum + Math.abs(Number(snapshot?.difference) || 0)
        : sum;
    }, 0);
    const recordedWalletTotal = nextSnapshots.reduce(
      (sum, snapshot) => sum + (Number(snapshot?.recordedBalance) || 0),
      0
    );
    const actualWalletTotal = nextSnapshots.reduce(
      (sum, snapshot) => sum + (Number(snapshot?.actualBalance) || 0),
      0
    );
    const badge = weeklyFlow.belowMeansAchieved
      ? { id: BELOW_MEANS_BADGE_ID, label: "Below Your Means", earnedAt: new Date().toISOString() }
      : null;
    const completedAt = new Date().toISOString();

    setSnapshots(nextSnapshots);
    writeWeeklySession(user, {
      conversationVersion: FLOW_VERSION,
      status: "completed",
      startedAt: buildSession().startedAt,
      completedAt,
      phase: "completed",
      conversationMessages: nextMessages,
      walletSnapshots: nextSnapshots,
      currentWalletIndex: nextSnapshots.length,
      reviewWalletIndex: -1,
      checkedWallets: nextSnapshots.length,
      totalWallets: nextSnapshots.length,
      recordedWalletTotal,
      actualWalletTotal,
      unexplainedAmount,
      mismatchedWallets: mismatchIndexes.length,
      weeklyMoneyIn: weeklyFlow.moneyIn,
      weeklyMoneyOut: weeklyFlow.moneyOut,
      weeklyNetFlow: weeklyFlow.netFlow,
      belowMeansAchieved: weeklyFlow.belowMeansAchieved,
      weeklyBadge: badge,
    });

    const closingCopy = unexplainedAmount > DIFFERENCE_EPSILON
      ? `Cross-check complete. ${money(unexplainedAmount)} is still unexplained, so I kept the reason honest instead of guessing. Your confirmed wallet balances will be aligned to the actual amounts you gave me.`
      : "Cross-check complete. The differences are explained, and your confirmed wallet balances will be aligned to the actual amounts you gave me.";

    runAssistantSequence([closingCopy], "completed");
  };

  const moveToNextDifference = (nextSnapshots, fromIndex, nextMessages = messages) => {
    const nextIndex = getMismatchIndexes(nextSnapshots).find((index) => index > fromIndex);
    if (nextIndex === undefined) {
      markCompleted(nextSnapshots, nextMessages);
      return;
    }

    setSnapshots(nextSnapshots);
    setReviewWalletIndex(nextIndex);
    persist({
      phase: "classify_difference",
      snapshots: nextSnapshots,
      reviewWalletIndex: nextIndex,
      messages: nextMessages,
    });
    runAssistantSequence([buildConcernCopy(nextSnapshots[nextIndex])], "classify_difference");
  };

  const beginReview = (rawSnapshots, nextMessages = messages) => {
    const nextSnapshots = enrichSnapshotsWithKnownActivity(rawSnapshots, weeklyFlow.records);
    const mismatchIndexes = getMismatchIndexes(nextSnapshots);
    const overview = buildOverviewCopy(firstName, nextSnapshots, weeklyFlow);
    setSnapshots(nextSnapshots);

    if (!mismatchIndexes.length) {
      persist({ phase: "reviewing", snapshots: nextSnapshots, messages: nextMessages });
      runAssistantSequence(
        [overview, "Everything lines up. The activity already recorded explains your wallets."],
        "reviewing",
        { onComplete: () => markCompleted(nextSnapshots, nextMessages) }
      );
      return;
    }

    const firstIndex = mismatchIndexes[0];
    setReviewWalletIndex(firstIndex);
    persist({
      phase: "classify_difference",
      snapshots: nextSnapshots,
      reviewWalletIndex: firstIndex,
      messages: nextMessages,
    });
    runAssistantSequence([overview, buildConcernCopy(nextSnapshots[firstIndex])], "classify_difference");
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
      resetLocalState();
    }
    previousActiveRef.current = isActive;
  }, [isActive, firstName, activeWallets]);

  useEffect(() => () => {
    sequenceTokenRef.current += 1;
    clearPacingTimers();
  }, []);

  const controlsReady = interactionReady && !pendingMessage && phase !== "responding";
  const typingMessageId = pendingMessage?.id || null;
  const readLocked = phase === "responding" && !pendingMessage && !interactionReady;
  const interactionLocked = Boolean(typingMessageId) || readLocked || !controlsReady;
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
    const shouldCancelSession = phase !== "completed" && phase !== "no_wallets";
    cancelConversationPacing();
    if (shouldCancelSession) {
      writeWeeklySession(user, {
        conversationVersion: FLOW_VERSION,
        status: "idle",
        startedAt: null,
        completedAt: null,
        phase: "idle",
        conversationMessages: [],
        walletSnapshots: [],
        currentWalletIndex: 0,
        reviewWalletIndex: -1,
        checkedWallets: 0,
        totalWallets: activeWallets.length,
      });
    }
    resetLocalState();
    onClose?.();
  };

  const confirmCurrentWallet = (stillCorrect) => {
    if (!controlsReady || phase !== "wallet_confirm") return;
    const current = snapshots[currentWalletIndex];
    if (!current) return;

    if (!stillCorrect) {
      const userMessage = chatMessage("user", "No, it changed");
      append(userMessage);
      setInput("");
      setError("");
      persist({
        phase: "wallet_entry",
        currentWalletIndex,
        messages: [...messages, userMessage],
      });
      runAssistantSequence([walletExactAmountQuestion(current)], "wallet_entry");
      return;
    }

    const actualBalance = Math.max(Number(current.recordedBalance) || 0, 0);
    const nextSnapshots = snapshots.map((snapshot, index) =>
      index === currentWalletIndex
        ? {
            ...snapshot,
            actualBalance,
            difference: 0,
            explanation: null,
            checkedAt: new Date().toISOString(),
          }
        : snapshot
    );
    const nextIndex = currentWalletIndex + 1;
    const userLabel = current.isMoneyLent
      ? `Yes, still ${money(actualBalance)} owed`
      : `Yes, still ${money(actualBalance)}`;
    const userMessage = chatMessage("user", userLabel);
    append(userMessage);
    setSnapshots(nextSnapshots);
    setError("");

    if (nextIndex < nextSnapshots.length) {
      setCurrentWalletIndex(nextIndex);
      persist({
        phase: "wallet_confirm",
        snapshots: nextSnapshots,
        currentWalletIndex: nextIndex,
        checkedWallets: nextIndex,
        messages: [...messages, userMessage],
      });
      runAssistantSequence(
        [walletConfirmedCopy(current, actualBalance), walletConfirmationQuestion(nextSnapshots[nextIndex])],
        "wallet_confirm"
      );
      return;
    }

    setCurrentWalletIndex(nextIndex);
    persist({
      phase: "reviewing",
      snapshots: nextSnapshots,
      currentWalletIndex: nextIndex,
      checkedWallets: nextIndex,
      messages: [...messages, userMessage],
    });
    runAssistantSequence(
      [walletConfirmedCopy(current, actualBalance), "I’ve checked all your wallets. I’m comparing them with CLARA’s records now."],
      "reviewing",
      { onComplete: () => beginReview(nextSnapshots, [...messages, userMessage]) }
    );
  };

  const submitWalletBalance = () => {
    if (!controlsReady || phase !== "wallet_entry") return;
    const actualBalance = parseMoney(input);
    if (actualBalance === null || actualBalance < 0) {
      setError("Enter the exact amount as a number.");
      return;
    }
    const current = snapshots[currentWalletIndex];
    if (!current) return;

    const nextSnapshots = snapshots.map((snapshot, index) =>
      index === currentWalletIndex
        ? {
            ...snapshot,
            actualBalance,
            difference: actualBalance - (Number(snapshot.recordedBalance) || 0),
            explanation: null,
            checkedAt: new Date().toISOString(),
          }
        : snapshot
    );
    const nextIndex = currentWalletIndex + 1;
    const userMessage = chatMessage("user", money(actualBalance));
    append(userMessage);
    setInput("");
    setError("");
    setSnapshots(nextSnapshots);

    if (nextIndex < nextSnapshots.length) {
      setCurrentWalletIndex(nextIndex);
      persist({
        phase: "wallet_confirm",
        snapshots: nextSnapshots,
        currentWalletIndex: nextIndex,
        checkedWallets: nextIndex,
        messages: [...messages, userMessage],
      });
      runAssistantSequence(
        [walletConfirmedCopy(current, actualBalance), walletConfirmationQuestion(nextSnapshots[nextIndex])],
        "wallet_confirm"
      );
      return;
    }

    setCurrentWalletIndex(nextIndex);
    persist({
      phase: "reviewing",
      snapshots: nextSnapshots,
      currentWalletIndex: nextIndex,
      checkedWallets: nextIndex,
      messages: [...messages, userMessage],
    });
    runAssistantSequence(
      [walletConfirmedCopy(current, actualBalance), "I’ve checked all your wallets. I’m comparing them with CLARA’s records now."],
      "reviewing",
      { onComplete: () => beginReview(nextSnapshots, [...messages, userMessage]) }
    );
  };

  const backWallet = () => {
    if (!controlsReady || phase !== "wallet_entry") return;
    const current = snapshots[currentWalletIndex];
    if (!current) return;
    setInput("");
    setError("");
    append(chatMessage("user", "Back"));
    persist({ phase: "wallet_confirm", currentWalletIndex });
    runAssistantSequence([walletConfirmationQuestion(current)], "wallet_confirm");
  };

  const handleChoice = (choice) => {
    if (!controlsReady || phase !== "classify_difference" || !currentReviewSnapshot) return;
    const userMessage = chatMessage("user", choice.label);
    append(userMessage);

    if (choice.id === "spent" || choice.id === "other") {
      const nextPhase = choice.id === "spent" ? "forgotten_spend_detail" : "other_detail";
      setError("");
      persist({ phase: nextPhase, messages: [...messages, userMessage] });
      runAssistantSequence(
        [
          choice.id === "spent"
            ? `Okay. What did you spend the remaining ${money(Math.abs(Number(currentReviewSnapshot.difference) || 0))} on?`
            : "Okay. Tell me briefly what happened to that remaining difference.",
        ],
        nextPhase
      );
      return;
    }

    const nextSnapshots = snapshots.map((snapshot, index) =>
      index === reviewWalletIndex
        ? {
            ...snapshot,
            explanation: {
              kind: choice.id,
              capturedAt: new Date().toISOString(),
            },
          }
        : snapshot
    );
    const reply = choice.id === "unknown"
      ? "That’s okay. I’ll keep the reason unexplained instead of inventing one."
      : choice.id.includes("transfer")
        ? "Got it. I’ll keep that as a transfer explanation, not as spending."
        : "Got it. I’ve captured that explanation for this cross-check.";
    persist({ snapshots: nextSnapshots, messages: [...messages, userMessage] });
    runAssistantSequence([reply], "reviewing", {
      onComplete: () => moveToNextDifference(nextSnapshots, reviewWalletIndex, [...messages, userMessage]),
    });
  };

  const submitDetail = () => {
    if (!controlsReady || !["forgotten_spend_detail", "other_detail"].includes(phase)) return;
    const note = clean(input);
    if (!note) return;
    const currentIndex = reviewWalletIndex;
    const kind = phase === "forgotten_spend_detail" ? "unrecorded_spending" : "other";
    const userMessage = chatMessage("user", note);
    const nextSnapshots = snapshots.map((snapshot, index) =>
      index === currentIndex
        ? {
            ...snapshot,
            explanation: { kind, note, capturedAt: new Date().toISOString() },
          }
        : snapshot
    );
    append(userMessage);
    setInput("");
    setError("");
    persist({ snapshots: nextSnapshots, messages: [...messages, userMessage] });
    runAssistantSequence(
      [kind === "unrecorded_spending" ? "Got it. I’ll keep that as the explanation for this difference." : "Got it. I’ve kept that explanation with this week’s cross-check."],
      "reviewing",
      { onComplete: () => moveToNextDifference(nextSnapshots, currentIndex, [...messages, userMessage]) }
    );
  };

  const backDetail = () => {
    if (!controlsReady || !["forgotten_spend_detail", "other_detail"].includes(phase)) return;
    setInput("");
    setError("");
    append(chatMessage("user", "Back"));
    runAssistantSequence([buildConcernCopy(currentReviewSnapshot)], "classify_difference");
  };

  const recheckReviewWallet = () => {
    if (!controlsReady || phase !== "classify_difference" || reviewWalletIndex < 0) return;
    const target = snapshots[reviewWalletIndex];
    const nextSnapshots = snapshots.map((snapshot, index) =>
      index >= reviewWalletIndex
        ? { ...snapshot, actualBalance: null, difference: null, explanation: null, checkedAt: null }
        : snapshot
    );
    setSnapshots(nextSnapshots);
    setCurrentWalletIndex(reviewWalletIndex);
    setReviewWalletIndex(-1);
    setInput("");
    setError("");
    append(chatMessage("user", "Back"));
    persist({
      phase: "wallet_confirm",
      snapshots: nextSnapshots,
      currentWalletIndex: reviewWalletIndex,
      reviewWalletIndex: -1,
      checkedWallets: reviewWalletIndex,
    });
    runAssistantSequence([walletConfirmationQuestion(target)], "wallet_confirm");
  };

  const showComposer = controlsReady && ["wallet_entry", "forgotten_spend_detail", "other_detail"].includes(phase);

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/96 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-weekly-money-check="true"
      data-clara-weekly-cross-check-chat="true"
      data-clara-conversation-pacing="masterclass"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,0.12),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />
      <ClaraChatHeader
        title="Weekly Cross-Check"
        tagline="Verify · Reconcile · Stay accountable"
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
            {phase === "wallet_confirm" && currentSnapshot && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2.5">
                <ChoiceButton onClick={() => confirmCurrentWallet(true)}>
                  {currentSnapshot.isMoneyLent
                    ? `Yes, still ${money(currentSnapshot.recordedBalance)} owed`
                    : `Yes, still ${money(currentSnapshot.recordedBalance)}`}
                </ChoiceButton>
                <ChoiceButton secondary onClick={() => confirmCurrentWallet(false)}>No, it changed</ChoiceButton>
              </div>
            ) : null}

            {phase === "classify_difference" && currentReviewSnapshot && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2.5">
                {getDirectionChoices(currentReviewSnapshot).map((choice) => (
                  <ChoiceButton key={choice.id} onClick={() => handleChoice(choice)}>{choice.label}</ChoiceButton>
                ))}
                <ChoiceButton secondary onClick={recheckReviewWallet}>Back</ChoiceButton>
              </div>
            ) : null}

            {phase === "completed" && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2.5">
                <ChoiceButton onClick={closeChat}>Done</ChoiceButton>
              </div>
            ) : null}

            {phase === "no_wallets" && controlsReady ? (
              <div className="relative z-20 mt-1 grid gap-2.5">
                <ChoiceButton secondary onClick={closeChat}>Done</ChoiceButton>
              </div>
            ) : null}

            {showComposer ? (
              <div className="mt-auto grid gap-2.5 pt-3">
                <Composer
                  value={input}
                  onChange={(value) => { setInput(value); setError(""); }}
                  onSubmit={phase === "wallet_entry" ? submitWalletBalance : submitDetail}
                  placeholder={phase === "wallet_entry" ? (currentSnapshot?.isMoneyLent ? "Amount still owed" : "Exact wallet balance") : "Tell CLARA what happened"}
                  inputMode={phase === "wallet_entry" ? "decimal" : "text"}
                  disabled={interactionLocked}
                />
                {phase === "wallet_entry" ? (
                  <ChoiceButton secondary onClick={backWallet}>Back</ChoiceButton>
                ) : (
                  <ChoiceButton secondary onClick={backDetail}>Back</ChoiceButton>
                )}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[18px] border border-rose-300/14 bg-rose-500/[0.07] px-3 py-2.5 text-[11px] font-bold text-rose-100/82">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
