import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Keyboard,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useFinancialData } from "../../hooks/useFinancialData";
import {
  buildClaraFinanceSnapshot,
  generateClaraLocalReply,
  hasUsableClaraSnapshot,
} from "../../lib/clara-local-brain";

const INITIAL_MESSAGE = "I’m here. Ask me before you spend.";
const CLOSE_ANIMATION_MS = 170;

const INTENT_OPTIONS = [
  {
    label: "Before I buy this",
    description: "Pause before the purchase.",
    mode: "purchase_decision",
    prompt: "",
    icon: ShieldCheck,
    featured: true,
  },
  {
    label: "Predict future",
    description: "See where your money is heading.",
    mode: "predict_future",
    prompt: "Predict my future",
    icon: TrendingUp,
  },
  {
    label: "Check budget",
    description: "See what your plan allows.",
    mode: "budget_check",
    prompt: "Budget check",
    icon: Keyboard,
  },
  {
    label: "Review spending",
    description: "Understand your pattern.",
    mode: "spending_review",
    prompt: "Check my spending",
    icon: Sparkles,
  },
  {
    label: "Private mode",
    description: "For quiet reflection at home.",
    mode: "private_mode",
    prompt: "Private mode",
    icon: Mic,
  },
];

const CHAT_QUICK_OPTIONS = [
  { label: "Before I buy this", message: "Before I buy this", mode: "purchase_decision" },
  { label: "Predict future", message: "Predict my future" },
  { label: "Budget check", message: "Budget check" },
  { label: "Spending review", message: "Check my spending" },
  { label: "Wallets", message: "Check my wallets" },
];

const CLARA_DECISION_STYLES = `
  @keyframes claraDecisionDockIn {
    from {
      opacity: 0;
      transform: translate3d(18px, 28px, 0) scale(0.92);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
      filter: blur(0px);
    }
  }

  @keyframes claraDecisionDockOut {
    from {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
      filter: blur(0px);
    }
    to {
      opacity: 0;
      transform: translate3d(16px, 24px, 0) scale(0.94);
      filter: blur(3px);
    }
  }

  @keyframes claraDecisionGlowPulse {
    0%, 100% { opacity: 0.58; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.04); }
  }

  @keyframes claraDecisionOptionIn {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  .clara-decision-dock {
    pointer-events: none;
  }

  .clara-decision-sheet {
    animation: claraDecisionDockIn 220ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
    transform-origin: calc(100% - 42px) calc(100% - 18px);
    will-change: transform, opacity, filter;
  }

  .clara-decision-sheet-out {
    animation: claraDecisionDockOut 160ms ease-in both;
    pointer-events: none;
  }

  .clara-decision-glow {
    animation: claraDecisionGlowPulse 4s ease-in-out infinite;
    will-change: transform, opacity;
  }

  .clara-decision-option {
    animation: claraDecisionOptionIn 220ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
  }

  .clara-decision-scroll {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .clara-decision-tail {
    position: absolute;
    right: 38px;
    bottom: -9px;
    width: 18px;
    height: 18px;
    transform: rotate(45deg);
    border-right: 1px solid rgba(255,255,255,0.12);
    border-bottom: 1px solid rgba(255,255,255,0.12);
    background: rgba(2, 6, 23, 0.94);
  }

  @media (min-width: 640px) {
    .clara-decision-sheet {
      transform-origin: calc(100% - 48px) calc(100% - 18px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .clara-decision-sheet,
    .clara-decision-sheet-out,
    .clara-decision-glow,
    .clara-decision-option {
      animation: none !important;
      will-change: auto !important;
    }
  }
`;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getFirstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function normalizeFinanceUserFromContext(context = {}) {
  const safeContext = safeObject(context);

  const candidateUser = getFirstObject(
    safeContext.user,
    safeContext.currentUser,
    safeContext.authUser,
    safeContext.session?.user,
    safeContext.session?.currentUser,
    safeContext.profile?.user,
    safeContext.profile?.authUser
  );

  const candidateProfile = getFirstObject(
    safeContext.profile,
    safeContext.userProfile,
    safeContext.account,
    safeContext.member
  );

  const directId =
    safeContext.userId ||
    safeContext.user_id ||
    safeContext.uid ||
    safeContext.ownerId ||
    safeContext.owner_id ||
    safeContext.profileId ||
    safeContext.profile_id ||
    null;

  const userId =
    candidateUser?.id ||
    candidateUser?.user_id ||
    candidateUser?.uid ||
    candidateProfile?.user_id ||
    candidateProfile?.userId ||
    candidateProfile?.id ||
    directId ||
    null;

  if (!userId && !candidateUser && !candidateProfile) return null;

  return {
    ...(candidateProfile || {}),
    ...(candidateUser || {}),
    id: userId || candidateUser?.id || candidateProfile?.id || null,
    user_id: userId || candidateProfile?.user_id || candidateUser?.user_id || null,
    profile: candidateProfile || undefined,
  };
}

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text: String(text || ""),
  };
}

