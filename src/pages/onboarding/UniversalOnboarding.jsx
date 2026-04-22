import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  Compass,
  HeartHandshake,
  Layers3,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  ENROLLMENT_APPROVED_STATUSES,
  ENROLLMENT_PENDING_STATUSES,
  hasAnyPaidSignal,
  normalizeAccessValue,
} from "@/lib/access-control";
import { loadUniversalOnboardingContent } from "@/lib/universal-onboarding-content";

const INVALID_STORED_NAMES = ["Recovered User", "No name"];

const QUESTION_SETS = [
  {
    id: "reason",
    eyebrow: "A few quick questions",
    title: "What brought you to CLARA today?",
    description: "Choose the answer that feels closest right now.",
    options: [
      { id: "track_money", label: "I want to track my money better", description: "I need a clearer view of what is happening." },
      { id: "discipline", label: "I want more discipline", description: "I want more structure and consistency." },
      { id: "stuck", label: "I feel financially stuck", description: "I need help getting momentum again." },
      { id: "deeper_guidance", label: "I want deeper guidance", description: "I want something more hands-on and intentional." },
    ],
  },
  {
    id: "challenge",
    eyebrow: "Current friction",
    title: "What feels hardest right now?",
    description: "This helps CLARA point you in the right direction.",
    options: [
      { id: "overspending", label: "Overspending", description: "My money disappears faster than I want." },
      { id: "consistency", label: "Lack of consistency", description: "I start strong, then lose rhythm." },
      { id: "saving", label: "Saving money", description: "I want to hold onto more of what I earn." },
      { id: "stress", label: "Stress about money", description: "Money feels heavy and mentally noisy." },
      { id: "not_sure", label: "I'm not sure yet", description: "I know something needs to change, but I need clarity." },
    ],
  },
  {
    id: "experience",
    eyebrow: "How CLARA should feel",
    title: "What kind of experience do you want right now?",
    description: "You can always explore more later.",
    options: [
      { id: "tools", label: "Just tools for now", description: "Keep it simple and practical." },
      { id: "system", label: "A step-by-step system", description: "Give me structure and a guided path." },
      { id: "guidance", label: "Personal guidance", description: "I want stronger support and accountability." },
    ],
  },
  {
    id: "readiness",
    eyebrow: "Starting point",
    title: "How ready are you to start?",
    description: "This helps CLARA shape the handoff after setup.",
    options: [
      { id: "exploring", label: "Just exploring", description: "I want to look around before committing deeply." },
      { id: "habits", label: "Ready to build habits", description: "I want consistent structure and momentum." },
      { id: "commit", label: "Ready to commit seriously", description: "I want a more intentional path right away." },
    ],
  },
];

const SLIDE_ICONS = [Layers3, Compass, HeartHandshake, Lock];

const withTimeout = (promise, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms)),
  ]);

function getRecommendation(answers) {
  const scores = { tools: 0, system: 0, guidance: 0 };

  if (answers.reason === "track_money") scores.tools += 2;
  if (answers.reason === "discipline") scores.system += 2;
  if (answers.reason === "stuck") {
    scores.system += 1;
    scores.guidance += 1;
  }
  if (answers.reason === "deeper_guidance") scores.guidance += 2;

  if (answers.challenge === "overspending") {
    scores.tools += 1;
    scores.system += 1;
  }
  if (answers.challenge === "consistency") scores.system += 2;
  if (answers.challenge === "saving") {
    scores.tools += 1;
    scores.system += 1;
  }
  if (answers.challenge === "stress") scores.guidance += 2;
  if (answers.challenge === "not_sure") scores.tools += 1;

  if (answers.experience === "tools") scores.tools += 3;
  if (answers.experience === "system") scores.system += 3;
  if (answers.experience === "guidance") scores.guidance += 3;

  if (answers.readiness === "exploring") scores.tools += 2;
  if (answers.readiness === "habits") scores.system += 2;
  if (answers.readiness === "commit") {
    scores.system += 1;
    scores.guidance += 2;
  }

  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ordered[0][1] === ordered[1][1]) {
    if (answers.experience === "guidance") return "guidance";
    if (answers.experience === "system") return "system";
  }
  return ordered[0][0];
}

function getAnswerLabel(questionId, optionId) {
  const question = QUESTION_SETS.find((entry) => entry.id === questionId);
  return question?.options.find((option) => option.id === optionId)?.label || "";
}

