import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  Compass,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { loadUniversalOnboardingContent } from "@/lib/universal-onboarding-content";

const INVALID_STORED_NAMES = ["Recovered User", "No name"];
const SAVE_ERROR_MESSAGE = "We couldn’t save your setup yet. Please try again.";
const COMMITTED_VERSION_ROUTE = "/enroll?plan=committed_249&view=detail";

const QUESTION_SETS = [
  {
    id: "commitment_level",
    eyebrow: "Commitment check",
    title: "How ready are you to work on your money right now?",
    description: "No pressure. CLARA only needs to understand your readiness level.",
    options: [
      { id: "just_exploring", label: "I’m just exploring", description: "I want to look around and understand what CLARA can do." },
      { id: "build_better_habits", label: "I want to build better habits", description: "I want my money routine to feel more consistent." },
      { id: "take_seriously", label: "I’m ready to take this seriously", description: "I want structure, clarity, and a stronger direction." },
      { id: "need_structure_now", label: "I badly need structure right now", description: "My money life feels heavy, and I need help organizing it." },
    ],
  },
  {
    id: "lifestyle_context",
    eyebrow: "Lifestyle clarity",
    title: "What kind of life is your money supporting right now?",
    description: "This helps CLARA understand the responsibilities around your money.",
    options: [
      { id: "just_myself", label: "Just myself", description: "My money mostly supports my own needs." },
      { id: "family_household", label: "My family or household", description: "My money helps support people or responsibilities at home." },
      { id: "partner_shared_expenses", label: "A partner or shared expenses", description: "I manage money with someone else or share regular costs." },
      { id: "school_personal_needs", label: "School and personal needs", description: "My money has to support studies and everyday life." },
      { id: "freelance_irregular_income", label: "Freelance or irregular income", description: "My income changes and is not always predictable." },
      { id: "business_side_hustle", label: "Business or side hustle", description: "My money also supports income-building activities." },
      { id: "debt_bills_pressure", label: "Debt, bills, or pressure from others", description: "A lot of my money is already pulled by obligations." },
    ],
  },
  {
    id: "money_pressure_point",
    eyebrow: "Current pressure",
    title: "What feels heaviest in your money life right now?",
    description: "CLARA will use this as your first pressure point to watch.",
    options: [
      { id: "bills", label: "Bills", description: "Regular payments are taking a lot of space." },
      { id: "food_daily_needs", label: "Food and daily needs", description: "Everyday needs are the main pressure." },
      { id: "family_responsibilities", label: "Family responsibilities", description: "Supporting others affects my money decisions." },
      { id: "impulse_spending", label: "Impulse spending", description: "I sometimes spend before thinking it through." },
      { id: "debt", label: "Debt", description: "Payments or balances feel hard to escape." },
      { id: "irregular_income", label: "Irregular income", description: "My money timing is inconsistent." },
      { id: "saving_money", label: "Saving money", description: "It is hard to keep money aside." },
      { id: "not_sure_yet", label: "I’m not sure yet", description: "I need CLARA to help me see the pattern first." },
    ],
  },
  {
    id: "spending_trigger",
    eyebrow: "Ask before you spend",
    title: "When do you usually need help before spending?",
    description: "This tells CLARA when to help you pause before a risky decision.",
    options: [
      { id: "sudden_purchase", label: "When I want to buy something suddenly", description: "The decision happens fast." },
      { id: "friends_family_invite", label: "When friends or family invite me out", description: "Social pressure can affect my spending." },
      { id: "stress_spending", label: "When I feel stressed", description: "Emotions can push me to spend." },
      { id: "sale_promo", label: "When I see a sale or promo", description: "Discounts make the purchase feel urgent." },
      { id: "payday_arrives", label: "When payday arrives", description: "Fresh income can disappear quickly." },
      { id: "affordability_uncertain", label: "When I’m not sure if I can afford it", description: "I need a clear check before deciding." },
    ],
  },
  {
    id: "spending_guidance_style",
    eyebrow: "Spending check preference",
    title: "What kind of spending check would help you most?",
    description: "CLARA can be gentle, direct, or budget-based depending on what helps you act.",
    options: [
      { id: "simple_yes_no", label: "Simple yes or no guidance", description: "Just tell me if it looks okay or risky." },
      { id: "short_explanation", label: "A short explanation", description: "Give me a quick reason behind the guidance." },
      { id: "strict_warning", label: "A strict warning when risky", description: "Be firm when the decision can hurt my plan." },
      { id: "softer_reminder", label: "A softer reminder", description: "Guide me without making it feel heavy." },
      { id: "budget_based_check", label: "A budget-based check", description: "Compare the decision with my actual budget first." },
    ],
  },
  {
    id: "guidance_intensity",
    eyebrow: "Real guidance",
    title: "How do you want CLARA to guide you?",
    description: "This shapes how strong CLARA’s coaching voice should feel.",
    options: [
      { id: "keep_simple", label: "Keep it simple", description: "I want clean guidance without too much detail." },
      { id: "clear_next_steps", label: "Give me clear next steps", description: "Show me what to do next." },
      { id: "risk_warnings", label: "Warn me when I’m at risk", description: "Help me catch problems before they grow." },
      { id: "understand_patterns", label: "Help me understand my patterns", description: "Show me the behavior behind my money." },
      { id: "money_coach", label: "Guide me like a money coach", description: "Give me stronger guidance and practical direction." },
    ],
  },
];

