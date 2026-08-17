import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  Globe2,
  HelpCircle,
  MessageCircleQuestion,
  RotateCcw,
  Target,
  X,
} from "lucide-react";
import {
  BUDGET_MASTERCLASS_LANGUAGE_OPTIONS,
  getBudgetMasterclassExperience,
  getBudgetMasterclassSupportSequenceForLanguage,
} from "@/lib/clara-budget-masterclass-i18n";
import { getBudgetMasterclassPointQuestions } from "@/lib/clara-budget-masterclass-questions";
import { getBudgetMasterclassQuestionSupports } from "@/lib/clara-budget-masterclass-question-supports";

const MIN_READ_DELAY_MS = 5200;
const MAX_READ_DELAY_MS = 8200;
const LIVE_SESSION_CONTEXT_KEY = "clara_budget_masterclass_live_context_v1";

const POINT_QUESTION_UI = {
  en: {
    pickerLabel: "Choose a question",
    buttonLabel: "Questions about this point",
    backLabel: "Back to point options",
    answerEyebrow: "CLARA · KEY QUESTION",
    askedLabel: "Asked",
    clarityLabel: "Need more clarity?",
    gotItLabel: "That makes sense",
    backQuestionsLabel: "Back to questions",
    supportButtons: [
      "Explain this answer another way",
      "Show me a real-life example",
      "Give me the simplest version",
    ],
    supportUserText: [
      "Explain this answer another way.",
      "Show me a real-life example.",
      "Give me the simplest version.",
    ],
    supportEyebrows: [
      "CLARA · ANOTHER WAY · 1/3",
      "CLARA · REAL-LIFE EXAMPLE · 2/3",
      "CLARA · SIMPLEST VERSION · 3/3",
    ],
  },
  tl: {
    pickerLabel: "Pumili ng tanong",
    buttonLabel: "Mga tanong tungkol sa point na ito",
    backLabel: "Bumalik sa point options",
    answerEyebrow: "CLARA · MAHALAGANG TANONG",
    askedLabel: "Naitanong na",
    clarityLabel: "Kailangan pa ng linaw?",
    gotItLabel: "Gets ko na",
    backQuestionsLabel: "Bumalik sa mga tanong",
    supportButtons: [
      "Ipaliwanag sa ibang paraan",
      "Bigyan ako ng totoong halimbawa",
      "Pinakasimpleng version",
    ],
    supportUserText: [
      "Ipaliwanag ang sagot sa ibang paraan.",
      "Bigyan ako ng totoong halimbawa.",
      "Bigyan ako ng pinakasimpleng version.",
    ],
    supportEyebrows: [
      "CLARA · IBANG PARAAN · 1/3",
      "CLARA · TOTOONG HALIMBAWA · 2/3",
      "CLARA · PINAKASIMPLE · 3/3",
    ],
  },
  es: {
    pickerLabel: "Elige una pregunta",
    buttonLabel: "Preguntas sobre este punto",
    backLabel: "Volver a las opciones del punto",
    answerEyebrow: "CLARA · PREGUNTA CLAVE",
    askedLabel: "Ya preguntada",
    clarityLabel: "¿Necesitas más claridad?",
    gotItLabel: "Ya tiene sentido",
    backQuestionsLabel: "Volver a las preguntas",
    supportButtons: [
      "Explícame esta respuesta de otra forma",
      "Dame un ejemplo real",
      "Dame la versión más simple",
    ],
    supportUserText: [
      "Explícame esta respuesta de otra forma.",
      "Dame un ejemplo real.",
      "Dame la versión más simple.",
    ],
    supportEyebrows: [
      "CLARA · OTRA FORMA · 1/3",
      "CLARA · EJEMPLO REAL · 2/3",
      "CLARA · VERSIÓN MÁS SIMPLE · 3/3",
    ],
  },
};

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

function QuickReply({
  children,
  icon: Icon,
  onClick,
  primary = false,
  disabled = false,
  used = false,
  statusLabel = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-left text-[12px] font-black transition disabled:cursor-not-allowed",
        used
          ? "border-white/[0.045] bg-white/[0.022] text-white/28 shadow-none"
          : primary
            ? "border-cyan-100/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.16)_55%,rgba(139,92,246,0.15))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.16)] active:scale-[0.992]"
            : "border-white/[0.09] bg-white/[0.045] text-white/78 hover:border-white/[0.16] hover:bg-white/[0.07] active:scale-[0.992] disabled:opacity-45",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <Icon className={`h-4 w-4 shrink-0 ${used ? "text-white/18" : "text-cyan-100/72"}`} />
        ) : null}
        <span>{children}</span>
      </span>
      {statusLabel ? (
        <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/28">
          {statusLabel}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/28" />
      )}
    </button>
  );
}

