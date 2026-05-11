import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Keyboard, Mic, Send, ShieldCheck, Sparkles, TrendingUp, X } from "lucide-react";
import { useFinancialData } from "../../hooks/useFinancialData";
import {
  buildClaraFinanceSnapshot,
  generateClaraLocalReply,
  hasUsableClaraSnapshot,
} from "../../lib/clara-local-brain";

const CLOSE_ANIMATION_MS = 160;
const INITIAL_MESSAGE = "I’m here. Ask me before you spend.";

const PRIMARY_OPTIONS = [
  { label: "Before I buy", mode: "purchase_decision", prompt: "", icon: ShieldCheck, featured: true },
  { label: "Check budget", mode: "budget_check", prompt: "Budget check", icon: Keyboard },
];

const SECONDARY_OPTIONS = [
  { label: "Predict", mode: "predict_future", prompt: "Predict my future", icon: TrendingUp },
  { label: "Review", mode: "spending_review", prompt: "Check my spending", icon: Sparkles },
  { label: "Private", mode: "private_mode", prompt: "Private mode", icon: Mic },
];

const CHAT_CHIPS = [
  { label: "Before I buy", message: "Before I buy this", mode: "purchase_decision" },
  { label: "Predict", message: "Predict my future" },
  { label: "Budget", message: "Budget check" },
  { label: "Spending", message: "Check my spending" },
  { label: "Wallets", message: "Check my wallets" },
];

