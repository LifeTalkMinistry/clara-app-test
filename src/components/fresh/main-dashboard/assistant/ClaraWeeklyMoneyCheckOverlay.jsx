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

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function message(role, text) {
  return {
    id: `weekly-check-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function getMismatchIndexes(snapshots = []) {
  return snapshots
    .map((snapshot, index) => ({ snapshot, index }))
    .filter(({ snapshot }) => Math.abs(Number(snapshot?.difference) || 0) > DIFFERENCE_EPSILON)
    .map(({ index }) => index);
}

function comparisonCopy(snapshot) {
  const difference = Number(snapshot?.difference) || 0;
  const amount = money(Math.abs(difference));
  if (difference < 0) {
    return `Your ${snapshot.walletName} is ${amount} lower than what CLARA currently has recorded. Let’s figure out what happened to that ${amount}.`;
  }
  return `Your ${snapshot.walletName} is ${amount} higher than what CLARA currently has recorded. Let’s figure out where that ${amount} came from.`;
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

function WeeklyHeader({ onClose }) {
  return (
    <header
      data-clara-buy-check-header="true"
      className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_52%,rgba(35,10,28,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffd84a]/88">CLARA MONEY TOOLS</p>
      <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Weekly Money Check</h1>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Check · Compare · Understand</p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 shadow-[0_10px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-blue-200/55 hover:bg-blue-500/15 active:scale-95"
        aria-label="Close CLARA Ask Before You Spend"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}

function WeeklyEntryBoard({ firstName, onStart, onClose }) {
  return (
    <section
      data-clara-pause-entry-board="true"
      data-clara-buy-check-board="true"
      data-clara-buy-check-opening-board="true"
      className="relative overflow-hidden rounded-[30px] border border-blue-200/20 bg-[#061226]/78 px-6 pb-7 pt-7 text-center shadow-[0_26px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(23,105,255,0.24),transparent_38%),radial-gradient(circle_at_94%_18%,rgba(229,57,69,0.13),transparent_38%),linear-gradient(145deg,rgba(3,12,27,0.82),rgba(2,6,23,0.95))]" />
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/52">WEEKLY CHECK-IN</p>
      <div className="mx-auto mt-4 flex min-h-[112px] max-w-[320px] items-center justify-center rounded-[22px] border border-blue-200/12 bg-black/20 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <p className="text-[16px] font-extrabold leading-[1.48] text-white/94">
          Hi {firstName}! Great job—you remembered your scheduled Weekly Money Check.
        </p>
      </div>
      <div data-clara-buy-check-active-question="true" aria-live="polite" className="mx-auto mt-5 max-w-[318px] text-center">
        <strong className="block text-[16px] font-black leading-[1.4] text-white/95">Are you ready to start?</strong>
        <span className="mt-1.5 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">
          We’ll quickly check your real wallet balances one by one.
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onStart}
          className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition hover:brightness-110 active:scale-[0.99]"
        >
          Yes, let’s start
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-4 text-[12px] font-black text-white/82 transition hover:bg-white/[0.07] active:scale-[0.99]"
        >
          Not right now
        </button>
      </div>
    </section>
  );
}

function MessageRow({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`flex min-w-0 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 break-words [overflow-wrap:break-word] ${
          isUser
            ? "max-w-[86%] rounded-[24px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-[0_12px_28px_rgba(23,105,255,0.20)]"
            : "w-[94%] max-w-[94%] rounded-[26px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl"
        }`}
      >
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
    </div>
  );
}

function Composer({ phase, onSubmit }) {
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
    if (!value) return;
    const accepted = onSubmit?.(value);
    if (accepted !== false) setDraft("");
  };

  return (
    <form
      onSubmit={submit}
      data-clara-buy-check-react-form="true"
      className="relative z-30 shrink-0 overflow-hidden rounded-[28px] border border-blue-200/16 bg-[#040b1a]/96 p-2.5 shadow-[0_-18px_52px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)] opacity-80" />
      <div className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#08142b]/94 px-3 py-2 shadow-inner focus-within:border-blue-300/36">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72"
          placeholder={placeholder}
          inputMode={isMoney ? "decimal" : "text"}
          aria-label={placeholder}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white shadow-[0_10px_28px_rgba(23,105,255,0.28)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          aria-label="Send Weekly Money Check answer"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}

function ChoiceBar({ phase, snapshot, onChoice, onClose }) {
  if (phase === "classify_difference") {
    return (
      <div className="relative z-20 grid gap-2 px-1 pb-2 pt-1">
        {getDirectionChoices(snapshot).map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoice(choice.id, choice.label)}
            className="min-h-11 rounded-[18px] border border-blue-200/14 bg-[#07152d]/88 px-4 text-[12px] font-black text-white/90 transition hover:border-blue-300/30 hover:bg-blue-500/10 active:scale-[0.99]"
          >
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  if (phase === "spending_recorded_check") {
    return (
      <div className="relative z-20 grid grid-cols-3 gap-2 px-1 pb-2 pt-1">
        {[
          ["recorded_yes", "Yes"],
          ["recorded_no", "No, I forgot"],
          ["recorded_unsure", "I’m not sure"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChoice(id, label)}
            className="min-h-11 rounded-[18px] border border-blue-200/14 bg-[#07152d]/88 px-2 text-[11px] font-black text-white/90 transition hover:border-blue-300/30 hover:bg-blue-500/10 active:scale-[0.99]"
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (phase === "completed" || phase === "no_wallets") {
    return (
      <div className="relative z-20 px-1 pb-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition hover:brightness-110 active:scale-[0.99]"
        >
          Done
        </button>
      </div>
    );
  }

  return null;
}

export default function ClaraWeeklyMoneyCheckOverlay({
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

  const [phase, setPhase] = useState("ready");
  const [messages, setMessages] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [reviewWalletIndex, setReviewWalletIndex] = useState(-1);
  const previousActiveRef = useRef(false);

  const currentReviewSnapshot = reviewWalletIndex >= 0 ? snapshots[reviewWalletIndex] : null;
  const showComposer = ["wallet_entry", "forgotten_spend_detail", "other_detail"].includes(phase);

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
    const summary =
      unexplainedAmount > DIFFERENCE_EPSILON
        ? `That’s it—your Weekly Money Check is complete. We checked ${nextSnapshots.length} wallet${nextSnapshots.length === 1 ? "" : "s"}. ${money(unexplainedAmount)} is still unexplained, so I left it that way instead of guessing.`
        : `That’s it—your Weekly Money Check is complete. We checked ${nextSnapshots.length} wallet${nextSnapshots.length === 1 ? "" : "s"} and reviewed the differences. Nothing was deducted again during this check.`;
    const completedMessages = [...nextMessages, message("assistant", summary)];

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
      },
    });
  };

  const beginReview = (nextSnapshots, nextMessages) => {
    const mismatchIndexes = getMismatchIndexes(nextSnapshots);
    if (!mismatchIndexes.length) {
      const allMatchMessages = [
        ...nextMessages,
        message("assistant", "Great—all of your actual wallet balances match what CLARA currently has recorded."),
      ];
      completeCheck(nextSnapshots, allMatchMessages);
      return;
    }

    const firstIndex = mismatchIndexes[0];
    const reviewMessages = [
      ...nextMessages,
      message("assistant", "Great—I’ve checked all your wallets."),
      message("assistant", comparisonCopy(nextSnapshots[firstIndex])),
    ];
    setSnapshots(nextSnapshots);
    setMessages(reviewMessages);
    setReviewWalletIndex(firstIndex);
    setPhase("classify_difference");
    persist({
      phase: "classify_difference",
      messages: reviewMessages,
      snapshots: nextSnapshots,
      reviewWalletIndex: firstIndex,
      extra: { checkedWallets: nextSnapshots.length, totalWallets: nextSnapshots.length },
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
      message("assistant", `Got it. Next, ${comparisonCopy(nextSnapshots[nextIndex])}`),
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
        setMessages(session.conversationMessages);
        setCurrentWalletIndex(Number(session.currentWalletIndex) || 0);
        setReviewWalletIndex(Number.isInteger(session.reviewWalletIndex) ? session.reviewWalletIndex : -1);
        setPhase("completed");
      } else if (canResume && weeklyState?.key === "in_progress") {
        setSnapshots(session.walletSnapshots);
        setMessages(session.conversationMessages);
        setCurrentWalletIndex(Number(session.currentWalletIndex) || 0);
        setReviewWalletIndex(Number.isInteger(session.reviewWalletIndex) ? session.reviewWalletIndex : -1);
        setPhase(clean(session.phase) || "wallet_entry");
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
        message("user", "Yes, let’s start"),
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
      checkedAt: null,
    }));
    const startMessages = [
      message("user", "Yes, let’s start"),
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
    if (phase === "wallet_entry") {
      const actualBalance = parseMoney(value);
      if (actualBalance === null || actualBalance < 0) {
        const errorMessages = [
          ...messages,
          message("assistant", "Please enter the balance as a number, for example 1280.28."),
        ];
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
      const answeredMessages = [
        ...messages,
        message("user", money(actualBalance)),
        message("assistant", `Got it—your actual ${current.walletName} balance is ${money(actualBalance)}.`),
      ];
      const nextIndex = currentWalletIndex + 1;

      if (nextIndex < nextSnapshots.length) {
        const continuedMessages = [
          ...answeredMessages,
          message("assistant", nextQuestionCopy(nextSnapshots[nextIndex])),
        ];
        setSnapshots(nextSnapshots);
        setMessages(continuedMessages);
        setCurrentWalletIndex(nextIndex);
        persist({
          phase: "wallet_entry",
          messages: continuedMessages,
          snapshots: nextSnapshots,
          currentWalletIndex: nextIndex,
          extra: { checkedWallets: nextIndex, totalWallets: nextSnapshots.length },
        });
      } else {
        beginReview(nextSnapshots, answeredMessages);
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
        message("user", clean(value)),
        message(
          "assistant",
          phase === "forgotten_spend_detail"
            ? "Got it. I’ll keep that as part of this Weekly Money Check and I won’t deduct it again from your wallet."
            : "Got it. I’ve kept that explanation with this week’s check."
        ),
      ];
      moveToNextDifference(nextSnapshots, nextMessages);
      return true;
    }

    return false;
  };

  const handleChoice = (choiceId, label) => {
    const current = snapshots[reviewWalletIndex];
    if (!current) return;
    const userMessages = [...messages, message("user", label)];

    if (phase === "classify_difference") {
      if (choiceId === "spent") {
        const nextMessages = [
          ...userMessages,
          message("assistant", "Got it. Was that spending something you already recorded in CLARA?"),
        ];
        setMessages(nextMessages);
        setPhase("spending_recorded_check");
        persist({ phase: "spending_recorded_check", messages: nextMessages });
        return;
      }

      if (choiceId === "other") {
        const nextMessages = [
          ...userMessages,
          message("assistant", "Okay. Tell me briefly what happened to that difference."),
        ];
        setMessages(nextMessages);
        setPhase("other_detail");
        persist({ phase: "other_detail", messages: nextMessages });
        return;
      }

      const explanationKind =
        choiceId === "unknown"
          ? "unknown"
          : choiceId;
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
      const assistantCopy =
        choiceId === "unknown"
          ? "That’s okay. I’ll leave this difference unexplained instead of guessing."
          : choiceId.includes("transfer")
            ? "Got it. I’ll treat that as a transfer explanation—not spending."
            : "Got it. I’ve captured that explanation for this week’s check.";
      moveToNextDifference(nextSnapshots, [...userMessages, message("assistant", assistantCopy)]);
      return;
    }

    if (phase === "spending_recorded_check") {
      if (choiceId === "recorded_no") {
        const nextMessages = [
          ...userMessages,
          message("assistant", "Okay. What did you spend it on?"),
        ];
        setMessages(nextMessages);
        setPhase("forgotten_spend_detail");
        persist({ phase: "forgotten_spend_detail", messages: nextMessages });
        return;
      }

      const explanation =
        choiceId === "recorded_yes"
          ? { kind: "spending_already_recorded", capturedAt: new Date().toISOString() }
          : { kind: "unknown", note: "User was unsure whether spending was already recorded.", capturedAt: new Date().toISOString() };
      const nextSnapshots = snapshots.map((snapshot, index) =>
        index === reviewWalletIndex ? { ...snapshot, explanation } : snapshot
      );
      const assistantCopy =
        choiceId === "recorded_yes"
          ? "Perfect. I won’t record or deduct it again."
          : "That’s okay. I’ll leave it unresolved instead of risking a duplicate record.";
      moveToNextDifference(nextSnapshots, [...userMessages, message("assistant", assistantCopy)]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/96 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-brain-version={FLOW_VERSION}
      data-clara-ai-layout-variant="weekly-money-check"
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-weekly-money-check="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.30),transparent_34%),radial-gradient(circle_at_52%_-8%,rgba(255,216,74,0.07),transparent_24%),radial-gradient(circle_at_96%_8%,rgba(229,57,69,0.18),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[54%] bg-[linear-gradient(180deg,rgba(2,7,20,0)_0%,rgba(2,7,20,0.72)_22%,rgba(2,7,20,0.96)_100%)]" />

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
          <div className={`flex min-h-full min-w-0 flex-col justify-start gap-3 px-2 pt-1 ${showComposer ? "pb-28" : "pb-5"}`}>
            {messages.map((entry, index) => (
              <MessageRow key={entry.id || `${entry.role}-${index}`} role={entry.role} text={clean(entry.text)} />
            ))}
          </div>
        )}
      </main>

      <ChoiceBar
        phase={phase}
        snapshot={currentReviewSnapshot}
        onChoice={handleChoice}
        onClose={onClose}
      />

      {showComposer ? <Composer phase={phase} onSubmit={submitComposer} /> : null}
    </div>
  );
}