const SUMMARY_ITEMS = [
  { id: "commitment_level", label: "Commitment level" },
  { id: "lifestyle_context", label: "Lifestyle context" },
  { id: "money_pressure_point", label: "Main money pressure point" },
  { id: "spending_trigger", label: "Spending trigger" },
  { id: "spending_guidance_style", label: "Spending check" },
  { id: "guidance_intensity", label: "Guidance style" },
];

const withTimeout = (promise, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms)),
  ]);

function getAnswerLabel(questionId, optionId) {
  const question = QUESTION_SETS.find((entry) => entry.id === questionId);
  return question?.options.find((option) => option.id === optionId)?.label || "";
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

  const hasCommittedSignal = [
    answers.commitment_level,
    answers.spending_guidance_style,
    answers.guidance_intensity,
  ].some((value) => committedSignals.has(value));

  return hasCommittedSignal ? "committed" : "free";
}

function getMissingRequiredAnswer(answers) {
  return QUESTION_SETS.find((question) => !answers[question.id]);
}

export default function UniversalOnboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [saving, setSaving] = useState(false);
  const [loadingContent, setLoadingContent] = useState(true);
  const [content, setContent] = useState(null);
  const [screenIndex, setScreenIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState("");
  const advanceTimerRef = useRef(null);
  const onboardingShellRef = useRef(null);

  const needsNameFix = useMemo(() => {
    const storedName = profile?.full_name?.trim();
    return !storedName || INVALID_STORED_NAMES.includes(storedName);
  }, [profile]);

  useEffect(() => {
    setFullName(
      profile?.full_name && !INVALID_STORED_NAMES.includes(profile.full_name.trim())
        ? profile.full_name
        : ""
    );
  }, [profile?.full_name]);

  useEffect(() => {
    let active = true;
    async function loadContent() {
      setLoadingContent(true);
      const nextContent = await loadUniversalOnboardingContent();
      if (!active) return;
      setContent(nextContent);
      setLoadingContent(false);
    }
    loadContent();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      onboardingShellRef.current?.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [screenIndex]);

  const screens = useMemo(
    () => [
      { id: "welcome", type: "welcome" },
      ...QUESTION_SETS.map((question, index) => ({ id: `question-${question.id}`, type: "question", index })),
      { id: "mission", type: "mission" },
      { id: "result", type: "result" },
    ],
    []
  );
  const screen = screens[screenIndex];
  const currentQuestion = screen?.type === "question" ? QUESTION_SETS[screen.index] : null;
  const recommendedAccessLevel = useMemo(() => getRecommendedAccessLevel(answers), [answers]);
  const canGoBack = screenIndex > 0 && !saving;
  const progressValue = screens.length ? ((screenIndex + 1) / screens.length) * 100 : 0;

  const summary = useMemo(
    () =>
      SUMMARY_ITEMS.map((item) => ({
        ...item,
        value: getAnswerLabel(item.id, answers[item.id]) || "Not answered yet",
      })),
    [answers]
  );

  function goNext() {
    setScreenIndex((current) => Math.min(current + 1, screens.length - 1));
  }

  function goBack() {
    if (!canGoBack) return;
    setNameError("");
    setScreenIndex((current) => Math.max(current - 1, 0));
  }

  function handleSelectAnswer(questionId, optionId) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setNameError("");
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => goNext(), prefersReducedMotion ? 0 : 180);
  }

  async function updateProfile(updates) {
    if (!user?.id) throw new Error("No logged-in user found.");
    const payload = { id: user.id, email: user.email || profile?.email || null, ...updates };
    const { error } = await withTimeout(supabase.from("profiles").upsert(payload, { onConflict: "id" }), 8000);
    if (error) {
      console.error("Profile upsert error:", error);
      throw new Error(SAVE_ERROR_MESSAGE);
    }
  }

  async function saveNameIfNeeded() {
    const cleanedName = fullName.trim();
    if (!needsNameFix) return;
    if (!cleanedName) throw new Error("Please enter your real name.");
    await updateProfile({ full_name: cleanedName });
    const { error: authUpdateError } = await withTimeout(
      supabase.auth.updateUser({ data: { full_name: cleanedName } }),
      8000
    );
    if (authUpdateError) console.error("Auth metadata update error:", authUpdateError);
  }

  async function finishOnboarding(destination = "/dashboard") {
    if (saving) return;

    const missingAnswer = getMissingRequiredAnswer(answers);
    if (missingAnswer) {
      setNameError("Please complete your setup answers before continuing.");
      setScreenIndex(screens.findIndex((entry) => entry.id === `question-${missingAnswer.id}`));
      return;
    }

    try {
      setSaving(true);
      setNameError("");
      await saveNameIfNeeded();
      await updateProfile({
        onboarding_completed: true,
        has_completed_onboarding: true,
        onboarding_step: screens.length,
        onboarding_answers: answers,
        commitment_level: answers.commitment_level,
        lifestyle_context: answers.lifestyle_context,
        money_pressure_point: answers.money_pressure_point,
        spending_trigger: answers.spending_trigger,
        spending_guidance_style: answers.spending_guidance_style,
        guidance_intensity: answers.guidance_intensity,
        recommended_access_level: recommendedAccessLevel,
        onboarding_completed_at: new Date().toISOString(),
      });
      await refreshProfile?.();
      navigate(destination, {
        replace: true,
        state: { fromOnboarding: true, recommendedAccessLevel },
      });
    } catch (error) {
      console.error("Universal onboarding completion error:", error);
      setNameError(error?.message === "Please enter your real name." ? error.message : SAVE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  if (loadingContent || !content || !screen) {
    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#08111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,207,108,0.18),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(17,120,80,0.18),_transparent_30%)]" />
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl items-start justify-start px-3 py-3 sm:items-center sm:justify-center sm:px-6 sm:py-6">
          <div className="max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-white/[0.04] px-3 pb-4 pt-3 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100dvh-48px)] sm:rounded-[32px] sm:px-6 sm:pb-6 sm:pt-6">
            <div className="h-2 w-32 rounded-full bg-white/10" />
            <div className="mt-6 h-10 w-3/4 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-full rounded-full bg-white/[0.06]" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-white/[0.06]" />
            <div className="mt-8 h-48 rounded-[28px] bg-white/[0.05]" />
            <div className="mt-8 h-12 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.24, ease: "easeOut" } };

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#08111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,205,113,0.16),_transparent_32%),radial-gradient(circle_at_82%_18%,_rgba(18,129,92,0.15),_transparent_26%),radial-gradient(circle_at_12%_82%,_rgba(84,61,31,0.22),_transparent_32%),linear-gradient(180deg,_#08111f_0%,_#0b1525_48%,_#08111f_100%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)] opacity-35" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl items-start justify-start px-3 py-3 sm:items-center sm:justify-center sm:px-6 sm:py-6">
        <div
          ref={onboardingShellRef}
          className="max-h-[calc(100dvh-24px)] w-full flex flex-col overflow-y-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-3 pb-4 pt-3 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100dvh-48px)] sm:rounded-[32px] sm:px-6 sm:pb-6 sm:pt-6"
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f6cd71]">CLARA</p>
              <p className="mt-1 text-sm text-white/60 sm:mt-2">Guided setup {screenIndex + 1} of {screens.length}</p>
            </div>
            {canGoBack ? (
              <Button type="button" variant="ghost" className="rounded-full border border-white/10 bg-white/[0.03] px-3 text-white hover:bg-white/[0.08]" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div className="h-10 w-20" aria-hidden="true" />
            )}
          </div>

          <div className="mt-4 sm:mt-5">
            <Progress value={progressValue} className="h-2 rounded-full bg-white/10 [&>div]:bg-[linear-gradient(90deg,#f4cd71_0%,#34d399_100%)]" />
          </div>

          <div className="mt-4 flex flex-1 rounded-[28px] border border-white/10 bg-[#0d1728]/82 p-4 sm:mt-6 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div key={screen.id} {...motionProps} className="flex min-h-full w-full flex-col space-y-4 sm:space-y-6">
                {screen.type === "welcome" ? (
                  <div className="flex min-h-full flex-col justify-between gap-5 sm:gap-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#f4cd71]/30 bg-[#f4cd71]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7d98e]">
                      <Sparkles className="h-3.5 w-3.5" />
                      {content.welcome.badge}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-6">
                      <div className="space-y-4">
                        <h1 className="max-w-lg text-[2rem] font-semibold leading-tight text-white sm:text-5xl">{content.welcome.headline}</h1>
                        <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">{content.welcome.subheadline}</p>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <Button type="button" onClick={goNext} className="h-12 rounded-2xl bg-[#f4cd71] px-5 text-[#101010] hover:bg-[#f7d98e]">
                            {content.welcome.cta}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <p className="text-sm text-white/52">A calm first coaching session, not a sales page.</p>
                        </div>
                      </div>
                      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-3 sm:p-5">
                        {content.welcome.mediaUrl ? (
                          <img src={content.welcome.mediaUrl} alt="CLARA welcome" className="h-[240px] w-full rounded-[22px] object-cover sm:h-[260px]" />
                        ) : (
                          <div className="flex min-h-[240px] flex-col justify-between rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(244,205,113,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-3 sm:min-h-[260px] sm:p-5">
                            <div className="flex items-center gap-2 text-xs text-white/60 sm:text-sm">
                              <BadgeCheck className="h-4 w-4 text-[#f4cd71]" />
                              Diagnosis before direction
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">Lifestyle</p>
                                <p className="mt-1.5 text-xs leading-5 text-white/78 sm:mt-2 sm:text-sm sm:leading-6">CLARA learns what your money is supporting.</p>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">Spending pause</p>
                                <p className="mt-1.5 text-xs leading-5 text-white/78 sm:mt-2 sm:text-sm sm:leading-6">CLARA learns when you need help before spending.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {screen.type === "question" && currentQuestion ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4cd71]">{currentQuestion.eyebrow}</p>
                      <h2 className="mt-3 max-w-xl text-[1.75rem] font-semibold leading-tight text-white sm:text-4xl">{currentQuestion.title}</h2>
                      <p className="mt-3 text-base leading-7 text-white/68">{currentQuestion.description}</p>
                    </div>
                    <div className="grid gap-3">
                      {currentQuestion.options.map((option) => {
                        const isSelected = answers[currentQuestion.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectAnswer(currentQuestion.id, option.id)}
                            className={`w-full rounded-[24px] border px-4 py-3.5 text-left transition-all sm:py-4 ${isSelected ? "border-[#f4cd71]/60 bg-[#f4cd71]/12 shadow-[0_10px_30px_rgba(244,205,113,0.12)]" : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"}`}
                            aria-pressed={isSelected}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#f4cd71] bg-[#f4cd71] text-[#111827]" : "border-white/20 bg-transparent"}`}>
                                {isSelected ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                              </div>
                              <div>
                                <p className="text-base font-medium text-white">{option.label}</p>
                                <p className="mt-1 text-sm leading-5 text-white/58 sm:leading-6">{option.description}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {screen.type === "mission" ? (
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-4">
                      <div className="flex h-[250px] flex-col justify-between rounded-[22px] bg-[radial-gradient(circle_at_top_left,_rgba(82,230,167,0.16),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#8ce6c0]">
                          <HeartHandshake className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Advocacy</p>
                          <p className="text-sm leading-6 text-white/72">A softer mission note before CLARA prepares your starting path.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#8ce6c0]/20 bg-[#8ce6c0]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a7efd0]">
                        <Compass className="h-3.5 w-3.5" />
                        CLARA mission
                      </div>
                      <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{content.mission.title}</h2>
                      <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">{content.mission.body}</p>
                      <Button type="button" onClick={goNext} className="h-12 rounded-2xl bg-[#34d399] px-5 text-[#092218] hover:bg-[#52e6a7]">
                        {content.mission.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {screen.type === "result" ? (
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#f4cd71]/25 bg-[#f4cd71]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7d98e]">
                      CLARA starting path
                    </div>
                    <div className="grid gap-4">
                      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-4 sm:p-6">
                        <h2 className="max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">{content.result.title}</h2>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">{content.result.body}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {summary.map((item) => (
                          <div key={item.id} className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42">{item.label}</p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-white/82">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-[28px] border border-[#34d399]/18 bg-[#34d399]/[0.06] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ceccb]">Access note</p>
                        <h3 className="mt-3 text-xl font-semibold text-white">You can start with the Free Version.</h3>
                        <p className="mt-2 text-sm leading-6 text-white/68">
                          The Committed Version remains available when you want the deeper explanation and commitment flow.
                        </p>
                      </div>
                      {needsNameFix ? (
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                          <p className="text-sm font-semibold text-white">One last detail before you continue</p>
                          <p className="mt-2 text-sm leading-6 text-white/60">What name should CLARA use in your profile and future guidance?</p>
                          <Input
                            type="text"
                            value={fullName}
                            placeholder="Enter your real name"
                            onChange={(event) => {
                              setFullName(event.target.value);
                              if (nameError) setNameError("");
                            }}
                            className="mt-4 h-12 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
                          />
                        </div>
                      ) : null}
                    </div>
                    {nameError ? <p className="text-sm text-red-300">{nameError}</p> : null}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button type="button" onClick={() => finishOnboarding("/dashboard")} disabled={saving} className="h-12 flex-1 rounded-2xl bg-[#f4cd71] text-[#111827] hover:bg-[#f7d98e]">
                        {saving ? "Saving..." : content.result.primaryCta}
                        {!saving ? <ArrowRight className="h-4 w-4" /> : null}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => finishOnboarding(COMMITTED_VERSION_ROUTE)} disabled={saving} className="h-12 flex-1 rounded-2xl border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08]">
                        {content.result.secondaryCta}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
