import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  Compass,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "../../context/AuthContext";
import {
  buildUniversalOnboardingContent,
  loadUniversalOnboardingContent,
} from "@/lib/universal-onboarding-content";
import { appendMemory, getMemories, setMemories } from "@/lib/ai/clara-memory";
import { saveAccessSnapshot } from "@/lib/offline-access-cache";
import {
  getLocalSetupProfile,
  saveLocalSetupProfile,
} from "@/lib/claraLocalProfile";

const SAVE_ERROR_MESSAGE = "We couldn’t save your setup yet. Please try again.";
const FREE_VERSION_ROUTE = "/dashboard";
const ACTIVE_MEMORY_USER_ID_KEY = "clara_active_memory_user_id";
const UNIVERSAL_ONBOARDING_DRAFT_KEY = "clara_universal_onboarding_answers_draft";
const MOBILE_QUERY = "(max-width: 640px)";

const QUESTION_SETS = [
  {
    id: "commitment_level",
    selectionMode: "single",
    eyebrow: "Commitment check",
    title: "How ready are you to work on your money right now?",
    description: "No pressure. CLARA only needs to understand your readiness level.",
    options: [
      {
        id: "just_exploring",
        label: "I’m just exploring",
        description: "I want to look around and understand what CLARA can do.",
      },
      {
        id: "build_better_habits",
        label: "I want to build better habits",
        description: "I want my money routine to feel more consistent.",
      },
      {
        id: "take_seriously",
        label: "I’m ready to take this seriously",
        description: "I want structure, clarity, and a stronger direction.",
      },
      {
        id: "need_structure_now",
        label: "I badly need structure right now",
        description: "My money life feels heavy, and I need help organizing it.",
      },
    ],
  },
  {
    id: "lifestyle_context",
    selectionMode: "multiple",
    eyebrow: "Lifestyle clarity",
    title: "What kind of life is your money supporting right now?",
    description: "This helps CLARA understand the responsibilities around your money.",
    options: [
      {
        id: "just_myself",
        label: "Just myself",
        description: "My money mostly supports my own needs.",
      },
      {
        id: "family_household",
        label: "My family or household",
        description: "My money helps support people or responsibilities at home.",
      },
      {
        id: "partner_shared_expenses",
        label: "A partner or shared expenses",
        description: "I manage money with someone else or share regular costs.",
      },
      {
        id: "school_personal_needs",
        label: "School and personal needs",
        description: "My money has to support studies and everyday life.",
      },
      {
        id: "freelance_irregular_income",
        label: "Freelance or irregular income",
        description: "My income changes and is not always predictable.",
      },
      {
        id: "business_side_hustle",
        label: "Business or side hustle",
        description: "My money also supports income-building activities.",
      },
      {
        id: "debt_bills_pressure",
        label: "Debt, bills, or pressure from others",
        description: "A lot of my money is already pulled by obligations.",
      },
    ],
  },
  {
    id: "money_pressure_point",
    selectionMode: "multiple",
    exclusiveOptionIds: ["not_sure_yet"],
    eyebrow: "Current pressure",
    title: "What feels heaviest in your money life right now?",
    description: "CLARA will use this as your first pressure point to watch.",
    options: [
      { id: "bills", label: "Bills", description: "Regular payments are taking a lot of space." },
      {
        id: "food_daily_needs",
        label: "Food and daily needs",
        description: "Everyday needs are the main pressure.",
      },
      {
        id: "family_responsibilities",
        label: "Family responsibilities",
        description: "Supporting others affects my money decisions.",
      },
      {
        id: "impulse_spending",
        label: "Impulse spending",
        description: "I sometimes spend before thinking it through.",
      },
      { id: "debt", label: "Debt", description: "Payments or balances feel hard to escape." },
      {
        id: "irregular_income",
        label: "Irregular income",
        description: "My money timing is inconsistent.",
      },
      {
        id: "saving_money",
        label: "Saving money",
        description: "It is hard to keep money aside.",
      },
      {
        id: "not_sure_yet",
        label: "I’m not sure yet",
        description: "I need CLARA to help me see the pattern first.",
      },
    ],
  },
  {
    id: "spending_trigger",
    selectionMode: "multiple",
    eyebrow: "Ask before you spend",
    title: "When do you usually need help before spending?",
    description: "This tells CLARA when to help you pause before a risky decision.",
    options: [
      {
        id: "sudden_purchase",
        label: "When I want to buy something suddenly",
        description: "The decision happens fast.",
      },
      {
        id: "friends_family_invite",
        label: "When friends or family invite me out",
        description: "Social pressure can affect my spending.",
      },
      {
        id: "stress_spending",
        label: "When I feel stressed",
        description: "Emotions can push me to spend.",
      },
      {
        id: "sale_promo",
        label: "When I see a sale or promo",
        description: "Discounts make the purchase feel urgent.",
      },
      {
        id: "payday_arrives",
        label: "When payday arrives",
        description: "Fresh income can disappear quickly.",
      },
      {
        id: "affordability_uncertain",
        label: "When I’m not sure if I can afford it",
        description: "I need a clear check before deciding.",
      },
    ],
  },
  {
    id: "spending_guidance_style",
    selectionMode: "multiple",
    eyebrow: "Spending check preference",
    title: "What kind of spending check would help you most?",
    description: "CLARA can be gentle, direct, or budget-based depending on what helps you act.",
    options: [
      {
        id: "simple_yes_no",
        label: "Simple yes or no guidance",
        description: "Just tell me if it looks okay or risky.",
      },
      {
        id: "short_explanation",
        label: "A short explanation",
        description: "Give me a quick reason behind the guidance.",
      },
      {
        id: "strict_warning",
        label: "A strict warning when risky",
        description: "Be firm when the decision can hurt my plan.",
      },
      {
        id: "softer_reminder",
        label: "A softer reminder",
        description: "Guide me without making it feel heavy.",
      },
      {
        id: "budget_based_check",
        label: "A budget-based check",
        description: "Compare the decision with my actual budget first.",
      },
    ],
  },
  {
    id: "guidance_intensity",
    selectionMode: "single",
    eyebrow: "Real guidance",
    title: "How do you want CLARA to guide you?",
    description: "This shapes how strong CLARA’s coaching voice should feel.",
    options: [
      {
        id: "keep_simple",
        label: "Keep it simple",
        description: "I want clean guidance without too much detail.",
      },
      {
        id: "clear_next_steps",
        label: "Give me clear next steps",
        description: "Show me what to do next.",
      },
      {
        id: "risk_warnings",
        label: "Warn me when I’m at risk",
        description: "Help me catch problems before they grow.",
      },
      {
        id: "understand_patterns",
        label: "Help me understand my patterns",
        description: "Show me the behavior behind my money.",
      },
      {
        id: "money_coach",
        label: "Guide me like a money coach",
        description: "Give me stronger guidance and practical direction.",
      },
    ],
  },
];

