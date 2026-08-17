import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  BUDGET_MASTERCLASS_CLOSING,
  BUDGET_MASTERCLASS_FINISH,
  BUDGET_MASTERCLASS_INTRO,
  BUDGET_MASTERCLASS_STEPS,
  BUDGET_MASTERCLASS_TITLE,
  buildExplainAnotherWayPrompt,
  buildFollowUpPrompt,
} from "@/lib/clara-budget-masterclass";
import { requestBudgetMasterclassAi } from "@/lib/clara-budget-masterclass-ai";

function makeMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    ...extra,
  };
}

function ClaraBubble({ message }) {
  const isUser = message.role === "user";

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
          {message.text}
        </p>
      </div>
    </div>
  );
}

function ChoiceButton({ children, icon: Icon, onClick, primary = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left text-[12px] font-black transition active:scale-[0.992] disabled:cursor-not-allowed disabled:opacity-45",
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

export default function BudgetMasterclassRuntime() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [aiMode, setAiMode] = useState("");
  const [finished, setFinished] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [liveNoticeShown, setLiveNoticeShown] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isOpen =
    location.pathname === "/community" &&
    searchParams.get("view") === "orb" &&
    searchParams.get("masterclass") === "budget";

  const currentStep = BUDGET_MASTERCLASS_STEPS[stepIndex] || BUDGET_MASTERCLASS_STEPS[0];
  const progress = started
    ? Math.round(((Math.min(stepIndex + 1, BUDGET_MASTERCLASS_STEPS.length)) / BUDGET_MASTERCLASS_STEPS.length) * 100)
    : 0;
  const aiBusy = Boolean(aiMode);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, messages, composerOpen, aiMode, finished, completed]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !aiBusy) navigate("/community?view=home");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aiBusy, isOpen, navigate]);

  if (!isOpen) return null;

  const appendLesson = (index) => {
    const step = BUDGET_MASTERCLASS_STEPS[index];
    if (!step) return;
    setMessages((current) => [
      ...current,
      makeMessage("clara", step.text, {
        kind: "lesson",
        title: step.title,
        eyebrow: `Budget Masterclass · Point ${index + 1}`,
      }),
    ]);
  };

  const startMasterclass = () => {
    setStarted(true);
    setFinished(false);
    setCompleted(false);
    setStepIndex(0);
    setMessages([]);
    setComposerOpen(false);
    setQuestion("");
    setLiveNoticeShown(false);
    window.setTimeout(() => appendLesson(0), 80);
  };

  const continueMasterclass = () => {
    if (aiBusy || composerOpen) return;
    if (stepIndex >= BUDGET_MASTERCLASS_STEPS.length - 1) {
      setFinished(true);
      setMessages((current) => [
        ...current,
        makeMessage("clara", BUDGET_MASTERCLASS_FINISH, {
          kind: "lesson",
          title: "You made it through the core lesson",
          eyebrow: "Budget Masterclass · Core complete",
        }),
      ]);
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    appendLesson(nextIndex);
  };

  const explainAnotherWay = async () => {
    if (aiBusy || composerOpen || finished) return;
    setAiMode("explain");
    try {
      const result = await requestBudgetMasterclassAi({
        mode: "explain_another_way",
        prompt: buildExplainAnotherWayPrompt(currentStep),
      });
      setMessages((current) => [
        ...current,
        makeMessage("clara", result.text, {
          kind: "clarification",
          eyebrow: "CLARA · Another way to see it",
        }),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        makeMessage(
          "clara",
          error?.message || "I couldn't generate another explanation right now. You can try again or continue to the next point.",
          { kind: "clarification", eyebrow: "CLARA · Clarification unavailable" }
        ),
      ]);
    } finally {
      setAiMode("");
    }
  };

  const openFollowUp = () => {
    if (aiBusy) return;
    setQuestion("");
    setComposerOpen(true);
  };

  const submitFollowUp = async (event) => {
    event?.preventDefault?.();
    const cleanQuestion = String(question || "").trim().slice(0, 700);
    if (!cleanQuestion || aiBusy) return;

    setMessages((current) => [...current, makeMessage("user", cleanQuestion)]);
    setQuestion("");
    setComposerOpen(false);
    setAiMode("followup");

    try {
      const result = await requestBudgetMasterclassAi({
        mode: "follow_up_question",
        prompt: buildFollowUpPrompt({ stepIndex, question: cleanQuestion }),
      });
      setMessages((current) => [
        ...current,
        makeMessage("clara", result.text, {
          kind: "clarification",
          eyebrow: "CLARA · Follow-up",
        }),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        makeMessage(
          "clara",
          error?.message || "I couldn't answer that follow-up right now. You can ask again or keep going with the masterclass.",
          { kind: "clarification", eyebrow: "CLARA · Follow-up unavailable" }
        ),
      ]);
    } finally {
      setAiMode("");
    }
  };

  const finishWithUnderstanding = () => {
    setCompleted(true);
    setFinished(false);
    setComposerOpen(false);
    setMessages((current) => [
      ...current,
      makeMessage("clara", BUDGET_MASTERCLASS_CLOSING, {
        kind: "lesson",
        title: "You got it",
        eyebrow: "CLARA · Budgeting Masterclass",
      }),
    ]);
  };

  const showLiveConversationNotice = () => {
    if (liveNoticeShown) return;
    setLiveNoticeShown(true);
    setMessages((current) => [
      ...current,
      makeMessage(
        "clara",
        "I’ll keep this option ready for a dedicated CLARA live conversation. It is not connected to an admin or human-coaching flow in this Budget pilot. For now, you can keep asking follow-up questions here whenever one part needs more explanation.",
        { kind: "clarification", eyebrow: "CLARA · Live conversation" }
      ),
    ]);
  };

  const restartMasterclass = () => {
    setStarted(false);
    setStepIndex(0);
    setMessages([]);
    setComposerOpen(false);
    setQuestion("");
    setAiMode("");
    setFinished(false);
    setCompleted(false);
    setLiveNoticeShown(false);
  };

  return (
    <div className="fixed inset-0 z-[2147483500] flex flex-col overflow-hidden bg-[#010217] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_2%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(99,102,241,0.15),transparent_34%),radial-gradient(circle_at_78%_92%,rgba(206,17,38,0.08),transparent_34%)]" />

      <header className="relative z-10 shrink-0 border-b border-white/[0.07] bg-[#041126]/92 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/community?view=home")}
            disabled={aiBusy}
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
            disabled={aiBusy}
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
        <div className="mx-auto w-full max-w-3xl space-y-4 pb-4">
          {!started ? (
            <section className="mx-auto mt-[min(6vh,42px)] max-w-xl text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-100/14 bg-cyan-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/62">
                <Sparkles className="h-3.5 w-3.5" />
                CLARA guided masterclass
              </div>
              <div className="rounded-[30px] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(8,32,61,0.94),rgba(7,18,45,0.96)_52%,rgba(35,19,68,0.90))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.065)] sm:p-6">
                <h2 className="text-[25px] font-black leading-tight tracking-[-0.04em] text-white">
                  Want me to teach you how budgeting actually works?
                </h2>
                <p className="mt-4 whitespace-pre-line text-[13px] font-semibold leading-[1.75] text-white/70">
                  {BUDGET_MASTERCLASS_INTRO}
                </p>
                <button
                  type="button"
                  onClick={startMasterclass}
                  className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-[20px] border border-cyan-100/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(37,99,235,0.22)_55%,rgba(139,92,246,0.20))] px-4 py-3.5 text-[13px] font-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.20)] transition hover:brightness-110 active:scale-[0.992]"
                >
                  Start the Budgeting Masterclass
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          ) : (
            <>
              {messages.map((message) => (
                <ClaraBubble key={message.id} message={message} />
              ))}

              {aiBusy ? (
                <div className="flex justify-start">
                  <div className="flex max-w-[88%] items-center gap-3 rounded-[22px] rounded-bl-[8px] border border-cyan-100/10 bg-white/[0.045] px-4 py-3 text-left text-[12px] font-bold text-white/62">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                    {aiMode === "explain"
                      ? "CLARA is thinking of another way to explain this…"
                      : "CLARA is thinking about your follow-up question…"}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      {started && !completed ? (
        <footer className="relative z-20 shrink-0 border-t border-white/[0.07] bg-[#041126]/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl">
            {composerOpen ? (
              <form onSubmit={submitFollowUp} className="rounded-[22px] border border-cyan-100/13 bg-white/[0.045] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/58">
                    Your follow-up question
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false);
                      setQuestion("");
                    }}
                    className="text-[10px] font-black text-white/38"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    autoFocus
                    value={question}
                    onChange={(event) => setQuestion(event.target.value.slice(0, 700))}
                    rows={2}
                    placeholder="Ask CLARA what is still unclear…"
                    className="min-h-[54px] flex-1 resize-none rounded-[16px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-[13px] font-semibold leading-5 text-white outline-none placeholder:text-white/28 focus:border-cyan-100/25"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || aiBusy}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-100/20 bg-cyan-300/[0.13] text-cyan-50 transition active:scale-95 disabled:opacity-35"
                    aria-label="Send follow-up question"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : finished ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <ChoiceButton icon={MessageCircleQuestion} onClick={openFollowUp} primary>
                  Ask more
                </ChoiceButton>
                <ChoiceButton icon={Check} onClick={finishWithUnderstanding}>
                  I got it now
                </ChoiceButton>
                <ChoiceButton icon={CalendarClock} onClick={showLiveConversationNotice}>
                  Schedule a live conversation
                </ChoiceButton>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <ChoiceButton icon={ChevronRight} onClick={continueMasterclass} primary disabled={aiBusy}>
                  Continue
                </ChoiceButton>
                <ChoiceButton icon={RotateCcw} onClick={explainAnotherWay} disabled={aiBusy}>
                  Explain this another way
                </ChoiceButton>
                <ChoiceButton icon={HelpCircle} onClick={openFollowUp} disabled={aiBusy}>
                  I have a follow-up question
                </ChoiceButton>
              </div>
            )}
          </div>
        </footer>
      ) : null}

      {completed ? (
        <footer className="relative z-20 shrink-0 border-t border-white/[0.07] bg-[#041126]/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto grid w-full max-w-3xl gap-2 sm:grid-cols-2">
            <ChoiceButton icon={ArrowLeft} onClick={() => navigate("/community?view=home")} primary>
              Back to Budget
            </ChoiceButton>
            <ChoiceButton icon={RotateCcw} onClick={restartMasterclass}>
              Review the masterclass again
            </ChoiceButton>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
