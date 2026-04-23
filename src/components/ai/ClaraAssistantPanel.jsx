import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import useFinancialData from "@/hooks/useFinancialData";
import { buildFinanceSummary, formatPeso } from "@/lib/ai/financeSummary";
import { extractFields } from "@/lib/ai/fieldExtractor";
import {
  createSession,
  updateSession,
  markAwaitingConfirmation,
  clearSession,
} from "@/lib/ai/sessionManager";

function detectIntent(text, summary = {}) {
  const t = String(text || "").toLowerCase().trim();

  const totals = summary.totals || {};
  const biggestExpense = summary.biggestExpense || null;
  const topCategory = summary.topCategory || null;
  const walletList = summary.wallets || [];
  const budgetList = summary.budgets || [];
  const recentExpenses = summary.recentExpenses || [];

  if (!t) {
    return {
      intent: "UNKNOWN",
      reply: "I’m here. Tell me what you want to do.",
    };
  }

  if (
    t.includes("how much money") ||
    t.includes("money left") ||
    t.includes("money do i have") ||
    t.includes("how much do i have") ||
    t.includes("balance") ||
    t.includes("left on my account") ||
    t.includes("left in my account") ||
    t.includes("my account")
  ) {
    return {
      intent: "READ_BALANCE",
      reply:
        totals.walletCount > 0
          ? `You currently have ${formatPeso(
              totals.walletBalance
            )} across ${totals.walletCount} wallet${
              totals.walletCount === 1 ? "" : "s"
            }.`
          : `I can’t see any wallets yet. Your current detected balance is ${formatPeso(
              totals.walletBalance
            )}.`,
    };
  }

  if (
    t.includes("how many wallet") ||
    t.includes("how many wallets") ||
    t.includes("wallets do i have") ||
    t.includes("my wallets")
  ) {
    if (walletList.length === 0) {
      return {
        intent: "READ_WALLETS",
        reply: "I can’t see any wallets yet.",
      };
    }

    const names = walletList
      .slice(0, 4)
      .map((wallet) => wallet.name)
      .filter(Boolean);

    return {
      intent: "READ_WALLETS",
      reply:
        walletList.length <= 4
          ? `You currently have ${walletList.length} wallet${
              walletList.length === 1 ? "" : "s"
            }: ${names.join(", ")}.`
          : `You currently have ${walletList.length} wallets. Some of them are ${names.join(
              ", "
            )}.`,
    };
  }

  if (
    t.includes("biggest expense") ||
    t.includes("largest expense") ||
    t.includes("highest expense") ||
    t.includes("biggest spending") ||
    t.includes("largest spending")
  ) {
    if (!biggestExpense) {
      return {
        intent: "READ_BIGGEST_EXPENSE",
        reply: "I can’t find any expense record yet.",
      };
    }

    return {
      intent: "READ_BIGGEST_EXPENSE",
      reply: `Your biggest expense so far is ${
        biggestExpense.item || "an expense"
      } at ${formatPeso(biggestExpense.amount)}.`,
    };
  }

  if (
    t.includes("biggest category") ||
    t.includes("top category") ||
    t.includes("where do i spend the most") ||
    t.includes("what do i spend the most on") ||
    t.includes("largest category") ||
    t.includes("biggest experience")
  ) {
    if (!topCategory) {
      return {
        intent: "READ_TOP_CATEGORY",
        reply: "I can’t see enough expense data yet to identify your top category.",
      };
    }

    return {
      intent: "READ_TOP_CATEGORY",
      reply: `Your biggest spending category right now is ${topCategory.name} at ${formatPeso(
        topCategory.amount
      )}.`,
    };
  }

  if (
    t.includes("recent expense") ||
    t.includes("latest expense") ||
    t.includes("last expense") ||
    t.includes("recent spending")
  ) {
    if (recentExpenses.length === 0) {
      return {
        intent: "READ_RECENT_EXPENSES",
        reply: "I can’t see any recent expenses yet.",
      };
    }

    const latest = recentExpenses[0];
    return {
      intent: "READ_RECENT_EXPENSES",
      reply: `Your latest expense is ${
        latest.item || "an expense"
      } for ${formatPeso(latest.amount)} under ${latest.category || "other"}.`,
    };
  }

  if (
    t.includes("how many expense") ||
    t.includes("my expenses") ||
    t.includes("expense history") ||
    t.includes("transactions")
  ) {
    return {
      intent: "READ_TRANSACTIONS",
      reply: `I can currently see ${totals.expenseCount || 0} expense record${
        totals.expenseCount === 1 ? "" : "s"
      } and ${totals.transactionCount || 0} wallet transaction${
        totals.transactionCount === 1 ? "" : "s"
      }.`,
    };
  }

  if (
    t.includes("emergency fund") ||
    t.includes("state of my emergency fund") ||
    t.includes("status of my emergency fund")
  ) {
    const balance = totals.walletBalance || 0;
    return {
      intent: "READ_EMERGENCY_FUND",
      reply: `Your currently detected available money is ${formatPeso(
        balance
      )}. I still need your emergency fund target logic wired in before I can give a full emergency fund status.`,
    };
  }

  if (
    t.includes("budget") &&
    !t.includes("spent") &&
    !t.includes("expense") &&
    !t.includes("buy")
  ) {
    if (
      t.includes("how many") ||
      t.includes("my budget") ||
      t.includes("budgets") ||
      t.includes("existing budget")
    ) {
      return {
        intent: "READ_BUDGETS",
        reply: `You currently have ${budgetList.length} budget${
          budgetList.length === 1 ? "" : "s"
        } saved.`,
      };
    }

    return {
      intent: "CREATE_BUDGET",
      reply: "Sure. What should we name this budget?",
    };
  }

  if (t.includes("expense") || t.includes("spent") || t.includes("buy")) {
    return {
      intent: "LOG_EXPENSE",
      reply: "Got it. How much did you spend?",
    };
  }

  if (t.includes("add money") || t.includes("income") || t.includes("deposit")) {
    return {
      intent: "ADD_MONEY",
      reply: "Okay. How much money are we adding?",
    };
  }

  if (t.includes("save") || t.includes("goal")) {
    return {
      intent: "CREATE_SAVINGS_GOAL",
      reply: "Nice. What is your savings goal called?",
    };
  }

  return {
    intent: "UNKNOWN",
    reply: "Got it. Tell me more so I can help you.",
  };
}