const ONBOARDING_MEMORY_MAPPINGS = {
  commitment_level: {
    category: "onboarding_commitment",
    content: {
      just_exploring: "User is exploring CLARA and may need gentle guidance.",
      build_better_habits: "User wants to build better money habits and consistency.",
      take_seriously: "User is ready to take money management seriously.",
      need_structure_now: "User needs structure urgently and may feel financially overwhelmed.",
    },
  },
  lifestyle_context: {
    category: "onboarding_lifestyle_clarity",
    content: {
      just_myself: "User’s money mostly supports personal needs.",
      family_household: "User’s money supports family or household responsibilities.",
      partner_shared_expenses: "User manages money with a partner or shared expenses.",
      school_personal_needs: "User’s money supports school and personal needs.",
      freelance_irregular_income: "User has freelance or irregular income patterns.",
      business_side_hustle: "User’s money also supports a business or side hustle.",
      debt_bills_pressure: "User’s money is pressured by debt, bills, or obligations to others.",
    },
  },
  money_pressure_point: {
    category: "onboarding_money_pressure",
    content: {
      bills: "Bills are the user’s heaviest current money pressure.",
      food_daily_needs: "Food and daily needs are the user’s main money pressure.",
      family_responsibilities: "Family responsibilities strongly affect the user’s money decisions.",
      impulse_spending: "Impulse spending is a major pressure point for the user.",
      debt: "Debt is a major financial pressure for the user.",
      irregular_income: "Irregular income makes the user’s money timing unstable.",
      saving_money: "Saving money is difficult for the user right now.",
      not_sure_yet: "User is not yet sure what their main money pressure is.",
    },
  },
  spending_trigger: {
    category: "onboarding_spending_trigger",
    content: {
      sudden_purchase: "Sudden purchases are a spending risk moment for the user.",
      friends_family_invite: "Social invitations can pressure the user to spend.",
      stress_spending: "Stress can trigger the user’s spending.",
      sale_promo: "Sales and promos can trigger the user’s spending.",
      payday_arrives: "Payday is a high-risk spending moment for the user.",
      affordability_uncertain: "User needs help when they are unsure if they can afford something.",
    },
  },
  spending_guidance_style: {
    category: "onboarding_guidance_style",
    content: {
      simple_yes_no: "User prefers simple yes-or-no spending guidance.",
      short_explanation: "User prefers short explanations behind CLARA’s guidance.",
      strict_warning: "User wants strict warnings when a decision is risky.",
      softer_reminder: "User prefers softer reminders instead of heavy warnings.",
      budget_based_check: "User prefers spending checks based on actual budget data.",
    },
  },
  guidance_intensity: {
    category: "onboarding_guidance_intensity",
    content: {
      keep_simple: "User wants simple and clean money guidance.",
      clear_next_steps: "User wants clear next steps.",
      risk_warnings: "User wants CLARA to warn them when they are at risk.",
      understand_patterns: "User wants CLARA to help them understand money patterns.",
      money_coach: "User wants practical money-coach style guidance.",
    },
  },
};