const STYLES = `
  @keyframes claraDockIn {
    from { opacity: 0; transform: translate3d(16px, 22px, 0) scale(.94); filter: blur(4px); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
  }

  @keyframes claraDockOut {
    from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
    to { opacity: 0; transform: translate3d(14px, 20px, 0) scale(.95); filter: blur(3px); }
  }

  @keyframes claraDockGlow {
    0%, 100% { opacity: .5; transform: scale(1); }
    50% { opacity: .82; transform: scale(1.04); }
  }

  @keyframes claraChipIn {
    from { opacity: 0; transform: translateY(7px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .clara-dock-wrap { pointer-events: none; }
  .clara-dock-card {
    animation: claraDockIn 210ms cubic-bezier(.2,.85,.25,1) both;
    transform-origin: calc(100% - 42px) calc(100% - 18px);
    will-change: transform, opacity, filter;
  }
  .clara-dock-card-out { animation: claraDockOut 150ms ease-in both; pointer-events: none; }
  .clara-dock-glow { animation: claraDockGlow 4s ease-in-out infinite; }
  .clara-dock-chip { animation: claraChipIn 200ms cubic-bezier(.2,.85,.25,1) both; }
  .clara-dock-scroll { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .clara-dock-tail {
    position: absolute;
    right: 38px;
    bottom: -8px;
    width: 16px;
    height: 16px;
    transform: rotate(45deg);
    border-right: 1px solid rgba(255,255,255,.12);
    border-bottom: 1px solid rgba(255,255,255,.12);
    background: rgba(2,6,23,.94);
  }

  @media (prefers-reduced-motion: reduce) {
    .clara-dock-card,
    .clara-dock-card-out,
    .clara-dock-glow,
    .clara-dock-chip { animation: none !important; will-change: auto !important; }
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
    safeContext.profile?.user
  );
  const candidateProfile = getFirstObject(safeContext.profile, safeContext.userProfile, safeContext.account);
  const userId =
    candidateUser?.id ||
    candidateUser?.user_id ||
    candidateProfile?.user_id ||
    candidateProfile?.userId ||
    candidateProfile?.id ||
    safeContext.userId ||
    safeContext.user_id ||
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

function stopEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

function stopPropagation(event) {
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
  return hasUsableClaraSnapshot(buildClaraFinanceSnapshot(context)) ? "live" : "warming";
}

export default function ClaraDecisionDockPanel({ open, onClose, context = {} }) {
  const normalizedFinanceUser = useMemo(() => normalizeFinanceUserFromContext(context), [context]);

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
      userId: normalizedFinanceUser?.id || normalizedFinanceUser?.user_id || context?.userId || context?.user_id || null,
      expenses: safeArray(expenses),
      wallets: safeArray(wallets),
      walletTransactions: safeArray(walletTransactions),
      transfers: safeArray(transfers),
      budgets: safeArray(budgets),
      savingsGoals: safeArray(savingsGoals),
      emergencyFund: safeObject(emergencyFund),
    }),
    [context, normalizedFinanceUser, expenses, wallets, walletTransactions, transfers, budgets, savingsGoals, emergencyFund]
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

  useEffect(() => () => {
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
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

    const localMessage = forcedMode === "purchase_decision" && !text.toLowerCase().includes("before")
      ? `Before I buy this: ${text}`
      : text;

    try {
      return generateClaraLocalReply(localMessage, currentContext);
    } catch {
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
        makeMessage("clara", "Private mode is your quiet money space. Type here for now; voice should stay optional for home or private moments."),
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
    openChat({ title: option.label || "Ask CLARA", mode: option.mode || null, prompt: option.prompt || "" });
  };

  const handleHeroSubmit = (event) => {
    stopEvent(event);
    if (isClosing) return;

    const text = heroDraft.trim();
    if (!text) {
      openChat({ title: "Before I buy", mode: "purchase_decision" });
      return;
    }

    setHeroDraft("");
    openChat({
      title: "Before I buy",
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

    setMessages((current) => [
      ...current,
      makeMessage("user", text),
      makeMessage("clara", getReplyForText(text, forcedMode)),
    ]);

    if (forcedMode === "purchase_decision" && /(?:₱|php\s*)?\d/i.test(text)) setActiveMode(null);
  };

  const handleChatSubmit = (event) => {
    stopEvent(event);
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft("");
    sendMessageText(text);
  };

  const sendQuickOption = (option) => {
    if (!option) return;
    if (option.mode === "purchase_decision") {
      setActiveMode("purchase_decision");
      setMessages((current) => [
        ...current,
        makeMessage("user", option.message),
        makeMessage("clara", "What are you thinking of buying? Add the price if you know it."),
      ]);
      return;
    }
    sendMessageText(option.message || option.label, option.mode || activeMode);
  };

  const returnToMenu = (event) => {
    stopEvent(event);
    if (isClosing) return;
    setPanelMode("menu");
    setSelectedTitle("Ask CLARA");
    setActiveMode(null);
    setChatDraft("");
    setMessages([makeMessage("clara", INITIAL_MESSAGE)]);
  };

  const closePanel = (event) => {
    stopEvent(event);
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

  const cardClassName = `clara-dock-card${isClosing ? " clara-dock-card-out" : ""}`;

  return (
    <>
      <style>{STYLES}</style>
      <div
        aria-live="polite"
        className="clara-dock-wrap fixed bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] right-4 z-[99990] w-[min(calc(100vw-2rem),330px)] text-white sm:right-[max(1.5rem,calc((100vw-440px)/2+1.5rem))]"
      >
        <section
          aria-modal="false"
          className={`${cardClassName} pointer-events-auto relative overflow-hidden rounded-[1.45rem] border border-white/12 bg-slate-950/88 shadow-[0_18px_50px_rgba(0,0,0,.46),0_0_0_1px_rgba(255,255,255,.04)] backdrop-blur-2xl`}
          role="dialog"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
        >
          <div className="clara-dock-tail" />
          <div className="clara-dock-glow pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="clara-dock-glow pointer-events-none absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

          {panelMode === "menu" ? (
            <div className="relative p-3.5">
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-100/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.9)]" />
                    CLARA
                  </div>
                  <h2 className="text-[1.16rem] font-black leading-[1.05] tracking-tight text-white">
                    Ask before you spend.
                  </h2>
                  <p className="mt-1 text-[11px] leading-4 text-slate-300/78">
                    Tell me what you’re about to buy.
                  </p>
                </div>

                <button
                  aria-label="Close CLARA"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 shadow-[0_8px_22px_rgba(0,0,0,.2)] transition hover:bg-white/14 active:scale-95"
                  type="button"
                  onClick={closePanel}
                  onPointerDown={stopPropagation}
                >
                  <X size={15} />
                </button>
              </div>

              <form
                className="rounded-[1.15rem] border border-emerald-200/16 bg-gradient-to-br from-white/[.105] to-white/[.045] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_12px_34px_rgba(0,0,0,.18)]"
                onSubmit={handleHeroSubmit}
              >
                <div className="flex items-center gap-2 rounded-[.95rem] border border-white/10 bg-slate-950/55 px-3 py-2.5">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-white outline-none placeholder:text-slate-400/70"
                    inputMode="text"
                    placeholder="What are you buying?"
                    type="text"
                    value={heroDraft}
                    onChange={(event) => setHeroDraft(event.target.value)}
                  />
                  <button
                    aria-label="Ask CLARA"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_22px_rgba(110,231,183,.26)] transition active:scale-95"
                    type="submit"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {PRIMARY_OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.label}
                      className={`clara-dock-chip flex items-center gap-2 rounded-[1rem] border px-3 py-2.5 text-left transition active:scale-[.985] ${
                        option.featured
                          ? "border-emerald-200/20 bg-emerald-300/[.105] shadow-[0_8px_22px_rgba(16,185,129,.10)]"
                          : "border-white/10 bg-white/[.055] hover:bg-white/[.085]"
                      }`}
                      style={{ animationDelay: `${index * 24}ms` }}
                      type="button"
                      onClick={() => startFromOption(option)}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-emerald-100">
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 truncate text-[11px] font-bold text-white">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5">
                {SECONDARY_OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.label}
                      className="clara-dock-chip flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.045] px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 transition hover:bg-white/[.075] active:scale-95"
                      style={{ animationDelay: `${(index + 2) * 24}ms` }}
                      type="button"
                      onClick={() => startFromOption(option)}
                    >
                      <Icon size={12} />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.035] px-3 py-2 text-[9px] text-slate-300/72">
                <span>{contextStatus === "live" ? "Finance memory live" : "Finance memory warming"}</span>
                <span className="font-semibold text-emerald-100/82">Private by design</span>
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
                  onClick={closePanel}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="clara-dock-scroll flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[86%] rounded-[1.1rem] px-3.5 py-2.5 text-xs leading-5 shadow-[0_10px_26px_rgba(0,0,0,.16)] ${
                          isUser
                            ? "bg-emerald-300 text-slate-950"
                            : "border border-white/10 bg-white/[.065] text-slate-100"
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
                  {CHAT_CHIPS.map((option) => (
                    <button
                      key={option.label}
                      className="shrink-0 rounded-full border border-white/10 bg-white/[.055] px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[.085] active:scale-95"
                      type="button"
                      onClick={() => sendQuickOption(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <form className="flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-slate-950/62 p-2" onSubmit={handleChatSubmit}>
                  <input
                    ref={inputRef}
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-white outline-none placeholder:text-slate-400/70"
                    placeholder={activeMode === "purchase_decision" ? "Item + price, e.g. shoes ₱1,200" : "Ask CLARA privately..."}
                    type="text"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                  />
                  <button
                    aria-label="Send message"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(110,231,183,.24)] transition disabled:opacity-45 active:scale-95"
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
