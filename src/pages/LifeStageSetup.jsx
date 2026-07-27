import { useState } from "react";
import { Check, ChevronLeft, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLifeStageHero } from "../life-stage-hero";
import {
  DEFAULT_LIFE_STAGE_SELECTION,
  getLifeStageOptions,
  getLifeStageQuestions,
  getLifeStageSelectionList,
  getLifeStageStageContext,
  normalizeLifeStageKey,
} from "../life-stage-flow";
import {
  normalizeLifeStageImageVariant,
  readLifeStageProfile,
  saveLifeStageProfile,
} from "../life-stage-profile";

const QUESTION_META = {
  setup: {
    eyebrow: "Current setup",
    prompt: "Which setup feels closest to your real life right now?",
    boardSummary: "This helps CLARA understand the real-life setup shaping your money decisions.",
  },
  rhythm: {
    eyebrow: "Money rhythm",
    prompt: "How does money usually come into your week or month?",
    boardSummary: "This helps CLARA read how your income rhythm affects planning, spending, and stability.",
  },
  workload: {
    eyebrow: "Weekly load",
    prompt: "How stretched does your normal week feel?",
    boardSummary: "This shows how your weekly load can affect your energy and everyday money decisions.",
  },
  pressure: {
    eyebrow: "Pressure right now",
    prompt: "What is putting the most pressure on your money right now?",
    boardSummary: "This tells CLARA which part of your money life needs the most protection right now.",
  },
  coping: {
    eyebrow: "When pressure hits",
    prompt: "What do you usually do when money pressure gets heavy?",
    boardSummary: "This shows how you tend to respond when money pressure becomes heavy.",
  },
  goal: {
    eyebrow: "What to protect",
    prompt: "What are you trying to protect most right now?",
    boardSummary: "This tells CLARA what your money system should protect first.",
  },
};

const MAX_BOARD_SUMMARY_LENGTH = 180;

function compactBoardSummary(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= MAX_BOARD_SUMMARY_LENGTH) return text;

  const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length <= MAX_BOARD_SUMMARY_LENGTH) {
    return firstSentence;
  }

  const clipped = text.slice(0, MAX_BOARD_SUMMARY_LENGTH - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const safeEnd = lastSpace > 120 ? lastSpace : clipped.length;
  return `${clipped.slice(0, safeEnd).trim()}…`;
}

function getQuestionKeys(stage, draft = {}) {
  const questions = getLifeStageQuestions(stage);
  return (questions.order || ["setup", "rhythm", "workload", "pressure", "coping", "goal"]).filter(
    (key) => (getLifeStageOptions({ ...draft, stage }, key) || []).length > 0
  );
}

function buildStageDraft(stageName, previous = {}) {
  const stage = normalizeLifeStageKey(stageName);
  const next = {
    stage,
    imageVariant: normalizeLifeStageImageVariant(previous.imageVariant || "default"),
  };

  getQuestionKeys(stage, previous).forEach((key) => {
    const options = getLifeStageOptions({ ...previous, stage }, key) || [];
    next[key] = options.includes(previous[key]) ? previous[key] : options[0];
  });

  return next;
}

function getStageDisplayLabel(stage, option) {
  const value = String(option || "");
  const questions = getLifeStageQuestions(stage);
  return questions.displayLabels?.[value] || value;
}

function getAnswerContext(questionKey, value, draft = {}) {
  const questions = getLifeStageQuestions(draft.stage);
  const label = getStageDisplayLabel(draft.stage, value);
  const context = questions.getQuestionContext?.(questionKey, value, draft);
  const explicitShortSummary = context?.shortSummary || context?.boardSummary;

  return {
    title: label,
    summary: compactBoardSummary(
      explicitShortSummary ||
        QUESTION_META[questionKey]?.boardSummary ||
        `This helps CLARA connect “${label}” with your ${draft.stage} money reality.`
    ),
  };
}