const SCREENS = [
  { id: "welcome", type: "welcome" },
  ...QUESTION_SETS.map((question, index) => ({
    id: `question-${question.id}`,
    type: "question",
    index,
  })),
  { id: "mission", type: "mission" },
];

function warnInDevelopment(...args) {
  if (import.meta.env?.DEV) console.warn(...args);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toAnswerArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  const singleValue = String(value || "").trim();
  return singleValue ? [singleValue] : [];
}

function hasAnswerValue(value) {
  return toAnswerArray(value).length > 0;
}

function getQuestionById(questionId) {
  return QUESTION_SETS.find((question) => question.id === questionId) || null;
}

function normalizeAnswerValue(question, value) {
  if (!question) return value;
  const validOptionIds = new Set(question.options.map((option) => option.id));
  const validValues = toAnswerArray(value).filter((item) => validOptionIds.has(item));
  return question.selectionMode === "multiple" ? validValues : validValues[0] || "";
}

function normalizeAnswers(rawAnswers) {
  if (!isPlainObject(rawAnswers)) return {};
  return QUESTION_SETS.reduce((normalized, question) => {
    const value = normalizeAnswerValue(question, rawAnswers[question.id]);
    if (hasAnswerValue(value)) normalized[question.id] = value;
    return normalized;
  }, {});
}

function toggleMultipleAnswer(question, currentValue, optionId) {
  const currentValues = toAnswerArray(currentValue);
  const exclusiveIds = new Set(question?.exclusiveOptionIds || []);

  if (exclusiveIds.has(optionId)) {
    return currentValues.includes(optionId) ? [] : [optionId];
  }

  const withoutExclusiveValues = currentValues.filter((item) => !exclusiveIds.has(item));
  return withoutExclusiveValues.includes(optionId)
    ? withoutExclusiveValues.filter((item) => item !== optionId)
    : [...withoutExclusiveValues, optionId];
}

function safelyParseOnboardingDraft() {
  if (typeof window === "undefined") return null;
  try {
    const rawDraft = window.sessionStorage?.getItem(UNIVERSAL_ONBOARDING_DRAFT_KEY);
    if (!rawDraft) return null;
    const parsedDraft = JSON.parse(rawDraft);
    return isPlainObject(parsedDraft) ? normalizeAnswers(parsedDraft) : null;
  } catch (error) {
    warnInDevelopment("CLARA onboarding draft parse failed:", error);
    return null;
  }
}