function formatConfirmationFields(intent, fields) {
  if (!fields) return "";

  if (intent === "LOG_EXPENSE") {
    return `amount: ${fields.amount ?? "-"}, item: ${fields.item ?? "-"}, category: ${
      fields.category ?? "-"
    }, wallet: ${fields.wallet ?? "-"}, date: ${fields.date ?? "-"}`;
  }

  if (intent === "ADD_MONEY") {
    return `amount: ${fields.amount ?? "-"}, wallet: ${fields.wallet ?? "-"}`;
  }

  if (intent === "CREATE_BUDGET") {
    return `name: ${fields.name ?? "-"}, amount: ${fields.amount ?? "-"}, period: ${
      fields.period ?? "-"
    }`;
  }

  if (intent === "CREATE_SAVINGS_GOAL") {
    return `name: ${fields.name ?? "-"}, target amount: ${
      fields.target_amount ?? "-"
    }, deadline: ${fields.deadline ?? "-"}`;
  }

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value ?? "-"}`)
    .join(", ");
}

export default function ClaraAssistantPanel({ open, mode = "voice", onClose }) {
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);

  const recognitionRef = useRef(null);
  const liveTranscriptRef = useRef("");

  const SpeechRecognitionAPI = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data?.user || null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    expenses,
    wallets,
    walletTransactions,
    budgets,
    totalWalletBalance,
  } = useFinancialData(user);

  const financeSummary = useMemo(
    () =>
      buildFinanceSummary({
        expenses,
        wallets,
        budgets,
        walletTransactions,
        totalWalletBalance,
      }),
    [expenses, wallets, budgets, walletTransactions, totalWalletBalance]
  );

  const submitUserMessage = (text) => {
    const clean = String(text || "").trim();
    if (!clean) return;

    let reply = "";
    let nextSession = session;

    if (!session) {
      const intentResult = detectIntent(clean, financeSummary);

      if (
        [
          "READ_BALANCE",
          "READ_WALLETS",
          "READ_BIGGEST_EXPENSE",
          "READ_TOP_CATEGORY",
          "READ_RECENT_EXPENSES",
          "READ_TRANSACTIONS",
          "READ_EMERGENCY_FUND",
          "READ_BUDGETS",
          "UNKNOWN",
        ].includes(intentResult.intent)
      ) {
        reply = intentResult.reply;
        nextSession = null;
      } else {
        const extraction = extractFields(
          intentResult.intent,
          clean,
          financeSummary
        );

        nextSession = createSession(
          extraction.intent,
          extraction.fields,
          extraction.missingFields
        );

        if (nextSession.complete) {
          nextSession = markAwaitingConfirmation(nextSession);
          reply = `Got it. Here’s what I have: ${formatConfirmationFields(
            nextSession.intent,
            nextSession.fields
          )}. Confirm?`;
        } else {
          reply = `Got it. I still need: ${nextSession.missingFields.join(", ")}`;
        }
      }
    } else if (!session.awaitingConfirmation) {
      const extraction = extractFields(session.intent, clean, financeSummary);
      nextSession = updateSession(session, extraction.fields);

      if (nextSession.complete) {
        nextSession = markAwaitingConfirmation(nextSession);
        reply = `Perfect. Here’s what I got: ${formatConfirmationFields(
          nextSession.intent,
          nextSession.fields
        )}. Confirm?`;
      } else {
        reply = `Still need: ${nextSession.missingFields.join(", ")}`;
      }
    } else {
      const normalized = clean.toLowerCase();

      if (
        normalized.includes("yes") ||
        normalized.includes("confirm") ||
        normalized === "go"
      ) {
        reply = `Done. Executing ${session.intent
          .toLowerCase()
          .replace(/_/g, " ")}.`;
        nextSession = clearSession();
      } else if (
        normalized.includes("no") ||
        normalized.includes("cancel") ||
        normalized.includes("stop")
      ) {
        reply = "Cancelled. Let’s start again.";
        nextSession = clearSession();
      } else {
        reply = "Please say confirm or cancel.";
      }
    }

    setSession(nextSession);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: clean },
      { role: "assistant", content: reply },
    ]);

    setInput("");
    setFinalTranscript("");
    setInterimTranscript("");
    liveTranscriptRef.current = "";
  };

  const stopListening = (shouldSubmit = false) => {
    const recognition = recognitionRef.current;
    const pendingText = `${liveTranscriptRef.current} ${interimTranscript}`.trim();

    if (recognition) {
      try {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setListening(false);

    if (shouldSubmit && pendingText) {
      submitUserMessage(pendingText);
    }
  };

  useEffect(() => {
    if (!open) {
      stopListening();
      setInput("");
      setFinalTranscript("");
      setInterimTranscript("");
      setMicError("");
      setMessages([]);
      setSession(null);
      liveTranscriptRef.current = "";
    }

    return () => {
      stopListening();
    };
  }, [open]);

  const startListening = () => {
    setMicError("");

    if (!SpeechRecognitionAPI) {
      setMicError("Voice input is not supported on this browser.");
      return;
    }

    stopListening();
    setFinalTranscript("");
    setInterimTranscript("");
    liveTranscriptRef.current = "";

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onerror = (event) => {
        setListening(false);

        if (event?.error === "not-allowed") {
          setMicError("Microphone permission was blocked.");
          return;
        }

        if (event?.error === "no-speech") {
          setMicError("I didn’t catch anything. Try again.");
          return;
        }

        if (event?.error === "audio-capture") {
          setMicError("No microphone was detected.");
          return;
        }

        setMicError("Voice input failed. Try again.");
      };

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = event.results[i][0]?.transcript || "";

          if (event.results[i].isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        const combined = `${liveTranscriptRef.current} ${finalText}`.trim();

        if (finalText) {
          liveTranscriptRef.current = combined;
          setFinalTranscript(combined);
        }

        setInterimTranscript(interimText);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setListening(false);
      setMicError("Unable to start voice input.");
    }
  };

  const handleClose = () => {
    stopListening();
    onClose?.();
  };

  const handleSendChat = () => {
    submitUserMessage(input);
  };

  const liveTranscript = `${finalTranscript} ${interimTranscript}`.trim();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#071120] p-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">
            {mode === "voice" ? "Voice Assistant" : "Chat Assistant"}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl bg-emerald-500/15 px-3 py-2 text-white"
                      : "max-w-[85%] rounded-2xl bg-white/8 px-3 py-2 text-white/90"
                  }
                >
                  {message.content}
                </div>
              ))}

              {liveTranscript ? (
                <div className="ml-auto max-w-[85%] rounded-2xl bg-white/5 px-3 py-2 text-white/50">
                  {liveTranscript}
                </div>
              ) : null}
            </div>
          ) : liveTranscript ? (
            <div className="ml-auto max-w-[85%] rounded-2xl bg-white/5 px-3 py-2 text-white/50">
              {liveTranscript}
            </div>
          ) : (
            <div className="text-white/40">
              {mode === "voice"
                ? "Tap Start Listening, then speak."
                : "Type your request..."}
            </div>
          )}
        </div>

        {micError ? (
          <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {micError}
          </div>
        ) : null}

        {mode === "voice" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={listening ? () => stopListening(true) : startListening}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-black/30"
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? "Stop Listening" : "Start Listening"}
            </button>

            <div className="text-center text-sm text-white/60">
              {listening ? "🎤 Listening..." : "Mic is idle"}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your request..."
              className="h-11 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              onClick={handleSendChat}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}