function StageCard({ stage, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-[78px] w-full overflow-hidden rounded-[24px] border px-3.5 py-3 text-left transition duration-200 active:scale-[0.985] ${
        active
          ? "border-cyan-200/55 bg-[linear-gradient(135deg,rgba(45,212,191,.18),rgba(59,130,246,.14)_45%,rgba(91,63,209,.18))] shadow-[0_0_36px_rgba(34,211,238,.22),0_18px_44px_rgba(2,8,23,.36),inset_0_1px_0_rgba(255,255,255,.10)]"
          : "border-white/[0.075] bg-[#071226]/54 shadow-[0_14px_34px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.035)]"
      }`}
    >
      <div className="relative z-10 flex w-full items-center gap-3.5">
        <span
          className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[18px] border backdrop-blur-xl ${
            active
              ? "border-cyan-100/28 bg-cyan-200/12 text-cyan-100"
              : "border-white/[0.075] bg-white/[0.035] text-white/46"
          }`}
        >
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-black leading-tight tracking-[-0.01em] text-white/90 drop-shadow-sm">
          {stage}
        </p>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
            active
              ? "border-cyan-100/42 bg-cyan-200/16 text-cyan-50"
              : "border-white/[0.12] bg-white/[0.025] text-transparent"
          }`}
        >
          {active ? <Check className="h-5 w-5" /> : null}
        </span>
      </div>
    </button>
  );
}

function OptionGroup({ eyebrow, prompt, value, options, onSelect, displayValue }) {
  return (
    <section className="rounded-[26px] border border-white/[0.085] bg-[#071226]/64 p-4 shadow-[0_16px_38px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-xl">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/52">
        {eyebrow}
      </p>
      <p className="mt-2 text-[12px] font-bold leading-5 text-white/62">{prompt}</p>
      <div className="mt-3 space-y-2.5">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`relative flex min-h-[62px] w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition active:scale-[0.985] ${
                active
                  ? "border-cyan-200/38 bg-[linear-gradient(135deg,rgba(45,212,191,.16),rgba(59,130,246,.12)_48%,rgba(91,63,209,.16))] text-cyan-50"
                  : "border-white/[0.075] bg-[#071226]/54 text-white/58"
              }`}
            >
              <span className="text-[13px] font-black leading-tight">{displayValue(option)}</span>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                  active
                    ? "border-cyan-100/38 bg-cyan-200/14 text-cyan-50"
                    : "border-white/[0.12] bg-white/[0.025] text-transparent"
                }`}
              >
                {active ? <Check className="h-4 w-4" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function LifeStageSetup() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => {
    const profile = readLifeStageProfile();
    return buildStageDraft(profile.stage || DEFAULT_LIFE_STAGE_SELECTION, profile);
  });
  const [step, setStep] = useState("stage");

  const stageList = getLifeStageSelectionList();
  const questionKeys = getQuestionKeys(draft.stage, draft);
  const stepOrder = ["stage", ...questionKeys];
  const stepIndex = Math.max(0, stepOrder.indexOf(step));
  const activeQuestionKey = step === "stage" ? null : step;
  const selectedValue = activeQuestionKey ? draft[activeQuestionKey] : null;
  const insight = activeQuestionKey ? getAnswerContext(activeQuestionKey, selectedValue, draft) : null;
  const stageHero = getLifeStageHero(draft.stage, draft.imageVariant || "default");
  const boardTitle = activeQuestionKey ? insight?.title : stageHero.title;
  const boardSummary = compactBoardSummary(
    activeQuestionKey
      ? insight?.summary
      : stageHero.contextText || getLifeStageStageContext(draft.stage)
  );
  const activeQuestionIndex = activeQuestionKey
    ? Math.max(0, questionKeys.indexOf(activeQuestionKey))
    : -1;

  const returnToMe = () => {
    navigate("/dashboard", {
      replace: true,
      state: { dashboardPanel: "me", lifeStageSetupReturn: true },
    });
  };

  const goBack = () => {
    if (stepIndex <= 0) {
      returnToMe();
      return;
    }
    setStep(stepOrder[stepIndex - 1]);
  };

  const goNext = () => {
    if (stepIndex < stepOrder.length - 1) {
      setStep(stepOrder[stepIndex + 1]);
      return;
    }

    const questions = getLifeStageQuestions(draft.stage);
    const completedDraft = questions.completeDraft?.(draft) || draft;
    saveLifeStageProfile({
      ...completedDraft,
      stage: normalizeLifeStageKey(draft.stage),
      imageVariant: normalizeLifeStageImageVariant(
        draft.imageVariant || completedDraft.imageVariant || "default"
      ),
      lifeStageConfigured: true,
      lifeStageSetupCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    returnToMe();
  };

  return (
    <div
      data-clara-life-stage-setup-page="true"
      className="relative h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#020817] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_2%,rgba(45,212,191,.18),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(124,58,237,.28),transparent_34%),linear-gradient(180deg,rgba(7,18,38,.88),rgba(2,8,23,.98))]" />

      <div
        className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden px-4"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <header className="relative z-10 shrink-0 overflow-hidden rounded-[28px] border border-cyan-200/18 bg-[#071226]/72 p-4 shadow-[0_22px_70px_rgba(0,0,0,.34),0_0_44px_rgba(34,211,238,.10),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100/72">
                CLARA context board
              </p>
              <h1 className="mt-3 max-w-[310px] text-[clamp(22px,6.4vw,30px)] font-black leading-[1.04] tracking-[-0.04em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.35)]">
                {boardTitle}
              </h1>
              {boardSummary ? (
                <p className="mt-2 max-w-[330px] text-[12px] font-semibold leading-5 text-white/72">
                  {boardSummary}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={returnToMe}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.055] text-white/82 shadow-[0_10px_28px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl active:scale-95"
              aria-label="Close life stage setup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {activeQuestionKey ? (
            <div className="relative z-10 mt-3 flex items-center justify-center gap-2">
              {questionKeys.map((key, index) => (
                <div
                  key={key}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    index === activeQuestionIndex
                      ? "bg-cyan-200 shadow-[0_0_14px_rgba(125,211,252,.34)]"
                      : "bg-white/[0.10]"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </header>

        <main className="relative z-10 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          {step === "stage" ? (
            <div className="space-y-3 pb-3">
              {stageList.map((stage) => (
                <StageCard
                  key={stage.key}
                  stage={stage.key}
                  active={draft.stage === stage.key}
                  onClick={() => setDraft((current) => buildStageDraft(stage.key, current))}
                />
              ))}
            </div>
          ) : null}

          {activeQuestionKey ? (
            <div className="pb-3">
              <OptionGroup
                eyebrow={QUESTION_META[activeQuestionKey]?.eyebrow || "Choose one"}
                prompt={QUESTION_META[activeQuestionKey]?.prompt || "Choose the closest match."}
                value={draft[activeQuestionKey]}
                options={getLifeStageOptions(draft, activeQuestionKey) || []}
                displayValue={(option) => getStageDisplayLabel(draft.stage, option)}
                onSelect={(value) =>
                  setDraft((current) =>
                    buildStageDraft(current.stage, {
                      ...current,
                      [activeQuestionKey]: value,
                    })
                  )
                }
              />
            </div>
          ) : null}
        </main>

        <footer className="relative z-10 mt-3 flex shrink-0 gap-3 pb-3">
          <button
            type="button"
            onClick={goBack}
            className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-[20px] border border-cyan-200/20 bg-[#061327]/82 px-4 py-3 text-sm font-black text-white/86 shadow-[0_16px_38px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl active:scale-95"
          >
            {stepIndex <= 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" /> Back
              </>
            )}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-[20px] border border-white/20 bg-[linear-gradient(135deg,#67f8ff,#8bdcff_46%,#72a9ff)] px-4 py-3 text-sm font-black text-slate-950 shadow-[0_18px_42px_rgba(103,248,255,.24),0_0_34px_rgba(125,211,252,.22)] active:scale-95"
          >
            {stepIndex === stepOrder.length - 1 ? (
              <>
                <Check className="h-4 w-4" /> Apply stage
              </>
            ) : (
              "Continue"
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