function persistOnboardingDraft(nextAnswers) {
  if (typeof window === "undefined" || !isPlainObject(nextAnswers)) return;
  try {
    window.sessionStorage?.setItem(
      UNIVERSAL_ONBOARDING_DRAFT_KEY,
      JSON.stringify(normalizeAnswers(nextAnswers))
    );
  } catch {
    // Session draft persistence is best effort only.
  }
}

function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.removeItem(UNIVERSAL_ONBOARDING_DRAFT_KEY);
  } catch {
    // Draft cleanup is best effort only.
  }
}

function getRecommendedAccessLevel(answers) {
  const committedSignals = new Set([
    "take_seriously",
    "need_structure_now",
    "strict_warning",
    "budget_based_check",
    "risk_warnings",
    "money_coach",
  ]);
  const relevantAnswers = [
    ...toAnswerArray(answers.commitment_level),
    ...toAnswerArray(answers.spending_guidance_style),
    ...toAnswerArray(answers.guidance_intensity),
  ];
  return relevantAnswers.some((value) => committedSignals.has(value)) ? "committed" : "free";
}

function getMissingRequiredAnswer(answers) {
  return QUESTION_SETS.find((question) => !hasAnswerValue(answers[question.id]));
}

function buildOnboardingMemoryEntries(answers) {
  return Object.entries(ONBOARDING_MEMORY_MAPPINGS).flatMap(([answerKey, mapping]) =>
    toAnswerArray(answers[answerKey])
      .map((answerValue) => {
        const content = mapping.content[answerValue];
        return content ? { category: mapping.category, content } : null;
      })
      .filter(Boolean)
  );
}

function saveOnboardingAnswersToLocalMemory(userId, answers) {
  if (!userId) return;

  try {
    const cleanedMemories = getMemories(userId).filter(
      (memory) => !String(memory?.category || "").startsWith("onboarding_")
    );
    const memoryEntries = buildOnboardingMemoryEntries(answers);

    setMemories(userId, cleanedMemories);
    memoryEntries.forEach((memory) => appendMemory(userId, memory));

    if (typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(ACTIVE_MEMORY_USER_ID_KEY, userId);
      } catch {
        // The memory review bridge can still scan local CLARA memory keys.
      }

      window.dispatchEvent(
        new CustomEvent("clara-onboarding-memory-updated", {
          detail: {
            userId,
            categories: [...new Set(memoryEntries.map((memory) => memory.category))],
          },
        })
      );
    }
  } catch (error) {
    warnInDevelopment("CLARA onboarding local memory save skipped:", error);
  }
}

function getIsPerformanceMode() {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("clara-performance-mode") ||
    document.documentElement.dataset.claraVisualMode === "performance"
  );
}

function useOnboardingMotionPreference() {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );
  const [isPerformanceMode, setIsPerformanceMode] = useState(getIsPerformanceMode);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => {
      setIsMobile(media.matches);
      setIsPerformanceMode(getIsPerformanceMode());
    };

    update();
    media.addEventListener?.("change", update);
    const observer =
      typeof MutationObserver !== "undefined" ? new MutationObserver(update) : null;
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-clara-visual-mode"],
    });

    return () => {
      media.removeEventListener?.("change", update);
      observer?.disconnect();
    };
  }, []);

  return {
    prefersReducedMotion: Boolean(prefersReducedMotion),
    useMinimalMotion: Boolean(prefersReducedMotion || isMobile || isPerformanceMode),
  };
}

