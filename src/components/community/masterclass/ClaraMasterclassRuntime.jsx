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
Target,
X,
} from "lucide-react";
import { requestClaraMasterclassAi } from "@/lib/clara-masterclass-ai";
import { getClaraMasterclassDefinition } from "@/lib/clara-masterclass-registry";
import ClaraMasterclassLanguageGate from "./ClaraMasterclassLanguageGate";
import {
POINT_QUESTION_UI,
ClaraBubble,
ClaraExampleBoard,
QuickReply,
getReadDelay,
makeMessage,
} from "./ClaraMasterclassPrimitives";
export default function ClaraMasterclassRuntime() {
const location = useLocation();
const navigate = useNavigate();
const scrollRef = useRef(null);
const typingTimerRef = useRef(null);
const readTimerRef = useRef(null);
const transitionTimerRef = useRef(null);
const initializedMasterclassRef = useRef("");
const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
const masterclassId = searchParams.get("masterclass") || "";
const definition = useMemo(() => getClaraMasterclassDefinition(masterclassId), [masterclassId]);
const isOpen =
location.pathname === "/community" &&
searchParams.get("view") === "orb" &&
Boolean(definition);
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
const [aiReturnMode, setAiReturnMode] = useState("lesson");
const [aiQuestion, setAiQuestion] = useState("");
const [aiError, setAiError] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const experience = useMemo(
() => (definition ? definition.getExperience(language || "en") : null),
[definition, language],
);
const copy = experience?.ui || {};
const questionUi = POINT_QUESTION_UI[language] || POINT_QUESTION_UI.en;
const currentStep = experience?.steps?.[stepIndex] || experience?.steps?.[0] || null;
const supportSequence = definition
? definition.getSupportSequence(language || "en", currentStep?.id)
: [];
const pointQuestions = definition
? definition.getPointQuestions(language || "en", currentStep?.id)
: [];
const askedQuestionIndexes = askedPointQuestions[currentStep?.id] || [];
const activeQuestionSupports =
definition && activeQuestionIndex >= 0
? definition.getQuestionSupports(language || "en", currentStep?.id, activeQuestionIndex)
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
const progress = started && experience?.steps?.length
? Math.round(((Math.min(stepIndex + 1, experience.steps.length)) / experience.steps.length) * 100)
: 0;
const claraBusy = Boolean(pendingMessage) || aiLoading;
const completionExample = useMemo(
() =>
definition?.getCompletionExample?.({
language: language || "en",
locationState: location.state,
}) || null,
[definition, language, location.state],
);
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
setAiReturnMode("lesson");
setAiQuestion("");
setAiError("");
setAiLoading(false);
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
if (!isOpen || !definition) {
initializedMasterclassRef.current = "";
clearConversationTimers();
return;
}
if (initializedMasterclassRef.current === definition.id) return;
initializedMasterclassRef.current = definition.id;
clearConversationTimers();
setLanguage("");
resetConversationState();
}, [definition, isOpen]);
useEffect(() => {
if (!isOpen || !language) return;
const id = window.requestAnimationFrame(() => {
const node = scrollRef.current;
if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
});
return () => window.cancelAnimationFrame(id);
}, [isOpen, language, messages, pendingMessage, typedText, choicesMode, completionExample]);
useEffect(() => {
if (!isOpen || !definition) return undefined;
const onKeyDown = (event) => {
if (event.key === "Escape" && !claraBusy) navigate(definition.backRoute);
};
window.addEventListener("keydown", onKeyDown);
return () => window.removeEventListener("keydown", onKeyDown);
}, [claraBusy, definition, isOpen, navigate]);
useEffect(() => () => clearConversationTimers(), []);
if (!isOpen || !definition || !experience) return null;
const selectLanguage = (nextLanguage) => {
if (claraBusy) return;
clearConversationTimers();
resetConversationState();
setLanguage(nextLanguage);
const nextExperience = definition.getExperience(nextLanguage);
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
<ClaraMasterclassLanguageGate
definition={definition}
onSelect={selectLanguage}
onBack={() => navigate(definition.backRoute)}
onClose={() => navigate(definition.closeRoute)}
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
const openAiFollowUp = (returnMode = "") => {
if (claraBusy || !definition?.buildFollowUpPrompt) return;
const fallbackMode = finished
? "finish"
: supportLevel >= supportSequence.length
? "support-exhausted"
: "lesson";
setAiReturnMode(returnMode || choicesMode || fallbackMode);
setAiQuestion("");
setAiError("");
setChoicesMode("ai-follow-up");
};
const submitAiFollowUp = async (event) => {
event?.preventDefault?.();
if (claraBusy || !definition?.buildFollowUpPrompt) return;
const question = String(aiQuestion || "").trim();
if (!question) {
setAiError(copy.composerRequired || "Write a short follow-up question first.");
return;
}
setAiLoading(true);
setAiError("");
setChoicesMode("");
sendUserBubble(question);
try {
const prompt = definition.buildFollowUpPrompt({ language: language || "en", stepIndex, question });
const response = await requestClaraMasterclassAi({
masterclassId: definition.id,
mode: "follow_up_question",
prompt,
});
setAiLoading(false);
queueClaraMessage(
makeMessage("clara", response.text, {
kind: "clarification",
eyebrow: copy.followUpEyebrow || "CLARA · FOLLOW-UP",
}),
"ai-follow-up-result",
);
} catch (error) {
setAiLoading(false);
const fallback = copy.followUpError || "I couldn't answer that follow-up right now. You can try again or continue the Masterclass.";
queueClaraMessage(
makeMessage("clara", error?.message || fallback, {
kind: "clarification",
eyebrow: copy.followUpUnavailableEyebrow || "CLARA · FOLLOW-UP UNAVAILABLE",
}),
"ai-follow-up-result",
);
}
};
const finishAiFollowUp = () => {
if (claraBusy) return;
setAiQuestion("");
setAiError("");
setChoicesMode(aiReturnMode || "lesson");
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
source: definition.liveSession.source,
masterclassId: definition.id,
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
window.sessionStorage.setItem(definition.liveSession.storageKey, JSON.stringify(liveContext));
} catch {
// The scheduler still opens even when storage is unavailable.
}
navigate("/welcome-session", {
state: {
source: definition.liveSession.source,
[definition.liveSession.stateKey]: liveContext,
claraMasterclass: liveContext,
},
});
};
const restartMasterclass = () => {
clearConversationTimers();
resetConversationState();
setLanguage("");
};
const quickRepliesVisible = Boolean(choicesMode) && !claraBusy;
const completedBackLabel = copy.backMasterclassButton || copy.backBudgetButton;
const showCompletionExample = completed && choicesMode === "completed" && Boolean(completionExample);
return (
<div className="fixed inset-0 z-[2147483500] flex flex-col overflow-hidden bg-[#010217] text-white">
{definition.id !== "budget" && definition.useLegacyBudgetStyleHooks ? (
<span hidden aria-hidden="true" aria-label="Close Budgeting Masterclass" data-masterclass-style-compat="true" />
) : null}
<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_2%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(99,102,241,0.15),transparent_34%),radial-gradient(circle_at_78%_92%,rgba(206,17,38,0.08),transparent_34%)]" />
<header className="relative z-10 shrink-0 border-b border-white/[0.07] bg-[#041126]/92 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
<div className="mx-auto flex w-full max-w-3xl items-center gap-3">
<button
type="button"
onClick={() => navigate(definition.backRoute)}
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
onClick={() => navigate(definition.closeRoute)}
disabled={claraBusy}
className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/52 transition hover:bg-white/[0.09] disabled:opacity-40"
aria-label={definition.closeAriaLabel}
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
{showCompletionExample ? <ClaraExampleBoard board={completionExample} /> : null}
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
<QuickReply icon={MessageCircleQuestion} onClick={() => openAiFollowUp("questions")}>
{copy.followUpButton || "Ask CLARA a custom follow-up"}
</QuickReply>
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
<div className="grid gap-2 sm:grid-cols-2">
<QuickReply icon={Check} onClick={finishQuestionThread} primary>
{questionUi.gotItLabel}
</QuickReply>
{nextQuestionSupport ? (
<QuickReply icon={RotateCcw} onClick={showNextQuestionSupport}>
{nextQuestionSupport.buttonLabel}
</QuickReply>
) : (
<QuickReply icon={MessageCircleQuestion} onClick={() => openAiFollowUp("questions")}>
{copy.followUpButton || "Ask CLARA a custom follow-up"}
</QuickReply>
)}
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
) : choicesMode === "ai-follow-up" ? (
<form onSubmit={submitAiFollowUp} className="space-y-2">
<label className="sr-only" htmlFor={`clara-masterclass-follow-up-${definition.id}`}>
{copy.composerPlaceholder || "Ask CLARA your follow-up question"}
</label>
<textarea
id={`clara-masterclass-follow-up-${definition.id}`}
value={aiQuestion}
onChange={(event) => { setAiQuestion(event.target.value); setAiError(""); }}
maxLength={1200}
rows={3}
autoFocus
placeholder={copy.composerPlaceholder || "Ask CLARA your follow-up question…"}
className="w-full resize-none rounded-[18px] border border-white/[0.09] bg-white/[0.045] px-4 py-3 text-[13px] font-semibold leading-[1.55] text-white/90 outline-none placeholder:text-white/28 focus:border-cyan-100/25 focus:bg-white/[0.06]"
/>
{aiError ? <p className="px-1 text-[10.5px] font-semibold text-rose-200/82">{aiError}</p> : null}
<div className="grid gap-2 sm:grid-cols-2">
<button type="button" onClick={finishAiFollowUp} className="min-h-11 rounded-[18px] border border-white/[0.08] bg-white/[0.035] px-4 text-[12px] font-black text-white/58 transition hover:bg-white/[0.06]">
{copy.cancelFollowUp || "Cancel"}
</button>
<button type="submit" className="min-h-11 rounded-[18px] border border-cyan-100/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.16)_55%,rgba(139,92,246,0.15))] px-4 text-[12px] font-black text-cyan-50 transition active:scale-[0.992]">
{copy.sendFollowUp || "Send follow-up question"}
</button>
</div>
</form>
) : choicesMode === "ai-follow-up-result" ? (
<div className="grid gap-2 sm:grid-cols-2">
<QuickReply icon={Check} onClick={finishAiFollowUp} primary>
{questionUi.gotItLabel}
</QuickReply>
<QuickReply icon={MessageCircleQuestion} onClick={() => openAiFollowUp(aiReturnMode)}>
{copy.followUpAgainButton || copy.followUpButton || "Ask another follow-up"}
</QuickReply>
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
<QuickReply icon={ArrowLeft} onClick={() => navigate(definition.completedRoute)} primary>
{completedBackLabel}
</QuickReply>
<QuickReply icon={RotateCcw} onClick={restartMasterclass}>
{copy.reviewButton}
</QuickReply>
</div>
) : choicesMode === "support-exhausted" ? (
<div className="grid gap-2 sm:grid-cols-2">
<QuickReply icon={ChevronRight} onClick={continueMasterclass} primary>
{stepIndex >= experience.steps.length - 1
? copy.finishCoreButton
: copy.continuePointButton(stepIndex + 2)}
</QuickReply>
<QuickReply icon={HelpCircle} onClick={() => openPointQuestions("support-exhausted")}>
{questionUi.buttonLabel}
</QuickReply>
<QuickReply icon={MessageCircleQuestion} onClick={() => openAiFollowUp("support-exhausted")}>
{copy.followUpButton || "Ask CLARA a custom follow-up"}
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
