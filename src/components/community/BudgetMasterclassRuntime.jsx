import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  HelpCircle,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  Target,
  X,
} from "lucide-react";
import {
  BUDGET_MASTERCLASS_CLOSING,
  BUDGET_MASTERCLASS_FINISH,
  BUDGET_MASTERCLASS_INTRO,
  BUDGET_MASTERCLASS_STEPS,
  BUDGET_MASTERCLASS_TITLE,
  buildFollowUpPrompt,
  getBudgetMasterclassSupportSequence,
} from "@/lib/clara-budget-masterclass";
import { requestBudgetMasterclassAi } from "@/lib/clara-budget-masterclass-ai";

const MIN_READ_DELAY_MS = 5200;
const MAX_READ_DELAY_MS = 8200;
const LIVE_SESSION_CONTEXT_KEY = "clara_budget_masterclass_live_context_v1";

function makeMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    ...extra,
  };
}

function ClaraBubble({ message, displayText, typing = false }) {
  const isUser = message.role === "user";
  const text = displayText ?? message.text;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[88%] rounded-[24px] px-4 py-3.5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.18)]",
          isUser
            ? "rounded-br-[8px] border border-cyan-100/15 bg-cyan-300/[0.12] text-cyan-50"
            : message.kind === "clarification"
              ? "rounded-bl-[8px] border border-yellow-100/14 bg-[linear-gradient(145deg,rgba(252,209,22,0.08),rgba(13,37,75,0.90)_58%,rgba(59,25,79,0.78))] text-white"
              : "rounded-bl-[8px] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(10,37,69,0.94),rgba(8,21,51,0.96)_54%,rgba(38,20,66,0.88))] text-white",
        ].join(" ")}
      >
        {!isUser && message.eyebrow ? (
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.20em] text-cyan-100/48">
            {message.eyebrow}
          </p>
        ) : null}
        {!isUser && message.title ? (
          <h3 className="mb-2 text-[16px] font-black tracking-[-0.025em] text-white/96">
            {message.title}
          </h3>
        ) : null}
        <p className="whitespace-pre-line text-[13px] font-semibold leading-[1.72] text-current/90">
          {text}
          {typing ? (
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-cyan-100/75" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

function ClaraTypingIndicator({ label = "CLARA is typing" }) {
  return (
    <div className="flex justify-start" aria-label={label}>
      <div className="flex items-center gap-1.5 rounded-[20px] rounded-bl-[8px] border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 animate-bounce rounded-full bg-cyan-100/65"
            style={{ animationDelay: `${index * 140}ms`, animationDuration: "900ms" }}
          />
        ))}
      </div>
    </div>
  );
}

function QuickReply({ children, icon: Icon, onClick, primary = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-left text-[12px] font-black transition active:scale-[0.992] disabled:cursor-not-allowed disabled:opacity-45",
        primary
          ? "border-cyan-100/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.16)_55%,rgba(139,92,246,0.15))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.16)]"
          : "border-white/[0.09] bg-white/[0.045] text-white/78 hover:border-white/[0.16] hover:bg-white/[0.07]",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-cyan-100/72" /> : null}
        <span>{children}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/28" />
    </button>
  );
}

function getReadDelay() {
  return Math.round(MIN_READ_DELAY_MS + Math.random() * (MAX_READ_DELAY_MS - MIN_READ_DELAY_MS));
}

