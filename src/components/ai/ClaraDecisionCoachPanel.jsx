import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Keyboard, Mic, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useFinancialData } from "../../hooks/useFinancialData";
import {
  buildClaraFinanceSnapshot,
  generateClaraLocalReply,
  hasUsableClaraSnapshot,
} from "../../lib/clara-local-brain";

const INITIAL_MESSAGE = "I’m here. Ask me before you spend.";
const CLOSE_ANIMATION_MS = 190;

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
    label: "Check my budget",
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
  { label: "Budget check", message: "Budget check" },
  { label: "Spending review", message: "Check my spending" },
  { label: "Wallets", message: "Check my wallets" },
];

const CLARA_DECISION_STYLES = `
  @keyframes claraDecisionBackdropIn {
    from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
  }

  @keyframes claraDecisionBackdropOut {
    from { opacity: 1; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
    to { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
  }

  @keyframes claraDecisionSheetIn {
    from { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  @keyframes claraDecisionSheetOut {
    from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    to { opacity: 0; transform: translate3d(0, 16px, 0) scale(0.985); }
  }

  @keyframes claraDecisionSheetInDesktop {
    from { opacity: 0; transform: translate3d(-50%, calc(-50% + 18px), 0) scale(0.985); }
    to { opacity: 1; transform: translate3d(-50%, -50%, 0) scale(1); }
  }

  @keyframes claraDecisionSheetOutDesktop {
    from { opacity: 1; transform: translate3d(-50%, -50%, 0) scale(1); }
    to { opacity: 0; transform: translate3d(-50%, calc(-50% + 16px), 0) scale(0.985); }
  }

  @keyframes claraDecisionGlowPulse {
    0%, 100% { opacity: 0.62; transform: scale(1); }
    50% { opacity: 0.95; transform: scale(1.04); }
  }

  @keyframes claraDecisionOptionIn {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  .clara-decision-backdrop {
    animation: claraDecisionBackdropIn 180ms ease-out both;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
  }

  .clara-decision-backdrop-out {
    animation: claraDecisionBackdropOut 170ms ease-in both;
  }

  .clara-decision-sheet {
    animation: claraDecisionSheetIn 220ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
    will-change: transform, opacity;
  }

  .clara-decision-sheet-out {
    animation: claraDecisionSheetOut 170ms ease-in both;
    pointer-events: none;
  }

  .clara-decision-glow {
    animation: claraDecisionGlowPulse 4s ease-in-out infinite;
    will-change: transform, opacity;
  }

  .clara-decision-option {
    animation: claraDecisionOptionIn 240ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
  }

  .clara-decision-scroll {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  @media (min-width: 640px) {
    .clara-decision-sheet { animation-name: claraDecisionSheetInDesktop; }
    .clara-decision-sheet-out { animation-name: claraDecisionSheetOutDesktop; }
  }

  @media (prefers-reduced-motion: reduce) {
    .clara-decision-backdrop,
    .clara-decision-backdrop-out,
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
  }, [open]);

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
      return "Private mode is for quiet money reflection. You can type safely here first; voice can stay optional for home use only.";
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
          "Private mode is your quiet space for deeper money reflection. Type here for now; voice should stay optional for home or private moments."
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

  const handleBackdropPointerDown = (event) => {
    if (event.target !== event.currentTarget) return;
    closeAssistant(event);
  };

  if (!panelMode) return null;

  const shellClassName = `clara-decision-sheet${isClosing ? " clara-decision-sheet-out" : ""}`;
  const backdropClassName = `clara-decision-backdrop${isClosing ? " clara-decision-backdrop-out" : ""}`;

  return (
    <>
      <style>{CLARA_DECISION_STYLES}</style>

      <div
        aria-modal="true"
        className={`${backdropClassName} fixed inset-0 z-[99990] flex items-end justify-center bg-black/58 px-4 pt-16 text-white sm:items-center sm:p-6`}
        role="dialog"
        onClick={handleBackdropPointerDown}
        onMouseDown={handleBackdropPointerDown}
        onPointerDown={handleBackdropPointerDown}
      >
        <section
          className={`${shellClassName} relative w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/92 shadow-[0_26px_100px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:fixed sm:left-1/2 sm:top-1/2`}
          onClick={stopAssistantPropagation}
          onMouseDown={stopAssistantPropagation}
          onPointerDown={stopAssistantPropagation}
        >
          <div className="clara-decision-glow pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-emerald-400/16 blur-3xl" />
          <div className="clara-decision-glow pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-cyan-400/14 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {panelMode === "menu" ? (
            <div className="relative p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
                    CLARA
                  </div>
                  <h2 className="text-[1.7rem] font-black leading-[1.05] tracking-tight text-white">
                    Ask before you spend.
                  </h2>
                  <p className="mt-2 max-w-[20rem] text-sm leading-5 text-slate-300/82">
                    A private money pause before the decision becomes regret.
                  </p>
                </div>

                <button
                  aria-label="Close CLARA"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:bg-white/14 active:scale-95"
                  type="button"
                  onClick={closeAssistant}
                  onPointerDown={stopAssistantPropagation}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                className="rounded-[1.65rem] border border-emerald-200/16 bg-gradient-to-br from-white/[0.105] to-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_55px_rgba(0,0,0,0.28)]"
                onSubmit={handleHeroSubmit}
              >
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                  Decision check
                </label>
                <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-slate-950/55 px-4 py-3.5">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-slate-400/70"
                    inputMode="text"
                    placeholder="What are you thinking of buying?"
                    type="text"
                    value={heroDraft}
                    onChange={(event) => setHeroDraft(event.target.value)}
                  />
                  <button
                    aria-label="Ask CLARA"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_28px_rgba(110,231,183,0.32)] transition active:scale-95"
                    type="submit"
                  >
                    <Send size={17} />
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-300/72">
                  Public mode is silent and text-first. Voice stays optional for private moments.
                </p>
              </form>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {INTENT_OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.label}
                      className={`clara-decision-option group rounded-[1.35rem] border p-3.5 text-left transition active:scale-[0.985] ${
                        option.featured
                          ? "border-emerald-200/20 bg-emerald-300/[0.105] shadow-[0_12px_34px_rgba(16,185,129,0.12)]"
                          : "border-white/10 bg-white/[0.055] hover:bg-white/[0.085]"
                      }`}
                      style={{ animationDelay: `${index * 28}ms` }}
                      type="button"
                      onClick={() => startFromOption(option)}
                    >
                      <span className="mb-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/8 text-emerald-100">
                        <Icon size={17} />
                      </span>
                      <span className="block text-sm font-bold text-white">{option.label}</span>
                      <span className="mt-1 block text-[11px] leading-4 text-slate-300/70">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-xs text-slate-300/76">
                <span>{contextStatus === "live" ? "Finance memory live" : "Finance memory warming up"}</span>
                <span className="font-semibold text-emerald-100/85">Private by design</span>
              </div>
            </div>
          ) : (
            <div className="relative flex max-h-[84vh] min-h-[520px] flex-col sm:max-h-[760px]">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label="Back to CLARA options"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12 active:scale-95"
                    type="button"
                    onClick={returnToMenu}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{selectedTitle}</p>
                    <p className="truncate text-xs text-slate-300/70">
                      {activeMode === "purchase_decision" ? "Decision check active" : "Ask before you spend"}
                    </p>
                  </div>
                </div>

                <button
                  aria-label="Close CLARA"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12 active:scale-95"
                  type="button"
                  onClick={closeAssistant}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="clara-decision-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[84%] rounded-[1.3rem] px-4 py-3 text-sm leading-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${
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

              <div className="border-t border-white/8 px-4 py-3 sm:px-5">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {CHAT_QUICK_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.085] active:scale-95"
                      type="button"
                      onClick={() => sendQuickOption(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <form
                  className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-slate-950/62 p-2.5"
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
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_28px_rgba(110,231,183,0.26)] transition disabled:opacity-45 active:scale-95"
                    disabled={!chatDraft.trim()}
                    type="submit"
                  >
                    <Send size={17} />
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