function WelcomeStep({ content, onNext }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-8 sm:gap-10">
      <div className="max-w-xl space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f4cd71]/25 bg-[#f4cd71]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7d98e]">
          <Sparkles className="h-3.5 w-3.5" />
          {content.welcome.badge}
        </div>
        <div className="space-y-4">
          <h1 className="max-w-lg text-[2.15rem] font-semibold leading-tight text-white sm:text-5xl">
            {content.welcome.headline}
          </h1>
          <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            {content.welcome.subheadline}
          </p>
        </div>
        <div className="space-y-3 pt-1">
          <Button
            type="button"
            onClick={onNext}
            className="h-12 rounded-2xl bg-[#f4cd71] px-5 text-[#101010] hover:bg-[#f7d98e]"
          >
            {content.welcome.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-sm text-white/52">No judgment. Just clarity before guidance.</p>
        </div>
      </div>

      <div className="max-w-xl rounded-[26px] border border-white/10 bg-white/[0.035] p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4cd71]/75">
          Setup preview
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Commitment", "Lifestyle Clarity", "Ask Before You Spend"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/72"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionStep({ question, selectedAnswer, onSelect, onContinue, disabled }) {
  const isMultiple = question.selectionMode === "multiple";
  const selectedValues = toAnswerArray(selectedAnswer);
  const hasSelection = selectedValues.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4cd71]">
          {question.eyebrow}
        </p>
        <h2 className="mt-3 max-w-xl text-[1.75rem] font-semibold leading-tight text-white sm:text-4xl">
          {question.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-white/68">{question.description}</p>
        {isMultiple ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f4cd71]/72">
            Select all that apply
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {question.options.map((option) => {
          const isSelected = selectedValues.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(question.id, option.id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`clara-universal-onboarding-option w-full touch-manipulation rounded-[24px] border px-4 py-3.5 text-left transition-[border-color,background-color,color] duration-75 disabled:cursor-default sm:py-4 ${
                isSelected
                  ? "border-[#f4cd71]/60 bg-[#f4cd71]/12 shadow-[0_10px_30px_rgba(244,205,113,0.12)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-75 ${
                    isMultiple ? "rounded-md" : "rounded-full"
                  } ${
                    isSelected
                      ? "border-[#f4cd71] bg-[#f4cd71] text-[#111827]"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {isSelected ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                </div>
                <div>
                  <p className="text-base font-medium text-white">{option.label}</p>
                  <p className="mt-1 text-sm leading-5 text-white/58 sm:leading-6">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {isMultiple ? (
        <Button
          type="button"
          onClick={() => onContinue(question.id)}
          disabled={!hasSelection || disabled}
          className="h-12 w-full touch-manipulation rounded-2xl bg-[#f4cd71] text-[#101010] hover:bg-[#f7d98e] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function MissionStep({ saving, error, onFinish }) {
  return (
    <div className="flex min-h-full flex-col justify-center space-y-5">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#8ce6c0]/20 bg-[#8ce6c0]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a7efd0]">
        <Compass className="h-3.5 w-3.5" />
        CLARA advocacy
      </div>
      <div className="rounded-[28px] border border-[#34d399]/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.08),rgba(255,255,255,0.025))] p-5 sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34d399]/15 text-[#8ce6c0]">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
          CLARA was built for more than tracking money.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
          CLARA helps you build money clarity first. As it grows, the mission is to support
          students, families, and communities in need through the CLARA Charity Fund.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70">
            For your clarity
          </span>
          <span className="rounded-full border border-[#34d399]/15 bg-[#34d399]/[0.07] px-3 py-1.5 text-xs font-medium text-[#a7efd0]">
            For others later
          </span>
        </div>
      </div>
      <Button
        type="button"
        onClick={onFinish}
        disabled={saving}
        className="h-12 w-fit touch-manipulation rounded-2xl bg-[#34d399] px-5 text-[#092218] hover:bg-[#52e6a7] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {saving ? "Preparing CLARA..." : "Ready to Explore CLARA"}
        {!saving ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export default function UniversalOnboarding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { prefersReducedMotion, useMinimalMotion } = useOnboardingMotionPreference();
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(() => buildUniversalOnboardingContent());
  const [screenIndex, setScreenIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [nameError, setNameError] = useState("");
  const [advancingScreenId, setAdvancingScreenId] = useState(null);
  const answersRef = useRef({});
  const hasHydratedAnswersRef = useRef(false);
  const onboardingShellRef = useRef(null);
  const advancingScreenIdRef = useRef(null);
  const savingRef = useRef(false);
  const advanceScheduleRef = useRef({ firstFrame: null, secondFrame: null, timer: null });

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const currentAnswers = isPlainObject(answersRef.current) ? answersRef.current : {};
    const hasCurrentAnswers = Object.keys(currentAnswers).length > 0;
    if (hasHydratedAnswersRef.current && hasCurrentAnswers) return;

    const localSetupProfile = getLocalSetupProfile();
    const localAnswers =
      isPlainObject(localSetupProfile?.answers) &&
      Object.keys(localSetupProfile.answers).length > 0
        ? normalizeAnswers(localSetupProfile.answers)
        : null;
    const draftAnswers = localAnswers ? null : safelyParseOnboardingDraft();
    const nextAnswers = normalizeAnswers(localAnswers || draftAnswers || {});

    hasHydratedAnswersRef.current = true;
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  }, []);

  useEffect(() => {
    let active = true;
    loadUniversalOnboardingContent()
      .then((nextContent) => {
        if (active && nextContent) setContent(nextContent);
      })
      .catch((error) => {
        warnInDevelopment("CLARA onboarding content hydration skipped:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const clearAdvanceSchedule = useCallback(() => {
    const schedule = advanceScheduleRef.current;
    if (schedule.firstFrame !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(schedule.firstFrame);
    }
    if (schedule.secondFrame !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(schedule.secondFrame);
    }
    if (schedule.timer !== null) clearTimeout(schedule.timer);
    advanceScheduleRef.current = { firstFrame: null, secondFrame: null, timer: null };
  }, []);

  const clearScreenLock = useCallback(() => {
    advancingScreenIdRef.current = null;
    setAdvancingScreenId(null);
  }, []);

  useEffect(() => () => clearAdvanceSchedule(), [clearAdvanceSchedule]);

  useEffect(() => {
    clearScreenLock();
    const frame = requestAnimationFrame(() => {
      onboardingShellRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [clearScreenLock, screenIndex]);

  const screen = SCREENS[screenIndex];
  const currentQuestion =
    screen?.type === "question" ? QUESTION_SETS[screen.index] : null;
  const canGoBack = screenIndex > 0 && !saving;
  const isCurrentScreenAdvancing =
    Boolean(screen?.id) && advancingScreenId === screen.id;
  const isQuestionScreen = screen?.type === "question";
  const isFinalOnboardingScreen =
    screen?.type === "mission" && screenIndex === SCREENS.length - 1;
  const progressValue = SCREENS.length
    ? ((screenIndex + 1) / SCREENS.length) * 100
    : 0;
  const setupHelperText = isFinalOnboardingScreen
    ? "Setup complete"
    : `Guided setup ${screenIndex + 1} of ${SCREENS.length}`;

  const motionProps = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initial: false,
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      };
    }
    if (useMinimalMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.1, ease: "easeOut" },
      };
    }
    return {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: "easeOut" },
    };
  }, [prefersReducedMotion, useMinimalMotion]);

  function getStableAnswersSnapshot() {
    const currentAnswers = isPlainObject(answersRef.current)
      ? answersRef.current
      : answers;
    return normalizeAnswers(currentAnswers);
  }

  function lockCurrentScreen() {
    const currentScreenId = screen?.id || null;
    if (!currentScreenId) return false;
    advancingScreenIdRef.current = currentScreenId;
    setAdvancingScreenId(currentScreenId);
    return true;
  }

  function goNext() {
    setScreenIndex((current) => Math.min(current + 1, SCREENS.length - 1));
  }

  function goBack() {
    if (!canGoBack) return;
    clearAdvanceSchedule();
    clearScreenLock();
    setNameError("");
    setScreenIndex((current) => Math.max(current - 1, 0));
  }

  function scheduleQuestionAdvance() {
    const advance = () => {
      advanceScheduleRef.current = { firstFrame: null, secondFrame: null, timer: null };
      goNext();
    };

    if (typeof requestAnimationFrame !== "function") {
      const timer = setTimeout(advance, 0);
      advanceScheduleRef.current = { firstFrame: null, secondFrame: null, timer };
      return;
    }

    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(advance);
      advanceScheduleRef.current = { firstFrame: null, secondFrame, timer: null };
    });
    advanceScheduleRef.current = { firstFrame, secondFrame: null, timer: null };
  }

  function commitAnswers(nextAnswers) {
    const normalizedAnswers = normalizeAnswers(nextAnswers);
    answersRef.current = normalizedAnswers;
    setAnswers(normalizedAnswers);
    persistOnboardingDraft(normalizedAnswers);
    setNameError("");
    return normalizedAnswers;
  }

  function handleSelectAnswer(questionId, optionId) {
    const question = getQuestionById(questionId);
    if (!question) return;

    if (question.selectionMode === "multiple") {
      const currentAnswers = getStableAnswersSnapshot();
      const nextSelectedValues = toggleMultipleAnswer(
        question,
        currentAnswers[questionId],
        optionId
      );
      commitAnswers({ ...currentAnswers, [questionId]: nextSelectedValues });
      return;
    }

    if (advancingScreenIdRef.current === screen?.id) return;
    if (!lockCurrentScreen()) return;

    commitAnswers({
      ...getStableAnswersSnapshot(),
      [questionId]: optionId,
    });
    clearAdvanceSchedule();
    scheduleQuestionAdvance();
  }

  function handleContinueQuestion(questionId) {
    const question = getQuestionById(questionId);
    if (!question || question.selectionMode !== "multiple") return;
    if (!hasAnswerValue(getStableAnswersSnapshot()[questionId])) return;
    if (advancingScreenIdRef.current === screen?.id) return;
    if (!lockCurrentScreen()) return;

    clearAdvanceSchedule();
    goNext();
  }

  function saveCompletedOnboardingAccessSnapshot(recommendedAccessSnapshot) {
    if (!user?.id) return;

    try {
      const planKey = profile?.plan_key || profile?.plan || "free";
      const accessStatus = profile?.status || profile?.subscription_status || "free";
      const subscriptionStatus = profile?.subscription_status || accessStatus;
      const completedProfileSnapshot = {
        ...(profile || {}),
        id: user.id,
        email: user.email || profile?.email || null,
        role: profile?.role || "user",
        plan: planKey,
        plan_key: planKey,
        subscription_status: subscriptionStatus,
        status: accessStatus,
        onboarding_completed: true,
        has_completed_onboarding: true,
        has_completed_universal_onboarding: true,
        has_seen_universal_onboarding: true,
        recommended_access_level: recommendedAccessSnapshot,
      };

      saveAccessSnapshot({
        user,
        profile: completedProfileSnapshot,
        role: completedProfileSnapshot.role,
        plan: planKey,
        planLabel: profile?.subscription_label || "Free",
        subscriptionStatus,
        accessStatus,
        onboardingCompleted: true,
        lastResolvedAppFlow: "normal",
        lastValidRoute: FREE_VERSION_ROUTE,
      });
    } catch (error) {
      warnInDevelopment("CLARA onboarding completion access snapshot skipped:", error);
    }
  }

  async function completeOnboardingSetup() {
    clearAdvanceSchedule();
    clearScreenLock();

    const answerSnapshot = getStableAnswersSnapshot();
    const missingAnswer = getMissingRequiredAnswer(answerSnapshot);
    if (missingAnswer) {
      setNameError("Please complete your setup answers before continuing.");
      const missingScreenIndex = SCREENS.findIndex(
        (entry) => entry.id === `question-${missingAnswer.id}`
      );
      if (missingScreenIndex >= 0 && missingScreenIndex < screenIndex) {
        setScreenIndex(missingScreenIndex);
      }
      return false;
    }

    const recommendedAccessSnapshot = getRecommendedAccessLevel(answerSnapshot);
    saveLocalSetupProfile({
      answers: answerSnapshot,
      recommended_access_level: recommendedAccessSnapshot,
      completed: true,
      completed_at: new Date().toISOString(),
    });
    saveCompletedOnboardingAccessSnapshot(recommendedAccessSnapshot);
    clearOnboardingDraft();
    saveOnboardingAnswersToLocalMemory(user?.id, answerSnapshot);
    return true;
  }

  async function finishOnboarding(destination = FREE_VERSION_ROUTE) {
    if (savingRef.current || saving) return;
    savingRef.current = true;
    clearAdvanceSchedule();

    try {
      setSaving(true);
      setNameError("");
      const completed = await completeOnboardingSetup();
      if (!completed) return;
      const recommendedAccessSnapshot = getRecommendedAccessLevel(
        getStableAnswersSnapshot()
      );
      navigate(destination, {
        replace: true,
        state: {
          fromOnboarding: true,
          recommendedAccessLevel: recommendedAccessSnapshot,
        },
      });
    } catch (error) {
      console.error("Universal onboarding completion error:", error);
      setNameError(SAVE_ERROR_MESSAGE);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!screen) return null;

  const contentPanelClass = isQuestionScreen
    ? "mt-4 w-full flex-none rounded-[28px] border border-white/10 bg-[#0d1728]/82 p-4 sm:mt-6 sm:p-7"
    : "mt-4 flex min-h-0 flex-1 rounded-[28px] border border-white/10 bg-[#0d1728]/82 p-4 sm:mt-6 sm:p-7";
  const screenContentClass = isQuestionScreen
    ? "clara-universal-onboarding-screen flex w-full flex-col space-y-4 sm:space-y-6"
    : "clara-universal-onboarding-screen flex min-h-full w-full flex-col space-y-4 sm:space-y-6";

  return (
    <div className="clara-universal-onboarding relative h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#08111f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,205,113,0.16),_transparent_32%),radial-gradient(circle_at_82%_18%,_rgba(18,129,92,0.15),_transparent_26%),radial-gradient(circle_at_12%_82%,_rgba(84,61,31,0.22),_transparent_32%),linear-gradient(180deg,_#08111f_0%,_#0b1525_48%,_#08111f_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)] opacity-35" />
      <div className="relative mx-auto flex h-[100dvh] min-h-0 w-full max-w-3xl items-start justify-start px-3 py-3 sm:items-center sm:justify-center sm:px-6 sm:py-6">
        <div
          ref={onboardingShellRef}
          className="clara-universal-onboarding-shell flex h-[calc(100dvh-24px)] min-h-0 max-h-[calc(100dvh-24px)] w-full flex-col overflow-y-auto overscroll-y-contain rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-3 pb-4 pt-3 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-[calc(100dvh-48px)] sm:max-h-[calc(100dvh-48px)] sm:rounded-[32px] sm:px-6 sm:pb-6 sm:pt-6"
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f6cd71]">
                CLARA
              </p>
              <p className="mt-1 text-sm text-white/60 sm:mt-2">{setupHelperText}</p>
            </div>
            {canGoBack ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 text-white hover:bg-white/[0.08]"
                onClick={goBack}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div className="h-10 w-20" aria-hidden="true" />
            )}
          </div>

          <div className="mt-4 sm:mt-5">
            <Progress
              value={progressValue}
              className="h-2 rounded-full bg-white/10 [&>div]:bg-[linear-gradient(90deg,#f4cd71_0%,#34d399_100%)]"
            />
          </div>

          <div className={contentPanelClass}>
            <motion.div key={screen.id} {...motionProps} className={screenContentClass}>
              {screen.type === "welcome" ? (
                <WelcomeStep content={content} onNext={goNext} />
              ) : null}

              {screen.type === "question" && currentQuestion ? (
                <QuestionStep
                  question={currentQuestion}
                  selectedAnswer={answers[currentQuestion.id]}
                  onSelect={handleSelectAnswer}
                  onContinue={handleContinueQuestion}
                  disabled={isCurrentScreenAdvancing}
                />
              ) : null}

              {screen.type === "mission" ? (
                <MissionStep
                  saving={saving}
                  error={nameError}
                  onFinish={() => finishOnboarding(FREE_VERSION_ROUTE)}
                />
              ) : null}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