export default function BudgetMasterclassRuntime() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);
  const readTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const initializedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [pendingChoiceMode, setPendingChoiceMode] = useState("");
  const [typedText, setTypedText] = useState("");
  const [choicesMode, setChoicesMode] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [aiMode, setAiMode] = useState("");
  const [finished, setFinished] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [supportLevel, setSupportLevel] = useState(0);
  const [unresolvedStepIds, setUnresolvedStepIds] = useState([]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isOpen =
    location.pathname === "/community" &&
    searchParams.get("view") === "orb" &&
    searchParams.get("masterclass") === "budget";

  const currentStep = BUDGET_MASTERCLASS_STEPS[stepIndex] || BUDGET_MASTERCLASS_STEPS[0];
  const supportSequence = getBudgetMasterclassSupportSequence(currentStep?.id);
  const nextSupport = supportSequence[supportLevel] || null;
  const progress = started
    ? Math.round(((Math.min(stepIndex + 1, BUDGET_MASTERCLASS_STEPS.length)) / BUDGET_MASTERCLASS_STEPS.length) * 100)
    : 0;
  const aiBusy = Boolean(aiMode);
  const claraBusy = Boolean(pendingMessage) || aiBusy;

  const clearConversationTimers = () => {
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    typingTimerRef.current = null;
    readTimerRef.current = null;
    transitionTimerRef.current = null;
  };

  const queueClaraMessage = (message, nextChoiceMode = "") => {
    if (!message) return;
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    typingTimerRef.current = null;
    readTimerRef.current = null;
    setChoicesMode("");
    setPendingChoiceMode(nextChoiceMode);
    setTypedText("");
    setPendingMessage(message);
  };

  useEffect(() => {
    if (!pendingMessage) return undefined;

    const source = String(pendingMessage.text || "");
    if (!source) {
      setMessages((current) => [...current, pendingMessage]);
      setPendingMessage(null);
      return undefined;
    }

    let index = 0;
    const totalDuration = Math.min(5200, Math.max(1800, source.length * 7));
    const tickMs = 28;
    const totalTicks = Math.max(1, Math.ceil(totalDuration / tickMs));
    const charsPerTick = Math.max(1, Math.ceil(source.length / totalTicks));

    typingTimerRef.current = window.setInterval(() => {
      index = Math.min(source.length, index + charsPerTick);
      setTypedText(source.slice(0, index));

      if (index >= source.length) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        const completedMessage = pendingMessage;
        const nextMode = pendingChoiceMode;
        setMessages((current) => [...current, completedMessage]);
        setPendingMessage(null);
        setTypedText("");
        setPendingChoiceMode("");

        if (nextMode) {
          readTimerRef.current = window.setTimeout(() => {
            setChoicesMode(nextMode);
            readTimerRef.current = null;
          }, getReadDelay());
        }
      }
    }, tickMs);

    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, [pendingMessage, pendingChoiceMode]);

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      clearConversationTimers();
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;
    clearConversationTimers();
    setStarted(false);
    setStepIndex(0);
    setMessages([]);
    setPendingMessage(null);
    setPendingChoiceMode("");
    setTypedText("");
    setChoicesMode("");
    setComposerOpen(false);
    setQuestion("");
    setAiMode("");
    setFinished(false);
    setCompleted(false);
    setSupportLevel(0);
    setUnresolvedStepIds([]);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage(
          "clara",
          `Want me to teach you how budgeting actually works?\n\n${BUDGET_MASTERCLASS_INTRO}`,
          {
            kind: "lesson",
            title: "Budgeting Masterclass",
            eyebrow: "CLARA · Let’s learn together",
          }
        ),
        "intro"
      );
      transitionTimerRef.current = null;
    }, 500);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, messages, pendingMessage, typedText, composerOpen, choicesMode, aiMode]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !claraBusy) navigate("/community?view=home");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [claraBusy, isOpen, navigate]);

  useEffect(() => () => clearConversationTimers(), []);

  if (!isOpen) return null;

  const sendUserBubble = (text) => {
    setMessages((current) => [...current, makeMessage("user", text)]);
  };

  const appendLesson = (index) => {
    const step = BUDGET_MASTERCLASS_STEPS[index];
    if (!step) return;
    queueClaraMessage(
      makeMessage("clara", step.text, {
        kind: "lesson",
        title: step.title,
        eyebrow: `Budget Masterclass · Point ${index + 1}`,
      }),
      "lesson"
    );
  };

  const startMasterclass = () => {
    if (claraBusy) return;
    setChoicesMode("");
    sendUserBubble("Start the Budgeting Masterclass.");
    setStarted(true);
    setFinished(false);
    setCompleted(false);
    setStepIndex(0);
    setSupportLevel(0);
    setUnresolvedStepIds([]);
    transitionTimerRef.current = window.setTimeout(() => {
      appendLesson(0);
      transitionTimerRef.current = null;
    }, 700);
  };

  const continueMasterclass = () => {
    if (claraBusy || composerOpen) return;
    setChoicesMode("");
    sendUserBubble("Continue.");

    transitionTimerRef.current = window.setTimeout(() => {
      if (stepIndex >= BUDGET_MASTERCLASS_STEPS.length - 1) {
        setFinished(true);
        queueClaraMessage(
          makeMessage("clara", BUDGET_MASTERCLASS_FINISH, {
            kind: "lesson",
            title: "You made it through the core lesson",
            eyebrow: "Budget Masterclass · Core complete",
          }),
          "finish"
        );
        transitionTimerRef.current = null;
        return;
      }

      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      setSupportLevel(0);
      appendLesson(nextIndex);
      transitionTimerRef.current = null;
    }, 650);
  };

  const showNextSupportingExplanation = () => {
    if (claraBusy || composerOpen || finished || !nextSupport) return;

    const support = nextSupport;
    const nextLevel = supportLevel + 1;
    const exhausted = nextLevel >= supportSequence.length;

    setChoicesMode("");
    sendUserBubble(support.userText);
    setSupportLevel(nextLevel);

    if (exhausted && currentStep?.id) {
      setUnresolvedStepIds((current) =>
        current.includes(currentStep.id) ? current : [...current, currentStep.id]
      );
    }

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage("clara", support.text, {
          kind: "clarification",
          eyebrow: support.eyebrow,
        }),
        exhausted ? "support-exhausted" : "lesson"
      );
      transitionTimerRef.current = null;
    }, 650);
  };

  const openFollowUp = (fromFinish = false) => {
    if (claraBusy) return;
    setChoicesMode("");
    sendUserBubble(fromFinish ? "I want to ask more." : "I have a follow-up question.");
    setQuestion("");
    setComposerOpen(true);
  };

  const submitFollowUp = async (event) => {
    event?.preventDefault?.();
    const cleanQuestion = String(question || "").trim().slice(0, 700);
    if (!cleanQuestion || claraBusy) return;

    sendUserBubble(cleanQuestion);
    setQuestion("");
    setComposerOpen(false);
    setAiMode("followup");

    try {
      const result = await requestBudgetMasterclassAi({
        mode: "follow_up_question",
        prompt: buildFollowUpPrompt({ stepIndex, question: cleanQuestion }),
      });
      setAiMode("");
      queueClaraMessage(
        makeMessage("clara", result.text, {
          kind: "clarification",
          eyebrow: "CLARA · Follow-up",
        }),
        finished ? "finish" : supportLevel >= supportSequence.length ? "support-exhausted" : "lesson"
      );
    } catch (error) {
      setAiMode("");
      queueClaraMessage(
        makeMessage(
          "clara",
          error?.message || "I couldn't answer that follow-up right now. You can ask again or keep going with the masterclass.",
          { kind: "clarification", eyebrow: "CLARA · Follow-up unavailable" }
        ),
        finished ? "finish" : supportLevel >= supportSequence.length ? "support-exhausted" : "lesson"
      );
    }
  };

  const finishWithUnderstanding = () => {
    if (claraBusy) return;
    setChoicesMode("");
    sendUserBubble("I got it now.");
    setCompleted(true);
    setFinished(false);
    setComposerOpen(false);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage("clara", BUDGET_MASTERCLASS_CLOSING, {
          kind: "lesson",
          title: "You got it",
          eyebrow: "CLARA · Budgeting Masterclass",
        }),
        "completed"
      );
      transitionTimerRef.current = null;
    }, 650);
  };

  const scheduleLiveConversation = () => {
    if (claraBusy) return;

    const liveContext = {
      source: "budget-masterclass",
      stepId: currentStep?.id || "",
      stepIndex,
      stepNumber: stepIndex + 1,
      stepTitle: currentStep?.title || "",
      supportLevel,
      unresolvedStepIds,
      createdAt: new Date().toISOString(),
    };

    try {
      window.sessionStorage.setItem(LIVE_SESSION_CONTEXT_KEY, JSON.stringify(liveContext));
    } catch {
      // The scheduler still opens even when storage is unavailable.
    }

    navigate("/welcome-session", {
      state: {
        source: "budget-masterclass",
        budgetMasterclass: liveContext,
      },
    });
  };

  const restartMasterclass = () => {
    clearConversationTimers();
    setStarted(false);
    setStepIndex(0);
    setMessages([]);
    setPendingMessage(null);
    setPendingChoiceMode("");
    setTypedText("");
    setChoicesMode("");
    setComposerOpen(false);
    setQuestion("");
    setAiMode("");
    setFinished(false);
    setCompleted(false);
    setSupportLevel(0);
    setUnresolvedStepIds([]);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage(
          "clara",
          `Want me to teach you how budgeting actually works?\n\n${BUDGET_MASTERCLASS_INTRO}`,
          {
            kind: "lesson",
            title: "Budgeting Masterclass",
            eyebrow: "CLARA · Let’s learn together",
          }
        ),
        "intro"
      );
      transitionTimerRef.current = null;
    }, 450);
  };

  const quickRepliesVisible = Boolean(choicesMode) && !claraBusy && !composerOpen;

  return (
    <div className="fixed inset-0 z-[2147483500] flex flex-col overflow-hidden bg-[#010217] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_2%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(99,102,241,0.15),transparent_34%),radial-gradient(circle_at_78%_92%,rgba(206,17,38,0.08),transparent_34%)]" />

      <header className="relative z-10 shrink-0 border-b border-white/[0.07] bg-[#041126]/92 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/community?view=home")}
            disabled={claraBusy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/68 transition hover:bg-white/[0.09] disabled:opacity-40"
            aria-label="Back to CLARA Home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-100/18 bg-[linear-gradient(145deg,rgba(34,211,238,0.16),rgba(37,99,235,0.14),rgba(139,92,246,0.14))] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            <Target className="h-[18px] w-[18px]" />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.20em] text-cyan-100/48">
              Learn with CLARA
            </p>
            <h1 className="truncate text-[16px] font-black tracking-[-0.025em] text-white/96">
              {BUDGET_MASTERCLASS_TITLE}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/community?view=orb")}
            disabled={claraBusy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/52 transition hover:bg-white/[0.09] disabled:opacity-40"
            aria-label="Close Budgeting Masterclass"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {started ? (
          <div className="mx-auto mt-3 w-full max-w-3xl">
            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
              <span>{completed ? "Complete" : finished ? "Core complete" : `Point ${stepIndex + 1} of ${BUDGET_MASTERCLASS_STEPS.length}`}</span>
              <span>{completed || finished ? "100%" : `${progress}%`}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6,#fcd116)] transition-[width] duration-500"
                style={{ width: `${completed || finished ? 100 : progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      <main ref={scrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <div className="mx-auto w-full max-w-3xl space-y-4 pb-5">
          {messages.map((message) => (
            <ClaraBubble key={message.id} message={message} />
          ))}

          {aiBusy ? <ClaraTypingIndicator label="CLARA is thinking and typing" /> : null}

          {!aiBusy && pendingMessage ? (
            <ClaraBubble message={pendingMessage} displayText={typedText} typing />
          ) : null}
        </div>
      </main>

      {composerOpen ? (
        <footer className="relative z-20 shrink-0 border-t border-white/[0.07] bg-[#041126]/96 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <form onSubmit={submitFollowUp} className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-2 rounded-[22px] border border-cyan-100/13 bg-white/[0.045] p-2.5 shadow-[0_-10px_28px_rgba(0,0,0,0.14)]">
              <textarea
                autoFocus
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 700))}
                rows={1}
                placeholder="Ask CLARA your follow-up question…"
                className="max-h-28 min-h-[46px] flex-1 resize-none rounded-[16px] border border-white/[0.07] bg-black/20 px-3.5 py-3 text-[13px] font-semibold leading-5 text-white outline-none placeholder:text-white/28 focus:border-cyan-100/25"
              />
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setQuestion("");
                  setChoicesMode(
                    finished
                      ? "finish"
                      : supportLevel >= supportSequence.length
                        ? "support-exhausted"
                        : "lesson"
                  );
                }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-white/[0.07] bg-white/[0.04] text-white/44"
                aria-label="Cancel follow-up question"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!question.trim() || claraBusy}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-cyan-100/20 bg-cyan-300/[0.13] text-cyan-50 transition active:scale-95 disabled:opacity-35"
                aria-label="Send follow-up question"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </footer>
      ) : null}

      {quickRepliesVisible ? (
        <footer className="relative z-20 shrink-0 border-t border-white/[0.07] bg-[#041126]/96 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl">
            <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/28">
              Your reply
            </p>

            {choicesMode === "intro" ? (
              <QuickReply icon={ChevronRight} onClick={startMasterclass} primary>
                Start the Budgeting Masterclass
              </QuickReply>
            ) : choicesMode === "finish" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <QuickReply icon={MessageCircleQuestion} onClick={() => openFollowUp(true)} primary>
                  Ask more
                </QuickReply>
                <QuickReply icon={Check} onClick={finishWithUnderstanding}>
                  I got it now
                </QuickReply>
                <QuickReply icon={CalendarClock} onClick={scheduleLiveConversation}>
                  Schedule with CLARA
                </QuickReply>
              </div>
            ) : choicesMode === "completed" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <QuickReply icon={ArrowLeft} onClick={() => navigate("/community?view=home")} primary>
                  Back to Budget
                </QuickReply>
                <QuickReply icon={RotateCcw} onClick={restartMasterclass}>
                  Review the masterclass again
                </QuickReply>
              </div>
            ) : choicesMode === "support-exhausted" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <QuickReply icon={ChevronRight} onClick={continueMasterclass} primary>
                  {stepIndex >= BUDGET_MASTERCLASS_STEPS.length - 1
                    ? "Finish the core Masterclass"
                    : `Continue to Point ${stepIndex + 2}`}
                </QuickReply>
                <QuickReply icon={CalendarClock} onClick={scheduleLiveConversation}>
                  Talk this through with CLARA
                </QuickReply>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <QuickReply icon={ChevronRight} onClick={continueMasterclass} primary>
                  Continue
                </QuickReply>
                {nextSupport ? (
                  <QuickReply icon={RotateCcw} onClick={showNextSupportingExplanation}>
                    {nextSupport.buttonLabel}
                  </QuickReply>
                ) : null}
                <QuickReply icon={HelpCircle} onClick={() => openFollowUp(false)}>
                  I have a follow-up question
                </QuickReply>
              </div>
            )}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