function LanguageGate({ onSelect, onBack, onClose }) {
  return (
    <div className="fixed inset-0 z-[2147483500] flex min-h-[100dvh] flex-col overflow-hidden bg-[#010217] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(36,107,253,0.26),transparent_35%),radial-gradient(circle_at_90%_12%,rgba(206,17,38,0.16),transparent_34%),radial-gradient(circle_at_50%_88%,rgba(252,209,22,0.07),transparent_30%)]" />

      <div className="relative z-10 flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))] sm:px-7">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-full border border-cyan-100/16 bg-[#071a34]/88 text-cyan-50/80 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition active:scale-95"
          aria-label="Back to CLARA Home"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full border border-rose-300/15 bg-[#2a0b1a]/76 text-rose-50/76 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition active:scale-95"
          aria-label="Close Budgeting Masterclass"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-7">
        <section
          className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] border border-cyan-100/14 bg-[linear-gradient(150deg,rgba(7,30,61,0.97),rgba(4,13,36,0.98)_52%,rgba(34,9,31,0.96))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7"
          data-budget-masterclass-language-gate="true"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#246bfd_0_56%,#fcd116_56%_70%,#ce1126_70%_100%)]" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full border border-violet-200/10 bg-violet-400/[0.05]" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full border border-cyan-200/10 bg-cyan-300/[0.04]" />

          <div className="relative z-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-100/18 bg-[linear-gradient(145deg,rgba(36,107,253,0.20),rgba(15,35,73,0.82)_52%,rgba(252,209,22,0.09))] text-cyan-50 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
              <Globe2 className="h-6 w-6" />
            </div>

            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.24em] text-yellow-200/68">
              BUDGETING MASTERCLASS
            </p>
            <h1 className="mt-2 text-[27px] font-black tracking-[-0.04em] text-white sm:text-[32px]">
              Choose your learning language
            </h1>
          </div>

          <div className="relative z-10 mt-6 grid gap-2.5 sm:grid-cols-3">
            {BUDGET_MASTERCLASS_LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => onSelect(option.code)}
                className="group flex min-h-[104px] items-center gap-3 rounded-[22px] border border-white/[0.09] bg-white/[0.045] px-4 py-4 text-left transition hover:border-cyan-100/22 hover:bg-cyan-100/[0.07] active:scale-[0.99] sm:flex-col sm:items-start sm:justify-between"
                aria-label={`Use ${option.label} for the Budgeting Masterclass`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-100/15 bg-[#081d3c] text-[10px] font-black tracking-[0.14em] text-cyan-100/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {option.shortLabel}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black tracking-[-0.02em] text-white/94">
                    {option.nativeLabel}
                  </span>
                  <span className="mt-1 block text-[10.5px] font-semibold leading-[1.45] text-white/42">
                    {option.description}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/24 transition group-hover:translate-x-0.5 group-hover:text-cyan-100/65 sm:self-end" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
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

  const [language, setLanguage] = useState("");
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [pendingChoiceMode, setPendingChoiceMode] = useState("");
  const [typedText, setTypedText] = useState("");
  const [choicesMode, setChoicesMode] = useState("");
  const [questionReturnMode, setQuestionReturnMode] = useState("lesson");
  const [askedPointQuestions, setAskedPointQuestions] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(-1);
  const [questionSupportLevel, setQuestionSupportLevel] = useState(0);
  const [finished, setFinished] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [supportLevel, setSupportLevel] = useState(0);
  const [unresolvedStepIds, setUnresolvedStepIds] = useState([]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isOpen =
    location.pathname === "/community" &&
    searchParams.get("view") === "orb" &&
    searchParams.get("masterclass") === "budget";

  const experience = useMemo(() => getBudgetMasterclassExperience(language || "en"), [language]);
  const copy = experience.ui;
  const questionUi = POINT_QUESTION_UI[language] || POINT_QUESTION_UI.en;
  const currentStep = experience.steps[stepIndex] || experience.steps[0];
  const supportSequence = getBudgetMasterclassSupportSequenceForLanguage(language || "en", currentStep?.id);
  const pointQuestions = getBudgetMasterclassPointQuestions(language || "en", currentStep?.id);
  const askedQuestionIndexes = askedPointQuestions[currentStep?.id] || [];
  const activeQuestionSupports =
    activeQuestionIndex >= 0
      ? getBudgetMasterclassQuestionSupports(language || "en", currentStep?.id, activeQuestionIndex)
      : null;
  const questionSupportSequence = activeQuestionSupports
    ? [
        {
          text: activeQuestionSupports.anotherWay,
          buttonLabel: questionUi.supportButtons[0],
          userText: questionUi.supportUserText[0],
          eyebrow: questionUi.supportEyebrows[0],
        },
        {
          text: activeQuestionSupports.realLife,
          buttonLabel: questionUi.supportButtons[1],
          userText: questionUi.supportUserText[1],
          eyebrow: questionUi.supportEyebrows[1],
        },
        {
          text: activeQuestionSupports.simplest,
          buttonLabel: questionUi.supportButtons[2],
          userText: questionUi.supportUserText[2],
          eyebrow: questionUi.supportEyebrows[2],
        },
      ].filter((item) => item.text)
    : [];
  const nextQuestionSupport = questionSupportSequence[questionSupportLevel] || null;
  const nextSupport = supportSequence[supportLevel] || null;
  const progress = started
    ? Math.round(((Math.min(stepIndex + 1, experience.steps.length)) / experience.steps.length) * 100)
    : 0;
  const claraBusy = Boolean(pendingMessage);

  const clearConversationTimers = () => {
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    typingTimerRef.current = null;
    readTimerRef.current = null;
    transitionTimerRef.current = null;
  };

  const resetQuestionThread = () => {
    setActiveQuestionIndex(-1);
    setQuestionSupportLevel(0);
  };

  const resetConversationState = () => {
    setStarted(false);
    setStepIndex(0);
    setMessages([]);
    setPendingMessage(null);
    setPendingChoiceMode("");
    setTypedText("");
    setChoicesMode("");
    setQuestionReturnMode("lesson");
    setAskedPointQuestions({});
    resetQuestionThread();
    setFinished(false);
    setCompleted(false);
    setSupportLevel(0);
    setUnresolvedStepIds([]);
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
    setLanguage("");
    resetConversationState();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !language) return;
    const id = window.requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, language, messages, pendingMessage, typedText, choicesMode]);

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

  const selectLanguage = (nextLanguage) => {
    if (claraBusy) return;
    clearConversationTimers();
    resetConversationState();
    setLanguage(nextLanguage);
    const nextExperience = getBudgetMasterclassExperience(nextLanguage);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage(
          "clara",
          `${nextExperience.ui.introQuestion}\n\n${nextExperience.intro}`,
          {
            kind: "lesson",
            title: nextExperience.title,
            eyebrow: nextExperience.ui.introEyebrow,
          },
        ),
        "intro",
      );
      transitionTimerRef.current = null;
    }, 380);
  };

  if (!language) {
    return (
      <LanguageGate
        onSelect={selectLanguage}
        onBack={() => navigate("/community?view=home")}
        onClose={() => navigate("/community?view=orb")}
      />
    );
  }

  const sendUserBubble = (text) => {
    setMessages((current) => [...current, makeMessage("user", text)]);
  };

  const appendLesson = (index) => {
    const step = experience.steps[index];
    if (!step) return;
    queueClaraMessage(
      makeMessage("clara", step.text, {
        kind: "lesson",
        title: step.title,
        eyebrow: copy.lessonEyebrow(index + 1),
      }),
      "lesson",
    );
  };

  const startMasterclass = () => {
    if (claraBusy) return;
    setChoicesMode("");
    sendUserBubble(copy.startUser);
    setStarted(true);
    setFinished(false);
    setCompleted(false);
    setStepIndex(0);
    setSupportLevel(0);
    setAskedPointQuestions({});
    resetQuestionThread();
    setUnresolvedStepIds([]);
    transitionTimerRef.current = window.setTimeout(() => {
      appendLesson(0);
      transitionTimerRef.current = null;
    }, 700);
  };

  const continueMasterclass = () => {
    if (claraBusy) return;
    setChoicesMode("");
    resetQuestionThread();
    sendUserBubble(copy.continueUser);

    transitionTimerRef.current = window.setTimeout(() => {
      if (stepIndex >= experience.steps.length - 1) {
        setFinished(true);
        queueClaraMessage(
          makeMessage("clara", experience.finish, {
            kind: "lesson",
            title: copy.coreCompleteTitle,
            eyebrow: copy.coreCompleteEyebrow,
          }),
          "finish",
        );
        transitionTimerRef.current = null;
        return;
      }

      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      setSupportLevel(0);
      setQuestionReturnMode("lesson");
      const step = experience.steps[nextIndex];
      queueClaraMessage(
        makeMessage("clara", step.text, {
          kind: "lesson",
          title: step.title,
          eyebrow: copy.lessonEyebrow(nextIndex + 1),
        }),
        "lesson",
      );
      transitionTimerRef.current = null;
    }, 650);
  };

  const showNextSupportingExplanation = () => {
    if (claraBusy || finished || !nextSupport) return;

    const support = nextSupport;
    const nextLevel = supportLevel + 1;
    const exhausted = nextLevel >= supportSequence.length;

    setChoicesMode("");
    resetQuestionThread();
    sendUserBubble(support.userText);
    setSupportLevel(nextLevel);

    if (exhausted && currentStep?.id) {
      setUnresolvedStepIds((current) =>
        current.includes(currentStep.id) ? current : [...current, currentStep.id],
      );
    }

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage("clara", support.text, {
          kind: "clarification",
          eyebrow: support.eyebrow,
        }),
        exhausted ? "support-exhausted" : "lesson",
      );
      transitionTimerRef.current = null;
    }, 650);
  };

  const openPointQuestions = (returnMode = "") => {
    if (claraBusy || pointQuestions.length === 0) return;
    const fallbackMode = finished
      ? "finish"
      : supportLevel >= supportSequence.length
        ? "support-exhausted"
        : "lesson";
    setQuestionReturnMode(returnMode || choicesMode || fallbackMode);
    resetQuestionThread();
    setChoicesMode("questions");
  };

  const answerPointQuestion = (item, questionIndex) => {
    if (
      claraBusy ||
      !currentStep?.id ||
      askedQuestionIndexes.includes(questionIndex) ||
      !item?.question ||
      !item?.answer
    ) {
      return;
    }

    setAskedPointQuestions((current) => {
      const existing = current[currentStep.id] || [];
      if (existing.includes(questionIndex)) return current;
      return {
        ...current,
        [currentStep.id]: [...existing, questionIndex],
      };
    });

    setActiveQuestionIndex(questionIndex);
    setQuestionSupportLevel(0);
    setChoicesMode("");
    sendUserBubble(item.question);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage("clara", item.answer, {
          kind: "clarification",
          eyebrow: questionUi.answerEyebrow,
        }),
        "question-thread",
      );
      transitionTimerRef.current = null;
    }, 520);
  };

  const showNextQuestionSupport = () => {
    if (claraBusy || !nextQuestionSupport || activeQuestionIndex < 0) return;

    const support = nextQuestionSupport;
    setChoicesMode("");
    sendUserBubble(support.userText);
    setQuestionSupportLevel((current) => current + 1);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage("clara", support.text, {
          kind: "clarification",
          eyebrow: support.eyebrow,
        }),
        "question-thread",
      );
      transitionTimerRef.current = null;
    }, 520);
  };

  const returnToQuestions = () => {
    if (claraBusy) return;
    resetQuestionThread();
    setChoicesMode("questions");
  };

  const finishQuestionThread = () => {
    if (claraBusy) return;
    returnToQuestions();
  };

  const finishWithUnderstanding = () => {
    if (claraBusy) return;
    setChoicesMode("");
    resetQuestionThread();
    sendUserBubble(copy.gotItUser);
    setCompleted(true);
    setFinished(false);

    transitionTimerRef.current = window.setTimeout(() => {
      queueClaraMessage(
        makeMessage("clara", experience.closing, {
          kind: "lesson",
          title: copy.gotItTitle,
          eyebrow: copy.gotItEyebrow,
        }),
        "completed",
      );
      transitionTimerRef.current = null;
    }, 650);
  };

  const scheduleLiveConversation = () => {
    if (claraBusy) return;

    const liveContext = {
      source: "budget-masterclass",
      language,
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
    resetConversationState();
    setLanguage("");
  };

  const quickRepliesVisible = Boolean(choicesMode) && !claraBusy;

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
            aria-label={copy.backHome}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-100/18 bg-[linear-gradient(145deg,rgba(34,211,238,0.16),rgba(37,99,235,0.14),rgba(139,92,246,0.14))] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            <Target className="h-[18px] w-[18px]" />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.20em] text-cyan-100/48">
              {copy.learnWithClara}
            </p>
            <h1 className="truncate text-[16px] font-black tracking-[-0.025em] text-white/96">
              {experience.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/community?view=orb")}
            disabled={claraBusy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/52 transition hover:bg-white/[0.09] disabled:opacity-40"
            aria-label="Close Budgeting Masterclass"
            title={copy.closeMasterclass}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {started ? (
          <div className="mx-auto mt-3 w-full max-w-3xl">
            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
              <span>
                {completed
                  ? copy.complete
                  : finished
                    ? copy.coreComplete
                    : copy.pointOf(stepIndex + 1, experience.steps.length)}
              </span>
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

          {pendingMessage ? (
            <ClaraBubble message={pendingMessage} displayText={typedText} typing />
          ) : null}
        </div>
      </main>

      {quickRepliesVisible ? (
        <footer className="relative z-20 shrink-0 border-t border-white/[0.07] bg-[#041126]/96 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl">
            <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/28">
              {choicesMode === "questions"
                ? questionUi.pickerLabel
                : choicesMode === "question-thread"
                  ? questionUi.clarityLabel
                  : copy.yourReply}
            </p>

            {choicesMode === "intro" ? (
              <QuickReply icon={ChevronRight} onClick={startMasterclass} primary>
                {copy.startButton}
              </QuickReply>
            ) : choicesMode === "questions" ? (
              <div className="space-y-2">
                {pointQuestions.map((item, index) => {
                  const wasAsked = askedQuestionIndexes.includes(index);
                  return (
                    <QuickReply
                      key={`${currentStep?.id || "point"}-question-${index}`}
                      icon={MessageCircleQuestion}
                      onClick={() => answerPointQuestion(item, index)}
                      primary={index === 0 && !wasAsked}
                      disabled={wasAsked}
                      used={wasAsked}
                      statusLabel={wasAsked ? questionUi.askedLabel : ""}
                    >
                      {item.question}
                    </QuickReply>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    resetQuestionThread();
                    setChoicesMode(questionReturnMode || "lesson");
                  }}
                  className="mt-1 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.06] bg-transparent px-3 text-[10.5px] font-bold text-white/42 transition hover:bg-white/[0.035] hover:text-white/66"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {questionUi.backLabel}
                </button>
              </div>
            ) : choicesMode === "question-thread" ? (
              <div className="space-y-2">
                <div className={`grid gap-2 ${nextQuestionSupport ? "sm:grid-cols-2" : ""}`}>
                  <QuickReply icon={Check} onClick={finishQuestionThread} primary>
                    {questionUi.gotItLabel}
                  </QuickReply>
                  {nextQuestionSupport ? (
                    <QuickReply icon={RotateCcw} onClick={showNextQuestionSupport}>
                      {nextQuestionSupport.buttonLabel}
                    </QuickReply>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={returnToQuestions}
                  className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.06] bg-transparent px-3 text-[10.5px] font-bold text-white/42 transition hover:bg-white/[0.035] hover:text-white/66"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {questionUi.backQuestionsLabel}
                </button>
              </div>
            ) : choicesMode === "finish" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <QuickReply icon={MessageCircleQuestion} onClick={() => openPointQuestions("finish")} primary>
                  {copy.askMoreButton}
                </QuickReply>
                <QuickReply icon={Check} onClick={finishWithUnderstanding}>
                  {copy.gotItButton}
                </QuickReply>
                <QuickReply icon={CalendarClock} onClick={scheduleLiveConversation}>
                  {copy.scheduleButton}
                </QuickReply>
              </div>
            ) : choicesMode === "completed" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <QuickReply icon={ArrowLeft} onClick={() => navigate("/community?view=home")} primary>
                  {copy.backBudgetButton}
                </QuickReply>
                <QuickReply icon={RotateCcw} onClick={restartMasterclass}>
                  {copy.reviewButton}
                </QuickReply>
              </div>
            ) : choicesMode === "support-exhausted" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <QuickReply icon={ChevronRight} onClick={continueMasterclass} primary>
                  {stepIndex >= experience.steps.length - 1
                    ? copy.finishCoreButton
                    : copy.continuePointButton(stepIndex + 2)}
                </QuickReply>
                <QuickReply icon={HelpCircle} onClick={() => openPointQuestions("support-exhausted")}>
                  {questionUi.buttonLabel}
                </QuickReply>
                <QuickReply icon={CalendarClock} onClick={scheduleLiveConversation}>
                  {copy.talkThroughButton}
                </QuickReply>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <QuickReply icon={ChevronRight} onClick={continueMasterclass} primary>
                  {copy.continueButton}
                </QuickReply>
                {nextSupport ? (
                  <QuickReply icon={RotateCcw} onClick={showNextSupportingExplanation}>
                    {nextSupport.buttonLabel}
                  </QuickReply>
                ) : null}
                <QuickReply icon={HelpCircle} onClick={() => openPointQuestions("lesson")}>
                  {questionUi.buttonLabel}
                </QuickReply>
              </div>
            )}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