function getCompletionDestination(profile, recommendation) {
  const enrollmentStatus = normalizeAccessValue(profile?.enrollment_status || profile?.status);
  const isPaid = hasAnyPaidSignal(profile);
  if (ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus)) return "/pending";
  if (ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus) || isPaid) return "/program-onboarding";
  const planByRecommendation = {
    tools: "pro_99",
    system: "core_599",
    guidance: "coaching_1299",
  };
  return `/enroll?plan=${planByRecommendation[recommendation] || "pro_99"}&view=detail`;
}

function getRecommendedAccessLevel(recommendation) {
  if (recommendation === "guidance") return "life_os";
  if (recommendation === "system") return "core";
  return "pro";
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

  const slides = content?.slides || [];
  const screens = useMemo(
    () => [
      { id: "welcome", type: "welcome" },
      ...slides.map((_, index) => ({ id: `slide-${index}`, type: "slide", index })),
      { id: "founder", type: "founder" },
      ...QUESTION_SETS.map((question, index) => ({ id: `question-${question.id}`, type: "question", index })),
      { id: "result", type: "result" },
    ],
    [slides]
  );
  const screen = screens[screenIndex];
  const recommendation = useMemo(() => getRecommendation(answers), [answers]);
  const resultContent = content?.results?.[recommendation] || {
    title: "",
    body: "",
    primaryCta: "",
    secondaryCta: "",
  };
  const reflectionText = useMemo(() => {
    const reason = getAnswerLabel("reason", answers.reason);
    const challenge = getAnswerLabel("challenge", answers.challenge);
    if (!reason || !challenge) {
      return "CLARA is setting up a starting point that feels clear, supportive, and realistic.";
    }
    return `You came here because ${reason.toLowerCase()}, and right now ${challenge.toLowerCase()} feels most important to address.`;
  }, [answers.challenge, answers.reason]);
  const readinessText = useMemo(() => {
    const readiness = getAnswerLabel("readiness", answers.readiness);
    const experience = getAnswerLabel("experience", answers.experience);
    if (!readiness || !experience) {
      return "This next step is designed to feel intentional, not overwhelming.";
    }
    return `Based on your answers, the best next move is an experience that feels ${experience.toLowerCase()} while matching the fact that you are ${readiness.toLowerCase()}.`;
  }, [answers.experience, answers.readiness]);
  const canGoBack = screenIndex > 0 && !saving;
  const progressValue = screens.length ? ((screenIndex + 1) / screens.length) * 100 : 0;

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
      throw new Error(error.message || "Failed to save profile.");
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

  async function finishOnboarding(destination) {
    if (saving) return;
    try {
      setSaving(true);
      setNameError("");
      await saveNameIfNeeded();
      await updateProfile({
        onboarding_completed: true,
        onboarding_step: 4,
        has_completed_onboarding: true,
        onboarding_answers: answers,
        recommended_access_level: getRecommendedAccessLevel(recommendation),
      });
      await refreshProfile?.();
      navigate(destination, {
        replace: true,
        state: { fromOnboarding: true, onboardingRecommendation: recommendation },
      });
    } catch (error) {
      console.error("Universal onboarding completion error:", error);
      setNameError(error?.message || "Failed to continue.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingContent || !content || !screen) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#08111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,207,108,0.18),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(17,120,80,0.18),_transparent_30%)]" />
        <div className="relative flex min-h-screen items-center justify-center px-5 py-8">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
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

  const currentQuestion = screen.type === "question" ? QUESTION_SETS[screen.index] : null;
  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.24, ease: "easeOut" } };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,205,113,0.18),_transparent_33%),radial-gradient(circle_at_80%_20%,_rgba(18,129,92,0.16),_transparent_25%),linear-gradient(180deg,_#08111f_0%,_#0b1525_44%,_#08111f_100%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)] opacity-40" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-6 sm:px-6">
        <div className="w-full rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f6cd71]">CLARA</p>
              <p className="mt-2 text-sm text-white/60">Guided setup {screenIndex + 1} of {screens.length}</p>
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

          <div className="mt-5">
            <Progress value={progressValue} className="h-2 rounded-full bg-white/10 [&>div]:bg-[linear-gradient(90deg,#f4cd71_0%,#34d399_100%)]" />
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1728]/80 p-5 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div key={screen.id} {...motionProps} className="space-y-6">
                {screen.type === "welcome" ? (
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#f4cd71]/30 bg-[#f4cd71]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7d98e]">
                      <Sparkles className="h-3.5 w-3.5" />
                      {content.welcome.badge}
                    </div>
                    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                      <div className="space-y-4">
                        <h1 className="max-w-lg text-4xl font-semibold leading-tight text-white sm:text-5xl">{content.welcome.headline}</h1>
                        <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">{content.welcome.subheadline}</p>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <Button type="button" onClick={goNext} className="h-12 rounded-2xl bg-[#f4cd71] px-5 text-[#101010] hover:bg-[#f7d98e]">
                            {content.welcome.cta}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <p className="text-sm text-white/52">A short setup designed to make your start feel clear.</p>
                        </div>
                      </div>
                      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4">
                        {content.welcome.mediaUrl ? (
                          <img src={content.welcome.mediaUrl} alt="CLARA welcome" className="h-[260px] w-full rounded-[22px] object-cover" />
                        ) : (
                          <div className="flex h-[260px] flex-col justify-between rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(244,205,113,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <BadgeCheck className="h-4 w-4 text-[#f4cd71]" />
                              Intentional by design
                            </div>
                            <div className="space-y-3">
                              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Clarity</p>
                                <p className="mt-2 text-sm text-white/78">Understand the habits behind your money.</p>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Structure</p>
                                <p className="mt-2 text-sm text-white/78">Move through a path that feels ordered, not noisy.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {screen.type === "slide" ? (
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                      What is CLARA?
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4cd71]/12 text-[#f4cd71]">
                        {(() => {
                          const Icon = SLIDE_ICONS[screen.index] || Sparkles;
                          return <Icon className="h-6 w-6" />;
                        })()}
                      </div>
                      <h2 className="mt-6 max-w-lg text-3xl font-semibold leading-tight text-white sm:text-4xl">{slides[screen.index]?.title}</h2>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">{slides[screen.index]?.description}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white/45">Slide {screen.index + 1} of {slides.length}</p>
                      <Button type="button" onClick={goNext} className="h-12 rounded-2xl bg-white text-[#111827] hover:bg-white/90">
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {screen.type === "founder" ? (
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-4">
                      {content.founder.mediaUrl ? (
                        <img src={content.founder.mediaUrl} alt="About the creator" className="h-[250px] w-full rounded-[22px] object-cover" />
                      ) : (
                        <div className="flex h-[250px] flex-col justify-between rounded-[22px] bg-[radial-gradient(circle_at_top_left,_rgba(82,230,167,0.16),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#8ce6c0]">
                            <HeartHandshake className="h-6 w-6" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.22em] text-white/45">Human, not generic</p>
                            <p className="text-sm leading-6 text-white/72">CLARA is built to feel guided, clear, and grounded in real behavior.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#8ce6c0]/20 bg-[#8ce6c0]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a7efd0]">
                        {content.founder.badge}
                      </div>
                      <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{content.founder.headline}</h2>
                      <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">{content.founder.body}</p>
                      <Button type="button" onClick={goNext} className="h-12 rounded-2xl bg-[#34d399] px-5 text-[#092218] hover:bg-[#52e6a7]">
                        Continue setup
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {screen.type === "question" && currentQuestion ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4cd71]">{currentQuestion.eyebrow}</p>
                      <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">{currentQuestion.title}</h2>
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
                            className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${isSelected ? "border-[#f4cd71]/60 bg-[#f4cd71]/12 shadow-[0_10px_30px_rgba(244,205,113,0.12)]" : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"}`}
                            aria-pressed={isSelected}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#f4cd71] bg-[#f4cd71] text-[#111827]" : "border-white/20 bg-transparent"}`}>
                                {isSelected ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                              </div>
                              <div>
                                <p className="text-base font-medium text-white">{option.label}</p>
                                <p className="mt-1 text-sm leading-6 text-white/58">{option.description}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {screen.type === "result" ? (
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#f4cd71]/25 bg-[#f4cd71]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7d98e]">
                      Your starting direction
                    </div>
                    <div className="grid gap-4">
                      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-6">
                        <p className="text-sm font-medium leading-7 text-white/70">{reflectionText}</p>
                        <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">{resultContent.title}</h2>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">{resultContent.body}</p>
                        <p className="mt-3 text-sm leading-6 text-white/58">{readinessText}</p>
                      </div>
                      <div className="rounded-[28px] border border-[#34d399]/18 bg-[#34d399]/[0.06] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ceccb]">{content.teaser.badge}</p>
                        <h3 className="mt-3 text-xl font-semibold text-white">{content.teaser.headline}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/68">{content.teaser.body}</p>
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
                      <Button type="button" onClick={() => finishOnboarding(getCompletionDestination(profile, recommendation))} disabled={saving} className="h-12 flex-1 rounded-2xl bg-[#f4cd71] text-[#111827] hover:bg-[#f7d98e]">
                        {saving ? "Saving..." : resultContent.primaryCta}
                        {!saving ? <ArrowRight className="h-4 w-4" /> : null}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => finishOnboarding("/enroll")} disabled={saving} className="h-12 flex-1 rounded-2xl border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08]">
                        {resultContent.secondaryCta}
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
