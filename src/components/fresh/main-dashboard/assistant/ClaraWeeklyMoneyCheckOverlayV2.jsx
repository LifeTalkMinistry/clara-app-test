import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import {
  getWalletCurrentBalance,
  getWalletId,
  getWalletName,
  isActiveWalletForMoneySemantics,
} from "@/lib/clara-wallet-money-semantics";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import {
  readWeeklyMoneyCheckState,
  WEEKLY_MONEY_CHECK_UPDATED_EVENT,
} from "@/lib/weeklyMoneyCheckState";

const SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";
const FLOW_VERSION = "weekly-money-check-chat-v1";
const DIFFERENCE_EPSILON = 0.009;
const BELOW_MEANS_BADGE_ID = "below_your_means";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function displayText(value = "") {
  return String(value || "").trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase();
}

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
  if (email.includes("@")) return email.split("@")[0];
  return "there";
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

function message(role, text, options = {}) {
  return {
    id: `weekly-check-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    animate: options.animate ?? role === "assistant",
  };
}

function restoreMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).map((entry) => ({
    ...entry,
    animate: false,
  }));
}

function getMismatchIndexes(snapshots = []) {
  return snapshots
    .map((snapshot, index) => ({ snapshot, index }))
    .filter(({ snapshot }) => Math.abs(Number(snapshot?.difference) || 0) > DIFFERENCE_EPSILON)
    .map(({ index }) => index);
}

function nextQuestionCopy(snapshot) {
  return `Next, let’s check your ${snapshot.walletName}. How much do you actually have there right now?`;
}

function openingWalletQuestion(snapshot) {
  return `Great. Let’s start with your ${snapshot.walletName}. Can you check your actual ${snapshot.walletName} balance right now and tell me how much is there?`;
}

function getDirectionChoices(snapshot) {
  const difference = Number(snapshot?.difference) || 0;
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
  const belowMeansAchieved = canJudgeBelowMeans && moneyOut <= moneyIn + DIFFERENCE_EPSILON;

  return {
    records,
    moneyIn,
    moneyOut,
    netFlow: moneyIn - moneyOut,
    canJudgeBelowMeans,
    belowMeansAchieved,
  };
}

function getWalletKnownActivity(records = [], walletName = "") {
  const target = normalize(walletName);
  const activity = {
    incoming: 0,
    outgoing: 0,
    count: 0,
    expenseCount: 0,
    transferCount: 0,
    incomeCount: 0,
  };

  if (!target) return activity;

  records.forEach((record) => {
    const amount = Math.abs(Number(record?.amount) || 0);
    const group = clean(record?.group);
    const wallet = normalize(record?.walletName);
    const fromWallet = normalize(record?.fromWalletName);
    const toWallet = normalize(record?.toWalletName);

    if (group === "transfer") {
      let touched = false;
      if (fromWallet === target) {
        activity.outgoing += amount;
        touched = true;
      }
      if (toWallet === target) {
        activity.incoming += amount;
        touched = true;
      }
      if (touched) {
        activity.count += 1;
        activity.transferCount += 1;
      }
      return;
    }

    if (wallet !== target) return;

    if (group === "expense" || group === "savings") {
      activity.outgoing += amount;
      activity.count += 1;
      activity.expenseCount += 1;
      return;
    }

    if (group === "income") {
      activity.incoming += amount;
      activity.count += 1;
      activity.incomeCount += 1;
    }
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
  const recordedTotal = snapshots.reduce(
    (sum, snapshot) => sum + (Number(snapshot?.recordedBalance) || 0),
    0
  );
  const actualTotal = snapshots.reduce(
    (sum, snapshot) => sum + (Number(snapshot?.actualBalance) || 0),
    0
  );
  const matchedCount = snapshots.filter(
    (snapshot) => Math.abs(Number(snapshot?.difference) || 0) <= DIFFERENCE_EPSILON
  ).length;

  const totalLine = `Across all your wallets, you actually have ${money(actualTotal)} right now. CLARA currently has ${money(recordedTotal)} recorded.`;
  const recordsLine = `${matchedCount} of ${snapshots.length} wallet${snapshots.length === 1 ? "" : "s"} already reconcile with the activity you logged, so I won’t ask you to explain those again.`;

  if (weeklyFlow.belowMeansAchieved) {
    const cushion = Math.max(0, weeklyFlow.moneyIn - weeklyFlow.moneyOut);
    return `Great job, ${firstName}! 🎉\n\n${totalLine}\n\nFor this week’s recorded money flow, ${money(weeklyFlow.moneyIn)} came in and ${money(weeklyFlow.moneyOut)} went out. You stayed ${money(cushion)} below your means.\n\nGREAT JOB! You earned your “Below Your Means” badge for this week. 🏅\n\n${recordsLine}`;
  }

  if (weeklyFlow.canJudgeBelowMeans) {
    const overBy = Math.max(0, weeklyFlow.moneyOut - weeklyFlow.moneyIn);
    return `Great — I’ve finished the wallet check, ${firstName}.\n\n${totalLine}\n\nFor this week’s recorded money flow, ${money(weeklyFlow.moneyIn)} came in and ${money(weeklyFlow.moneyOut)} went out. That is ${money(overBy)} above this week’s recorded money-in. I’m not going to judge that number by itself — we’ll just make sure everything is explained correctly.\n\n${recordsLine}`;
  }

  return `Great — I’ve finished the wallet check, ${firstName}.\n\n${totalLine}\n\nI don’t have enough actual money-in recorded for this week to fairly decide a “Below Your Means” result, so I won’t invent one.\n\n${recordsLine}`;
}

function buildConcernCopy(snapshot) {
  const difference = Number(snapshot?.difference) || 0;
  const amount = money(Math.abs(difference));
  const activity = snapshot?.knownActivity || {};
  const activityPieces = [];

  if ((Number(activity.outgoing) || 0) > DIFFERENCE_EPSILON) {
    activityPieces.push(`${money(activity.outgoing)} recorded going out`);
  }
  if ((Number(activity.incoming) || 0) > DIFFERENCE_EPSILON) {
    activityPieces.push(`${money(activity.incoming)} recorded coming in`);
  }

  const knownCopy = activityPieces.length
    ? `I already accounted for ${activityPieces.join(" and ")} in this wallet this week.`
    : `I checked the activity already logged for this wallet first.`;

  if (difference < 0) {
    return `There is just one thing I want to cross-check. Your ${snapshot.walletName} is still ${amount} lower than CLARA can explain. ${knownCopy} After those records, this ${amount} is still not accounted for. What happened to it?`;
  }

  return `There is just one thing I want to cross-check. Your ${snapshot.walletName} is still ${amount} higher than CLARA can explain. ${knownCopy} After those records, this ${amount} is still not accounted for. Where did it come from?`;
}

function WeeklyHeader({ onClose }) {
  return (
    <header className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_52%,rgba(35,10,28,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffd84a]/88">CLARA MONEY TOOLS</p>
      <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Weekly Money Check</h1>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Check · Compare · Understand</p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95"
        aria-label="Close Weekly Money Check"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}

function TypewriterText({ text, speed = 19, onComplete, className = "" }) {
  const fullText = displayText(text);
  const [visible, setVisible] = useState("");
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setVisible("");
    let cancelled = false;
    let index = 0;
    let timerId = 0;

    const tick = () => {
      if (cancelled) return;
      index = Math.min(fullText.length, index + 2);
      setVisible(fullText.slice(0, index));
      if (index >= fullText.length) {
        completeRef.current?.();
        return;
      }
      const lastChar = fullText[index - 1] || "";
      const delay = /[.!?]/.test(lastChar) ? 75 : /[,;:]/.test(lastChar) ? 42 : speed;
      timerId = window.setTimeout(tick, delay);
    };

    timerId = window.setTimeout(tick, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [fullText, speed]);

  return <span className={className}>{visible}<span className="ml-0.5 inline-block h-[1em] w-[1.5px] animate-pulse bg-white/55 align-[-0.12em]" /></span>;
}

function WeeklyEntryBoard({ firstName, onStart, onClose }) {
  const [ready, setReady] = useState(false);
  return (
    <section
      data-clara-pause-entry-board="true"
      data-clara-buy-check-board="true"
      className="relative overflow-hidden rounded-[30px] border border-blue-200/20 bg-[#061226]/78 px-6 pb-7 pt-7 text-center shadow-[0_26px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/52">WEEKLY CHECK-IN</p>
      <div className="mx-auto mt-4 flex min-h-[112px] max-w-[320px] items-center justify-center rounded-[22px] border border-blue-200/12 bg-black/20 px-5 py-4">
        <p className="text-[16px] font-extrabold leading-[1.48] text-white/94">
          <TypewriterText
            text={`Hi ${firstName}! Great job — you remembered your scheduled Weekly Money Check.`}
            onComplete={() => setReady(true)}
          />
        </p>
      </div>
      <div className={`mx-auto mt-5 max-w-[318px] text-center transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
        <strong className="block text-[16px] font-black leading-[1.4] text-white/95">Are you ready to start?</strong>
        <span className="mt-1.5 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">
          We’ll quickly check your real wallet balances one by one.
        </span>
      </div>
      <div className={`mt-5 grid grid-cols-2 gap-2.5 transition-opacity duration-300 ${ready ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" onClick={onStart} className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white">
          Yes, let’s start
        </button>
        <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-4 text-[12px] font-black text-white/82">
          Not right now
        </button>
      </div>
    </section>
  );
}

function MessageRow({ entry, onTypingComplete }) {
  const isUser = entry?.role === "user";
  const bubbleRef = useRef(null);
  const fullText = displayText(entry?.text);
  const shouldAnimate = !isUser && entry?.animate !== false;
  const [visibleText, setVisibleText] = useState(shouldAnimate ? "" : fullText);
  const completeRef = useRef(onTypingComplete);

  useEffect(() => {
    completeRef.current = onTypingComplete;
  }, [onTypingComplete]);

  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleText(fullText);
      return undefined;
    }

    setVisibleText("");
    let cancelled = false;
    let index = 0;
    let timerId = 0;

    const tick = () => {
      if (cancelled) return;
      index = Math.min(fullText.length, index + 2);
      setVisibleText(fullText.slice(0, index));
      bubbleRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
      if (index >= fullText.length) {
        completeRef.current?.(entry.id);
        return;
      }
      const char = fullText[index - 1] || "";
      const delay = /[.!?]/.test(char) ? 72 : /[,;:]/.test(char) ? 38 : 17;
      timerId = window.setTimeout(tick, delay);
    };

    timerId = window.setTimeout(tick, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [entry?.id, fullText, shouldAnimate]);

  return (
    <div className={`flex min-w-0 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        ref={bubbleRef}
        className={`min-w-0 break-words [overflow-wrap:break-word] ${
          isUser
            ? "max-w-[86%] rounded-[24px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-[0_12px_28px_rgba(23,105,255,0.20)]"
            : "w-[94%] max-w-[94%] rounded-[26px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl"
        }`}
      >
        <span className="whitespace-pre-wrap">{visibleText}</span>
        {shouldAnimate && visibleText.length < fullText.length ? (
          <span className="ml-0.5 inline-block h-[1em] w-[1.5px] animate-pulse bg-white/55 align-[-0.12em]" />
        ) : null}
      </div>
    </div>
  );
}

function Composer({ phase, onSubmit, submitLocked = false }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const isMoney = phase === "wallet_entry";
  const placeholder = isMoney ? "Enter actual balance" : "Tell CLARA what happened";

  useEffect(() => {
    setDraft("");
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus?.({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const submit = (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || submitLocked) return;
    const accepted = onSubmit?.(value);
    if (accepted !== false) setDraft("");
  };

  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={submit}
      className="relative z-30 shrink-0 overflow-hidden rounded-[28px] border border-blue-200/16 bg-[#040b1a]/96 p-2.5"
    >
      <div className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#08142b]/94 px-3 py-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72"
          placeholder={placeholder}
          inputMode={isMoney ? "decimal" : "text"}
          aria-label={placeholder}
        />
        <button type="submit" disabled={!draft.trim() || submitLocked} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white disabled:opacity-40">
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}

function ChoiceBar({ phase, snapshot, onChoice, onClose, disabled = false }) {
  const wrapperClass = disabled ? "pointer-events-none opacity-35" : "";

  if (phase === "classify_difference") {
    return (
      <div className={`relative z-20 grid gap-2 px-1 pb-2 pt-1 ${wrapperClass}`}>
        {getDirectionChoices(snapshot).map((choice) => (
          <button key={choice.id} type="button" onClick={() => onChoice(choice.id, choice.label)} className="min-h-11 rounded-[18px] border border-blue-200/14 bg-[#07152d]/88 px-4 text-[12px] font-black text-white/90">
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  if (phase === "completed" || phase === "no_wallets") {
    return (
      <div className={`relative z-20 px-1 pb-2 pt-1 ${wrapperClass}`}>
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white">
          Done
        </button>
      </div>
    );
  }

  return null;
}

export default function ClaraWeeklyMoneyCheckOverlayV2({
  isActive = false,
  claraAssistantContext = {},
  onClose,
}) {
  const user = claraAssistantContext?.user || null;
  const firstName = getFirstName(user);
  const activeWallets = useMemo(
    () =>
      (Array.isArray(claraAssistantContext?.wallets) ? claraAssistantContext.wallets : [])
        .filter(isActiveWalletForMoneySemantics)
        .map((wallet) => ({
          walletId: getWalletId(wallet),
          walletName: getWalletName(wallet) || "wallet",
          recordedBalance: getWalletCurrentBalance(wallet),
        })),
    [claraAssistantContext?.wallets]
  );
  const weeklyFlow = useMemo(
    () => getWeeklyFlow(claraAssistantContext?.transactionHubSnapshot),
    [claraAssistantContext?.transactionHubSnapshot]
  );

  const [phase, setPhase] = useState("ready");
  const [messages, setMessages] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [reviewWalletIndex, setReviewWalletIndex] = useState(-1);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const previousActiveRef = useRef(false);

  const currentReviewSnapshot = reviewWalletIndex >= 0 ? snapshots[reviewWalletIndex] : null;
  const showComposer = ["wallet_entry", "forgotten_spend_detail", "other_detail"].includes(phase);
  const interactionLocked = Boolean(typingMessageId);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last?.animate !== false) {
      setTypingMessageId(last.id);
    } else {
      setTypingMessageId(null);
    }
  }, [messages]);

  const persist = (next = {}) => {
    const existing = readWeeklyMoneyCheckState(user)?.session || {};
    return writeWeeklySession(user, {
      ...existing,
      conversationVersion: FLOW_VERSION,
      phase: next.phase ?? phase,
      conversationMessages: next.messages ?? messages,
      walletSnapshots: next.snapshots ?? snapshots,
      currentWalletIndex: next.currentWalletIndex ?? currentWalletIndex,
      reviewWalletIndex: next.reviewWalletIndex ?? reviewWalletIndex,
      ...(next.extra || {}),
    });
  };

  const completeCheck = (nextSnapshots, nextMessages) => {
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
    const finalCopy = unexplainedAmount > DIFFERENCE_EPSILON
      ? `Done. I saved this Weekly Money Check. ${money(unexplainedAmount)} is still unexplained, and I left it that way instead of guessing. Nothing was deducted again during this check.`
      : `Done. I saved this Weekly Money Check. Everything we needed to cross-check now has an explanation, and nothing was deducted again during this check.`;
    const completedMessages = [...nextMessages, message("assistant", finalCopy)];
    const badge = weeklyFlow.belowMeansAchieved
      ? {
          id: BELOW_MEANS_BADGE_ID,
          label: "Below Your Means",
          earnedAt: new Date().toISOString(),
        }
      : null;

    setMessages(completedMessages);
    setSnapshots(nextSnapshots);
    setPhase("completed");
    persist({
      phase: "completed",
      messages: completedMessages,
      snapshots: nextSnapshots,
      extra: {
        status: "completed",
        checkedWallets: nextSnapshots.length,
        totalWallets: nextSnapshots.length,
        completedAt: new Date().toISOString(),
        recordedWalletTotal,
        actualWalletTotal,
        unexplainedAmount,
        mismatchedWallets: mismatchIndexes.length,
        weeklyMoneyIn: weeklyFlow.moneyIn,
        weeklyMoneyOut: weeklyFlow.moneyOut,
        weeklyNetFlow: weeklyFlow.netFlow,
        belowMeansAchieved: weeklyFlow.belowMeansAchieved,
        weeklyBadge: badge,
      },
    });
  };

  const beginReview = (rawSnapshots, priorMessages) => {
    const nextSnapshots = enrichSnapshotsWithKnownActivity(rawSnapshots, weeklyFlow.records);
    const mismatchIndexes = getMismatchIndexes(nextSnapshots);
    const overview = buildOverviewCopy(firstName, nextSnapshots, weeklyFlow);

    if (!mismatchIndexes.length) {
      const allGoodCopy = `${overview}\n\nEverything lines up. The activity you already logged explains the wallets, so I’m not going to make you repeat any of it.`;
      const allGoodMessages = [...priorMessages, message("assistant", allGoodCopy)];
      setSnapshots(nextSnapshots);
      setMessages(allGoodMessages);
      setPhase("completed");

      const recordedWalletTotal = nextSnapshots.reduce((sum, snapshot) => sum + (Number(snapshot?.recordedBalance) || 0), 0);
      const actualWalletTotal = nextSnapshots.reduce((sum, snapshot) => sum + (Number(snapshot?.actualBalance) || 0), 0);
      const badge = weeklyFlow.belowMeansAchieved
        ? { id: BELOW_MEANS_BADGE_ID, label: "Below Your Means", earnedAt: new Date().toISOString() }
        : null;

      persist({
        phase: "completed",
        messages: allGoodMessages,
        snapshots: nextSnapshots,
        extra: {
          status: "completed",
          checkedWallets: nextSnapshots.length,
          totalWallets: nextSnapshots.length,
          completedAt: new Date().toISOString(),
          recordedWalletTotal,
          actualWalletTotal,
          unexplainedAmount: 0,
          mismatchedWallets: 0,
          weeklyMoneyIn: weeklyFlow.moneyIn,
          weeklyMoneyOut: weeklyFlow.moneyOut,
          weeklyNetFlow: weeklyFlow.netFlow,
          belowMeansAchieved: weeklyFlow.belowMeansAchieved,
          weeklyBadge: badge,
        },
      });
      return;
    }

    const firstIndex = mismatchIndexes[0];
    const reviewCopy = `${overview}\n\n${buildConcernCopy(nextSnapshots[firstIndex])}`;
    const reviewMessages = [...priorMessages, message("assistant", reviewCopy)];

    setSnapshots(nextSnapshots);
    setMessages(reviewMessages);
    setReviewWalletIndex(firstIndex);
    setPhase("classify_difference");
    persist({
      phase: "classify_difference",
      messages: reviewMessages,
      snapshots: nextSnapshots,
      reviewWalletIndex: firstIndex,
      extra: {
        checkedWallets: nextSnapshots.length,
        totalWallets: nextSnapshots.length,
        weeklyMoneyIn: weeklyFlow.moneyIn,
        weeklyMoneyOut: weeklyFlow.moneyOut,
        weeklyNetFlow: weeklyFlow.netFlow,
        belowMeansAchieved: weeklyFlow.belowMeansAchieved,
        weeklyBadge: weeklyFlow.belowMeansAchieved
          ? { id: BELOW_MEANS_BADGE_ID, label: "Below Your Means", earnedAt: new Date().toISOString() }
          : null,
      },
    });
  };

  const moveToNextDifference = (nextSnapshots, nextMessages, fromIndex = reviewWalletIndex) => {
    const nextIndex = getMismatchIndexes(nextSnapshots).find((index) => index > fromIndex);
    if (nextIndex === undefined) {
      completeCheck(nextSnapshots, nextMessages);
      return;
    }

    const continuationMessages = [
      ...nextMessages,
      message("assistant", `Got it. I’ve saved that explanation for this week.\n\n${buildConcernCopy(nextSnapshots[nextIndex])}`),
    ];
    setSnapshots(nextSnapshots);
    setMessages(continuationMessages);
    setReviewWalletIndex(nextIndex);
    setPhase("classify_difference");
    persist({
      phase: "classify_difference",
      messages: continuationMessages,
      snapshots: nextSnapshots,
      reviewWalletIndex: nextIndex,
    });
  };

  useEffect(() => {
    if (isActive && !previousActiveRef.current) {
      const weeklyState = readWeeklyMoneyCheckState(user);
      const session = weeklyState?.session || {};
      const canResume =
        session?.conversationVersion === FLOW_VERSION &&
        Array.isArray(session?.walletSnapshots) &&
        Array.isArray(session?.conversationMessages);

      if (canResume && weeklyState?.key === "completed") {
        setSnapshots(session.walletSnapshots);
        setMessages(restoreMessages(session.conversationMessages));
        setCurrentWalletIndex(Number(session.currentWalletIndex) || 0);
        setReviewWalletIndex(Number.isInteger(session.reviewWalletIndex) ? session.reviewWalletIndex : -1);
        setPhase("completed");
      } else if (canResume && weeklyState?.key === "in_progress") {
        setSnapshots(session.walletSnapshots);
        setMessages(restoreMessages(session.conversationMessages));
        setCurrentWalletIndex(Number(session.currentWalletIndex) || 0);
        setReviewWalletIndex(Number.isInteger(session.reviewWalletIndex) ? session.reviewWalletIndex : -1);
        const restoredPhase = clean(session.phase) || "wallet_entry";
        setPhase(restoredPhase === "spending_recorded_check" ? "classify_difference" : restoredPhase);
      } else {
        setSnapshots([]);
        setMessages([]);
        setCurrentWalletIndex(0);
        setReviewWalletIndex(-1);
        setPhase("ready");
      }
    }

    if (!isActive && previousActiveRef.current) {
      setPhase("ready");
      setMessages([]);
      setSnapshots([]);
      setCurrentWalletIndex(0);
      setReviewWalletIndex(-1);
      setTypingMessageId(null);
    }

    previousActiveRef.current = isActive;
  }, [isActive, user]);

  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  if (!isActive) return null;

  const startCheck = () => {
    if (!activeWallets.length) {
      const noWalletMessages = [
        message("user", "Yes, let’s start", { animate: false }),
        message("assistant", "I can’t find an active wallet to check yet. Add a wallet first, then we can do your Weekly Money Check."),
      ];
      setMessages(noWalletMessages);
      setPhase("no_wallets");
      persist({
        phase: "no_wallets",
        messages: noWalletMessages,
        snapshots: [],
        extra: {
          status: "in_progress",
          startedAt: new Date().toISOString(),
          checkedWallets: 0,
          totalWallets: 0,
          completedAt: null,
        },
      });
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
    const startMessages = [
      message("user", "Yes, let’s start", { animate: false }),
      message("assistant", openingWalletQuestion(nextSnapshots[0])),
    ];

    setSnapshots(nextSnapshots);
    setMessages(startMessages);
    setCurrentWalletIndex(0);
    setReviewWalletIndex(-1);
    setPhase("wallet_entry");
    writeWeeklySession(user, {
      conversationVersion: FLOW_VERSION,
      status: "in_progress",
      startedAt: new Date().toISOString(),
      completedAt: null,
      phase: "wallet_entry",
      conversationMessages: startMessages,
      walletSnapshots: nextSnapshots,
      currentWalletIndex: 0,
      reviewWalletIndex: -1,
      checkedWallets: 0,
      totalWallets: nextSnapshots.length,
    });
  };

  const submitComposer = (value) => {
    if (interactionLocked) return false;

    if (phase === "wallet_entry") {
      const actualBalance = parseMoney(value);
      if (actualBalance === null || actualBalance < 0) {
        const errorMessages = [...messages, message("assistant", "Please enter the balance as a number, for example 1280.28.")];
        setMessages(errorMessages);
        persist({ messages: errorMessages });
        return false;
      }

      const current = snapshots[currentWalletIndex];
      if (!current) return false;
      const nextSnapshots = snapshots.map((snapshot, index) =>
        index === currentWalletIndex
          ? {
              ...snapshot,
              actualBalance,
              difference: actualBalance - (Number(snapshot.recordedBalance) || 0),
              checkedAt: new Date().toISOString(),
            }
          : snapshot
      );
      const nextIndex = currentWalletIndex + 1;
      const responseCopy = nextIndex < nextSnapshots.length
        ? `Got it — your actual ${current.walletName} balance is ${money(actualBalance)}.\n\n${nextQuestionCopy(nextSnapshots[nextIndex])}`
        : `Got it — your actual ${current.walletName} balance is ${money(actualBalance)}. I’ve now checked all your wallets. Give me a second to compare the whole picture.`;
      const answeredMessages = [
        ...messages,
        message("user", money(actualBalance), { animate: false }),
        message("assistant", responseCopy),
      ];

      setSnapshots(nextSnapshots);
      setMessages(answeredMessages);

      if (nextIndex < nextSnapshots.length) {
        setCurrentWalletIndex(nextIndex);
        persist({
          phase: "wallet_entry",
          messages: answeredMessages,
          snapshots: nextSnapshots,
          currentWalletIndex: nextIndex,
          extra: { checkedWallets: nextIndex, totalWallets: nextSnapshots.length },
        });
      } else {
        window.setTimeout(() => beginReview(nextSnapshots, answeredMessages), 600);
      }
      return true;
    }

    if (phase === "forgotten_spend_detail" || phase === "other_detail") {
      const current = snapshots[reviewWalletIndex];
      if (!current) return false;
      const kind = phase === "forgotten_spend_detail" ? "unrecorded_spending" : "other";
      const nextSnapshots = snapshots.map((snapshot, index) =>
        index === reviewWalletIndex
          ? {
              ...snapshot,
              explanation: {
                kind,
                note: clean(value),
                capturedAt: new Date().toISOString(),
              },
            }
          : snapshot
      );
      const nextMessages = [
        ...messages,
        message("user", clean(value), { animate: false }),
        message(
          "assistant",
          phase === "forgotten_spend_detail"
            ? "Got it. I’ll keep that as an explanation for this Weekly Money Check. I will not deduct it again from your wallet."
            : "Got it. I’ve kept that explanation with this week’s check."
        ),
      ];
      moveToNextDifference(nextSnapshots, nextMessages);
      return true;
    }

    return false;
  };

  const handleChoice = (choiceId, label) => {
    if (interactionLocked) return;
    const current = snapshots[reviewWalletIndex];
    if (!current) return;
    const userMessages = [...messages, message("user", label, { animate: false })];

    if (choiceId === "spent") {
      const nextMessages = [
        ...userMessages,
        message("assistant", `Okay. I already checked CLARA’s logged activity for ${current.walletName}, and this remaining amount is not in those records. What did you spend it on?`),
      ];
      setMessages(nextMessages);
      setPhase("forgotten_spend_detail");
      persist({ phase: "forgotten_spend_detail", messages: nextMessages });
      return;
    }

    if (choiceId === "other") {
      const nextMessages = [
        ...userMessages,
        message("assistant", "Okay. Tell me briefly what happened to that remaining difference."),
      ];
      setMessages(nextMessages);
      setPhase("other_detail");
      persist({ phase: "other_detail", messages: nextMessages });
      return;
    }

    const explanationKind = choiceId === "unknown" ? "unknown" : choiceId;
    const nextSnapshots = snapshots.map((snapshot, index) =>
      index === reviewWalletIndex
        ? {
            ...snapshot,
            explanation: {
              kind: explanationKind,
              capturedAt: new Date().toISOString(),
            },
          }
        : snapshot
    );
    const assistantCopy = choiceId === "unknown"
      ? "That’s okay. I’ll leave this amount unexplained instead of inventing a transaction."
      : choiceId.includes("transfer")
        ? "Got it. I’ll keep that as a transfer explanation — not as spending, and I won’t deduct anything again."
        : "Got it. I’ve captured that explanation for this week’s check without changing your wallet balance.";
    moveToNextDifference(nextSnapshots, [...userMessages, message("assistant", assistantCopy)]);
  };

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/96 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-brain-version="weekly-money-check-chat-v2-overview-typing"
      data-clara-ai-layout-variant="weekly-money-check"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-weekly-money-check="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.30),transparent_34%),radial-gradient(circle_at_52%_-8%,rgba(255,216,74,0.07),transparent_24%),radial-gradient(circle_at_96%_8%,rgba(229,57,69,0.18),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <WeeklyHeader onClose={onClose} />

      <main
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-0 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {phase === "ready" ? (
          <div className="flex min-h-full flex-col justify-center px-1 pb-24 pt-3">
            <WeeklyEntryBoard firstName={firstName} onStart={startCheck} onClose={onClose} />
          </div>
        ) : (
          <div
            data-clara-ai-message-stack="true"
            className={`flex min-h-full min-w-0 flex-col justify-start gap-3 px-2 pt-1 ${showComposer ? "pb-28" : "pb-5"}`}
          >
            {messages.map((entry, index) => (
              <MessageRow
                key={entry.id || `${entry.role}-${index}`}
                entry={entry}
                onTypingComplete={(messageId) => {
                  if (messageId === typingMessageId) setTypingMessageId(null);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <ChoiceBar
        phase={phase}
        snapshot={currentReviewSnapshot}
        onChoice={handleChoice}
        onClose={onClose}
        disabled={interactionLocked}
      />

      {showComposer ? <Composer phase={phase} onSubmit={submitComposer} submitLocked={interactionLocked} /> : null}
    </div>
  );
}