function stopAssistantEvent(event) {
  if (!event) return;
  event.preventDefault?.();
  event.stopPropagation?.();
  event.nativeEvent?.stopImmediatePropagation?.();
}

function stopAssistantPropagation(event) {
  event?.stopPropagation?.();
  event?.nativeEvent?.stopPropagation?.();
}

function getBestContext(currentContext = {}, latestContext = {}) {
  const currentSnapshot = buildClaraFinanceSnapshot(currentContext);
  const latestSnapshot = buildClaraFinanceSnapshot(latestContext);

  if (hasUsableClaraSnapshot(currentSnapshot)) return currentContext;
  if (hasUsableClaraSnapshot(latestSnapshot)) return latestContext;
  return currentContext || latestContext || {};
}

function getContextStatus(context = {}) {
  const snapshot = buildClaraFinanceSnapshot(context);
  return hasUsableClaraSnapshot(snapshot) ? "live" : "warming";
}

export default function ClaraDecisionCoachPanel({ open, onClose, context = {} }) {
  const normalizedFinanceUser = useMemo(
    () => normalizeFinanceUserFromContext(context),
    [context]
  );

  const {
    expenses = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    budgets = [],
    savingsGoals = [],
    emergencyFund = {},
  } = useFinancialData(normalizedFinanceUser || undefined);

  const offlineFinanceContext = useMemo(
    () => ({
      ...(context || {}),
      user: normalizedFinanceUser || context?.user || null,
      profile: context?.profile || normalizedFinanceUser?.profile || null,
      userId:
        normalizedFinanceUser?.id ||
        normalizedFinanceUser?.user_id ||
        context?.userId ||
        context?.user_id ||
        null,
      expenses: safeArray(expenses),
      wallets: safeArray(wallets),
      walletTransactions: safeArray(walletTransactions),
      transfers: safeArray(transfers),
      budgets: safeArray(budgets),
      savingsGoals: safeArray(savingsGoals),
      emergencyFund: safeObject(emergencyFund),
    }),
    [
      context,
      normalizedFinanceUser,
      expenses,
      wallets,
      walletTransactions,
      transfers,
      budgets,
      savingsGoals,
      emergencyFund,
    ]
  );

  const latestContextRef = useRef(offlineFinanceContext || {});
  const closeTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  const activeContext = getBestContext(offlineFinanceContext || {}, latestContextRef.current || {});
  latestContextRef.current = activeContext;

  const [panelMode, setPanelMode] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [heroDraft, setHeroDraft] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [activeMode, setActiveMode] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("Ask CLARA");
  const [messages, setMessages] = useState(() => [makeMessage("clara", INITIAL_MESSAGE)]);

  const contextStatus = getContextStatus(activeContext);

  useEffect(() => {
    latestContextRef.current = getBestContext(offlineFinanceContext || {}, latestContextRef.current || {});
  }, [offlineFinanceContext]);

  useEffect(() => {
    if (open) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      setIsClosing(false);
      setPanelMode("menu");
      setHeroDraft("");
      setChatDraft("");
      setActiveMode(null);
      setSelectedTitle("Ask CLARA");
      setMessages([makeMessage("clara", INITIAL_MESSAGE)]);
      return;
    }

    if (!isClosing) setPanelMode(null);
  }, [open, isClosing]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || isClosing || panelMode !== "chat") return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => window.clearTimeout(timer);
  }, [open, isClosing, panelMode]);

  useEffect(() => {
    if (!open || isClosing || panelMode !== "chat") return;
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [open, isClosing, panelMode, messages]);

  const getReplyForText = (messageText, forcedMode = activeMode) => {
    const text = String(messageText || "").trim();
    const currentContext = getBestContext(offlineFinanceContext || {}, latestContextRef.current || {});
    latestContextRef.current = currentContext;

    if (forcedMode === "private_mode") {
      return "Private mode is your quiet money space. You can type here safely first; voice should stay optional for home or private moments.";
    }

    const localMessage =
      forcedMode === "purchase_decision" && !text.toLowerCase().includes("before")
        ? `Before I buy this: ${text}`
        : text;

    try {
      return generateClaraLocalReply(localMessage, currentContext);
    } catch (error) {
      return "I can help you pause first. Tell me the item, price, and why you want it.";
    }
  };

  const openChat = ({ title = "Ask CLARA", mode = null, prompt = "", seedMessages = null } = {}) => {
    setSelectedTitle(title);
    setActiveMode(mode);
    setChatDraft("");
    setPanelMode("chat");

    if (seedMessages) {
      setMessages(seedMessages);
      return;
    }

    const cleanPrompt = String(prompt || "").trim();

    if (mode === "purchase_decision" && !cleanPrompt) {
      setMessages([
        makeMessage("clara", INITIAL_MESSAGE),
        makeMessage("clara", "What are you thinking of buying? Add the price if you know it."),
      ]);
      return;
    }

    if (mode === "private_mode") {
      setMessages([
        makeMessage("clara", INITIAL_MESSAGE),
        makeMessage(
          "clara",
          "Private mode is your quiet money space. Type here for now; voice should stay optional for home or private moments."
        ),
      ]);
      return;
    }

    if (cleanPrompt) {
      setMessages([
        makeMessage("clara", INITIAL_MESSAGE),
        makeMessage("user", cleanPrompt),
        makeMessage("clara", getReplyForText(cleanPrompt, mode)),
      ]);
      return;
    }

    setMessages([makeMessage("clara", INITIAL_MESSAGE)]);
  };

  const startFromOption = (option) => {
    if (!option || isClosing) return;
    openChat({
      title: option.label || "Ask CLARA",
      mode: option.mode || null,
      prompt: option.prompt || "",
    });
  };

  const handleHeroSubmit = (event) => {
    stopAssistantEvent(event);
    if (isClosing) return;

    const text = heroDraft.trim();

    if (!text) {
      openChat({ title: "Before I buy this", mode: "purchase_decision" });
      return;
    }

    setHeroDraft("");
    openChat({
      title: "Before I buy this",
      mode: "purchase_decision",
      seedMessages: [
        makeMessage("clara", INITIAL_MESSAGE),
        makeMessage("user", text),
        makeMessage("clara", getReplyForText(text, "purchase_decision")),
      ],
    });
  };

  const sendMessageText = (messageText, forcedMode = activeMode) => {
    const text = String(messageText || "").trim();
    if (!text || isClosing || panelMode !== "chat") return;

    const reply = getReplyForText(text, forcedMode);

    setMessages((current) => [
      ...current,
      makeMessage("user", text),
      makeMessage("clara", reply),
    ]);

    if (forcedMode === "purchase_decision" && /(?:₱|php\s*)?\d/i.test(text)) {
      setActiveMode(null);
    }
  };

  const handleChatSubmit = (event) => {
    stopAssistantEvent(event);
    const text = chatDraft.trim();
    if (!text) return;

    setChatDraft("");
    sendMessageText(text);
  };

  const sendQuickOption = (option) => {
    if (!option) return;
    const nextMode = option.mode || activeMode;

    if (option.mode === "purchase_decision") {
      setActiveMode("purchase_decision");
      setMessages((current) => [
        ...current,
        makeMessage("user", option.message),
        makeMessage("clara", "What are you thinking of buying? Add the price if you know it."),
      ]);
      return;
    }

    sendMessageText(option.message || option.label, nextMode);
  };

  const returnToMenu = (event) => {
    stopAssistantEvent(event);
    if (isClosing) return;

    setPanelMode("menu");
    setSelectedTitle("Ask CLARA");
    setActiveMode(null);
    setChatDraft("");
    setMessages([makeMessage("clara", INITIAL_MESSAGE)]);
  };

  const closeAssistant = (event) => {
    stopAssistantEvent(event);
    if (isClosing || !panelMode) return;

    setIsClosing(true);

    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);

    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsClosing(false);
      setPanelMode(null);
      setSelectedTitle("Ask CLARA");
      setActiveMode(null);
      onClose?.();
    }, CLOSE_ANIMATION_MS);
  };

  if (!panelMode) return null;

  const shellClassName = `clara-decision-sheet${isClosing ? " clara-decision-sheet-out" : ""}`;

  return (
    <>
      <style>{CLARA_DECISION_STYLES}</style>

      <div
        aria-live="polite"
        className="clara-decision-dock fixed bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] right-4 z-[99990] w-[min(calc(100vw-2rem),360px)] text-white sm:right-[max(1.5rem,calc((100vw-440px)/2+1.5rem))]"
      >
        <section
          aria-modal="false"
          className={`${shellClassName} pointer-events-auto relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-slate-950/88 shadow-[0_22px_70px_rgba(0,0,0,0.54),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-2xl`}
          role="dialog"
          onClick={stopAssistantPropagation}
          onMouseDown={stopAssistantPropagation}
          onPointerDown={stopAssistantPropagation}
        >
          <div className="clara-decision-tail" />
          <div className="clara-decision-glow pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-emerald-400/16 blur-3xl" />
          <div className="clara-decision-glow pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-cyan-400/14 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {panelMode === "menu" ? (
            <div className="relative p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-100/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
                    CLARA
                  </div>
                  <h2 className="text-[1.28rem] font-black leading-[1.08] tracking-tight text-white">
                    Ask before you spend.
                  </h2>
                  <p className="mt-1.5 max-w-[18rem] text-xs leading-5 text-slate-300/82">
                    Private text-first money pause attached to your Money Left orb.
                  </p>
                </div>

                <button
                  aria-label="Close CLARA"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:bg-white/14 active:scale-95"
                  type="button"
                  onClick={closeAssistant}
                  onPointerDown={stopAssistantPropagation}
                >
                  <X size={16} />
                </button>
              </div>

              <form
                className="rounded-[1.35rem] border border-emerald-200/16 bg-gradient-to-br from-white/[0.105] to-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.22)]"
                onSubmit={handleHeroSubmit}
              >
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/70">
                  Decision check
                </label>
                <div className="flex items-center gap-2 rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-3 py-2.5">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-400/70"
                    inputMode="text"
                    placeholder="What are you thinking of buying?"
                    type="text"
                    value={heroDraft}
                    onChange={(event) => setHeroDraft(event.target.value)}
                  />
                  <button
                    aria-label="Ask CLARA"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(110,231,183,0.28)] transition active:scale-95"
                    type="submit"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {INTENT_OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.label}
                      className={`clara-decision-option group rounded-[1.1rem] border p-3 text-left transition active:scale-[0.985] ${
                        option.featured
                          ? "border-emerald-200/20 bg-emerald-300/[0.105] shadow-[0_10px_26px_rgba(16,185,129,0.10)]"
                          : "border-white/10 bg-white/[0.055] hover:bg-white/[0.085]"
                      }`}
                      style={{ animationDelay: `${index * 24}ms` }}
                      type="button"
                      onClick={() => startFromOption(option)}
                    >
                      <span className="mb-2 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/8 text-emerald-100">
                        <Icon size={15} />
                      </span>
                      <span className="block text-xs font-bold text-white">{option.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-slate-300/70">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[10px] text-slate-300/76">
                <span>{contextStatus === "live" ? "Finance memory live" : "Finance memory warming"}</span>
                <span className="font-semibold text-emerald-100/85">Private by design</span>
              </div>
            </div>
          ) : (
            <div className="relative flex max-h-[62vh] min-h-[420px] flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3.5 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    aria-label="Back to CLARA options"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12 active:scale-95"
                    type="button"
                    onClick={returnToMenu}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{selectedTitle}</p>
                    <p className="truncate text-[11px] text-slate-300/70">
                      {activeMode === "purchase_decision" ? "Decision check active" : "Ask before you spend"}
                    </p>
                  </div>
                </div>

                <button
                  aria-label="Close CLARA"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12 active:scale-95"
                  type="button"
                  onClick={closeAssistant}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="clara-decision-scroll flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-[1.1rem] px-3.5 py-2.5 text-xs leading-5 shadow-[0_10px_26px_rgba(0,0,0,0.16)] ${
                          isUser
                            ? "bg-emerald-300 text-slate-950"
                            : "border border-white/10 bg-white/[0.065] text-slate-100"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-white/8 px-3.5 py-3">
                <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
                  {CHAT_QUICK_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.085] active:scale-95"
                      type="button"
                      onClick={() => sendQuickOption(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <form
                  className="flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-slate-950/62 p-2"
                  onSubmit={handleChatSubmit}
                >
                  <input
                    ref={inputRef}
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-white outline-none placeholder:text-slate-400/70"
                    placeholder={
                      activeMode === "purchase_decision"
                        ? "Item + price, e.g. shoes ₱1,200"
                        : "Ask CLARA privately..."
                    }
                    type="text"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                  />
                  <button
                    aria-label="Send message"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(110,231,183,0.24)] transition disabled:opacity-45 active:scale-95"
                    disabled={!chatDraft.trim()}
                    type="submit"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
